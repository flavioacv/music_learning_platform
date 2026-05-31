import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { pool } from './pool.js';

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations',
  );
  return new Set(result.rows.map((row) => row.filename));
}

async function runMigration(filename: string) {
  const path = join(process.cwd(), 'migrations', filename);
  const sql = await readFile(path, 'utf8');

  await pool.query('BEGIN');
  try {
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [
      filename,
    ]);
    await pool.query('COMMIT');
    console.log(`Applied ${filename}`);
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

async function migrate() {
  await ensureMigrationsTable();

  const files = (await readdir(join(process.cwd(), 'migrations')))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  const applied = await getAppliedMigrations();

  for (const file of files) {
    if (!applied.has(file)) {
      await runMigration(file);
    }
  }
}

migrate()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
