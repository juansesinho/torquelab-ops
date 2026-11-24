# Design System & Brand Identity — TorqueLab Ops

## 1. Identidad de Marca: TorqueLab Garage S.R.L.
* **Nombre comercial:** TorqueLab Garage S.R.L.
* **Producto:** TorqueLab Ops — Plataforma de Órdenes de Trabajo & Stock de Repuestos.
* **Personalidad:** Precisión técnica, transparencia mecánica y velocidad operativa. Sin adornos innecesarios; cada elemento en pantalla comunica estado, costo o acción inmediata.
* **Logotipo:** Emblema geométrico compuesto por una **tuerca hexagonal calibrada** (Torque) con un **arco de torquímetro / aguja de precisión** en ámbar (`#F97316`) formando una abstracción de **"TL"**, acompañado de tipografía bold compacta (`TorqueLab` + `Ops` en ámbar).

---

## 2. Sistema de Color (Tokens Semánticos: Dark & Light Mode)

Diseño dual (**Dark-first** para boxes/taller y **Light Mode** de alto contraste para recepción/administración):

| Token | Dark Mode | Light Mode | Uso |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#090D16` | `#F8FAFC` | Fondo principal de la aplicación |
| `--bg-surface` | `#0F172A` | `#FFFFFF` | Sidebar, tarjetas y tablas |
| `--bg-elevated` | `#1E293B` | `#F1F5F9` | Inputs, hover states y modales |
| `--border-subtle` | `#1E293B` | `#E2E8F0` | Líneas divisorias de 1px |
| `--border-strong` | `#334155` | `#CBD5E1` | Bordes de inputs y controles activos |
| `--text-primary` | `#F8FAFC` | `#0F172A` | Títulos, códigos de orden y montos |
| `--text-secondary` | `#94A3B8` | `#475569` | Etiquetas, metadatos y subtítulos |
| `--accent-primary` | `#F97316` | `#EA580C` | CTA principal, indicador activo y marca |
| `--accent-hover` | `#FB923C` | `#C2410C` | Hover sobre botones primarios |

### Paleta de Estados de Orden (`work_orders.status`)
* **Ingresado (`received`):** Slate (`#334155` / `#E2E8F0`)
* **En Diagnóstico (`diagnosing`):** Sky (`#0369A1` / `#BAE6FD`)
* **Presupuestado (`quoted`):** Amber (`#B45309` / `#FDE68A`)
* **Aprobado (`approved`):** Indigo (`#4338CA` / `#C7D2FE`)
* **En Reparación (`in_progress`):** Orange (`#C2410C` / `#FED7AA`)
* **Finalizado (`completed`):** Emerald (`#047857` / `#A7F3D0`)
* **Cancelado (`cancelled`):** Rose (`#BE123C` / `#FECDD3`)

---

## 3. Tipografía y Jerarquía
* **UI & Lectura:** `Inter`, system-ui, sans-serif.
* **Datos Técnicos y Financieros:** `JetBrains Mono` (o monospace del sistema) con `font-variant-numeric: tabular-nums` obligatorio para:
  * Códigos de orden (`OT-2026-0001`)
  * Patentes (`AF492KL`)
  * SKUs de repuestos (`FLT-ACE-01`)
  * Montos en pesos (`$ 170.500,00`) y cantidades de stock.

---

## 4. Principios de Interfaz y Motion (Emil Kowalski + Impeccable)
1. **Cero ruido visual:** Sin gradientes decorativos ni sombras pesadas. La jerarquía se construye con contraste tipográfico, espaciado consistente (escala de `4px`) y bordes finos de `1px`.
2. **Microinteracciones rápidas (`150ms–200ms`):** Curva `cubic-bezier(0.16, 1, 0.3, 1)` para transiciones de estado, apertura de modales y feedback de botones (`active:scale-[0.98]`).
3. **Respeto por `prefers-reduced-motion`:** Desactivar desplazamientos si el usuario prefiere movimiento reducido.
4. **Resiliencia de datos (*Break-UI*):**
   * Descripciones largas de fallas truncadas con `line-clamp-2` en listados y completas en detalle.
   * Tablas con scroll horizontal limpio en mobile y columnas numéricas alineadas a la derecha.
   * Estados vacíos con CTA directo (ej. *"No hay órdenes en este estado"*).
   * Alertas de stock bajo (`stock <= min_stock`) destacadas de forma inmediata en Inventario y Dashboard.

---

## 5. Vistas del Sistema
1. **`/login` y `/register`:** Acceso limpio con tarjeta centrada y **botones de Acceso Rápido Demo** (Admin, Mecánico, Cliente) para evaluación inmediata.
2. **`/dashboard`:** 4 KPIs superiores + distribución de órdenes por estado + panel de alertas de stock crítico.
3. **`/orders`:** Barra de filtros (estado + búsqueda por patente), tabla/cards de órdenes y modal de creación (`admin`).
4. **`/orders/:id`:** Timeline visual de los 6 estados, ficha del vehículo, editor de diagnóstico y mano de obra, tabla de repuestos con descuento atómico y botones de transición según rol.
5. **`/vehicles`:** Registro de vehículos con normalización de patente y badge de orden activa.
6. **`/parts`:** Catálogo de repuestos con indicador de stock mínimo y reposición rápida (`admin`).
