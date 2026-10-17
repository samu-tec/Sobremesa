import { resolveGameSettings } from '../../settings.js';
import { Chess, type Square } from 'chess.js';
import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  liveTurn,
  forfeit,
  type Match,
  type Participant,
} from '../../engine/helpers.js';
export type AjedrezAction =
  | { type: 'MOVE'; from: string; to: string; promotion?: string }
  | { type: 'OFFER_DRAW' | 'ACCEPT_DRAW' | 'RESIGN' | 'CLAIM_DRAW' };
export interface AjedrezState extends Match {
  fen: string;
  automaticDraws: boolean;
  lastMove: { from: string; to: string; rookFrom?: string; rookTo?: string } | null;
  history: string[];
  positions: Record<string, number>;
  drawOffer: string | null;
}
export interface AjedrezPublicState extends AjedrezState {
  board: ({ square: string; type: string; color: string } | null)[];
  legalMoves: { from: string; to: string; promotion?: string }[];
  inCheck: boolean;
  canClaimDraw: boolean;
}
const positionKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ');
export class AjedrezEngine implements IGameEngine<AjedrezState, AjedrezAction, AjedrezPublicState> {
  private options = resolveGameSettings('chess');
  setRules(rules: Record<string, unknown>) {
    this.options = resolveGameSettings('chess', rules);
  }
  initGame(players: Participant[]): AjedrezState {
    return {
      players: participants(players),
      currentTurnPlayerId: players[0].id,
      winner: null,
      isDraw: false,
      fen: new Chess().fen(),
      history: [],
      automaticDraws: Boolean(this.options.automaticDraws),
      lastMove: null,
      positions: { [positionKey(new Chess().fen())]: 1 },
      drawOffer: null,
    };
  }
  validateAction(s: AjedrezState, id: string, a: AjedrezAction): boolean {
    if (!a || typeof a !== 'object' || Array.isArray(a)) return false;
    if (!a || s.winner || s.isDraw || !s.players.some((p) => p.id === id)) return false;
    if (a.type === 'RESIGN') return true;
    if (a.type === 'ACCEPT_DRAW') return !!s.drawOffer && s.drawOffer !== id;
    if (!liveTurn(s, id)) return false;
    if (a.type === 'CLAIM_DRAW')
      return (s.positions[positionKey(s.fen)] || 0) >= 3 || Number(s.fen.split(' ')[4]) >= 100;
    if (a.type === 'OFFER_DRAW') return s.drawOffer === null;
    if (a.type !== 'MOVE' || typeof a.from !== 'string' || typeof a.to !== 'string') return false;
    return new Chess(s.fen)
      .moves({ verbose: true })
      .some(
        (m) =>
          m.from === a.from &&
          m.to === a.to &&
          (m.promotion || undefined) === (a.promotion || undefined),
      );
  }
  applyAction(s: AjedrezState, id: string, a: AjedrezAction): AjedrezState {
    if (!this.validateAction(s, id, a)) return s;
    if (a.type === 'RESIGN') return this.forfeitPlayer(s, id);
    const n = structuredClone(s);
    if (a.type === 'OFFER_DRAW') {
      n.drawOffer = id;
      return n;
    }
    if (a.type === 'ACCEPT_DRAW' || a.type === 'CLAIM_DRAW') {
      n.isDraw = true;
      return n;
    }
    if (a.type !== 'MOVE') return s;
    const chess = new Chess(s.fen),
      move = chess.move({ from: a.from as Square, to: a.to as Square, promotion: a.promotion });
    n.lastMove = {
      from: move.from,
      to: move.to,
      ...(move.isKingsideCastle()
        ? { rookFrom: move.color === 'w' ? 'h1' : 'h8', rookTo: move.color === 'w' ? 'f1' : 'f8' }
        : move.isQueensideCastle()
          ? { rookFrom: move.color === 'w' ? 'a1' : 'a8', rookTo: move.color === 'w' ? 'd1' : 'd8' }
          : {}),
    };
    n.fen = chess.fen();
    n.history.push(move.san);
    const key = positionKey(n.fen);
    n.positions[key] = (n.positions[key] || 0) + 1;
    // An offer remains available to the opponent until their next move.
    if (n.drawOffer !== id) n.drawOffer = null;
    n.currentTurnPlayerId = n.players[chess.turn() === 'w' ? 0 : 1].id;
    if (chess.isCheckmate()) n.winner = id;
    else if (
      chess.isStalemate() ||
      chess.isInsufficientMaterial() ||
      n.positions[key] >= 5 ||
      Number(n.fen.split(' ')[4]) >= 150 ||
      (n.automaticDraws && (chess.isDraw() || n.positions[key] >= 3))
    )
      n.isDraw = true;
    return n;
  }
  getSanitizedState(s: AjedrezState, _id: string): AjedrezPublicState {
    const chess = new Chess(s.fen);
    return {
      ...structuredClone(s),
      board: chess
        .board()
        .flat()
        .map((p) => (p ? { square: p.square, type: p.type, color: p.color } : null)),
      legalMoves:
        s.winner || s.isDraw
          ? []
          : chess.moves({ verbose: true }).map((m) => ({
              from: m.from,
              to: m.to,
              ...(m.promotion ? { promotion: m.promotion } : {}),
            })),
      inCheck: chess.isCheck(),
      canClaimDraw:
        !s.winner &&
        !s.isDraw &&
        ((s.positions[positionKey(s.fen)] || 0) >= 3 || Number(s.fen.split(' ')[4]) >= 100),
    };
  }
  checkWinner(s: AjedrezState) {
    return s.winner;
  }
  getBotAction(s: AjedrezState, id: string): AjedrezAction | null {
    if (!liveTurn(s, id)) return null;
    const c = new Chess(s.fen),
      weights: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 },
      side = c.turn();
    const evaluate = () =>
      c.isCheckmate()
        ? c.turn() === side
          ? -100000
          : 100000
        : c.isDraw()
          ? 0
          : c
              .board()
              .flat()
              .reduce(
                (sum, p) =>
                  sum +
                  (p
                    ? (p.color === side ? 1 : -1) *
                      (weights[p.type] +
                        (p.type === 'p'
                          ? (p.color === 'w' ? 8 - Number(p.square[1]) : Number(p.square[1]) - 1) *
                            -2
                          : 0))
                    : 0),
                0,
              );
    let best = -Infinity;
    let choice: AjedrezAction | null = null;
    for (const m of shuffleMoves(c.moves({ verbose: true }))) {
      c.move(m);
      let value = evaluate();
      if (!c.isGameOver()) {
        let worst = Infinity;
        for (const reply of c.moves({ verbose: true })) {
          c.move(reply);
          worst = Math.min(worst, evaluate());
          c.undo();
          // This move cannot beat the incumbent, including ties (first wins).
          // Remaining replies can only lower its score, so the choice is unchanged.
          if (worst <= best) break;
        }
        value = worst;
      }
      c.undo();
      if (value > best) {
        best = value;
        choice = {
          type: 'MOVE',
          from: m.from,
          to: m.to,
          ...(m.promotion ? { promotion: m.promotion } : {}),
        };
      }
    }
    return choice;
  }
  forfeitPlayer = forfeit<AjedrezState>;
}
function shuffleMoves<T>(moves: T[]): T[] {
  return moves
    .map((m) => ({ m, n: Math.random() }))
    .sort((a, b) => a.n - b.n)
    .map((v) => v.m);
}
