import { useEffect, useState } from 'react';
import type { GameApi } from '../ws/useGame.js';
import { NumberLine } from '../components/NumberLine.js';
import { ScoreLine } from '../components/ScoreLine.js';
import styles from './RoundResult.module.css';

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

// Поэтапное появление: 1) ответ, 2) точки, 3) очки, 4) лидерборд.
function useStages(): number {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 400),
      setTimeout(() => setStage(2), 800),
      setTimeout(() => setStage(3), 1200),
      setTimeout(() => setStage(4), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);
  return stage;
}

export function RoundResult({ game }: { game: GameApi }) {
  const stage = useStages();
  const result = game.roundResult;
  if (result === null) {
    return null;
  }

  const usernameOf = (id: number): string | null =>
    game.players.find((p) => p.telegram_id === id)?.username ?? null;

  const myResult = result.playerResults.find(
    (r) => r.telegram_id === game.myTelegramId,
  );

  const points = result.playerResults.map((r) => ({
    telegram_id: r.telegram_id,
    username: usernameOf(r.telegram_id),
    value: r.value,
  }));

  return (
    <div className={styles.card}>
      <div className={`${styles.answerBlock} ${stage >= 1 ? styles.show : ''}`}>
        <span className="label-caps">правильный ответ</span>
        <div className={styles.answer}>
          {fmt(result.correctAnswer)}
          <span className={styles.unit}>{result.unit}</span>
        </div>
      </div>

      <NumberLine
        min={result.question.range_min}
        max={result.question.range_max}
        unit={result.unit}
        correctAnswer={result.correctAnswer}
        points={points}
        dotsVisible={stage >= 2}
      />

      <div className={`${styles.myPoints} ${stage >= 3 ? styles.show : ''}`}>
        {myResult === undefined ? (
          <span className={styles.missed}>Вы не ответили · +0</span>
        ) : (
          <>
            <span className={styles.pts}>+{myResult.points}</span>
            <span className={styles.ptsHint}>
              ваш прогноз {fmt(myResult.value)}
              {result.unit} · ошибка {Math.round(myResult.error_pct * 100)}%
            </span>
          </>
        )}
      </div>

      <div className={`${styles.board} ${stage >= 4 ? styles.show : ''}`}>
        {result.leaderboard.map((e) => (
          <ScoreLine
            key={e.telegram_id}
            rank={e.rank}
            username={usernameOf(e.telegram_id)}
            score={e.total_score}
            highlight={e.telegram_id === game.myTelegramId}
          />
        ))}
      </div>

      {result.sourceUrl !== '' && (
        <a
          className={styles.source}
          href={result.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          источник ↗
        </a>
      )}
      <span className={styles.next}>следующий раунд скоро…</span>
    </div>
  );
}
