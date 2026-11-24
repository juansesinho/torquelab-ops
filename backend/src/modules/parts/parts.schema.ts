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

export const partIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreatePartInput = z.infer<typeof createPartSchema>;
export type RestockPartInput = z.infer<typeof restockPartSchema>;
