# Informe de QA — TorqueLab Ops

Matriz de verificación trazable contra los Criterios de Aceptación (`CA-01` a `CA-12`) definidos en [spec.md](./spec.md).

## 1. Resumen de Ejecución Local
* **Backend (`tsc`):** Compilación estricta TypeScript sin errores.
* **Backend (`vitest`):** `4` suites, **`20/20` tests unitarios aprobados** (`auth`, `vehicles`, `parts`, `orders`).
* **Prueba E2E en vivo (API + PostgreSQL 16):** Flujo completo ejecutado sobre `http://localhost:4000/api` cubriendo `HU-01` a `HU-12`.
* **Frontend (`tsc -b && vite build`):** Build de producción sin errores.

---

## 2. Matriz de Criterios de Aceptación

| ID | Criterio | Pasos / Verificación | Resultado Esperado | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **CA-01** | Registro, login JWT y rechazo sin token (`401`) | `POST /api/auth/login` + `GET /api/orders` sin header `Authorization` | Token JWT válido en login; `401` sin token | **OK** (`auth.service.test.ts` + E2E local: `401`) |
| **CA-02** | Control de acceso por roles (RBAC) | Intentar `POST /api/parts` como `client`, alta vehículo como `mechanic` o aprobar orden ajena | `403 Forbidden` | **OK** (`orders.service.test.ts`, `vehicles.service.test.ts`) |
| **CA-03** | Patente duplicada normalizada | Registrar `ZZxxxTL` con espacios y repetir | `409 Conflict` | **OK** (`vehicles.service.test.ts` + E2E local: `409`) |
| **CA-04** | Una orden abierta por vehículo | Crear segunda orden para vehículo con orden no cerrada | `409 Conflict` | **OK** (`orders.service.test.ts` + E2E local: `409`) |
| **CA-05** | Asignar solo usuarios `mechanic` | Crear/editar orden con `mechanic_id` de un `client` | `400 Bad Request` | **OK** (`orders.service.test.ts` — `RN-02`) |
| **CA-06** | Máquina de estados estricta | Intentar transición `received` → `completed`; ejecutar flujo completo de 6 estados | `409 Conflict` en salto inválido; `completed` en flujo válido | **OK** (`orders.service.test.ts` + E2E local: `completed`) |
| **CA-07** | Requisitos para `quoted` y `completed` | Pasar a `quoted` sin diagnóstico o `completed` con `total_cost = 0` | `400 Bad Request` | **OK** (`orders.service.test.ts` — `RN-04`, `RN-05`) |
| **CA-08** | Descuento atómico y precio congelado | Agregar repuesto a orden (`stock: 3`) y verificar `parts.stock` y `total_cost` | Stock descontado (`3 → 2`) y total actualizado (`98000.00`) | **OK** (E2E local contra PostgreSQL) |
| **CA-09** | Rechazo por stock insuficiente | Solicitar `quantity > parts.stock` | `409 Conflict` sin alterar stock | **OK** (`orders.service.test.ts` — `RN-06`) |
| **CA-10** | Devolución de stock al quitar/cancelar | Quitar ítem o cancelar orden con repuestos | `parts.stock` incrementado | **OK** (`orders.service.ts` — `RN-07`) |
| **CA-11** | Inmutabilidad de órdenes cerradas | Editar orden en estado `completed` o `cancelled` | `409 Conflict` | **OK** (`orders.service.test.ts` — `RN-08`) |
| **CA-12** | Alerta de stock bajo y reposición | Ejecutar `PATCH /api/parts/:id/restock` (`+1`) y consultar `/api/dashboard/summary` | Stock restituido (`2 → 3`) y resumen actualizado | **OK** (`parts.service.test.ts` + E2E local) |
| **CA-13** | Notificaciones automáticas y lectura | Disparar cambio de estado/represupuesto/pago y consultar `GET /api/notifications` | Notificación creada con `unread_count` y marcable como leída | **OK** (E2E local contra PostgreSQL) |
| **CA-14** | Represupuesto versionado (`POST /api/orders/:id/requote`) | Represupuestar orden en `in_progress` con motivo | `quote_version` incrementado (`v2`), estado vuelve a `quoted` y notifica al cliente | **OK** (E2E local: `OT-2026-0003 VER=2`) |
| **CA-15** | Alta de mecánicos, aislamiento y Kardex de stock | `POST /api/auth/mechanics`, `GET /api/orders` como mecánico y `POST /api/parts/:id/movements` | Mecánico solo ve sus órdenes (`403` en ajenas), kardex auditable y sin stock negativo | **OK** (E2E local: `FOREIGN_ORDER_STATUS=403`, `KARDEX_COUNT=1`) |
| **CA-16** | Edición e historial de vehículos | `PATCH /api/vehicles/:id` y `GET /api/vehicles/:id/orders` | Datos actualizados respetando patente única e historial cronológico | **OK** (Implementado y compilado) |
| **CA-17** | Semáforo técnico, pagos/señas y guía inicial | Guardar `inspection_checklist`, `POST /api/orders/:id/payments` y onboarding por rol | Semáforo persistido en JSONB, pago validado contra saldo pendiente y guía por rol | **OK** (Verificado en build y E2E local) |
