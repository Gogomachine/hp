import styles from './Menu.module.css';

interface Props {
  onFindDuel: () => void;
}

export function Menu({ onFindDuel }: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.logo}>
        {['#ea6b6b', '#ffa8a8', '#8b9bff', '#6ba89b', '#ea6b6b', '#8b9bff', '#ffa8a8', '#6ba89b', '#ea6b6b'].map(
          (color, i) => (
            <div key={i} className={styles.logoDot} style={{ background: color }} />
          )
        )}
      </div>
      <h1 className={styles.title}>DOTON</h1>
      <p className={styles.subtitle}>
        Соединяй точки. Побеждай соперника.
      </p>
      <button className={styles.duelBtn} onClick={onFindDuel}>
        Найти дуэль
      </button>
    </div>
  );
}
