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
export const pokerRank = (card: number) => (card % 13) + 2;
export const pokerSuit = (card: number) => Math.floor(card / 13);
/** Categoría y cinco desempates, codificados sin redondeo en base quince. */
function five(cards: number[]): number {
  const ranks = cards.map(pokerRank).sort((a, b) => b - a),
    counts = new Map<number, number>();
  ranks.forEach((r) => counts.set(r, (counts.get(r) ?? 0) + 1));
  const groups = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]),
    flush = cards.every((c) => pokerSuit(c) === pokerSuit(cards[0])),
    unique = [...new Set(ranks)],
    straight =
      unique.length === 5
        ? unique[0] - unique[4] === 4
          ? unique[0]
          : unique.join(',') === '14,5,4,3,2'
            ? 5
            : 0
        : 0;
  let cat = 0,
    kick = ranks;
  if (straight && flush) {
    cat = 8;
    kick = [straight];
  } else if (groups[0][1] === 4) {
    cat = 7;
    kick = groups.map((g) => g[0]);
  } else if (groups[0][1] === 3 && groups[1][1] === 2) {
    cat = 6;
    kick = groups.map((g) => g[0]);
  } else if (flush) cat = 5;
  else if (straight) {
    cat = 4;
    kick = [straight];
  } else if (groups[0][1] === 3) {
    cat = 3;
    kick = groups.map((g) => g[0]);
  } else if (groups[0][1] === 2 && groups[1][1] === 2) {
    cat = 2;
    kick = groups.map((g) => g[0]);
  } else if (groups[0][1] === 2) {
    cat = 1;
    kick = groups.map((g) => g[0]);
  }
  let score = cat;
  for (let i = 0; i < 5; i++) score = score * 15 + (kick[i] ?? 0);
  return score;
}
/** Mejor combinación de cinco entre cinco, seis o siete cartas. */
export function pokerEvaluate(cards: readonly number[]): number {
  if (
    cards.length < 5 ||
    cards.length > 7 ||
    new Set(cards).size !== cards.length ||
    cards.some((c) => !integer(c, 0, 51))
  )
    throw new Error('Cartas de póker inválidas');
  let best = 0;
  for (let a = 0; a < cards.length - 4; a++)
    for (let b = a + 1; b < cards.length - 3; b++)
      for (let c = b + 1; c < cards.length - 2; c++)
        for (let d = c + 1; d < cards.length - 1; d++)
          for (let e = d + 1; e < cards.length; e++)
            best = Math.max(best, five([cards[a], cards[b], cards[c], cards[d], cards[e]]));
  return best;
}
export const pokerCategory = (score: number) => Math.floor(score / 15 ** 5);
export interface PokerPlayer extends Participant {
  hand: number[];
  score: number;
  bet: number;
  committed: number;
  folded: boolean;
  left: boolean;
  actedAt: number | null;
}
export interface PokerPot {
  amount: number;
  eligible: string[];
  winnerIds: string[];
  returned: boolean;
}
export interface PokerState {
  players: PokerPlayer[];
  deck: number[];
  burned: number[];
  board: number[];
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'hand_end' | 'finished';
  dealer: number;
  smallBlindId: string;
  bigBlindId: string;
  bigBlind: number;
  currentTurnPlayerId: string;
  currentBet: number;
  minRaise: number;
  pending: string[];
  handNumber: number;
  showHands: boolean;
  pots: PokerPot[];
  revision: number;
  winner: string | null;
  winnerIds: string[];
  isDraw: boolean;
  message: GameText;
}
export interface PokerPublicState extends Omit<
  PokerState,
  'players' | 'deck' | 'burned' | 'pending'
> {
  players: (Omit<PokerPlayer, 'hand' | 'actedAt'> & { hand: number[] | null; handCount: number })[];
  hand: number[];
  pot: number;
  callAmount: number;
  minRaiseTo: number;
  maxRaiseTo: number;
  canRaise: boolean;
}
export type PokerAction =
  { type: 'FOLD' | 'CHECK' | 'CALL' | 'NEXT_HAND' } | { type: 'RAISE'; to: number };
