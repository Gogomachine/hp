// WebSocket-сервер: приём соединений, ping/pong, диспетчеризация в handlers.
// Комнаты и рассылка живут в broadcaster.ts.

import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMessage } from './events.js';
import { removeClient, sendTo } from './broadcaster.js';
import { handleAnswer, handleJoin, handlePing } from './handlers.js';

const PING_INTERVAL_MS = 30_000;

const alive = new WeakMap<WebSocket, boolean>();

function parseMessage(raw: string): ClientMessage | null {
  try {
    const obj = JSON.parse(raw) as unknown;
    if (
      typeof obj === 'object' &&
      obj !== null &&
      'event' in obj &&
      typeof (obj as { event: unknown }).event === 'string'
    ) {
      return obj as ClientMessage;
    }
    return null;
  } catch {
    return null;
  }
}

async function dispatch(
  ws: WebSocket,
  msg: ClientMessage,
  botToken: string,
): Promise<void> {
  switch (msg.event) {
    case 'ping':
      handlePing(ws);
      break;
    case 'join':
      await handleJoin(ws, msg, botToken);
      break;
    case 'answer':
      await handleAnswer(ws, msg);
      break;
    default:
      sendTo(ws, {
        event: 'error',
        code: 'UNKNOWN_EVENT',
        message: 'Unknown event',
      });
  }
}

export function createWsServer(port: number, botToken: string): WebSocketServer {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws: WebSocket) => {
    alive.set(ws, true);
    ws.on('pong', () => alive.set(ws, true));

    ws.on('message', (raw) => {
      const msg = parseMessage(raw.toString());
      if (msg === null) {
        sendTo(ws, {
          event: 'error',
          code: 'PARSE_ERROR',
          message: 'Invalid JSON',
        });
        return;
      }
      dispatch(ws, msg, botToken).catch((err: unknown) => {
        console.error('[ws] dispatch error', err);
        sendTo(ws, { event: 'error', code: 'INTERNAL', message: 'Internal error' });
      });
    });

    ws.on('close', () => {
      // При дисконнекте просто убираем из комнаты — игра продолжается, за
      // текущий раунд игрок получит 0 (ответ не записан).
      removeClient(ws);
      alive.delete(ws);
    });

    ws.on('error', (err) => console.error('[ws] socket error', err));
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (alive.get(ws) === false) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
    }
  }, PING_INTERVAL_MS);

  wss.on('close', () => clearInterval(heartbeat));

  console.log(`[ws] listening on :${port}`);
  return wss;
}
