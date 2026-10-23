import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  integer,
  shuffle,
  systemRandom,
  type Participant,
  type RandomSource,
} from '../../engine/helpers.js';
import { spanishCard, spanishDeck } from '../spanish-cards.js';
import { resolveGameSettings } from '../../settings.js';
import { message as msg, type GameText } from '../../messages.js';
export type MusLance = 'grande' | 'chica' | 'pares' | 'juego' | 'punto';
export const musRank = (card: number) => {
  const r = spanishCard(card).rank;
  return r === 3 ? 12 : r === 2 ? 1 : r;
};
export function musHand(cards: number[]) {
  const ranks = cards.map(musRank),
    counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const pairs =
    groups[0]?.[1] === 4
      ? [3, groups[0][0], groups[0][0]]
      : groups[0]?.[1] === 3
        ? [2, groups[0][0]]
        : groups.filter((g) => g[1] === 2).length === 2
          ? [
              3,
              ...groups
                .filter((g) => g[1] === 2)
                .map((g) => g[0])
                .sort((a, b) => b - a),
            ]
          : groups[0]?.[1] === 2
            ? [1, groups[0][0]]
            : [0];
  const sum = ranks.reduce((s, r) => s + Math.min(r, 10), 0);
  return {
    grande: [...ranks].sort((a, b) => b - a),
    chica: [...ranks].sort((a, b) => a - b).map((r) => -r),
    pairs,
    pairBonus: pairs[0],
    sum,
    juego: sum >= 31,
  };
}
export interface MusPlayer extends Participant {
  team: number;
  hand: number[];
}
export interface MusAgreement {
  lance: MusLance;
  stake: number;
  forcedTeam: number | null;
}
export interface MusResult {
  lance: MusLance;
  team: number;
  points: number;
  playerId: string;
}
export interface MusBet {
  offer: number | 'ordago';
  team: number;
  previous: number;
  responders: string[];
  folded: string[];
}
export interface MusState {
  players: MusPlayer[];
  stock: number[];
  discards: number[];
  phase: 'mus' | 'discard' | 'declare' | 'bet' | 'hand_end' | 'finished';
  currentTurnPlayerId: string;
  mano: number;
  handNumber: number;
  musVotes: string[];
  discardedCount: number;
  lance: MusLance;
  lanceIndex: number;
  declarations: Record<string, boolean>;
  declarationCount: number;
  eligible: string[];
  passed: string[];
  bet: MusBet | null;
  agreements: MusAgreement[];
  results: MusResult[];
  teamPoints: [number, number];
  targetPoints: number;
  showHands: boolean;
  revision: number;
  winner: string | null;
  winnerIds: string[];
  isDraw: boolean;
  message: GameText;
}
export interface MusPublicState extends Omit<MusState, 'players' | 'stock' | 'discards'> {
  players: (Omit<MusPlayer, 'hand'> & {
    handCount: number;
    hand: number[] | null;
    score: number;
  })[];
  hand: number[];
  stockCount: number;
  discardCount: number;
  summary: ReturnType<typeof musHand> | null;
}
export type MusAction =
  | { type: 'MUS' | 'CUT' | 'DECLARE' | 'PASS' | 'ACCEPT' | 'FOLD' | 'ORDAGO' | 'NEXT_HAND' }
  | { type: 'DISCARD'; cards: number[] }
  | { type: 'BID'; amount: number };
