// Обработчики WS-сообщений: join, answer, ping.

import { WebSocket } from 'ws';
import { verifyTelegramInitData } from '../telegram/verify.js';
import { query } from '../db/index.js';
import {
  addToRoom,
  broadcast,
  clients,
  sendTo,
} from './broadcaster.js';
import type { ClientMessage } from './events.js';

// Rate limit: один засчитанный ответ за раунд на игрока (память; в БД — UNIQUE).
const answeredThisRound = new Set<string>();

export function handlePing(ws: WebSocket): void {
  sendTo(ws, { event: 'pong' });
}

export async function handleJoin(
  ws: WebSocket,
  msg: Extract<ClientMessage, { event: 'join' }>,
  botToken: string,
): Promise<void> {
  // Верифицируем initData, если задан BOT_TOKEN (в dev без токена пропускаем).
  if (botToken !== '') {
    const verified = verifyTelegramInitData(msg.init_data, botToken);
    if (verified === null) {
      sendTo(ws, {
        event: 'error',
        code: 'AUTH_FAILED',
        message: 'Invalid Telegram initData',
      });
      return;
    }
    if (verified.telegramId !== msg.telegram_id) {
      sendTo(ws, {
        event: 'error',
        code: 'AUTH_MISMATCH',
        message: 'telegram_id does not match initData',
      });
      return;
    }
  }

  addToRoom(ws, {
    telegramId: msg.telegram_id,
    tournamentId: msg.tournament_id,
  });
  sendTo(ws, { event: 'joined', tournament_id: msg.tournament_id });
  console.log(
    `[ws] join tournament=${msg.tournament_id} telegram=${msg.telegram_id}`,
  );
}

export async function handleAnswer(
  ws: WebSocket,
  msg: Extract<ClientMessage, { event: 'answer' }>,
): Promise<void> {
  const meta = clients.get(ws);
  if (meta === undefined) {
    return;
  }

  const key = `${msg.round_id}:${meta.telegramId}`;
  if (answeredThisRound.has(key)) {
    return;
  }
  answeredThisRound.add(key);

  // Сохраняем ответ. points=0 до подсчёта в endRound. UNIQUE(round_id, player_id)
  // защищает от дублей даже при гонке.
  await query(
    `INSERT INTO answers (round_id, player_id, value, points)
     VALUES (
       $1,
       (SELECT id FROM tournament_players
         WHERE tournament_id = $2 AND telegram_id = $3),
       $4, 0
     )
     ON CONFLICT (round_id, player_id) DO NOTHING`,
    [msg.round_id, meta.tournamentId, meta.telegramId, msg.value],
  );

  // Сообщаем остальным (без значения).
  broadcast(meta.tournamentId, {
    event: 'player:answered',
    telegram_id: meta.telegramId,
  });
}

// Очистка rate-limit ключей конкретного раунда (вызывается в конце раунда).
export function clearRoundRateLimit(roundId: number): void {
  for (const key of answeredThisRound) {
    if (key.startsWith(`${roundId}:`)) {
      answeredThisRound.delete(key);
    }
  }
}
