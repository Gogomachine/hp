-- Doton — начальная схема БД.
-- raw pg, никаких ORM. Все таблицы создаются идемпотентно.

BEGIN;

CREATE TABLE IF NOT EXISTS duels (
  id            SERIAL PRIMARY KEY,
  player1_tg_id BIGINT NOT NULL,
  player1_name  TEXT,
  player2_tg_id BIGINT NOT NULL,
  player2_name  TEXT,
  player1_score INT DEFAULT 0,
  player2_score INT DEFAULT 0,
  winner_tg_id  BIGINT,
  seed          INT NOT NULL,
  duration      INT DEFAULT 90,
  started_at    TIMESTAMPTZ DEFAULT now(),
  finished_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS players (
  telegram_id   BIGINT PRIMARY KEY,
  username      TEXT,
  games_played  INT DEFAULT 0,
  games_won     INT DEFAULT 0,
  best_score    INT DEFAULT 0,
  total_score   BIGINT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

COMMIT;
