import { withTransaction } from '../../db/pool';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../errors/AppError';
import { AuthPayload, UserRole } from '../../middlewares/auth';
import { authRepository } from '../auth/auth.repository';
import { vehiclesRepository } from '../vehicles/vehicles.repository';
import { ordersRepository, WorkOrderRow } from './orders.repository';
import {
  AddOrderItemInput,
  CreateOrderInput,
  OrderStatus,
  UpdateOrderInput,
} from './orders.schema';

const ALLOWED_TRANSITIONS: Record<
  OrderStatus,
  Partial<Record<OrderStatus, UserRole[]>>
> = {
  received: {
    diagnosing: ['admin', 'mechanic'],
    cancelled: ['admin'],
  },
  diagnosing: {
    quoted: ['admin', 'mechanic'],
    cancelled: ['admin'],
  },
  quoted: {
    approved: ['admin', 'client'],
    cancelled: ['admin', 'client'],
  },
  approved: {
    in_progress: ['admin', 'mechanic'],
    cancelled: ['admin'],
  },
  in_progress: {
    completed: ['admin', 'mechanic'],
    cancelled: ['admin'],
  },
  completed: {},
  cancelled: {},
};

function assertOrderMutable(order: WorkOrderRow): void {
  if (order.status === 'completed' || order.status === 'cancelled') {
    throw new ConflictError(
      `La orden ${order.code} está en estado '${order.status}' y no puede modificarse`
    );
  }
}

async function assertValidMechanic(mechanicId: number): Promise<void> {
  const user = await authRepository.findById(mechanicId);
  if (!user || user.role !== 'mechanic') {
    throw new BadRequestError('El usuario asignado debe tener rol de mecánico');
  }
}

