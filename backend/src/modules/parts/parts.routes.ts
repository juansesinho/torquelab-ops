import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { partsController } from './parts.controller';
import {
  createPartSchema,
  partIdParamSchema,
  restockPartSchema,
  updatePartSchema,
} from './parts.schema';

export const partsRouter = Router();

partsRouter.use(authenticate);

partsRouter.get('/', authorize('admin', 'mechanic'), asyncHandler(partsController.list));
partsRouter.post(
  '/',
  authorize('admin'),
  validate({ body: createPartSchema }),
  asyncHandler(partsController.create)
);
partsRouter.patch(
  '/:id',
  authorize('admin'),
  validate({ params: partIdParamSchema, body: updatePartSchema }),
  asyncHandler(partsController.update)
);
partsRouter.patch(
  '/:id/restock',
  authorize('admin'),
  validate({ params: partIdParamSchema, body: restockPartSchema }),
  asyncHandler(partsController.restock)
);
