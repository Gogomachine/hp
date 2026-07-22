import styles from './DuelResult.module.css';

interface Props {
  result: {
    winnerTelegramId: number | null;
    yourScore: number;
    opponentScore: number;
    opponentUsername: string;
  };
  myTelegramId: number;
  onPlayAgain: () => void;
}

export function DuelResult({ result, myTelegramId, onPlayAgain }: Props) {
  const isWinner = result.winnerTelegramId === myTelegramId;
  const isDraw = result.winnerTelegramId === null;

  let title: string;
  let subtitle: string;

  if (isDraw) {
    title = 'Ничья!';
    subtitle = 'Равный бой';
  } else if (isWinner) {
    title = 'Победа!';
    subtitle = 'Отличная игра!';
  } else {
    title = 'Поражение';
    subtitle = 'Попробуйте ещё раз';
  }

  const titleClass = isWinner ? styles.winner : isDraw ? styles.draw : styles.loser;

  return (
    <div className={styles.container}>
      <h1 className={`${styles.title} ${titleClass}`}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>

      <div className={styles.scores}>
        <div className={styles.scoreBlock}>
          <div className={styles.scoreLabel}>Вы</div>
          <div className={`${styles.scoreNumber} ${isWinner ? styles.winnerScore : ''}`}>
            {result.yourScore}
          </div>
        </div>
        <div className={styles.vs}>vs</div>
        <div className={styles.scoreBlock}>
          <div className={styles.scoreLabel}>{result.opponentUsername}</div>
          <div className={`${styles.scoreNumber} ${!isWinner && !isDraw ? styles.winnerScore : ''}`}>
            {result.opponentScore}
          </div>
        </div>
      </div>

      <button className={styles.playAgainBtn} onClick={onPlayAgain}>
        Играть ещё
      </button>
    </div>
  );
}
