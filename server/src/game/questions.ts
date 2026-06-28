// Выбор вопросов для турнира. Берём n случайных активных вопросов, избегая
// недавно использованных (last_used < 7 дней). Если таких не хватает — добираем
// без учёта свежести. Помечаем выбранные (last_used, use_count).

import { query } from '../db/index.js';
import type { QuestionRow } from './types.js';

const SELECT_FIELDS = `id, text, text_en, category, answer, unit,
  range_min, range_max, score_curve, tolerance, max_points, difficulty, source_url`;

export async function pickQuestions(n: number): Promise<QuestionRow[]> {
  // 1) Свежие (не использованные за последние 7 дней).
  const fresh = await query<QuestionRow>(
    `SELECT ${SELECT_FIELDS}
       FROM questions
      WHERE status = 'active'
        AND (last_used IS NULL OR last_used < now() - interval '7 days')
      ORDER BY random()
      LIMIT $1`,
    [n],
  );

  let picked = fresh.rows;

  // 2) Добор, если свежих не хватило.
  if (picked.length < n) {
    const excludeIds = picked.map((q) => q.id);
    const extra = await query<QuestionRow>(
      `SELECT ${SELECT_FIELDS}
         FROM questions
        WHERE status = 'active'
          AND NOT (id = ANY($1::int[]))
        ORDER BY random()
        LIMIT $2`,
      [excludeIds, n - picked.length],
    );
    picked = [...picked, ...extra.rows];
  }

  // 3) Отмечаем использование.
  if (picked.length > 0) {
    const ids = picked.map((q) => q.id);
    await query(
      `UPDATE questions
          SET last_used = now(), use_count = use_count + 1
        WHERE id = ANY($1::int[])`,
      [ids],
    );
  }

  return picked;
}
