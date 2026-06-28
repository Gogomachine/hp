// Запросы БД игрового цикла. Только параметризованные запросы (raw pg).

import { query } from '../db/index.js';
import type { LeaderboardRow, PlayerRow } from './types.js';

export async function getPlayers(tournamentId: number): Promise<PlayerRow[]> {
  const { rows } = await query<PlayerRow>(
    `SELECT id, telegram_id, username, total_score
       FROM tournament_players
      WHERE tournament_id = $1
      ORDER BY id`,
    [tournamentId],
  );
  return rows;
}

export async function getLeaderboard(
  tournamentId: number,
): Promise<LeaderboardRow[]> {
  const { rows } = await query<{ telegram_id: number; total_score: number }>(
    `SELECT telegram_id, total_score
       FROM tournament_players
      WHERE tournament_id = $1
      ORDER BY total_score DESC, id ASC`,
    [tournamentId],
  );
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export async function insertRound(
  tournamentId: number,
  questionId: number,
  roundNumber: number,
): Promise<number> {
  const { rows } = await query<{ id: number }>(
    `INSERT INTO rounds (tournament_id, question_id, round_number, started_at)
     VALUES ($1, $2, $3, now()) RETURNING id`,
    [tournamentId, questionId, roundNumber],
  );
  return rows[0]!.id;
}

export async function markRoundEnded(roundId: number): Promise<void> {
  await query(`UPDATE rounds SET ended_at = now() WHERE id = $1`, [roundId]);
}

export async function getRoundAnswers(
  roundId: number,
): Promise<Array<{ player_id: number; value: number }>> {
  const { rows } = await query<{ player_id: number; value: number }>(
    `SELECT player_id, value FROM answers WHERE round_id = $1`,
    [roundId],
  );
  return rows;
}

export async function applyAnswerScore(
  roundId: number,
  playerId: number,
  points: number,
  errorPct: number,
): Promise<void> {
  await query(
    `UPDATE answers SET points = $1, error_pct = $2
      WHERE round_id = $3 AND player_id = $4`,
    [points, errorPct, roundId, playerId],
  );
  await query(
    `UPDATE tournament_players SET total_score = total_score + $1 WHERE id = $2`,
    [points, playerId],
  );
}

export async function setPlayerRank(
  tournamentId: number,
  telegramId: number,
  rank: number,
): Promise<void> {
  await query(
    `UPDATE tournament_players SET rank = $1
      WHERE tournament_id = $2 AND telegram_id = $3`,
    [rank, tournamentId, telegramId],
  );
}

export async function finishTournament(tournamentId: number): Promise<void> {
  await query(
    `UPDATE tournaments SET status = 'finished', finished_at = now() WHERE id = $1`,
    [tournamentId],
  );
}
