// Игровой цикл Doton: дуэли 1-на-1 с серверным таймером.
// Каждая дуэль — два игрока, общий seed (для генерации одинакового поля),
// 90 секунд, побеждает тот, кто набрал больше очков.

import type { WebSocket } from 'ws';

const DUEL_DURATION = 90; // seconds

interface DuelPlayer {
  ws: WebSocket;
  telegramId: number;
  username: string;
  score: number;
  finished: boolean;
}

interface ActiveDuel {
  id: number;
  players: [DuelPlayer, DuelPlayer];
  seed: number;
  startedAt: number;
  timer: ReturnType<typeof setTimeout> | null;
}

const activeDuels = new Map<number, ActiveDuel>();
let duelIdCounter = 1;

// Map ws -> duelId for quick lookup
const wsToDuel = new Map<WebSocket, number>();

function send(ws: WebSocket, data: unknown): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function startDuel(
  p1: { ws: WebSocket; telegramId: number; username: string },
  p2: { ws: WebSocket; telegramId: number; username: string },
): void {
  const duelId = duelIdCounter++;
  const seed = Math.floor(Math.random() * 2147483647);

  const duel: ActiveDuel = {
    id: duelId,
    players: [
      { ...p1, score: 0, finished: false },
      { ...p2, score: 0, finished: false },
    ],
    seed,
    startedAt: Date.now(),
    timer: null,
  };

  activeDuels.set(duelId, duel);
  wsToDuel.set(p1.ws, duelId);
  wsToDuel.set(p2.ws, duelId);

  // Notify both players they found each other
  send(p1.ws, {
    event: 'duel:found',
    opponent: { username: p2.username, telegram_id: p2.telegramId },
    duel_id: duelId,
  });
  send(p2.ws, {
    event: 'duel:found',
    opponent: { username: p1.username, telegram_id: p1.telegramId },
    duel_id: duelId,
  });

  // After 3 second countdown, start the duel
  setTimeout(() => {
    const d = activeDuels.get(duelId);
    if (!d) return;

    send(d.players[0].ws, { event: 'duel:start', seed, duration: DUEL_DURATION });
    send(d.players[1].ws, { event: 'duel:start', seed, duration: DUEL_DURATION });

    d.startedAt = Date.now();

    // Server-side timer to end the duel
    d.timer = setTimeout(() => {
      endDuel(duelId);
    }, DUEL_DURATION * 1000 + 2000); // +2s grace for network
  }, 3000);
}

export function updateScore(ws: WebSocket, score: number): void {
  const duelId = wsToDuel.get(ws);
  if (duelId === undefined) return;

  const duel = activeDuels.get(duelId);
  if (!duel) return;

  const player = duel.players.find((p) => p.ws === ws);
  if (!player) return;

  player.score = score;

  // Send score to opponent
  const opponent = duel.players.find((p) => p.ws !== ws);
  if (!opponent) return;
  send(opponent.ws, {
    event: 'duel:opponent_score',
    score,
  });
}

export function playerFinished(ws: WebSocket, finalScore: number): void {
  const duelId = wsToDuel.get(ws);
  if (duelId === undefined) return;

  const duel = activeDuels.get(duelId);
  if (!duel) return;

  const player = duel.players.find((p) => p.ws === ws);
  if (!player) return;

  player.score = finalScore;
  player.finished = true;

  // If both finished, end the duel
  if (duel.players.every((p) => p.finished)) {
    endDuel(duelId);
  }
}

function endDuel(duelId: number): void {
  const duel = activeDuels.get(duelId);
  if (!duel) return;

  if (duel.timer) {
    clearTimeout(duel.timer);
    duel.timer = null;
  }

  const [p1, p2] = duel.players;

  const winnerTelegramId =
    p1.score > p2.score
      ? p1.telegramId
      : p2.score > p1.score
        ? p2.telegramId
        : null; // draw

  send(p1.ws, {
    event: 'duel:end',
    winner_telegram_id: winnerTelegramId,
    your_score: p1.score,
    opponent_score: p2.score,
    opponent_username: p2.username,
  });

  send(p2.ws, {
    event: 'duel:end',
    winner_telegram_id: winnerTelegramId,
    your_score: p2.score,
    opponent_score: p1.score,
    opponent_username: p1.username,
  });

  // Cleanup
  wsToDuel.delete(p1.ws);
  wsToDuel.delete(p2.ws);
  activeDuels.delete(duelId);
}

export function handleDisconnect(ws: WebSocket): void {
  const duelId = wsToDuel.get(ws);
  if (duelId === undefined) return;

  const duel = activeDuels.get(duelId);
  if (!duel) return;

  const player = duel.players.find((p) => p.ws === ws);
  if (!player) return;

  // Disconnected player gets 0
  player.score = 0;
  player.finished = true;

  // Notify opponent
  const opponent = duel.players.find((p) => p.ws !== ws);
  if (!opponent) return;
  send(opponent.ws, {
    event: 'duel:opponent_score',
    score: 0,
  });

  // End the duel (opponent wins by default)
  endDuel(duelId);
}

export function getActiveDuelCount(): number {
  return activeDuels.size;
}
