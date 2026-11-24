import { ConflictError, NotFoundError } from '../../errors/AppError';
import { partsRepository } from './parts.repository';
import { CreatePartInput, UpdatePartInput } from './parts.schema';

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

  async updatePart(id: number, input: UpdatePartInput) {
    const updated = await partsRepository.update(id, input);
    if (!updated) {
      throw new NotFoundError('Repuesto no encontrado');
    }
    return updated;
  },

  async restockPart(id: number, quantity: number) {
    const updated = await partsRepository.addStock(id, quantity);
    if (!updated) {
      throw new NotFoundError('Repuesto no encontrado');
    }
    return updated;
  },
};
