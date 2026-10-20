import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  integer,
  shuffle,
  systemRandom,
  type Participant,
  type RandomSource,
} from '../../engine/helpers.js';
import { message as msg, type GameText } from '../../messages.js';
import { resolveGameSettings } from '../../settings.js';

// Cuatro copias por tipo: círculos 0–8, bambú 9–17, caracteres 18–26, vientos 27–30, dragones 31–33.
export const mahjongType = (tile: number) => Math.floor(tile / 4);
export interface MahjongMeld {
  kind: 'chow' | 'pung' | 'kong';
  tiles: number[];
  concealed: boolean;
  from: string | null;
}
export interface MahjongPlayer extends Participant {
  hand: number[];
  melds: MahjongMeld[];
  blocked: number[];
  score: number;
}
export type MahjongAction =
  | { type: 'DRAW' | 'PASS' | 'WIN' }
  | { type: 'DISCARD'; tile: number }
  | { type: 'CLAIM'; kind: 'chow' | 'pung' | 'kong'; tiles: number[] }
  | { type: 'KONG'; tile: number; added: boolean };
export interface MahjongScore {
  fan: number;
  base: number;
  patterns: GameText[];
  payments: Record<string, number>;
}
export interface MahjongState {
  players: MahjongPlayer[];
  wall: number[];
  rivers: Record<string, number[]>;
  currentTurnPlayerId: string;
  phase: 'draw' | 'discard' | 'claim' | 'finished';
  pending: { tile: number; from: string; kind: 'discard' | 'kong' } | null;
  responses: { id: string; action: MahjongAction }[];
  drawn: number | null;
  replacement: boolean;
  hasDrawn: boolean;
  discards: number;
  minimumFan: number;
  revision: number;
  winner: string | null;
  isDraw: boolean;
  result: MahjongScore | null;
  message: GameText;
}
export interface MahjongPublicMeld extends Omit<MahjongMeld, 'tiles'> {
  tiles: (number | null)[];
}
export interface MahjongPublicState extends Omit<
  MahjongState,
  'players' | 'wall' | 'responses' | 'drawn'
