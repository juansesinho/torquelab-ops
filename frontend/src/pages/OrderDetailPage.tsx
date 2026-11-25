import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
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
import { DatePicker } from '../components/ui/DatePicker';
import { FormField, Input, Select, Textarea } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { AlertBanner, PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { ChecklistStatus, OrderStatus, Part, User, WorkOrder } from '../types/domain';
import { formatCurrency, formatDate } from '../utils/format';

const CHECKLIST_ITEMS = [
  { key: 'brakes', label: 'Frenos y Discos' },
  { key: 'fluids', label: 'Aceite y Fluidos' },
  { key: 'tires', label: 'Neumáticos y Presión' },
  { key: 'battery', label: 'Batería y Alternador' },
  { key: 'lights', label: 'Luces y Señalización' },
  { key: 'suspension', label: 'Tren Delantero' },
];

const CHECKLIST_META: Record<ChecklistStatus, { label: string; cls: string }> = {
  ok: { label: 'OK', cls: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' },
  attention: { label: 'Revisar', cls: 'border-amber-500/50 bg-amber-500/15 text-amber-300' },
  critical: { label: 'Crítico', cls: 'border-rose-500/50 bg-rose-500/15 text-rose-300' },
  pending: { label: 'Sin revisar', cls: 'border-slate-700 bg-slate-950 text-slate-400' },
};

const PAYMENT_METHOD_LABEL: Record<'cash' | 'transfer' | 'card', string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
};

const QUICK_DIAGNOSTIC_PRESETS = [
  { label: 'Service 10.000 km', diagnosis: 'Cambio de aceite sintético, filtro de aceite y revisión de 25 puntos.', labor: '25000' },
  { label: 'Frenos delanteros', diagnosis: 'Pastillas delanteras desgastadas y revisión de discos/líquido de freno.', labor: '35000' },
  { label: 'Escaneo OBD-II', diagnosis: 'Diagnóstico computarizado OBD-II, borrado de códigos y prueba de ruta.', labor: '18000' },
  { label: 'Kit distribución', diagnosis: 'Reemplazo de correa de distribución, tensores y verificación de bomba de agua.', labor: '65000' },
];

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
  const { notify } = useToast();
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [mechanics, setMechanics] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [diagnosis, setDiagnosis] = useState('');
  const [laborCost, setLaborCost] = useState('0');
  const [mechanicId, setMechanicId] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);

  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [addingPart, setAddingPart] = useState(false);

  const [requoteOpen, setRequoteOpen] = useState(false);
  const [requoteReason, setRequoteReason] = useState('');
  const [requoting, setRequoting] = useState(false);

  const [checklist, setChecklist] = useState<Record<string, ChecklistStatus>>({});
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer' | 'card'>('transfer');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

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
      setEstimatedDelivery(res.order.estimated_delivery ?? '');
      setChecklist(res.order.inspection_checklist ?? {});

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
      estimated_delivery: estimatedDelivery || null,
      inspection_checklist: checklist,
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

  async function handleChecklistChange(key: string, value: ChecklistStatus) {
    if (!order || !canEditTechnical) return;
    const next = { ...checklist, [key]: value };
    setChecklist(next);
    try {
      const res = await api.orders.update(order.id, { inspection_checklist: next });
      setOrder(res.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la inspección');
    }
  }

  async function handleRegisterPayment(e: FormEvent) {
    e.preventDefault();
    if (!order) return;
    setError('');
    setPaying(true);
    try {
      const res = await api.orders.addPayment(order.id, {
        amount: Number(payAmount),
        method: payMethod,
        notes: payNotes.trim() || null,
      });
      setOrder(res.order);
      setPaymentOpen(false);
      setPayAmount('');
      setPayNotes('');
      notify('Pago registrado correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago');
    } finally {
      setPaying(false);
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
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {QUICK_DIAGNOSTIC_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setDiagnosis(preset.diagnosis);
                        setLaborCost(preset.labor);
                        notify(`Plantilla "${preset.label}" aplicada`, 'info');
                      }}
                      className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-orange-500/60 hover:text-orange-300 transition cursor-pointer"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
                <Textarea
                  rows={3}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Ej. Pastillas delanteras al 10% y discos cristalizados. Requiere cambio completo."
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Costo de Mano de Obra (ARS)">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                  />
                </FormField>
                <FormField label="Entrega estimada (opcional)">
                  <DatePicker
                    value={estimatedDelivery}
                    onChange={setEstimatedDelivery}
                    placeholder="Elegir fecha..."
                  />
                </FormField>
              </div>

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

      {/* Checklist Semáforo + Control de Pagos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-orange-400" />
            <h2 className="text-base font-semibold text-white">
              Inspección Técnica (Semáforo)
            </h2>
          </div>
          <div className="space-y-2.5">
            {CHECKLIST_ITEMS.map((item) => {
              const currentVal: ChecklistStatus = checklist[item.key] ?? 'pending';
              const meta = CHECKLIST_META[currentVal];
              return (
                <div
                  key={item.key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm"
                >
                  <span className="font-medium text-slate-200">{item.label}</span>
                  {canEditTechnical ? (
                    <div className="flex gap-1">
                      {(['ok', 'attention', 'critical'] as ChecklistStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleChecklistChange(item.key, st)}
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                            currentVal === st
                              ? CHECKLIST_META[st].cls
                              : 'border-slate-800 text-slate-500 hover:text-slate-200'
                          }`}
                        >
                          {CHECKLIST_META[st].label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}
                    >
                      {meta.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                <h2 className="text-base font-semibold text-white">Pagos y Cobranza</h2>
              </div>
              {user?.role === 'admin' &&
                order.status !== 'cancelled' &&
                Number(order.total_cost) > Number(order.paid_amount ?? 0) && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const remaining = Math.max(
                        0,
                        Number(order.total_cost) - Number(order.paid_amount ?? 0)
                      );
                      setPayAmount(String(remaining));
                      setPaymentOpen(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Registrar Pago
                  </Button>
                )}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <span className="text-[11px] uppercase text-slate-400">Abonado</span>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-400">
                  {formatCurrency(order.paid_amount ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <span className="text-[11px] uppercase text-slate-400">Saldo Pendiente</span>
                <p className="mt-1 font-mono text-lg font-bold text-amber-400">
                  {formatCurrency(
                    Math.max(0, Number(order.total_cost) - Number(order.paid_amount ?? 0))
                  )}
                </p>
              </div>
            </div>

            {!order.payments || order.payments.length === 0 ? (
              <p className="text-sm text-slate-400">Todavía no hay pagos registrados.</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {order.payments.map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-white">
                        {PAYMENT_METHOD_LABEL[pay.method]}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDate(pay.created_at)}
                        {pay.notes ? ` · ${pay.notes}` : ''}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-emerald-400">
                      + {formatCurrency(pay.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={paymentOpen}
        title={`Registrar Pago / Seña — ${order.code}`}
        onClose={() => setPaymentOpen(false)}
      >
        <form onSubmit={handleRegisterPayment} className="space-y-4">
          <FormField label="Monto a registrar (ARS)">
            <Input
              type="number"
              min={1}
              step="0.01"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </FormField>
          <FormField label="Medio de pago">
            <Select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as 'cash' | 'transfer' | 'card')}
            >
              <option value="transfer">Transferencia Bancaria</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta Débito / Crédito</option>
            </Select>
          </FormField>
          <FormField label="Observación / Comprobante (opcional)">
            <Input
              placeholder="Ej. Seña 50% comprobante #9921"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPaymentOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={paying}>
              Confirmar Pago
            </Button>
          </div>
        </form>
      </Modal>

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
