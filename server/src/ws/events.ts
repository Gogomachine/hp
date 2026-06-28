// Контракт WebSocket-событий. Единый источник правды для типов сообщений
// между сервером и клиентом (см. CLAUDE.md → WebSocket).

export interface Player {
  telegram_id: number;
  username: string | null;
  total_score: number;
}

// ── Сервер → Клиент ────────────────────────────────────────────────

export interface TournamentStartEvent {
  event: 'tournament:start';
  players: Player[];
  round_count: 6;
}

export interface RoundStartEvent {
  event: 'round:start';
  round: number;
  question: {
    text: string;
    unit: string;
    range_min: number;
    range_max: number;
    category: string;
  };
  duration: number; // секунд
}

export interface PlayerAnsweredEvent {
  event: 'player:answered';
  telegram_id: number;
}

export interface RoundEndEvent {
  event: 'round:end';
  correct_answer: number;
  player_results: Array<{
    telegram_id: number;
    value: number;
    points: number;
    error_pct: number;
  }>;
  leaderboard: Array<{
    telegram_id: number;
    total_score: number;
    rank: number;
  }>;
}

export interface TournamentEndEvent {
  event: 'tournament:end';
  leaderboard: Array<{
    telegram_id: number;
    total_score: number;
    rank: number;
    payout: number;
  }>;
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
  | TournamentStartEvent
  | RoundStartEvent
  | PlayerAnsweredEvent
  | RoundEndEvent
  | TournamentEndEvent
  | ErrorEvent
  | PongEvent;

// ── Клиент → Сервер ────────────────────────────────────────────────

export interface JoinMessage {
  event: 'join';
  tournament_id: number;
  telegram_id: number;
  init_data: string;
}

export interface AnswerMessage {
  event: 'answer';
  round_id: number;
  value: number;
}

export interface PingMessage {
  event: 'ping';
}

export type ClientMessage = JoinMessage | AnswerMessage | PingMessage;
