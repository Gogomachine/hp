# Hunchpoint — CLAUDE.md

Ты помогаешь строить **Hunchpoint**: соревновательная игра на точность предсказаний
с крипто-ставками в Telegram Mini App. Четыре игрока в лобби платят entry fee,
играют 6 раундов (слайдер на реальный вопрос с верифицированным числовым ответом),
ТОП-2 делят призовой пул в TON. Комиссия протокола 10%.

---

## Структура проекта

```
hunchpoint/
├── server/          # Fastify backend
│   ├── src/
│   │   ├── routes/      # HTTP роуты
│   │   ├── ws/          # WebSocket обработчики
│   │   ├── game/        # Game loop, matchmaking, score
│   │   ├── db/          # Postgres queries (pg, не ORM)
│   │   ├── wallet/      # TON hot wallet, мониторинг транзакций
│   │   └── index.ts     # Entry point
│   ├── migrations/      # SQL миграции (нумерованные: 001_init.sql)
│   └── .env.example
├── app/             # React Telegram Mini App
│   ├── src/
│   │   ├── screens/     # Lobby, Round, Results, Final, Wallet
│   │   ├── components/  # Slider, Timer, PlayerRow, ScoreLine
│   │   ├── ws/          # WebSocket клиент, хук useGame
│   │   └── main.tsx
│   └── index.html
└── CLAUDE.md
```

---

## Технический стек

| Слой | Технология | Заметки |
|------|-----------|---------|
| Backend | Node.js + Fastify | TypeScript, ESM |
| Database | Postgres | raw `pg`, никаких ORM |
| Real-time | `ws` (WebSocket) | комнаты по `tournament_id` |
| Frontend | React 18 + Vite | TypeScript, тёмная тема |
| Крипто | `@ton/core` + TON Connect 2.0 | `@tonconnect/ui-react` на фронте |
| Деплой | Railway | Postgres + сервер вместе |
| Мониторинг | Sentry | free tier |

---

## База данных — схема

```sql
-- Вопросы
CREATE TABLE questions (
  id          SERIAL PRIMARY KEY,
  text        TEXT NOT NULL,
  text_en     TEXT,
  category    TEXT NOT NULL,   -- market|behavior|physics|stats|wildcard
  answer      FLOAT NOT NULL,
  unit        TEXT NOT NULL,   -- %, $, kg, sec...
  range_min   FLOAT NOT NULL,
  range_max   FLOAT NOT NULL,
  score_curve TEXT NOT NULL DEFAULT 'log',  -- linear|log|step
  tolerance   FLOAT DEFAULT 0.5,
  max_points  INT DEFAULT 200,
  difficulty  INT DEFAULT 3,   -- 1-5
  source_url  TEXT NOT NULL,
  last_used   TIMESTAMPTZ,
  use_count   INT DEFAULT 0,
  avg_error   FLOAT,
  status      TEXT DEFAULT 'active'  -- active|retired|draft
);

-- Турниры
CREATE TABLE tournaments (
  id          SERIAL PRIMARY KEY,
  tier        TEXT NOT NULL,   -- micro|standard|pro
  entry_fee   FLOAT NOT NULL,  -- USD
  max_players INT DEFAULT 4,
  status      TEXT DEFAULT 'waiting',  -- waiting|active|finished
  pool_locked BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- Игроки в турнире
CREATE TABLE tournament_players (
  id              SERIAL PRIMARY KEY,
  tournament_id   INT REFERENCES tournaments(id),
  telegram_id     BIGINT NOT NULL,
  username        TEXT,
  wallet_address  TEXT,
  deposit_tx      TEXT,
  deposit_confirmed BOOLEAN DEFAULT false,
  total_score     INT DEFAULT 0,
  rank            INT
);

-- Раунды
CREATE TABLE rounds (
  id            SERIAL PRIMARY KEY,
  tournament_id INT REFERENCES tournaments(id),
  question_id   INT REFERENCES questions(id),
  round_number  INT NOT NULL,
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ
);

-- Ответы игроков
CREATE TABLE answers (
  id            SERIAL PRIMARY KEY,
  round_id      INT REFERENCES rounds(id),
  player_id     INT REFERENCES tournament_players(id),
  value         FLOAT NOT NULL,
  points        INT NOT NULL,
  error_pct     FLOAT,
  answered_at   TIMESTAMPTZ DEFAULT now()
);
```

---

## WebSocket — события (контракт)

### Сервер → Клиент

```typescript
// Старт турнира
{ event: 'tournament:start', players: Player[], round_count: 6 }

// Начало раунда
{
  event: 'round:start',
  round: number,
  question: { text: string, unit: string, range_min: number, range_max: number, category: string },
  duration: 45  // секунд
}

// Кто-то ответил (без значения)
{ event: 'player:answered', telegram_id: number }

// Конец раунда — показываем ответ
{
  event: 'round:end',
  correct_answer: number,
  player_results: Array<{ telegram_id: number, value: number, points: number, error_pct: number }>,
  leaderboard: Array<{ telegram_id: number, total_score: number, rank: number }>
}

// Финал турнира
{
  event: 'tournament:end',
  leaderboard: Array<{ telegram_id: number, total_score: number, rank: number, payout: number }>
}

// Ошибки
{ event: 'error', code: string, message: string }
```

### Клиент → Сервер

```typescript
// Подключение к турниру
{ event: 'join', tournament_id: number, telegram_id: number, init_data: string }

// Ответ на раунд
{ event: 'answer', round_id: number, value: number }

// Пинг
{ event: 'ping' }
```

---

## Формула скора

