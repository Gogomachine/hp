// Централизованная загрузка и валидация переменных окружения.
// Падаем рано и явно, если обязательная переменная отсутствует.

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function toInt(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Env variable ${name} must be an integer, got: ${value}`);
  }
  return parsed;
}

export interface Config {
  databaseUrl: string;
  port: number;
  wsPort: number;
  botToken: string;
  webappUrl: string;
  isProduction: boolean;
}

export function loadConfig(): Config {
  return {
    databaseUrl: required('DATABASE_URL'),
    port: toInt(optional('PORT', '3000'), 'PORT'),
    wsPort: toInt(optional('WS_PORT', '3001'), 'WS_PORT'),
    // BOT_TOKEN опционален на фазе 1: без него бот просто не запускается.
    botToken: optional('BOT_TOKEN', ''),
    webappUrl: optional('WEBAPP_URL', ''),
    isProduction: optional('NODE_ENV', 'development') === 'production',
  };
}
