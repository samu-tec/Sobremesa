import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  integer,
  shuffle,
  systemRandom,
  type Participant,
  type RandomSource,
} from '../../engine/helpers.js';
import { spanishDeck } from '../spanish-cards.js';
import { message as msg, type GameText } from '../../messages.js';
export interface CinquilloState {
  players: (Participant & { hand: number[]; score: number })[];
  lanes: ([number, number] | null)[];
  started: boolean;
  currentTurnPlayerId: string;
  revision: number;
  winner: string | null;
  winnerIds: string[];
  isDraw: boolean;
  message: GameText;
}
export interface CinquilloPublicState extends Omit<CinquilloState, 'players'> {
  players: (Participant & { handCount: number; score: number })[];
  hand: number[];
  legalCards: number[];
}
export type CinquilloAction = { type: 'PLAY'; card: number } | { type: 'PASS' };
export function cinquilloCanPlay(
  s: Pick<CinquilloState, 'lanes' | 'started'>,
  card: number,
): boolean {
  if (!integer(card, 0, 39)) return false;
  if (!s.started) return card === 4;
  const lane = s.lanes[Math.floor(card / 10)],
    rank = card % 10;
  return lane === null ? rank === 4 : rank === lane[0] - 1 || rank === lane[1] + 1;
}
export class CinquilloEngine implements IGameEngine<
  CinquilloState,
  CinquilloAction,
  CinquilloPublicState
> {
  constructor(private random: RandomSource = systemRandom) {}
  initGame(players: Participant[]): CinquilloState {
    const ps = participants(players, 3, 6).map((p) => ({ ...p, hand: [] as number[], score: 0 }));
    shuffle(spanishDeck(), this.random).forEach((c, i) => ps[i % ps.length].hand.push(c));
    ps.forEach((p) => p.hand.sort((a, b) => a - b));
    return {
      players: ps,
      lanes: [null, null, null, null],
      started: false,
      currentTurnPlayerId: ps.find((p) => p.hand.includes(4))!.id,
      revision: 0,
      winner: null,
      winnerIds: [],
      isDraw: false,
      message: msg('Empieza quien tiene el cinco de oros.'),
    };
  }
  validateAction(s: CinquilloState, id: string, a: CinquilloAction): boolean {
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
    if (!p) return false;
    if (a.type === 'PASS') return !p.hand.some((c) => cinquilloCanPlay(s, c));
    return (
      a.type === 'PLAY' &&
      integer(a.card, 0, 39) &&
      p.hand.includes(a.card) &&
      cinquilloCanPlay(s, a.card)
    );
  }
  applyAction(state: CinquilloState, id: string, a: CinquilloAction): CinquilloState {
    if (!this.validateAction(state, id, a)) return state;
    const s = structuredClone(state),
      index = s.players.findIndex((p) => p.id === id),
      p = s.players[index];
    s.revision++;
    if (a.type === 'PLAY') {
      p.hand = p.hand.filter((c) => c !== a.card);
      const suit = Math.floor(a.card / 10),
        rank = a.card % 10,
        lane = s.lanes[suit];
      s.lanes[suit] = lane ? [Math.min(lane[0], rank), Math.max(lane[1], rank)] : [rank, rank];
      s.started = true;
      if (!p.hand.length) {
        p.score = 1;
        s.winner = id;
        s.winnerIds = [id];
        s.message = msg('¡Mano vacía! Has colocado tu última carta.');
        return s;
      }
      s.message = msg('Continúa el siguiente asiento: abre un cinco o amplía un extremo.');
    } else s.message = msg('Pasa sin cartas que se puedan colocar.');
    s.currentTurnPlayerId = s.players[(index + 1) % s.players.length].id;
    return s;
  }
  getSanitizedState(s: CinquilloState, id: string): CinquilloPublicState {
    const { players, ...visible } = structuredClone(s),
      hand = players.find((p) => p.id === id)?.hand ?? [];
    return {
      ...visible,
      players: players.map(({ hand, ...p }) => ({ ...p, handCount: hand.length })),
      hand,
      legalCards:
        s.winner || s.isDraw || id !== s.currentTurnPlayerId
          ? []
          : hand.filter((c) => cinquilloCanPlay(s, c)),
    };
  }
  checkWinner(s: CinquilloState) {
    return s.winner;
  }
  forfeitPlayer(state: CinquilloState, id: string): CinquilloState {
    if (state.winner || state.isDraw || !state.players.some((p) => p.id === id)) return state;
    return {
      ...structuredClone(state),
      revision: state.revision + 1,
      isDraw: true,
      message: msg('Partida cerrada por abandono: las cartas restantes siguen privadas.'),
    };
  }
  getBotAction(s: CinquilloState, id: string): CinquilloAction | null {
    if (s.winner || s.isDraw || id !== s.currentTurnPlayerId) return null;
    const v = this.getSanitizedState(s, id);
    // Favorece las cartas que abren camino a extremos de la propia mano.
    const weight = (card: number) =>
      v.hand.filter(
        (c) =>
          Math.floor(c / 10) === Math.floor(card / 10) &&
          ((card % 10 <= 4 && c % 10 < card % 10) || (card % 10 >= 4 && c % 10 > card % 10)),
      ).length;
    v.legalCards.sort((a, b) => weight(b) - weight(a) || a - b);
    return v.legalCards.length ? { type: 'PLAY', card: v.legalCards[0] } : { type: 'PASS' };
  }
}
