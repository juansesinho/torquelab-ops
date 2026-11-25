import { pool } from '../../db/pool';

export const dashboardRepository = {
  async getSummary() {
    const [statusRes, revenueRes, paidRes, lowStockRes] = await Promise.all([
      pool.query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::text AS count
         FROM work_orders
         GROUP BY status`
      ),
      pool.query<{ completed_revenue: string; active_orders: string }>(
        `SELECT
           COALESCE(SUM(total_cost) FILTER (WHERE status = 'completed'), 0)::text AS completed_revenue,
           COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled'))::text AS active_orders
         FROM work_orders`
      ),
      pool.query<{ collected_revenue: string }>(
        `SELECT COALESCE(SUM(op.amount), 0)::text AS collected_revenue
         FROM order_payments op
         JOIN work_orders wo ON wo.id = op.work_order_id
         WHERE wo.status <> 'cancelled'`
      ),
      pool.query<{ id: number; sku: string; name: string; stock: number; min_stock: number }>(
        `SELECT id, sku, name, stock, min_stock
         FROM parts
         WHERE stock <= min_stock
         ORDER BY stock ASC, name ASC`
      ),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of statusRes.rows) {
      byStatus[row.status] = Number(row.count);
    }

    return {
      by_status: byStatus,
      active_orders: Number(revenueRes.rows[0]?.active_orders ?? 0),
      completed_revenue: Number(revenueRes.rows[0]?.completed_revenue ?? 0),
      collected_revenue: Number(paidRes.rows[0]?.collected_revenue ?? 0),
      low_stock_parts: lowStockRes.rows,
    };
  },
};
