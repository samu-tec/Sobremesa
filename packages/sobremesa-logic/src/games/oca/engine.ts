import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  die,
  systemRandom,
  type Participant,
  type RandomSource,
} from '../../engine/helpers.js';
import { message as msg, type GameText } from '../../messages.js';
export const OCA_GEESE = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59] as const;
export type OcaSquareKind =
  | 'ordinary'
  | 'goose'
  | 'bridge'
  | 'inn'
  | 'well'
  | 'maze'
  | 'prison'
  | 'dice'
  | 'skull'
  | 'goal'
  | 'start';
export function ocaSquareKind(square: number): OcaSquareKind {
  if (square === 0) return 'start';
  if (square === 63) return 'goal';
  if (OCA_GEESE.some((n) => n === square)) return 'goose';
  if (square === 6 || square === 12) return 'bridge';
  if (square === 26 || square === 53) return 'dice';
  return (
    ({ 19: 'inn', 31: 'well', 42: 'maze', 52: 'prison', 58: 'skull' } as const)[
      square as 19 | 31 | 42 | 52 | 58
    ] || 'ordinary'
  );
}
export interface OcaPlayer extends Participant {
  position: number;
  skippedTurns: number;
  withdrawn: boolean;
}
export interface OcaState {
  players: OcaPlayer[];
  currentTurnPlayerId: string;
  winner: string | null;
  isDraw: boolean;
  lastRoll: number | null;
  revision: number;
  rollCount: number;
  message: GameText;
  skipped: string[];
  lastMove: { playerId: string; from: number; landed: number; to: number; bounced: boolean } | null;
}
export type OcaAction = { type: 'ROLL' };
function advance(s: OcaState) {
  let index = s.players.findIndex((p) => p.id === s.currentTurnPlayerId);
  // Cada penalización es finita (máximo tres turnos), incluso si todos esperan.
  for (let visit = 0; visit < s.players.length * 4; visit++) {
    index = (index + 1) % s.players.length;
    const p = s.players[index];
    if (p.withdrawn) continue;
    if (p.skippedTurns > 0) {
      p.skippedTurns--;
      s.skipped.push(p.id);
      continue;
    }
    s.currentTurnPlayerId = p.id;
    return;
  }
}
export class OcaEngine implements IGameEngine<OcaState, OcaAction, OcaState> {
  constructor(private random: RandomSource = systemRandom) {}
  initGame(players: Participant[]): OcaState {
    const ps = participants(players, 2, 6);
    return {
      players: ps.map((p) => ({ ...p, position: 0, skippedTurns: 0, withdrawn: false })),
      currentTurnPlayerId: ps[0].id,
      winner: null,
      isDraw: false,
      lastRoll: null,
      revision: 0,
      rollCount: 0,
      skipped: [],
      lastMove: null,
      message: msg('Tira el dado y busca el jardín de la casilla 63.'),
    };
  }
  validateAction(s: OcaState, id: string, a: OcaAction): boolean {
    return (
      !!a &&
      typeof a === 'object' &&
      !Array.isArray(a) &&
      a.type === 'ROLL' &&
      !s.winner &&
      !s.isDraw &&
      s.currentTurnPlayerId === id &&
      s.players.some((p) => p.id === id && !p.withdrawn && p.skippedTurns === 0)
    );
  }
  applyAction(state: OcaState, id: string, a: OcaAction): OcaState {
    if (!this.validateAction(state, id, a)) return state;
    const s = structuredClone(state),
      p = s.players.find((p) => p.id === id)!,
      from = p.position;
    s.revision++;
    s.rollCount++;
    s.skipped = [];
    s.lastRoll = die(this.random);
    const sum = from + s.lastRoll,
      bounced = sum > 63,
      landed = bounced ? 126 - sum : sum;
    let to = landed,
      repeat = false;
    const kind = ocaSquareKind(landed);
    s.message = msg('Dado: {0}. Llegas a la casilla {1}.', s.lastRoll, landed);
    if (kind === 'goose') {
      to = bounced
        ? ([...OCA_GEESE].reverse().find((n) => n < landed) ?? 0)
        : (OCA_GEESE.find((n) => n > landed) ?? 63);
      repeat = true;
      s.message =
        to === 63
          ? msg('La oca 59 te lleva al jardín, pero debes tirar y retroceder: aún no has ganado.')
          : msg('De oca a oca: casilla {0} y otra tirada.', to);
    } else if (kind === 'bridge' || kind === 'dice') {
      to = kind === 'bridge' ? (landed === 6 ? 12 : 6) : landed === 26 ? 53 : 26;
      repeat = true;
      s.message = msg('Salto a la casilla {0}. Vuelves a tirar.', to);
    } else if (kind === 'inn' || kind === 'prison' || kind === 'well') {
      p.skippedTurns = kind === 'inn' ? 1 : kind === 'prison' ? 2 : 3;
      if (kind === 'well')
        for (const other of s.players)
          if (other.id !== id && !other.withdrawn && other.position === 31) other.skippedTurns = 0;
      s.message = msg('Casilla {0}: esperas {1} turnos.', landed, p.skippedTurns);
    } else if (kind === 'maze') {
      to = 30;
      s.message = msg('El laberinto te devuelve a la casilla 30.');
    } else if (kind === 'skull') {
      to = 0;
      s.message = msg('La calavera te devuelve a la salida.');
    }
    p.position = to;
    s.lastMove = { playerId: id, from, landed, to, bounced };
    if (landed === 63) {
      s.winner = id;
      s.message = msg('¡Has llegado al jardín de la Oca!');
      return s;
    }
    if (!repeat) advance(s);
    return s;
  }
  getSanitizedState(s: OcaState, _id: string): OcaState {
    return structuredClone(s);
  }
  checkWinner(s: OcaState) {
    return s.winner;
  }
  getBotAction(s: OcaState, id: string): OcaAction | null {
    const a = { type: 'ROLL' } as const;
    return this.validateAction(s, id, a) ? a : null;
  }
  forfeitPlayer(state: OcaState, id: string): OcaState {
    if (state.winner || state.isDraw || !state.players.some((p) => p.id === id && !p.withdrawn))
      return state;
    const s = structuredClone(state),
      p = s.players.find((p) => p.id === id)!;
    p.withdrawn = true;
    p.skippedTurns = 0;
    s.revision++;
    s.skipped = [];
    const active = s.players.filter((p) => !p.withdrawn);
    if (active.length === 1) s.winner = active[0].id;
    else if (s.currentTurnPlayerId === id) advance(s);
    return s;
  }
}
