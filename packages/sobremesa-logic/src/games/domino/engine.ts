import { resolveGameSettings } from '../../settings.js';
import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  liveTurn,
  nextPlayer,
  shuffle,
  finishScores,
  type Match,
  type Participant,
} from '../../engine/helpers.js';
export interface Domino {
  id: number;
  a: number;
  b: number;
}
interface DominoPlayer extends Participant {
  hand: Domino[];
  score: number;
}
export type DominoAction =
  { type: 'PLAY'; tile: number; end: 'left' | 'right' } | { type: 'DRAW' | 'PASS' | 'NEXT_ROUND' };
export interface DominoState extends Match {
  players: DominoPlayer[];
  targetScore: number;
  maxRounds: number;
  startingTiles: number;
  stock: Domino[];
  chain: Domino[];
  passes: number;
  round: number;
  phase: 'play' | 'round_end';
  roundWinner: string | null;
  openingTile: number | null;
}
export interface DominoPublicState extends Omit<DominoState, 'players' | 'stock'> {
  players: (Participant & { handCount: number; score: number })[];
  hand: Domino[];
  stockCount: number;
  legalActions: DominoAction[];
}
const pips = (hand: Domino[]) => hand.reduce((n, t) => n + t.a + t.b, 0);
function deal(s: DominoState): DominoState {
  const tiles = shuffle(
    Array.from({ length: 7 }, (_, a) =>
      Array.from({ length: 7 - a }, (_, b) => ({ id: a * 7 + a + b, a, b: a + b })),
    ).flat(),
  );
  for (const p of s.players) p.hand = tiles.splice(0, s.startingTiles);
  const opening = s.players
    .flatMap((p) => p.hand.map((t) => ({ p, t })))
    .sort(
      (a, b) =>
        (b.t.a === b.t.b ? 100 : 0) + b.t.a + b.t.b - ((a.t.a === a.t.b ? 100 : 0) + a.t.a + a.t.b),
    )[0];
  s.stock = tiles;
  s.chain = [];
  s.passes = 0;
  s.phase = 'play';
  s.roundWinner = null;
  s.openingTile = opening.t.id;
  s.currentTurnPlayerId = opening.p.id;
  return s;
}
function actions(s: DominoState, id: string): DominoAction[] {
  if (!liveTurn(s, id)) return [];
  if (s.phase === 'round_end') return [{ type: 'NEXT_ROUND' }];
  const hand = s.players.find((p) => p.id === id)!.hand;
  const plays: DominoAction[] = hand.flatMap((t) => {
    if (!s.chain.length)
      return t.id === s.openingTile
        ? [{ type: 'PLAY' as const, tile: t.id, end: 'right' as const }]
        : [];
    return (['left', 'right'] as const)
      .filter((end) => {
        const v = end === 'left' ? s.chain[0].a : s.chain.at(-1)!.b;
        return t.a === v || t.b === v;
      })
      .map((end) => ({ type: 'PLAY' as const, tile: t.id, end }));
  });
  return plays.length ? plays : [{ type: s.stock.length ? 'DRAW' : 'PASS' }];
}
export class DominoEngine implements IGameEngine<DominoState, DominoAction, DominoPublicState> {
  private options = resolveGameSettings('dominoes');
  setRules(rules: Record<string, unknown>) {
    this.options = resolveGameSettings('dominoes', rules);
  }
  initGame(players: Participant[]): DominoState {
    return deal({
      targetScore: Number(this.options.targetScore),
      maxRounds: Number(this.options.maxRounds),
      startingTiles: Number(this.options.startingTiles),
      players: participants(players, 2, 4).map((p) => ({ ...p, hand: [], score: 0 })),
      currentTurnPlayerId: players[0].id,
      winner: null,
      isDraw: false,
      stock: [],
      chain: [],
      passes: 0,
      round: 1,
      phase: 'play',
      roundWinner: null,
      openingTile: null,
    });
  }
  validateAction(s: DominoState, id: string, a: DominoAction) {
    if (!a || typeof a !== 'object' || Array.isArray(a)) return false;
    return (
      !!a &&
      actions(s, id).some(
        (v) =>
          v.type === a.type &&
          (v.type !== 'PLAY' || (a.type === 'PLAY' && v.tile === a.tile && v.end === a.end)),
      )
    );
  }
  applyAction(s: DominoState, id: string, a: DominoAction): DominoState {
    if (!this.validateAction(s, id, a)) return s;
    const n = structuredClone(s),
      p = n.players.find((p) => p.id === id)!;
    if (a.type === 'NEXT_ROUND') {
      n.round++;
      return deal(n);
    }
    if (a.type === 'DRAW') {
      p.hand.push(n.stock.pop()!);
      return n;
    }
    if (a.type === 'PLAY') {
      const i = p.hand.findIndex((t) => t.id === a.tile),
        tile = p.hand.splice(i, 1)[0];
      if (!n.chain.length) n.chain.push(tile);
      else if (a.end === 'left') {
        if (tile.b !== n.chain[0].a) [tile.a, tile.b] = [tile.b, tile.a];
        n.chain.unshift(tile);
      } else {
        if (tile.a !== n.chain.at(-1)!.b) [tile.a, tile.b] = [tile.b, tile.a];
        n.chain.push(tile);
      }
      n.passes = 0;
    } else n.passes++;
    if (!p.hand.length || n.passes === n.players.length) {
      const min = Math.min(...n.players.map((p) => pips(p.hand))),
        winners = n.players.filter((p) => pips(p.hand) === min);
      if (winners.length === 1) {
        n.roundWinner = winners[0].id;
        winners[0].score += n.players.reduce((sum, p) => sum + pips(p.hand) - min, 0);
      }
      n.phase = 'round_end';
      if (n.round >= n.maxRounds || n.players.some((p) => p.score >= n.targetScore))
        return finishScores(
          n,
          n.players.map((p) => p.score),
        );
    }
    n.currentTurnPlayerId = nextPlayer(n);
    return n;
  }
  getSanitizedState(s: DominoState, id: string): DominoPublicState {
    return {
      players: s.players.map(({ hand, ...p }) => ({ ...p, handCount: hand.length })),
      hand: structuredClone(s.players.find((p) => p.id === id)?.hand || []),
      stockCount: s.stock.length,
      targetScore: s.targetScore,
      maxRounds: s.maxRounds,
      startingTiles: s.startingTiles,
      chain: structuredClone(s.chain),
      passes: s.passes,
      round: s.round,
      phase: s.phase,
      roundWinner: s.roundWinner,
      openingTile: s.openingTile,
      currentTurnPlayerId: s.currentTurnPlayerId,
      winner: s.winner,
      isDraw: s.isDraw,
      legalActions: actions(s, id),
    };
  }
  checkWinner(s: DominoState) {
    return s.winner;
  }
  getBotAction(s: DominoState, id: string): DominoAction | null {
    const opts = actions(s, id),
      hand = s.players.find((p) => p.id === id)?.hand || [];
    return (
      opts.sort(
        (a, b) =>
          (b.type === 'PLAY' ? pips(hand.filter((t) => t.id === b.tile)) : 0) -
          (a.type === 'PLAY' ? pips(hand.filter((t) => t.id === a.tile)) : 0),
      )[0] || null
    );
  }
  forfeitPlayer(s: DominoState, id: string): DominoState {
    if (s.winner || s.isDraw || !s.players.some((p) => p.id === id)) return s;
    const n = structuredClone(s);
    const next = nextPlayer(n);
    const p = n.players.find((p) => p.id === id)!;
    n.stock.push(...p.hand);
    n.players = n.players.filter((p) => p.id !== id);
    n.passes = 0;
    if (n.players.length === 1) n.winner = n.players[0].id;
    else if (n.currentTurnPlayerId === id) n.currentTurnPlayerId = next;
    if (!n.chain.length && n.phase === 'play' && !n.winner) return deal(n);
    return n;
  }
}
