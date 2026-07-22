// Обработчики WS-сообщений: find_duel, cancel_search, score_update, duel_finished, ping.

import type { WebSocket } from 'ws';
import type { ClientEvent } from './events.js';
import {
  joinQueue,
  removeFromQueueByWs,
} from '../game/matchmaking.js';
import {
  startDuel,
  updateScore,
  playerFinished,
  handleDisconnect,
} from '../game/gameLoop.js';
import { verifyTelegramInitData } from '../telegram/verify.js';

function send(ws: WebSocket, data: unknown): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function handleMessage(
  ws: WebSocket,
  message: ClientEvent,
  botToken: string,
): void {
  switch (message.event) {
    case 'find_duel':
      handleFindDuel(ws, message, botToken);
      break;
    case 'cancel_search':
      handleCancelSearch(ws);
      break;
    case 'score_update':
      handleScoreUpdate(ws, message);
      break;
    case 'duel_finished':
      handleDuelFinished(ws, message);
      break;
    case 'ping':
      send(ws, { event: 'pong' });
      break;
    default:
      send(ws, {
        event: 'error',
        code: 'UNKNOWN_EVENT',
        message: 'Unknown event type',
      });
  }
}

function handleFindDuel(
  ws: WebSocket,
  message: { telegram_id: number; username: string; init_data: string },
  botToken: string,
): void {
  // Verify Telegram init data in production
  if (botToken !== '') {
    const valid = verifyTelegramInitData(message.init_data, botToken);
    if (valid === null) {
      send(ws, {
        event: 'error',
        code: 'INVALID_INIT_DATA',
        message: 'Telegram verification failed',
      });
      return;
    }
  }

  // Tell player they're searching
  send(ws, { event: 'duel:searching' });

  // Try to match
  const match = joinQueue(ws, message.telegram_id, message.username);

  if (match) {
    const p1 = match[0];
    const p2 = match[1];
    if (!p1 || !p2) return;
    // Found 2 players, start duel
    startDuel(
      { ws: p1.ws, telegramId: p1.telegramId, username: p1.username },
      { ws: p2.ws, telegramId: p2.telegramId, username: p2.username },
    );
  }
}

function handleCancelSearch(ws: WebSocket): void {
  removeFromQueueByWs(ws);
}

function handleScoreUpdate(
  ws: WebSocket,
  message: { score: number },
): void {
  updateScore(ws, message.score);
}

function handleDuelFinished(
  ws: WebSocket,
  message: { final_score: number },
): void {
  playerFinished(ws, message.final_score);
}

export function handleClose(ws: WebSocket): void {
  removeFromQueueByWs(ws);
  handleDisconnect(ws);
}
