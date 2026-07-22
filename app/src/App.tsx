import { useGame } from './ws/useGame.js';
import { getCurrentUser } from './telegram.js';
import { Menu } from './screens/Menu.js';
import { Searching } from './screens/Searching.js';
import { DuelFound } from './screens/DuelFound.js';
import { DuelGame } from './screens/DuelGame.js';
import { DuelResult } from './screens/DuelResult.js';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001';

export default function App() {
  const { state, findDuel, cancelSearch, updateScore, finishDuel, playAgain } = useGame(WS_URL);
  const tgUser = getCurrentUser();

  const handleFindDuel = () => {
    const telegramId = tgUser?.id ?? Math.floor(Math.random() * 1000000);
    const username = tgUser?.username ?? tgUser?.first_name ?? 'Player';
    const initData = window.Telegram?.WebApp?.initData ?? '';
    findDuel(telegramId, username, initData);
  };

  switch (state.phase) {
    case 'menu':
      return <Menu onFindDuel={handleFindDuel} />;
    case 'searching':
      return <Searching onCancel={cancelSearch} />;
    case 'found':
      return <DuelFound opponent={state.opponent!} />;
    case 'playing':
      return (
        <DuelGame
          seed={state.seed!}
          duration={state.duration}
          opponentScore={state.opponentScore}
          opponentName={state.opponent?.username ?? 'Opponent'}
          onScoreChange={updateScore}
          onTimeUp={finishDuel}
        />
      );
    case 'finished':
      return (
        <DuelResult
          result={state.result!}
          myTelegramId={state.telegramId}
          onPlayAgain={() => {
            playAgain();
          }}
        />
      );
    default:
      return <Menu onFindDuel={handleFindDuel} />;
  }
}
