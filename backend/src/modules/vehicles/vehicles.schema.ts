import { z } from 'zod';

export function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/\s+/g, '');
}

export const createVehicleSchema = z.object({
  client_id: z.coerce.number().int().positive().optional(),
  plate: z
    .string()
    .transform(normalizePlate)
    .refine((val) => val.length >= 5 && val.length <= 15, {
      message: 'La patente debe tener entre 5 y 15 caracteres',
    }),
  brand: z.string().trim().min(2, 'Marca requerida').max(60),
  model: z.string().trim().min(1, 'Modelo requerido').max(60),
  year: z.coerce.number().int().min(1950).max(2100),
  mileage: z.coerce.number().int().min(0).max(2000000).optional().nullable(),
});

export const vehicleIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateVehicleSchema = z.object({
  plate: z
    .string()
    .transform(normalizePlate)
    .refine((val) => val.length >= 5 && val.length <= 15, {
      message: 'La patente debe tener entre 5 y 15 caracteres',
    })
    .optional(),
  brand: z.string().trim().min(2).max(60).optional(),
  model: z.string().trim().min(1).max(60).optional(),
  year: z.coerce.number().int().min(1950).max(2100).optional(),
  mileage: z.coerce.number().int().min(0).max(2000000).optional().nullable(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
