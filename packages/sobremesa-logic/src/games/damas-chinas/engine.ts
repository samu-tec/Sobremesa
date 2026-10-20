import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  integer,
  systemRandom,
  type Participant,
  type RandomSource,
} from '../../engine/helpers.js';
import { message as msg, type GameText } from '../../messages.js';

export const CHINESE_COUNTS = [2, 3, 4, 6] as const;
export const CHINESE_HOLES = Array.from({ length: 17 }, (_, row) => row - 8).flatMap((r) =>
  Array.from({ length: 17 }, (_, column) => column - 8).flatMap((q) => {
    const s = -q - r;
    if (Math.abs(s) > 8 || [q, r, s].filter((v) => Math.abs(v) > 4).length > 1) return [];
    const arm = r < -4 ? 0 : q > 4 ? 1 : s < -4 ? 2 : r > 4 ? 3 : q < -4 ? 4 : s > 4 ? 5 : -1;
    return [{ q, r, arm }];
  }),
);
const lookup = new Map(CHINESE_HOLES.map((h, i) => [`${h.q},${h.r}`, i]));
const directions = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];
const seats: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
};
export interface ChinesePawn {
  owner: string;
  number: number;
}
export interface ChinesePlayer extends Participant {
  arm: number;
}
export interface ChineseState {
  players: ChinesePlayer[];
  board: (ChinesePawn | null)[];
  currentTurnPlayerId: string;
  eliminated: string[];
  passes: number;
  history: string[];
  lastPath: number[];
  revision: number;
  winner: string | null;
  isDraw: boolean;
  message: GameText;
}
export type ChinesePublicState = Omit<ChineseState, 'history'>;
export type ChineseAction = { type: 'MOVE'; path: number[] } | { type: 'PASS' };
const target = (s: ChinesePublicState, id: string) =>
  (s.players.find((p) => p.id === id)!.arm + 3) % 6;
const allowedDestination = (from: number, to: number, goal: number) =>
  CHINESE_HOLES[from].arm !== goal || CHINESE_HOLES[to].arm === goal;
const position = (s: ChineseState) =>
  `${s.currentTurnPlayerId}:${s.board.map((p) => p?.owner ?? '').join(',')}`;
