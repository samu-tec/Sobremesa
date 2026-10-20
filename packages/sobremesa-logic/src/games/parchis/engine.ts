import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  die,
  integer,
  systemRandom,
  type Participant,
  type RandomSource,
} from '../../engine/helpers.js';
import { message as msg, type GameText } from '../../messages.js';

export const PARCHIS_STARTS = [4, 21, 38, 55] as const;
export const PARCHIS_SAFE = [4, 11, 16, 21, 28, 33, 38, 45, 50, 55, 62, 67] as const;
export const PARCHIS_GOAL = 71;
export interface ParchisPlayer extends Participant {
  color: number;
  pawns: number[]; // -1: casa; 0–63: recorrido; 64–70: pasillo; 71: meta.
  arrivals: number[];
  withdrawn: boolean;
}
export interface ParchisState {
  players: ParchisPlayer[];
  currentTurnPlayerId: string;
  phase: 'roll' | 'move';
  lastRoll: number | null;
  rollCount: number;
  sixes: number;
  steps: number;
  bonus: boolean;
  repeatRoll: boolean;
  lastMoved: number | null;
  revision: number;
  winner: string | null;
  isDraw: boolean;
  message: GameText;
}
export interface ParchisPublicState extends ParchisState {
  legalPawns: number[];
}
export type ParchisAction = { type: 'ROLL' } | { type: 'MOVE'; pawn: number };
export function parchisSquare(color: number, progress: number): number | null {
  return progress >= 0 && progress < 64 ? (PARCHIS_STARTS[color] + progress) % 68 : null;
}
function occupants(s: ParchisState, color: number, progress: number) {
  const square = parchisSquare(color, progress);
  return s.players.flatMap((p) =>
    p.withdrawn
      ? []
      : p.pawns.flatMap((position, pawn) =>
          position >= 0 &&
          position < PARCHIS_GOAL &&
          (square === null
            ? p.color === color && position === progress
            : parchisSquare(p.color, position) === square)
            ? [{ player: p, pawn }]
            : [],
        ),
  );
}
function exitVictim(s: ParchisState, p: ParchisPlayer) {
  const at = occupants(s, p.color, 0);
  return at.length === 2
    ? at
        .filter((o) => o.player.id !== p.id)
        .sort((a, b) => b.player.arrivals[b.pawn] - a.player.arrivals[a.pawn])[0]
    : undefined;
}
function canMove(s: ParchisState, p: ParchisPlayer, pawn: number): boolean {
  const from = p.pawns[pawn];
  if (from === -1) {
    return (
      !s.bonus && s.lastRoll === 5 && (occupants(s, p.color, 0).length < 2 || !!exitVictim(s, p))
    );
  }
  if (from === PARCHIS_GOAL || from + s.steps > PARCHIS_GOAL) return false;
  for (let to = from + 1; to <= from + s.steps; to++) {
    if (to === PARCHIS_GOAL) continue;
    const at = occupants(s, p.color, to);
    if (at.length >= 2 && (to === from + s.steps || at[0].player.id === at[1].player.id))
      return false;
  }
  return true;
}
export function parchisLegalPawns(s: ParchisState): number[] {
  if (s.winner || s.isDraw || s.phase !== 'move') return [];
  const p = s.players.find((p) => p.id === s.currentTurnPlayerId);
  if (!p || p.withdrawn) return [];
  const legal = p.pawns.flatMap((_, pawn) => (canMove(s, p, pawn) ? [pawn] : []));
  if (!s.bonus && s.lastRoll === 5) {
    const exits = legal.filter((pawn) => p.pawns[pawn] === -1);
    if (exits.length) return exits;
  }
  if (!s.bonus && s.lastRoll === 6) {
    const barriers = legal.filter(
      (pawn) =>
        p.pawns[pawn] >= 0 &&
        p.pawns[pawn] < PARCHIS_GOAL &&
        occupants(s, p.color, p.pawns[pawn]).filter((o) => o.player.id === p.id).length === 2,
    );
    if (barriers.length) return barriers;
  }
  return legal;
}
function endMove(s: ParchisState) {
  s.phase = 'roll';
  s.steps = 0;
  s.bonus = false;
  if (s.repeatRoll) return;
  const index = s.players.findIndex((p) => p.id === s.currentTurnPlayerId);
  for (let offset = 1; offset <= s.players.length; offset++) {
    const next = s.players[(index + offset) % s.players.length];
    if (!next.withdrawn) {
      s.currentTurnPlayerId = next.id;
      break;
    }
  }
  s.sixes = 0;
  s.lastMoved = null;
}
export class ParchisEngine implements IGameEngine<ParchisState, ParchisAction, ParchisPublicState> {
  constructor(private random: RandomSource = systemRandom) {}
  initGame(players: Participant[]): ParchisState {
    const ps = participants(players, 2, 4);
    return {
      players: ps.map((p, i) => ({
        ...p,
        color: ps.length === 2 ? i * 2 : i,
        pawns: [-1, -1, -1, -1],
        arrivals: [0, 0, 0, 0],
        withdrawn: false,
      })),
      currentTurnPlayerId: ps[0].id,
      phase: 'roll',
      lastRoll: null,
      rollCount: 0,
      sixes: 0,
      steps: 0,
      bonus: false,
      repeatRoll: false,
      lastMoved: null,
      revision: 0,
      winner: null,
      isDraw: false,
      message: msg('Saca un cinco para poner una ficha en juego.'),
    };
  }
  validateAction(s: ParchisState, id: string, a: ParchisAction): boolean {
    if (
      !a ||
      typeof a !== 'object' ||
      Array.isArray(a) ||
      s.winner ||
      s.isDraw ||
      id !== s.currentTurnPlayerId ||
      !s.players.some((p) => p.id === id && !p.withdrawn)
    )
      return false;
    return a.type === 'ROLL'
      ? s.phase === 'roll'
      : a.type === 'MOVE' && integer(a.pawn, 0, 3) && parchisLegalPawns(s).includes(a.pawn);
  }
  applyAction(state: ParchisState, id: string, a: ParchisAction): ParchisState {
    if (!this.validateAction(state, id, a)) return state;
    const s = structuredClone(state),
      p = s.players.find((p) => p.id === id)!;
    s.revision++;
    if (a.type === 'ROLL') {
      s.lastRoll = die(this.random);
      s.rollCount++;
      s.sixes = s.lastRoll === 6 ? s.sixes + 1 : 0;
      s.repeatRoll = s.lastRoll === 6;
      s.bonus = false;
      if (s.sixes === 3) {
        if (s.lastMoved !== null && p.pawns[s.lastMoved] >= 0 && p.pawns[s.lastMoved] < 64)
          p.pawns[s.lastMoved] = -1;
        s.repeatRoll = false;
        s.message = msg(
          'Tres seises: termina el turno; la última ficha movida vuelve a casa si no está en el pasillo o en meta.',
        );
        endMove(s);
        return s;
      }
      s.steps = s.lastRoll === 6 && !p.pawns.includes(-1) ? 7 : s.lastRoll;
      s.phase = 'move';
      s.message = msg('Dado: {0}. Avanza {1} casillas.', s.lastRoll, s.steps);
      if (!parchisLegalPawns(s).length) {
        s.message = msg('Dado: {0}. No hay movimientos legales.', s.lastRoll);
        endMove(s);
      }
      return s;
    }
    const from = p.pawns[a.pawn],
      to = from === -1 ? 0 : from + s.steps;
    let captured = from === -1 ? exitVictim(s, p) : undefined;
    const square = parchisSquare(p.color, to);
    if (from !== -1 && square !== null && !PARCHIS_SAFE.some((safe) => safe === square))
      captured = occupants(s, p.color, to).find((o) => o.player.id !== id);
    if (captured) captured.player.pawns[captured.pawn] = -1;
    p.pawns[a.pawn] = to;
    p.arrivals[a.pawn] = s.revision;
    s.lastMoved = a.pawn;
    s.message = msg('Ficha {0}: movimiento completado.', a.pawn + 1);
    if (p.pawns.every((position) => position === PARCHIS_GOAL)) {
      s.winner = id;
      s.message = msg('¡Las cuatro fichas han llegado a meta!');
      return s;
    }
    const reward = captured ? 20 : to === PARCHIS_GOAL ? 10 : 0;
    if (reward) {
      s.steps = reward;
      s.bonus = true;
      s.message = msg('Premio: avanza {0} casillas con una ficha disponible.', reward);
      if (parchisLegalPawns(s).length) return s;
      s.message = msg('El premio de {0} casillas no tiene ningún movimiento legal.', reward);
    }
    endMove(s);
    return s;
  }
  getSanitizedState(s: ParchisState, _id: string): ParchisPublicState {
    return { ...structuredClone(s), legalPawns: parchisLegalPawns(s) };
  }
  checkWinner(s: ParchisState) {
    return s.winner;
  }
  forfeitPlayer(state: ParchisState, id: string): ParchisState {
    if (state.winner || state.isDraw || !state.players.some((p) => p.id === id && !p.withdrawn))
      return state;
    const s = structuredClone(state),
      p = s.players.find((p) => p.id === id)!;
    p.withdrawn = true;
    p.pawns.fill(-1);
    s.revision++;
    const active = s.players.filter((p) => !p.withdrawn);
    if (active.length === 1) s.winner = active[0].id;
    else if (s.currentTurnPlayerId === id) {
      s.repeatRoll = false;
      endMove(s);
    } else if (s.phase === 'move' && !parchisLegalPawns(s).length) endMove(s);
    return s;
  }
  getBotAction(s: ParchisState, id: string): ParchisAction | null {
    if (
      s.winner ||
      s.isDraw ||
      id !== s.currentTurnPlayerId ||
      !s.players.some((p) => p.id === id && !p.withdrawn)
    )
      return null;
    if (s.phase === 'roll') return { type: 'ROLL' };
    const p = s.players.find((p) => p.id === id)!;
    const score = (pawn: number) => {
      const from = p.pawns[pawn],
        to = from === -1 ? 0 : from + s.steps;
      const square = parchisSquare(p.color, to);
      const capture =
        from === -1
          ? !!exitVictim(s, p)
          : square !== null &&
            !PARCHIS_SAFE.some((safe) => safe === square) &&
            occupants(s, p.color, to).some((o) => o.player.id !== id);
      return (to === PARCHIS_GOAL ? 1000 : 0) + (capture ? 200 : 0) + to + (from === -1 ? 30 : 0);
    };
    const pawn = parchisLegalPawns(s).sort((a, b) => score(b) - score(a))[0];
    return pawn === undefined ? null : { type: 'MOVE', pawn };
  }
}
