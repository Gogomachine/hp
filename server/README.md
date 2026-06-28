# Hunchpoint — server

Fastify backend (TypeScript, ESM, raw `pg`).

## Запуск локально

```bash
cp .env.example .env   # заполнить DATABASE_URL и (опц.) BOT_TOKEN, WEBAPP_URL
npm install
npm run migrate        # применить SQL-миграции
npm run dev            # Fastify + WS + бот в watch-режиме
```

## Скрипты

| Скрипт            | Назначение                                  |
|-------------------|---------------------------------------------|
| `npm run dev`     | Запуск в режиме разработки (tsx watch)      |
| `npm run build`   | Компиляция в `dist/`                         |
| `npm start`       | Запуск собранного сервера                    |
| `npm run migrate` | Применить миграции из `migrations/*.sql`     |
| `npm run typecheck` | Проверка типов без эмита                    |

## Health check

```bash
curl http://localhost:3000/health
# → {"ok":true,"db":"connected","ws":"running","tournaments_active":0}
```

## Структура (фаза 1)

```
server/
├── migrations/001_init.sql   # схема БД
└── src/
    ├── index.ts              # Fastify + /health, запуск WS и бота
    ├── config.ts             # загрузка env
    ├── db/                   # пул pg, раннер миграций
    ├── ws/                   # WS-сервер (комнаты, ping/pong) + контракт событий
    └── telegram/             # верификация initData + бот (/play)
```

WebSocket слушает на `WS_PORT` (по умолчанию 3001). Игровой цикл (раунды,
скоринг, выплаты) добавляется в следующих фазах — сейчас реализована
инфраструктура: комнаты по `tournament_id`, ping/pong, верифицированный `join`.
