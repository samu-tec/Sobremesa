import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  integer,
  systemRandom,
  type Participant,
  type RandomSource,
} from '../../engine/helpers.js';
import { resolveGameSettings } from '../../settings.js';
import { message as msg, type GameText } from '../../messages.js';
export type GoStone = 0 | 1 | 2;
export interface GoScore {
  black: number;
  white: number;
  blackTerritory: number;
  whiteTerritory: number;
  neutral: number;
}
export interface GoState {
  players: Participant[];
  size: number;
  board: GoStone[];
  currentTurnPlayerId: string;
  phase: 'play' | 'score' | 'finished';
  resumePlayerId: string;
  lastMove: number | null;
  passes: number;
  captured: [number, number];
  dead: number[];
  accepted: string[];
  history: string[];
  revision: number;
  winner: string | null;
  isDraw: boolean;
  score: GoScore | null;
  message: GameText;
}
export interface GoPublicState extends Omit<GoState, 'history'> {
  legalMoves: number[];
}
export type GoAction =
  | { type: 'PLACE'; index: number }
  | { type: 'PASS' }
  | { type: 'MARK_DEAD'; index: number }
  | { type: 'ACCEPT_SCORE' }
  | { type: 'RESUME' }
  | { type: 'RESIGN' };
const neighbors = (index: number, size: number) =>
  [
    index >= size ? index - size : -1,
    index < size * (size - 1) ? index + size : -1,
    index % size ? index - 1 : -1,
    index % size < size - 1 ? index + 1 : -1,
  ].filter((n) => n >= 0);
