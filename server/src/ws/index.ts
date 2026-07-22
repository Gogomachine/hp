// WebSocket-сервер: приём соединений, ping/pong, диспетчеризация в handlers.
// Для Doton — дуэли, без комнат. Прямое общение через gameLoop.

import { WebSocketServer, WebSocket } from 'ws';
import type { ClientEvent } from './events.js';
import { handleMessage, handleClose } from './handlers.js';

const PING_INTERVAL_MS = 30_000;

const alive = new WeakMap<WebSocket, boolean>();

function parseMessage(raw: string): ClientEvent | null {
  try {
    const obj = JSON.parse(raw) as unknown;
    if (
      typeof obj === 'object' &&
      obj !== null &&
      'event' in obj &&
      typeof (obj as { event: unknown }).event === 'string'
    ) {
      return obj as ClientEvent;
    }
    return null;
  } catch {
    return null;
  }
}

function send(ws: WebSocket, data: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
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
        send(ws, {
          event: 'error',
          code: 'PARSE_ERROR',
          message: 'Invalid JSON',
        });
        return;
      }
      try {
        handleMessage(ws, msg, botToken);
      } catch (err: unknown) {
        console.error('[ws] dispatch error', err);
        send(ws, { event: 'error', code: 'INTERNAL', message: 'Internal error' });
      }
    });

    ws.on('close', () => {
      handleClose(ws);
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
