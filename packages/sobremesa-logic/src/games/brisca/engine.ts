import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  integer,
  shuffle,
  systemRandom,
  type Participant,
  type RandomSource,
} from '../../engine/helpers.js';
import { spanishCard, spanishDeck, type SpanishSuit } from '../spanish-cards.js';
import { resolveGameSettings } from '../../settings.js';
import { message as msg, type GameText } from '../../messages.js';
const points: Readonly<Record<number, number>> = { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2 };
export const briscaPoints = (id: number) => points[spanishCard(id).rank] ?? 0;
export const briscaStrength = (id: number) =>
  [2, 4, 5, 6, 7, 10, 11, 12, 3, 1].indexOf(spanishCard(id).rank);
export interface BriscaPlay {
  playerId: string;
  card: number;
}
export interface BriscaPlayer extends Participant {
  hand: number[];
  captured: number[];
  score: number;
  team: number;
}
export interface BriscaState {
  players: BriscaPlayer[];
  stock: number[];
  trumpCard: number | null;
  trumpSuit: SpanishSuit;
  trick: BriscaPlay[];
  lastTrick: BriscaPlay[];
  lastTrickWinner: string | null;
  phase: 'play' | 'collect' | 'round_end' | 'finished';
  currentTurnPlayerId: string;
  dealer: number;
  round: number;
  roundWinner: string | null;
  wins: [number, number];
  targetWins: number;
  exchangeAllowed: boolean;
  revision: number;
  winner: string | null;
  winnerIds: string[];
  isDraw: boolean;
  message: GameText;
}
export interface BriscaPublicState extends Omit<BriscaState, 'players' | 'stock'> {
  players: (Omit<BriscaPlayer, 'hand'> & { handCount: number })[];
  hand: number[];
  stockCount: number;
  exchangeCard: number | null;
}
export type BriscaAction =
  { type: 'PLAY' | 'EXCHANGE'; card: number } | { type: 'COLLECT' | 'NEXT_ROUND' };
export function briscaTrickWinner(trick: BriscaPlay[], trump: SpanishSuit): string {
  let best = trick[0];
  for (const play of trick.slice(1)) {
    const a = spanishCard(play.card),
      b = spanishCard(best.card);
    if (
      (a.suit === b.suit && briscaStrength(play.card) > briscaStrength(best.card)) ||
      (a.suit === trump && b.suit !== trump)
    )
      best = play;
  }
  return best.playerId;
}
const nextId = (s: BriscaState, id: string) =>
  s.players[(s.players.findIndex((p) => p.id === id) + 1) % s.players.length].id;
