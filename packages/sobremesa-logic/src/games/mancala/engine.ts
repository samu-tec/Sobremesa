import { resolveGameSettings } from '../../settings.js';
import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  liveTurn,
  nextPlayer,
  forfeit,
  integer,
  finishScores,
  type Match,
  type Participant,
} from '../../engine/helpers.js';
export type MancalaAction = { type: 'SOW'; pit: number };
export interface MancalaState extends Match {
  pits: number[];
  seedsPerPit: number;
  lastSow: { from: number; path: number[]; id: number } | null;
  lastPit: number | null;
  captured: number;
  extraTurn: boolean;
}
export class MancalaEngine implements IGameEngine<MancalaState, MancalaAction, MancalaState> {
  private options = resolveGameSettings('mancala');
  setRules(rules: Record<string, unknown>) {
    this.options = resolveGameSettings('mancala', rules);
  }
  initGame(players: Participant[]): MancalaState {
    return {
      players: participants(players),
      currentTurnPlayerId: players[0].id,
      winner: null,
      isDraw: false,
      seedsPerPit: Number(this.options.seedsPerPit),
      lastSow: null,
      pits: Array.from({ length: 14 }, (_, i) =>
        i === 6 || i === 13 ? 0 : Number(this.options.seedsPerPit),
      ),
      lastPit: null,
      captured: 0,
      extraTurn: false,
    };
  }
  validateAction(s: MancalaState, id: string, a: MancalaAction) {
    if (!a || typeof a !== 'object' || Array.isArray(a)) return false;
    const side = s.players.findIndex((p) => p.id === id);
    return (
      !!a &&
      a.type === 'SOW' &&
      liveTurn(s, id) &&
      integer(a.pit, side * 7, side * 7 + 5) &&
      s.pits[a.pit] > 0
    );
  }
  applyAction(s: MancalaState, id: string, a: MancalaAction): MancalaState {
    if (!this.validateAction(s, id, a)) return s;
    const n = structuredClone(s),
      side = n.players.findIndex((p) => p.id === id),
      store = side * 7 + 6,
      rivalStore = side === 0 ? 13 : 6;
    let seeds = n.pits[a.pit],
      at = a.pit;
    n.pits[at] = 0;
    n.lastSow = { from: a.pit, path: [], id: (s.lastSow?.id || 0) + 1 };
    n.captured = 0;
    while (seeds) {
      at = (at + 1) % 14;
      if (at !== rivalStore) {
        n.pits[at]++;
        n.lastSow.path.push(at);
        seeds--;
      }
    }
    if (at >= side * 7 && at <= side * 7 + 5 && n.pits[at] === 1 && n.pits[12 - at] > 0) {
      n.captured = n.pits[12 - at] + 1;
      n.pits[store] += n.captured;
      n.pits[12 - at] = n.pits[at] = 0;
    }
    n.lastPit = at;
    n.extraTurn = at === store;
    if ([0, 7].some((start) => n.pits.slice(start, start + 6).every((v) => v === 0))) {
      for (const start of [0, 7])
        for (let i = start; i < start + 6; i++) {
          n.pits[start + 6] += n.pits[i];
          n.pits[i] = 0;
        }
      return finishScores(n, [n.pits[6], n.pits[13]]);
    }
    if (!n.extraTurn) n.currentTurnPlayerId = nextPlayer(n);
    return n;
  }
  getSanitizedState(s: MancalaState, _id: string) {
    return structuredClone(s);
  }
  checkWinner(s: MancalaState) {
    return s.winner;
  }
  getBotAction(s: MancalaState, id: string): MancalaAction | null {
    if (!liveTurn(s, id)) return null;
    const side = s.players.findIndex((p) => p.id === id),
      own = side * 7 + 6,
      other = side === 0 ? 13 : 6;
    let nodes = 0;
    const search = (n: MancalaState, depth: number): number => {
      if (n.winner) return n.winner === id ? 1000 + depth : -1000 - depth;
      if (n.isDraw) return 0;
      if (!depth || ++nodes > 1500) return n.pits[own] - n.pits[other];
      const start = n.players.findIndex((p) => p.id === n.currentTurnPlayerId) * 7;
      const scores = Array.from({ length: 6 }, (_, i) => start + i)
        .filter((i) => n.pits[i])
        .map((pit) =>
          search(this.applyAction(n, n.currentTurnPlayerId, { type: 'SOW', pit }), depth - 1),
        );
      return n.currentTurnPlayerId === id ? Math.max(...scores) : Math.min(...scores);
    };
    const best = Array.from({ length: 6 }, (_, i) => side * 7 + i)
      .filter((pit) => s.pits[pit])
      .map((pit) => ({ pit, score: search(this.applyAction(s, id, { type: 'SOW', pit }), 4) }))
      .sort((a, b) => b.score - a.score)[0];
    return best ? { type: 'SOW', pit: best.pit } : null;
  }
  forfeitPlayer = forfeit<MancalaState>;
}
