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
export const escobaValue = (card: number) => {
  const rank = spanishCard(card).rank;
  return rank >= 10 ? rank - 2 : rank;
};
/** Devuelve capturas de acceso rápido; cualquier otra selección válida también se acepta. */
export function escobaCaptures(card: number, table: readonly number[], limit = 64): number[][] {
  const found: number[][] = [],
    target = 15 - escobaValue(card);
  function visit(start: number, left: number, path: number[]) {
    if (found.length >= limit) return;
    if (left === 0) {
      found.push([...path]);
      return;
    }
    for (let i = start; i < table.length; i++) {
      const value = escobaValue(table[i]);
      if (value <= left) {
        path.push(table[i]);
        visit(i + 1, left - value, path);
        path.pop();
        if (found.length >= limit) return;
      }
    }
  }
  visit(0, target, []);
  return found;
}
export interface EscobaPlayer extends Participant {
  hand: number[];
  captured: number[];
  sweeps: number;
  score: number;
}
export interface EscobaRoundScore {
  playerId: string;
  sweeps: number;
  cards: number;
  coins: number;
  sevens: number;
  sevenCoins: number;
  allSevensBonus: number;
  total: number;
}
export interface EscobaState {
  players: EscobaPlayer[];
  stock: number[];
  table: number[];
  currentTurnPlayerId: string;
  dealer: number;
  round: number;
  lastCapture: string | null;
  lastPlayed: number | null;
  phase: 'play' | 'round_end' | 'finished';
  targetScore: number;
  allSevensBonusEnabled: boolean;
  roundScores: EscobaRoundScore[];
  revision: number;
  winner: string | null;
  winnerIds: string[];
  isDraw: boolean;
  message: GameText;
}
export interface EscobaPublicState extends Omit<EscobaState, 'players' | 'stock'> {
  players: (Omit<EscobaPlayer, 'hand'> & { handCount: number })[];
  hand: number[];
  stockCount: number;
}
export type EscobaAction = { type: 'PLAY'; card: number; take: number[] } | { type: 'NEXT_ROUND' };
export class EscobaEngine implements IGameEngine<EscobaState, EscobaAction, EscobaPublicState> {
  private rules = resolveGameSettings('escoba');
  constructor(private random: RandomSource = systemRandom) {}
  setRules(r: Record<string, unknown>) {
    this.rules = resolveGameSettings('escoba', r);
  }
  private distribute(s: EscobaState) {
    for (let c = 0; c < 3; c++)
      for (let i = 1; i <= s.players.length; i++)
        if (s.stock.length)
          s.players[(s.dealer + i) % s.players.length].hand.push(s.stock.shift()!);
  }
  private deal(s: EscobaState) {
    s.stock = shuffle(spanishDeck(), this.random);
    s.players.forEach((p) => {
      p.hand = [];
      p.captured = [];
      p.sweeps = 0;
    });
    this.distribute(s);
    s.table = s.stock.splice(0, 4);
    s.lastCapture = null;
    s.lastPlayed = null;
    s.roundScores = [];
    s.phase = 'play';
    s.currentTurnPlayerId = s.players[(s.dealer + 1) % s.players.length].id;
    const sum = s.table.reduce((v, c) => v + escobaValue(c), 0);
    if (sum === 15 || sum === 30) {
      const p = s.players[s.dealer];
      p.captured = s.table;
      s.table = [];
      p.sweeps = sum / 15;
      s.lastCapture = p.id;
    }
    s.message = msg('Juega una carta y captura cartas de la mesa que sumen quince con ella.');
  }
  initGame(players: Participant[]): EscobaState {
    const ps = participants(players, 2, 4),
      s: EscobaState = {
        players: ps.map((p) => ({ ...p, hand: [], captured: [], sweeps: 0, score: 0 })),
        stock: [],
        table: [],
        currentTurnPlayerId: ps[0].id,
        dealer: ps.length - 1,
        round: 1,
        lastCapture: null,
        lastPlayed: null,
        phase: 'play',
        targetScore: Number(this.rules.targetScore),
        allSevensBonusEnabled: Boolean(this.rules.allSevensBonus),
        roundScores: [],
        revision: 0,
        winner: null,
        winnerIds: [],
        isDraw: false,
        message: msg('Comienza la Escoba del quince.'),
      };
    this.deal(s);
    return s;
  }
  validateAction(s: EscobaState, id: string, a: EscobaAction): boolean {
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
    if (a.type === 'NEXT_ROUND') return s.phase === 'round_end';
    if (
      a.type !== 'PLAY' ||
      s.phase !== 'play' ||
      !integer(a.card, 0, 39) ||
      !s.players.find((p) => p.id === id)!.hand.includes(a.card) ||
      !Array.isArray(a.take) ||
      a.take.length > 14 ||
      new Set(a.take).size !== a.take.length ||
      a.take.some((c) => !integer(c, 0, 39) || !s.table.includes(c))
    )
      return false;
    return a.take.length
      ? escobaValue(a.card) + a.take.reduce((v, c) => v + escobaValue(c), 0) === 15
      : escobaCaptures(a.card, s.table, 1).length === 0;
  }
  private finishRound(s: EscobaState) {
    const cardCounts = s.players.map((p) => p.captured.length),
      coinCounts = s.players.map(
        (p) => p.captured.filter((c) => spanishCard(c).suit === 'oros').length,
      ),
      sevenCounts = s.players.map(
        (p) => p.captured.filter((c) => spanishCard(c).rank === 7).length,
      );
    s.roundScores = s.players.map((p, i) => {
      const row = {
        playerId: p.id,
        sweeps: p.sweeps,
        cards: Number(cardCounts[i] === Math.max(...cardCounts)),
        coins: Number(coinCounts[i] === Math.max(...coinCounts)),
        sevens: Number(sevenCounts[i] === Math.max(...sevenCounts)),
        sevenCoins: Number(p.captured.includes(6)),
        allSevensBonus: Number(
          s.allSevensBonusEnabled && sevenCounts[i] === 4 && p.captured.includes(6),
        ),
        total: 0,
      };
      row.total =
        row.sweeps + row.cards + row.coins + row.sevens + row.sevenCoins + row.allSevensBonus;
      p.score += row.total;
      return row;
    });
    const max = Math.max(...s.players.map((p) => p.score)),
      leaders = s.players.filter((p) => p.score === max);
    if (max >= s.targetScore && leaders.length === 1) {
      s.winner = leaders[0].id;
      s.winnerIds = [s.winner];
      s.phase = 'finished';
      s.message = msg('Objetivo alcanzado tras contar escobas, cartas, oros y sietes.');
    } else {
      s.phase = 'round_end';
      s.currentTurnPlayerId = s.players[(s.dealer + 2) % s.players.length].id;
      s.message = msg(
        'Reparto contado. Si hay empate en cabeza, se juega otra mano para desempatar.',
      );
    }
  }
  applyAction(state: EscobaState, id: string, a: EscobaAction): EscobaState {
    if (!this.validateAction(state, id, a)) return state;
    const s = structuredClone(state),
      p = s.players.find((p) => p.id === id)!;
    s.revision++;
    if (a.type === 'NEXT_ROUND') {
      s.dealer = (s.dealer + 1) % s.players.length;
      s.round++;
      this.deal(s);
      return s;
    }
    p.hand = p.hand.filter((c) => c !== a.card);
    s.lastPlayed = a.card;
    if (a.take.length) {
      s.table = s.table.filter((c) => !a.take.includes(c));
      p.captured.push(a.card, ...a.take);
      s.lastCapture = id;
      if (!s.table.length) p.sweeps++;
      s.message = msg('Captura de quince confirmada. Escobas de esta mano: {0}.', p.sweeps);
    } else {
      s.table.push(a.card);
      s.message = msg('Sin captura con esa carta: queda descubierta en la mesa.');
    }
    if (s.players.every((p) => !p.hand.length)) {
      if (s.stock.length) this.distribute(s);
      else {
        const last = s.players.find((p) => p.id === s.lastCapture) ?? p;
        last.captured.push(...s.table);
        s.table = [];
        this.finishRound(s);
        return s;
      }
    }
    let i = s.players.findIndex((p) => p.id === id);
    do {
      i = (i + 1) % s.players.length;
    } while (!s.players[i].hand.length);
    s.currentTurnPlayerId = s.players[i].id;
    return s;
  }
  getSanitizedState(s: EscobaState, id: string): EscobaPublicState {
    const { stock, players, ...visible } = structuredClone(s);
    return {
      ...visible,
      players: players.map(({ hand, ...p }) => ({ ...p, handCount: hand.length })),
      hand: players.find((p) => p.id === id)?.hand ?? [],
      stockCount: stock.length,
    };
  }
  checkWinner(s: EscobaState) {
    return s.winner;
  }
  forfeitPlayer(state: EscobaState, id: string): EscobaState {
    if (state.winner || state.isDraw || !state.players.some((p) => p.id === id)) return state;
    const s = structuredClone(state);
    s.revision++;
    s.phase = 'finished';
    if (s.players.length === 2) {
      s.winner = s.players.find((p) => p.id !== id)!.id;
      s.winnerIds = [s.winner];
      s.message = msg('Abandono: gana el rival.');
    } else {
      s.isDraw = true;
      s.message = msg('Partida cerrada por abandono sin puntuar el reparto pendiente.');
    }
    return s;
  }
  getBotAction(s: EscobaState, id: string): EscobaAction | null {
    if (s.winner || s.isDraw || id !== s.currentTurnPlayerId) return null;
    if (s.phase === 'round_end') return { type: 'NEXT_ROUND' };
    const v = this.getSanitizedState(s, id),
      player = s.players.find((p) => p.id === id)!,
      choices = v.hand.flatMap((card) =>
        escobaCaptures(card, v.table).map((take) => {
          const captured = [...player.captured, card, ...take];
          const sevenCount = captured.filter((c) => spanishCard(c).rank === 7).length;
          const completesBonus =
            s.allSevensBonusEnabled && sevenCount === 4 && captured.includes(6);
          return {
            card,
            take,
            value:
              (take.length === v.table.length ? 100 : 0) +
              take.length * 2 +
              (s.allSevensBonusEnabled && sevenCount === 3 ? 3 : 0) +
              [card, ...take].reduce(
                (n, c) =>
                  n +
                  (c === 6
                    ? 15
                    : spanishCard(c).rank === 7
                      ? 4
                      : spanishCard(c).suit === 'oros'
                        ? 2
                        : 0),
                0,
              ) +
              Number(completesBonus) * 20,
          };
        }),
      );
    choices.sort((a, b) => b.value - a.value);
    if (choices.length) return { type: 'PLAY', card: choices[0].card, take: choices[0].take };
    const hand = [...v.hand].sort(
      (a, b) =>
        (spanishCard(a).suit === 'oros' ? 10 : 0) +
        (spanishCard(a).rank === 7 ? 15 : 0) -
        (spanishCard(b).suit === 'oros' ? 10 : 0) -
        (spanishCard(b).rank === 7 ? 15 : 0),
    );
    return hand.length ? { type: 'PLAY', card: hand[0], take: [] } : null;
  }
}
