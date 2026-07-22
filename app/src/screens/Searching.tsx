import styles from './Searching.module.css';

interface Props {
  onCancel: () => void;
}

export function Searching({ onCancel }: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.spinner} />
      <h2 className={styles.title}>Поиск соперника...</h2>
      <p className={styles.subtitle}>Ожидание игрока</p>
      <button className={styles.cancelBtn} onClick={onCancel}>
        Отмена
      </button>
    </div>
  );
}
