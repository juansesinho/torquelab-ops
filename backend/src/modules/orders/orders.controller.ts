import { Request, Response } from 'express';
import { OrderStatus } from './orders.schema';
import { ordersService } from './orders.service';

export const ordersController = {
  async list(req: Request, res: Response) {
    const orders = await ordersService.listOrders(req.user!, {
      status: req.query.status as OrderStatus | undefined,
      plate: req.query.plate as string | undefined,
    });
    res.status(200).json({ orders });
  },

  async getById(req: Request, res: Response) {
    const order = await ordersService.getOrderDetail(Number(req.params.id), req.user!);
    res.status(200).json({ order });
  },

  async create(req: Request, res: Response) {
    const order = await ordersService.createOrder(req.body);
    res.status(201).json({ order });
  },

  async update(req: Request, res: Response) {
    const order = await ordersService.updateOrder(Number(req.params.id), req.body, req.user!);
    res.status(200).json({ order });
  },

  async updateStatus(req: Request, res: Response) {
    const order = await ordersService.updateStatus(
      Number(req.params.id),
      req.body.status,
      req.user!
    );
    res.status(200).json({ order });
  },

  async addItem(req: Request, res: Response) {
    const order = await ordersService.addItem(Number(req.params.id), req.body, req.user!);
    res.status(200).json({ order });
  },

  async removeItem(req: Request, res: Response) {
    const order = await ordersService.removeItem(
      Number(req.params.id),
      Number(req.params.itemId),
      req.user!
    );
    res.status(200).json({ order });
  },
};
