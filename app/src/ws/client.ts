// WebSocket-клиент: автопереподключение с exponential backoff (1s, 2s, 4s … 30s),
// очередь исходящих сообщений на время разрыва, ping каждые 30с.

import type { ClientMessage, ConnectionStatus, ServerEvent } from './types.js';

type EventListener = (event: ServerEvent) => void;
type StatusListener = (status: ConnectionStatus) => void;

const PING_INTERVAL_MS = 30_000;
const MAX_BACKOFF_MS = 30_000;

export class GameSocket {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly eventListeners = new Set<EventListener>();
  private readonly statusListeners = new Set<StatusListener>();
  private readonly outbox: ClientMessage[] = [];

  private backoffMs = 1_000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private userClosed = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    this.userClosed = false;
    this.openSocket();
  }

  private openSocket(): void {
    this.setStatus(this.backoffMs === 1_000 ? 'connecting' : 'reconnecting');
    let socket: WebSocket;
    try {
      socket = new WebSocket(this.url);
    } catch (err) {
      console.error('[ws] failed to construct socket', err);
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      this.backoffMs = 1_000;
      this.setStatus('open');
      this.flushOutbox();
      this.startPing();
    };

    socket.onmessage = (ev) => {
      const parsed = this.parse(ev.data);
      if (parsed === null) {
        return;
      }
      for (const listener of this.eventListeners) {
        listener(parsed);
      }
    };

    socket.onclose = () => {
      this.stopPing();
      if (!this.userClosed) {
        this.scheduleReconnect();
      } else {
        this.setStatus('closed');
      }
    };

    socket.onerror = (err) => {
      console.error('[ws] socket error', err);
      socket.close();
    };
  }

  private parse(data: unknown): ServerEvent | null {
    if (typeof data !== 'string') {
      return null;
    }
    try {
      const obj = JSON.parse(data) as unknown;
      if (
        typeof obj === 'object' &&
        obj !== null &&
        'event' in obj &&
        typeof (obj as { event: unknown }).event === 'string'
      ) {
        return obj as ServerEvent;
      }
      return null;
    } catch (err) {
      console.error('[ws] failed to parse message', err);
      return null;
    }
  }

  send(message: ClientMessage): void {
    if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.outbox.push(message);
    }
  }

  private flushOutbox(): void {
    while (this.outbox.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const msg = this.outbox.shift();
      if (msg !== undefined) {
        this.ws.send(JSON.stringify(msg));
      }
    }
  }

  private scheduleReconnect(): void {
    this.setStatus('reconnecting');
    if (this.reconnectTimer !== null) {
      return;
    }
    const delay = this.backoffMs;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
      this.openSocket();
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ event: 'ping' });
    }, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private setStatus(status: ConnectionStatus): void {
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  close(): void {
    this.userClosed = true;
    this.stopPing();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
  }
}
