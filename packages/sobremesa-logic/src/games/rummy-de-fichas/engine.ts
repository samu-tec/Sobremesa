import { resolveGameSettings } from '../../settings.js';
import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  liveTurn,
  nextPlayer,
  shuffle,
  integer,
  type Match,
  type Participant,
} from '../../engine/helpers.js';
export interface RummyDeFichasTile {
  id: number;
  value: number;
  color: number;
  joker: boolean;
}
interface RummyDeFichasPlayer extends Participant {
  hand: RummyDeFichasTile[];
  opened: boolean;
  score: number;
}
export type RummyDeFichasAction =
  { type: 'PLAY_TABLE'; sets: number[][] } | { type: 'DRAW' } | { type: 'PASS' };
export interface RummyDeFichasState extends Match {
  players: RummyDeFichasPlayer[];
  rules: { openingPoints: number; startingTiles: number; useJokers: boolean };
  pool: RummyDeFichasTile[];
  table: RummyDeFichasTile[][];
  passes: number;
  turnNumber: number;
  lastPlayedIds: number[];
  lastAction: 'play' | 'draw' | 'pass' | null;
}
export interface RummyDeFichasPublicState extends Omit<RummyDeFichasState, 'players' | 'pool'> {
  players: (Participant & { handCount: number; opened: boolean; score: number })[];
  hand: RummyDeFichasTile[];
  poolCount: number;
}
export interface RummyDeFichasSetAnalysis {
  kind: 'group' | 'run';
  points: number;
  tiles: (RummyDeFichasTile & { asValue: number; asColor: number })[];
}
export function analyzeRummyDeFichasSet(
  tiles: RummyDeFichasTile[],
): RummyDeFichasSetAnalysis | null {
  if (
    tiles.length < 3 ||
    tiles.length > 13 ||
    new Set(tiles.map((t) => t.id)).size !== tiles.length
  )
    return null;
  const naturals = tiles.filter((t) => !t.joker),
    jokers = tiles.filter((t) => t.joker);
  if (!naturals.length || jokers.length > 2) return null;
  let group: RummyDeFichasSetAnalysis | null = null;
  if (
    tiles.length <= 4 &&
    naturals.every((t) => t.value === naturals[0].value) &&
    new Set(naturals.map((t) => t.color)).size === naturals.length
  ) {
    const missing = [0, 1, 2, 3].filter((c) => !naturals.some((t) => t.color === c));
    const resolved = tiles
      .map((t) => ({
        ...t,
        asValue: naturals[0].value,
        asColor: t.joker ? missing[jokers.findIndex((j) => j.id === t.id)] : t.color,
      }))
      .sort((a, b) => a.asColor - b.asColor);
    group = { kind: 'group', points: tiles.length * naturals[0].value, tiles: resolved };
  }
  const sorted = [...naturals].sort((a, b) => a.value - b.value);
  if (
    !naturals.every((t) => t.color === naturals[0].color) ||
    new Set(naturals.map((t) => t.value)).size !== naturals.length
  )
    return group;
  const min = sorted[0].value,
    max = sorted.at(-1)!.value,
    start = Math.min(min, 14 - tiles.length);
  if (start < 1 || max >= start + tiles.length) return group;
  const missing = Array.from({ length: tiles.length }, (_, i) => start + i).filter(
    (v) => !naturals.some((t) => t.value === v),
  );
  if (missing.length !== jokers.length) return group;
  const resolved = tiles
    .map((t) => ({
      ...t,
      asValue: t.joker ? missing[jokers.findIndex((j) => j.id === t.id)] : t.value,
      asColor: naturals[0].color,
    }))
    .sort((a, b) => a.asValue - b.asValue);
  const run: RummyDeFichasSetAnalysis = {
    kind: 'run',
    points: resolved.reduce((n, t) => n + t.asValue, 0),
    tiles: resolved,
  };
  return group && group.points >= run.points ? group : run;
}
export const validRummyDeFichasMeld = (tiles: RummyDeFichasTile[]) =>
  analyzeRummyDeFichasSet(tiles) !== null;
export type RummyDeFichasProblem =
  'invalid' | 'duplicate' | 'missing' | 'foreign' | 'no_new' | 'opening' | null;
