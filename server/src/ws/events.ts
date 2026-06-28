// Контракт WebSocket-событий. Единый источник правды для сообщений
// сервер↔клиент (CLAUDE.md + фаза 2).

export interface PlayerInfo {
  telegram_id: number;
  username: string | null;
}

export interface QuestionPayload {
  text: string;
  unit: string;
  range_min: number;
  range_max: number;
  category: string;
}

export interface PlayerResultPayload {
  telegram_id: number;
  value: number;
  points: number;
  error_pct: number;
}

export interface LeaderboardPayload {
  telegram_id: number;
  total_score: number;
  rank: number;
}

export interface FinalLeaderboardPayload extends LeaderboardPayload {
  payout: number;
}

// ── Сервер → Клиент ────────────────────────────────────────────────

export type ServerEvent =
  | { event: 'joined'; tournament_id: number }
  | { event: 'tournament:start'; players: PlayerInfo[]; round_count: number }
  | {
      event: 'round:start';
      round: number;
      round_id: number;
      question: QuestionPayload;
      duration: number;
      started_at: string; // ISO
    }
  | { event: 'player:answered'; telegram_id: number }
  | {
      event: 'round:end';
      correct_answer: number;
      unit: string;
      source_url: string;
      player_results: PlayerResultPayload[];
      leaderboard: LeaderboardPayload[];
    }
  | { event: 'tournament:end'; leaderboard: FinalLeaderboardPayload[] }
  | { event: 'error'; code: string; message: string }
  | { event: 'pong' };

// ── Клиент → Сервер ────────────────────────────────────────────────

export type ClientMessage =
  | { event: 'join'; tournament_id: number; telegram_id: number; init_data: string }
  | { event: 'answer'; round_id: number; value: number }
  | { event: 'ping' };
