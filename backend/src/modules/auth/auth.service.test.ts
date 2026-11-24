import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockFindByEmail,
  mockFindById,
  mockCreateClient,
  mockListByRole,
  mockHash,
  mockCompare,
  mockSign,
} = vi.hoisted(() => ({
  mockFindByEmail: vi.fn(),
  mockFindById: vi.fn(),
  mockCreateClient: vi.fn(),
  mockListByRole: vi.fn(),
  mockHash: vi.fn(),
  mockCompare: vi.fn(),
  mockSign: vi.fn(),
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
  pool: { query: vi.fn() },
}));

vi.mock('./auth.repository', () => ({
  authRepository: {
    findByEmail: mockFindByEmail,
    findById: mockFindById,
    createClient: mockCreateClient,
    listByRole: mockListByRole,
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: mockHash,
    compare: mockCompare,
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: mockSign,
  },
}));

import { ConflictError, UnauthorizedError } from '../../errors/AppError';
import { authService } from './auth.service';

describe('authService — HU-01 Autenticación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registra un cliente nuevo con rol client y devuelve usuario y token JWT', async () => {
    const createdUser = {
      id: 10,
      name: 'Juan Pérez',
      email: 'juan@torquelab.com',
      role: 'client' as const,
      created_at: new Date('2026-01-01T00:00:00Z'),
    };

    mockFindByEmail.mockResolvedValue(null);
    mockHash.mockResolvedValue('hashed_password_123');
    mockCreateClient.mockResolvedValue(createdUser);
    mockSign.mockReturnValue('mock.jwt.token');

    const result = await authService.register({
      name: 'Juan Pérez',
      email: 'juan@torquelab.com',
      password: 'secret123',
    });

    expect(mockFindByEmail).toHaveBeenCalledWith('juan@torquelab.com');
    expect(mockHash).toHaveBeenCalledWith('secret123', 10);
    expect(mockCreateClient).toHaveBeenCalledWith(
      'Juan Pérez',
      'juan@torquelab.com',
      'hashed_password_123'
    );
    expect(mockSign).toHaveBeenCalledWith(
      { userId: 10, email: 'juan@torquelab.com', role: 'client' },
      'test_secret_1234567890',
      { expiresIn: '1d' }
    );
    expect(result).toEqual({
      user: createdUser,
      token: 'mock.jwt.token',
    });
  });

  it('rechaza el registro con email duplicado lanzando ConflictError (409)', async () => {
    mockFindByEmail.mockResolvedValue({
      id: 1,
      name: 'Existente',
      email: 'dup@torquelab.com',
      password_hash: 'hash',
      role: 'client',
      created_at: new Date(),
    });

    const promise = authService.register({
      name: 'Nuevo Usuario',
      email: 'dup@torquelab.com',
      password: 'secret123',
    });

    await expect(promise).rejects.toBeInstanceOf(ConflictError);
    await expect(promise).rejects.toThrow(/Ya existe una cuenta registrada/);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('inicia sesión con credenciales válidas y devuelve usuario sin password_hash y JWT', async () => {
    const dbUser = {
      id: 2,
      name: 'Carlos Mecánico',
      email: 'carlos@torquelab.com',
      password_hash: 'stored_hash',
      role: 'mechanic' as const,
      created_at: new Date('2026-01-01T00:00:00Z'),
    };

    mockFindByEmail.mockResolvedValue(dbUser);
    mockCompare.mockResolvedValue(true);
    mockSign.mockReturnValue('valid.jwt.token');

    const result = await authService.login({
      email: 'carlos@torquelab.com',
      password: 'password123',
    });

    expect(mockCompare).toHaveBeenCalledWith('password123', 'stored_hash');
    expect(mockSign).toHaveBeenCalledWith(
      { userId: 2, email: 'carlos@torquelab.com', role: 'mechanic' },
      'test_secret_1234567890',
      { expiresIn: '1d' }
    );
    expect(result).toEqual({
      user: {
        id: 2,
        name: 'Carlos Mecánico',
        email: 'carlos@torquelab.com',
        role: 'mechanic',
        created_at: dbUser.created_at,
      },
      token: 'valid.jwt.token',
    });
    expect('password_hash' in result.user).toBe(false);
  });

  it('rechaza login si el email no existe lanzando UnauthorizedError (401)', async () => {
    mockFindByEmail.mockResolvedValue(null);

    const promise = authService.login({
      email: 'noexiste@torquelab.com',
      password: 'password123',
    });

    await expect(promise).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(promise).rejects.toThrow(/Credenciales inválidas/);
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it('rechaza login si la contraseña no coincide lanzando UnauthorizedError (401)', async () => {
    mockFindByEmail.mockResolvedValue({
      id: 3,
      name: 'Admin',
      email: 'admin@torquelab.com',
      password_hash: 'stored_hash',
      role: 'admin',
      created_at: new Date(),
    });
    mockCompare.mockResolvedValue(false);

    const promise = authService.login({
      email: 'admin@torquelab.com',
      password: 'wrong_password',
    });

    await expect(promise).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(promise).rejects.toThrow(/Credenciales inválidas/);
    expect(mockSign).not.toHaveBeenCalled();
  });
});
