import type { GameApi } from '../ws/useGame.js';
import { avatarColor, initials } from '../avatar.js';
import { Wallet } from './Wallet.js';
import styles from './Lobby.module.css';

const MAX_PLAYERS = 4;

export function Lobby({ game }: { game: GameApi }) {
  const slots = Array.from({ length: MAX_PLAYERS }, (_, i) => game.players[i] ?? null);

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <h1 className={styles.title}>Лобби</h1>
        <span className={styles.count}>
          {game.players.length} / {MAX_PLAYERS}
        </span>
      </header>

      <p className={styles.sub}>Ждём игроков. Турнир стартует, когда все внесут entry fee.</p>

      <div className={styles.slots}>
        {slots.map((player, i) => (
          <div key={i} className={styles.slot}>
            {player === null ? (
              <span className={styles.empty}>пусто</span>
            ) : (
              <>
                <span
                  className={styles.avatar}
                  style={{ background: avatarColor(player.username) }}
                >
                  {initials(player.username)}
                </span>
                <span className={styles.name}>{player.username ?? 'игрок'}</span>
              </>
            )}
          </div>
        ))}
      </div>

      <div className={styles.divider} />
      <Wallet />
    </div>
  );
}
