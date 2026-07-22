// Контракт WebSocket-событий для Doton — дуэли connect-the-dots.

// ── Клиент → Сервер ────────────────────────────────────────────────

export interface FindDuelEvent {
  event: 'find_duel';
  telegram_id: number;
  username: string;
  init_data: string;
}

export interface CancelSearchEvent {
  event: 'cancel_search';
}

export interface ScoreUpdateEvent {
  event: 'score_update';
  score: number;
}

export interface ClientDuelFinishedEvent {
  event: 'duel_finished';
  final_score: number;
}

export interface PingEvent {
  event: 'ping';
}

export type ClientEvent =
  | FindDuelEvent
  | CancelSearchEvent
  | ScoreUpdateEvent
  | ClientDuelFinishedEvent
  | PingEvent;

// ── Сервер → Клиент ────────────────────────────────────────────────

export interface DuelSearchingEvent {
  event: 'duel:searching';
}

export interface DuelFoundEvent {
  event: 'duel:found';
  opponent: { username: string; telegram_id: number };
  duel_id: number;
}

export interface DuelStartEvent {
  event: 'duel:start';
  seed: number;
  duration: number; // seconds
}

export interface DuelOpponentScoreEvent {
  event: 'duel:opponent_score';
  score: number;
}

export interface DuelEndEvent {
  event: 'duel:end';
  winner_telegram_id: number | null; // null = draw
  your_score: number;
  opponent_score: number;
  opponent_username: string;
}

export interface ErrorEvent {
  event: 'error';
  code: string;
  message: string;
}

export interface PongEvent {
  event: 'pong';
}

export type ServerEvent =
  | DuelSearchingEvent
  | DuelFoundEvent
  | DuelStartEvent
  | DuelOpponentScoreEvent
  | DuelEndEvent
  | ErrorEvent
  | PongEvent;
