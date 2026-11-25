import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError';
import { AuthPayload } from '../../middlewares/auth';
import { authRepository } from '../auth/auth.repository';
import { vehiclesRepository } from './vehicles.repository';
import { CreateVehicleInput, UpdateVehicleInput } from './vehicles.schema';

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

  async updateVehicle(id: number, input: UpdateVehicleInput, user: AuthPayload) {
    const existing = await vehiclesRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Vehículo no encontrado');
    }
    if (user.role === 'client' && existing.client_id !== user.userId) {
      throw new ForbiddenError('Solo podés editar tus propios vehículos');
    }
    if (user.role === 'mechanic') {
      throw new ForbiddenError('Solo administradores o clientes pueden editar vehículos');
    }

    if (input.plate && input.plate !== existing.plate) {
      const dup = await vehiclesRepository.findByPlate(input.plate);
      if (dup) {
        throw new ConflictError(`Ya existe un vehículo registrado con la patente ${input.plate}`);
      }
    }

    const updated = await vehiclesRepository.update(id, input);
    if (!updated) {
      throw new NotFoundError('Vehículo no encontrado');
    }
    return updated;
  },

  async getVehicleHistory(id: number, user: AuthPayload) {
    const vehicle = await vehiclesRepository.findById(id);
    if (!vehicle) {
      throw new NotFoundError('Vehículo no encontrado');
    }
    if (user.role === 'client' && vehicle.client_id !== user.userId) {
      throw new ForbiddenError('No tenés permisos para ver el historial de este vehículo');
    }
    const orders = await vehiclesRepository.findOrdersByVehicleId(id);
    return { vehicle, orders };
  },
};
