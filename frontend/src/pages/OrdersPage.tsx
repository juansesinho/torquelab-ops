import { ArrowRight, Hand, Plus, Search } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField, Input, Select, Textarea } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { AlertBanner, EmptyState, PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { OrderStatus, User, Vehicle, WorkOrder } from '../types/domain';
import { formatCurrency, formatDate } from '../utils/format';

const QUICK_STATUSES: Array<{ value: OrderStatus | ''; label: string }> = [
  { value: '', label: 'Todas' },
  { value: 'received', label: 'Ingresadas' },
  { value: 'diagnosing', label: 'Diagnóstico' },
  { value: 'quoted', label: 'Presupuestadas' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'in_progress', label: 'En Reparación' },
  { value: 'completed', label: 'Finalizadas' },
];

export function OrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mechanics, setMechanics] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') ?? '');
  const [plateFilter, setPlateFilter] = useState('');
  const [scope, setScope] = useState<'mine' | 'unassigned'>('mine');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState(searchParams.get('newForVehicle') ?? '');
  const [mechanicId, setMechanicId] = useState('');
  const [problemDesc, setProblemDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const newFor = searchParams.get('newForVehicle');
    if (newFor && user?.role === 'admin') {
      setVehicleId(newFor);
      setModalOpen(true);
    }
  }, [searchParams, user?.role]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.orders.list({
        status: statusFilter || undefined,
        plate: plateFilter.trim() || undefined,
        scope: user?.role === 'mechanic' ? scope : undefined,
      });
      setOrders(res.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar órdenes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, plateFilter, scope, user?.role]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.vehicles.list().then((r) => setVehicles(r.vehicles)).catch(() => {});
      api.auth.mechanics().then((r) => setMechanics(r.mechanics)).catch(() => {});
    }
  }, [user?.role]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setCreating(true);
    try {
      const res = await api.orders.create({
        vehicle_id: Number(vehicleId),
        mechanic_id: mechanicId ? Number(mechanicId) : null,
        problem_description: problemDesc,
      });
      setModalOpen(false);
      setVehicleId('');
      setMechanicId('');
      setProblemDesc('');
      navigate(`/orders/${res.order.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear orden');
    } finally {
      setCreating(false);
    }
  }

  async function handleClaim(orderId: number) {
    setClaimingId(orderId);
    setError('');
    try {
      await api.orders.claim(orderId);
      navigate(`/orders/${orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo tomar la orden');
    } finally {
      setClaimingId(null);
    }
  }

  function handleSelectStatus(val: OrderStatus | '') {
    setStatusFilter(val);
    if (val) {
      setSearchParams({ status: val });
    } else {
      setSearchParams({});
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          user?.role === 'mechanic'
            ? 'Mis Órdenes de Trabajo'
            : user?.role === 'client'
              ? 'Mis Reparaciones y Presupuestos'
              : 'Órdenes de Trabajo'
        }
        subtitle={
          user?.role === 'mechanic'
            ? 'Solo ves tus órdenes asignadas o las disponibles en cola sin asignar.'
            : 'Hacé clic en cualquier orden para diagnosticar, armar presupuesto o aprobar.'
        }
        action={
          user?.role === 'admin' && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nueva Orden
            </Button>
          )
        }
      />

      {/* Resumen destacado para Cliente: presupuestos pendientes de aprobación */}
      {user?.role === 'client' && !loading && (
        <div className="grid gap-4 md:grid-cols-3">
          {orders
            .filter((o) => o.status === 'quoted')
            .map((quotedOrder) => (
              <Card
                key={quotedOrder.id}
                className="md:col-span-3 border-amber-500/50 bg-amber-950/20 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                    Presupuesto v{quotedOrder.quote_version ?? 1} esperando tu aprobación
                  </span>
                  <h3 className="mt-1 text-lg font-bold text-white">
                    {quotedOrder.brand} {quotedOrder.model} ({quotedOrder.plate}) —{' '}
                    <span className="font-mono text-orange-400">
                      {formatCurrency(quotedOrder.total_cost)}
                    </span>
                  </h3>
                  {quotedOrder.requote_reason && (
                    <p className="mt-1 text-xs text-amber-200">
                      Motivo de actualización: {quotedOrder.requote_reason}
                    </p>
                  )}
                </div>
                <Button onClick={() => navigate(`/orders/${quotedOrder.id}`)}>
                  Revisar y Aprobar <ArrowRight className="h-4 w-4" />
                </Button>
              </Card>
            ))}
        </div>
      )}

      {/* Tabs exclusivas para Mecánico: Mis órdenes vs Sin asignar */}
      {user?.role === 'mechanic' && (
        <div className="flex gap-2">
          <Button
            variant={scope === 'mine' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setScope('mine')}
          >
            Mis Órdenes Asignadas
          </Button>
          <Button
            variant={scope === 'unassigned' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setScope('unassigned')}
          >
            Cola Sin Asignar (Tomar)
          </Button>
        </div>
      )}

      {/* Filtros rápidos + Buscador */}
      <Card className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar por patente (ej. AF492KL)..."
            className="pl-9"
            value={plateFilter}
            onChange={(e) => setPlateFilter(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_STATUSES.map((st) => (
            <button
              key={st.label}
              type="button"
              onClick={() => handleSelectStatus(st.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                statusFilter === st.value
                  ? 'bg-orange-500 text-slate-950 font-semibold'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </Card>

      {error && <AlertBanner message={error} />}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando órdenes...</p>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No hay órdenes en esta vista"
          description={
            user?.role === 'mechanic' && scope === 'mine'
              ? 'No tenés órdenes asignadas con ese filtro. Revisá la pestaña "Cola Sin Asignar" para tomar una.'
              : 'Probá limpiar los filtros o crear una nueva orden de trabajo.'
          }
          action={
            user?.role === 'mechanic' && scope === 'mine' ? (
              <Button variant="secondary" onClick={() => setScope('unassigned')}>
                Ver Cola Sin Asignar
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3">Vehículo</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Mecánico</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="hover:bg-slate-800/50 transition cursor-pointer"
                >
                  <td className="px-4 py-3.5">
                    <div className="font-mono font-semibold text-orange-400">{order.code}</div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {formatDate(order.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-white">
                      {order.brand} {order.model}
                    </div>
                    <div className="font-mono text-xs text-slate-400">{order.plate}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">{order.client_name}</td>
                  <td className="px-4 py-3.5 text-slate-400">
                    {order.mechanic_name ?? (
                      <span className="text-amber-400">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-white">
                    {formatCurrency(order.total_cost)}
                  </td>
                  <td
                    className="px-4 py-3.5 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {user?.role === 'mechanic' && order.mechanic_id === null ? (
                      <Button
                        size="sm"
                        loading={claimingId === order.id}
                        onClick={() => handleClaim(order.id)}
                      >
                        <Hand className="h-3.5 w-3.5" /> Tomar Orden
                      </Button>
                    ) : user?.role === 'client' && order.status === 'quoted' ? (
                      <Button size="sm" onClick={() => navigate(`/orders/${order.id}`)}>
                        Revisar Presupuesto <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        Gestionar <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title="Nueva Orden de Trabajo" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <AlertBanner message={formError} />}

          <FormField label="Vehículo">
            <Select required value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">Seleccionar vehículo...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id} disabled={Boolean(v.active_order_id)}>
                  {v.plate} — {v.brand} {v.model} ({v.client_name})
                  {v.active_order_id ? ' [Ya tiene orden abierta]' : ''}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Mecánico asignado (opcional)">
            <Select value={mechanicId} onChange={(e) => setMechanicId(e.target.value)}>
              <option value="">Sin asignar (queda en cola de mecánicos)</option>
              {mechanics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Falla reportada">
            <Textarea
              required
              minLength={5}
              rows={3}
              placeholder="Describí el motivo de ingreso del vehículo..."
              value={problemDesc}
              onChange={(e) => setProblemDesc(e.target.value)}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={creating}>
              Crear y Abrir Orden
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
