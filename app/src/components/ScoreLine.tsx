import { avatarColor, initials } from '../avatar.js';
import styles from './ScoreLine.module.css';

interface ScoreLineProps {
  rank: number;
  username: string | null;
  score: number;
  payoutLabel?: string; // напр. «доля 60%» (финал)
  highlight?: boolean;
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function ScoreLine({
  rank,
  username,
  score,
  payoutLabel,
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
      {payoutLabel !== undefined && (
        <span className={styles.payout}>{payoutLabel}</span>
      )}
      <span className={styles.score}>{score}</span>
    </div>
  );
}
