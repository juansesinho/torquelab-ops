import { OrderStatus } from '../types/domain';

const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  received: {
    label: 'Ingresado',
    className: 'bg-slate-800 text-slate-200 border-slate-600',
  },
  diagnosing: {
    label: 'En Diagnóstico',
    className: 'bg-sky-950/70 text-sky-300 border-sky-700/60',
  },
  quoted: {
    label: 'Presupuestado',
    className: 'bg-amber-950/70 text-amber-300 border-amber-700/60',
  },
  approved: {
    label: 'Aprobado',
    className: 'bg-indigo-950/70 text-indigo-300 border-indigo-700/60',
  },
  in_progress: {
    label: 'En Reparación',
    className: 'bg-orange-950/70 text-orange-300 border-orange-700/60',
  },
  completed: {
    label: 'Finalizado',
    className: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-rose-950/70 text-rose-300 border-rose-700/60',
  },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export function getStatusLabel(status: OrderStatus): string {
  return STATUS_META[status].label;
}
