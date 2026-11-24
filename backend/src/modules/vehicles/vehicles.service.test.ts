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

vi.mock('../auth/auth.repository', () => ({
  authRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('./vehicles.repository', () => ({
  vehiclesRepository: {
    findAll: vi.fn(),
    findByPlate: vi.fn(),
    create: vi.fn(),
  },
}));

import { authRepository } from '../auth/auth.repository';
import { vehiclesRepository } from './vehicles.repository';
import { createVehicleSchema } from './vehicles.schema';
import { vehiclesService } from './vehicles.service';

const clientUser = { userId: 4, email: 'cliente@torquelab.com', role: 'client' as const };
const adminUser = { userId: 1, email: 'admin@torquelab.com', role: 'admin' as const };
const mechanicUser = { userId: 2, email: 'mec@torquelab.com', role: 'mechanic' as const };

describe('vehiclesService — Reglas de Negocio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CB-05: normaliza la patente eliminando espacios y pasando a mayúsculas', () => {
    const parsed = createVehicleSchema.parse({
      plate: ' ab 123 cd ',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2022,
    });
    expect(parsed.plate).toBe('AB123CD');
  });

  it('CA-03: rechaza patente duplicada con 409', async () => {
    vi.mocked(vehiclesRepository.findByPlate).mockResolvedValue({ id: 1 });

    await expect(
      vehiclesService.createVehicle(
        { plate: 'AF492KL', brand: 'Toyota', model: 'Corolla', year: 2022 },
        clientUser
      )
    ).rejects.toThrow(/Ya existe un vehículo/);
  });

  it('RBAC: impide que un mecánico registre vehículos', async () => {
    await expect(
      vehiclesService.createVehicle(
        { plate: 'AF492KL', brand: 'Toyota', model: 'Corolla', year: 2022 },
        mechanicUser
      )
    ).rejects.toThrow(/Solo administradores o clientes/);
  });

  it('Admin debe indicar un client_id válido con rol client', async () => {
    vi.mocked(authRepository.findById).mockResolvedValue({
      id: 2,
      role: 'mechanic',
    } as never);

    await expect(
      vehiclesService.createVehicle(
        { client_id: 2, plate: 'AG100AA', brand: 'Ford', model: 'Focus', year: 2020 },
        adminUser
      )
    ).rejects.toThrow(/cliente válido/);
  });
});
