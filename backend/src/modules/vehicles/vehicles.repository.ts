import { pool } from '../../db/pool';

export interface VehicleRow {
  id: number;
  client_id: number;
  client_name: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  created_at: Date;
  active_order_id: number | null;
  active_order_code: string | null;
  active_order_status: string | null;
}

export const vehiclesRepository = {
  async findAll(clientId?: number): Promise<VehicleRow[]> {
    const params: unknown[] = [];
    let where = '';
    if (clientId !== undefined) {
      params.push(clientId);
      where = 'WHERE v.client_id = $1';
    }

    const res = await pool.query<VehicleRow>(
      `SELECT
         v.id,
         v.client_id,
         u.name AS client_name,
         v.plate,
         v.brand,
         v.model,
         v.year,
         v.created_at,
         wo.id AS active_order_id,
         wo.code AS active_order_code,
         wo.status AS active_order_status
       FROM vehicles v
       JOIN users u ON u.id = v.client_id
       LEFT JOIN work_orders wo
         ON wo.vehicle_id = v.id
        AND wo.status NOT IN ('completed', 'cancelled')
       ${where}
       ORDER BY v.created_at DESC`,
      params
    );
    return res.rows;
  },

  async findById(id: number): Promise<VehicleRow | null> {
    const res = await pool.query<VehicleRow>(
      `SELECT
         v.id,
         v.client_id,
         u.name AS client_name,
         v.plate,
         v.brand,
         v.model,
         v.year,
         v.created_at,
         wo.id AS active_order_id,
         wo.code AS active_order_code,
         wo.status AS active_order_status
       FROM vehicles v
       JOIN users u ON u.id = v.client_id
       LEFT JOIN work_orders wo
         ON wo.vehicle_id = v.id
        AND wo.status NOT IN ('completed', 'cancelled')
       WHERE v.id = $1`,
      [id]
    );
    return res.rows[0] ?? null;
  },

  async findByPlate(plate: string): Promise<{ id: number } | null> {
    const res = await pool.query<{ id: number }>(
      `SELECT id FROM vehicles WHERE plate = $1`,
      [plate]
    );
    return res.rows[0] ?? null;
  },

  async create(data: {
    client_id: number;
    plate: string;
    brand: string;
    model: string;
    year: number;
  }): Promise<VehicleRow> {
    const insertRes = await pool.query<{ id: number }>(
      `INSERT INTO vehicles (client_id, plate, brand, model, year)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [data.client_id, data.plate, data.brand, data.model, data.year]
    );
    const created = await this.findById(insertRes.rows[0].id);
    return created!;
  },
};
