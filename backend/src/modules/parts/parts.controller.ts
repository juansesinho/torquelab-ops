import { Request, Response } from 'express';
import { partsService } from './parts.service';

export const partsController = {
  async list(_req: Request, res: Response) {
    const parts = await partsService.listParts();
    res.status(200).json({ parts });
  },

  async create(req: Request, res: Response) {
    const part = await partsService.createPart(req.body);
    res.status(201).json({ part });
  },

  async restock(req: Request, res: Response) {
    const id = Number(req.params.id);
    const part = await partsService.restockPart(id, req.body.quantity);
    res.status(200).json({ part });
  },
};
