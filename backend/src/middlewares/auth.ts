import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';

export type UserRole = 'admin' | 'mechanic' | 'client';

export interface AuthPayload {
  userId: number;
  email: string;
  role: UserRole;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token de autenticación requerido');
  }

  const token = authHeader.slice(7).trim();
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    throw new UnauthorizedError('Token inválido o expirado');
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Usuario no autenticado');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError('No tenés permisos suficientes para esta operación');
    }
    next();
  };
}