> {
  players: (Participant & {
    handCount: number;
    melds: MahjongPublicMeld[];
    score: number;
    revealedHand: number[] | null;
  })[];
  hand: number[];
  wallCount: number;
  drawn: number | null;
  respondedIds: string[];
  legalActions: MahjongAction[];
}
const counts = (tiles: number[]) => {
  const cs = Array<number>(34).fill(0);
  for (const t of tiles) cs[mahjongType(t)]++;
  return cs;
};
const orphans = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
interface Shape {
  pair: number;
  sets: { kind: 'chow' | 'pung'; tile: number }[];
  special?: 'orphans';
}
function shapes(tiles: number[], meldCount: number): Shape[] {
  if (tiles.length !== 14 - meldCount * 3) return [];
  const cs = counts(tiles),
    found: Shape[] = [];
  if (
    !meldCount &&
    orphans.every((t) => cs[t] > 0) &&
    cs.every((n, t) => !n || orphans.includes(t))
  )
    found.push({ pair: orphans.find((t) => cs[t] === 2)!, sets: [], special: 'orphans' });
  function sets(remaining: number, chosen: Shape['sets'], pair: number) {
    const first = cs.findIndex((n) => n > 0);
    if (first < 0) {
      if (remaining === 0) found.push({ pair, sets: [...chosen] });
      return;
    }
    if (!remaining) return;
    if (cs[first] >= 3) {
      cs[first] -= 3;
      chosen.push({ kind: 'pung', tile: first });
      sets(remaining - 1, chosen, pair);
      chosen.pop();
      cs[first] += 3;
    }
    if (first < 27 && first % 9 <= 6 && cs[first + 1] && cs[first + 2]) {
      cs[first]--;
      cs[first + 1]--;
      cs[first + 2]--;
      chosen.push({ kind: 'chow', tile: first });
      sets(remaining - 1, chosen, pair);
      chosen.pop();
      cs[first]++;
      cs[first + 1]++;
      cs[first + 2]++;
    }
  }
  for (let pair = 0; pair < cs.length; pair++)
    if (cs[pair] >= 2) {
      cs[pair] -= 2;
      sets(4 - meldCount, [], pair);
      cs[pair] += 2;
    }
  return found;
}
export function mahjongIsWinning(tiles: number[], meldCount = 0): boolean {
  return shapes(tiles, meldCount).length > 0;
}
interface ScoreContext {
  selfDraw: boolean;
  replacement: boolean;
  lastTile: boolean;
  robbing: boolean;
  first: boolean;
  seat: number;
}
/** Hong Kong antiguo: 0–4 fan, sin flores; los patrones límite sustituyen los bonos ordinarios. */
export function mahjongScore(
  tiles: number[],
  melds: MahjongMeld[],
  context: ScoreContext,
): Omit<MahjongScore, 'payments'> | null {
  const results = shapes(tiles, melds.length).map((shape) => {
    const all = [...tiles, ...melds.flatMap((m) => m.tiles)].map(mahjongType),
      sets = [
        ...shape.sets,
        ...melds.map((m) => ({ kind: m.kind, tile: mahjongType(m.tiles[0]) })),
      ],
      pungs = sets.filter((m) => m.kind !== 'chow').map((m) => m.tile),
      dragons = pungs.filter((t) => t >= 31).length,
      winds = pungs.filter((t) => t >= 27 && t <= 30).length,
      suits = new Set(all.filter((t) => t < 27).map((t) => Math.floor(t / 9))),
      honors = all.some((t) => t >= 27),
      patterns: GameText[] = [];
    let fan = 0;
    const add = (label: GameText, points: number) => {
      fan += points;
      patterns.push(label);
    };
    const closed = melds.every((m) => m.concealed),
      cs = counts(tiles),
      oneSuit = all[0] < 27 ? Math.floor(all[0] / 9) : -1;
    const gates =
      !melds.length &&
      oneSuit >= 0 &&
      all.every((t) => Math.floor(t / 9) === oneSuit) &&
      Array.from(
        { length: 9 },
        (_, i) => cs[oneSuit * 9 + i] >= (i === 0 || i === 8 ? 3 : 1),
      ).every(Boolean);
    const limit =
      shape.special === 'orphans'
        ? msg('Trece huérfanos')
        : gates
          ? msg('Nueve puertas')
          : dragons === 3
            ? msg('Tres grandes dragones')
            : winds >= 3 && (winds === 4 || (shape.pair >= 27 && shape.pair <= 30))
              ? msg('Cuatro vientos')
              : all.every((t) => t >= 27)
                ? msg('Todos honores')
                : all.every((t) => t < 27 && (t % 9 === 0 || t % 9 === 8))
                  ? msg('Todos terminales')
                  : melds.length === 4 && melds.every((m) => m.kind === 'kong')
                    ? msg('Cuatro kongs')
                    : closed && context.selfDraw && pungs.length === 4
                      ? msg('Cuatro tríos ocultos')
                      : context.first
                        ? msg('Bendición inicial')
                        : null;
    if (limit) return { fan: 4, base: 16, patterns: [limit] };
    if (sets.length === 4 && sets.every((m) => m.kind === 'chow') && shape.pair < 27)
      add(msg('Solo escaleras · 1 fan'), 1);
    for (const tile of pungs) {
      if (tile >= 31) add(msg('Trío de dragones · 1 fan'), 1);
      if (tile === 27 + context.seat) add(msg('Viento del asiento · 1 fan'), 1);
      if (tile === 27) add(msg('Viento de la ronda Este · 1 fan'), 1);
    }
    if (pungs.length === 4) add(msg('Solo tríos · 3 fan'), 3);
    if (suits.size === 1 && honors) add(msg('Un palo y honores · 3 fan'), 3);
    if (suits.size === 1 && !honors) add(msg('Un solo palo · límite de 4 fan'), 4);
    if (dragons === 2 && shape.pair >= 31) add(msg('Tres pequeños dragones · límite de 4 fan'), 4);
    if (context.selfDraw) add(msg('Victoria por robo · 1 fan'), 1);
    if (context.replacement) add(msg('Robo de reposición · 1 fan'), 1);
    if (context.lastTile) add(msg('Última ficha · 1 fan'), 1);
    if (context.robbing) add(msg('Robo de kong · 1 fan'), 1);
    if (!fan) patterns.push(msg('Mano sin bonos · 0 fan'));
    fan = Math.min(fan, 4);
    return { fan, base: 2 ** fan, patterns };
  });
  results.sort((a, b) => b.fan - a.fan);
  return results[0] ?? null;
}
const nextId = (s: MahjongState, id: string) =>
  s.players[(s.players.findIndex((p) => p.id === id) + 1) % 4].id;