function exchangeCard(s: BriscaState, id: string): number | null {
  if (
    s.phase !== 'collect' ||
    id !== s.currentTurnPlayerId ||
    !s.exchangeAllowed ||
    s.trumpCard === null ||
    s.stock.length + 1 <= s.players.length
  )
    return null;
  const rank = briscaPoints(s.trumpCard) > 0 ? 7 : 2;
  return (
    s.players
      .find((p) => p.id === id)
      ?.hand.find((c) => spanishCard(c).suit === s.trumpSuit && spanishCard(c).rank === rank) ??
    null
  );
}
export class BriscaEngine implements IGameEngine<BriscaState, BriscaAction, BriscaPublicState> {
  private rules = resolveGameSettings('brisca');
  constructor(private random: RandomSource = systemRandom) {}
  setRules(rules: Record<string, unknown>) {
    this.rules = resolveGameSettings('brisca', rules);
  }
  private deal(s: BriscaState) {
    const deck = shuffle(spanishDeck(), this.random),
      n = s.players.length;
    s.players.forEach((p) => {
      p.hand = [];
      p.captured = [];
      p.score = 0;
    });
    for (let card = 0; card < 3; card++)
      for (let offset = 1; offset <= n; offset++)
        s.players[(s.dealer + offset) % n].hand.push(deck.shift()!);
    s.trumpCard = deck.shift()!;
    s.trumpSuit = spanishCard(s.trumpCard).suit;
    s.stock = deck;
    s.trick = [];
    s.lastTrick = [];
    s.lastTrickWinner = null;
    s.roundWinner = null;
    s.phase = 'play';
    s.currentTurnPlayerId = s.players[(s.dealer + 1) % n].id;
    s.message = msg(
      'Tres cartas por persona. Puedes jugar cualquier carta: no hay obligación de asistir.',
    );
  }
  initGame(players: Participant[]): BriscaState {
    const ps = participants(players, 2, 4);
    if (ps.length !== 2 && ps.length !== 4) throw new Error('Número de jugadores no válido.');
    const s: BriscaState = {
      players: ps.map((p, i) => ({ ...p, hand: [], captured: [], score: 0, team: i % 2 })),
      stock: [],
      trumpCard: null,
      trumpSuit: 'oros',
      trick: [],
      lastTrick: [],
      lastTrickWinner: null,
      phase: 'play',
      currentTurnPlayerId: ps[0].id,
      dealer: ps.length - 1,
      round: 1,
      roundWinner: null,
      wins: [0, 0],
      targetWins: Number(this.rules.targetWins),
      exchangeAllowed: Boolean(this.rules.trumpExchange),
      revision: 0,
      winner: null,
      winnerIds: [],
      isDraw: false,
      message: msg('Comienza la Brisca.'),
    };
    this.deal(s);
    return s;
  }
  validateAction(s: BriscaState, id: string, a: BriscaAction): boolean {
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
    if (a.type === 'PLAY')
      return (
        s.phase === 'play' &&
        integer(a.card, 0, 39) &&
        s.players.find((p) => p.id === id)!.hand.includes(a.card)
      );
    if (a.type === 'EXCHANGE') return integer(a.card, 0, 39) && a.card === exchangeCard(s, id);
    return (
      (a.type === 'COLLECT' && s.phase === 'collect') ||
      (a.type === 'NEXT_ROUND' && s.phase === 'round_end')
    );
  }
  applyAction(state: BriscaState, id: string, a: BriscaAction): BriscaState {
    if (!this.validateAction(state, id, a)) return state;
    const s = structuredClone(state),
      p = s.players.find((p) => p.id === id)!;
    s.revision++;
    if (a.type === 'NEXT_ROUND') {
      s.round++;
      s.dealer = (s.dealer + 1) % s.players.length;
      this.deal(s);
      return s;
    }
    if (a.type === 'EXCHANGE') {
      p.hand = p.hand.map((c) => (c === a.card ? s.trumpCard! : c));
      s.trumpCard = a.card;
      s.message = msg('Triunfo cambiado antes del robo. Puedes recoger la baza y robar.');
      return s;
    }
    if (a.type === 'COLLECT') {
      for (let i = 0; i < s.players.length; i++) {
        const player = s.players[(s.players.findIndex((p) => p.id === id) + i) % s.players.length];
        const card = s.stock.length ? s.stock.shift()! : s.trumpCard!;
        if (!s.stock.length && card === s.trumpCard) s.trumpCard = null;
        player.hand.push(card);
      }
      s.phase = 'play';
      s.message = msg('El ganador ha robado primero y abre la siguiente baza.');
      return s;
    }
    if (a.type === 'PLAY') {
      p.hand = p.hand.filter((c) => c !== a.card);
      s.trick.push({ playerId: id, card: a.card });
      if (s.trick.length < s.players.length) {
        s.currentTurnPlayerId = nextId(s, id);
        s.message = msg('Carta jugada. Continúa el siguiente asiento.');
        return s;
      }
      const winner = briscaTrickWinner(s.trick, s.trumpSuit),
        owner = s.players.find((p) => p.id === winner)!;
      owner.captured.push(...s.trick.map((p) => p.card));
      owner.score = owner.captured.reduce((sum, c) => sum + briscaPoints(c), 0);
      s.lastTrick = s.trick;
      s.trick = [];
      s.lastTrickWinner = winner;
      s.currentTurnPlayerId = winner;
      s.message = msg(
        'Baza resuelta: {0} puntos.',
        s.lastTrick.reduce((sum, p) => sum + briscaPoints(p.card), 0),
      );
      if (s.players.every((p) => !p.hand.length) && !s.stock.length && s.trumpCard === null) {
        const scores = [0, 1].map((team) =>
          s.players.filter((p) => p.team === team).reduce((sum, p) => sum + p.score, 0),
        );
        const team = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
        s.roundWinner = team === null ? null : s.players.find((p) => p.team === team)!.id;
        if (team !== null) s.wins[team]++;
        if (team !== null && s.wins[team] >= s.targetWins) {
          s.winnerIds = s.players.filter((p) => p.team === team).map((p) => p.id);
          s.winner = s.winnerIds[0];
          s.phase = 'finished';
          s.message = msg(
            'Objetivo de victorias alcanzado. Tanteo del reparto: {0}–{1}.',
            scores[0],
            scores[1],
          );
        } else {
          s.phase = 'round_end';
          s.currentTurnPlayerId = s.players[(s.dealer + 2) % s.players.length].id;
          s.message =
            team === null
              ? msg('Empate a sesenta: el reparto se anula y nadie suma una victoria.')
              : msg(
                  'Reparto terminado. Tanteo: {0}–{1}. Prepara el siguiente.',
                  scores[0],
                  scores[1],
                );
        }
      } else if (s.stock.length || s.trumpCard !== null) s.phase = 'collect';
    }
    return s;
  }
  getSanitizedState(s: BriscaState, id: string): BriscaPublicState {
    const { stock, players, ...publicState } = structuredClone(s);
    return {
      ...publicState,
      players: players.map(({ hand, ...p }) => ({ ...p, handCount: hand.length })),
      hand: players.find((p) => p.id === id)?.hand ?? [],
      stockCount: stock.length + Number(s.trumpCard !== null),
      exchangeCard: exchangeCard(s, id),
    };
  }
  checkWinner(s: BriscaState) {
    return s.winner;
  }
  forfeitPlayer(state: BriscaState, id: string): BriscaState {
    if (state.winner || state.isDraw || !state.players.some((p) => p.id === id)) return state;
    const s = structuredClone(state),
      team = s.players.find((p) => p.id === id)!.team;
    s.winnerIds = s.players.filter((p) => p.team !== team).map((p) => p.id);
    s.winner = s.winnerIds[0];
    s.phase = 'finished';
    s.revision++;
    s.message = msg('Abandono: gana el bando contrario. Las manos permanecen privadas.');
    return s;
  }
  getBotAction(s: BriscaState, id: string): BriscaAction | null {
    if (s.winner || s.isDraw || id !== s.currentTurnPlayerId) return null;
    const view = this.getSanitizedState(s, id);
    if (view.phase === 'round_end') return { type: 'NEXT_ROUND' };
    if (view.phase === 'collect')
      return view.exchangeCard === null
        ? { type: 'COLLECT' }
        : { type: 'EXCHANGE', card: view.exchangeCard };
    const player = view.players.find((p) => p.id === id);
    if (!player || !view.hand.length) return null;
    const current = view.trick.length ? briscaTrickWinner(view.trick, view.trumpSuit) : null,
      partner =
        current !== null && view.players.find((p) => p.id === current)!.team === player.team,
      points = view.trick.reduce((sum, p) => sum + briscaPoints(p.card), 0),
      last = view.trick.length === view.players.length - 1;
    const ranked = view.hand
      .map((card) => {
        const winning =
          view.trick.length &&
          briscaTrickWinner([...view.trick, { playerId: id, card }], view.trumpSuit) === id;
        let value =
          -briscaPoints(card) * 2 -
          briscaStrength(card) * 0.1 -
          (spanishCard(card).suit === view.trumpSuit ? 3 : 0);
        if (partner && last)
          value = briscaPoints(card) * 3 - (spanishCard(card).suit === view.trumpSuit ? 1 : 0);
        else if (winning && points >= 5) value += points * 3 + 8;
        return { card, value: value + this.random() * 0.1 };
      })
      .sort((a, b) => b.value - a.value);
    return { type: 'PLAY', card: ranked[0].card };
  }
}
