import type { GameApi } from '../ws/useGame.js';
import { ScoreLine } from '../components/ScoreLine.js';
import styles from './Final.module.css';

export function Final({ game }: { game: GameApi }) {
  const leaderboard = game.finalLeaderboard ?? [];
  const usernameOf = (telegramId: number): string | null =>
    game.players.find((p) => p.telegram_id === telegramId)?.username ?? null;

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Турнир завершён</h1>
      <p className={styles.sub}>ТОП-2 делят призовой пул (выплаты — фаза 3).</p>

      <div className={styles.list}>
        {leaderboard.map((entry) => (
          <ScoreLine
            key={entry.telegram_id}
            rank={entry.rank}
            username={usernameOf(entry.telegram_id)}
            score={entry.total_score}
            payoutLabel={
              entry.payout > 0 ? `доля ${Math.round(entry.payout * 100)}%` : undefined
            }
            highlight={entry.telegram_id === game.myTelegramId}
          />
        ))}
      </div>
    </div>
  );
}
