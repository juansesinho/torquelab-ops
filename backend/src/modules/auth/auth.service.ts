import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../errors/AppError';
import { authRepository, PublicUser } from './auth.repository';
import { LoginInput, RegisterInput } from './auth.schema';

function signToken(user: PublicUser): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    options
  );
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('Ya existe una cuenta registrada con ese email');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await authRepository.createClient(input.name, input.email, passwordHash);
    const token = signToken(user);
    return { user, token };
  },

  async login(input: LoginInput) {
    const user = await authRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(input.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const publicUser: PublicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    };
    const token = signToken(publicUser);
    return { user: publicUser, token };
  },

  async getProfile(userId: number) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }
    return user;
  },

  async listMechanics() {
    return authRepository.listByRole('mechanic');
  },

  async createMechanic(input: RegisterInput) {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('Ya existe una cuenta registrada con ese email');
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    return authRepository.createUser(input.name, input.email, passwordHash, 'mechanic');
  },

  async listClients() {
    return authRepository.listByRole('client');
  },
};
