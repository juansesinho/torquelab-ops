import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { authenticate } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { notificationsController } from './notifications.controller';

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get('/', asyncHandler(notificationsController.list));
notificationsRouter.patch('/read-all', asyncHandler(notificationsController.markAllRead));
notificationsRouter.patch(
  '/:id/read',
  validate({ params: idParamSchema }),
  asyncHandler(notificationsController.markRead)
);
