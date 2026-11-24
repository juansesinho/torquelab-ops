import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

interface PgError extends Error {
  code?: string;
  constraint?: string;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Datos de entrada inválidos',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  const pgErr = err as PgError;
  if (pgErr.code === '23505') {
    res.status(409).json({
      error: 'DUPLICATE_RESOURCE',
      message: 'Ya existe un registro con ese identificador o restricción única.',
    });
    return;
  }

  if (pgErr.code === '23503') {
    res.status(409).json({
      error: 'REFERENCE_CONFLICT',
      message: 'No se puede completar la operación por referencias activas en el sistema.',
    });
    return;
  }

  if (pgErr.code === '23514') {
    res.status(400).json({
      error: 'CONSTRAINT_VIOLATION',
      message: 'Los valores ingresados incumplen las restricciones de integridad.',
    });
    return;
  }

  console.error('❌ Error no controlado:', err);
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Ocurrió un error interno en el servidor.',
  });
}
