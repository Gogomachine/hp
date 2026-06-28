import { avatarColor, initials } from '../avatar.js';
import styles from './PlayerRow.module.css';

interface PlayerRowProps {
  username: string | null;
  answered: boolean;
}

export function PlayerRow({ username, answered }: PlayerRowProps) {
  return (
    <div className={styles.row}>
      <span
        className={styles.avatar}
        style={{ background: avatarColor(username) }}
      >
        {initials(username)}
      </span>
      <span className={styles.name}>{username ?? 'игрок'}</span>
      <span className={styles.status}>
        <span
          className={styles.dot}
          style={{ background: answered ? 'var(--green)' : 'var(--orange)' }}
        />
        {answered ? 'ответил' : 'думает…'}
      </span>
    </div>
  );
}
