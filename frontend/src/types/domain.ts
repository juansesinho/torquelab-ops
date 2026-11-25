export type UserRole = 'admin' | 'mechanic' | 'client';

export type OrderStatus =
  | 'received'
  | 'diagnosing'
  | 'quoted'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export interface Vehicle {
  id: number;
  client_id: number;
  client_name: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  mileage?: number | null;
  created_at: string;
  active_order_id: number | null;
  active_order_code: string | null;
  active_order_status: OrderStatus | null;
}

export interface Part {
  id: number;
  sku: string;
  name: string;
  stock: number;
  min_stock: number;
  unit_price: string;
  low_stock: boolean;
  created_at: string;
}

export interface WorkOrderItem {
  id: number;
  work_order_id: number;
  part_id: number;
  sku: string;
  part_name: string;
  quantity: number;
  unit_price_snapshot: string;
}

export interface WorkOrder {
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
  quote_version?: number;
  requote_reason?: string | null;
  estimated_delivery?: string | null;
  created_at: string;
  updated_at: string;
  items?: WorkOrderItem[];
}

export interface NotificationItem {
  id: number;
  user_id: number;
  work_order_id: number | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface StockMovement {
  id: number;
  part_id: number;
  user_id: number | null;
  user_name: string | null;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  provider: string | null;
  unit_cost: string | null;
  created_at: string;
}

export interface DashboardSummary {
  by_status: Record<string, number>;
  active_orders: number;
  completed_revenue: number;
  low_stock_parts: Array<{
    id: number;
    sku: string;
    name: string;
    stock: number;
    min_stock: number;
  }>;
}
