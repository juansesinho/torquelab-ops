import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { ordersRouter } from './modules/orders/orders.routes';
import { partsRouter } from './modules/parts/parts.routes';
import { vehiclesRouter } from './modules/vehicles/vehicles.routes';

export function createApp() {
  const app = express();

  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origen no permitido por CORS: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'torquelab-ops-backend',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/vehicles', vehiclesRouter);
  app.use('/api/parts', partsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/dashboard', dashboardRouter);

  app.use((_req, res) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Endpoint no encontrado',
    });
  });

  app.use(errorHandler);

  return app;
}
