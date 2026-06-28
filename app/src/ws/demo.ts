// Демо-состояние игры — точно воспроизводит экран раунда из макета.
// Используется в dev-режиме вне Telegram, чтобы видеть UI без бэкенда.

import type { GameState } from './useGame.js';
import type { Player } from './types.js';

const OPPONENTS: Player[] = [
  { telegram_id: 101, username: 'aleksei_k', total_score: 489 },
  { telegram_id: 102, username: 'm_vasyuk', total_score: 437 },
  { telegram_id: 103, username: 'pred_pro', total_score: 502 },
];

export function demoState(myTelegramId: number): GameState {
  const me: Player = {
    telegram_id: myTelegramId,
    username: 'you',
    total_score: 514,
  };

  return {
    phase: 'round',
    connection: 'open',
    myTelegramId,
    players: [me, ...OPPONENTS],
    totalScore: 514,
    round: {
      number: 3,
      roundCount: 6,
      roundId: 3,
      question: {
        text: 'На сколько % в среднем снижают цену квартиры при торге в Черногории?',
        unit: '%',
        range_min: 0,
        range_max: 30,
        category: 'market',
      },
      durationSec: 45,
      startedAt: Date.now() - 43_000, // ~2 секунды до конца
      // aleksei_k и m_vasyuk ответили, pred_pro ещё думает.
      opponentsAnswered: new Set<number>([101, 102]),
      myValue: 5,
      submitted: true,
      result: { points: 174, errorPct: 0.06, correctAnswer: 8 },
      crowdRevealed: false,
    },
    finalLeaderboard: null,
    lastError: null,
  };
}
