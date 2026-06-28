import styles from './Timer.module.css';

interface TimerProps {
  secondsLeft: number;
  durationSec: number;
}

export function Timer({ secondsLeft, durationSec }: TimerProps) {
  const ratio = durationSec > 0 ? secondsLeft / durationSec : 0;
  const low = secondsLeft <= 5;
  const color = low ? 'var(--red)' : 'var(--text)';

  return (
    <div className={styles.timer}>
      <span className={styles.value} style={{ color }}>
        {secondsLeft}
      </span>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{
            width: `${Math.max(0, Math.min(1, ratio)) * 100}%`,
            background: low ? 'var(--red)' : 'var(--green)',
          }}
        />
      </div>
    </div>
  );
}