export const ordersService = {
  async listOrders(
    user: AuthPayload,
    filters: { status?: OrderStatus; plate?: string }
  ) {
    return ordersRepository.findAll({
      clientId: user.role === 'client' ? user.userId : undefined,
      status: filters.status,
      plate: filters.plate,
    });
  },

  async getOrderDetail(orderId: number, user: AuthPayload) {
    const order = await ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Orden de trabajo no encontrada');
    }
    if (user.role === 'client' && order.client_id !== user.userId) {
      throw new ForbiddenError('No tenés permisos para ver esta orden');
    }

    const items = await ordersRepository.findItemsByOrderId(orderId);
    return { ...order, items };
  },

  async createOrder(input: CreateOrderInput) {
    const vehicle = await vehiclesRepository.findById(input.vehicle_id);
    if (!vehicle) {
      throw new NotFoundError('Vehículo no encontrado');
    }

    // RN-01: Un vehículo no puede tener más de una orden abierta
    const activeOrder = await ordersRepository.findActiveByVehicleId(input.vehicle_id);
    if (activeOrder) {
      throw new ConflictError(
        `El vehículo ${vehicle.plate} ya tiene una orden abierta (${activeOrder.code})`
      );
    }

    // RN-02: Validar mecánico si se asigna al crear
    if (input.mechanic_id !== undefined && input.mechanic_id !== null) {
      await assertValidMechanic(input.mechanic_id);
    }

    const orderId = await ordersRepository.create({
      vehicle_id: input.vehicle_id,
      mechanic_id: input.mechanic_id ?? null,
      problem_description: input.problem_description,
    });

    const created = await ordersRepository.findById(orderId);
    return { ...created!, items: [] };
  },

  async updateOrder(orderId: number, input: UpdateOrderInput, user: AuthPayload) {
    const existing = await ordersRepository.findById(orderId);
    if (!existing) {
      throw new NotFoundError('Orden de trabajo no encontrada');
    }

    // RN-08: Inmutabilidad de órdenes cerradas
    assertOrderMutable(existing);

    if (input.mechanic_id !== undefined) {
      if (user.role !== 'admin') {
        throw new ForbiddenError('Solo el administrador puede asignar o reasignar mecánicos');
      }
      if (input.mechanic_id !== null) {
        await assertValidMechanic(input.mechanic_id);
      }
    }

    await withTransaction(async (client) => {
      const nextMechanic =
        input.mechanic_id !== undefined ? input.mechanic_id : existing.mechanic_id;
      const nextDiagnosis =
        input.diagnosis !== undefined ? input.diagnosis : existing.diagnosis;
      const nextLaborCost =
        input.labor_cost !== undefined ? input.labor_cost : Number(existing.labor_cost);

      await client.query(
        `UPDATE work_orders
         SET mechanic_id = $1,
             diagnosis = $2,
             labor_cost = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [nextMechanic, nextDiagnosis, nextLaborCost, orderId]
      );

      await ordersRepository.recalculateTotal(orderId, client);
    });

    return this.getOrderDetail(orderId, user);
  },

  async updateStatus(orderId: number, nextStatus: OrderStatus, user: AuthPayload) {
    await withTransaction(async (client) => {
      const lockRes = await client.query<{ id: number }>(
        `SELECT id FROM work_orders WHERE id = $1 FOR UPDATE`,
        [orderId]
      );
      if (lockRes.rowCount === 0) {
        throw new NotFoundError('Orden de trabajo no encontrada');
      }

      const order = await ordersRepository.findById(orderId, client);
      if (!order) {
        throw new NotFoundError('Orden de trabajo no encontrada');
      }

      if (user.role === 'client' && order.client_id !== user.userId) {
        throw new ForbiddenError('No tenés permisos sobre esta orden');
      }

      // RN-03: Máquina de estados estricta + permisos por rol
      const allowedRoles = ALLOWED_TRANSITIONS[order.status]?.[nextStatus];
      if (!allowedRoles) {
        throw new ConflictError(
          `Transición de estado inválida: '${order.status}' → '${nextStatus}'`
        );
      }
      if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenError(
          `El rol '${user.role}' no puede pasar la orden de '${order.status}' a '${nextStatus}'`
        );
      }

      // RN-04: Para presupuestar debe haber diagnóstico
      if (nextStatus === 'quoted' && (!order.diagnosis || order.diagnosis.trim().length === 0)) {
        throw new BadRequestError(
          'Debés cargar el diagnóstico técnico antes de pasar la orden a presupuestada'
        );
      }

      // RN-05: Para finalizar debe tener diagnóstico y costo total > 0
      if (nextStatus === 'completed') {
        if (!order.diagnosis || order.diagnosis.trim().length === 0) {
          throw new BadRequestError('No se puede finalizar una orden sin diagnóstico');
        }
        if (Number(order.total_cost) <= 0) {
          throw new BadRequestError(
            'No se puede finalizar una orden sin mano de obra o repuestos cargados (total > 0)'
          );
        }
      }

      // RN-07: Al cancelar, devolver todo el stock reservado en la orden
      if (nextStatus === 'cancelled') {
        const items = await ordersRepository.findItemsByOrderId(orderId, client);
        for (const item of items) {
          await client.query(`UPDATE parts SET stock = stock + $1 WHERE id = $2`, [
            item.quantity,
            item.part_id,
          ]);
        }
      }

      await client.query(
        `UPDATE work_orders SET status = $1, updated_at = NOW() WHERE id = $2`,
        [nextStatus, orderId]
      );
    });

    return this.getOrderDetail(orderId, user);
  },

  async addItem(orderId: number, input: AddOrderItemInput, user: AuthPayload) {
    await withTransaction(async (client) => {
      const orderLock = await client.query<{ status: OrderStatus; code: string }>(
        `SELECT status, code FROM work_orders WHERE id = $1 FOR UPDATE`,
        [orderId]
      );
      if (orderLock.rowCount === 0) {
        throw new NotFoundError('Orden de trabajo no encontrada');
      }
      const orderStatus = orderLock.rows[0].status;
      if (orderStatus === 'completed' || orderStatus === 'cancelled') {
        throw new ConflictError(
          `La orden ${orderLock.rows[0].code} está cerrada y no admite cambios`
        );
      }

      // RN-06: Bloqueo pesimista sobre el repuesto para evitar sobreventa
      const partRes = await client.query<{
        id: number;
        name: string;
        stock: number;
        unit_price: string;
      }>(
        `SELECT id, name, stock, unit_price
         FROM parts
         WHERE id = $1
         FOR UPDATE`,
        [input.part_id]
      );

      if (partRes.rowCount === 0) {
        throw new NotFoundError('Repuesto no encontrado');
      }

      const part = partRes.rows[0];
      if (part.stock < input.quantity) {
        throw new ConflictError(
          `Stock insuficiente para '${part.name}'. Disponible: ${part.stock}, solicitado: ${input.quantity}`
        );
      }

      await client.query(`UPDATE parts SET stock = stock - $1 WHERE id = $2`, [
        input.quantity,
        input.part_id,
      ]);

      const existingItem = await client.query<{ id: number }>(
        `SELECT id FROM work_order_items WHERE work_order_id = $1 AND part_id = $2`,
        [orderId, input.part_id]
      );

      if (existingItem.rowCount && existingItem.rowCount > 0) {
        await client.query(
          `UPDATE work_order_items
           SET quantity = quantity + $1
           WHERE id = $2`,
          [input.quantity, existingItem.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO work_order_items (work_order_id, part_id, quantity, unit_price_snapshot)
           VALUES ($1, $2, $3, $4)`,
          [orderId, input.part_id, input.quantity, part.unit_price]
        );
      }

      await ordersRepository.recalculateTotal(orderId, client);
    });

    return this.getOrderDetail(orderId, user);
  },

  async removeItem(orderId: number, itemId: number, user: AuthPayload) {
    await withTransaction(async (client) => {
      const orderLock = await client.query<{ status: OrderStatus; code: string }>(
        `SELECT status, code FROM work_orders WHERE id = $1 FOR UPDATE`,
        [orderId]
      );
      if (orderLock.rowCount === 0) {
        throw new NotFoundError('Orden de trabajo no encontrada');
      }
      const orderStatus = orderLock.rows[0].status;
      if (orderStatus === 'completed' || orderStatus === 'cancelled') {
        throw new ConflictError(
          `La orden ${orderLock.rows[0].code} está cerrada y no admite cambios`
        );
      }

      const itemRes = await client.query<{ part_id: number; quantity: number }>(
        `DELETE FROM work_order_items
         WHERE id = $1 AND work_order_id = $2
         RETURNING part_id, quantity`,
        [itemId, orderId]
      );

      if (itemRes.rowCount === 0) {
        throw new NotFoundError('Ítem no encontrado en la orden');
      }

      // RN-07: Devolver stock al inventario
      await client.query(`UPDATE parts SET stock = stock + $1 WHERE id = $2`, [
        itemRes.rows[0].quantity,
        itemRes.rows[0].part_id,
      ]);

      await ordersRepository.recalculateTotal(orderId, client);
    });

    return this.getOrderDetail(orderId, user);
  },
};
