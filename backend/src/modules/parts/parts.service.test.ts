import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env', () => ({
  env: {
    PORT: 4000,
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://mock:mock@localhost:5432/mock',
    JWT_SECRET: 'test_secret_1234567890',
    JWT_EXPIRES_IN: '1d',
    CORS_ORIGIN: 'http://localhost:5173',
  },
}));

vi.mock('../../db/pool', () => ({
  pool: { query: vi.fn() },
}));

vi.mock('./parts.repository', () => ({
  partsRepository: {
    findAll: vi.fn(),
    findBySku: vi.fn(),
    create: vi.fn(),
    addStock: vi.fn(),
  },
}));

import { partsRepository } from './parts.repository';
import { partsService } from './parts.service';

describe('partsService — Inventario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rechaza crear repuesto con SKU duplicado', async () => {
    vi.mocked(partsRepository.findBySku).mockResolvedValue({ id: 1 });

    await expect(
      partsService.createPart({
        sku: 'FLT-ACE-01',
        name: 'Filtro',
        stock: 10,
        min_stock: 5,
        unit_price: 15000,
      })
    ).rejects.toThrow(/SKU/);
  });

  it('lanza NotFoundError al reponer un repuesto inexistente', async () => {
    vi.mocked(partsRepository.addStock).mockResolvedValue(null);

    await expect(partsService.restockPart(999, 5)).rejects.toThrow(/no encontrado/);
  });

  it('repone stock correctamente cuando el repuesto existe', async () => {
    vi.mocked(partsRepository.addStock).mockResolvedValue({
      id: 1,
      sku: 'ACE-5W30-4L',
      stock: 13,
      low_stock: false,
    } as never);

    const updated = await partsService.restockPart(1, 10);
    expect(updated.stock).toBe(13);
  });
});