export function checkRummyDeFichasPlay(
  table: RummyDeFichasTile[][],
  hand: RummyDeFichasTile[],
  opened: boolean,
  sets: unknown,
  openingPoints = 30,
): { reason: RummyDeFichasProblem; playedIds: number[]; points: number } {
  const fail = (reason: RummyDeFichasProblem) => ({ reason, playedIds: [], points: 0 });
  if (
    !Array.isArray(sets) ||
    !sets.length ||
    sets.length > 35 ||
    sets.some((s) => !Array.isArray(s) || s.length < 3 || s.length > 13)
  )
    return fail('invalid');
  const ids = sets.flat() as unknown[];
  if (ids.length > 106 || !ids.every((id) => integer(id, 0, 105))) return fail('foreign');
  if (new Set(ids).size !== ids.length) return fail('duplicate');
  const old = table.flat(),
    oldIds = new Set(old.map((t) => t.id)),
    ownIds = new Set(hand.map((t) => t.id)),
    lookup = new Map([...old, ...hand].map((t) => [t.id, t]));
  if (ids.some((id) => !lookup.has(id as number))) return fail('foreign');
  if (old.some((t) => !ids.includes(t.id))) return fail('missing');
  const playedIds = (ids as number[]).filter((id) => ownIds.has(id));
  if (!playedIds.length) return fail('no_new');
  const analyzed = (sets as number[][]).map((set) =>
    analyzeRummyDeFichasSet(set.map((id) => lookup.get(id)!)),
  );
  if (analyzed.some((v) => !v)) return fail('invalid');
  let points = 0;
  if (!opened) {
    // The opening must use only rack tiles and leave every old set intact.
    for (const oldSet of table)
      if (
        !(sets as number[][]).some(
          (set) => set.length === oldSet.length && oldSet.every((t) => set.includes(t.id)),
        )
      )
        return fail('opening');
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i] as number[];
      if (set.some((id) => oldIds.has(id))) {
        if (!set.every((id) => oldIds.has(id))) return fail('opening');
      } else points += analyzed[i]!.points;
    }
    if (points < openingPoints) return fail('opening');
  } else
    points = playedIds.reduce(
      (sum, id) => sum + (lookup.get(id)!.joker ? 30 : lookup.get(id)!.value),
      0,
    );
  return { reason: null, playedIds, points };
}
function allTiles(): RummyDeFichasTile[] {
  return Array.from({ length: 106 }, (_, id) =>
    id >= 104
      ? { id, value: 0, color: 4, joker: true }
      : { id, value: (id % 13) + 1, color: Math.floor(id / 13) % 4, joker: false },
  );
}
export function rummyMeldOptions(hand: RummyDeFichasTile[]): number[][] {
  const result: number[][] = [],
    seen = new Set<string>(),
    jokers = hand.filter((t) => t.joker),
    add = (tiles: RummyDeFichasTile[]) => {
      if (!validRummyDeFichasMeld(tiles)) return;
      const ids = tiles.map((t) => t.id).sort((a, b) => a - b),
        key = ids.join(',');
      if (!seen.has(key)) {
        seen.add(key);
        result.push(ids);
      }
    };
  // Enumerate colour subsets for groups and intervals for runs, including wildcard gaps.
  for (let value = 1; value <= 13; value++)
    for (let mask = 1; mask < 16; mask++) {
      const colours = [0, 1, 2, 3].filter((c) => mask & (1 << c)),
        available = colours.map((c) =>
          hand.filter((t) => !t.joker && t.value === value && t.color === c),
        );
      if (available.some((a) => !a.length)) continue;
      const variants = (at: number, chosen: RummyDeFichasTile[]) => {
        if (at === available.length) {
          for (let n = 0; n <= jokers.length; n++)
            if (chosen.length + n >= 3 && chosen.length + n <= 4)
              add([...chosen, ...jokers.slice(0, n)]);
          return;
        }
        for (const tile of available[at]) variants(at + 1, [...chosen, tile]);
      };
      variants(0, []);
    }
  for (let color = 0; color < 4; color++)
    for (let start = 1; start <= 11; start++)
      for (let end = start + 2; end <= 13; end++) {
        const chosen: RummyDeFichasTile[] = [],
          missing: number[] = [];
        for (let v = start; v <= end; v++) {
          const tile = hand.find((t) => !t.joker && t.color === color && t.value === v);
          if (tile) chosen.push(tile);
          else missing.push(v);
        }
        if (missing.length <= jokers.length) add([...chosen, ...jokers.slice(0, missing.length)]);
      }
  return result.sort((a, b) => b.length - a.length);
}
function finish(s: RummyDeFichasState): RummyDeFichasState {
  const values = s.players.map((p) => p.hand.reduce((n, t) => n + (t.joker ? 30 : t.value), 0)),
    min = Math.min(...values),
    winners = s.players.filter((_, i) => values[i] === min);
  if (winners.length > 1) {
    s.isDraw = true;
    s.players.forEach((p) => (p.score = 0));
    return s;
  }
  s.winner = winners[0].id;
  const winner = s.players.indexOf(winners[0]);
  s.players.forEach(
    (p, i) => (p.score = i === winner ? values.reduce((n, v) => n + v - min, 0) : min - values[i]),
  );
  return s;
}
export class RummyDeFichasEngine implements IGameEngine<
  RummyDeFichasState,
  RummyDeFichasAction,
  RummyDeFichasPublicState
