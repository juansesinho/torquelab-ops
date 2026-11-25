import { PoolClient } from 'pg';
import { pool } from '../../db/pool';
import { OrderStatus } from './orders.schema';

export interface WorkOrderRow {
  id: number;
  code: string;
  vehicle_id: number;
  plate: string;
  brand: string;
  model: string;
  year: number;
  client_id: number;
  client_name: string;
  mechanic_id: number | null;
  mechanic_name: string | null;
  status: OrderStatus;
  problem_description: string;
  diagnosis: string | null;
  labor_cost: string;
  total_cost: string;
  quote_version: number;
  requote_reason: string | null;
  estimated_delivery: string | null;
  inspection_checklist: Record<string, 'ok' | 'attention' | 'critical' | 'pending'>;
  paid_amount: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrderPaymentRow {
  id: number;
  work_order_id: number;
  recorded_by: number | null;
  recorded_by_name: string | null;
  amount: string;
  method: 'cash' | 'transfer' | 'card';
  notes: string | null;
  created_at: Date;
}

export interface WorkOrderItemRow {
  id: number;
  work_order_id: number;
  part_id: number;
  sku: string;
  part_name: string;
  quantity: number;
  unit_price_snapshot: string;
}

export const ordersRepository = {
  async findAll(filters: {
    clientId?: number;
    mechanicId?: number;
    onlyUnassigned?: boolean;
    status?: OrderStatus;
    plate?: string;
  }): Promise<WorkOrderRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.clientId !== undefined) {
      params.push(filters.clientId);
      conditions.push(`v.client_id = $${params.length}`);
    }
    if (filters.mechanicId !== undefined) {
      params.push(filters.mechanicId);
      conditions.push(`wo.mechanic_id = $${params.length}`);
    }
    if (filters.onlyUnassigned) {
      conditions.push(`wo.mechanic_id IS NULL AND wo.status NOT IN ('completed', 'cancelled')`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`wo.status = $${params.length}`);
    }
    if (filters.plate) {
      params.push(`%${filters.plate.trim().toUpperCase().replace(/\s+/g, '')}%`);
      conditions.push(`v.plate LIKE $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const res = await pool.query<WorkOrderRow>(
      `SELECT
         wo.id,
         wo.code,
         wo.vehicle_id,
         v.plate,
         v.brand,
         v.model,
         v.year,
         v.client_id,
         cu.name AS client_name,
         wo.mechanic_id,
         mu.name AS mechanic_name,
         wo.status,
         wo.problem_description,
         wo.diagnosis,
         wo.labor_cost,
         wo.total_cost,
         wo.quote_version,
         wo.requote_reason,
         TO_CHAR(wo.estimated_delivery, 'YYYY-MM-DD') AS estimated_delivery,
         wo.inspection_checklist,
         COALESCE((SELECT SUM(op.amount) FROM order_payments op WHERE op.work_order_id = wo.id), 0)::text AS paid_amount,
         wo.created_at,
         wo.updated_at
       FROM work_orders wo
       JOIN vehicles v ON v.id = wo.vehicle_id
       JOIN users cu ON cu.id = v.client_id
       LEFT JOIN users mu ON mu.id = wo.mechanic_id
       ${whereClause}
       ORDER BY wo.created_at DESC`,
      params
    );
    return res.rows;
  },

  async findById(id: number, dbClient?: PoolClient): Promise<WorkOrderRow | null> {
    const runner = dbClient ?? pool;
    const res = await runner.query<WorkOrderRow>(
      `SELECT
         wo.id,
         wo.code,
         wo.vehicle_id,
         v.plate,
         v.brand,
         v.model,
         v.year,
         v.client_id,
         cu.name AS client_name,
         wo.mechanic_id,
         mu.name AS mechanic_name,
         wo.status,
         wo.problem_description,
         wo.diagnosis,
         wo.labor_cost,
         wo.total_cost,
         wo.quote_version,
         wo.requote_reason,
         TO_CHAR(wo.estimated_delivery, 'YYYY-MM-DD') AS estimated_delivery,
         wo.inspection_checklist,
         COALESCE((SELECT SUM(op.amount) FROM order_payments op WHERE op.work_order_id = wo.id), 0)::text AS paid_amount,
         wo.created_at,
         wo.updated_at
       FROM work_orders wo
       JOIN vehicles v ON v.id = wo.vehicle_id
       JOIN users cu ON cu.id = v.client_id
       LEFT JOIN users mu ON mu.id = wo.mechanic_id
       WHERE wo.id = $1`,
      [id]
    );
    return res.rows[0] ?? null;
  },

  async findItemsByOrderId(orderId: number, dbClient?: PoolClient): Promise<WorkOrderItemRow[]> {
    const runner = dbClient ?? pool;
    const res = await runner.query<WorkOrderItemRow>(
      `SELECT
         woi.id,
         woi.work_order_id,
         woi.part_id,
         p.sku,
         p.name AS part_name,
         woi.quantity,
         woi.unit_price_snapshot
       FROM work_order_items woi
       JOIN parts p ON p.id = woi.part_id
       WHERE woi.work_order_id = $1
       ORDER BY woi.id ASC`,
      [orderId]
    );
    return res.rows;
  },

  async findPaymentsByOrderId(orderId: number, dbClient?: PoolClient): Promise<OrderPaymentRow[]> {
    const runner = dbClient ?? pool;
    const res = await runner.query<OrderPaymentRow>(
      `SELECT
         op.id,
         op.work_order_id,
         op.recorded_by,
         u.name AS recorded_by_name,
         op.amount,
         op.method,
         op.notes,
         op.created_at
       FROM order_payments op
       LEFT JOIN users u ON u.id = op.recorded_by
       WHERE op.work_order_id = $1
       ORDER BY op.created_at DESC`,
      [orderId]
    );
    return res.rows;
  },

  async findActiveByVehicleId(vehicleId: number): Promise<{ id: number; code: string } | null> {
    const res = await pool.query<{ id: number; code: string }>(
      `SELECT id, code
       FROM work_orders
       WHERE vehicle_id = $1
         AND status NOT IN ('completed', 'cancelled')`,
      [vehicleId]
    );
    return res.rows[0] ?? null;
  },

  async create(data: {
    vehicle_id: number;
    mechanic_id: number | null;
    problem_description: string;
    estimated_delivery?: string | null;
  }): Promise<number> {
    const year = new Date().getFullYear();
    const tempCode = `OT-${year}-${Date.now().toString().slice(-6)}`;

    const res = await pool.query<{ id: number }>(
      `INSERT INTO work_orders (code, vehicle_id, mechanic_id, status, problem_description, estimated_delivery)
       VALUES ($1, $2, $3, 'received', $4, $5)
       RETURNING id`,
      [tempCode, data.vehicle_id, data.mechanic_id, data.problem_description, data.estimated_delivery || null]
    );

    const id = res.rows[0].id;
    const formattedCode = `OT-${year}-${String(id).padStart(4, '0')}`;
    await pool.query(`UPDATE work_orders SET code = $1 WHERE id = $2`, [formattedCode, id]);
    return id;
  },

  async recalculateTotal(orderId: number, dbClient: PoolClient): Promise<string> {
    const res = await dbClient.query<{ total_cost: string }>(
      `UPDATE work_orders wo
       SET total_cost = wo.labor_cost + COALESCE((
         SELECT SUM(woi.quantity * woi.unit_price_snapshot)
         FROM work_order_items woi
         WHERE woi.work_order_id = wo.id
       ), 0),
       updated_at = NOW()
       WHERE wo.id = $1
       RETURNING total_cost`,
      [orderId]
    );
    return res.rows[0].total_cost;
  },
};
