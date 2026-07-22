// Game phases
export type Phase = 'menu' | 'searching' | 'found' | 'playing' | 'finished';

// Server events
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
  duration: number;
}

export interface DuelOpponentScoreEvent {
  event: 'duel:opponent_score';
  score: number;
}

export interface DuelEndEvent {
  event: 'duel:end';
  winner_telegram_id: number | null;
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

// Client events
export type ClientMessage =
  | { event: 'find_duel'; telegram_id: number; username: string; init_data: string }
  | { event: 'cancel_search' }
  | { event: 'score_update'; score: number }
  | { event: 'duel_finished'; final_score: number }
  | { event: 'ping' };

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

// Game state
export interface DuelState {
  phase: Phase;
  telegramId: number;
  username: string;
  duelId: number | null;
  seed: number | null;
  duration: number;
  opponent: { username: string; telegram_id: number } | null;
  myScore: number;
  opponentScore: number;
  result: {
    winnerTelegramId: number | null;
    yourScore: number;
    opponentScore: number;
    opponentUsername: string;
  } | null;
}
