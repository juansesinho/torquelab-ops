import { BadRequestError, ConflictError, ForbiddenError } from '../../errors/AppError';
import { AuthPayload } from '../../middlewares/auth';
import { authRepository } from '../auth/auth.repository';
import { vehiclesRepository } from './vehicles.repository';
import { CreateVehicleInput } from './vehicles.schema';

export const vehiclesService = {
  async listVehicles(user: AuthPayload) {
    if (user.role === 'client') {
      return vehiclesRepository.findAll(user.userId);
    }
    return vehiclesRepository.findAll();
  },

  async createVehicle(input: CreateVehicleInput, user: AuthPayload) {
    let targetClientId = user.userId;

    if (user.role === 'admin') {
      if (!input.client_id) {
        throw new BadRequestError('Debés indicar client_id al registrar un vehículo como administrador');
      }
      const clientUser = await authRepository.findById(input.client_id);
      if (!clientUser || clientUser.role !== 'client') {
        throw new BadRequestError('El client_id indicado no corresponde a un cliente válido');
      }
      targetClientId = clientUser.id;
    } else if (user.role === 'mechanic') {
      throw new ForbiddenError('Solo administradores o clientes pueden registrar vehículos');
    }

    const existingPlate = await vehiclesRepository.findByPlate(input.plate);
    if (existingPlate) {
      throw new ConflictError(`Ya existe un vehículo registrado con la patente ${input.plate}`);
    }

    return vehiclesRepository.create({
      client_id: targetClientId,
      plate: input.plate,
      brand: input.brand,
      model: input.model,
      year: input.year,
      mileage: input.mileage ?? null,
    });
  },
};
