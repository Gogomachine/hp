-- Hunchpoint — начальная схема БД (фаза 1)
-- raw pg, никаких ORM. Все таблицы создаются идемпотентно.

BEGIN;

-- Вопросы
CREATE TABLE IF NOT EXISTS questions (
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

CREATE INDEX IF NOT EXISTS idx_questions_status_category
  ON questions (status, category);

-- Турниры
CREATE TABLE IF NOT EXISTS tournaments (
  id          SERIAL PRIMARY KEY,
  tier        TEXT NOT NULL,   -- micro|standard|pro
  entry_fee   FLOAT NOT NULL,  -- USD
  max_players INT DEFAULT 4,
  status      TEXT DEFAULT 'waiting',  -- waiting|active|finished
  pool_locked BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status
  ON tournaments (status);

-- Игроки в турнире
CREATE TABLE IF NOT EXISTS tournament_players (
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

CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament
  ON tournament_players (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_telegram
  ON tournament_players (telegram_id);

-- Раунды
CREATE TABLE IF NOT EXISTS rounds (
  id            SERIAL PRIMARY KEY,
  tournament_id INT REFERENCES tournaments(id),
  question_id   INT REFERENCES questions(id),
  round_number  INT NOT NULL,
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rounds_tournament
  ON rounds (tournament_id);

-- Ответы игроков
CREATE TABLE IF NOT EXISTS answers (
  id            SERIAL PRIMARY KEY,
  round_id      INT REFERENCES rounds(id),
  player_id     INT REFERENCES tournament_players(id),
  value         FLOAT NOT NULL,
  points        INT NOT NULL,
  error_pct     FLOAT,
  answered_at   TIMESTAMPTZ DEFAULT now()
);

-- Один ответ за раунд на игрока (антифрод на уровне БД)
CREATE UNIQUE INDEX IF NOT EXISTS uq_answers_round_player
  ON answers (round_id, player_id);

-- Выплаты призовых (правила TON: логировать до отправки транзакции)
CREATE TABLE IF NOT EXISTS payouts (
  id            SERIAL PRIMARY KEY,
  tournament_id INT REFERENCES tournaments(id),
  player_id     INT REFERENCES tournament_players(id),
  rank          INT NOT NULL,
  amount        FLOAT NOT NULL,   -- TON
  wallet_address TEXT NOT NULL,
  tx_hash       TEXT,
  status        TEXT DEFAULT 'pending',  -- pending|sent|confirmed|failed
  created_at    TIMESTAMPTZ DEFAULT now(),
  sent_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payouts_tournament
  ON payouts (tournament_id);

COMMIT;
