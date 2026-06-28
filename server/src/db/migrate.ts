// Простой раннер SQL-миграций.
// Применяет по порядку все файлы из server/migrations/*.sql,
// которые ещё не записаны в таблицу schema_migrations.

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, closePool } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', '..', 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);
}

async function appliedMigrations(): Promise<Set<string>> {
  const result = await getPool().query<{ name: string }>(
    'SELECT name FROM schema_migrations',
  );
  return new Set(result.rows.map((r) => r.name));
}

async function run(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await appliedMigrations();

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    const client = await getPool().connect();
    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (name) VALUES ($1)',
        [file],
      );
      console.log(`[migrate] applied ${file}`);
      count += 1;
    } catch (err) {
      console.error(`[migrate] failed on ${file}`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(
    count === 0 ? '[migrate] nothing to apply' : `[migrate] done, ${count} applied`,
  );
}

run()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (err: unknown) => {
    console.error('[migrate] fatal', err);
    await closePool();
    process.exit(1);
  });
