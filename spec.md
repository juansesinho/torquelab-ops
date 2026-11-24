# Especificación Funcional y Técnica — TorqueLab Ops

## 1. Contexto y Empresa Ficticia
**TorqueLab Garage S.R.L.** es un taller mecánico integral y centro de diagnóstico automotriz orientado a vehículos particulares y flotas livianas. Hasta hoy gestiona sus ingresos de vehículos, presupuestos e inventario de repuestos mediante planillas aisladas y mensajes de texto, lo que provoca quiebres de stock inesperados, presupuestos desactualizados y falta de trazabilidad sobre qué mecánico atiende cada unidad.

**TorqueLab Ops** es la plataforma web full stack diseñada para centralizar el ciclo completo de una orden de trabajo: desde el ingreso del vehículo y el diagnóstico técnico, pasando por el presupuesto y su aprobación por parte del cliente, hasta la asignación de repuestos con control de stock atómico y el cierre final.

---

## 2. Alcance y Roles de Usuario (RBAC)

El sistema contempla tres roles con permisos diferenciados y validados en el servidor mediante JWT:

| Rol | Identificador | Responsabilidades y Permisos |
| :--- | :--- | :--- |
| **Jefe de Taller (Admin)** | `admin` | Acceso total. Gestiona catálogo y reposición de repuestos, crea/edita vehículos, crea órdenes de trabajo, asigna mecánicos, visualiza métricas globales y puede cancelar órdenes. |
| **Mecánico** | `mechanic` | Visualiza las órdenes asignadas a su usuario (y sin asignar si corresponde), registra diagnóstico técnico, carga costo de mano de obra, agrega/quita repuestos a la orden y avanza el estado operativo. |
| **Cliente** | `client` | Visualiza únicamente sus propios vehículos y sus órdenes de trabajo. Puede **aprobar** o **rechazar** presupuestos cuando la orden está en estado `quoted`. |

---

## 3. Modelo de Datos Relacional (PostgreSQL)

### 3.1. `users`
- `id`: `SERIAL PRIMARY KEY`
- `name`: `VARCHAR(100) NOT NULL`
- `email`: `VARCHAR(150) UNIQUE NOT NULL`
- `password_hash`: `TEXT NOT NULL`
- `role`: `VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'mechanic', 'client'))`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### 3.2. `vehicles`
- `id`: `SERIAL PRIMARY KEY`
- `client_id`: `INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT`
- `plate`: `VARCHAR(15) UNIQUE NOT NULL` (normalizada en mayúsculas, sin espacios)
- `brand`: `VARCHAR(60) NOT NULL`
- `model`: `VARCHAR(60) NOT NULL`
- `year`: `INTEGER NOT NULL CHECK (year >= 1950 AND year <= 2100)`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### 3.3. `parts` (Repuestos)
- `id`: `SERIAL PRIMARY KEY`
- `sku`: `VARCHAR(40) UNIQUE NOT NULL`
- `name`: `VARCHAR(120) NOT NULL`
- `stock`: `INTEGER NOT NULL CHECK (stock >= 0)`
- `min_stock`: `INTEGER NOT NULL DEFAULT 5 CHECK (min_stock >= 0)`
- `unit_price`: `NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0)`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### 3.4. `work_orders` (Órdenes de Trabajo)
- `id`: `SERIAL PRIMARY KEY`
- `code`: `VARCHAR(20) UNIQUE NOT NULL` (ej. `OT-2026-0001`)
- `vehicle_id`: `INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT`
- `mechanic_id`: `INTEGER REFERENCES users(id) ON DELETE SET NULL`
- `status`: `VARCHAR(20) NOT NULL CHECK (status IN ('received', 'diagnosing', 'quoted', 'approved', 'in_progress', 'completed', 'cancelled'))`
- `problem_description`: `TEXT NOT NULL`
- `diagnosis`: `TEXT`
- `labor_cost`: `NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (labor_cost >= 0)`
- `total_cost`: `NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0)`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### 3.5. `work_order_items` (Repuestos utilizados en una orden)
- `id`: `SERIAL PRIMARY KEY`
- `work_order_id`: `INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE`
- `part_id`: `INTEGER NOT NULL REFERENCES parts(id) ON DELETE RESTRICT`
- `quantity`: `INTEGER NOT NULL CHECK (quantity > 0)`
- `unit_price_snapshot`: `NUMERIC(12, 2) NOT NULL CHECK (unit_price_snapshot >= 0)`
- `UNIQUE (work_order_id, part_id)`

