// Doton duel types (simplified from tournament-based types).

export interface DuelRow {
  id: number;
  player1_tg_id: number;
  player1_name: string | null;
  player2_tg_id: number;
  player2_name: string | null;
  player1_score: number;
  player2_score: number;
  winner_tg_id: number | null;
  seed: number;
  duration: number;
  started_at: string;
  finished_at: string | null;
}

export interface PlayerRow {
  telegram_id: number;
  username: string | null;
  games_played: number;
  games_won: number;
  best_score: number;
  total_score: number;
}
