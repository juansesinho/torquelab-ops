import { Request, Response } from 'express';
import { notificationsService } from './notifications.service';

export const notificationsController = {
  async list(req: Request, res: Response) {
    const result = await notificationsService.listForUser(req.user!.userId);
    res.status(200).json(result);
  },

  async markRead(req: Request, res: Response) {
    const result = await notificationsService.markAsRead(
      Number(req.params.id),
      req.user!.userId
    );
    res.status(200).json(result);
  },

  async markAllRead(req: Request, res: Response) {
    const result = await notificationsService.markAllAsRead(req.user!.userId);
    res.status(200).json(result);
  },
};