const ordered = (s: MusState) => Array.from({ length: 4 }, (_, i) => s.players[(s.mano + i) % 4]);
const teamOf = (s: MusState, id: string) => s.players.find((p) => p.id === id)!.team;
function compare(a: number[], b: number[]) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const n = (a[i] ?? 0) - (b[i] ?? 0);
    if (n) return n;
  }
  return 0;
}
function strength(cards: number[], lance: MusLance) {
  const h = musHand(cards);
  return lance === 'grande'
    ? h.grande
    : lance === 'chica'
      ? h.chica
      : lance === 'pares'
        ? h.pairs
        : lance === 'punto'
          ? [h.sum]
          : [[33, 34, 35, 36, 37, 40, 32, 31].indexOf(h.sum)];
}
export function musBestPlayer(
  s: Pick<MusState, 'players' | 'mano'>,
  lance: MusLance,
  eligible: string[],
): string | null {
  let best: MusPlayer | null = null;
  for (let i = 0; i < 4; i++) {
    const p = s.players[(s.mano + i) % 4];
    if (
      eligible.includes(p.id) &&
      (!best || compare(strength(p.hand, lance), strength(best.hand, lance)) > 0)
    )
      best = p;
  }
  return best?.id ?? null;
}
const baseLances: MusLance[] = ['grande', 'chica', 'pares', 'juego'];
export class MusEngine implements IGameEngine<MusState, MusAction, MusPublicState> {
  private rules = resolveGameSettings('mus');
  constructor(private random: RandomSource = systemRandom) {}
  setRules(r: Record<string, unknown>) {
    this.rules = resolveGameSettings('mus', r);
  }
  private deal(s: MusState) {
    s.stock = shuffle(spanishDeck(), this.random);
    s.discards = [];
    s.players.forEach((p) => {
      p.hand = [];
    });
    for (let c = 0; c < 4; c++) for (const p of ordered(s)) p.hand.push(s.stock.shift()!);
    s.phase = 'mus';
    s.currentTurnPlayerId = s.players[s.mano].id;
    s.musVotes = [];
    s.discardedCount = 0;
    s.lanceIndex = 0;
    s.lance = 'grande';
    s.declarations = {};
    s.declarationCount = 0;
    s.eligible = [];
    s.passed = [];
    s.bet = null;
    s.agreements = [];
    s.results = [];
    s.showHands = false;
    s.message = msg('Decide si pides mus para descartar o cortas para empezar los lances.');
  }
  initGame(players: Participant[]): MusState {
    const ps = participants(players, 4, 4),
      s: MusState = {
        players: ps.map((p, i) => ({ ...p, team: i % 2, hand: [] })),
        stock: [],
        discards: [],
        phase: 'mus',
        currentTurnPlayerId: ps[0].id,
        mano: 0,
        handNumber: 1,
        musVotes: [],
        discardedCount: 0,
        lance: 'grande',
        lanceIndex: 0,
        declarations: {},
        declarationCount: 0,
        eligible: [],
        passed: [],
        bet: null,
        agreements: [],
        results: [],
        teamPoints: [0, 0],
        targetPoints: Number(this.rules.targetPoints),
        showHands: false,
        revision: 0,
        winner: null,
        winnerIds: [],
        isDraw: false,
        message: msg('Comienza el Mus a ocho reyes.'),
      };
    this.deal(s);
    return s;
  }
  private finish(s: MusState, team: number) {
    s.winnerIds = s.players.filter((p) => p.team === team).map((p) => p.id);
    s.winner = s.winnerIds[0];
    s.phase = 'finished';
    s.message = msg('El bando vencedor completa el juego de Mus.');
  }
  private addPoints(s: MusState, team: number, points: number) {
    s.teamPoints[team] += points;
    if (s.teamPoints[team] >= s.targetPoints) this.finish(s, team);
  }
  private eligibleFor(s: MusState, lance: MusLance) {
    return ordered(s)
      .filter((p) =>
        lance === 'pares'
          ? musHand(p.hand).pairBonus > 0
          : lance === 'juego'
            ? musHand(p.hand).juego
            : true,
      )
      .map((p) => p.id);
  }
  private beginLance(s: MusState) {
    if (s.lanceIndex >= 4) {
      this.settle(s);
      return;
    }
    s.lance = baseLances[s.lanceIndex];
    s.bet = null;
    s.passed = [];
    s.declarations = {};
    s.declarationCount = 0;
    if (s.lance === 'pares' || s.lance === 'juego') {
      s.phase = 'declare';
      s.currentTurnPlayerId = s.players[s.mano].id;
      s.message = msg('Declara si tienes pares o juego. El servidor comprueba la declaración.');
    } else {
      s.eligible = this.eligibleFor(s, s.lance);
      s.phase = 'bet';
      s.currentTurnPlayerId = s.eligible[0];
      s.message = msg('Empieza el lance: puedes pasar, envidar o lanzar un órdago.');
    }
  }
  private advance(s: MusState, agreement: MusAgreement) {
    s.agreements.push(agreement);
    s.lanceIndex++;
    this.beginLance(s);
  }
  private settle(s: MusState) {
    s.showHands = true;
    s.results = [];
    for (const a of s.agreements) {
      const eligible = this.eligibleFor(s, a.lance),
        best = musBestPlayer(
          s,
          a.lance,
          a.forcedTeam === null
            ? eligible
            : eligible.filter((id) => teamOf(s, id) === a.forcedTeam),
        );
      if (!best) continue;
      const team = a.forcedTeam ?? teamOf(s, best),
        eligibleTeam = ordered(s).filter((p) => p.team === team && eligible.includes(p.id));
      let intrinsic = 0;
      if (a.lance === 'pares')
        intrinsic = eligibleTeam.reduce((v, p) => v + musHand(p.hand).pairBonus, 0);
      if (a.lance === 'juego')
        intrinsic = eligibleTeam.reduce((v, p) => v + (musHand(p.hand).sum === 31 ? 3 : 2), 0);
      if (a.lance === 'punto') intrinsic = 1;
      const points = a.stake + intrinsic;
      s.results.push({ lance: a.lance, team, points, playerId: best });
      this.addPoints(s, team, points);
      if (s.winner) return;
    }
    s.phase = 'hand_end';
    s.currentTurnPlayerId = s.players[(s.mano + 1) % 4].id;
    s.message = msg(
      'Cartas reveladas y tantos cobrados en orden de lances. Prepara la siguiente mano.',
    );
  }
  private responders(s: MusState, id: string) {
    const start = s.players.findIndex((p) => p.id === id);
    return Array.from({ length: 3 }, (_, i) => s.players[(start + i + 1) % 4])
      .filter((p) => p.team !== teamOf(s, id) && s.eligible.includes(p.id))
      .map((p) => p.id);
  }
  validateAction(s: MusState, id: string, a: MusAction): boolean {
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
    if (s.phase === 'mus') return a.type === 'MUS' || a.type === 'CUT';
    if (s.phase === 'discard')
      return (
        a.type === 'DISCARD' &&
        Array.isArray(a.cards) &&
        integer(a.cards.length, 1, 4) &&
        new Set(a.cards).size === a.cards.length &&
        a.cards.every(
          (c) => integer(c, 0, 39) && s.players.find((p) => p.id === id)!.hand.includes(c),
        )
      );
    if (s.phase === 'declare') return a.type === 'DECLARE';
    if (s.phase === 'hand_end') return a.type === 'NEXT_HAND';
    if (s.phase !== 'bet' || !s.eligible.includes(id)) return false;
    if (!s.bet)
      return (
        a.type === 'PASS' || a.type === 'ORDAGO' || (a.type === 'BID' && integer(a.amount, 2, 100))
      );
    return (
      a.type === 'ACCEPT' ||
      a.type === 'FOLD' ||
      (s.bet.offer !== 'ordago' &&
        (a.type === 'ORDAGO' || (a.type === 'BID' && integer(a.amount, s.bet.offer + 1, 100))))
    );
  }
  applyAction(state: MusState, id: string, a: MusAction): MusState {
    if (!this.validateAction(state, id, a)) return state;
    const s = structuredClone(state),
      p = s.players.find((p) => p.id === id)!;
    s.revision++;
    if (a.type === 'NEXT_HAND') {
      s.mano = (s.mano + 1) % 4;
      s.handNumber++;
      this.deal(s);
      return s;
    }
    if (a.type === 'CUT') {
      s.lanceIndex = 0;
      this.beginLance(s);
      return s;
    }
    if (a.type === 'MUS') {
      s.musVotes.push(id);
      if (s.musVotes.length === 4) {
        s.phase = 'discard';
        s.discardedCount = 0;
        s.currentTurnPlayerId = s.players[s.mano].id;
        s.message = msg('Todos han pedido mus. Descarta de una a cuatro cartas.');
      } else s.currentTurnPlayerId = ordered(s)[s.musVotes.length].id;
      return s;
    }
    if (a.type === 'DISCARD') {
      p.hand = p.hand.filter((c) => !a.cards.includes(c));
      for (let n = 0; n < a.cards.length; n++) {
        if (!s.stock.length) {
          s.stock = shuffle(s.discards, this.random);
          s.discards = [];
        }
        p.hand.push(s.stock.shift()!);
      }
      s.discards.push(...a.cards);
      s.discardedCount++;
      if (s.discardedCount === 4) {
        s.phase = 'mus';
        s.musVotes = [];
        s.currentTurnPlayerId = s.players[s.mano].id;
        s.message = msg('Descarte completado. Vuelve a decidir si hay mus.');
      } else s.currentTurnPlayerId = ordered(s)[s.discardedCount].id;
      return s;
    }
    if (a.type === 'DECLARE') {
      s.declarations[id] =
        s.lance === 'pares' ? musHand(p.hand).pairBonus > 0 : musHand(p.hand).juego;
      s.declarationCount++;
      if (s.declarationCount < 4) {
        s.currentTurnPlayerId = ordered(s)[s.declarationCount].id;
        return s;
      }
      s.eligible = this.eligibleFor(s, s.lance);
      if (s.lance === 'juego' && !s.eligible.length) {
        s.lance = 'punto';
        s.eligible = this.eligibleFor(s, 'punto');
      }
      const teams = new Set(s.eligible.map((id) => teamOf(s, id)));
      if (teams.size < 2) {
        if (teams.size === 1)
          s.agreements.push({ lance: s.lance, stake: 0, forcedTeam: [...teams][0] });
        s.lanceIndex++;
        this.beginLance(s);
      } else {
        s.phase = 'bet';
        s.currentTurnPlayerId = s.eligible[0];
        s.message = msg('Declaraciones completas. Comienzan los envites del lance.');
      }
      return s;
    }
    if (a.type === 'PASS') {
      s.passed.push(id);
      if (s.passed.length === s.eligible.length)
        this.advance(s, {
          lance: s.lance,
          stake: s.lance === 'grande' || s.lance === 'chica' ? 1 : 0,
          forcedTeam: null,
        });
      else s.currentTurnPlayerId = s.eligible[s.passed.length];
      return s;
    }
    if (a.type === 'BID' || a.type === 'ORDAGO') {
      const previous = s.bet && s.bet.offer !== 'ordago' ? s.bet.offer : 0,
        responders = this.responders(s, id);
      s.bet = {
        offer: a.type === 'BID' ? a.amount : 'ordago',
        team: p.team,
        previous,
        responders,
        folded: [],
      };
      s.currentTurnPlayerId = responders[0];
      s.message = msg('El bando contrario debe aceptar, rechazar o subir el envite.');
      return s;
    }
    if (a.type === 'ACCEPT' && s.bet) {
      if (s.bet.offer === 'ordago') {
        s.showHands = true;
        const best = musBestPlayer(s, s.lance, s.eligible)!;
        const team = teamOf(s, best);
        s.teamPoints[team] = s.targetPoints;
        this.finish(s, team);
        s.message = msg('Órdago aceptado: las cartas resuelven el juego completo inmediatamente.');
      } else this.advance(s, { lance: s.lance, stake: s.bet.offer, forcedTeam: null });
      return s;
    }
    if (a.type === 'FOLD' && s.bet) {
      s.bet.folded.push(id);
      const next = s.bet.responders.find((id) => !s.bet!.folded.includes(id));
      if (next) s.currentTurnPlayerId = next;
      else {
        const team = s.bet.team,
          points = s.bet.previous || 1;
        this.addPoints(s, team, points);
        if (!s.winner) this.advance(s, { lance: s.lance, stake: 0, forcedTeam: team });
      }
      return s;
    }
    return s;
  }
  getSanitizedState(s: MusState, id: string): MusPublicState {
    const { stock, discards, players, ...publicState } = s,
      hand = players.find((p) => p.id === id)?.hand ?? [];
    return structuredClone({
      ...publicState,
      players: players.map(({ hand, ...p }) => ({
        ...p,
        hand: s.showHands ? hand : null,
        handCount: hand.length,
        score: s.teamPoints[p.team],
      })),
      hand,
      stockCount: stock.length,
      discardCount: discards.length,
      summary: hand.length ? musHand(hand) : null,
    });
  }
  checkWinner(s: MusState) {
    return s.winner;
  }
  forfeitPlayer(state: MusState, id: string): MusState {
    if (state.winner || state.isDraw || !state.players.some((p) => p.id === id)) return state;
    const s = structuredClone(state);
    s.revision++;
    this.finish(s, 1 - teamOf(s, id));
    s.message = msg('Abandono: el otro bando gana el juego de Mus.');
    return s;
  }
  getBotAction(s: MusState, id: string): MusAction | null {
    if (s.winner || s.isDraw || id !== s.currentTurnPlayerId) return null;
    const v = this.getSanitizedState(s, id),
      h = v.summary;
    if (!h) return null;
    if (v.phase === 'mus')
      return {
        type:
          h.pairBonus >= 2 ||
          h.sum === 31 ||
          h.sum === 32 ||
          h.grande.filter((r) => r === 12).length >= 3 ||
          h.chica.filter((r) => r === -1).length >= 3
            ? 'CUT'
            : 'MUS',
      };
    if (v.phase === 'discard') {
      const counts = new Map<number, number>();
      for (const c of v.hand) counts.set(musRank(c), (counts.get(musRank(c)) ?? 0) + 1);
      const cards = v.hand.filter((c) => (counts.get(musRank(c)) ?? 0) < 2 && musRank(c) < 10);
      return { type: 'DISCARD', cards: cards.length ? cards : [v.hand[0]] };
    }
    if (v.phase === 'declare') return { type: 'DECLARE' };
    if (v.phase === 'hand_end') return { type: 'NEXT_HAND' };
    const sum = h.grande.reduce((a, b) => a + b, 0),
      quality =
        v.lance === 'grande'
          ? (sum - 4) / 44
          : v.lance === 'chica'
            ? (48 - sum) / 44
            : v.lance === 'pares'
              ? h.pairBonus / 3
              : v.lance === 'punto'
                ? h.sum / 30
                : h.sum === 31
                  ? 1
                  : h.sum === 32
                    ? 0.9
                    : 0.65;
    if (!v.bet) return quality > 0.75 ? { type: 'BID', amount: 2 } : { type: 'PASS' };
    if (v.bet.offer === 'ordago') return { type: quality > 0.9 ? 'ACCEPT' : 'FOLD' };
    if (quality > 0.9 && v.bet.offer < 8) return { type: 'BID', amount: v.bet.offer + 2 };
    return { type: quality > (v.bet.offer <= 2 ? 0.35 : 0.65) ? 'ACCEPT' : 'FOLD' };
  }
}