function winningScore(s: MahjongState, id: string) {
  const p = s.players.find((p) => p.id === id)!;
  const claim = s.phase === 'claim' && s.pending !== null,
    tile = claim ? s.pending!.tile : null;
  if (claim && p.blocked.includes(mahjongType(tile!))) return null;
  const score = mahjongScore(tile === null ? p.hand : [...p.hand, tile], p.melds, {
    selfDraw: !claim,
    replacement: !claim && s.replacement,
    lastTile: !s.wall.length,
    robbing: claim && s.pending!.kind === 'kong',
    first:
      (s.discards === 0 && !s.players.some((p) => p.melds.length)) ||
      (claim &&
        s.discards === 1 &&
        s.pending!.from === s.players[0].id &&
        !s.players.some((p) => p.melds.length)),
    seat: s.players.findIndex((p) => p.id === id),
  });
  return score && score.fan >= s.minimumFan ? score : null;
}
function claimValid(s: MahjongState, id: string, kind: string, tiles: unknown): tiles is number[] {
  if (
    !s.pending ||
    s.pending.kind !== 'discard' ||
    !['chow', 'pung', 'kong'].includes(kind) ||
    !Array.isArray(tiles) ||
    tiles.length !== (kind === 'kong' ? 3 : 2) ||
    new Set(tiles).size !== tiles.length
  )
    return false;
  const p = s.players.find((p) => p.id === id)!;
  if (
    tiles.some((t) => !integer(t, 0, 135) || !p.hand.includes(t)) ||
    p.blocked.includes(mahjongType(s.pending.tile)) ||
    (kind === 'kong' && !s.wall.length)
  )
    return false;
  const types = [...tiles, s.pending.tile].map(mahjongType).sort((a, b) => a - b);
  if (kind !== 'chow') return types.every((t) => t === types[0]);
  return (
    id === nextId(s, s.pending.from) &&
    types[0] < 27 &&
    Math.floor(types[0] / 9) === Math.floor(types[2] / 9) &&
    types[1] === types[0] + 1 &&
    types[2] === types[0] + 2
  );
}
function options(s: MahjongState, id: string): MahjongAction[] {
  if (s.winner || s.isDraw || id !== s.currentTurnPlayerId || !s.players.some((p) => p.id === id))
    return [];
  const p = s.players.find((p) => p.id === id)!,
    actions: MahjongAction[] = [];
  if (s.phase === 'draw') return s.wall.length ? [{ type: 'DRAW' }] : [];
  if (((s.phase === 'discard' && s.hasDrawn) || s.phase === 'claim') && winningScore(s, id))
    actions.push({ type: 'WIN' });
  if (s.phase === 'discard') {
    for (const tile of p.hand) actions.push({ type: 'DISCARD', tile });
    if (s.hasDrawn && s.wall.length) {
      const cs = counts(p.hand);
      for (let t = 0; t < 34; t++)
        if (cs[t] === 4)
          actions.push({
            type: 'KONG',
            tile: p.hand.find((v) => mahjongType(v) === t)!,
            added: false,
          });
      for (const m of p.melds)
        if (m.kind === 'pung') {
          const tile = p.hand.find((v) => mahjongType(v) === mahjongType(m.tiles[0]));
          if (tile !== undefined) actions.push({ type: 'KONG', tile, added: true });
        }
    }
  } else if (s.phase === 'claim') {
    actions.push({ type: 'PASS' });
    if (s.pending?.kind === 'discard') {
      const type = mahjongType(s.pending.tile),
        same = p.hand.filter((t) => mahjongType(t) === type);
      if (same.length >= 2 && claimValid(s, id, 'pung', same.slice(0, 2)))
        actions.push({ type: 'CLAIM', kind: 'pung', tiles: same.slice(0, 2) });
      if (same.length >= 3 && claimValid(s, id, 'kong', same.slice(0, 3)))
        actions.push({ type: 'CLAIM', kind: 'kong', tiles: same.slice(0, 3) });
      for (let offset = -2; offset <= 0; offset++) {
        const start = type + offset,
          needed = [start, start + 1, start + 2].filter((t) => t !== type),
          tiles = needed.map((t) => p.hand.find((v) => mahjongType(v) === t));
        if (tiles.every((t) => t !== undefined) && claimValid(s, id, 'chow', tiles))
          actions.push({ type: 'CLAIM', kind: 'chow', tiles: tiles as number[] });
      }
    }
  }
  return actions;
}
export class MahjongEngine implements IGameEngine<MahjongState, MahjongAction, MahjongPublicState> {
  private rules = resolveGameSettings('mahjong');
  constructor(private random: RandomSource = systemRandom) {}
  setRules(rules: Record<string, unknown>) {
    this.rules = resolveGameSettings('mahjong', rules);
  }
  initGame(players: Participant[]): MahjongState {
    const ps = participants(players, 4, 4),
      wall = shuffle(
        Array.from({ length: 136 }, (_, i) => i),
        this.random,
      ),
      assigned = ps.map((p) => ({
        ...p,
        hand: [] as number[],
        melds: [] as MahjongMeld[],
        blocked: [] as number[],
        score: 0,
      }));
    for (let block = 0; block < 3; block++)
      for (const p of assigned) p.hand.push(...wall.splice(0, 4));
    for (const p of assigned) p.hand.push(wall.shift()!);
    assigned[0].hand.push(wall.shift()!);
    return {
      players: assigned,
      wall,
      rivers: Object.fromEntries(ps.map((p) => [p.id, []])),
      currentTurnPlayerId: ps[0].id,
      phase: 'discard',
      pending: null,
      responses: [],
      drawn: assigned[0].hand.at(-1)!,
      replacement: false,
      hasDrawn: true,
      discards: 0,
      minimumFan: Number(this.rules.minimumFan),
      revision: 0,
      winner: null,
      isDraw: false,
      result: null,
      message: msg(
        'Este empieza con catorce fichas. Descarta una o declara Mahjong si tu mano está completa.',
      ),
    };
  }
  validateAction(s: MahjongState, id: string, a: MahjongAction): boolean {
    if (
      !a ||
      typeof a !== 'object' ||
      Array.isArray(a) ||
      s.winner ||
      s.isDraw ||
      id !== s.currentTurnPlayerId ||
      !s.players.some((p) => p.id === id)
    )
      return false;
    if (a.type === 'CLAIM') return s.phase === 'claim' && claimValid(s, id, a.kind, a.tiles);
    if (a.type === 'DISCARD')
      return (
        s.phase === 'discard' &&
        integer(a.tile, 0, 135) &&
        s.players.find((p) => p.id === id)!.hand.includes(a.tile)
      );
    if (a.type === 'KONG')
      return (
        integer(a.tile, 0, 135) &&
        typeof a.added === 'boolean' &&
        options(s, id).some((o) => o.type === 'KONG' && o.tile === a.tile && o.added === a.added)
      );
    return (
      ['DRAW', 'PASS', 'WIN'].includes(a.type) && options(s, id).some((o) => o.type === a.type)
    );
  }
  private draw(s: MahjongState, id: string, replacement: boolean) {
    s.currentTurnPlayerId = id;
    s.pending = null;
    s.responses = [];
    if (!s.wall.length) {
      s.phase = 'finished';
      s.isDraw = true;
      s.message = msg('Muro agotado: mano en tablas, sin puntuación.');
      return;
    }
    const tile = replacement ? s.wall.pop()! : s.wall.shift()!,
      p = s.players.find((p) => p.id === id)!;
    p.hand.push(tile);
    p.blocked = [];
    s.drawn = tile;
    s.hasDrawn = true;
    s.replacement = replacement;
    s.phase = 'discard';
    s.message = msg('Ficha robada. Puedes declarar Mahjong, formar un kong o descartar.');
  }
  private finish(s: MahjongState, id: string, score: Omit<MahjongScore, 'payments'>) {
    const payments = Object.fromEntries(s.players.map((p) => [p.id, 0]));
    for (const p of s.players)
      if (p.id !== id) {
        const cost = score.base * (s.pending ? (p.id === s.pending.from ? 2 : 1) : 2);
        payments[p.id] -= cost;
        payments[id] += cost;
      }
    if (s.pending) {
      const source = s.players.find((p) => p.id === s.pending!.from)!;
      if (s.pending.kind === 'kong') source.hand = source.hand.filter((t) => t !== s.pending!.tile);
      else s.rivers[source.id].pop();
      s.players.find((p) => p.id === id)!.hand.push(s.pending.tile);
    }
    for (const p of s.players) p.score = payments[p.id];
    s.result = { ...score, payments };
    s.winner = id;
    s.phase = 'finished';
    s.pending = null;
    s.responses = [];
    s.message = msg('Mahjong confirmado: {0} fan. Valor base: {1} puntos.', score.fan, score.base);
  }
  private beginClaims(s: MahjongState) {
    s.phase = 'claim';
    s.responses = [];
    s.currentTurnPlayerId = nextId(s, s.pending!.from);
    s.drawn = null;
    s.hasDrawn = false;
    s.message = msg('Consulta el descarte: Mahjong tiene prioridad sobre trío, kong y escalera.');
  }
  private resolve(s: MahjongState) {
    const winner = s.responses.find((r) => r.action.type === 'WIN');
    if (winner) {
      this.finish(s, winner.id, winningScore(s, winner.id)!);
      return;
    }
    const pending = s.pending!,
      p = s.players.find((p) => p.id === pending.from)!;
    if (pending.kind === 'kong') {
      const meld = p.melds.find(
        (m) => m.kind === 'pung' && mahjongType(m.tiles[0]) === mahjongType(pending.tile),
      )!;
      meld.kind = 'kong';
      meld.tiles.push(pending.tile);
      p.hand = p.hand.filter((t) => t !== pending.tile);
      this.draw(s, p.id, true);
      return;
    }
    const claim =
      s.responses.find((r) => r.action.type === 'CLAIM' && r.action.kind !== 'chow') ??
      s.responses.find((r) => r.action.type === 'CLAIM');
    if (claim && claim.action.type === 'CLAIM') {
      const recipient = s.players.find((p) => p.id === claim.id)!,
        tiles = claim.action.tiles;
      recipient.hand = recipient.hand.filter((t) => !tiles.includes(t));
      recipient.melds.push({
        kind: claim.action.kind,
        tiles: [...claim.action.tiles, pending.tile].sort((a, b) => a - b),
        concealed: false,
        from: p.id,
      });
      s.rivers[p.id].pop();
      if (claim.action.kind === 'kong') this.draw(s, claim.id, true);
      else {
        s.currentTurnPlayerId = claim.id;
        s.phase = 'discard';
        s.pending = null;
        s.responses = [];
        s.hasDrawn = false;
        s.replacement = false;
        s.message = msg('Combinación expuesta. Ahora debes descartar una ficha.');
      }
    } else if (!s.wall.length) {
      s.phase = 'finished';
      s.isDraw = true;
      s.pending = null;
      s.responses = [];
      s.message = msg('Muro agotado: mano en tablas, sin puntuación.');
    } else {
      s.currentTurnPlayerId = nextId(s, p.id);
      s.phase = 'draw';
      s.pending = null;
      s.responses = [];
      s.message = msg('Nadie reclama la ficha. Roba del muro para continuar.');
    }
  }
  applyAction(state: MahjongState, id: string, a: MahjongAction): MahjongState {
    if (!this.validateAction(state, id, a)) return state;
    const s = structuredClone(state),
      p = s.players.find((p) => p.id === id)!;
    s.revision++;
    if (s.phase === 'claim') {
      if (a.type === 'PASS' && winningScore(s, id)) p.blocked.push(mahjongType(s.pending!.tile));
      s.responses.push({ id, action: structuredClone(a) });
      if (s.responses.length === 3) this.resolve(s);
      else s.currentTurnPlayerId = nextId(s, id);
    } else if (a.type === 'DRAW') this.draw(s, id, false);
    else if (a.type === 'WIN') this.finish(s, id, winningScore(s, id)!);
    else if (a.type === 'DISCARD') {
      p.hand = p.hand.filter((t) => t !== a.tile);
      s.rivers[id].push(a.tile);
      s.discards++;
      s.pending = { tile: a.tile, from: id, kind: 'discard' };
      this.beginClaims(s);
    } else if (a.type === 'KONG') {
      if (a.added) {
        s.pending = { tile: a.tile, from: id, kind: 'kong' };
        this.beginClaims(s);
      } else {
        const tiles = p.hand.filter((t) => mahjongType(t) === mahjongType(a.tile));
        p.hand = p.hand.filter((t) => !tiles.includes(t));
        p.melds.push({ kind: 'kong', tiles, concealed: true, from: null });
        this.draw(s, id, true);
      }
    }
    return s;
  }
  getSanitizedState(s: MahjongState, id: string): MahjongPublicState {
    const { wall, players, responses, drawn, ...visible } = structuredClone(s);
    return {
      ...visible,
      players: players.map(({ hand, melds, blocked: _blocked, ...p }) => ({
        ...p,
        handCount: hand.length,
        revealedHand: s.winner === p.id ? hand : null,
        melds: melds.map((m) => ({
          ...m,
          tiles:
            m.concealed && p.id !== id && s.winner !== p.id ? m.tiles.map(() => null) : m.tiles,
        })),
      })),
      hand: players.find((p) => p.id === id)?.hand ?? [],
      wallCount: wall.length,
      drawn: s.currentTurnPlayerId === id ? drawn : null,
      respondedIds: responses.map((r) => r.id),
      legalActions: options(s, id),
    };
  }
  checkWinner(s: MahjongState) {
    return s.winner;
  }
  forfeitPlayer(state: MahjongState, id: string): MahjongState {
    if (state.winner || state.isDraw || !state.players.some((p) => p.id === id)) return state;
    const s = structuredClone(state);
    s.isDraw = true;
    s.phase = 'finished';
    s.pending = null;
    s.responses = [];
    s.revision++;
    s.message = msg(
      'La mano se cierra sin puntuación por abandono: Mahjong necesita cuatro participantes.',
    );
    return s;
  }
  getBotAction(s: MahjongState, id: string): MahjongAction | null {
    const view = this.getSanitizedState(s, id),
      actions = view.legalActions;
    if (!actions.length) return null;
    const win = actions.find((a) => a.type === 'WIN');
    if (win) return win;
    if (view.phase === 'draw') return { type: 'DRAW' };
    if (view.phase === 'claim')
      return (
        actions.find((a) => a.type === 'CLAIM' && a.kind === 'kong') ??
        actions.find((a) => a.type === 'CLAIM' && a.kind === 'pung') ??
        actions.find((a) => a.type === 'CLAIM') ?? { type: 'PASS' }
      );
    const kong = actions.find((a) => a.type === 'KONG');
    if (kong) return kong;
    const cs = counts(view.hand),
      discards = actions.filter(
        (a): a is Extract<MahjongAction, { type: 'DISCARD' }> => a.type === 'DISCARD',
      );
    const value = (tile: number) => {
      const type = mahjongType(tile);
      let keep = (cs[type] - 1) * 5;
      if (type < 27)
        for (const delta of [-2, -1, 1, 2]) {
          const n = type + delta;
          if (n >= 0 && n < 27 && Math.floor(n / 9) === Math.floor(type / 9))
            keep += cs[n] * (Math.abs(delta) === 1 ? 2 : 1);
        }
      return keep + this.random() * 0.5;
    };
    const ranked = discards
      .map((a) => ({ a, value: value(a.tile) }))
      .sort((a, b) => a.value - b.value);
    return ranked[0]?.a ?? null;
  }
}
