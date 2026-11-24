import bcrypt from 'bcryptjs';
import { pool, withTransaction } from './pool';

async function seed() {
  await withTransaction(async (client) => {
    const existingUsers = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
    if (Number(existingUsers.rows[0].count) > 0) {
      console.log('ℹ️  La base de datos ya contiene datos. Seed omitido.');
      return;
    }

    const demoPasswordHash = await bcrypt.hash('Demo1234!', 10);

    // 1. Usuarios demo (Admin, Mecánicos, Clientes)
    const usersRes = await client.query<{ id: number; email: string; role: string }>(
      `INSERT INTO users (name, email, password_hash, role) VALUES
        ('Carlos Méndez (Jefe)', 'admin@torquelab.com', $1, 'admin'),
        ('Martín Sosa', 'mecanico@torquelab.com', $1, 'mechanic'),
        ('Lucía Ferreyra', 'lucia.mec@torquelab.com', $1, 'mechanic'),
        ('Sofía Gómez', 'cliente@torquelab.com', $1, 'client'),
        ('Diego Paredes', 'diego.cliente@torquelab.com', $1, 'client')
       RETURNING id, email, role`,
      [demoPasswordHash]
    );

    const adminId = usersRes.rows[0].id;
    const mech1Id = usersRes.rows[1].id;
    const mech2Id = usersRes.rows[2].id;
    const client1Id = usersRes.rows[3].id;
    const client2Id = usersRes.rows[4].id;
    void adminId;

    // 2. Vehículos
    const vehiclesRes = await client.query<{ id: number; plate: string }>(
      `INSERT INTO vehicles (client_id, plate, brand, model, year) VALUES
        ($1, 'AF492KL', 'Toyota', 'Corolla', 2022),
        ($1, 'AC810MN', 'Volkswagen', 'Golf', 2019),
        ($2, 'AE305RT', 'Ford', 'Ranger', 2021),
        ($2, 'AD118PQ', 'Peugeot', '208', 2020)
       RETURNING id, plate`,
      [client1Id, client2Id]
    );

    const v1 = vehiclesRes.rows[0].id;
    const v2 = vehiclesRes.rows[1].id;
    const v3 = vehiclesRes.rows[2].id;
    const v4 = vehiclesRes.rows[3].id;

    // 3. Repuestos (incluye stock bajo para alertas)
    const partsRes = await client.query<{ id: number; sku: string; unit_price: string }>(
      `INSERT INTO parts (sku, name, stock, min_stock, unit_price) VALUES
        ('FLT-ACE-01', 'Filtro de Aceite Bosch', 18, 5, 14500.00),
        ('ACE-5W30-4L', 'Aceite Sintético 5W-30 4L', 3, 5, 58000.00),
        ('PAS-FRN-DEL', 'Juego Pastillas de Freno Delanteras', 10, 4, 46500.00),
        ('DIS-FRN-VEN', 'Disco de Freno Ventilado x2', 2, 4, 89000.00),
        ('BUJ-IRD-04', 'Kit 4 Bujías Iridium', 12, 4, 52000.00),
        ('COR-DIS-K1', 'Kit Distribución Completo', 6, 3, 134000.00)
       RETURNING id, sku, unit_price`
    );

    const partOilFilter = partsRes.rows[0];
    const partOil = partsRes.rows[1];
    const partBrakePads = partsRes.rows[2];
    const partBrakeDiscs = partsRes.rows[3];
    const partTimingKit = partsRes.rows[5];

    // 4. Órdenes de trabajo en distintos estados
    const ordersRes = await client.query<{ id: number; code: string }>(
      `INSERT INTO work_orders (code, vehicle_id, mechanic_id, status, problem_description, diagnosis, labor_cost, total_cost) VALUES
        ('OT-2026-0001', $1, $5, 'quoted', 'Ruido metálico al frenar en ciudad.', 'Pastillas delanteras gastadas y discos con rebaba.', 35000.00, 170500.00),
        ('OT-2026-0002', $2, $6, 'completed', 'Service programado de 60.000 km.', 'Cambio de aceite y filtro realizado sin novedades.', 25000.00, 97500.00),
        ('OT-2026-0003', $3, $5, 'in_progress', 'Pérdida de potencia y testigo Check Engine.', 'Correa de distribución fuera de punto, requiere reemplazo de kit.', 65000.00, 199000.00),
        ('OT-2026-0004', $4, NULL, 'received', 'Revisión pre-viaje de tren delantero y fluidos.', NULL, 0.00, 0.00)
       RETURNING id, code`,
      [v1, v2, v3, v4, mech1Id, mech2Id]
    );

    const ot1 = ordersRes.rows[0].id;
    const ot2 = ordersRes.rows[1].id;
    const ot3 = ordersRes.rows[2].id;

    // 5. Ítems de órdenes (con unit_price_snapshot)
    await client.query(
      `INSERT INTO work_order_items (work_order_id, part_id, quantity, unit_price_snapshot) VALUES
        ($1, $4, 1, $5),
        ($1, $6, 1, $7),
        ($2, $8, 1, $9),
        ($2, $10, 1, $11),
        ($3, $12, 1, $13)`,
      [
        ot1,
        ot2,
        ot3,
        partBrakePads.id,
        partBrakePads.unit_price,
        partBrakeDiscs.id,
        partBrakeDiscs.unit_price,
        partOilFilter.id,
        partOilFilter.unit_price,
        partOil.id,
        partOil.unit_price,
        partTimingKit.id,
        partTimingKit.unit_price,
      ]
    );

    console.log('✅ Seed completado: usuarios demo, vehículos, repuestos y órdenes creadas.');
  });
}

seed()
  .catch((err) => {
    console.error('❌ Error al ejecutar seed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
