import { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-10 text-center">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function AlertBanner({
  variant = 'error',
  message,
}: {
  variant?: 'error' | 'success';
  message: string;
}) {
  const styles =
    variant === 'error'
      ? 'border-rose-500/40 bg-rose-950/40 text-rose-200'
      : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200';
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {message}
    </div>
  );
}