---

## 4. Reglas de Negocio (Validación en Backend)

1. **RN-01 — Unicidad de orden activa por vehículo:** Un vehículo no puede tener más de una orden de trabajo abierta al mismo tiempo (cualquier estado distinto de `completed` y `cancelled`).
2. **RN-02 — Asignación válida de mecánico:** Al asignar `mechanic_id` a una orden, el servidor debe verificar que el usuario exista y tenga `role = 'mechanic'`.
3. **RN-03 — Máquina de estados estricta:** Las transiciones de `status` permitidas son únicamente:
   - `received` → `diagnosing` (admin / mechanic) o `cancelled` (admin)
   - `diagnosing` → `quoted` (admin / mechanic) o `cancelled` (admin)
   - `quoted` → `approved` (client dueño del vehículo / admin) o `cancelled` (client dueño / admin)
   - `approved` → `in_progress` (admin / mechanic) o `cancelled` (admin)
   - `in_progress` → `completed` (admin / mechanic) o `cancelled` (admin)
   - `completed` y `cancelled` son estados terminales e inmutables.
4. **RN-04 — Requisitos para presupuestar (`quoted`):** Una orden no puede pasar a `quoted` si `diagnosis` está vacío.
5. **RN-05 — Requisitos para finalizar (`completed`):** Una orden no puede pasar a `completed` si `diagnosis` está vacío o si `total_cost <= 0` (debe tener mano de obra o al menos un repuesto cargado).
6. **RN-06 — Descuento atómico de stock:** Al agregar o incrementar la cantidad de un repuesto en una orden, el backend debe ejecutar una transacción SQL con bloqueo de fila (`SELECT ... FOR UPDATE` sobre `parts`), validar `stock >= quantity`, descontar el stock, guardar el precio vigente en `unit_price_snapshot` y recalcular `total_cost`.
7. **RN-07 — Devolución automática de stock:** Al quitar un repuesto de una orden o al pasar una orden a `cancelled`, las cantidades reservadas en `work_order_items` deben restituirse a `parts.stock` dentro de la misma transacción.
8. **RN-08 — Inmutabilidad de órdenes cerradas:** No se pueden agregar, modificar ni eliminar repuestos ni editar costos o diagnósticos de una orden en estado `completed` o `cancelled`.

---

## 5. Casos Borde Contemplados

- **CB-01 — Concurrencia sobre último repuesto en stock:** Dos mecánicos intentan agregar simultáneamente la última unidad disponible de un mismo repuesto. El bloqueo `FOR UPDATE` garantiza que solo uno tenga éxito y el segundo reciba `409 Conflict` con mensaje descriptivo.
- **CB-02 — Cambio de precio de repuesto posterior al presupuesto:** Si el admin actualiza `parts.unit_price`, las órdenes ya presupuestadas o cerradas conservan el `unit_price_snapshot` original sin alterar presupuestos aprobados.
- **CB-03 — Cliente intentando aprobar orden ajena:** Un usuario `client` que intente consultar o aprobar una orden de un vehículo que no le pertenece recibe `403 Forbidden`.
- **CB-04 — Stock negativo en reposición o ajuste:** Cualquier intento de dejar `parts.stock < 0` es rechazado con `400 Bad Request` (y protegido además por `CHECK (stock >= 0)` en PostgreSQL).
- **CB-05 — Patente duplicada con distinto formato:** El backend normaliza patentes (`trim().toUpperCase().replace(/\s+/g, '')`) antes de validar unicidad, evitando duplicados como `ab 123 cd` vs `AB123CD`.
- **CB-06 — Eliminación de repuesto con historial:** Si un repuesto ya fue utilizado en alguna orden (`work_order_items`), no puede eliminarse (`ON DELETE RESTRICT`); el backend responde `409 Conflict`.

---

## 6. API REST (Resumen de Endpoints)

