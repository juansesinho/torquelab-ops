import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/ui/BrandLogo';

gsap.registerPlugin(ScrollTrigger);

const STAGES = [
  {
    key: 'received',
    stepLabel: '1. Ingresado',
    badge: 'STATUS: RECEIVED',
    title: 'Recepción de la unidad',
    desc: 'El Jefe de Taller registra el ingreso del vehículo con su patente normalizada, falla reportada y mecánico responsable.',
    actor: 'admin',
    rule: 'Sin otra orden abierta para la patente',
    stock: 'Sin movimiento',
  },
  {
    key: 'diagnosing',
    stepLabel: '2. En Diagnóstico',
    badge: 'STATUS: DIAGNOSING',
    title: 'Inspección técnica en box',
    desc: 'El mecánico asignado realiza pruebas OBD-II y revisión física para redactar el diagnóstico y estimar mano de obra.',
    actor: 'admin / mechanic',
    rule: 'Transición válida desde received',
    stock: 'Reserva de repuestos habilitada',
  },
  {
    key: 'quoted',
    stepLabel: '3. Presupuestado',
    badge: 'STATUS: QUOTED',
    title: 'Presupuesto enviado al cliente',
    desc: 'Con diagnóstico cargado y repuestos asignados, la orden queda lista para revisión del dueño del vehículo.',
    actor: 'admin / mechanic',
    rule: 'Diagnóstico obligatorio no vacío',
    stock: 'Precios congelados en snapshot',
  },
  {
    key: 'approved',
    stepLabel: '4. Aprobado',
    badge: 'STATUS: APPROVED',
    title: 'Autorización del cliente',
    desc: 'El cliente dueño del vehículo aprueba el monto total desde su panel. Nadie más puede aprobar por él.',
    actor: 'client (dueño) / admin',
    rule: 'Validación de propiedad del vehículo',
    stock: 'Stock confirmado para trabajo',
  },
  {
    key: 'in_progress',
    stepLabel: '5. En Reparación',
    badge: 'STATUS: IN_PROGRESS',
    title: 'Reparación en curso',
    desc: 'El taller ejecuta el reemplazo de piezas y ajustes mecánicos siguiendo el presupuesto aprobado.',
    actor: 'admin / mechanic',
    rule: 'Solo desde estado approved',
    stock: 'Descontado en transacción',
  },
  {
    key: 'completed',
    stepLabel: '6. Finalizado',
    badge: 'STATUS: COMPLETED',
    title: 'Cierre inmutable y entrega',
    desc: 'La orden queda cerrada en el historial del vehículo y bloqueada contra futuras ediciones.',
    actor: 'admin / mechanic',
    rule: 'Requiere diagnóstico y total > 0',
    stock: 'Consumo definitivo',
  },
];

