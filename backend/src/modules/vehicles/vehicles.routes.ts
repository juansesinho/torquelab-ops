import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { vehiclesController } from './vehicles.controller';
import {
  createVehicleSchema,
  updateVehicleSchema,
  vehicleIdParamSchema,
} from './vehicles.schema';

export const vehiclesRouter = Router();

vehiclesRouter.use(authenticate);

vehiclesRouter.get('/', asyncHandler(vehiclesController.list));
vehiclesRouter.post(
  '/',
  authorize('admin', 'client'),
  validate({ body: createVehicleSchema }),
  asyncHandler(vehiclesController.create)
);
vehiclesRouter.patch(
  '/:id',
  authorize('admin', 'client'),
  validate({ params: vehicleIdParamSchema, body: updateVehicleSchema }),
  asyncHandler(vehiclesController.update)
);
vehiclesRouter.get(
  '/:id/orders',
  validate({ params: vehicleIdParamSchema }),
  asyncHandler(vehiclesController.history)
);
