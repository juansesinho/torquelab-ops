import { AlertTriangle, PackagePlus, Plus } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { FormField, Input } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { AlertBanner, PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Part } from '../types/domain';
import { formatCurrency } from '../utils/format';

export function PartsPage() {
  const { user } = useAuth();
  const [parts, setParts] = useState<Part[]>([]);
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

  const [restockTarget, setRestockTarget] = useState<Part | null>(null);
  const [restockQty, setRestockQty] = useState('5');

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

  async function handleRestock(e: FormEvent) {
    e.preventDefault();
    if (!restockTarget) return;
    setFormError('');
    setSaving(true);
    try {
      await api.parts.restock(restockTarget.id, Number(restockQty));
      setRestockTarget(null);
      setRestockQty('5');
      await loadParts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al reponer stock');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario de Repuestos"
        subtitle="Control de stock en tiempo real y alertas de reposición."
        action={
          user?.role === 'admin' && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nuevo Repuesto
            </Button>
          )
        }
      />

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
                {user?.role === 'admin' && <th className="px-4 py-3 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {parts.map((part) => (
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
                  {user?.role === 'admin' && (
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setFormError('');
                          setRestockTarget(part);
                        }}
                      >
                        <PackagePlus className="h-3.5 w-3.5" /> Reponer
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
          <FormField label="Precio unitario (ARS)">
            <Input type="number" min={0} step="0.01" required value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Crear Repuesto</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(restockTarget)}
        title={`Reponer Stock — ${restockTarget?.name ?? ''}`}
        onClose={() => setRestockTarget(null)}
      >
        <form onSubmit={handleRestock} className="space-y-4">
          {formError && <AlertBanner message={formError} />}
          <FormField label="Cantidad a ingresar">
            <Input
              type="number"
              min={1}
              required
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setRestockTarget(null)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Confirmar Reposición</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