```typescript
function calculateScore(
  playerValue: number,
  correctAnswer: number,
  rangeMin: number,
  rangeMax: number,
  maxPoints: number,
  curve: 'linear' | 'log' | 'step',
  timeBonus: number = 0
): number {
  const range = rangeMax - rangeMin;
  const errorPct = Math.abs(playerValue - correctAnswer) / range;

  let base: number;
  if (curve === 'linear') {
    base = Math.max(0, 1 - errorPct);
  } else if (curve === 'log') {
    base = Math.max(0, 1 - Math.pow(errorPct, 0.6));
  } else {
    // step: полный балл если ошибка < 5%, половина до 20%, 0 остальное
    base = errorPct < 0.05 ? 1 : errorPct < 0.2 ? 0.5 : 0;
  }

  return Math.round(maxPoints * base + timeBonus);
}
```

---

## Распределение призовых

```typescript
const PAYOUTS = {
  1: 0.60,  // 60% пула → 1-е место
  2: 0.30,  // 30% пула → 2-е место
  protocol: 0.10  // 10% → комиссия
};

// Пример: 4 игрока × $5 = $20 пул
// 1-е место: $12, 2-е место: $6, протокол: $2
```

---

## Переменные окружения (.env)

```bash
# Server
DATABASE_URL=postgresql://...
PORT=3000
WS_PORT=3001
JWT_SECRET=...
ADMIN_PASSWORD=...

# Telegram
BOT_TOKEN=...
WEBAPP_URL=https://...

# TON
TON_ENDPOINT=https://toncenter.com/api/v2/jsonRPC
TON_API_KEY=...
HOT_WALLET_MNEMONIC=...   # НИКОГДА не коммитить

# Sentry
SENTRY_DSN=...
```

---

## Правила разработки

### Общие

- TypeScript везде, `strict: true`, никаких `any`
- Все async функции оборачивать в try/catch, логировать ошибки через `console.error` с контекстом
- Никогда не коммитить `.env`, мнемонику кошелька, приватные ключи
- Файлы до 300 строк — если больше, разбивать на модули

### Backend

- Использовать raw `pg` для всех запросов к БД — никаких ORM
- Параметризованные запросы везде — никакой конкатенации строк в SQL
- Верифицировать Telegram `initData` на каждый WS join и чувствительный HTTP запрос
- Rate limit: 1 ответ за раунд, не больше 10 турниров в день с одного `telegram_id`
- Серверный таймер раунда — только на сервере, клиент не доверяем

### WebSocket

- Хранить комнаты в `Map<tournamentId, Set<WebSocket>>`
- При дисконнекте: пометить игрока offline, засчитать 0 за текущий раунд, не прерывать игру
- При реконнекте: отдать текущее состояние раунда через `tournament:state`
- Ping/pong каждые 30 секунд, закрывать мёртвые соединения

### Frontend

- Тёмная тема всегда (`background: #13131a`)
- Все экраны адаптированы под мобильный viewport (375px и выше)
- Telegram WebApp SDK инициализировать в `main.tsx` до рендера
- WS переподключение с exponential backoff (1s, 2s, 4s, max 30s)
- Слайдер: `step` рассчитывать как `(range_max - range_min) / 100`

### TON / Кошелёк

- Мониторинг входящих транзакций через polling каждые 10 сек (TON Center API)
- Подтверждать депозит только после 1 подтверждения блока
- Выплату логировать в таблицу `payouts` с tx hash до отправки транзакции
- Hot wallet мнемонику хранить только в env, никогда в коде или БД

---

## Антифрод

```typescript
// Проверять при каждом join
function verifyTelegramInitData(initData: string, botToken: string): boolean {
  // HMAC-SHA256 верификация по документации Telegram
  // https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
}

// Rate limiting (хранить в Redis или в памяти для MVP)
const answersPerRound = new Map<`${tournamentId}:${roundId}:${telegramId}`, boolean>();
```

---

## Тиры турниров

```typescript
const TIERS = {
  micro:    { entryFee: 1,  label: 'Микро',    color: '#5dcaa5' },
  standard: { entryFee: 5,  label: 'Стандарт', color: '#7f77dd' },
  pro:      { entryFee: 20, label: 'Про',       color: '#ef9f27' },
} as const;
```

---

## Частые задачи — как делать

**Добавить новый WS event:**
1. Добавить тип в `server/src/ws/events.ts`
2. Добавить обработчик в `server/src/ws/handlers.ts`
3. Добавить тип на фронте в `app/src/ws/types.ts`
4. Обработать в `useGame` хуке

**Добавить новый вопрос в БД:**
```sql
INSERT INTO questions (text, category, answer, unit, range_min, range_max, source_url)
VALUES ('Вопрос?', 'market', 7.3, '%', 0, 30, 'https://source.com');
```

**Проверить здоровье системы:**
```bash
curl https://api.hunchpoint.app/health
# → {"ok":true,"db":"connected","ws":"running","tournaments_active":3}
```

**Запустить локально:**
```bash
cp .env.example .env  # заполнить переменные
cd server && npm install && npm run dev
cd app && npm install && npm run dev
```

---

## Что НЕ делать

- Не использовать ORM (Prisma, TypeORM) — только raw pg
- Не хранить ответы других игроков на клиенте до `round:end`
- Не доверять клиентскому таймеру — всё считать по серверному времени
- Не запускать турнир без подтверждённых депозитов всех игроков
- Не генерировать ответы на вопросы через AI — только из верифицированных источников
- Не добавлять ботов в платные турниры
- Не коммитить секреты в git

---

## Текущий статус

Проект в начале разработки. Начинать с фазы 1:
1. `server/migrations/001_init.sql` — создать схему БД
2. `server/src/index.ts` — базовый Fastify сервер с `/health`
3. `server/src/ws/index.ts` — WS сервер, ping/pong
4. Telegram Bot — команда `/play` открывает Mini App
5. Заполнить 50 вопросов в таблицу `questions`