function next(s: ChineseState) {
  let index = s.players.findIndex((p) => p.id === s.currentTurnPlayerId);
  do {
    index = (index + 1) % s.players.length;
  } while (s.eliminated.includes(s.players[index].id));
  s.currentTurnPlayerId = s.players[index].id;
}
/** Una ruta por destino; los saltos no retiran las fichas intermedias. */
export function chinesePaths(s: ChinesePublicState, id: string): number[][] {
  if (s.winner || s.isDraw || s.eliminated.includes(id) || !s.players.some((p) => p.id === id))
    return [];
  const paths: number[][] = [],
    goal = target(s, id);
  for (let from = 0; from < s.board.length; from++) {
    if (s.board[from]?.owner !== id) continue;
    const start = CHINESE_HOLES[from];
    for (const [dq, dr] of directions) {
      const to = lookup.get(`${start.q + dq},${start.r + dr}`);
      if (to !== undefined && !s.board[to] && allowedDestination(from, to, goal))
        paths.push([from, to]);
    }
    const routes = [[from]],
      seen = new Set([from]);
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i],
        at = route.at(-1)!,
        h = CHINESE_HOLES[at];
      for (const [dq, dr] of directions) {
        const over = lookup.get(`${h.q + dq},${h.r + dr}`),
          to = lookup.get(`${h.q + dq * 2},${h.r + dr * 2}`);
        if (
          over === undefined ||
          to === undefined ||
          over === from ||
          !s.board[over] ||
          (s.board[to] && to !== from) ||
          seen.has(to) ||
          !allowedDestination(at, to, goal)
        )
          continue;
        const path = [...route, to];
        seen.add(to);
        routes.push(path);
        paths.push(path);
      }
    }
  }
  return paths;
}
export class ChineseEngine implements IGameEngine<ChineseState, ChineseAction, ChinesePublicState> {
  constructor(private random: RandomSource = systemRandom) {}
  initGame(players: Participant[]): ChineseState {
    const ps = participants(players, 2, 6);
    if (!seats[ps.length]) throw new Error('Número de jugadores no válido.');
    const assigned = ps.map((p, i) => ({ ...p, arm: seats[ps.length][i] }));
    const s: ChineseState = {
      players: assigned,
      board: CHINESE_HOLES.map(() => null),
      currentTurnPlayerId: ps[0].id,
      eliminated: [],
      passes: 0,
      history: [],
      lastPath: [],
      revision: 0,
      winner: null,
      isDraw: false,
      message: msg(
        'Lleva tus diez fichas al triángulo opuesto. Puedes encadenar saltos sin capturar.',
      ),
    };
    for (const p of assigned) {
      let number = 0;
      CHINESE_HOLES.forEach((h, i) => {
        if (h.arm === p.arm) s.board[i] = { owner: p.id, number: ++number };
      });
    }
    s.history.push(position(s));
    return s;
  }
  validateAction(s: ChineseState, id: string, a: ChineseAction): boolean {
    if (
      !a ||
      typeof a !== 'object' ||
      Array.isArray(a) ||
      s.winner ||
      s.isDraw ||
      id !== s.currentTurnPlayerId ||
      !s.players.some((p) => p.id === id) ||
      s.eliminated.includes(id)
    )
      return false;
    if (a.type === 'PASS') return chinesePaths(s, id).length === 0;
    if (
      a.type !== 'MOVE' ||
      !Array.isArray(a.path) ||
      a.path.length < 2 ||
      a.path.length > 121 ||
      a.path.some((i) => !integer(i, 0, 120)) ||
      new Set(a.path).size !== a.path.length ||
      s.board[a.path[0]]?.owner !== id
    )
      return false;
    const board = [...s.board],
      goal = target(s, id),
      pawn = board[a.path[0]];
    for (let i = 1; i < a.path.length; i++) {
      const from = a.path[i - 1],
        to = a.path[i],
        f = CHINESE_HOLES[from],
        t = CHINESE_HOLES[to],
        dq = t.q - f.q,
        dr = t.r - f.r;
      if (board[to] || !allowedDestination(from, to, goal)) return false;
      const step = directions.some(([q, r]) => q === dq && r === dr),
        jump = directions.some(([q, r]) => q * 2 === dq && r * 2 === dr);
      if (step) {
        if (a.path.length !== 2) return false;
      } else if (jump) {
        const middle = lookup.get(`${f.q + dq / 2},${f.r + dr / 2}`);
        if (middle === undefined || !board[middle]) return false;
      } else return false;
      board[from] = null;
      board[to] = pawn;
    }
    return true;
  }
  applyAction(state: ChineseState, id: string, a: ChineseAction): ChineseState {
    if (!this.validateAction(state, id, a)) return state;
    const s = structuredClone(state);
    s.revision++;
    if (a.type === 'MOVE') {
      const from = a.path[0],
        to = a.path.at(-1)!;
      s.board[to] = s.board[from];
      s.board[from] = null;
      s.lastPath = [...a.path];
      s.passes = 0;
      const arrived = s.board.filter(
        (p, i) => p?.owner === id && CHINESE_HOLES[i].arm === target(s, id),
      ).length;
      if (arrived === 10) {
        s.winner = id;
        s.message = msg('¡Las diez fichas han llegado a su destino!');
        return s;
      }
      s.message = msg('Movimiento confirmado. Fichas en destino: {0}/10.', arrived);
    } else {
      s.passes++;
      s.lastPath = [];
      s.message = msg('Sin movimientos legales: pasa el turno.');
    }
    next(s);
    const key = position(s);
    s.history.push(key);
    if (
      s.passes >= s.players.length - s.eliminated.length ||
      s.history.filter((h) => h === key).length >= 3
    ) {
      s.isDraw = true;
      s.message = msg('Tablas: bloqueo de todos los participantes o triple repetición.');
    }
    return s;
  }
  getSanitizedState(s: ChineseState, _id: string): ChinesePublicState {
    const { history: _history, ...publicState } = structuredClone(s);
    return publicState;
  }
  checkWinner(s: ChineseState) {
    return s.winner;
  }
  forfeitPlayer(state: ChineseState, id: string): ChineseState {
    if (
      state.winner ||
      state.isDraw ||
      !state.players.some((p) => p.id === id) ||
      state.eliminated.includes(id)
    )
      return state;
    const s = structuredClone(state);
    s.eliminated.push(id);
    s.board = s.board.map((p) => (p?.owner === id ? null : p));
    s.revision++;
    s.passes = 0;
    const active = s.players.filter((p) => !s.eliminated.includes(p.id));
    if (active.length === 1) s.winner = active[0].id;
    else if (s.currentTurnPlayerId === id) next(s);
    s.history = [position(s)];
    return s;
  }
  getBotAction(s: ChineseState, id: string): ChineseAction | null {
    if (s.winner || s.isDraw || id !== s.currentTurnPlayerId || s.eliminated.includes(id))
      return null;
    const paths = chinesePaths(s, id);
    if (!paths.length) return { type: 'PASS' };
    const goal = target(s, id),
      holes = CHINESE_HOLES.filter((h) => h.arm === goal),
      center = holes.reduce((tip, h) =>
        Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(h.q + h.r)) >
        Math.max(Math.abs(tip.q), Math.abs(tip.r), Math.abs(tip.q + tip.r))
          ? h
          : tip,
      );
    const distance = (i: number) => {
      const h = CHINESE_HOLES[i],
        q = h.q - center.q,
        r = h.r - center.r;
      return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
    };
    const repeats = new Map<string, number>();
    for (const entry of s.history) {
      const key = entry.slice(entry.indexOf(':') + 1);
      repeats.set(key, (repeats.get(key) ?? 0) + 1);
    }
    const scored = paths.map((path) => {
      const from = path[0],
        to = path.at(-1)!,
        board = [...s.board];
      board[to] = board[from];
      board[from] = null;
      const repeated = repeats.get(board.map((p) => p?.owner ?? '').join(',')) ?? 0;
      return {
        path,
        value:
          (distance(from) - distance(to)) * 10 +
          (CHINESE_HOLES[to].arm === goal && CHINESE_HOLES[from].arm !== goal ? 15 : 0) -
          repeated * 100 +
          this.random() * 2,
      };
    });
    scored.sort((a, b) => b.value - a.value);
    return { type: 'MOVE', path: scored[0].path };
  }
}
