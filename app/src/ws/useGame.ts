// useGame — единый источник игрового состояния для UI.
// Обрабатывает события контракта (server→client) и локальные действия игрока.
// Поддерживает demo-режим: рендерит экран раунда без живого бэкенда.

import { useEffect, useMemo, useReducer, useRef } from 'react';
import { GameSocket } from './client.js';
import type {
  ConnectionStatus,
  FinalLeaderboardEntry,
  LeaderboardEntry,
  Player,
  PlayerResult,
  Question,
  ServerEvent,
} from './types.js';
import { getInitData } from '../telegram.js';
import { demoState } from './demo.js';

export type Phase = 'connecting' | 'lobby' | 'round' | 'roundResult' | 'final';

export interface RoundResult {
  points: number;
  errorPct: number;
  correctAnswer: number;
}

export interface RoundState {
  number: number;
  roundCount: number;
  roundId: number | null;
  question: Question;
  durationSec: number;
  startedAt: number; // ms (серверный started_at)
  opponentsAnswered: Set<number>;
  myValue: number;
  submitted: boolean;
  result: RoundResult | null; // используется demo-режимом для inline-показа
  crowdRevealed: boolean;
}

export interface RoundResultState {
  question: Question;
  correctAnswer: number;
  unit: string;
  sourceUrl: string;
  myValue: number | null;
  playerResults: PlayerResult[];
  leaderboard: LeaderboardEntry[];
}

export interface GameState {
  phase: Phase;
  connection: ConnectionStatus;
  myTelegramId: number;
  players: Player[];
  totalScore: number;
  round: RoundState | null;
  roundResult: RoundResultState | null;
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
    case 'joined':
      return state;

    case 'tournament:start':
      return {
        ...state,
        players: event.players.map((p) => ({ ...p, total_score: 0 })),
        phase: 'lobby',
      };

    case 'round:start': {
      const startedAt = Date.parse(event.started_at);
      return {
        ...state,
        phase: 'round',
        roundResult: null,
        round: {
          number: event.round,
          roundCount: 6,
          roundId: event.round_id,
          question: event.question,
          durationSec: event.duration,
          startedAt: Number.isNaN(startedAt) ? Date.now() : startedAt,
          opponentsAnswered: new Set<number>(),
          myValue: midpoint(event.question),
          submitted: false,
          result: null,
          crowdRevealed: false,
        },
      };
    }

    case 'player:answered': {
      if (state.round === null || event.telegram_id === state.myTelegramId) {
        return state;
      }
      const opponentsAnswered = new Set(state.round.opponentsAnswered);
      opponentsAnswered.add(event.telegram_id);
      return { ...state, round: { ...state.round, opponentsAnswered } };
    }

    case 'round:end': {
      const question = state.round?.question ?? null;
      const me = event.leaderboard.find(
        (l) => l.telegram_id === state.myTelegramId,
      );
      return {
        ...state,
        phase: 'roundResult',
        totalScore: me?.total_score ?? state.totalScore,
        players: mergeScores(state.players, event.leaderboard),
        roundResult:
          question === null
            ? null
            : {
                question,
                correctAnswer: event.correct_answer,
                unit: event.unit,
                sourceUrl: event.source_url,
                myValue: state.round?.myValue ?? null,
                playerResults: event.player_results,
                leaderboard: event.leaderboard,
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
  leaderboard: LeaderboardEntry[],
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
    roundResult: null,
    finalLeaderboard: null,
    lastError: null,
  };
}

export function useGame(opts: UseGameOptions): GameApi {
  const [state, dispatch] = useReducer(reducer, opts, initialState);
  const socketRef = useRef<GameSocket | null>(null);

  useEffect(() => {
    if (opts.demo) {
      return;
    }
    const socket = new GameSocket(opts.wsUrl);
    socketRef.current = socket;
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
      socketRef.current = null;
    };
  }, [opts.demo, opts.wsUrl, opts.tournamentId, opts.myTelegramId]);

  return useMemo<GameApi>(
    () => ({
      ...state,
      setValue: (value: number) => dispatch({ type: 'setValue', value }),
      submit: () => {
        if (state.round !== null && !state.round.submitted) {
          const socket = socketRef.current;
          if (socket !== null && state.round.roundId !== null) {
            socket.send({
              event: 'answer',
              round_id: state.round.roundId,
              value: state.round.myValue,
            });
          }
          dispatch({ type: 'submit' });
        }
      },
    }),
    [state],
  );
}
