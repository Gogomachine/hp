import { useReducer, useEffect, useCallback, useRef } from 'react';
import { GameSocket } from './client.js';
import type { DuelState, ServerEvent } from './types.js';

type Action =
  | { type: 'SET_USER'; telegramId: number; username: string }
  | { type: 'SEARCHING' }
  | { type: 'FOUND'; opponent: { username: string; telegram_id: number }; duelId: number }
  | { type: 'START'; seed: number; duration: number }
  | { type: 'OPPONENT_SCORE'; score: number }
  | { type: 'MY_SCORE'; score: number }
  | { type: 'FINISHED'; result: DuelState['result'] }
  | { type: 'RESET' };

const initialState: DuelState = {
  phase: 'menu',
  telegramId: 0,
  username: '',
  duelId: null,
  seed: null,
  duration: 90,
  opponent: null,
  myScore: 0,
  opponentScore: 0,
  result: null,
};

function reducer(state: DuelState, action: Action): DuelState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, telegramId: action.telegramId, username: action.username };
    case 'SEARCHING':
      return { ...state, phase: 'searching' };
    case 'FOUND':
      return { ...state, phase: 'found', opponent: action.opponent, duelId: action.duelId };
    case 'START':
      return { ...state, phase: 'playing', seed: action.seed, duration: action.duration, myScore: 0, opponentScore: 0 };
    case 'OPPONENT_SCORE':
      return { ...state, opponentScore: action.score };
    case 'MY_SCORE':
      return { ...state, myScore: action.score };
    case 'FINISHED':
      return { ...state, phase: 'finished', result: action.result };
    case 'RESET':
      return { ...initialState, telegramId: state.telegramId, username: state.username };
    default:
      return state;
  }
}

export function useGame(wsUrl: string) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const socketRef = useRef<GameSocket | null>(null);
  const scoreIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentScoreRef = useRef(0);

  useEffect(() => {
    const socket = new GameSocket(wsUrl);

    socket.onEvent((data: ServerEvent) => {
      switch (data.event) {
        case 'duel:searching':
          dispatch({ type: 'SEARCHING' });
          break;
        case 'duel:found':
          dispatch({ type: 'FOUND', opponent: data.opponent, duelId: data.duel_id });
          break;
        case 'duel:start':
          dispatch({ type: 'START', seed: data.seed, duration: data.duration });
          break;
        case 'duel:opponent_score':
          dispatch({ type: 'OPPONENT_SCORE', score: data.score });
          break;
        case 'duel:end':
          dispatch({
            type: 'FINISHED',
            result: {
              winnerTelegramId: data.winner_telegram_id,
              yourScore: data.your_score,
              opponentScore: data.opponent_score,
              opponentUsername: data.opponent_username,
            },
          });
          // Stop sending score updates
          if (scoreIntervalRef.current) {
            clearInterval(scoreIntervalRef.current);
            scoreIntervalRef.current = null;
          }
          break;
      }
    });

    socket.connect();
    socketRef.current = socket;

    return () => {
      socket.close();
      if (scoreIntervalRef.current) {
        clearInterval(scoreIntervalRef.current);
      }
    };
  }, [wsUrl]);

  const findDuel = useCallback((telegramId: number, username: string, initData: string) => {
    dispatch({ type: 'SET_USER', telegramId, username });
    socketRef.current?.send({
      event: 'find_duel',
      telegram_id: telegramId,
      username,
      init_data: initData,
    });
  }, []);

  const cancelSearch = useCallback(() => {
    socketRef.current?.send({ event: 'cancel_search' });
    dispatch({ type: 'RESET' });
  }, []);

  const updateScore = useCallback((score: number) => {
    currentScoreRef.current = score;
    dispatch({ type: 'MY_SCORE', score });
  }, []);

  // Start periodic score sending when game starts
  useEffect(() => {
    if (state.phase === 'playing') {
      scoreIntervalRef.current = setInterval(() => {
        socketRef.current?.send({
          event: 'score_update',
          score: currentScoreRef.current,
        });
      }, 500); // Send score every 500ms
    }

    return () => {
      if (scoreIntervalRef.current) {
        clearInterval(scoreIntervalRef.current);
        scoreIntervalRef.current = null;
      }
    };
  }, [state.phase]);

  const finishDuel = useCallback((finalScore: number) => {
    socketRef.current?.send({
      event: 'duel_finished',
      final_score: finalScore,
    });
    if (scoreIntervalRef.current) {
      clearInterval(scoreIntervalRef.current);
      scoreIntervalRef.current = null;
    }
  }, []);

  const playAgain = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    findDuel,
    cancelSearch,
    updateScore,
    finishDuel,
    playAgain,
    isConnected: socketRef.current?.readyState === WebSocket.OPEN,
  };
}
