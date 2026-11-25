import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAYS_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIsoDate(iso: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return '';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha...',
  minDate,
}: {
  value: string;
  onChange: (nextIso: string) => void;
  placeholder?: string;
  minDate?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const initialDate = parseIsoDate(value) ?? new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    const parsed = parseIsoDate(value);
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [value]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectOffsetDays(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    onChange(toIsoDate(d));
    setOpen(false);
  }

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  // Monday = 0 ... Sunday = 6
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayIso = toIsoDate(new Date());

  const cells: Array<number | null> = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-left text-sm text-slate-100 hover:border-orange-500/60 focus:border-orange-500 focus:outline-none transition cursor-pointer"
        >
          <span className={value ? 'font-mono text-slate-100' : 'text-slate-500'}>
            {value ? formatDisplayDate(value) : placeholder}
          </span>
          <Calendar className="h-4 w-4 text-orange-400 shrink-0" />
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            title="Quitar fecha"
            className="ml-1.5 rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-slate-400 hover:text-white hover:border-slate-500 transition cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-72 rounded-xl border border-slate-700 bg-slate-900 p-3.5 shadow-2xl">
          {/* Quick presets */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[
              { label: 'Hoy', days: 0 },
              { label: 'Mañana', days: 1 },
              { label: '+3 días', days: 3 },
              { label: '+1 sem', days: 7 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => selectOffsetDays(p.days)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-medium text-slate-300 hover:border-orange-500/60 hover:text-orange-400 transition cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Month navigation */}
          <div className="mb-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-white">
              {MONTHS_ES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-slate-500">
            {WEEKDAYS_ES.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) {
                return <span key={`empty-${idx}`} />;
              }
              const cellIso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(
                day
              ).padStart(2, '0')}`;
              const isSelected = cellIso === value;
              const isToday = cellIso === todayIso;
              const isDisabled = Boolean(minDate && cellIso < minDate);

              return (
                <button
                  key={cellIso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(cellIso);
                    setOpen(false);
                  }}
                  className={`h-8 w-full rounded-md font-mono text-xs transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none ${
                    isSelected
                      ? 'bg-orange-500 font-bold text-slate-950'
                      : isToday
                        ? 'border border-orange-500/60 text-orange-400 hover:bg-slate-800'
                        : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