Prefijo base: `/api`

### Autenticación
- `POST /api/auth/register` — Registro de cliente (`role` forzado a `'client'`).
- `POST /api/auth/login` — Inicio de sesión, devuelve JWT y datos del usuario.
- `GET /api/auth/me` — Perfil del usuario autenticado.

### Vehículos
- `GET /api/vehicles` — Lista vehículos (`admin`/`mechanic` ven todos; `client` solo los propios).
- `POST /api/vehicles` — Registra un vehículo (`admin` o `client` para sí mismo).

### Repuestos (Inventario)
- `GET /api/parts` — Lista repuestos con indicador de stock bajo (`stock <= min_stock`).
- `POST /api/parts` — Alta de repuesto (`admin`).
- `PATCH /api/parts/:id/restock` — Suma stock a un repuesto (`admin`).

### Órdenes de Trabajo
- `GET /api/orders` — Lista órdenes filtrables por `status` o `plate`, según permisos del rol.
- `GET /api/orders/:id` — Detalle de orden, vehículo, mecánico e ítems.
- `POST /api/orders` — Crea orden en estado `received` (`admin`).
- `PATCH /api/orders/:id` — Actualiza `diagnosis`, `labor_cost` o `mechanic_id` (`admin`/`mechanic`).
- `PATCH /api/orders/:id/status` — Cambia estado validando máquina de estados y rol.
- `POST /api/orders/:id/items` — Agrega/actualiza repuesto en la orden con descuento atómico de stock (`admin`/`mechanic`).
- `DELETE /api/orders/:id/items/:itemId` — Quita repuesto de la orden y devuelve stock (`admin`/`mechanic`).

### Dashboard
- `GET /api/dashboard/summary` — Conteo de órdenes por estado, alertas de stock bajo y total facturado (`admin`/`mechanic`).

---

## 7. Criterios de Aceptación (Trazabilidad QA)

| ID | Criterio de Aceptación |
| :--- | :--- |
| **CA-01** | Un usuario puede registrarse como cliente e iniciar sesión recibiendo un JWT válido; las rutas protegidas rechazan peticiones sin token (`401`). |
| **CA-02** | El acceso por roles (RBAC) impide que un `client` cree repuestos o modifique diagnósticos, y que un `client` vea o apruebe órdenes de otro cliente (`403`). |
| **CA-03** | No se puede registrar un vehículo con patente duplicada (normalizada en mayúsculas y sin espacios). |
| **CA-04** | No se puede crear una nueva orden de trabajo para un vehículo que ya posee una orden abierta (`409`). |
| **CA-05** | Al asignar un mecánico a una orden, el sistema rechaza usuarios que no tengan rol `mechanic` (`400`). |
| **CA-06** | La máquina de estados rechaza transiciones inválidas (ej. `received` → `completed` directo) con `400`/`409`. |
| **CA-07** | No se puede pasar una orden a `quoted` sin diagnóstico cargado, ni a `completed` con `total_cost <= 0`. |
| **CA-08** | Al agregar un repuesto a una orden, el stock en `parts` disminuye en la cantidad indicada y se congela `unit_price_snapshot`. |
| **CA-09** | Si se solicita una cantidad mayor al stock disponible, el backend rechaza la operación (`409`) y no modifica el stock. |
| **CA-10** | Al quitar un repuesto de una orden o cancelar la orden, el stock regresa automáticamente al inventario. |
| **CA-11** | No se pueden agregar/quitar repuestos ni editar órdenes en estado `completed` o `cancelled`. |
| **CA-12** | El inventario resalta visualmente los repuestos con `stock <= min_stock` y permite reponer stock como `admin`. |

---

## 8. Historias de Usuario (HUs)

### Autenticación y Seguridad
- **HU-01 — Registro e inicio de sesión (`client`, `mechanic`, `admin`)**
  - **Como** usuario del taller, **quiero** registrarme como cliente e iniciar sesión con email y contraseña, **para** acceder de forma segura a las vistas correspondientes a mi rol.
  - *Trazabilidad:* `CA-01`, `CA-02`.

