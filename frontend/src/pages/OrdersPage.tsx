import { Plus, Search } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

export function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mechanics, setMechanics] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [plateFilter, setPlateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [mechanicId, setMechanicId] = useState('');
  const [problemDesc, setProblemDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.orders.list({
        status: statusFilter || undefined,
        plate: plateFilter.trim() || undefined,
      });
      setOrders(res.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar órdenes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, plateFilter]);

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
      await api.orders.create({
        vehicle_id: Number(vehicleId),
        mechanic_id: mechanicId ? Number(mechanicId) : null,
        problem_description: problemDesc,
      });
      setModalOpen(false);
      setVehicleId('');
      setMechanicId('');
      setProblemDesc('');
      await loadOrders();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear orden');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Órdenes de Trabajo"
        subtitle="Seguimiento de ingresos, diagnósticos y presupuestos en curso."
        action={
          user?.role === 'admin' && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nueva Orden
            </Button>
          )
        }
      />

      <Card className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar por patente (ej. AF492KL)..."
            className="pl-9"
            value={plateFilter}
            onChange={(e) => setPlateFilter(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
          >
            <option value="">Todos los estados</option>
            <option value="received">Ingresado</option>
            <option value="diagnosing">En Diagnóstico</option>
            <option value="quoted">Presupuestado</option>
            <option value="approved">Aprobado</option>
            <option value="in_progress">En Reparación</option>
            <option value="completed">Finalizado</option>
            <option value="cancelled">Cancelado</option>
          </Select>
        </div>
      </Card>

      {error && <AlertBanner message={error} />}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando órdenes...</p>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No hay órdenes para mostrar"
          description="Probá limpiar los filtros o creá una nueva orden de trabajo."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Vehículo</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Mecánico</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Ingreso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3.5 font-mono font-semibold text-orange-400">
                    <Link to={`/orders/${order.id}`} className="hover:underline">
                      {order.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-white">
                      {order.brand} {order.model}
                    </div>
                    <div className="font-mono text-xs text-slate-400">{order.plate}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">{order.client_name}</td>
                  <td className="px-4 py-3.5 text-slate-400">
                    {order.mechanic_name ?? 'Sin asignar'}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-white">
                    {formatCurrency(order.total_cost)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-400">
                    {formatDate(order.created_at)}
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
                <option key={v.id} value={v.id}>
                  {v.plate} — {v.brand} {v.model} ({v.client_name})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Mecánico asignado (opcional)">
            <Select value={mechanicId} onChange={(e) => setMechanicId(e.target.value)}>
              <option value="">Sin asignar por ahora</option>
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
              Crear Orden
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
