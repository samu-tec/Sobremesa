import { resolveGameSettings } from '../../settings.js';
import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  liveTurn,
  nextPlayer,
  forfeit,
  integer,
  shuffle,
  type Match,
  type Participant,
} from '../../engine/helpers.js';
export const FLEET_LENGTHS = [5, 4, 3, 3, 2];
export interface Ship {
  cells: number[];
}
interface FleetPlayer extends Participant {
  ships: Ship[];
  shots: number[];
  ready: boolean;
}
export type BatallaNavalAction =
  | { type: 'PLACE'; start: number; horizontal: boolean; length: number }
  | { type: 'REMOVE'; index: number }
  | { type: 'RANDOMIZE' | 'READY' }
  | { type: 'FIRE'; index: number };
export interface BatallaNavalState extends Match {
  players: FleetPlayer[];
  phase: 'placement' | 'battle';
  hitKeepsTurn: boolean;
  lastShot: { by: string; index: number; hit: boolean; sunk: boolean } | null;
}
export interface BatallaNavalPublicState extends Omit<BatallaNavalState, 'players'> {
  players: (Participant & { ready: boolean; shipCount: number; sunkCount: number })[];
  ships: Ship[];
  incoming: { index: number; hit: boolean }[];
  shots: { index: number; hit: boolean; sunk: boolean }[];
  revealedFleet: Ship[] | null;
}
function cells(start: number, horizontal: boolean, length: number): number[] {
  if (!integer(start, 0, 99) || !FLEET_LENGTHS.includes(length) || typeof horizontal !== 'boolean')
    return [];
  if (horizontal ? (start % 10) + length > 10 : Math.floor(start / 10) + length > 10) return [];
  return Array.from({ length }, (_, i) => start + i * (horizontal ? 1 : 10));
}
function canPlace(p: FleetPlayer, a: Extract<BatallaNavalAction, { type: 'PLACE' }>): boolean {
  const squares = cells(a.start, a.horizontal, a.length);
  return (
    squares.length === a.length &&
    p.ships.filter((s) => s.cells.length === a.length).length <
      FLEET_LENGTHS.filter((l) => l === a.length).length &&
    !p.ships.some((s) => s.cells.some((i) => squares.includes(i)))
  );
}
function randomFleet(): Ship[] {
  const p: FleetPlayer = { id: '', isBot: false, ships: [], shots: [], ready: false };
  for (const length of FLEET_LENGTHS) {
    const choices = shuffle(
      Array.from({ length: 200 }, (_, i) => ({
        type: 'PLACE' as const,
        start: i % 100,
        horizontal: i < 100,
        length,
      })),
    ).filter((a) => canPlace(p, a));
    const a = choices[0];
    if (!a) return randomFleet();
    p.ships.push({ cells: cells(a.start, a.horizontal, a.length) });
  }
  return p.ships;
}
export class BatallaNavalEngine implements IGameEngine<
  BatallaNavalState,
  BatallaNavalAction,
  BatallaNavalPublicState
