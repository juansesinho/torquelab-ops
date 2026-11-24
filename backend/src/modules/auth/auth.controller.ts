import { Request, Response } from 'express';
import { authService } from './auth.service';

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  },

  async me(req: Request, res: Response) {
    const user = await authService.getProfile(req.user!.userId);
    res.status(200).json({ user });
  },

  async listMechanics(_req: Request, res: Response) {
    const mechanics = await authService.listMechanics();
    res.status(200).json({ mechanics });
  },

  async listClients(_req: Request, res: Response) {
    const clients = await authService.listClients();
    res.status(200).json({ clients });
  },
};
