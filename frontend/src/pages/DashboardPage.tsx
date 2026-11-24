import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, DollarSign, PackagePlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStatusLabel } from '../components/StatusBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AlertBanner, PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardSummary, OrderStatus } from '../types/domain';
import { formatCurrency } from '../utils/format';

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [restockingId, setRestockingId] = useState<number | null>(null);

  const loadSummary = useCallback(() => {
    api.dashboard
      .summary()
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar métricas'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  async function handleQuickRestock(partId: number) {
    setRestockingId(partId);
    setError('');
    try {
      await api.parts.restock(partId, 5);
      loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reponer el stock');
    } finally {
      setRestockingId(null);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Cargando métricas del taller...</p>;
  if (error) return <AlertBanner message={error} />;
  if (!summary) return null;

  const statuses: OrderStatus[] = [
    'received',
    'diagnosing',
    'quoted',
    'approved',
    'in_progress',
    'completed',
    'cancelled',
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tablero del Taller"
        subtitle="Hacé clic en cualquier estado para ir directo a esas órdenes o reponé stock crítico."
        action={
          <Link to="/orders">
            <Button>
              Ir a Órdenes <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/orders" className="block">
          <Card className="hover:border-orange-500/60 transition">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase">Órdenes Activas</span>
              <ClipboardList className="h-4 w-4 text-orange-400" />
            </div>
            <p className="mt-2 font-mono text-3xl font-bold text-white">
              {summary.active_orders}
            </p>
          </Card>
        </Link>

        <Card>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase">Facturado Cerrado</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white">
            {formatCurrency(summary.completed_revenue)}
          </p>
        </Card>

        <Link to="/orders?status=completed" className="block">
          <Card className="hover:border-emerald-500/60 transition">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase">Finalizadas</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 font-mono text-3xl font-bold text-white">
              {summary.by_status.completed ?? 0}
            </p>
          </Card>
        </Link>

        <Link to="/parts" className="block">
          <Card className="hover:border-amber-500/60 transition">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase">Stock Crítico</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 font-mono text-3xl font-bold text-amber-400">
              {summary.low_stock_parts.length}
            </p>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-white">Órdenes por Estado</h2>
          <div className="space-y-2">
            {statuses.map((st) => (
              <Link
                key={st}
                to={`/orders?status=${st}`}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm hover:border-orange-500/50 transition"
              >
                <span className="text-slate-300">{getStatusLabel(st)}</span>
                <span className="flex items-center gap-2 font-mono font-semibold text-white">
                  {summary.by_status[st] ?? 0}
                  <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                </span>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Alertas de Stock Mínimo</h2>
            <Link to="/parts" className="text-xs font-medium text-orange-400 hover:underline">
              Ver Inventario →
            </Link>
          </div>
          {summary.low_stock_parts.length === 0 ? (
            <p className="text-sm text-slate-400">Todo el inventario está por encima del stock mínimo.</p>
          ) : (
            <div className="space-y-2.5">
              {summary.low_stock_parts.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3.5 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-white">{part.name}</p>
                    <p className="font-mono text-xs text-slate-400">
                      {part.sku} · <span className="text-amber-400 font-bold">{part.stock}</span> / mín {part.min_stock}
                    </p>
                  </div>
                  {user?.role === 'admin' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={restockingId === part.id}
                      onClick={() => handleQuickRestock(part.id)}
                    >
                      <PackagePlus className="h-3.5 w-3.5" /> +5
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
