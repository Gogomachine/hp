// Пул подключений Postgres (raw pg, без ORM).
// Все запросы — только параметризованные.

import pg from 'pg';

const { Pool } = pg;

// BIGINT (int8, OID 20) по умолчанию возвращается строкой. Telegram-id влезает
// в безопасный диапазон JS, поэтому парсим в number — иначе сравнения сломаются.
pg.types.setTypeParser(20, (value: string) => Number.parseInt(value, 10));

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (pool === null) {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString === undefined || connectionString === '') {
      throw new Error('DATABASE_URL is not set');
    }
    pool = new Pool({ connectionString });
    pool.on('error', (err) => {
      console.error('[db] unexpected pool error', err);
    });
  }
  return pool;
}

// Тонкая обёртка над pool.query с обязательной параметризацией.
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params as unknown[]);
}

// Проверка живости соединения для /health.
export async function checkDbConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (err) {
    console.error('[db] connection check failed', err);
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool !== null) {
    await pool.end();
    pool = null;
  }
}
