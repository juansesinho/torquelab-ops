import { z } from 'zod';

export const ORDER_STATUSES = [
  'received',
  'diagnosing',
  'quoted',
  'approved',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const orderItemParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive(),
});

export const listOrdersQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  plate: z.string().trim().optional(),
  scope: z.enum(['mine', 'unassigned', 'all']).optional(),
});

export const createOrderSchema = z.object({
  vehicle_id: z.coerce.number().int().positive(),
  mechanic_id: z.coerce.number().int().positive().nullable().optional(),
  problem_description: z
    .string()
    .trim()
    .min(5, 'Describí el problema del vehículo (mínimo 5 caracteres)')
    .max(1000),
});

export const updateOrderSchema = z.object({
  mechanic_id: z.coerce.number().int().positive().nullable().optional(),
  diagnosis: z.string().trim().max(2000).nullable().optional(),
  labor_cost: z.coerce.number().min(0, 'La mano de obra no puede ser negativa').optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const addOrderItemSchema = z.object({
  part_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type AddOrderItemInput = z.infer<typeof addOrderItemSchema>;
