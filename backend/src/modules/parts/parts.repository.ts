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
};
