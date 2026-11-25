-- TorqueLab Ops — PostgreSQL Relational Schema

CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'mechanic', 'client')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  plate VARCHAR(15) NOT NULL UNIQUE,
  brand VARCHAR(60) NOT NULL,
  model VARCHAR(60) NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1950 AND year <= 2100),
  mileage INTEGER CHECK (mileage IS NULL OR mileage >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_client_id ON vehicles(client_id);

CREATE TABLE IF NOT EXISTS parts (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  stock INTEGER NOT NULL CHECK (stock >= 0),
  min_stock INTEGER NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_orders (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  mechanic_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL CHECK (
    status IN (
      'received',
      'diagnosing',
      'quoted',
      'approved',
      'in_progress',
      'completed',
      'cancelled'
    )
  ),
  problem_description TEXT NOT NULL,
  diagnosis TEXT,
  labor_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (labor_cost >= 0),
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  quote_version INTEGER NOT NULL DEFAULT 1 CHECK (quote_version >= 1),
  requote_reason TEXT,
  estimated_delivery DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_id ON work_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_mechanic_id ON work_orders(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);

-- RN-01: Un vehículo solo puede tener una orden abierta a la vez
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_order_per_vehicle
  ON work_orders(vehicle_id)
  WHERE status NOT IN ('completed', 'cancelled');

CREATE TABLE IF NOT EXISTS work_order_items (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_snapshot NUMERIC(12, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
  UNIQUE (work_order_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_work_order_items_order_id ON work_order_items(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_items_part_id ON work_order_items(part_id);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  provider VARCHAR(120),
  unit_cost NUMERIC(12, 2) CHECK (unit_cost IS NULL OR unit_cost >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_part_id ON stock_movements(part_id);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
  title VARCHAR(140) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Migraciones idempotentes para bases existentes
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mileage INTEGER CHECK (mileage IS NULL OR mileage >= 0);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS quote_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS requote_reason TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS estimated_delivery DATE;

