import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockConnect: vi.fn(),
}));

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
  pool: { query: mockQuery, connect: mockConnect },
  withTransaction: async (fn: (client: { query: typeof mockQuery }) => Promise<unknown>) =>
    fn({ query: mockQuery }),
}));

vi.mock('../vehicles/vehicles.repository', () => ({
  vehiclesRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../auth/auth.repository', () => ({
  authRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('./orders.repository', () => ({
  ordersRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findItemsByOrderId: vi.fn(),
    findActiveByVehicleId: vi.fn(),
    create: vi.fn(),
    recalculateTotal: vi.fn(),
  },
}));

import { authRepository } from '../auth/auth.repository';
import { vehiclesRepository } from '../vehicles/vehicles.repository';
import { ordersRepository } from './orders.repository';
import { ordersService } from './orders.service';

const adminUser = { userId: 1, email: 'admin@torquelab.com', role: 'admin' as const };
const clientUser = { userId: 4, email: 'cliente@torquelab.com', role: 'client' as const };

describe('ordersService — Reglas de Negocio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('RN-01: rechaza crear orden si el vehículo ya tiene una orden abierta (409)', async () => {
    vi.mocked(vehiclesRepository.findById).mockResolvedValue({
      id: 10,
      plate: 'AF492KL',
    } as never);
    vi.mocked(ordersRepository.findActiveByVehicleId).mockResolvedValue({
      id: 99,
      code: 'OT-2026-0099',
    });

    await expect(
      ordersService.createOrder({
        vehicle_id: 10,
        problem_description: 'Falla en frenos',
      })
    ).rejects.toThrow(/ya tiene una orden abierta/);
  });

  it('RN-02: rechaza asignar un usuario que no tiene rol mechanic', async () => {
    vi.mocked(vehiclesRepository.findById).mockResolvedValue({
      id: 10,
      plate: 'AF492KL',
    } as never);
    vi.mocked(ordersRepository.findActiveByVehicleId).mockResolvedValue(null);
    vi.mocked(authRepository.findById).mockResolvedValue({
      id: 4,
      role: 'client',
    } as never);

    await expect(
      ordersService.createOrder({
        vehicle_id: 10,
        mechanic_id: 4,
        problem_description: 'Falla en frenos',
      })
    ).rejects.toThrow(/rol de mecánico/);
  });

  it('RN-03: rechaza transición inválida received -> completed', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });
    vi.mocked(ordersRepository.findById).mockResolvedValue({
      id: 1,
      code: 'OT-2026-0001',
      client_id: 4,
      status: 'received',
      diagnosis: 'Algo',
      total_cost: '1000',
    } as never);

    await expect(
      ordersService.updateStatus(1, 'completed', adminUser)
    ).rejects.toThrow(/Transición de estado inválida/);
  });

  it('RN-04: rechaza pasar a quoted sin diagnóstico cargado', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });
    vi.mocked(ordersRepository.findById).mockResolvedValue({
      id: 1,
      code: 'OT-2026-0001',
      client_id: 4,
      status: 'diagnosing',
      diagnosis: '   ',
      total_cost: '0',
    } as never);

    await expect(
      ordersService.updateStatus(1, 'quoted', adminUser)
    ).rejects.toThrow(/diagnóstico técnico/);
  });

  it('RN-05: rechaza finalizar (completed) si total_cost <= 0', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });
    vi.mocked(ordersRepository.findById).mockResolvedValue({
      id: 1,
      code: 'OT-2026-0001',
      client_id: 4,
      status: 'in_progress',
      diagnosis: 'Revisión completa',
      total_cost: '0',
    } as never);

    await expect(
      ordersService.updateStatus(1, 'completed', adminUser)
    ).rejects.toThrow(/total > 0/);
  });

  it('CB-03: impide que un cliente apruebe una orden que no le pertenece (403)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });
    vi.mocked(ordersRepository.findById).mockResolvedValue({
      id: 1,
      code: 'OT-2026-0001',
      client_id: 999,
      status: 'quoted',
      diagnosis: 'Falla',
      total_cost: '5000',
    } as never);

    await expect(
      ordersService.updateStatus(1, 'approved', clientUser)
    ).rejects.toThrow(/permisos/);
  });

  it('RN-06: rechaza agregar repuesto si el stock es insuficiente', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: 'diagnosing', code: 'OT-1' }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 2, name: 'Aceite 5W-30', stock: 1, unit_price: '58000' }],
      });

    await expect(
      ordersService.addItem(1, { part_id: 2, quantity: 3 }, adminUser)
    ).rejects.toThrow(/Stock insuficiente/);
  });

  it('RN-08: impide editar una orden en estado completed', async () => {
    vi.mocked(ordersRepository.findById).mockResolvedValue({
      id: 1,
      code: 'OT-2026-0001',
      status: 'completed',
    } as never);

    await expect(
      ordersService.updateOrder(1, { labor_cost: 5000 }, adminUser)
    ).rejects.toThrow(/no puede modificarse/);
  });
});
