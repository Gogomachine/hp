// useGame — единый источник игрового состояния для UI.
// Обрабатывает события контракта (server→client) и локальные действия игрока.
// Поддерживает demo-режим: рендерит экран раунда без живого бэкенда.

import { useEffect, useMemo, useReducer } from 'react';
import { GameSocket } from './client.js';
import type {
  ConnectionStatus,
  FinalLeaderboardEntry,
  Player,
  Question,
  ServerEvent,
} from './types.js';
import { getInitData } from '../telegram.js';
import { demoState } from './demo.js';

export type Phase = 'connecting' | 'lobby' | 'round' | 'final';

export interface RoundResult {
  points: number;
  errorPct: number;
  correctAnswer: number;
}

export interface RoundState {
  number: number;
  roundCount: number;
  // ВНИМАНИЕ: контракт round:start отдаёт номер раунда, но answer требует round_id.
  // До устранения этого пробела на бэкенде используем номер как fallback.
  roundId: number | null;
  question: Question;
  durationSec: number;
  startedAt: number; // ms, момент получения round:start
  opponentsAnswered: Set<number>;
  myValue: number;
  submitted: boolean;
  result: RoundResult | null;
  crowdRevealed: boolean;
}

export interface GameState {
  phase: Phase;
  connection: ConnectionStatus;
  myTelegramId: number;
  players: Player[];
  totalScore: number;
  round: RoundState | null;
  finalLeaderboard: FinalLeaderboardEntry[] | null;
  lastError: string | null;
}

type Action =
  | { type: 'status'; status: ConnectionStatus }
  | { type: 'server'; event: ServerEvent }
  | { type: 'setValue'; value: number }
  | { type: 'submit' };

function midpoint(q: Question): number {
  return (q.range_min + q.range_max) / 2;
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'status':
      return { ...state, connection: action.status };

    case 'setValue':
      if (state.round === null || state.round.submitted) {
        return state;
      }
      return { ...state, round: { ...state.round, myValue: action.value } };

    case 'submit':
      if (state.round === null || state.round.submitted) {
        return state;
      }
      return { ...state, round: { ...state.round, submitted: true } };

    case 'server':
      return applyServerEvent(state, action.event);

    default:
      return state;
  }
}

function applyServerEvent(state: GameState, event: ServerEvent): GameState {
  switch (event.event) {
    case 'tournament:start':
      return { ...state, players: event.players, phase: 'lobby' };

    case 'round:start':
      return {
        ...state,
        phase: 'round',
        round: {
          number: event.round,
          roundCount: 6,
          roundId: null,
          question: event.question,
          durationSec: event.duration,
          startedAt: Date.now(),
          opponentsAnswered: new Set<number>(),
          myValue: midpoint(event.question),
          submitted: false,
          result: null,
          crowdRevealed: false,
        },
      };

    case 'player:answered': {
      if (state.round === null || event.telegram_id === state.myTelegramId) {
        return state;
      }
      const opponentsAnswered = new Set(state.round.opponentsAnswered);
      opponentsAnswered.add(event.telegram_id);
      return { ...state, round: { ...state.round, opponentsAnswered } };
    }

    case 'round:end': {
      if (state.round === null) {
        return state;
      }
      const mine = event.player_results.find(
        (r) => r.telegram_id === state.myTelegramId,
      );
      const me = event.leaderboard.find(
        (l) => l.telegram_id === state.myTelegramId,
      );
      const opponentsAnswered = new Set(
        event.player_results
          .map((r) => r.telegram_id)
          .filter((id) => id !== state.myTelegramId),
      );
      return {
        ...state,
        totalScore: me?.total_score ?? state.totalScore,
        players: mergeScores(state.players, event.leaderboard),
        round: {
          ...state.round,
          submitted: true,
          crowdRevealed: true,
          opponentsAnswered,
          result:
            mine === undefined
              ? null
              : {
                  points: mine.points,
                  errorPct: mine.error_pct,
                  correctAnswer: event.correct_answer,
                },
        },
      };
    }

    case 'tournament:end':
      return { ...state, phase: 'final', finalLeaderboard: event.leaderboard };

    case 'error':
      return { ...state, lastError: event.message };

    case 'pong':
      return state;

    default:
      return state;
  }
}

function mergeScores(
  players: Player[],
  leaderboard: { telegram_id: number; total_score: number }[],
): Player[] {
  return players.map((p) => {
    const entry = leaderboard.find((l) => l.telegram_id === p.telegram_id);
    return entry === undefined ? p : { ...p, total_score: entry.total_score };
  });
}

export interface UseGameOptions {
  demo: boolean;
  myTelegramId: number;
  wsUrl: string;
  tournamentId: number;
}

export interface GameApi extends GameState {
  setValue: (value: number) => void;
  submit: () => void;
}

function initialState(opts: UseGameOptions): GameState {
  if (opts.demo) {
    return demoState(opts.myTelegramId);
  }
  return {
    phase: 'connecting',
    connection: 'connecting',
    myTelegramId: opts.myTelegramId,
    players: [],
    totalScore: 0,
    round: null,
    finalLeaderboard: null,
    lastError: null,
  };
}

export function useGame(opts: UseGameOptions): GameApi {
  const [state, dispatch] = useReducer(reducer, opts, initialState);

  useEffect(() => {
    if (opts.demo) {
      return;
    }
    const socket = new GameSocket(opts.wsUrl);
    const offEvent = socket.onEvent((event) => dispatch({ type: 'server', event }));
    const offStatus = socket.onStatus((status) => {
      dispatch({ type: 'status', status });
      if (status === 'open') {
        socket.send({
          event: 'join',
          tournament_id: opts.tournamentId,
          telegram_id: opts.myTelegramId,
          init_data: getInitData(),
        });
      }
    });
    socket.connect();
    return () => {
      offEvent();
      offStatus();
      socket.close();
    };
  }, [opts.demo, opts.wsUrl, opts.tournamentId, opts.myTelegramId]);

  return useMemo<GameApi>(
    () => ({
      ...state,
      setValue: (value: number) => dispatch({ type: 'setValue', value }),
      submit: () => dispatch({ type: 'submit' }),
    }),
    [state],
  );
}
