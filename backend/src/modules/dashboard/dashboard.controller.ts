import { Request, Response } from 'express';
import { dashboardService } from './dashboard.service';

export const dashboardController = {
  async summary(_req: Request, res: Response) {
    const summary = await dashboardService.getSummary();
    res.status(200).json(summary);
  },
};
