import { Request, Response } from 'express';
import { vehiclesService } from './vehicles.service';

export const vehiclesController = {
  async list(req: Request, res: Response) {
    const vehicles = await vehiclesService.listVehicles(req.user!);
    res.status(200).json({ vehicles });
  },

  async create(req: Request, res: Response) {
    const vehicle = await vehiclesService.createVehicle(req.body, req.user!);
    res.status(201).json({ vehicle });
  },
};
