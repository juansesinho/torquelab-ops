import { PoolClient } from 'pg';
import { pool } from '../../db/pool';

export interface NotificationRow {
  id: number;
  user_id: number;
  work_order_id: number | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

export const notificationsRepository = {
  async create(
    data: {
      user_id: number;
      work_order_id?: number | null;
      title: string;
      message: string;
    },
    dbClient?: PoolClient
  ): Promise<void> {
    const runner = dbClient ?? pool;
    await runner.query(
      `INSERT INTO notifications (user_id, work_order_id, title, message)
       VALUES ($1, $2, $3, $4)`,
      [data.user_id, data.work_order_id ?? null, data.title, data.message]
    );
  },

  async findByUser(userId: number): Promise<NotificationRow[]> {
    const res = await pool.query<NotificationRow>(
      `SELECT id, user_id, work_order_id, title, message, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [userId]
    );
    return res.rows;
  },

  async markRead(id: number, userId: number): Promise<boolean> {
    const res = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  },

  async markAllRead(userId: number): Promise<void> {
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
  },
};
