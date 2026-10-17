import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  liveTurn,
  nextPlayer,
  forfeit,
  die,
  type Match,
  type Participant,
} from '../../engine/helpers.js';
export type BackgammonAction = { type: 'ROLL' } | { type: 'MOVE'; from: number; die: number };
export interface BackgammonState extends Match {
  points: number[];
  lastMove: { from: number; to: number; side: number; id: number } | null;
  rollNumber: number;
  bar: number[];
  off: number[];
  dice: number[];
  lastDice: number[];
  phase: 'roll' | 'move';
  multiplier: number;
}
export interface BackgammonPublicState extends BackgammonState {
  legalMoves: { type: 'MOVE'; from: number; die: number; to: number }[];
}
type Move = { type: 'MOVE'; from: number; die: number; to: number };
function raw(s: BackgammonState): Move[] {
  const side = s.players.findIndex((p) => p.id === s.currentTurnPlayerId),
    sign = side === 0 ? 1 : -1,
    dir = -sign,
    out: Move[] = [];
  for (const d of new Set(s.dice))
    for (const from of s.bar[side] > 0
      ? [-1]
      : s.points.flatMap((v, i) => (v * sign > 0 ? [i] : []))) {
      const target = from === -1 ? (side === 0 ? 24 - d : d - 1) : from + dir * d;
      if (target >= 0 && target < 24) {
        if (s.points[target] * sign >= -1) out.push({ type: 'MOVE', from, die: d, to: target });
        continue;
      }
      const home = side === 0 ? [0, 5] : [18, 23];
      if (
        from < 0 ||
        s.bar[side] ||
        s.points.some((v, i) => v * sign > 0 && (i < home[0] || i > home[1]))
      )
        continue;
      const exact = side === 0 ? from + 1 === d : 24 - from === d;
      const behind = s.points.some((v, i) => v * sign > 0 && (side === 0 ? i > from : i < from));
      if (exact || !behind) out.push({ type: 'MOVE', from, die: d, to: 24 });
    }
  return out;
}
function advance(s: BackgammonState, a: Move): BackgammonState {
  const n = structuredClone(s),
    side = n.players.findIndex((p) => p.id === n.currentTurnPlayerId),
    sign = side === 0 ? 1 : -1;
  if (a.from === -1) n.bar[side]--;
  else n.points[a.from] -= sign;
  if (a.to === 24) n.off[side]++;
  else {
    if (n.points[a.to] === -sign) {
      n.points[a.to] = 0;
      n.bar[1 - side]++;
    }
    n.points[a.to] += sign;
  }
  n.lastMove = { from: a.from, to: a.to, side, id: (s.lastMove?.id || 0) + 1 };
  n.dice.splice(n.dice.indexOf(a.die), 1);
  return n;
}
function legal(s: BackgammonState): Move[] {
  if (s.phase !== 'move' || s.winner || s.isDraw) return [];
  const memo = new Map<string, number>();
  const count = (n: BackgammonState): number => {
    const key = n.points.join(',') + ';' + n.bar.join(',') + ';' + n.dice.join(',');
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    const opts = raw(n);
    const value = opts.length ? 1 + Math.max(...opts.map((a) => count(advance(n, a)))) : 0;
    memo.set(key, value);
    return value;
  };
  const ranked = raw(s).map((a) => ({ a, n: 1 + count(advance(s, a)) }));
  const max = Math.max(0, ...ranked.map((v) => v.n));
  let best = ranked.filter((v) => v.n === max).map((v) => v.a);
  if (max === 1 && s.dice.length === 2 && s.dice[0] !== s.dice[1]) {
    const high = Math.max(...best.map((a) => a.die));
    best = best.filter((a) => a.die === high);
  }
  return best;
}
export class BackgammonEngine implements IGameEngine<
  BackgammonState,
  BackgammonAction,
  BackgammonPublicState
> {
  initGame(players: Participant[]): BackgammonState {
    const ps = participants(players),
      points = Array(24).fill(0);
    points[23] = 2;
    points[12] = 5;
    points[7] = 3;
    points[5] = 5;
    points[0] = -2;
    points[11] = -5;
    points[16] = -3;
    points[18] = -5;
    let a = die(),
      b = die();
    while (a === b) b = die();
    return {
      players: ps,
      currentTurnPlayerId: ps[a > b ? 0 : 1].id,
      winner: null,
      isDraw: false,
      points,
      lastMove: null,
      rollNumber: 1,
      bar: [0, 0],
      off: [0, 0],
      dice: [a, b],
      lastDice: [a, b],
      phase: 'move',
      multiplier: 1,
    };
  }
  validateAction(s: BackgammonState, id: string, a: BackgammonAction): boolean {
    return (
      !!a &&
      liveTurn(s, id) &&
      (a.type === 'ROLL'
        ? s.phase === 'roll'
        : a.type === 'MOVE' && legal(s).some((m) => m.from === a.from && m.die === a.die))
    );
  }
  applyAction(s: BackgammonState, id: string, a: BackgammonAction): BackgammonState {
    if (!this.validateAction(s, id, a)) return s;
    let n = structuredClone(s);
    if (a.type === 'ROLL') {
      const d1 = die(),
        d2 = die();
      n.rollNumber++;
      n.lastDice = [d1, d2];
      n.dice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
      n.phase = 'move';
    } else
      n = advance(
        n,
        legal(n).find((m) => m.from === a.from && m.die === a.die)!,
      );
    const side = n.players.findIndex((p) => p.id === id);
    if (n.off[side] === 15) {
      n.winner = id;
      const rival = 1 - side;
      const home = side === 0 ? [0, 5] : [18, 23];
      n.multiplier =
        n.off[rival] > 0
          ? 1
          : n.bar[rival] > 0 ||
              n.points.some((v, i) => i >= home[0] && i <= home[1] && v * (side === 0 ? 1 : -1) < 0)
            ? 3
            : 2;
      return n;
    }
    if (!n.dice.length || !raw(n).length) {
      n.dice = [];
      n.phase = 'roll';
      n.currentTurnPlayerId = nextPlayer(n);
    }
    return n;
  }
  getSanitizedState(s: BackgammonState, _id: string): BackgammonPublicState {
    return { ...structuredClone(s), legalMoves: legal(s) };
  }
  checkWinner(s: BackgammonState) {
    return s.winner;
  }
  getBotAction(s: BackgammonState, id: string): BackgammonAction | null {
    if (!liveTurn(s, id)) return null;
    if (s.phase === 'roll') return { type: 'ROLL' };
    const side = s.players.findIndex((p) => p.id === id),
      sign = side === 0 ? 1 : -1;
    return (
      legal(s)
        .map((a) => {
          const n = advance(s, a);
          return {
            a,
            score:
              n.off[side] * 20 +
              n.bar[1 - side] * 7 +
              n.points.reduce(
                (v, p, i) =>
                  v +
                  (p * sign === 1 ? -2 : p * sign >= 2 ? 3 : 0) +
                  (p * sign > 0 ? (side === 0 ? 23 - i : i) * 0.1 : 0),
                0,
              ) +
              Math.random() * 0.2,
          };
        })
        .sort((a, b) => b.score - a.score)[0]?.a || null
    );
  }
  forfeitPlayer = forfeit<BackgammonState>;
}
