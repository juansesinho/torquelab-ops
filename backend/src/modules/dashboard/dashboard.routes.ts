import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { authenticate, authorize } from '../../middlewares/auth';
import { dashboardController } from './dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/summary',
  authenticate,
  authorize('admin', 'mechanic'),
  asyncHandler(dashboardController.summary)
);
