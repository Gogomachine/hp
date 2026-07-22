import { useState, useEffect } from 'react';
import styles from './DuelFound.module.css';

interface Props {
  opponent: { username: string; telegram_id: number };
}

export function DuelFound({ opponent }: Props) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Соперник найден!</h2>
      <div className={styles.opponent}>
        <div className={styles.avatar}>VS</div>
        <div className={styles.name}>{opponent.username}</div>
      </div>
      <div className={styles.countdown}>{countdown > 0 ? countdown : 'GO!'}</div>
    </div>
  );
}