> {
  private options = resolveGameSettings('battleship');
  setRules(rules: Record<string, unknown>) {
    this.options = resolveGameSettings('battleship', rules);
  }
  initGame(players: Participant[]): BatallaNavalState {
    return {
      players: participants(players).map((p) => ({ ...p, ships: [], shots: [], ready: false })),
      currentTurnPlayerId: players[0].id,
      winner: null,
      isDraw: false,
      phase: 'placement',
      hitKeepsTurn: Boolean(this.options.hitKeepsTurn),
      lastShot: null,
    };
  }
  validateAction(s: BatallaNavalState, id: string, a: BatallaNavalAction): boolean {
    if (!a || !liveTurn(s, id)) return false;
    const p = s.players.find((p) => p.id === id)!;
    if (s.phase === 'placement') {
      if (a.type === 'RANDOMIZE') return true;
      if (a.type === 'PLACE') return canPlace(p, a);
      if (a.type === 'REMOVE') return integer(a.index, 0, p.ships.length - 1);
      return a.type === 'READY' && p.ships.length === 5;
    }
    return a.type === 'FIRE' && integer(a.index, 0, 99) && !p.shots.includes(a.index);
  }
  applyAction(s: BatallaNavalState, id: string, a: BatallaNavalAction): BatallaNavalState {
    if (!this.validateAction(s, id, a)) return s;
    const n = structuredClone(s),
      p = n.players.find((p) => p.id === id)!,
      rival = n.players.find((p) => p.id !== id)!;
    if (a.type === 'RANDOMIZE') p.ships = randomFleet();
    if (a.type === 'PLACE') p.ships.push({ cells: cells(a.start, a.horizontal, a.length) });
    if (a.type === 'REMOVE') p.ships.splice(a.index, 1);
    if (a.type === 'READY') {
      p.ready = true;
      if (rival.ready) {
        n.phase = 'battle';
        n.currentTurnPlayerId = n.players[0].id;
      } else n.currentTurnPlayerId = rival.id;
    }
    if (a.type === 'FIRE') {
      p.shots.push(a.index);
      const ship = rival.ships.find((s) => s.cells.includes(a.index));
      n.lastShot = {
        by: id,
        index: a.index,
        hit: !!ship,
        sunk: !!ship && ship.cells.every((i) => p.shots.includes(i)),
      };
      if (rival.ships.every((s) => s.cells.every((i) => p.shots.includes(i)))) n.winner = id;
      else if (!ship || !n.hitKeepsTurn) n.currentTurnPlayerId = nextPlayer(n);
    }
    return n;
  }
  getSanitizedState(s: BatallaNavalState, id: string): BatallaNavalPublicState {
    const p = s.players.find((p) => p.id === id),
      r = s.players.find((p) => p.id !== id),
      shots = p?.shots || [];
    return {
      players: s.players.map(({ ships, shots, ready, ...p }) => ({
        ...p,
        ready,
        shipCount: ships.length,
        sunkCount: ships.filter((ship) =>
          ship.cells.every((i) => s.players.find((v) => v.id !== p.id)!.shots.includes(i)),
        ).length,
      })),
      ships: structuredClone(p?.ships || []),
      incoming: (r?.shots || []).map((index) => ({
        index,
        hit: !!p?.ships.some((ship) => ship.cells.includes(index)),
      })),
      shots: shots.map((index) => {
        const ship = r?.ships.find((ship) => ship.cells.includes(index));
        return { index, hit: !!ship, sunk: !!ship && ship.cells.every((i) => shots.includes(i)) };
      }),
      revealedFleet: s.winner ? structuredClone(r?.ships || []) : null,
      currentTurnPlayerId: s.currentTurnPlayerId,
      winner: s.winner,
      isDraw: s.isDraw,
      phase: s.phase,
      hitKeepsTurn: s.hitKeepsTurn,
      lastShot: structuredClone(s.lastShot),
    };
  }
  checkWinner(s: BatallaNavalState) {
    return s.winner;
  }
  getBotAction(s: BatallaNavalState, id: string): BatallaNavalAction | null {
    if (!liveTurn(s, id)) return null;
    const view = this.getSanitizedState(s, id);
    if (s.phase === 'placement') return { type: view.ships.length === 5 ? 'READY' : 'RANDOMIZE' };
    const shots = new Set(view.shots.map((v) => v.index)),
      hits = view.shots.filter((v) => v.hit && !v.sunk).map((v) => v.index),
      score = (index: number) =>
        hits.reduce(
          (n, h) =>
            n +
            (Math.abs(Math.floor(h / 10) - Math.floor(index / 10)) +
              Math.abs((h % 10) - (index % 10)) ===
            1
              ? 20
              : 0),
          0,
        ) +
        ((Math.floor(index / 10) + (index % 10)) % 2 === 0 ? 1 : 0) +
        Math.random();
    const index = Array.from({ length: 100 }, (_, i) => i)
      .filter((i) => !shots.has(i))
      .map((i) => ({ i, n: score(i) }))
      .sort((a, b) => b.n - a.n)[0]?.i;
    return index === undefined ? null : { type: 'FIRE', index };
  }
  forfeitPlayer = forfeit<BatallaNavalState>;
}