### Gestión de Vehículos
- **HU-02 — Registro de vehículos (`admin`, `client`)**
  - **Como** jefe de taller o cliente, **quiero** registrar un vehículo con su patente, marca, modelo y año, **para** poder asociarle órdenes de trabajo sin duplicar patentes.
  - *Trazabilidad:* `CA-03`, `CB-05`.

- **HU-03 — Consulta de flota y estado actual (`admin`, `mechanic`, `client`)**
  - **Como** usuario autenticado, **quiero** listar los vehículos permitidos por mi rol y ver si tienen una orden abierta, **para** conocer rápidamente su situación en el taller.
  - *Trazabilidad:* `CA-02`.

### Gestión de Órdenes de Trabajo
- **HU-04 — Alta de orden de trabajo (`admin`)**
  - **Como** jefe de taller, **quiero** crear una orden de trabajo para un vehículo ingresando la falla reportada y opcionalmente un mecánico asignado, **para** iniciar el flujo de atención siempre que el vehículo no tenga otra orden abierta.
  - *Trazabilidad:* `RN-01`, `RN-02`, `CA-04`, `CA-05`.

- **HU-05 — Asignación de mecánico (`admin`)**
  - **Como** jefe de taller, **quiero** asignar o reasignar un mecánico válido a una orden abierta, **para** distribuir la carga de trabajo del taller.
  - *Trazabilidad:* `RN-02`, `CA-05`.

- **HU-06 — Diagnóstico y mano de obra (`admin`, `mechanic`)**
  - **Como** mecánico asignado (o jefe de taller), **quiero** cargar el diagnóstico técnico y el costo de mano de obra de una orden abierta, **para** poder presupuestar la reparación al cliente.
  - *Trazabilidad:* `RN-04`, `RN-08`, `CA-07`, `CA-11`.

- **HU-07 — Asignación y quita de repuestos en orden (`admin`, `mechanic`)**
  - **Como** mecánico o jefe de taller, **quiero** agregar o quitar repuestos a una orden de trabajo abierta, **para** que el stock se descuente o devuelva automáticamente y el precio quede congelado al momento de presupuestar.
  - *Trazabilidad:* `RN-06`, `RN-07`, `CB-01`, `CB-02`, `CA-08`, `CA-09`, `CA-10`, `CA-11`.

- **HU-08 — Avance operativo de estados (`admin`, `mechanic`)**
  - **Como** mecánico o jefe de taller, **quiero** avanzar el estado de una orden (`received` → `diagnosing` → `quoted` y luego `approved` → `in_progress` → `completed`), **para** mantener trazabilidad real cumpliendo las validaciones de cada etapa.
  - *Trazabilidad:* `RN-03`, `RN-04`, `RN-05`, `CA-06`, `CA-07`.

- **HU-09 — Aprobación o rechazo de presupuesto (`client`, `admin`)**
  - **Como** cliente dueño del vehículo, **quiero** revisar el diagnóstico, los repuestos y el monto total de mi orden presupuestada (`quoted`) para aprobarla o cancelarla, **para** autorizar la reparación antes de que el taller continúe.
  - *Trazabilidad:* `RN-03`, `RN-07`, `CB-03`, `CA-02`, `CA-10`.

- **HU-10 — Filtrado y seguimiento de órdenes (`admin`, `mechanic`, `client`)**
  - **Como** usuario del sistema, **quiero** filtrar órdenes por estado o patente, **para** encontrar rápidamente una reparación específica.
  - *Trazabilidad:* `CA-02`.

### Inventario de Repuestos y Dashboard
- **HU-11 — Alta y reposición de repuestos (`admin`)**
  - **Como** jefe de taller, **quiero** dar de alta nuevos repuestos, visualizar alertas cuando el stock esté por debajo o igual al mínimo y registrar reposiciones, **para** evitar quiebres de inventario.
  - *Trazabilidad:* `CB-04`, `CA-12`.

- **HU-12 — Tablero de métricas del taller (`admin`, `mechanic`)**
  - **Como** jefe de taller o mecánico, **quiero** ver un resumen con órdenes activas por estado, total facturado en órdenes finalizadas y lista de repuestos con stock crítico, **para** tomar decisiones operativas diarias.
  - *Trazabilidad:* `CA-02`, `CA-12`.

