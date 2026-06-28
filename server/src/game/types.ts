// Типы строк БД и игровых сущностей.

import type { ScoreCurve } from './scoring.js';

export interface QuestionRow {
  id: number;
  text: string;
  text_en: string | null;
  category: string;
  answer: number;
  unit: string;
  range_min: number;
  range_max: number;
  score_curve: ScoreCurve;
  tolerance: number | null;
  max_points: number;
  difficulty: number;
  source_url: string;
}

export interface PlayerRow {
  id: number;
  telegram_id: number;
  username: string | null;
  total_score: number;
}

export interface LeaderboardRow {
  telegram_id: number;
  total_score: number;
  rank: number;
}