export class PokerEngine implements IGameEngine<PokerState, PokerAction, PokerPublicState> {
  constructor(private random: RandomSource = systemRandom) {}
  private live(s: PokerState) {
    return s.players.filter((p) => !p.left && p.score > 0);
  }
  private contenders(s: PokerState) {
    return s.players.filter((p) => !p.folded && p.hand.length > 0);
  }
  private next(s: PokerState, index: number, test: (p: PokerPlayer) => boolean): number {
    for (let n = 1; n <= s.players.length; n++) {
      const i = (index + n) % s.players.length;
      if (test(s.players[i])) return i;
    }
    return -1;
  }
  private pay(p: PokerPlayer, amount: number) {
    const paid = Math.min(p.score, amount);
    p.score -= paid;
    p.bet += paid;
    p.committed += paid;
  }
  private startHand(s: PokerState) {
    s.deck = shuffle(
      Array.from({ length: 52 }, (_, i) => i),
      this.random,
    );
    s.burned = [];
    s.board = [];
    s.pots = [];
    s.showHands = false;
    s.bigBlind = Math.min(
      1000 * s.players.length,
      20 * 2 ** Math.min(20, Math.floor((s.handNumber - 1) / 5)),
    );
    s.minRaise = s.bigBlind;
    s.currentBet = s.bigBlind;
    s.phase = 'preflop';
    s.players.forEach((p) => {
      p.hand = [];
      p.bet = 0;
      p.committed = 0;
      p.folded = p.left || p.score === 0;
      p.actedAt = null;
    });
    for (let c = 0; c < 2; c++)
      for (let n = 1; n <= s.players.length; n++) {
        const p = s.players[(s.dealer + n) % s.players.length];
        if (!p.folded) p.hand.push(s.deck.shift()!);
      }
    const playing = (p: PokerPlayer) => !p.folded,
      sb = this.contenders(s).length === 2 ? s.dealer : this.next(s, s.dealer, playing),
      bb = this.next(s, sb, playing);
    s.smallBlindId = s.players[sb].id;
    s.bigBlindId = s.players[bb].id;
    this.pay(s.players[sb], s.bigBlind / 2);
    this.pay(s.players[bb], s.bigBlind);
    s.pending = s.players.filter((p) => !p.folded && p.score > 0).map((p) => p.id);
    s.currentTurnPlayerId = s.players[bb].id;
    s.message = msg('Nueva mano: dos cartas privadas y ciegas obligatorias.');
    this.advance(s, bb);
  }
  initGame(players: Participant[]): PokerState {
    const ps = participants(players, 2, 8),
      s: PokerState = {
        players: ps.map((p) => ({
          ...p,
          hand: [],
          score: 1000,
          bet: 0,
          committed: 0,
          folded: false,
          left: false,
          actedAt: null,
        })),
        deck: [],
        burned: [],
        board: [],
        phase: 'preflop',
        dealer: 0,
        smallBlindId: '',
        bigBlindId: '',
        bigBlind: 20,
        currentTurnPlayerId: ps[0].id,
        currentBet: 20,
        minRaise: 20,
        pending: [],
        handNumber: 1,
        showHands: false,
        pots: [],
        revision: 0,
        winner: null,
        winnerIds: [],
        isDraw: false,
        message: msg('Solo fichas ficticias, sin valor económico.'),
      };
    this.startHand(s);
    return s;
  }
  private raiseAllowed(s: PokerState, p: PokerPlayer): boolean {
    if (p.folded || p.left || p.score + p.bet <= s.currentBet) return false;
    if (!s.players.some((q) => q.id !== p.id && !q.folded && q.score > 0)) return false;
    return (
      p.actedAt === null ||
      s.currentBet - p.actedAt >= s.minRaise ||
      (p.actedAt === 0 && s.phase !== 'preflop')
    );
  }
  validateAction(s: PokerState, id: string, a: PokerAction): boolean {
    if (
      !a ||
      typeof a !== 'object' ||
      Array.isArray(a) ||
      s.winner ||
      s.isDraw ||
      id !== s.currentTurnPlayerId
    )
      return false;
    const p = s.players.find((p) => p.id === id);
    if (!p || p.left) return false;
    if (a.type === 'NEXT_HAND') return s.phase === 'hand_end' && p.score > 0;
    if (s.phase === 'hand_end' || s.phase === 'finished' || p.folded || p.score <= 0) return false;
    if (a.type === 'FOLD') return true;
    if (a.type === 'CHECK') return p.bet >= s.currentBet;
    if (a.type === 'CALL') return p.bet < s.currentBet;
    if (
      a.type !== 'RAISE' ||
      !integer(a.to, 1, p.score + p.bet) ||
      a.to <= s.currentBet ||
      !this.raiseAllowed(s, p)
    )
      return false;
    return (
      a.to >= (s.currentBet < s.bigBlind ? s.bigBlind : s.currentBet + s.minRaise) ||
      a.to === p.score + p.bet
    );
  }
  private finishHand(s: PokerState) {
    const contenders = this.contenders(s),
      show = contenders.length > 1;
    if (show) while (s.board.length < 5) this.revealStreet(s);
    s.showHands = show;
    const levels = [...new Set(s.players.map((p) => p.committed).filter((n) => n > 0))].sort(
      (a, b) => a - b,
    );
    let prev = 0;
    s.pots = [];
    for (const level of levels) {
      const contributors = s.players.filter((p) => p.committed >= level),
        amount = (level - prev) * contributors.length;
      prev = level;
      let eligible = contributors.filter((p) => !p.folded),
        winners: PokerPlayer[],
        returned = false;
      if (contributors.length === 1) {
        winners = contributors;
        eligible = contributors;
        returned = true;
      } else if (!eligible.length) {
        winners = contributors;
        returned = true;
      } else if (eligible.length === 1) winners = eligible;
      else {
        const ranks = eligible.map((p) => pokerEvaluate([...p.hand, ...s.board])),
          best = Math.max(...ranks);
        winners = eligible.filter((_p, i) => ranks[i] === best);
      }
      // Las fichas indivisibles van al primer ganador a la izquierda del botón.
      winners.sort(
        (a, b) =>
          ((s.players.indexOf(a) - s.dealer - 1 + s.players.length) % s.players.length) -
          ((s.players.indexOf(b) - s.dealer - 1 + s.players.length) % s.players.length),
      );
      winners.forEach(
        (p, i) =>
          (p.score += Math.floor(amount / winners.length) + Number(i < amount % winners.length)),
      );
      s.pots.push({
        amount,
        eligible: eligible.map((p) => p.id),
        winnerIds: winners.map((p) => p.id),
        returned,
      });
    }
    s.players.forEach((p) => {
      p.bet = 0;
      p.committed = 0;
    });
    s.pending = [];
    const live = this.live(s);
    if (live.length <= 1) {
      s.phase = 'finished';
      s.winner = live[0]?.id ?? null;
      s.winnerIds = s.winner ? [s.winner] : [];
      s.isDraw = !s.winner;
      s.message = msg('Torneo terminado. Las fichas son exclusivamente ficticias.');
    } else {
      s.phase = 'hand_end';
      s.currentTurnPlayerId = s.players[this.next(s, s.dealer, (p) => !p.left && p.score > 0)].id;
      s.message = show
        ? msg('Cartas descubiertas: cada bote se reparte entre sus participantes habilitados.')
        : msg('Todos los rivales se retiran: se gana el bote sin descubrir la mano.');
    }
  }
  private revealStreet(s: PokerState) {
    s.burned.push(s.deck.shift()!);
    const count = s.board.length === 0 ? 3 : 1;
    for (let i = 0; i < count; i++) s.board.push(s.deck.shift()!);
  }
  private advance(s: PokerState, after: number) {
    if (this.contenders(s).length <= 1) {
      this.finishHand(s);
      return;
    }
    s.pending = s.pending.filter((id) =>
      s.players.some((p) => p.id === id && !p.folded && p.score > 0),
    );
    const able = this.contenders(s).filter((p) => p.score > 0);
    if (able.length === 1 && able[0].bet >= s.currentBet) s.pending = [];
    if (s.pending.length) {
      const i = this.next(s, after, (p) => s.pending.includes(p.id));
      s.currentTurnPlayerId = s.players[i].id;
      return;
    }
    if (s.phase === 'river' || able.length <= 1) {
      this.finishHand(s);
      return;
    }
    this.revealStreet(s);
    s.phase = s.board.length === 3 ? 'flop' : s.board.length === 4 ? 'turn' : 'river';
    s.currentBet = 0;
    s.minRaise = s.bigBlind;
    s.players.forEach((p) => {
      p.bet = 0;
      p.actedAt = null;
    });
    s.pending = able.map((p) => p.id);
    const i = this.next(s, s.dealer, (p) => s.pending.includes(p.id));
    s.currentTurnPlayerId = s.players[i].id;
    s.message = msg('Nueva calle: puedes pasar si nadie ha apostado.');
  }
  applyAction(state: PokerState, id: string, a: PokerAction): PokerState {
    if (!this.validateAction(state, id, a)) return state;
    const s = structuredClone(state),
      index = s.players.findIndex((p) => p.id === id),
      p = s.players[index];
    s.revision++;
    if (a.type === 'NEXT_HAND') {
      s.dealer = this.next(s, s.dealer, (p) => !p.left && p.score > 0);
      s.handNumber++;
      this.startHand(s);
      return s;
    }
    s.pending = s.pending.filter((q) => q !== id);
    if (a.type === 'FOLD') p.folded = true;
    else if (a.type === 'CALL') {
      this.pay(p, s.currentBet - p.bet);
      p.actedAt = s.currentBet;
    } else if (a.type === 'CHECK') p.actedAt = s.currentBet;
    else if (a.type === 'RAISE') {
      const increment = a.to - s.currentBet;
      if (increment >= s.minRaise || (s.currentBet < s.bigBlind && a.to >= s.bigBlind)) {
        s.minRaise = s.currentBet < s.bigBlind ? a.to : increment;
        s.players.forEach((q) => {
          if (q.id !== id) q.actedAt = null;
        });
      }
      this.pay(p, a.to - p.bet);
      s.currentBet = a.to;
      p.actedAt = a.to;
      s.pending = s.players
        .filter((q) => q.id !== id && !q.folded && q.score > 0 && q.bet < s.currentBet)
        .map((q) => q.id);
    }
    s.message = msg('Acción confirmada. Sigue el siguiente asiento habilitado.');
    this.advance(s, index);
    return s;
  }
  getSanitizedState(s: PokerState, id: string): PokerPublicState {
    const { players, deck: _deck, burned: _burned, pending: _pending, ...visible } = s,
      p = s.players.find((p) => p.id === id),
      active = id === s.currentTurnPlayerId && s.phase !== 'hand_end' && s.phase !== 'finished';
    return structuredClone({
      ...visible,
      players: players.map(({ hand, actedAt: _acted, ...p }) => ({
        ...p,
        hand: p.id === id || (s.showHands && !p.folded) ? hand : null,
        handCount: hand.length,
      })),
      hand: players.find((p) => p.id === id)?.hand ?? [],
      pot: players.reduce((sum, p) => sum + p.committed, 0),
      callAmount: p ? Math.min(p.score, Math.max(0, s.currentBet - p.bet)) : 0,
      minRaiseTo: s.currentBet < s.bigBlind ? s.bigBlind : s.currentBet + s.minRaise,
      maxRaiseTo: p ? p.score + p.bet : 0,
      canRaise: Boolean(p && active && this.raiseAllowed(s, p)),
    });
  }
  checkWinner(s: PokerState) {
    return s.winner;
  }
  forfeitPlayer(state: PokerState, id: string): PokerState {
    if (state.winner || state.isDraw) return state;
    const index = state.players.findIndex((p) => p.id === id);
    if (index < 0 || state.players[index].left) return state;
    const s = structuredClone(state),
      p = s.players[index];
    s.revision++;
    p.left = true;
    p.folded = true;
    s.pending = s.pending.filter((q) => q !== id);
    if (s.phase === 'hand_end') {
      const live = this.live(s);
      if (live.length <= 1) {
        s.winner = live[0]?.id ?? null;
        s.winnerIds = s.winner ? [s.winner] : [];
        s.isDraw = !s.winner;
        s.phase = 'finished';
      } else if (s.currentTurnPlayerId === id) s.currentTurnPlayerId = live[0].id;
    } else if (this.contenders(s).length <= 1 || s.currentTurnPlayerId === id)
      this.advance(s, index);
    s.message = msg('Abandono: la mano se retira y sus fichas restantes salen del juego.');
    return s;
  }
  getBotAction(s: PokerState, id: string): PokerAction | null {
    if (s.winner || s.isDraw || s.currentTurnPlayerId !== id) return null;
    if (s.phase === 'hand_end') return { type: 'NEXT_HAND' };
    const v = this.getSanitizedState(s, id),
      p = v.players.find((p) => p.id === id)!;
    const pair = v.hand.length === 2 && pokerRank(v.hand[0]) === pokerRank(v.hand[1]),
      strength =
        v.board.length >= 3 ? pokerCategory(pokerEvaluate([...v.hand, ...v.board])) : pair ? 2 : 0,
      premium = pair || v.hand.every((c) => pokerRank(c) >= 11);
    if (v.canRaise && (strength >= 2 || premium))
      return {
        type: 'RAISE',
        to: Math.min(v.maxRaiseTo, Math.max(v.minRaiseTo, s.currentBet + s.bigBlind * 2)),
      };
    if (!v.callAmount) return { type: 'CHECK' };
    return v.callAmount <= s.bigBlind * 2 || premium || strength >= 1 || v.callAmount <= p.score / 8
      ? { type: 'CALL' }
      : { type: 'FOLD' };
  }
}
