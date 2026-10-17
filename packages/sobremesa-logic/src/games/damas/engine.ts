import { resolveGameSettings } from '../../settings.js';
import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  liveTurn,
  nextPlayer,
  forfeit,
  integer,
  type Match,
  type Participant,
} from '../../engine/helpers.js';
export interface Checker {
  owner: string;
  king: boolean;
}
export type DamasAction = { type: 'MOVE'; from: number; to: number };
export interface DamasState extends Match {
  board: (Checker | null)[];
  quietMoveLimit: number;
  forcedFrom: number | null;
  quietMoves: number;
  positions: Record<string, number>;
  lastMove: [number, number] | null;
}
export interface DamasPublicState extends DamasState {
  legalMoves: DamasAction[];
}
function options(s: DamasState, jumpsOnly = false): DamasAction[] {
  const jumps: DamasAction[] = [],
    steps: DamasAction[] = [],
    id = s.currentTurnPlayerId;
  for (let from = 0; from < 64; from++) {
    const p = s.board[from];
    if (!p || p.owner !== id || (s.forcedFrom !== null && s.forcedFrom !== from)) continue;
    const dirs = p.king ? [-1, 1] : [id === s.players[0].id ? -1 : 1];
    for (const dr of dirs)
      for (const dc of [-1, 1]) {
        const r = Math.floor(from / 8) + dr,
          c = (from % 8) + dc;
        if (!integer(r, 0, 7) || !integer(c, 0, 7)) continue;
        const at = r * 8 + c;
        if (!s.board[at] && s.forcedFrom === null) steps.push({ type: 'MOVE', from, to: at });
        const rr = r + dr,
          cc = c + dc;
        if (
          s.board[at] &&
          s.board[at]!.owner !== id &&
          integer(rr, 0, 7) &&
          integer(cc, 0, 7) &&
          !s.board[rr * 8 + cc]
        )
          jumps.push({ type: 'MOVE', from, to: rr * 8 + cc });
      }
  }
  return jumps.length || jumpsOnly || s.forcedFrom !== null ? jumps : steps;
}
const key = (s: DamasState) =>
  s.currentTurnPlayerId +
  ':' +
  s.board
    .map((p) => (p ? `${s.players.findIndex((v) => v.id === p.owner)}${p.king ? 'K' : 'm'}` : '.'))
    .join('');
export class DamasEngine implements IGameEngine<DamasState, DamasAction, DamasPublicState> {
  private options = resolveGameSettings('checkers');
  setRules(rules: Record<string, unknown>) {
    this.options = resolveGameSettings('checkers', rules);
  }
  initGame(players: Participant[]): DamasState {
    const s: DamasState = {
      quietMoveLimit: Number(this.options.quietMoveLimit),
      players: participants(players),
      currentTurnPlayerId: players[0].id,
      winner: null,
      isDraw: false,
      board: Array(64).fill(null),
      forcedFrom: null,
      quietMoves: 0,
      positions: {},
      lastMove: null,
    };
    for (let i = 0; i < 64; i++)
      if ((Math.floor(i / 8) + (i % 8)) % 2 && (i < 24 || i >= 40))
        s.board[i] = { owner: players[i < 24 ? 1 : 0].id, king: false };
    s.positions[key(s)] = 1;
    return s;
  }
  validateAction(s: DamasState, id: string, a: DamasAction) {
    return (
      !!a &&
      a.type === 'MOVE' &&
      liveTurn(s, id) &&
      options(s).some((m) => m.from === a.from && m.to === a.to)
    );
  }
  applyAction(s: DamasState, id: string, a: DamasAction): DamasState {
    if (!this.validateAction(s, id, a)) return s;
    const n = structuredClone(s),
      piece = n.board[a.from]!,
      capture = Math.abs((a.to % 8) - (a.from % 8)) === 2;
    n.board[a.from] = null;
    n.board[a.to] = piece;
    n.lastMove = [a.from, a.to];
    if (capture) n.board[(a.from + a.to) / 2] = null;
    const crowned = !piece.king && Math.floor(a.to / 8) === (id === n.players[0].id ? 0 : 7);
    if (crowned) piece.king = true;
    n.quietMoves = capture || !piece.king || crowned ? 0 : n.quietMoves + 1;
    n.forcedFrom = capture && !crowned ? a.to : null;
    if (n.forcedFrom !== null && options(n, true).length) return n;
    n.forcedFrom = null;
    n.currentTurnPlayerId = nextPlayer(n);
    if (!options(n).length) n.winner = id;
    const k = key(n);
    n.positions[k] = (n.positions[k] || 0) + 1;
    if (!n.winner && (n.positions[k] >= 3 || n.quietMoves >= n.quietMoveLimit)) n.isDraw = true;
    return n;
  }
  getSanitizedState(s: DamasState, _id: string): DamasPublicState {
    return { ...structuredClone(s), legalMoves: s.winner || s.isDraw ? [] : options(s) };
  }
  checkWinner(s: DamasState) {
    return s.winner;
  }
  getBotAction(s: DamasState, id: string): DamasAction | null {
    if (!liveTurn(s, id)) return null;
    let nodes = 0;
    const evaluate = (n: DamasState, depth: number): number => {
      if (n.winner) return n.winner === id ? 10000 + depth : -10000 - depth;
      if (n.isDraw) return 0;
      if (!depth || ++nodes > 1500)
        return n.board.reduce(
          (sum, p, i) =>
            sum +
            (p
              ? (p.owner === id ? 1 : -1) * (p.king ? 175 : 100) +
                (p.owner === id && i % 8 > 1 && i % 8 < 6 ? 3 : 0)
              : 0),
          0,
        );
      const vals = options(n).map((a) =>
        evaluate(this.applyAction(n, n.currentTurnPlayerId, a), depth - 1),
      );
      return n.currentTurnPlayerId === id ? Math.max(...vals) : Math.min(...vals);
    };
    return (
      options(s)
        .map((a) => ({ a, score: evaluate(this.applyAction(s, id, a), 2) + Math.random() }))
        .sort((a, b) => b.score - a.score)[0]?.a || null
    );
  }
  forfeitPlayer = forfeit<DamasState>;
}
