import { pool } from '../../db/pool';

export interface PartRow {
  id: number;
  sku: string;
  name: string;
  stock: number;
  min_stock: number;
  unit_price: string;
  low_stock: boolean;
  created_at: Date;
}

export interface StockMovementRow {
  id: number;
  part_id: number;
  user_id: number | null;
  user_name: string | null;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  provider: string | null;
  unit_cost: string | null;
  created_at: Date;
}

export const partsRepository = {
  async findAll(): Promise<PartRow[]> {
    const res = await pool.query<PartRow>(
      `SELECT
         id,
         sku,
         name,
         stock,
         min_stock,
         unit_price,
         (stock <= min_stock) AS low_stock,
         created_at
       FROM parts
       ORDER BY (stock <= min_stock) DESC, name ASC`
    );
    return res.rows;
  },

  async findById(id: number): Promise<PartRow | null> {
    const res = await pool.query<PartRow>(
      `SELECT
         id,
         sku,
         name,
         stock,
         min_stock,
         unit_price,
         (stock <= min_stock) AS low_stock,
         created_at
       FROM parts
       WHERE id = $1`,
      [id]
    );
    return res.rows[0] ?? null;
  },

  async findBySku(sku: string): Promise<{ id: number } | null> {
    const res = await pool.query<{ id: number }>(`SELECT id FROM parts WHERE sku = $1`, [sku]);
    return res.rows[0] ?? null;
  },

  async create(data: {
    sku: string;
    name: string;
    stock: number;
    min_stock: number;
    unit_price: number;
  }): Promise<PartRow> {
    const res = await pool.query<PartRow>(
      `INSERT INTO parts (sku, name, stock, min_stock, unit_price)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sku, name, stock, min_stock, unit_price, (stock <= min_stock) AS low_stock, created_at`,
      [data.sku, data.name, data.stock, data.min_stock, data.unit_price]
    );
    return res.rows[0];
  },

  async update(
    id: number,
    data: { name?: string; min_stock?: number; unit_price?: number }
  ): Promise<PartRow | null> {
    const res = await pool.query<PartRow>(
      `UPDATE parts
       SET name = COALESCE($2, name),
           min_stock = COALESCE($3, min_stock),
           unit_price = COALESCE($4, unit_price)
       WHERE id = $1
       RETURNING id, sku, name, stock, min_stock, unit_price, (stock <= min_stock) AS low_stock, created_at`,
      [id, data.name ?? null, data.min_stock ?? null, data.unit_price ?? null]
    );
    return res.rows[0] ?? null;
  },

  async addStock(id: number, quantity: number): Promise<PartRow | null> {
    const res = await pool.query<PartRow>(
      `UPDATE parts
       SET stock = stock + $2
       WHERE id = $1
       RETURNING id, sku, name, stock, min_stock, unit_price, (stock <= min_stock) AS low_stock, created_at`,
      [id, quantity]
    );
    return res.rows[0] ?? null;
  },

  async listMovements(partId: number): Promise<StockMovementRow[]> {
    const res = await pool.query<StockMovementRow>(
      `SELECT
         sm.id,
         sm.part_id,
         sm.user_id,
         u.name AS user_name,
         sm.type,
         sm.quantity,
         sm.reason,
         sm.provider,
         sm.unit_cost,
         sm.created_at
       FROM stock_movements sm
       LEFT JOIN users u ON u.id = sm.user_id
       WHERE sm.part_id = $1
       ORDER BY sm.created_at DESC
       LIMIT 50`,
      [partId]
    );
    return res.rows;
  },
};
