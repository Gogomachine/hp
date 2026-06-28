import { avatarColor, initials } from '../avatar.js';
import styles from './ScoreLine.module.css';

interface ScoreLineProps {
  rank: number;
  username: string | null;
  score: number;
  payout?: number; // TON, опционально (финал)
  highlight?: boolean;
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function ScoreLine({
  rank,
  username,
  score,
  payout,
  highlight = false,
}: ScoreLineProps) {
  return (
    <div className={`${styles.line} ${highlight ? styles.highlight : ''}`}>
      <span className={styles.rank}>{MEDALS[rank] ?? rank}</span>
      <span
        className={styles.avatar}
        style={{ background: avatarColor(username) }}
      >
        {initials(username)}
      </span>
      <span className={styles.name}>{username ?? 'игрок'}</span>
      {payout !== undefined && payout > 0 && (
        <span className={styles.payout}>+{payout} TON</span>
      )}
      <span className={styles.score}>{score}</span>
    </div>
  );
}
