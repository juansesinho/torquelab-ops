import { z } from 'zod';

export const createPartSchema = z.object({
  sku: z.string().trim().toUpperCase().min(2, 'SKU requerido').max(40),
  name: z.string().trim().min(2, 'Nombre requerido').max(120),
  stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo'),
  min_stock: z.coerce.number().int().min(0).default(5),
  unit_price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
});

export const restockPartSchema = z.object({
  quantity: z.coerce.number().int().positive('La cantidad a reponer debe ser mayor a 0'),
});

export const updatePartSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  min_stock: z.coerce.number().int().min(0).optional(),
  unit_price: z.coerce.number().min(0).optional(),
});

export const partIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const stockMovementSchema = z.object({
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.coerce.number().int().refine((v) => v !== 0, {
    message: 'La cantidad no puede ser 0',
  }),
  reason: z.string().trim().min(3, 'Indicá el motivo del movimiento').max(500),
  provider: z.string().trim().max(120).optional().nullable(),
  unit_cost: z.coerce.number().min(0).optional().nullable(),
});

export type CreatePartInput = z.infer<typeof createPartSchema>;
export type UpdatePartInput = z.infer<typeof updatePartSchema>;
export type RestockPartInput = z.infer<typeof restockPartSchema>;
export type StockMovementInput = z.infer<typeof stockMovementSchema>;