function group(board: GoStone[], index: number, size: number) {
  const stones = new Set<number>([index]),
    liberties = new Set<number>(),
    queue = [index],
    color = board[index];
  for (let i = 0; i < queue.length; i++)
    for (const n of neighbors(queue[i], size)) {
      if (board[n] === 0) liberties.add(n);
      else if (board[n] === color && !stones.has(n)) {
        stones.add(n);
        queue.push(n);
      }
    }
  return { stones: [...stones], liberties };
}
const hash = (board: GoStone[]) => board.join('');
function placement(s: GoState, index: number) {
  if (!integer(index, 0, s.board.length - 1) || s.board[index] !== 0) return null;
  const color = (s.players[0].id === s.currentTurnPlayerId ? 1 : 2) as 1 | 2,
    other = color === 1 ? 2 : 1,
    board = [...s.board];
  board[index] = color;
  let captured = 0;
  for (const n of neighbors(index, s.size))
    if (board[n] === other) {
      const g = group(board, n, s.size);
      if (!g.liberties.size) {
        for (const stone of g.stones) board[stone] = 0;
        captured += g.stones.length;
      }
    }
  if (!group(board, index, s.size).liberties.size || s.history.includes(hash(board))) return null;
  return { board, captured, color };
}
export function goAreaScore(board: GoStone[], size: number, dead: readonly number[] = []): GoScore {
  const cleaned = [...board];
  for (const index of dead) cleaned[index] = 0;
  const score: GoScore = {
    black: cleaned.filter((s) => s === 1).length,
    white: cleaned.filter((s) => s === 2).length + 7.5,
    blackTerritory: 0,
    whiteTerritory: 0,
    neutral: 0,
  };
  const seen = new Set<number>();
  for (let start = 0; start < cleaned.length; start++)
    if (cleaned[start] === 0 && !seen.has(start)) {
      const empty = [start],
        border = new Set<number>();
      seen.add(start);
      for (let i = 0; i < empty.length; i++)
        for (const n of neighbors(empty[i], size)) {
          if (cleaned[n]) border.add(cleaned[n]);
          else if (!seen.has(n)) {
            seen.add(n);
            empty.push(n);
          }
        }
      if (border.size === 1 && border.has(1)) {
        score.blackTerritory += empty.length;
        score.black += empty.length;
      } else if (border.size === 1 && border.has(2)) {
        score.whiteTerritory += empty.length;
        score.white += empty.length;
      } else score.neutral += empty.length;
    }
  return score;
}
export class GoEngine implements IGameEngine<GoState, GoAction, GoPublicState> {
  private options = resolveGameSettings('go');
  constructor(private random: RandomSource = systemRandom) {}
  setRules(rules: Record<string, unknown>) {
    this.options = resolveGameSettings('go', rules);
  }
  initGame(players: Participant[]): GoState {
    const ps = participants(players),
      size = Number(this.options.boardSize),
      board: GoStone[] = Array(size * size).fill(0);
    return {
      players: ps,
      size,
      board,
      currentTurnPlayerId: ps[0].id,
      phase: 'play',
      resumePlayerId: ps[0].id,
      lastMove: null,
      passes: 0,
      captured: [0, 0],
      dead: [],
      accepted: [],
      history: [hash(board)],
      revision: 0,
      winner: null,
      isDraw: false,
      score: null,
      message: msg('Las negras empiezan. Coloca una piedra en una intersección libre.'),
    };
  }
  validateAction(s: GoState, id: string, a: GoAction): boolean {
    if (
      !a ||
      typeof a !== 'object' ||
      Array.isArray(a) ||
      s.winner ||
      s.isDraw ||
      !s.players.some((p) => p.id === id)
    )
      return false;
    if (a.type === 'RESIGN') return true;
    if (id !== s.currentTurnPlayerId) return false;
    if (s.phase === 'play')
      return a.type === 'PASS' || (a.type === 'PLACE' && !!placement(s, a.index));
    return (
      s.phase === 'score' &&
      (a.type === 'ACCEPT_SCORE' ||
        a.type === 'RESUME' ||
        (a.type === 'MARK_DEAD' &&
          integer(a.index, 0, s.board.length - 1) &&
          s.board[a.index] !== 0))
    );
  }
  applyAction(state: GoState, id: string, a: GoAction): GoState {
    if (!this.validateAction(state, id, a)) return state;
    if (a.type === 'RESIGN') return this.forfeitPlayer(state, id);
    const s = structuredClone(state),
      other = s.players.find((p) => p.id !== id)!.id;
    s.revision++;
    if (a.type === 'PLACE') {
      const move = placement(s, a.index)!;
      s.board = move.board;
      s.lastMove = a.index;
      s.history.push(hash(s.board));
      s.captured[move.color - 1] += move.captured;
      s.passes = 0;
      s.currentTurnPlayerId = other;
      s.message = msg('Piedra colocada. Capturas en esta jugada: {0}.', move.captured);
    } else if (a.type === 'PASS') {
      s.passes++;
      s.currentTurnPlayerId = other;
      s.message = msg('Se ha pasado el turno.');
      if (s.passes === 2) {
        s.phase = 'score';
        s.resumePlayerId = other;
        s.dead = [];
        s.accepted = [];
        s.score = goAreaScore(s.board, s.size);
        s.message = msg(
          'Dos pases: marcad grupos muertos y confirmad la puntuación, o reanudad el juego.',
        );
      }
    } else if (a.type === 'MARK_DEAD') {
      const stones = group(s.board, a.index, s.size).stones,
        remove = s.dead.includes(a.index);
      s.dead = remove
        ? s.dead.filter((i) => !stones.includes(i))
        : [...new Set([...s.dead, ...stones])];
      s.accepted = [];
      s.score = goAreaScore(s.board, s.size, s.dead);
      s.message = msg('Propuesta actualizada. Ambas personas deben confirmar de nuevo.');
    } else if (a.type === 'RESUME') {
      s.phase = 'play';
      s.currentTurnPlayerId = s.resumePlayerId;
      s.passes = 0;
      s.dead = [];
      s.accepted = [];
      s.score = null;
      s.message = msg(
        'Se reanuda el juego sin retirar las piedras propuestas. Resolved las dudas jugando.',
      );
    } else if (a.type === 'ACCEPT_SCORE') {
      s.accepted.push(id);
      s.currentTurnPlayerId = other;
      if (s.accepted.length === 2) {
        s.phase = 'finished';
        s.score = goAreaScore(s.board, s.size, s.dead);
        s.winner = s.players[s.score.black > s.score.white ? 0 : 1].id;
        s.message = msg(
          'Puntuación acordada. Negras: {0}. Blancas con komi: {1}.',
          s.score.black,
          s.score.white,
        );
      } else
        s.message = msg(
          'Falta la confirmación de la otra persona. Puede cambiar la propuesta o reanudar.',
        );
    }
    return s;
  }
  getSanitizedState(s: GoState, _id: string): GoPublicState {
    const { history: _history, ...visible } = structuredClone(s);
    return {
      ...visible,
      legalMoves:
        s.phase === 'play' && !s.winner
          ? s.board.flatMap((stone, index) => (stone === 0 && placement(s, index) ? [index] : []))
          : [],
    };
  }
  checkWinner(s: GoState) {
    return s.winner;
  }
  forfeitPlayer(s: GoState, id: string): GoState {
    if (s.winner || s.isDraw || !s.players.some((p) => p.id === id)) return s;
    return {
      ...structuredClone(s),
      revision: s.revision + 1,
      phase: 'finished',
      winner: s.players.find((p) => p.id !== id)!.id,
    };
  }
  getBotAction(s: GoState, id: string): GoAction | null {
    if (s.winner || s.isDraw || id !== s.currentTurnPlayerId) return null;
    if (s.phase === 'score') return { type: 'ACCEPT_SCORE' };
    const color = s.players[0].id === id ? 1 : 2;
    // Evita llenar ojos propios; el historial y las posiciones son información pública.
    const candidates = s.board.flatMap((stone, index) => {
      if (stone) return [];
      const ns = neighbors(index, s.size);
      if (ns.every((n) => s.board[n] === color)) return [];
      const move = placement(s, index);
      if (!move) return [];
      return [
        {
          index,
          value:
            move.captured * 100 + this.random() * 4 + ns.filter((n) => s.board[n] === 0).length,
        },
      ];
    });
    candidates.sort((a, b) => b.value - a.value);
    return candidates.length ? { type: 'PLACE', index: candidates[0].index } : { type: 'PASS' };
  }
}
