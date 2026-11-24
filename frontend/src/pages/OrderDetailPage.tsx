import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Hand,
  Plus,
  Printer,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField, Input, Select, Textarea } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { AlertBanner, PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { OrderStatus, Part, User, WorkOrder } from '../types/domain';
import { formatCurrency, formatDate } from '../utils/format';

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
  const [submittingQuote, setSubmittingQuote] = useState(false);

  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [addingPart, setAddingPart] = useState(false);

  const [requoteOpen, setRequoteOpen] = useState(false);
  const [requoteReason, setRequoteReason] = useState('');
  const [requoting, setRequoting] = useState(false);

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

  async function saveTechnicalDetails(): Promise<WorkOrder | null> {
    if (!order) return null;
    const res = await api.orders.update(order.id, {
      diagnosis,
      labor_cost: Number(laborCost) || 0,
      ...(user?.role === 'admin'
        ? { mechanic_id: mechanicId ? Number(mechanicId) : null }
        : {}),
    });
    setOrder(res.order);
    return res.order;
  }

  async function handleSaveOrder(e: FormEvent) {
    e.preventDefault();
    setError('');
    setFeedback('');
    setSavingOrder(true);
    try {
      await saveTechnicalDetails();
      setFeedback('Diagnóstico y mano de obra guardados.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar cambios');
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleSaveAndSendQuote() {
    if (!order) return;
    if (!diagnosis.trim()) {
      setError('Escribí el diagnóstico técnico antes de enviar el presupuesto.');
      return;
    }
    setError('');
    setFeedback('');
    setSubmittingQuote(true);
    try {
      await saveTechnicalDetails();
      const res = await api.orders.updateStatus(order.id, 'quoted');
      setOrder(res.order);
      setFeedback('Presupuesto guardado y enviado al cliente para su aprobación.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el presupuesto');
    } finally {
      setSubmittingQuote(false);
    }
  }

  async function handleClaim() {
    if (!order) return;
    setError('');
    setFeedback('');
    try {
      const res = await api.orders.claim(order.id);
      setOrder(res.order);
      setFeedback('Te asignaste esta orden correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo tomar la orden');
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
      setFeedback('Repuesto agregado al presupuesto y stock reservado.');
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
      setFeedback('Repuesto quitado y stock devuelto al depósito.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar el repuesto');
    }
  }

  async function handleRequote(e: FormEvent) {
    e.preventDefault();
    if (!order) return;
    setError('');
    setFeedback('');
    setRequoting(true);
    try {
      const res = await api.orders.requote(order.id, {
        reason: requoteReason,
        diagnosis: diagnosis.trim() || undefined,
        labor_cost: Number(laborCost) || 0,
      });
      setOrder(res.order);
      setRequoteOpen(false);
      setRequoteReason('');
      setFeedback(
        `Represupuesto v${res.order.quote_version ?? 2} enviado. Se notificó al cliente para nueva aprobación.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo represupuestar la orden');
    } finally {
      setRequoting(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Cargando detalle de orden...</p>;
  if (!order) return <AlertBanner message={error || 'Orden no encontrada'} />;

  const isClosed = order.status === 'completed' || order.status === 'cancelled';
  const isUnassignedForMechanic = user?.role === 'mechanic' && order.mechanic_id === null;
  const canEditTechnical =
    !isClosed &&
    (user?.role === 'admin' ||
      (user?.role === 'mechanic' && order.mechanic_id === user.id));

  const partsSubtotal = (order.items ?? []).reduce(
    (acc, item) => acc + item.quantity * Number(item.unit_price_snapshot),
    0
  );
  const liveLabor = canEditTechnical ? Number(laborCost) || 0 : Number(order.labor_cost);
  const liveTotal = partsSubtotal + liveLabor;

  const canCancel =
    !isClosed &&
    (user?.role === 'admin' || (user?.role === 'client' && order.status === 'quoted'));

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/orders"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white print:hidden"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a Órdenes
        </Link>
        <PageHeader
          title={`${order.code} — ${order.brand} ${order.model} (${order.plate})`}
          subtitle={`Cliente: ${order.client_name} · Mecánico: ${order.mechanic_name ?? 'Sin asignar'} · Ingreso: ${formatDate(order.created_at)}`}
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="print:hidden"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5" /> Imprimir Presupuesto
              </Button>
              <StatusBadge status={order.status} />
            </div>
          }
        />
      </div>

      {error && <AlertBanner message={error} />}
      {feedback && <AlertBanner variant="success" message={feedback} />}

      {order.requote_reason && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          <strong className="font-semibold text-amber-300">
            Presupuesto actualizado (v{order.quote_version ?? 2}):{' '}
          </strong>
          {order.requote_reason}
        </div>
      )}

      {/* Banner guiado de siguiente acción según rol y estado */}
      <Card className="border-orange-500/30 bg-slate-900">
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6 mb-4">
          {PIPELINE.map((step) => {
            const active = order.status === step.status;
            return (
              <div
                key={step.status}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
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

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4 print:hidden">
          <div className="text-sm text-slate-300">
            {isUnassignedForMechanic && (
              <span>Esta orden está sin asignar. Tomala para poder diagnosticar y presupuestar.</span>
            )}
            {!isUnassignedForMechanic && order.status === 'received' && canEditTechnical && (
              <span>
                <strong className="text-white">Siguiente paso:</strong> Iniciá el diagnóstico en box para armar el presupuesto.
              </span>
            )}
            {!isUnassignedForMechanic && order.status === 'diagnosing' && canEditTechnical && (
              <span>
                <strong className="text-white">Armando presupuesto:</strong> Cargá diagnóstico, mano de obra y repuestos, luego envialo al cliente.
              </span>
            )}
            {order.status === 'quoted' && (
              <span>
                <strong className="text-amber-300">Presupuesto listo ({formatCurrency(liveTotal)}):</strong>{' '}
                {user?.role === 'client'
                  ? 'Revisá el detalle abajo y aprobá o rechazá la reparación.'
                  : 'Esperando aprobación del cliente (o aprobación directa de Admin).'}
              </span>
            )}
            {order.status === 'approved' && (
              <span>
                <strong className="text-emerald-300">Presupuesto aprobado.</strong>{' '}
                {canEditTechnical ? 'Podés iniciar la reparación en box.' : 'El taller iniciará la reparación.'}
              </span>
            )}
            {order.status === 'in_progress' && (
              <span>
                <strong className="text-orange-300">Reparación en curso.</strong>{' '}
                {canEditTechnical ? 'Al terminar, finalizá la orden para cerrarla.' : 'Tu vehículo está siendo reparado.'}
              </span>
            )}
            {isClosed && (
              <span>
                Orden cerrada en estado <strong className="text-white">{order.status}</strong> (solo lectura).
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {isUnassignedForMechanic && !isClosed && (
              <Button onClick={handleClaim}>
                <Hand className="h-4 w-4" /> Tomar esta Orden
              </Button>
            )}

            {canEditTechnical && order.status === 'received' && (
              <Button onClick={() => handleStatusChange('diagnosing')}>
                Iniciar Diagnóstico
              </Button>
            )}

            {canEditTechnical && order.status === 'diagnosing' && (
              <Button loading={submittingQuote} onClick={handleSaveAndSendQuote}>
                <Send className="h-4 w-4" /> Guardar y Enviar Presupuesto
              </Button>
            )}

            {(user?.role === 'client' || user?.role === 'admin') && order.status === 'quoted' && (
              <Button onClick={() => handleStatusChange('approved')}>
                <CheckCircle2 className="h-4 w-4" /> Aprobar Presupuesto
              </Button>
            )}

            {canEditTechnical && order.status === 'approved' && (
              <Button onClick={() => handleStatusChange('in_progress')}>
                Iniciar Reparación
              </Button>
            )}

            {canEditTechnical && order.status === 'in_progress' && (
              <Button onClick={() => handleStatusChange('completed')}>
                <CheckCircle2 className="h-4 w-4" /> Finalizar Orden
              </Button>
            )}

            {canEditTechnical &&
              ['quoted', 'approved', 'in_progress'].includes(order.status) && (
                <Button variant="secondary" onClick={() => setRequoteOpen(true)}>
                  <RefreshCw className="h-4 w-4" /> Represupuestar
                </Button>
              )}

            {canCancel && (
              <Button variant="danger" onClick={() => handleStatusChange('cancelled')}>
                <XCircle className="h-4 w-4" />{' '}
                {user?.role === 'client' ? 'Rechazar Presupuesto' : 'Cancelar Orden'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna izquierda: Diagnóstico y Mano de Obra */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-orange-400" />
            <h2 className="text-base font-semibold text-white">Diagnóstico &amp; Mano de Obra</h2>
          </div>

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

              <FormField label="Diagnóstico técnico (obligatorio para presupuestar)">
                <Textarea
                  rows={3}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Ej. Pastillas delanteras al 10% y discos cristalizados. Requiere cambio completo."
                />
              </FormField>

              <FormField label="Costo de Mano de Obra (ARS)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value)}
                />
              </FormField>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="secondary" loading={savingOrder}>
                  Guardar Borrador
                </Button>
                {order.status === 'diagnosing' && (
                  <Button
                    type="button"
                    loading={submittingQuote}
                    onClick={handleSaveAndSendQuote}
                  >
                    <Send className="h-4 w-4" /> Guardar y Enviar Presupuesto
                  </Button>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-2.5 text-sm text-slate-300">
              <p>
                <span className="font-semibold text-white">Diagnóstico: </span>
                {order.diagnosis || 'Pendiente de carga por el mecánico'}
              </p>
              <p>
                <span className="font-semibold text-white">Mano de obra: </span>
                <span className="font-mono">{formatCurrency(order.labor_cost)}</span>
              </p>
            </div>
          )}
        </Card>

        {/* Columna derecha: Repuestos y Resumen de Presupuesto */}
        <Card className="flex flex-col justify-between">
          <div>
            <h2 className="mb-3 text-base font-semibold text-white">
              Repuestos &amp; Desglose del Presupuesto
            </h2>

            {canEditTechnical && (
              <form onSubmit={handleAddPart} className="mb-4 flex flex-wrap gap-2 print:hidden">
                <div className="flex-1 min-w-[180px]">
                  <Select
                    required
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                  >
                    <option value="">Seleccionar repuesto del inventario...</option>
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
                  <Plus className="h-4 w-4" /> Sumar
                </Button>
              </form>
            )}

            {!order.items || order.items.length === 0 ? (
              <p className="text-sm text-slate-400">Sin repuestos cargados en este presupuesto.</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-white">{item.part_name}</p>
                      <p className="font-mono text-xs text-slate-400">
                        {item.sku} · {item.quantity} × {formatCurrency(item.unit_price_snapshot)}
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
                          className="rounded p-1 text-slate-400 hover:bg-rose-950/50 hover:text-rose-300 cursor-pointer print:hidden"
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

          <div className="mt-6 space-y-2 border-t border-slate-800 pt-4 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal Repuestos</span>
              <span className="font-mono">{formatCurrency(partsSubtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Mano de Obra</span>
              <span className="font-mono">{formatCurrency(liveLabor)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <span className="font-semibold text-white">
                Total Presupuestado (v{order.quote_version ?? 1})
              </span>
              <span className="font-mono text-2xl font-bold text-orange-400">
                {formatCurrency(liveTotal)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={requoteOpen}
        title={`Represupuestar ${order.code}`}
        onClose={() => setRequoteOpen(false)}
      >
        <form onSubmit={handleRequote} className="space-y-4">
          <p className="text-xs text-slate-400">
            Al represupuestar, la orden vuelve a estado <strong>Presupuestado</strong> (v
            {(order.quote_version ?? 1) + 1}) y el cliente recibe una notificación para aprobar el nuevo monto.
          </p>
          <FormField label="Motivo del represupuesto (visible para el cliente)">
            <Textarea
              required
              minLength={5}
              rows={3}
              placeholder="Ej. Al desarmar tren delantero se detectó buje de parrilla roto; se suma repuesto y ajuste."
              value={requoteReason}
              onChange={(e) => setRequoteReason(e.target.value)}
            />
          </FormField>
          <FormField label="Mano de obra actualizada (ARS)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={laborCost}
              onChange={(e) => setLaborCost(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setRequoteOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={requoting}>
              Enviar Represupuesto
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
