import {
  Bell,
  Car,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  Package,
  RefreshCw,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import { ComponentType, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/domain';
import { Button } from './ui/Button';

interface TourStep {
  title: string;
  description: string;
  tip: string;
  icon: ComponentType<{ className?: string }>;
}

const ROLE_STEPS: Record<UserRole, TourStep[]> = {
  admin: [
    {
      title: 'Bienvenido al Panel de Jefe de Taller',
      description:
        'Desde el Dashboard controlás órdenes activas, facturación cerrada y alertas de stock crítico. Cada estado es clickeable para filtrar al instante.',
      tip: 'Podés reponer +5 unidades rápido directo desde las alertas del tablero.',
      icon: LayoutDashboard,
    },
    {
      title: 'Ingresos, Vehículos y Órdenes',
      description:
        'Registrá clientes, vehículos (con kilometraje y patente normalizada) y abrí órdenes con fecha estimada de entrega. El sistema evita duplicar órdenes abiertas por patente.',
      tip: 'Desde la tarjeta de cualquier vehículo libre podés abrir una orden en 1 clic.',
      icon: Car,
    },
    {
      title: 'Equipo de Mecánicos y Presupuestos',
      description:
        'En "Equipo" das de alta nuevos mecánicos. Cada mecánico solo ve sus órdenes asignadas y la cola sin asignar para tomar trabajos.',
      tip: 'Si surge una falla extra, podés usar "Represupuestar" para enviar una nueva versión al cliente.',
      icon: Users,
    },
    {
      title: 'Inventario con Kardex Auditable',
      description:
        'En "Repuestos" registrás ingresos de proveedores (con costo y remito), egresos por merma y ajustes. Cada movimiento queda en el historial Kardex.',
      tip: 'Al asignar un repuesto a una orden se congela su precio unitario automáticamente.',
      icon: Package,
    },
  ],
  mechanic: [
    {
      title: 'Tu Bandeja de Trabajo en Box',
      description:
        'En "Órdenes" tenés dos pestañas: "Mis Órdenes Asignadas" (solo tus trabajos) y "Cola Sin Asignar" para tomar vehículos recién ingresados.',
      tip: 'Hacé clic en "Tomar Orden" para asignarte un vehículo disponible.',
      icon: Wrench,
    },
    {
      title: 'Diagnóstico, Repuestos y Presupuesto en 1 Clic',
      description:
        'Dentro de una orden usá las plantillas rápidas de diagnóstico, cargá mano de obra, sumá repuestos del depósito y presioná "Guardar y Enviar Presupuesto".',
      tip: 'Si descubrís otra falla durante la reparación, usá "Represupuestar" para notificar al cliente.',
      icon: RefreshCw,
    },
    {
      title: 'Notificaciones en Tiempo Real',
      description:
        'La campana superior te avisa ni bien el cliente aprueba o rechaza tu presupuesto, o cuando el Jefe de Taller te asigna una nueva unidad.',
      tip: 'Recordá finalizar la orden al terminar para avisar automáticamente al cliente.',
      icon: Bell,
    },
  ],
  client: [
    {
      title: 'Bienvenido a tu Portal de Cliente',
      description:
        'Acá seguís el estado de tus vehículos en tiempo real con una barra visual de 6 etapas, sin necesidad de llamar al taller.',
      tip: 'Podés registrar tus propios vehículos desde "Mis Vehículos".',
      icon: ClipboardList,
    },
    {
      title: 'Presupuestos Transparentes y Aprobación Online',
      description:
        'Cuando el mecánico termina el diagnóstico, verás una tarjeta destacada con el desglose exacto de repuestos (a precio congelado) y mano de obra.',
      tip: 'Aprobá o rechazá con un clic, o imprimí el presupuesto en PDF.',
      icon: CheckCircle2,
    },
    {
      title: 'Avisos Automáticos en la Campana',
      description:
        'Recibirás notificaciones cuando tu presupuesto esté listo, si hubiera un represupuesto con su motivo detallado, y cuando tu vehículo esté listo para retirar.',
      tip: 'Podés volver a abrir esta guía en cualquier momento desde el botón "Guía de uso".',
      icon: Bell,
    },
  ],
};

export function OnboardingTour({
  forceOpen,
  onCloseForce,
}: {
  forceOpen: boolean;
  onCloseForce: () => void;
}) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  const storageKey = user ? `torquelab_onboarding_v1_${user.id}` : null;

  useEffect(() => {
    if (!user || !storageKey) return;
    if (forceOpen) {
      setStep(0);
      setVisible(true);
      return;
    }
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setStep(0);
      setVisible(true);
    }
  }, [user, storageKey, forceOpen]);

  if (!user || !visible) return null;

  const steps = ROLE_STEPS[user.role];
  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  function finish() {
    if (storageKey) {
      localStorage.setItem(storageKey, 'done');
    }
    setVisible(false);
    onCloseForce();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm print:hidden"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl border border-orange-500/35 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
            <Sparkles className="h-3.5 w-3.5" />
            Guía Rápida · Paso {step + 1} de {steps.length}
          </span>
          <button
            type="button"
            onClick={finish}
            className="text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Omitir guía
          </button>
        </div>

        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-500/40 bg-orange-500/15 text-orange-400">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{current.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
              {current.description}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-300">
          <strong className="text-orange-400">Tip práctico: </strong>
          {current.tip}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === step ? 'w-6 bg-orange-500' : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setStep(step - 1)}>
                Anterior
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={finish}>
                ¡Entendido, empezar!
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep(step + 1)}>
                Siguiente →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
