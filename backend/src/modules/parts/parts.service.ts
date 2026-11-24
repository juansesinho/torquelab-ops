import { ConflictError, NotFoundError } from '../../errors/AppError';
import { partsRepository } from './parts.repository';
import { CreatePartInput } from './parts.schema';

export const partsService = {
  async listParts() {
    return partsRepository.findAll();
  },

  async createPart(input: CreatePartInput) {
    const existing = await partsRepository.findBySku(input.sku);
    if (existing) {
      throw new ConflictError(`Ya existe un repuesto con el SKU ${input.sku}`);
    }
    return partsRepository.create(input);
  },

  async restockPart(id: number, quantity: number) {
    const updated = await partsRepository.addStock(id, quantity);
    if (!updated) {
      throw new NotFoundError('Repuesto no encontrado');
    }
    return updated;
  },
};
