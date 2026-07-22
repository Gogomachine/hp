// Matchmaking: очередь на 2 игроков для Doton-дуэлей.
// Полностью в памяти (без БД). При 2 игроках в очереди — мгновенный матч.

import type { WebSocket } from 'ws';

interface QueueEntry {
  ws: WebSocket;
  telegramId: number;
  username: string;
}

const queue: QueueEntry[] = [];

export function joinQueue(
  ws: WebSocket,
  telegramId: number,
  username: string,
): QueueEntry[] | null {
  // Remove if already in queue
  removeFromQueue(telegramId);

  queue.push({ ws, telegramId, username });

  if (queue.length >= 2) {
    const player1 = queue.shift()!;
    const player2 = queue.shift()!;
    return [player1, player2];
  }

  return null;
}

export function removeFromQueue(telegramId: number): void {
  const index = queue.findIndex((e) => e.telegramId === telegramId);
  if (index !== -1) {
    queue.splice(index, 1);
  }
}

export function removeFromQueueByWs(ws: WebSocket): void {
  const index = queue.findIndex((e) => e.ws === ws);
  if (index !== -1) {
    queue.splice(index, 1);
  }
}

export function getQueueSize(): number {
  return queue.length;
}
