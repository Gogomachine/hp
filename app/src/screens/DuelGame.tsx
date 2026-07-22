import { useRef, useEffect, useCallback, useState } from 'react';
import { DotonCanvas } from '../components/DotonCanvas.js';
import styles from './DuelGame.module.css';

interface Props {
  seed: number;
  duration: number;
  opponentScore: number;
  opponentName: string;
  onScoreChange: (score: number) => void;
  onTimeUp: (finalScore: number) => void;
}

export function DuelGame({ seed, duration, opponentScore, opponentName, onScoreChange, onTimeUp }: Props) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [myScore, setMyScore] = useState(0);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!gameOverRef.current) {
            gameOverRef.current = true;
            onTimeUp(scoreRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [duration, onTimeUp]);

  const handleScoreChange = useCallback((score: number) => {
    scoreRef.current = score;
    setMyScore(score);
    onScoreChange(score);
  }, [onScoreChange]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.playerScore}>
          <div className={styles.scoreLabel}>Вы</div>
          <div className={styles.scoreValue}>{myScore}</div>
        </div>
        <div className={styles.timer + (timeLeft <= 10 ? ' ' + styles.warning : '')}>
          {timeLeft}
        </div>
        <div className={styles.opponentScore}>
          <div className={styles.scoreLabel}>{opponentName}</div>
          <div className={styles.scoreValue}>{opponentScore}</div>
        </div>
      </div>
      <DotonCanvas
        seed={seed}
        onScoreChange={handleScoreChange}
        disabled={timeLeft <= 0}
      />
    </div>
  );
}