> {
  private options = resolveGameSettings('rummy');
  setRules(rules: Record<string, unknown>) {
    this.options = resolveGameSettings('rummy', rules);
  }
  initGame(players: Participant[]): RummyDeFichasState {
    const ps = participants(players, 2, 4).map((p) => ({
        ...p,
        hand: [] as RummyDeFichasTile[],
        opened: false,
        score: 0,
      })),
      pool = shuffle(allTiles().filter((tile) => this.options.useJokers || !tile.joker));
    for (const p of ps) p.hand = pool.splice(0, Number(this.options.startingTiles));
    return {
      players: ps,
      rules: {
        openingPoints: Number(this.options.openingPoints),
        startingTiles: Number(this.options.startingTiles),
        useJokers: Boolean(this.options.useJokers),
      },
      currentTurnPlayerId: ps[0].id,
      winner: null,
      isDraw: false,
      pool,
      table: [],
      passes: 0,
      turnNumber: 1,
      lastPlayedIds: [],
      lastAction: null,
    };
  }
  validateAction(s: RummyDeFichasState, id: string, a: RummyDeFichasAction): boolean {
    if (!a || !liveTurn(s, id)) return false;
    if (a.type === 'DRAW') return s.pool.length > 0;
    if (a.type === 'PASS') return s.pool.length === 0;
    return (
      a.type === 'PLAY_TABLE' &&
      checkRummyDeFichasPlay(
        s.table,
        s.players.find((p) => p.id === id)!.hand,
        s.players.find((p) => p.id === id)!.opened,
        a.sets,
        s.rules.openingPoints,
      ).reason === null
    );
  }
  applyAction(s: RummyDeFichasState, id: string, a: RummyDeFichasAction): RummyDeFichasState {
    if (!this.validateAction(s, id, a)) return s;
    const n = structuredClone(s),
      p = n.players.find((p) => p.id === id)!;
    n.lastPlayedIds = [];
    if (a.type === 'DRAW') {
      p.hand.push(n.pool.pop()!);
      n.passes = 0;
      n.lastAction = 'draw';
    } else if (a.type === 'PASS') {
      n.passes++;
      n.lastAction = 'pass';
      if (n.passes === n.players.length) return finish(n);
    } else {
      const checked = checkRummyDeFichasPlay(
          n.table,
          p.hand,
          p.opened,
          a.sets,
          n.rules.openingPoints,
        ),
        lookup = new Map([...n.table.flat(), ...p.hand].map((t) => [t.id, t]));
      n.table = a.sets.map((ids) =>
        analyzeRummyDeFichasSet(ids.map((id) => lookup.get(id)!))!.tiles.map(
          ({ asValue, asColor, ...tile }) => tile,
        ),
      );
      p.hand = p.hand.filter((t) => !checked.playedIds.includes(t.id));
      p.opened = true;
      n.lastPlayedIds = checked.playedIds;
      n.passes = 0;
      n.lastAction = 'play';
      if (!p.hand.length) return finish(n);
    }
    n.currentTurnPlayerId = nextPlayer(n);
    n.turnNumber++;
    return n;
  }
  getSanitizedState(s: RummyDeFichasState, id: string): RummyDeFichasPublicState {
    return {
      players: s.players.map((p) => ({
        id: p.id,
        isBot: p.isBot,
        ...(p.name ? { name: p.name } : {}),
        handCount: p.hand.length,
        opened: p.opened,
        score: p.score,
      })),
      hand: structuredClone(s.players.find((p) => p.id === id)?.hand || []),
      poolCount: s.pool.length,
      rules: { ...s.rules },
      table: structuredClone(s.table),
      passes: s.passes,
      turnNumber: s.turnNumber,
      lastPlayedIds: [...s.lastPlayedIds],
      lastAction: s.lastAction,
      currentTurnPlayerId: s.currentTurnPlayerId,
      winner: s.winner,
      isDraw: s.isDraw,
    };
  }
  checkWinner(s: RummyDeFichasState) {
    return s.winner;
  }
  getBotAction(s: RummyDeFichasState, id: string): RummyDeFichasAction | null {
    if (!liveTurn(s, id)) return null;
    const view = this.getSanitizedState(s, id),
      p = view.players.find((p) => p.id === id)!,
      lookup = new Map(view.hand.map((t) => [t.id, t])),
      options = rummyMeldOptions(view.hand);
    let best: number[][] = [],
      bestCount = 0,
      nodes = 0;
    const search = (index: number, used: Set<number>, sets: number[][], points: number) => {
      if (++nodes > 1800) return;
      if ((p.opened || points >= view.rules.openingPoints) && used.size > bestCount) {
        best = sets.map((s) => [...s]);
        bestCount = used.size;
      }
      if (sets.length >= 5) return;
      for (let i = index; i < options.length; i++) {
        const ids = options[i];
        if (ids.some((id) => used.has(id))) continue;
        const next = new Set([...used, ...ids]);
        search(
          i + 1,
          next,
          [...sets, ids],
          points + analyzeRummyDeFichasSet(ids.map((id) => lookup.get(id)!))!.points,
        );
      }
    };
    search(0, new Set(), [], 0);
    let table = [...view.table.map((set) => set.map((t) => t.id)), ...best],
      used = new Set(best.flat());
    if (p.opened) {
      const all = new Map([...view.table.flat(), ...view.hand].map((t) => [t.id, t]));
      for (const tile of view.hand.filter((t) => !used.has(t.id)))
        for (let i = 0; i < table.length; i++) {
          const candidate = [...table[i], tile.id];
          if (validRummyDeFichasMeld(candidate.map((id) => all.get(id)!))) {
            table[i] = candidate;
            used.add(tile.id);
            break;
          }
        }
      // Recover a table joker and use it immediately in a new set with rack tiles.
      for (let i = 0; i < table.length; i++)
        for (const jokerId of [...table[i]].filter((id) => all.get(id)!.joker)) {
          if (!view.table.flat().some((t) => t.id === jokerId)) continue;
          for (const tile of view.hand.filter((t) => !used.has(t.id) && !t.joker)) {
            const replacement = table[i].map((id) => (id === jokerId ? tile.id : id));
            if (!validRummyDeFichasMeld(replacement.map((id) => all.get(id)!))) continue;
            const available = [
              ...view.hand.filter((t) => !used.has(t.id) && t.id !== tile.id),
              all.get(jokerId)!,
            ];
            const next = rummyMeldOptions(available).find((ids) => ids.includes(jokerId));
            if (next) {
              table[i] = replacement;
              table.push(next);
              used.add(tile.id);
              for (const id of next) if (lookup.has(id)) used.add(id);
              break;
            }
          }
        }
      // Split a set around a duplicate rack tile when that creates two valid sets.
      for (const tile of view.hand.filter((t) => !used.has(t.id)))
        for (let i = 0; i < table.length; i++) {
          if (table[i].length < 5) continue;
          const merged = [...table[i], tile.id],
            candidates = rummyMeldOptions(merged.map((id) => all.get(id)!));
          let split: number[][] | null = null;
          for (const part of candidates) {
            const rest = merged.filter((id) => !part.includes(id));
            if (validRummyDeFichasMeld(rest.map((id) => all.get(id)!))) {
              split = [part, rest];
              break;
            }
          }
          if (split) {
            table.splice(i, 1, ...split);
            used.add(tile.id);
            break;
          }
        }
    }
    if (
      used.size &&
      checkRummyDeFichasPlay(view.table, view.hand, p.opened, table, view.rules.openingPoints)
        .reason === null
    )
      return { type: 'PLAY_TABLE', sets: table };
    return { type: view.poolCount ? 'DRAW' : 'PASS' };
  }
  forfeitPlayer(s: RummyDeFichasState, id: string): RummyDeFichasState {
    if (s.winner || s.isDraw || !s.players.some((p) => p.id === id)) return s;
    const n = structuredClone(s),
      next = nextPlayer(n),
      p = n.players.find((p) => p.id === id)!;
    n.pool = shuffle([...n.pool, ...p.hand]);
    n.players = n.players.filter((p) => p.id !== id);
    n.passes = 0;
    if (n.players.length === 1) return finish(n);
    if (n.currentTurnPlayerId === id) n.currentTurnPlayerId = next;
    return n;
  }
}
