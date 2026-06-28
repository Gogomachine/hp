import { useGame } from './ws/useGame.js';
import { getCurrentUser, getInitData } from './telegram.js';
import { Round } from './screens/Round.js';
import { RoundResult } from './screens/RoundResult.js';
import { Lobby } from './screens/Lobby.js';
import { Final } from './screens/Final.js';
import styles from './App.module.css';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001';
const TOURNAMENT_ID = Number(import.meta.env.VITE_TOURNAMENT_ID ?? '1');

export function App() {
  const initData = getInitData();
  const user = getCurrentUser();

  // Dev-режим живой игры в браузере вне Telegram: ?tid=<id>&tg=<telegram_id>.
  const params = new URLSearchParams(window.location.search);
  const liveTid = params.get('tid');
  const liveTg = params.get('tg');
  const forceLive = import.meta.env.DEV && liveTid !== null;

  // Вне Telegram в dev без ?tid — demo-режим (экран раунда без бэкенда).
  const demo = !forceLive && import.meta.env.DEV && initData === '';
  const myTelegramId =
    user?.id ?? (liveTg !== null ? Number(liveTg) : demo ? 999 : 0);
  const tournamentId = liveTid !== null ? Number(liveTid) : TOURNAMENT_ID;

  const game = useGame({
    demo,
    myTelegramId,
    wsUrl: WS_URL,
    tournamentId,
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
      {game.phase === 'roundResult' && <RoundResult game={game} />}
      {game.phase === 'final' && <Final game={game} />}
    </div>
  );
}
