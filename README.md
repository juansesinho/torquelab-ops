# TorqueLab Ops — TorqueLab Garage S.R.L.

Plataforma full stack para la gestión integral de un taller mecánico: recepción de vehículos, órdenes de trabajo con máquina de estados, aprobación de presupuestos por parte del cliente e inventario de repuestos con descuento atómico en PostgreSQL.

## Enlaces de Producción
* **Frontend (Vercel):** _Pendiente de deploy_
* **Backend API (Render):** _Pendiente de deploy_

> [!NOTE]
> **Aviso de Cold Start (Render gratuito):** El backend en el plan gratuito de Render entra en suspensión tras 15 minutos de inactividad. La primera petición puede demorar entre **30 y 60 segundos** en responder mientras despierta el servidor. Podés verificar su estado en `/api/health`.

---

## Usuarios Demo (Seed)
Contraseña para todas las cuentas de prueba: **`Demo1234!`**

| Rol | Email | Uso |
| :--- | :--- | :--- |
| **Jefe de Taller (`admin`)** | `admin@torquelab.com` | Gestión total, alta de órdenes, asignación de mecánicos, stock |
| **Mecánico (`mechanic`)** | `mecanico@torquelab.com` | Diagnóstico técnico, mano de obra, repuestos y avance de estado |
| **Cliente (`client`)** | `cliente@torquelab.com` | Seguimiento de sus vehículos y aprobación/rechazo de presupuestos |

*(También hay botones de acceso rápido en la pantalla `/login`.)*

---

## Arquitectura y Stack Tecnológico
* **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 (`frontend/`).
* **Backend:** Node.js + Express + TypeScript + Zod + JWT (`backend/`), organizado en arquitectura limpia por capas:
  `routes` → `controllers` → `services` (reglas de negocio) → `repositories` (SQL).
* **Base de Datos:** PostgreSQL en **Neon** (`backend/src/db/schema.sql` + `seed.ts`).
* **Documentación:** [spec.md](./spec.md) · [design.md](./design.md) · [qa.md](./qa.md).

---

## Cómo correr el proyecto en local

### 1. Base de Datos y Backend
```bash
cd backend
cp .env.example .env
# Completá DATABASE_URL (Neon o PostgreSQL local) y JWT_SECRET en backend/.env
npm install
npm run db:init
npm run db:seed
npm run dev
```
La API quedará disponible en `http://localhost:4000/api/health`.

### 2. Frontend
```bash
cd frontend
cp .env.example .env
# Verificá VITE_API_URL=http://localhost:4000/api
npm install
npm run dev
```
El frontend quedará disponible en `http://localhost:5173`.

---

## Variables de Entorno para Producción

### Render (Backend)
* `NODE_ENV=production`
* `DATABASE_URL=<URL de conexión de Neon con sslmode=require>`
* `JWT_SECRET=<clave aleatoria segura de al menos 32 caracteres>`
* `CORS_ORIGIN=https://<tu-app>.vercel.app`

### Vercel (Frontend — Root Directory: `frontend`)
* `VITE_API_URL=https://<tu-backend>.onrender.com/api`
