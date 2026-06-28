// Формула скоринга (CLAUDE.md). Три кривые: linear | log | step.

export type ScoreCurve = 'linear' | 'log' | 'step';

export function calculateScore(
  playerValue: number,
  correctAnswer: number,
  rangeMin: number,
  rangeMax: number,
  maxPoints = 200,
  curve: ScoreCurve = 'log',
  timeBonus = 0,
): number {
  const range = rangeMax - rangeMin;
  if (range <= 0) {
    return 0;
  }

  const errorPct = Math.abs(playerValue - correctAnswer) / range;

  let base: number;
  switch (curve) {
    case 'linear':
      base = Math.max(0, 1 - errorPct);
      break;
    case 'log':
      // Логарифмическая — мягче наказывает малые ошибки, жёстче большие.
      base = Math.max(0, 1 - Math.pow(errorPct, 0.6));
      break;
    case 'step':
      base = errorPct < 0.05 ? 1 : errorPct < 0.2 ? 0.5 : 0;
      break;
    default:
      base = 0;
  }

  return Math.round(maxPoints * base + timeBonus);
}

// Бонус за скорость: максимум 20 очков за мгновенный ответ, линейно убывает.
export function calculateTimeBonus(
  answeredAt: Date,
  roundStartedAt: Date,
  duration = 45,
): number {
  const elapsed = (answeredAt.getTime() - roundStartedAt.getTime()) / 1000;
  const remaining = Math.max(0, duration - elapsed);
  if (duration <= 0) {
    return 0;
  }
  return Math.round((remaining / duration) * 20);
}
