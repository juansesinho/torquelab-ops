# Guía de Deploy en Producción — TorqueLab Ops (Neon + Render + Vercel)

Esta guía está pensada para desplegar el proyecto **TorqueLab Ops** paso a paso usando las cuentas gratuitas de **Neon**, **Render** y **Vercel**, evitando los errores más comunes (CORS, variables de entorno y base vacía).

---

## Orden obligatorio de despliegue
1. **Neon** (Base de datos PostgreSQL + tablas + datos demo)
2. **Render** (Backend API Express + TypeScript)
3. **Vercel** (Frontend React + Vite + Tailwind)
4. **Cerrar CORS en Render** y probar en modo incógnito

---

## Paso 1 — Base de Datos en Neon (PostgreSQL)

1. Ingresá a [console.neon.tech](https://console.neon.tech) y creá un proyecto nuevo (ej. `torquelab-ops`).
2. En el panel del proyecto, hacé clic en **Connect** y copiá el **Connection String** (debe terminar en `?sslmode=require`).
3. En tu PC, cloná o abrí el repositorio y creá `backend/.env` (copiando `backend/.env.example`):
   ```env
   PORT=4000
   NODE_ENV=development
   DATABASE_URL=postgresql://usuario:clave@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   JWT_SECRET=genera_una_clave_larga_aleatoria_de_al_menos_32_caracteres
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:5173
   ```
   > **Importante:** Nunca subas `.env` a GitHub (ya está en `.gitignore`).
4. Inicializá las 8 tablas y cargá los usuarios y datos de prueba directo en Neon:
   ```bash
   cd backend
   npm install
   npm run db:init
   npm run db:seed
   ```
   Tenés que ver:
   * `✅ Esquema PostgreSQL inicializado correctamente.`
   * `✅ Seed completado: usuarios demo, vehículos, repuestos y órdenes creadas.`

---

## Paso 2 — Backend API en Render

1. Ingresá a [dashboard.render.com](https://dashboard.render.com).
2. Hacé clic en **New +** → **Web Service**.
3. Conectá tu cuenta de GitHub y elegí el repositorio **`juansesinho/torquelab-ops`**.
4. Completá la configuración exacta:
   * **Name:** `torquelab-ops-api`
   * **Branch:** `main`
   * **Root Directory:** `backend`
   * **Runtime:** `Node`
   * **Build Command:** `npm install && npm run build`
   * **Start Command:** `npm start`
   * **Instance Type:** `Free`
5. En **Environment Variables**, agregá estas 5 variables:

   | Key | Value |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(Pegá la URL exacta de Neon con `?sslmode=require`)* |
   | `JWT_SECRET` | *(Una clave aleatoria larga de 32+ caracteres)* |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CORS_ORIGIN` | `http://localhost:5173` *(temporal hasta el Paso 4)* |

6. Hacé clic en **Create Web Service** y esperá a que termine el build.
7. Copiá la URL pública de Render (ej. `https://torquelab-ops-api.onrender.com`) y probá en el navegador:
   ```text
   https://<tu-backend>.onrender.com/api/health
   ```
   Debe responder `{"status":"ok","service":"torquelab-ops-backend",...}`.

---

## Paso 3 — Frontend en Vercel

1. Ingresá a [vercel.com](https://vercel.com) → **Add New…** → **Project**.
2. Importá el repositorio **`juansesinho/torquelab-ops`**.
3. Configurá:
   * **Framework Preset:** `Vite`
   * **Root Directory:** hacé clic en **Edit** y seleccioná **`frontend`**
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
4. En **Environment Variables**, agregá:

   | Name | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://<tu-backend>.onrender.com/api` |

   > **Atención:** Tiene que terminar en `/api` y **NO** llevar barra `/` al final.
5. Hacé clic en **Deploy** y copiá la URL final de Vercel (ej. `https://torquelab-ops.vercel.app`).

---

## Paso 4 — Cerrar CORS en Render (¡Crítico!)

1. Volvé a **Render** → tu servicio `torquelab-ops-api` → **Environment**.
2. Editá `CORS_ORIGIN` y pegá tu URL exacta de Vercel **sin barra `/` al final**:
   ```text
   https://torquelab-ops.vercel.app
   ```
3. Guardá los cambios (**Save Changes**). Render reiniciará el backend automáticamente (~1 minuto).

---

## Paso 5 — Verificación Final y Entrega

1. Abrí una **ventana de incógnito** y entrá a tu URL de Vercel.
2. *(Recordatorio de Render Free)*: si el backend estuvo inactivo, el primer login puede demorar **30–60 segundos** mientras despierta.
3. Probá los 3 roles usando los botones de **Acceso Rápido Demo** en `/login` (contraseña `Demo1234!`):
   * **Jefe de Taller:** `admin@torquelab.com`
   * **Mecánico:** `mecanico@torquelab.com`
   * **Cliente:** `cliente@torquelab.com`
4. Pegá las dos URLs finales (Vercel y Render) arriba de todo en [README.md](./README.md), hacé commit y `git push`.
5. Subí ambos links (repo público de GitHub + URL de la app en Vercel) al campus.
