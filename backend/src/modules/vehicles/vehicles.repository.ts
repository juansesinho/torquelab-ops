import { pool } from '../../db/pool';

export interface VehicleRow {
  id: number;
  client_id: number;
  client_name: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  mileage: number | null;
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
         v.mileage,
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
         v.mileage,
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
    mileage?: number | null;
  }): Promise<VehicleRow> {
    const insertRes = await pool.query<{ id: number }>(
      `INSERT INTO vehicles (client_id, plate, brand, model, year, mileage)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [data.client_id, data.plate, data.brand, data.model, data.year, data.mileage ?? null]
    );
    const created = await this.findById(insertRes.rows[0].id);
    return created!;
  },

  async update(
    id: number,
    data: {
      plate?: string;
      brand?: string;
      model?: string;
      year?: number;
      mileage?: number | null;
    }
  ): Promise<VehicleRow | null> {
    await pool.query(
      `UPDATE vehicles
       SET plate = COALESCE($2, plate),
           brand = COALESCE($3, brand),
           model = COALESCE($4, model),
           year = COALESCE($5, year),
           mileage = CASE WHEN $6::boolean THEN $7 ELSE mileage END
       WHERE id = $1`,
      [
        id,
        data.plate ?? null,
        data.brand ?? null,
        data.model ?? null,
        data.year ?? null,
        data.mileage !== undefined,
        data.mileage ?? null,
      ]
    );
    return this.findById(id);
  },

  async findOrdersByVehicleId(vehicleId: number) {
    const res = await pool.query(
      `SELECT
         wo.id,
         wo.code,
         wo.status,
         wo.problem_description,
         wo.diagnosis,
         wo.total_cost,
         wo.created_at,
         mu.name AS mechanic_name
       FROM work_orders wo
       LEFT JOIN users mu ON mu.id = wo.mechanic_id
       WHERE wo.vehicle_id = $1
       ORDER BY wo.created_at DESC`,
      [vehicleId]
    );
    return res.rows;
  },
};
