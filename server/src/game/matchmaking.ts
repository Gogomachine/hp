// Matchmaking: набор игроков в ожидающий турнир по тиру, старт при 4 игроках.
// БД — источник правды (никаких ORM, только параметризованные запросы).

import { query } from '../db/index.js';
import { isTier, MAX_PLAYERS, TIERS } from './tiers.js';
import { startTournament } from './gameLoop.js';

export interface JoinResult {
  tournamentId: number;
  position: number;
}

export interface TournamentState {
  id: number;
  tier: string;
  status: string;
  players: Array<{ telegram_id: number; username: string | null; total_score: number }>;
}

async function findWaitingTournament(tier: string): Promise<number | null> {
  const { rows } = await query<{ id: number }>(
    `SELECT t.id
       FROM tournaments t
       LEFT JOIN tournament_players tp ON tp.tournament_id = t.id
      WHERE t.tier = $1 AND t.status = 'waiting'
      GROUP BY t.id
     HAVING count(tp.id) < $2
      ORDER BY t.id
      LIMIT 1`,
    [tier, MAX_PLAYERS],
  );
  return rows[0]?.id ?? null;
}

async function createWaitingTournament(tier: string): Promise<number> {
  const entryFee = TIERS[tier]!.entryFee;
  const { rows } = await query<{ id: number }>(
    `INSERT INTO tournaments (tier, entry_fee, status)
     VALUES ($1, $2, 'waiting') RETURNING id`,
    [tier, entryFee],
  );
  return rows[0]!.id;
}

async function playerCount(tournamentId: number): Promise<number> {
  const { rows } = await query<{ count: number }>(
    `SELECT count(*)::int AS count FROM tournament_players WHERE tournament_id = $1`,
    [tournamentId],
  );
  return rows[0]?.count ?? 0;
}

async function playerPosition(
  tournamentId: number,
  telegramId: number,
): Promise<number> {
  const { rows } = await query<{ position: number }>(
    `SELECT position FROM (
       SELECT telegram_id, row_number() OVER (ORDER BY id) AS position
         FROM tournament_players WHERE tournament_id = $1
     ) s WHERE telegram_id = $2`,
    [tournamentId, telegramId],
  );
  return rows[0]?.position ?? 0;
}

export async function joinQueue(
  telegramId: number,
  username: string | null,
  tier: string,
): Promise<JoinResult> {
  if (!isTier(tier)) {
    throw new Error(`unknown tier: ${tier}`);
  }

  const tournamentId =
    (await findWaitingTournament(tier)) ?? (await createWaitingTournament(tier));

  // Добавляем игрока, если его ещё нет в этом турнире.
  await query(
    `INSERT INTO tournament_players (tournament_id, telegram_id, username)
     SELECT $1, $2, $3
      WHERE NOT EXISTS (
        SELECT 1 FROM tournament_players
         WHERE tournament_id = $1 AND telegram_id = $2
      )`,
    [tournamentId, telegramId, username],
  );

  const count = await playerCount(tournamentId);
  const position = await playerPosition(tournamentId, telegramId);

  // Набралось — переводим в active и запускаем цикл.
  if (count >= MAX_PLAYERS) {
    const { rowCount } = await query(
      `UPDATE tournaments SET status = 'active'
        WHERE id = $1 AND status = 'waiting'`,
      [tournamentId],
    );
    if (rowCount !== null && rowCount > 0) {
      void startTournament(tournamentId);
    }
  }

  return { tournamentId, position };
}

export async function getTournamentState(
  tournamentId: number,
): Promise<TournamentState | null> {
  const { rows } = await query<{ id: number; tier: string; status: string }>(
    `SELECT id, tier, status FROM tournaments WHERE id = $1`,
    [tournamentId],
  );
  const tournament = rows[0];
  if (tournament === undefined) {
    return null;
  }

  const { rows: players } = await query<{
    telegram_id: number;
    username: string | null;
    total_score: number;
  }>(
    `SELECT telegram_id, username, total_score
       FROM tournament_players
      WHERE tournament_id = $1
      ORDER BY id`,
    [tournamentId],
  );

  return { ...tournament, players };
}
