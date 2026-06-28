// Игровой цикл: 6 раундов с серверным таймером. Клиентскому времени не доверяем —
// конец раунда определяет ТОЛЬКО setTimeout на сервере.

import { broadcast } from '../ws/broadcaster.js';
import { clearRoundRateLimit } from '../ws/handlers.js';
import { calculateScore } from './scoring.js';
import { pickQuestions } from './questions.js';
import {
  applyAnswerScore,
  finishTournament,
  getLeaderboard,
  getPlayers,
  getRoundAnswers,
  insertRound,
  markRoundEnded,
  setPlayerRank,
} from './repo.js';
import type { QuestionRow } from './types.js';

// Длительности конфигурируются через env (по умолчанию — значения из спеки).
// Это упрощает интеграционное тестирование без 5-минутного ожидания.
function envMs(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const ROUND_DURATION_MS = envMs('GAME_ROUND_MS', 45_000);
const ROUNDS_PER_TOURNAMENT = 6;
const PRE_ROUND_DELAY_MS = envMs('GAME_PRE_ROUND_MS', 3_000);
const INTER_ROUND_DELAY_MS = envMs('GAME_INTER_ROUND_MS', 5_000);

// Доли пула (заглушка; реальные выплаты в TON — фаза 3).
const PAYOUT_SHARES = [0.6, 0.3];

export async function startTournament(tournamentId: number): Promise<void> {
  try {
    const questions = await pickQuestions(ROUNDS_PER_TOURNAMENT);
    if (questions.length < ROUNDS_PER_TOURNAMENT) {
      console.error(
        `[game] not enough questions for tournament ${tournamentId}: got ${questions.length}`,
      );
      return;
    }
    const players = await getPlayers(tournamentId);

    broadcast(tournamentId, {
      event: 'tournament:start',
      players: players.map((p) => ({
        telegram_id: p.telegram_id,
        username: p.username,
      })),
      round_count: ROUNDS_PER_TOURNAMENT,
    });

    schedule(() => startRound(tournamentId, questions, 1), PRE_ROUND_DELAY_MS);
  } catch (err) {
    console.error(`[game] startTournament ${tournamentId} failed`, err);
  }
}

async function startRound(
  tournamentId: number,
  questions: QuestionRow[],
  roundNumber: number,
): Promise<void> {
  try {
    const q = questions[roundNumber - 1];
    if (q === undefined) {
      console.error(`[game] missing question for round ${roundNumber}`);
      return;
    }

    const roundId = await insertRound(tournamentId, q.id, roundNumber);

    // Вопрос уходит БЕЗ правильного ответа.
    broadcast(tournamentId, {
      event: 'round:start',
      round: roundNumber,
      round_id: roundId,
      question: {
        text: q.text,
        unit: q.unit,
        range_min: q.range_min,
        range_max: q.range_max,
        category: q.category,
      },
      duration: ROUND_DURATION_MS / 1000,
      started_at: new Date().toISOString(),
    });

    schedule(
      () => endRound(tournamentId, roundId, q, roundNumber, questions),
      ROUND_DURATION_MS,
    );
  } catch (err) {
    console.error(`[game] startRound ${roundNumber} failed`, err);
  }
}

async function endRound(
  tournamentId: number,
  roundId: number,
  question: QuestionRow,
  roundNumber: number,
  questions: QuestionRow[],
): Promise<void> {
  try {
    await markRoundEnded(roundId);

    const players = await getPlayers(tournamentId);
    const answers = await getRoundAnswers(roundId);
    const answerByPlayer = new Map(answers.map((a) => [a.player_id, a.value]));
    const range = question.range_max - question.range_min;

    const playerResults = [];
    for (const player of players) {
      const value = answerByPlayer.get(player.id);
      if (value === undefined) {
        continue; // не ответил → 0 очков
      }
      const points = calculateScore(
        value,
        question.answer,
        question.range_min,
        question.range_max,
        question.max_points,
        question.score_curve,
      );
      const errorPct = range > 0 ? Math.abs(value - question.answer) / range : 0;
      await applyAnswerScore(roundId, player.id, points, errorPct);
      playerResults.push({
        telegram_id: player.telegram_id,
        value,
        points,
        error_pct: errorPct,
      });
    }

    const leaderboard = await getLeaderboard(tournamentId);

    broadcast(tournamentId, {
      event: 'round:end',
      correct_answer: question.answer,
      unit: question.unit,
      source_url: question.source_url,
      player_results: playerResults,
      leaderboard,
    });

    clearRoundRateLimit(roundId);

    if (roundNumber < ROUNDS_PER_TOURNAMENT) {
      schedule(
        () => startRound(tournamentId, questions, roundNumber + 1),
        INTER_ROUND_DELAY_MS,
      );
    } else {
      schedule(() => endTournament(tournamentId), INTER_ROUND_DELAY_MS);
    }
  } catch (err) {
    console.error(`[game] endRound ${roundNumber} failed`, err);
  }
}

async function endTournament(tournamentId: number): Promise<void> {
  try {
    const leaderboard = await getLeaderboard(tournamentId);
    for (const entry of leaderboard) {
      await setPlayerRank(tournamentId, entry.telegram_id, entry.rank);
    }
    await finishTournament(tournamentId);

    broadcast(tournamentId, {
      event: 'tournament:end',
      leaderboard: leaderboard.map((entry) => ({
        ...entry,
        payout: PAYOUT_SHARES[entry.rank - 1] ?? 0,
      })),
    });
  } catch (err) {
    console.error(`[game] endTournament ${tournamentId} failed`, err);
  }
}

// Обёртка над setTimeout с проглатыванием ошибок async-колбэка.
function schedule(fn: () => Promise<void> | void, delayMs: number): void {
  setTimeout(() => {
    void Promise.resolve(fn()).catch((err: unknown) =>
      console.error('[game] scheduled task failed', err),
    );
  }, delayMs);
}
