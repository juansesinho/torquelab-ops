import {
  ArrowRight,
  Car,
  CheckCircle2,
  ClipboardList,
  Package,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { BrandLogo } from '../components/ui/BrandLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { OrderStatus } from '../types/domain';

const WORKFLOW_STATES: Array<{
  step: string;
  status: OrderStatus;
  role: string;
  summary: string;
}> = [
  {
    step: '01',
    status: 'received',
    role: 'Jefe de Taller',
    summary: 'Ingreso del vehículo con patente normalizada, falla reportada y mecánico asignado.',
  },
  {
    step: '02',
    status: 'diagnosing',
    role: 'Mecánico',
    summary: 'Inspección técnica en box, carga de diagnóstico y estimación de mano de obra.',
  },
  {
    step: '03',
    status: 'quoted',
    role: 'Mecánico / Admin',
    summary: 'Presupuesto cerrado con repuestos descontados y precios congelados por ítem.',
  },
  {
    step: '04',
    status: 'approved',
    role: 'Cliente',
    summary: 'El titular revisa diagnóstico y total online para aprobar o cancelar la orden.',
  },
  {
    step: '05',
    status: 'in_progress',
    role: 'Mecánico',
    summary: 'Ejecución de la reparación en curso con trazabilidad completa sobre la unidad.',
  },
  {
    step: '06',
    status: 'completed',
    role: 'Mecánico / Admin',
    summary: 'Cierre inmutable de la orden, facturación consolidada y entrega del vehículo.',
  },
];

const HIGHLIGHTS = [
  {
    icon: ClipboardList,
    title: 'Órdenes con Máquina de Estados',
    description:
      'Cada transición valida permisos por rol y requisitos obligatorios antes de avanzar.',
  },
  {
    icon: Package,
    title: 'Stock Atómico de Repuestos',
    description:
      'Reserva y restitución automática de inventario con alertas visibles de stock mínimo.',
  },
  {
    icon: ShieldCheck,
    title: 'Acceso RBAC por Perfil',
    description:
      'Vistas dedicadas para Jefe de Taller, Mecánico y Cliente con autenticación JWT.',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/40 bg-orange-500/10">
              <BrandLogo size={24} />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white">
                TorqueLab <span className="text-orange-500">Ops</span>
              </span>
              <p className="text-xs text-slate-400">TorqueLab Garage S.R.L.</p>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link to="/register" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">
                Crear cuenta
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm">
                Ingresar al Sistema
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
                <Wrench className="h-3.5 w-3.5" />
                Taller Mecánico Integral &amp; Diagnóstico Automotriz
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Control total de órdenes de trabajo y repuestos en{' '}
                <span className="text-orange-500">TorqueLab Garage S.R.L.</span>
              </h1>

              <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
                Centralizá el ingreso de vehículos, el diagnóstico técnico, la aprobación de
                presupuestos por parte del cliente y el descuento atómico de stock en una sola
                plataforma operativa.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/login">
                  <Button size="lg">
                    Ingresar al Sistema
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="secondary" size="lg">
                    Registrarme como Cliente
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <p className="font-mono text-xs text-orange-400">OT-2026-0001</p>
                    <p className="text-sm font-semibold text-white">Toyota Hilux · AF492KL</p>
                  </div>
                  <StatusBadge status="in_progress" />
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                    <span className="flex items-center gap-2 text-slate-300">
                      <Car className="h-4 w-4 text-slate-400" />
                      Vehículo en box
                    </span>
                    <span className="font-mono text-xs text-slate-400">1 orden activa máx.</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                    <span className="flex items-center gap-2 text-slate-300">
                      <Package className="h-4 w-4 text-slate-400" />
                      Stock reservado
                    </span>
                    <span className="font-mono text-xs text-emerald-400">Descuento atómico</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                    <span className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-slate-400" />
                      Presupuesto cliente
                    </span>
                    <span className="font-mono text-xs text-orange-400">Aprobación online</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-800/80 bg-slate-900/30">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-orange-400">
                  Flujo Operativo
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
                  Ciclo completo en 6 estados trazables
                </h2>
              </div>
              <p className="max-w-md text-sm text-slate-400">
                Cada orden avanza de forma controlada desde la recepción hasta el cierre final, con
                opción de cancelación y devolución automática de repuestos.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {WORKFLOW_STATES.map((item) => (
                <Card key={item.status} className="flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        ETAPA {item.step}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-sm text-slate-300">{item.summary}</p>
                  </div>
                  <div className="border-t border-slate-800 pt-3 text-xs text-slate-400">
                    Responsable: <span className="font-medium text-slate-200">{item.role}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-800/80">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="grid gap-4 md:grid-cols-3">
              {HIGHLIGHTS.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.title} className="space-y-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <p className="text-sm text-slate-400">{item.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:px-6">
          <span>TorqueLab Garage S.R.L. — TorqueLab Ops</span>
          <Link to="/login" className="font-medium text-orange-400 hover:underline">
            Ingresar al Sistema →
          </Link>
        </div>
      </footer>
    </div>
  );
}
