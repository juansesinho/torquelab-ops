import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { authController } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';

export const authRouter = Router();

authRouter.post('/register', validate({ body: registerSchema }), asyncHandler(authController.register));
authRouter.post('/login', validate({ body: loginSchema }), asyncHandler(authController.login));
authRouter.get('/me', authenticate, asyncHandler(authController.me));
authRouter.get('/mechanics', authenticate, authorize('admin', 'mechanic'), asyncHandler(authController.listMechanics));
authRouter.get('/clients', authenticate, authorize('admin'), asyncHandler(authController.listClients));
