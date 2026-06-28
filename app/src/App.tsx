import { useGame } from './ws/useGame.js';
import { getCurrentUser, getInitData } from './telegram.js';
import { Round } from './screens/Round.js';
import { Lobby } from './screens/Lobby.js';
import { Final } from './screens/Final.js';
import styles from './App.module.css';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001';
const TOURNAMENT_ID = Number(import.meta.env.VITE_TOURNAMENT_ID ?? '1');

export function App() {
  const initData = getInitData();
  const user = getCurrentUser();
  // Вне Telegram в dev — demo-режим: показываем экран раунда без бэкенда.
  const demo = import.meta.env.DEV && initData === '';
  const myTelegramId = user?.id ?? (demo ? 999 : 0);

  const game = useGame({
    demo,
    myTelegramId,
    wsUrl: WS_URL,
    tournamentId: TOURNAMENT_ID,
  });

  return (
    <div className={styles.app}>
      {!demo && game.connection !== 'open' && (
        <div className={styles.banner}>
          {game.connection === 'reconnecting'
            ? 'Переподключение…'
            : 'Подключение…'}
        </div>
      )}

      {game.phase === 'connecting' && (
        <div className={styles.center}>Подключение к турниру…</div>
      )}
      {game.phase === 'lobby' && <Lobby game={game} />}
      {game.phase === 'round' && <Round game={game} />}
      {game.phase === 'final' && <Final game={game} />}
    </div>
  );
}
