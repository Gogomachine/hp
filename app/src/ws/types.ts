// Контракт WebSocket-событий (клиентская сторона). Зеркалит server/src/ws/events.ts.

export interface Player {
  telegram_id: number;
  username: string | null;
  total_score: number;
}

export interface Question {
  text: string;
  unit: string;
  range_min: number;
  range_max: number;
  category: string;
}

export interface LeaderboardEntry {
  telegram_id: number;
  total_score: number;
  rank: number;
}

export interface FinalLeaderboardEntry extends LeaderboardEntry {
  payout: number;
}

export interface PlayerResult {
  telegram_id: number;
  value: number;
  points: number;
  error_pct: number;
}

// ── Сервер → Клиент ────────────────────────────────────────────────

export type ServerEvent =
  | { event: 'tournament:start'; players: Player[]; round_count: 6 }
  | { event: 'round:start'; round: number; question: Question; duration: number }
  | { event: 'player:answered'; telegram_id: number }
  | {
      event: 'round:end';
      correct_answer: number;
      player_results: PlayerResult[];
      leaderboard: LeaderboardEntry[];
    }
  | { event: 'tournament:end'; leaderboard: FinalLeaderboardEntry[] }
  | { event: 'error'; code: string; message: string }
  | { event: 'pong' };

// ── Клиент → Сервер ────────────────────────────────────────────────

export type ClientMessage =
  | { event: 'join'; tournament_id: number; telegram_id: number; init_data: string }
  | { event: 'answer'; round_id: number; value: number }
  | { event: 'ping' };

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';
