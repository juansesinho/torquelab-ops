import { withTransaction } from '../../db/pool';
import { BadRequestError, ConflictError, NotFoundError } from '../../errors/AppError';
import { PartRow, partsRepository } from './parts.repository';
import { CreatePartInput, StockMovementInput, UpdatePartInput } from './parts.schema';

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

  async registerMovement(partId: number, userId: number, input: StockMovementInput) {
    return withTransaction(async (client) => {
      const partRes = await client.query<{ id: number; name: string; stock: number }>(
        `SELECT id, name, stock FROM parts WHERE id = $1 FOR UPDATE`,
        [partId]
      );
      if (partRes.rowCount === 0) {
        throw new NotFoundError('Repuesto no encontrado');
      }

      const current = partRes.rows[0];
      let delta = input.quantity;
      if (input.type === 'in') {
        delta = Math.abs(input.quantity);
      } else if (input.type === 'out') {
        delta = -Math.abs(input.quantity);
      }

      const nextStock = current.stock + delta;
      if (nextStock < 0) {
        throw new BadRequestError(
          `Stock insuficiente para '${current.name}'. Disponible: ${current.stock}, intento de egreso: ${Math.abs(delta)}`
        );
      }

      const updatedRes = await client.query<PartRow>(
        `UPDATE parts
         SET stock = $2
         WHERE id = $1
         RETURNING id, sku, name, stock, min_stock, unit_price, (stock <= min_stock) AS low_stock, created_at`,
        [partId, nextStock]
      );

      await client.query(
        `INSERT INTO stock_movements (part_id, user_id, type, quantity, reason, provider, unit_cost)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          partId,
          userId,
          input.type,
          delta,
          input.reason,
          input.provider ?? null,
          input.unit_cost ?? null,
        ]
      );

      return updatedRes.rows[0];
    });
  },

  async listMovements(partId: number) {
    const part = await partsRepository.findById(partId);
    if (!part) {
      throw new NotFoundError('Repuesto no encontrado');
    }
    return partsRepository.listMovements(partId);
  },
};
