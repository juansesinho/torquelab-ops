import { AlertTriangle, ArrowDownUp, History, Pencil, Plus, Search } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField, Input, Select, Textarea } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { AlertBanner, PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Part, StockMovement } from '../types/domain';
import { formatCurrency, formatDate } from '../utils/format';

export function PartsPage() {
  const { user } = useAuth();
  const [parts, setParts] = useState<Part[]>([]);
  const [query, setQuery] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [stock, setStock] = useState('10');
  const [minStock, setMinStock] = useState('5');
  const [unitPrice, setUnitPrice] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<Part | null>(null);
  const [editName, setEditName] = useState('');
  const [editMinStock, setEditMinStock] = useState('5');
  const [editPrice, setEditPrice] = useState('');

  const [moveTarget, setMoveTarget] = useState<Part | null>(null);
  const [moveType, setMoveType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [moveQty, setMoveQty] = useState('5');
  const [moveReason, setMoveReason] = useState('');
  const [moveProvider, setMoveProvider] = useState('');
  const [moveCost, setMoveCost] = useState('');

  const [historyTarget, setHistoryTarget] = useState<Part | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadParts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.parts.list();
      setParts(res.parts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar repuestos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.parts.create({
        sku,
        name,
        stock: Number(stock),
        min_stock: Number(minStock),
        unit_price: Number(unitPrice),
      });
      setCreateOpen(false);
      setSku('');
      setName('');
      setUnitPrice('');
      await loadParts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear repuesto');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(part: Part) {
    setFormError('');
    setEditTarget(part);
    setEditName(part.name);
    setEditMinStock(String(part.min_stock));
    setEditPrice(String(part.unit_price));
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setFormError('');
    setSaving(true);
    try {
      await api.parts.update(editTarget.id, {
        name: editName,
        min_stock: Number(editMinStock),
        unit_price: Number(editPrice),
      });
      setEditTarget(null);
      await loadParts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al actualizar repuesto');
    } finally {
      setSaving(false);
    }
  }

  function openMovement(part: Part) {
    setFormError('');
    setMoveTarget(part);
    setMoveType('in');
    setMoveQty('5');
    setMoveReason('');
    setMoveProvider('');
    setMoveCost('');
  }

  async function handleMovement(e: FormEvent) {
    e.preventDefault();
    if (!moveTarget) return;
    setFormError('');
    setSaving(true);
    try {
      await api.parts.registerMovement(moveTarget.id, {
        type: moveType,
        quantity: Number(moveQty),
        reason: moveReason,
        provider: moveType === 'in' && moveProvider.trim() ? moveProvider.trim() : null,
        unit_cost: moveType === 'in' && moveCost ? Number(moveCost) : null,
      });
      setMoveTarget(null);
      await loadParts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al registrar movimiento');
    } finally {
      setSaving(false);
    }
  }

  async function openHistory(part: Part) {
    setHistoryTarget(part);
    setLoadingHistory(true);
    try {
      const res = await api.parts.listMovements(part.id);
      setMovements(res.movements);
    } catch {
      setMovements([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  const filtered = parts.filter((p) => {
    if (onlyLowStock && !p.low_stock) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
  });

  const typeLabel: Record<StockMovement['type'], string> = {
    in: 'Ingreso Proveedor',
    out: 'Egreso / Merma',
    adjustment: 'Ajuste Inventario',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario de Repuestos"
        subtitle="Gestión de stock con ingresos de proveedores, egresos/mermas, ajustes y kardex auditable."
        action={
          user?.role === 'admin' && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nuevo Repuesto
            </Button>
          )
        }
      />

      <Card className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar por SKU o nombre..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          variant={onlyLowStock ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setOnlyLowStock(!onlyLowStock)}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Solo stock bajo
        </Button>
      </Card>

      {error && <AlertBanner message={error} />}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando inventario...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Repuesto</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Mínimo</th>
                <th className="px-4 py-3 text-right">Precio Unit.</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((part) => (
                <tr
                  key={part.id}
                  className={part.low_stock ? 'bg-amber-950/20' : 'hover:bg-slate-800/40'}
                >
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-300">{part.sku}</td>
                  <td className="px-4 py-3.5 font-medium text-white">
                    <div className="flex items-center gap-2">
                      {part.name}
                      {part.low_stock && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                          <AlertTriangle className="h-3 w-3" /> Stock bajo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
                    {part.stock}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-400">
                    {part.min_stock}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-white">
                    {formatCurrency(part.unit_price)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openHistory(part)}
                        title="Ver historial de movimientos (Kardex)"
                      >
                        <History className="h-3.5 w-3.5" /> Kardex
                      </Button>
                      {user?.role === 'admin' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(part)}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openMovement(part)}
                          >
                            <ArrowDownUp className="h-3.5 w-3.5" /> Mover Stock
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Alta */}
      <Modal open={createOpen} title="Alta de Repuesto" onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <AlertBanner message={formError} />}
          <FormField label="SKU">
            <Input required placeholder="FLT-AIR-02" value={sku} onChange={(e) => setSku(e.target.value)} />
          </FormField>
          <FormField label="Nombre del repuesto">
            <Input required placeholder="Filtro de Aire Mann" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Stock inicial">
              <Input type="number" min={0} required value={stock} onChange={(e) => setStock(e.target.value)} />
            </FormField>
            <FormField label="Stock mínimo">
              <Input type="number" min={0} required value={minStock} onChange={(e) => setMinStock(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Precio unitario de venta (ARS)">
            <Input type="number" min={0} step="0.01" required value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Crear Repuesto</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Edición */}
      <Modal
        open={Boolean(editTarget)}
        title={`Editar Repuesto — ${editTarget?.sku ?? ''}`}
        onClose={() => setEditTarget(null)}
      >
        <form onSubmit={handleEdit} className="space-y-4">
          {formError && <AlertBanner message={formError} />}
          <FormField label="Nombre">
            <Input required value={editName} onChange={(e) => setEditName(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Stock mínimo">
              <Input type="number" min={0} required value={editMinStock} onChange={(e) => setEditMinStock(e.target.value)} />
            </FormField>
            <FormField label="Precio unitario (ARS)">
              <Input type="number" min={0} step="0.01" required value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
            </FormField>
          </div>
          <p className="text-xs text-slate-400">
            Nota: actualizar el precio no altera presupuestos ya emitidos (precio congelado por orden).
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar Cambios</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Movimiento Completo de Stock */}
      <Modal
        open={Boolean(moveTarget)}
        title={`Movimiento de Stock — ${moveTarget?.name ?? ''}`}
        onClose={() => setMoveTarget(null)}
      >
        <form onSubmit={handleMovement} className="space-y-4">
          {formError && <AlertBanner message={formError} />}
          <p className="text-xs text-slate-400">
            Stock actual: <strong className="font-mono text-white">{moveTarget?.stock}</strong> unidades
          </p>

          <FormField label="Tipo de movimiento">
            <Select
              value={moveType}
              onChange={(e) => setMoveType(e.target.value as 'in' | 'out' | 'adjustment')}
            >
              <option value="in">Ingreso de Proveedor (+)</option>
              <option value="out">Egreso / Merma / Devolución (-)</option>
              <option value="adjustment">Ajuste de Inventario (+/-)</option>
            </Select>
          </FormField>

          <FormField
            label={
              moveType === 'adjustment'
                ? 'Diferencia (positivo suma, negativo resta)'
                : 'Cantidad de unidades'
            }
          >
            <Input
              type="number"
              required
              min={moveType === 'adjustment' ? undefined : 1}
              value={moveQty}
              onChange={(e) => setMoveQty(e.target.value)}
            />
          </FormField>

          {moveType === 'in' && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Proveedor (opcional)">
                <Input
                  placeholder="Ej. Bosch Distribuidora"
                  value={moveProvider}
                  onChange={(e) => setMoveProvider(e.target.value)}
                />
              </FormField>
              <FormField label="Costo unitario (opcional)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="32000"
                  value={moveCost}
                  onChange={(e) => setMoveCost(e.target.value)}
                />
              </FormField>
            </div>
          )}

          <FormField label="Motivo / Comprobante (obligatorio)">
            <Textarea
              required
              minLength={3}
              rows={2}
              placeholder={
                moveType === 'in'
                  ? 'Ej. Remito #4521 reposición mensual'
                  : moveType === 'out'
                    ? 'Ej. Pieza dañada en depósito'
                    : 'Ej. Conteo físico de inventario'
              }
              value={moveReason}
              onChange={(e) => setMoveReason(e.target.value)}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setMoveTarget(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Registrar Movimiento
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Kardex / Historial */}
      <Modal
        open={Boolean(historyTarget)}
        title={`Kardex — ${historyTarget?.name ?? ''}`}
        onClose={() => setHistoryTarget(null)}
      >
        {loadingHistory ? (
          <p className="text-sm text-slate-400">Cargando historial...</p>
        ) : movements.length === 0 ? (
          <p className="text-sm text-slate-400">
            Todavía no hay movimientos manuales registrados para este repuesto.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
            {movements.map((m) => (
              <div key={m.id} className="py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{typeLabel[m.type]}</span>
                  <span
                    className={`font-mono font-bold ${
                      m.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity} u.
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">{m.reason}</p>
                <div className="mt-1 flex flex-wrap gap-3 font-mono text-[11px] text-slate-500">
                  <span>{formatDate(m.created_at)}</span>
                  {m.user_name && <span>Por: {m.user_name}</span>}
                  {m.provider && <span>Prov: {m.provider}</span>}
                  {m.unit_cost && <span>Costo: {formatCurrency(m.unit_cost)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
