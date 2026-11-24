import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField, Input, Select, Textarea } from '../components/ui/FormField';
import { AlertBanner, PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { OrderStatus, Part, User, WorkOrder } from '../types/domain';
import { formatCurrency } from '../utils/format';

const PIPELINE: Array<{ status: OrderStatus; label: string }> = [
  { status: 'received', label: '1. Ingresado' },
  { status: 'diagnosing', label: '2. Diagnóstico' },
  { status: 'quoted', label: '3. Presupuestado' },
  { status: 'approved', label: '4. Aprobado' },
  { status: 'in_progress', label: '5. En Reparación' },
  { status: 'completed', label: '6. Finalizado' },
];

export function OrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [mechanics, setMechanics] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [diagnosis, setDiagnosis] = useState('');
  const [laborCost, setLaborCost] = useState('0');
  const [mechanicId, setMechanicId] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [addingPart, setAddingPart] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.orders.getById(Number(id));
      setOrder(res.order);
      setDiagnosis(res.order.diagnosis ?? '');
      setLaborCost(String(res.order.labor_cost ?? 0));
      setMechanicId(res.order.mechanic_id ? String(res.order.mechanic_id) : '');

      if (user?.role !== 'client') {
        const [partsRes, mechRes] = await Promise.all([
          api.parts.list(),
          api.auth.mechanics(),
        ]);
        setParts(partsRes.parts);
        setMechanics(mechRes.mechanics);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar orden');
    } finally {
      setLoading(false);
    }
  }, [id, user?.role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSaveOrder(e: FormEvent) {
    e.preventDefault();
    if (!order) return;
    setError('');
    setFeedback('');
    setSavingOrder(true);
    try {
      const res = await api.orders.update(order.id, {
        diagnosis,
        labor_cost: Number(laborCost),
        ...(user?.role === 'admin'
          ? { mechanic_id: mechanicId ? Number(mechanicId) : null }
          : {}),
      });
      setOrder(res.order);
      setFeedback('Cambios guardados correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar cambios');
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleStatusChange(nextStatus: OrderStatus) {
    if (!order) return;
    setError('');
    setFeedback('');
    try {
      const res = await api.orders.updateStatus(order.id, nextStatus);
      setOrder(res.order);
      setFeedback('Estado actualizado correctamente.');
      if (user?.role !== 'client') {
        const partsRes = await api.parts.list();
        setParts(partsRes.parts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    }
  }

  async function handleAddPart(e: FormEvent) {
    e.preventDefault();
    if (!order || !selectedPartId) return;
    setError('');
    setFeedback('');
    setAddingPart(true);
    try {
      const res = await api.orders.addItem(order.id, Number(selectedPartId), Number(partQty));
      setOrder(res.order);
      setSelectedPartId('');
      setPartQty('1');
      const partsRes = await api.parts.list();
      setParts(partsRes.parts);
      setFeedback('Repuesto agregado y stock descontado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el repuesto');
    } finally {
      setAddingPart(false);
    }
  }

  async function handleRemoveItem(itemId: number) {
    if (!order) return;
    setError('');
    setFeedback('');
    try {
      const res = await api.orders.removeItem(order.id, itemId);
      setOrder(res.order);
      const partsRes = await api.parts.list();
      setParts(partsRes.parts);
      setFeedback('Repuesto quitado y stock restituido.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar el repuesto');
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Cargando detalle de orden...</p>;
  if (!order) return <AlertBanner message={error || 'Orden no encontrada'} />;

  const isClosed = order.status === 'completed' || order.status === 'cancelled';
  const canEditTechnical = (user?.role === 'admin' || user?.role === 'mechanic') && !isClosed;

  const nextActionMap: Partial<Record<OrderStatus, { next: OrderStatus; label: string; roles: string[] }>> = {
    received: { next: 'diagnosing', label: 'Iniciar Diagnóstico', roles: ['admin', 'mechanic'] },
    diagnosing: { next: 'quoted', label: 'Enviar Presupuesto', roles: ['admin', 'mechanic'] },
    quoted: { next: 'approved', label: 'Aprobar Presupuesto', roles: ['admin', 'client'] },
    approved: { next: 'in_progress', label: 'Iniciar Reparación', roles: ['admin', 'mechanic'] },
    in_progress: { next: 'completed', label: 'Finalizar Orden', roles: ['admin', 'mechanic'] },
  };

  const nextAction = nextActionMap[order.status];
  const canRunNext = nextAction && user && nextAction.roles.includes(user.role);
  const canCancel =
    !isClosed &&
    ((user?.role === 'admin') || (user?.role === 'client' && order.status === 'quoted'));

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/orders"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a Órdenes
        </Link>
        <PageHeader
          title={`${order.code} — ${order.brand} ${order.model} (${order.plate})`}
          subtitle={`Cliente: ${order.client_name} · Mecánico: ${order.mechanic_name ?? 'Sin asignar'}`}
          action={<StatusBadge status={order.status} />}
        />
      </div>

      {error && <AlertBanner message={error} />}
      {feedback && <AlertBanner variant="success" message={feedback} />}

      {/* Pipeline visual */}
      <Card>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {PIPELINE.map((step) => {
            const active = order.status === step.status;
            return (
              <div
                key={step.status}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  active
                    ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                    : 'border-slate-800 bg-slate-950 text-slate-500'
                }`}
              >
                {step.label}
              </div>
            );
          })}
        </div>

        {(canRunNext || canCancel) && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
            {canRunNext && (
              <Button onClick={() => handleStatusChange(nextAction.next)}>
                {nextAction.label}
              </Button>
            )}
            {canCancel && (
              <Button variant="danger" onClick={() => handleStatusChange('cancelled')}>
                Cancelar Orden
              </Button>
            )}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Diagnóstico y costos */}
        <Card>
          <h2 className="mb-3 text-base font-semibold text-white">Detalle Técnico</h2>
          <p className="mb-4 rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
            <span className="font-semibold text-white">Falla reportada: </span>
            {order.problem_description}
          </p>

          {canEditTechnical ? (
            <form onSubmit={handleSaveOrder} className="space-y-4">
              {user?.role === 'admin' && (
                <FormField label="Mecánico asignado">
                  <Select value={mechanicId} onChange={(e) => setMechanicId(e.target.value)}>
                    <option value="">Sin asignar</option>
                    {mechanics.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              <FormField label="Diagnóstico técnico">
                <Textarea
                  rows={3}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Describí el diagnóstico encontrado..."
                />
              </FormField>

              <FormField label="Mano de obra (ARS)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value)}
                />
              </FormField>

              <Button type="submit" loading={savingOrder}>
                Guardar Diagnóstico y Costos
              </Button>
            </form>
          ) : (
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                <span className="font-semibold text-white">Diagnóstico: </span>
                {order.diagnosis || 'Pendiente de carga'}
              </p>
              <p>
                <span className="font-semibold text-white">Mano de obra: </span>
                <span className="font-mono">{formatCurrency(order.labor_cost)}</span>
              </p>
            </div>
          )}
        </Card>

        {/* Repuestos y Total */}
        <Card className="flex flex-col justify-between">
          <div>
            <h2 className="mb-3 text-base font-semibold text-white">Repuestos Utilizados</h2>

            {canEditTechnical && (
              <form onSubmit={handleAddPart} className="mb-4 flex flex-wrap gap-2">
                <div className="flex-1 min-w-[180px]">
                  <Select
                    required
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                  >
                    <option value="">Agregar repuesto...</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.stock === 0}>
                        {p.name} (Stock: {p.stock}) — {formatCurrency(p.unit_price)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    min={1}
                    required
                    value={partQty}
                    onChange={(e) => setPartQty(e.target.value)}
                  />
                </div>
                <Button type="submit" loading={addingPart}>
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </form>
            )}

            {(!order.items || order.items.length === 0) ? (
              <p className="text-sm text-slate-400">Sin repuestos cargados en esta orden.</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-white">{item.part_name}</p>
                      <p className="font-mono text-xs text-slate-400">
                        {item.sku} · {item.quantity} x {formatCurrency(item.unit_price_snapshot)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-white">
                        {formatCurrency(item.quantity * Number(item.unit_price_snapshot))}
                      </span>
                      {canEditTechnical && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="rounded p-1 text-slate-400 hover:bg-rose-950/50 hover:text-rose-300 cursor-pointer"
                          title="Quitar y devolver stock"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
            <span className="text-sm font-medium text-slate-300">Total de la Orden</span>
            <span className="font-mono text-2xl font-bold text-orange-400">
              {formatCurrency(order.total_cost)}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
