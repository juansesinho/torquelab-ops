import fs from 'node:fs';
import path from 'node:path';
import { pool } from './pool';

async function initSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(sql);
  console.log('✅ Esquema PostgreSQL inicializado correctamente.');
}

initSchema()
  .catch((err) => {
    console.error('❌ Error al inicializar esquema:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
