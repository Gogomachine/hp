// WebSocket-сервер: комнаты по tournament_id, ping/pong, чистка мёртвых
// соединений. Игровой цикл будет добавлен в следующих фазах — здесь только
// инфраструктура и верифицированный join.

import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMessage, ServerEvent } from './events.js';
import { verifyTelegramInitData } from '../telegram/verify.js';

const PING_INTERVAL_MS = 30_000;

// Метаданные, которые вешаем на каждый сокет.
interface SocketState {
  isAlive: boolean;
  tournamentId: number | null;
  telegramId: number | null;
}

// Комнаты: tournamentId → набор сокетов.
const rooms = new Map<number, Set<WebSocket>>();
const state = new WeakMap<WebSocket, SocketState>();

function send(ws: WebSocket, event: ServerEvent): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}

function sendError(ws: WebSocket, code: string, message: string): void {
  send(ws, { event: 'error', code, message });
}

function joinRoom(ws: WebSocket, tournamentId: number): void {
  let room = rooms.get(tournamentId);
  if (room === undefined) {
    room = new Set<WebSocket>();
    rooms.set(tournamentId, room);
  }
  room.add(ws);
}

function leaveRoom(ws: WebSocket): void {
  const s = state.get(ws);
  if (s?.tournamentId == null) {
    return;
  }
  const room = rooms.get(s.tournamentId);
  if (room === undefined) {
    return;
  }
  room.delete(ws);
  if (room.size === 0) {
    rooms.delete(s.tournamentId);
  }
}

// Рассылка всем в комнате (экспортируется для будущего игрового цикла).
export function broadcast(tournamentId: number, event: ServerEvent): void {
  const room = rooms.get(tournamentId);
  if (room === undefined) {
    return;
  }
  for (const ws of room) {
    send(ws, event);
  }
}

export function activeTournamentCount(): number {
  return rooms.size;
}

function parseMessage(raw: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'event' in parsed &&
      typeof (parsed as { event: unknown }).event === 'string'
    ) {
      return parsed as ClientMessage;
    }
    return null;
  } catch {
    return null;
  }
}

function handleJoin(
  ws: WebSocket,
  msg: Extract<ClientMessage, { event: 'join' }>,
  botToken: string,
): void {
  const verified = verifyTelegramInitData(msg.init_data, botToken);
  if (verified === null) {
    sendError(ws, 'AUTH_FAILED', 'Invalid Telegram initData');
    return;
  }
  if (verified.telegramId !== msg.telegram_id) {
    sendError(ws, 'AUTH_MISMATCH', 'telegram_id does not match initData');
    return;
  }

  const s = state.get(ws);
  if (s !== undefined) {
    leaveRoom(ws);
    s.tournamentId = msg.tournament_id;
    s.telegramId = verified.telegramId;
  }
  joinRoom(ws, msg.tournament_id);
  console.log(
    `[ws] join tournament=${msg.tournament_id} telegram=${verified.telegramId}`,
  );
  // Игровое состояние (tournament:state) будет отдаваться в следующих фазах.
}

function handleMessage(ws: WebSocket, raw: string, botToken: string): void {
  const msg = parseMessage(raw);
  if (msg === null) {
    sendError(ws, 'BAD_MESSAGE', 'Malformed message');
    return;
  }

  switch (msg.event) {
    case 'ping':
      send(ws, { event: 'pong' });
      break;
    case 'join':
      handleJoin(ws, msg, botToken);
      break;
    case 'answer':
      // Обработка ответов — в фазе игрового цикла.
      sendError(ws, 'NOT_IMPLEMENTED', 'answer handling not implemented yet');
      break;
    default:
      sendError(ws, 'UNKNOWN_EVENT', 'Unknown event');
  }
}

export function startWebSocketServer(port: number, botToken: string): WebSocketServer {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws: WebSocket) => {
    state.set(ws, { isAlive: true, tournamentId: null, telegramId: null });

    ws.on('pong', () => {
      const s = state.get(ws);
      if (s !== undefined) {
        s.isAlive = true;
      }
    });

    ws.on('message', (data) => {
      try {
        handleMessage(ws, data.toString(), botToken);
      } catch (err) {
        console.error('[ws] message handler error', err);
        sendError(ws, 'INTERNAL', 'Internal error');
      }
    });

    ws.on('close', () => {
      leaveRoom(ws);
      state.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[ws] socket error', err);
    });
  });

  // Ping/pong: каждые 30с пингуем, мёртвые соединения закрываем.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      const s = state.get(ws);
      if (s === undefined || !s.isAlive) {
        ws.terminate();
        continue;
      }
      s.isAlive = false;
      ws.ping();
    }
  }, PING_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  console.log(`[ws] listening on :${port}`);
  return wss;
}