const FAQS = [
  {
    q: '¿Cómo aprueba el cliente un presupuesto?',
    a: 'Al pasar la orden a estado Presupuestado, el cliente ingresa con su cuenta, revisa el diagnóstico, los repuestos cargados y el total final, y aprueba o cancela directamente desde la web.',
  },
  {
    q: '¿Qué sucede con los repuestos si se cancela la orden?',
    a: 'El servidor ejecuta una transacción SQL que devuelve automáticamente todas las unidades reservadas al inventario general de TorqueLab.',
  },
  {
    q: '¿Se puede modificar una orden ya finalizada?',
    a: 'No. Los estados Finalizado y Cancelado son terminales e inmutables para garantizar integridad contable y de historial técnico.',
  },
];

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const navLinksRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [scrolled, setScrolled] = useState(false);
  const [activeNav, setActiveNav] = useState('#ingenieria');
  const [stageIdx, setStageIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const isDark = theme === 'dark';

  const palette = isDark
    ? {
        bgHero: '#0B0D12',
        bgAlt: '#F2EFE9',
        textAlt: '#111318',
        mutedAlt: '#4B5563',
        borderAlt: '#D6D1C7',
        bgStage: '#12151C',
        bgFaq: '#0B0D12',
        surface: '#1A1F29',
        borderMain: '#232936',
        textMain: '#F5F5F4',
        textMuted: '#9CA3AF',
        accent: '#F97316',
        accentInk: '#0B0D12',
        navBg: 'rgba(11, 13, 18, 0.88)',
      }
    : {
        bgHero: '#F5F3EE',
        bgAlt: '#111318',
        textAlt: '#F5F5F4',
        mutedAlt: '#9CA3AF',
        borderAlt: '#272B36',
        bgStage: '#EAE6DD',
        bgFaq: '#F5F3EE',
        surface: '#FFFFFF',
        borderMain: '#D8D3C8',
        textMain: '#111318',
        textMuted: '#4B5563',
        accent: '#EA580C',
        accentInk: '#FFFFFF',
        navBg: 'rgba(245, 243, 238, 0.9)',
      };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function moveIndicator(el: HTMLElement | null) {
    if (!el || !indicatorRef.current) return;
    gsap.to(indicatorRef.current, {
      x: el.offsetLeft,
      width: el.offsetWidth,
      duration: 0.25,
      ease: 'power3.out',
    });
  }

  useEffect(() => {
    const activeEl = navLinksRef.current?.querySelector<HTMLElement>(
      `a[href="${activeNav}"]`
    );
    if (activeEl) moveIndicator(activeEl);
  }, [activeNav]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.from('.hero-stagger', {
        y: 26,
        opacity: 0,
        duration: 0.75,
        stagger: 0.1,
        ease: 'power3.out',
      });

      gsap.from('.hero-visual', {
        scale: 0.96,
        opacity: 0,
        duration: 0.85,
        delay: 0.15,
        ease: 'power3.out',
      });

      gsap.to('#ringOuter', {
        rotation: 360,
        svgOrigin: '120 120',
        duration: 36,
        repeat: -1,
        ease: 'none',
      });

      gsap.to('#heroNeedle', {
        rotation: 34,
        svgOrigin: '120 120',
        duration: 2.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.from('.spec-row', {
        scrollTrigger: { trigger: '.spec-list', start: 'top 80%' },
        y: 20,
        opacity: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: 'power2.out',
      });

      document.querySelectorAll<HTMLElement>('.counter').forEach((el) => {
        const target = Number(el.dataset.target ?? 0);
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 1.4,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          onUpdate: () => {
            el.textContent = Math.round(obj.val).toLocaleString('es-AR');
          },
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  function handleSelectStage(idx: number) {
    if (idx === stageIdx) return;
    if (
      inspectorRef.current &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      gsap.to(inspectorRef.current, {
        opacity: 0,
        y: 6,
        duration: 0.14,
        ease: 'power2.in',
        onComplete: () => {
          setStageIdx(idx);
          gsap.to(inspectorRef.current, {
            opacity: 1,
            y: 0,
            duration: 0.22,
            ease: 'power3.out',
          });
        },
      });
    } else {
      setStageIdx(idx);
    }
  }

  const currentStage = STAGES[stageIdx];

  return (
    <div
      ref={rootRef}
      style={{
        backgroundColor: palette.bgHero,
        color: palette.textMain,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      className="min-h-screen overflow-x-hidden transition-colors duration-200"
    >
      {/* Dynamic Navbar */}
      <div
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-200"
        style={{
          backgroundColor: scrolled ? palette.navBg : 'transparent',
          backdropFilter: scrolled ? 'blur(14px)' : 'none',
          borderBottom: `1px solid ${scrolled ? palette.borderMain : 'transparent'}`,
        }}
      >
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-6 px-5 sm:px-8 transition-all duration-200"
          style={{ height: scrolled ? 62 : 76 }}
        >
          <Link
            to="/"
            className="flex items-center gap-3 text-lg font-bold tracking-tight no-underline"
            style={{
              color: palette.textMain,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <BrandLogo size={28} />
            <span>
              TorqueLab <span style={{ color: palette.accent }}>Ops</span>
            </span>
          </Link>

          <div
            ref={navLinksRef}
            className="relative hidden md:flex items-center gap-7"
            onMouseLeave={() => {
              const el = navLinksRef.current?.querySelector<HTMLElement>(
                `a[href="${activeNav}"]`
              );
              if (el) moveIndicator(el);
            }}
          >
            {[
              { href: '#ingenieria', label: 'Ingeniería' },
              { href: '#flujo', label: 'Flujo de Orden' },
              { href: '#garantia', label: 'Garantías' },
              { href: '#faq', label: 'Consultas' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                onMouseEnter={(e) => moveIndicator(e.currentTarget)}
                onClick={() => setActiveNav(item.href)}
                className="py-1.5 text-sm font-medium no-underline transition-colors"
                style={{
                  color:
                    activeNav === item.href
                      ? palette.textMain
                      : palette.textMuted,
                }}
              >
                {item.label}
              </a>
            ))}
            <span
              ref={indicatorRef}
              className="pointer-events-none absolute bottom-0 left-0 h-[2px]"
              style={{ backgroundColor: palette.accent, width: 0 }}
            />
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-xs font-medium cursor-pointer transition active:scale-[0.97]"
              style={{
                border: `1px solid ${palette.borderMain}`,
                color: palette.textMain,
              }}
            >
              {isDark ? 'Modo Claro' : 'Modo Oscuro'}
            </button>
            <Link
              to="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold no-underline transition hover:opacity-90 active:scale-[0.97]"
              style={{
                backgroundColor: palette.accent,
                color: palette.accentInk,
              }}
            >
              Ingresar
            </Link>
          </div>
        </div>
      </div>

      {/* Section 1: Hero */}
      <section
        className="pt-36 pb-24"
        style={{
          backgroundColor: palette.bgHero,
          borderBottom: `1px solid ${palette.borderMain}`,
        }}
      >
        <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h1
              className="hero-stagger mb-6 text-[clamp(2.6rem,5.8vw,4.65rem)] font-bold leading-[1.03]"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: '-0.03em',
              }}
            >
              Mecánica de precisión con{' '}
              <span style={{ color: palette.accent }}>trazabilidad real</span>{' '}
              en cada orden.
            </h1>
            <p
              className="hero-stagger mb-9 max-w-[52ch] text-lg"
              style={{ color: palette.textMuted }}
            >
              TorqueLab Garage S.R.L. combina diagnóstico computarizado,
              aprobación digital de presupuestos y control atómico de repuestos
              en un solo flujo operativo.
            </p>
            <div className="hero-stagger flex flex-wrap items-center gap-3.5">
              <Link
                to="/login"
                className="inline-flex h-12 items-center justify-center rounded-lg px-6 text-sm font-semibold no-underline transition hover:opacity-90 active:scale-[0.97]"
                style={{
                  backgroundColor: palette.accent,
                  color: palette.accentInk,
                }}
              >
                Ingresar al Sistema
              </Link>
              <Link
                to="/register"
                className="inline-flex h-12 items-center justify-center rounded-lg px-5 text-sm font-medium no-underline transition active:scale-[0.97]"
                style={{
                  border: `1px solid ${palette.borderMain}`,
                  color: palette.textMain,
                }}
              >
                Registrarme como Cliente
              </Link>
            </div>
          </div>

          <div
            className="hero-visual flex flex-col items-center justify-center rounded-2xl p-8"
            style={{
              backgroundColor: palette.surface,
              border: `1px solid ${palette.borderMain}`,
            }}
          >
            <svg
              width="240"
              height="240"
              viewBox="0 0 240 240"
              fill="none"
              aria-label="Diagrama mecánico TorqueLab"
            >
              <circle
                id="ringOuter"
                cx="120"
                cy="120"
                r="98"
                stroke={palette.borderMain}
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              <circle
                cx="120"
                cy="120"
                r="76"
                stroke={palette.accent}
                strokeWidth="2"
                strokeOpacity="0.35"
              />
              <path
                d="M120 28L199.6 74V166L120 212L40.4 166V74L120 28Z"
                stroke={palette.textMain}
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <path
                d="M72 152A60 60 0 1 1 174 92"
                stroke={palette.accent}
                strokeWidth="4"
                strokeLinecap="round"
              />
              <g id="heroNeedle">
                <line
                  x1="120"
                  y1="120"
                  x2="174"
                  y2="68"
                  stroke={palette.accent}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </g>
              <circle cx="120" cy="120" r="9" fill={palette.textMain} />
              <circle cx="120" cy="120" r="4" fill={palette.accent} />
            </svg>
            <div
              className="mt-5 flex w-full items-center justify-between pt-4 font-mono text-xs"
              style={{
                borderTop: `1px solid ${palette.borderMain}`,
                color: palette.textMuted,
              }}
            >
              <span>TORQUELAB GARAGE S.R.L.</span>
              <span style={{ color: palette.accent }}>CALIBRADO // 120 Nm</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Inverted Contrast Band */}
      <section
        id="ingenieria"
        className="py-24"
        style={{ backgroundColor: palette.bgAlt, color: palette.textAlt }}
      >
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div
            className="grid items-end gap-10 pb-12 md:grid-cols-2"
            style={{ borderBottom: `1px solid ${palette.borderAlt}` }}
          >
            <h2
              className="text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.08]"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: '-0.03em',
              }}
            >
              Diseñado para eliminar la incertidumbre del taller.
            </h2>
            <p className="max-w-[48ch]" style={{ color: palette.mutedAlt }}>
              Sin planillas sueltas ni presupuestos verbales. Cada vehículo,
              repuesto y hora de mano de obra responde a reglas verificables en
              el servidor.
            </p>
          </div>

          <div className="spec-list grid">
            {[
              {
                code: 'SPEC // 01',
                title: 'Diagnóstico antes de presupuestar',
                desc: 'Ninguna orden puede cotizarse sin registro técnico previo del mecánico asignado y desglose exacto de mano de obra.',
              },
              {
                code: 'SPEC // 02',
                title: 'Reserva atómica de inventario',
                desc: 'Al asignar un repuesto a una orden, PostgreSQL bloquea la fila y descuenta el stock real. Si se cancela, vuelve al depósito.',
              },
              {
                code: 'SPEC // 03',
                title: 'Precios congelados por orden',
                desc: 'El cliente aprueba un presupuesto cerrado: aunque el repuesto cambie de precio mañana, la orden conserva su valor original.',
              },
              {
                code: 'SPEC // 04',
                title: 'Una orden activa por patente',
                desc: 'Evita duplicados y superposiciones entre mecánicos normalizando cada patente al ingresar al sistema.',
              },
            ].map((row) => (
              <div
                key={row.code}
                className="spec-row grid items-baseline gap-4 py-7 md:grid-cols-[120px_1.2fr_1.5fr] md:gap-6"
                style={{ borderBottom: `1px solid ${palette.borderAlt}` }}
              >
                <span
                  className="font-mono text-xs font-semibold"
                  style={{ color: palette.accent }}
                >
                  {row.code}
                </span>
                <h3
                  className="text-xl font-bold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {row.title}
                </h3>
                <p className="text-sm" style={{ color: palette.mutedAlt }}>
                  {row.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Interactive Workflow Stage */}
      <section
        id="flujo"
        className="py-24"
        style={{
          backgroundColor: palette.bgStage,
          borderTop: `1px solid ${palette.borderMain}`,
          borderBottom: `1px solid ${palette.borderMain}`,
        }}
      >
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <h2
            className="max-w-[18ch] text-[clamp(2rem,3.8vw,2.75rem)] font-bold leading-tight"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '-0.03em',
            }}
          >
            Seis estados auditados de principio a fin.
          </h2>

          <div className="mt-10 grid items-start gap-12 lg:grid-cols-[0.95fr_1.05fr]">
            <div style={{ borderTop: `1px solid ${palette.borderMain}` }}>
              {STAGES.map((st, idx) => {
                const active = idx === stageIdx;
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => handleSelectStage(idx)}
                    className="flex w-full items-center justify-between py-4 px-4 text-left transition-all cursor-pointer"
                    style={{
                      borderBottom: `1px solid ${palette.borderMain}`,
                      borderLeft: active
                        ? `3px solid ${palette.accent}`
                        : '3px solid transparent',
                      paddingLeft: active ? 22 : 16,
                      backgroundColor: active ? palette.surface : 'transparent',
                      color: active ? palette.textMain : palette.textMuted,
                    }}
                  >
                    <span
                      className="text-base font-semibold"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {st.stepLabel}
                    </span>
                    <span className="font-mono text-xs">{st.key}</span>
                  </button>
                );
              })}
            </div>

            <div
              ref={inspectorRef}
              className="rounded-2xl p-8"
              style={{
                backgroundColor: palette.surface,
                border: `1px solid ${palette.borderMain}`,
              }}
            >
              <span
                className="mb-4 inline-block rounded-md px-2.5 py-1 font-mono text-xs font-semibold"
                style={{
                  backgroundColor: 'rgba(249, 115, 22, 0.14)',
                  color: palette.accent,
                }}
              >
                {currentStage.badge}
              </span>
              <h3
                className="mb-3 text-2xl font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {currentStage.title}
              </h3>
              <p className="mb-6" style={{ color: palette.textMuted }}>
                {currentStage.desc}
              </p>

              <div
                className="grid gap-3 pt-5 text-sm"
                style={{ borderTop: `1px solid ${palette.borderMain}` }}
              >
                <div className="flex justify-between gap-4">
                  <span style={{ color: palette.textMuted }}>
                    Actor habilitado
                  </span>
                  <strong className="font-mono">{currentStage.actor}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span style={{ color: palette.textMuted }}>
                    Validación servidor
                  </span>
                  <strong>{currentStage.rule}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span style={{ color: palette.textMuted }}>
                    Impacto en stock
                  </span>
                  <strong>{currentStage.stock}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: High-Impact Accent Band */}
      <section
        id="garantia"
        className="py-20"
        style={{ backgroundColor: palette.accent, color: '#0B0D12' }}
      >
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.3fr_1fr]">
          <h2
            className="text-[clamp(2rem,4.2vw,3.1rem)] font-bold leading-[1.06]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '-0.03em',
            }}
          >
            Control operativo real, respaldado por datos en producción.
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="border-t-2 border-slate-950/30 pt-3.5">
              <div
                className="counter font-mono text-4xl font-bold"
                data-target="1480"
              >
                0
              </div>
              <div className="mt-1 text-sm font-medium opacity-85">
                Órdenes cerradas con trazabilidad
              </div>
            </div>
            <div className="border-t-2 border-slate-950/30 pt-3.5">
              <div className="font-mono text-4xl font-bold">
                <span className="counter" data-target="98">
                  0
                </span>
                %
              </div>
              <div className="mt-1 text-sm font-medium opacity-85">
                Presupuestos aprobados en el día
              </div>
            </div>
            <div className="border-t-2 border-slate-950/30 pt-3.5">
              <div className="font-mono text-4xl font-bold">
                <span className="counter" data-target="24">
                  0
                </span>
                h
              </div>
              <div className="mt-1 text-sm font-medium opacity-85">
                Diagnóstico promedio en box
              </div>
            </div>
            <div className="border-t-2 border-slate-950/30 pt-3.5">
              <div className="font-mono text-4xl font-bold">0</div>
              <div className="mt-1 text-sm font-medium opacity-85">
                Quiebres de stock en reparación
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: FAQ & Footer */}
      <section
        id="faq"
        className="pt-24 pb-16"
        style={{ backgroundColor: palette.bgFaq }}
      >
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="grid items-start gap-14 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <h2
                className="mb-3.5 text-[clamp(1.9rem,3.5vw,2.5rem)] font-bold"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: '-0.03em',
                }}
              >
                Preguntas frecuentes
              </h2>
              <p className="max-w-[36ch]" style={{ color: palette.textMuted }}>
                Todo lo que necesitás saber sobre cómo opera TorqueLab Garage
                S.R.L. y su plataforma.
              </p>
            </div>

            <div style={{ borderTop: `1px solid ${palette.borderMain}` }}>
              {FAQS.map((item, idx) => {
                const open = openFaq === idx;
                return (
                  <div
                    key={item.q}
                    style={{ borderBottom: `1px solid ${palette.borderMain}` }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : idx)}
                      className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-semibold cursor-pointer"
                      style={{
                        color: palette.textMain,
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      <span>{item.q}</span>
                      <span
                        className="text-xl transition-transform duration-200"
                        style={{
                          color: palette.accent,
                          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
                        }}
                      >
                        +
                      </span>
                    </button>
                    {open && (
                      <p
                        className="pb-5 text-sm"
                        style={{ color: palette.textMuted }}
                      >
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <footer
            className="mt-20 flex flex-wrap items-center justify-between gap-4 pt-7 text-xs"
            style={{
              borderTop: `1px solid ${palette.borderMain}`,
              color: palette.textMuted,
            }}
          >
            <span>© 2026 TorqueLab Garage S.R.L. — Córdoba, Argentina</span>
            <span className="font-mono">
              Av. Fuerza Aérea 2450 · Lun a Sáb 08:30–19:00
            </span>
          </footer>
        </div>
      </section>
    </div>
  );
}
