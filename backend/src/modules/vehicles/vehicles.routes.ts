import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { vehiclesController } from './vehicles.controller';
import { createVehicleSchema } from './vehicles.schema';

export const vehiclesRouter = Router();

vehiclesRouter.use(authenticate);

vehiclesRouter.get('/', asyncHandler(vehiclesController.list));
vehiclesRouter.post(
  '/',
  authorize('admin', 'client'),
  validate({ body: createVehicleSchema }),
  asyncHandler(vehiclesController.create)
);
