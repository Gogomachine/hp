// Комнаты WS и рассылка. gameLoop вызывает broadcast() без прямого доступа к WS.

import { WebSocket } from 'ws';
import type { ServerEvent } from './events.js';

export interface ClientMeta {
  telegramId: number;
  tournamentId: number;
}

// Комнаты: tournamentId → набор сокетов.
export const rooms = new Map<number, Set<WebSocket>>();
// Мета по сокету: кто и в каком турнире.
export const clients = new Map<WebSocket, ClientMeta>();

export function sendTo(ws: WebSocket, event: ServerEvent): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}

export function broadcast(tournamentId: number, event: ServerEvent): void {
  const room = rooms.get(tournamentId);
  if (room === undefined) {
    return;
  }
  const data = JSON.stringify(event);
  for (const ws of room) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

export function addToRoom(ws: WebSocket, meta: ClientMeta): void {
  let room = rooms.get(meta.tournamentId);
  if (room === undefined) {
    room = new Set<WebSocket>();
    rooms.set(meta.tournamentId, room);
  }
  room.add(ws);
  clients.set(ws, meta);
}

export function removeClient(ws: WebSocket): void {
  const meta = clients.get(ws);
  if (meta !== undefined) {
    const room = rooms.get(meta.tournamentId);
    room?.delete(ws);
    if (room !== undefined && room.size === 0) {
      rooms.delete(meta.tournamentId);
    }
    clients.delete(ws);
  }
}

export function activeRoomCount(): number {
  return rooms.size;
}
