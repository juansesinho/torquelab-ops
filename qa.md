# Informe de QA — TorqueLab Ops

Matriz de verificación trazable contra los Criterios de Aceptación (`CA-01` a `CA-12`) definidos en [spec.md](./spec.md).

## 1. Resumen de Ejecución Local (Build & Tests Unitarios)
* **Backend (`tsc`):** Compilación estricta TypeScript sin errores.
* **Backend (`vitest`):** Suite unitaria sobre reglas de negocio críticas (`RN-01` a `RN-08`, `CB-03`).
* **Frontend (`tsc -b && vite build`):** Build de producción sin errores.

---

## 2. Matriz de Criterios de Aceptación

| ID | Criterio | Pasos / Verificación | Resultado Esperado | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **CA-01** | Registro, login JWT y rechazo sin token (`401`) | `POST /api/auth/register`, `POST /api/auth/login` y `GET /api/orders` sin header `Authorization` | Token JWT válido en login; `401` sin token | Pendiente prueba E2E en deploy |
| **CA-02** | Control de acceso por roles (RBAC) | Intentar `POST /api/parts` como `client` o aprobar orden ajena | `403 Forbidden` | Cubierto en `orders.service.test.ts` (`CB-03`) + Pendiente E2E |
| **CA-03** | Patente duplicada normalizada | Registrar `ab 123 cd` y luego `AB123CD` | `409 Conflict` | Implementado en `vehicles.schema.ts` + `vehicles.service.ts` |
| **CA-04** | Una orden abierta por vehículo | Crear segunda orden para vehículo con orden no cerrada | `409 Conflict` | **OK** (`orders.service.test.ts` — `RN-01`) |
| **CA-05** | Asignar solo usuarios `mechanic` | Crear/editar orden con `mechanic_id` de un `client` | `400 Bad Request` | **OK** (`orders.service.test.ts` — `RN-02`) |
| **CA-06** | Máquina de estados estricta | Intentar transición `received` → `completed` | `409 Conflict` | **OK** (`orders.service.test.ts` — `RN-03`) |
| **CA-07** | Requisitos para `quoted` y `completed` | Pasar a `quoted` sin diagnóstico o `completed` con `total_cost = 0` | `400 Bad Request` | **OK** (`orders.service.test.ts` — `RN-04`, `RN-05`) |
| **CA-08** | Descuento atómico y precio congelado | Agregar repuesto a orden y verificar `parts.stock` y `unit_price_snapshot` | Stock descontado y precio congelado | Implementado en `orders.service.ts` (`FOR UPDATE`) |
| **CA-09** | Rechazo por stock insuficiente | Solicitar `quantity > parts.stock` | `409 Conflict` sin alterar stock | **OK** (`orders.service.test.ts` — `RN-06`) |
| **CA-10** | Devolución de stock al quitar/cancelar | Quitar ítem o cancelar orden con repuestos | `parts.stock` incrementado | Implementado en `orders.service.ts` (`RN-07`) |
| **CA-11** | Inmutabilidad de órdenes cerradas | Editar orden en estado `completed` o `cancelled` | `409 Conflict` | **OK** (`orders.service.test.ts` — `RN-08`) |
| **CA-12** | Alerta de stock bajo y reposición | Visualizar `/parts` con `stock <= min_stock` y ejecutar `PATCH /api/parts/:id/restock` | Alerta visible y stock incrementado | Pendiente prueba E2E en deploy |
