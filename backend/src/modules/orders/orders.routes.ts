import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { ordersController } from './orders.controller';
import {
  addOrderItemSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  orderItemParamSchema,
  requoteOrderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
} from './orders.schema';

export const ordersRouter = Router();

ordersRouter.use(authenticate);

ordersRouter.get(
  '/',
  validate({ query: listOrdersQuerySchema }),
  asyncHandler(ordersController.list)
);
ordersRouter.get(
  '/:id',
  validate({ params: orderIdParamSchema }),
  asyncHandler(ordersController.getById)
);
ordersRouter.post(
  '/',
  authorize('admin'),
  validate({ body: createOrderSchema }),
  asyncHandler(ordersController.create)
);
ordersRouter.patch(
  '/:id',
  authorize('admin', 'mechanic'),
  validate({ params: orderIdParamSchema, body: updateOrderSchema }),
  asyncHandler(ordersController.update)
);
ordersRouter.post(
  '/:id/claim',
  authorize('mechanic'),
  validate({ params: orderIdParamSchema }),
  asyncHandler(ordersController.claim)
);
ordersRouter.patch(
  '/:id/status',
  validate({ params: orderIdParamSchema, body: updateOrderStatusSchema }),
  asyncHandler(ordersController.updateStatus)
);
ordersRouter.post(
  '/:id/requote',
  authorize('admin', 'mechanic'),
  validate({ params: orderIdParamSchema, body: requoteOrderSchema }),
  asyncHandler(ordersController.requote)
);
ordersRouter.post(
  '/:id/items',
  authorize('admin', 'mechanic'),
  validate({ params: orderIdParamSchema, body: addOrderItemSchema }),
  asyncHandler(ordersController.addItem)
);
ordersRouter.delete(
  '/:id/items/:itemId',
  authorize('admin', 'mechanic'),
  validate({ params: orderItemParamSchema }),
  asyncHandler(ordersController.removeItem)
);
