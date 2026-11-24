import { AlertTriangle, CheckCircle2, ClipboardList, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStatusLabel } from '../components/StatusBadge';
import { Card } from '../components/ui/Card';
import { AlertBanner, PageHeader } from '../components/ui/PageHeader';
import { api } from '../services/api';
import { DashboardSummary, OrderStatus } from '../types/domain';
import { formatCurrency } from '../utils/format';

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard
      .summary()
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar métricas'))
      .finally(() => setLoading(false));
  }, []);

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
        subtitle="Resumen operativo de órdenes activas, facturación y alertas de inventario."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase">Órdenes Activas</span>
            <ClipboardList className="h-4 w-4 text-orange-400" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-white">
            {summary.active_orders}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase">Facturado Cerrado</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white">
            {formatCurrency(summary.completed_revenue)}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase">Finalizadas</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-white">
            {summary.by_status.completed ?? 0}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase">Stock Crítico</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-amber-400">
            {summary.low_stock_parts.length}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-white">Órdenes por Estado</h2>
          <div className="space-y-2.5">
            {statuses.map((st) => (
              <div
                key={st}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm"
              >
                <span className="text-slate-300">{getStatusLabel(st)}</span>
                <span className="font-mono font-semibold text-white">
                  {summary.by_status[st] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Alertas de Stock Mínimo</h2>
            <Link to="/parts" className="text-xs font-medium text-orange-400 hover:underline">
              Ir a Repuestos →
            </Link>
          </div>
          {summary.low_stock_parts.length === 0 ? (
            <p className="text-sm text-slate-400">Todo el inventario está por encima del stock mínimo.</p>
          ) : (
            <div className="space-y-2.5">
              {summary.low_stock_parts.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-950/20 px-3.5 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-white">{part.name}</p>
                    <p className="font-mono text-xs text-slate-400">{part.sku}</p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="font-bold text-amber-400">{part.stock}</span>
                    <span className="text-slate-400"> / mín {part.min_stock}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
