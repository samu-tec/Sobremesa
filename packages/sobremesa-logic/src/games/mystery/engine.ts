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
export const MYSTERY_CARDS = [
  'Iria, la cartógrafa',
  'Nuno, el ceramista',
  'Vera, la botánica',
  'Luar, el mecánico',
  'Dara, la mensajera',
  'Teo, el astrónomo',
  'Faro de las Mareas',
  'Taller del Viento',
  'Jardín de Cristal',
  'Archivo de Bruma',
  'Patio de las Linternas',
  'Observatorio Azul',
  'Sello de cobre',
  'Llave de nácar',
  'Brújula de vidrio',
  'Cinta de seda',
  'Campana de plata',
  'Disco de obsidiana',
] as const;
export type MysteryTriple = [number, number, number];
export interface MysteryProof {
  by: string;
  card: number;
  turn: number;
}
export interface MysteryState {
  players: (Participant & { hand: number[]; eliminated: boolean; score: number })[];
  solution: MysteryTriple;
  proofs: Record<string, MysteryProof[]>;
  currentTurnPlayerId: string;
  investigatorId: string;
  phase: 'investigate' | 'refute' | 'conclude' | 'finished';
  hypothesis: {
    cards: MysteryTriple;
    by: string;
    refuterId: string | null;
    passedIds: string[];
  } | null;
  lastAccusation: { cards: MysteryTriple; by: string; correct: boolean } | null;
  turn: number;
  revision: number;
  winner: string | null;
  winnerIds: string[];
  isDraw: boolean;
  message: GameText;
}
export interface MysteryPublicState extends Omit<MysteryState, 'players' | 'solution' | 'proofs'> {
  players: (Participant & { handCount: number; eliminated: boolean; score: number })[];
  hand: number[];
  proofs: MysteryProof[];
  solution: MysteryTriple | null;
  showable: number[];
}
export type MysteryAction =
  | { type: 'HYPOTHESIS' | 'ACCUSE'; cards: MysteryTriple }
  | { type: 'SHOW'; card: number }
  | { type: 'END_TURN' };
const triple = (cards: unknown): cards is MysteryTriple =>
  Array.isArray(cards) && cards.length === 3 && cards.every((c, i) => integer(c, i * 6, i * 6 + 5));
export class MysteryEngine implements IGameEngine<MysteryState, MysteryAction, MysteryPublicState> {
  constructor(private random: RandomSource = systemRandom) {}
  initGame(players: Participant[]): MysteryState {
    const ps = participants(players, 3, 6).map((p) => ({
        ...p,
        hand: [] as number[],
        eliminated: false,
        score: 0,
      })),
      solution = [0, 1, 2].map(
        (c) => c * 6 + Math.min(5, Math.floor(this.random() * 6)),
      ) as MysteryTriple;
    shuffle(
      Array.from({ length: 18 }, (_, i) => i).filter((c) => !solution.includes(c)),
      this.random,
    ).forEach((c, i) => ps[i % ps.length].hand.push(c));
    return {
      players: ps,
      solution,
      proofs: Object.fromEntries(ps.map((p) => [p.id, []])),
      currentTurnPlayerId: ps[0].id,
      investigatorId: ps[0].id,
      phase: 'investigate',
      hypothesis: null,
      lastAccusation: null,
      turn: 1,
      revision: 0,
      winner: null,
      winnerIds: [],
      isDraw: false,
      message: msg(
        'La lente del faro ha desaparecido. Averigua quién la movió, dónde y con qué objeto.',
      ),
    };
  }
  validateAction(s: MysteryState, id: string, a: MysteryAction): boolean {
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
    if (s.phase === 'refute')
      return (
        a.type === 'SHOW' &&
        integer(a.card, 0, 17) &&
        p.hand.includes(a.card) &&
        Boolean(s.hypothesis?.cards.includes(a.card))
      );
    if (p.eliminated || (s.phase !== 'investigate' && s.phase !== 'conclude')) return false;
    if (a.type === 'END_TURN') return true;
    if (a.type === 'ACCUSE') return triple(a.cards);
    return a.type === 'HYPOTHESIS' && s.phase === 'investigate' && triple(a.cards);
  }
  private next(s: MysteryState) {
    if (s.players.every((p) => p.eliminated)) {
      s.isDraw = true;
      s.phase = 'finished';
      s.message = msg('Todas las acusaciones fallaron. El misterio queda sin resolver.');
      return;
    }
    let i = s.players.findIndex((p) => p.id === s.investigatorId);
    do {
      i = (i + 1) % s.players.length;
    } while (s.players[i].eliminated);
    s.investigatorId = s.players[i].id;
    s.currentTurnPlayerId = s.investigatorId;
    s.phase = 'investigate';
    s.hypothesis = null;
    s.turn++;
    s.message = msg('Formula una hipótesis para buscar pistas o confirma tu acusación final.');
  }
  applyAction(state: MysteryState, id: string, a: MysteryAction): MysteryState {
    if (!this.validateAction(state, id, a)) return state;
    const s = structuredClone(state);
    s.revision++;
    if (a.type === 'END_TURN') {
      this.next(s);
      return s;
    }
    if (a.type === 'SHOW') {
      if (!s.proofs[s.investigatorId].some((p) => p.card === a.card))
        s.proofs[s.investigatorId].push({ by: id, card: a.card, turn: s.turn });
      s.currentTurnPlayerId = s.investigatorId;
      s.phase = 'conclude';
      s.message = msg(
        'La pista mostrada solo la conoce quien investiga. Puedes acusar o terminar tu turno.',
      );
      return s;
    }
    if (a.type === 'ACCUSE') {
      const correct = a.cards.every((c, i) => c === s.solution[i]);
      s.lastAccusation = { cards: [...a.cards], by: id, correct };
      if (correct) {
        s.winner = id;
        s.winnerIds = [id];
        s.players.find((p) => p.id === id)!.score = 1;
        s.phase = 'finished';
        s.message = msg('¡Misterio resuelto! La acusación coincide con las tres cartas secretas.');
      } else {
        s.players.find((p) => p.id === id)!.eliminated = true;
        this.next(s);
        if (!s.isDraw)
          s.message = msg(
            'Acusación incorrecta: dejas de investigar, pero sigues mostrando pistas cuando corresponde.',
          );
      }
      return s;
    }
    const index = s.players.findIndex((p) => p.id === id),
      passedIds: string[] = [];
    let refuterId: string | null = null;
    for (let offset = 1; offset < s.players.length; offset++) {
      const p = s.players[(index + offset) % s.players.length];
      if (p.hand.some((c) => a.cards.includes(c))) {
        refuterId = p.id;
        break;
      }
      passedIds.push(p.id);
    }
    s.hypothesis = { cards: [...a.cards], by: id, refuterId, passedIds };
    if (refuterId) {
      s.phase = 'refute';
      s.currentTurnPlayerId = refuterId;
      s.message = msg(
        'La primera persona con una carta de la hipótesis elige qué pista mostrar en privado.',
      );
    } else {
      s.phase = 'conclude';
      s.message = msg(
        'Nadie puede refutar la hipótesis. Revisa también tus propias cartas antes de acusar.',
      );
    }
    return s;
  }
  getSanitizedState(s: MysteryState, id: string): MysteryPublicState {
    const { players, solution, proofs, ...visible } = structuredClone(s),
      hand = players.find((p) => p.id === id)?.hand ?? [];
    return {
      ...visible,
      players: players.map(({ hand, ...p }) => ({ ...p, handCount: hand.length })),
      hand,
      proofs: proofs[id] ?? [],
      solution: s.winner || s.isDraw ? solution : null,
      showable:
        s.phase === 'refute' && s.currentTurnPlayerId === id
          ? hand.filter((c) => s.hypothesis!.cards.includes(c))
          : [],
    };
  }
  checkWinner(s: MysteryState) {
    return s.winner;
  }
  forfeitPlayer(state: MysteryState, id: string): MysteryState {
    if (state.winner || state.isDraw || !state.players.some((p) => p.id === id)) return state;
    // No se publican cartas de quien abandona ni se simulan respuestas en su nombre.
    return {
      ...structuredClone(state),
      isDraw: true,
      phase: 'finished',
      revision: state.revision + 1,
      message: msg('Investigación cerrada por abandono. Las pistas de las manos siguen privadas.'),
    };
  }
  getBotAction(s: MysteryState, id: string): MysteryAction | null {
    if (s.winner || s.isDraw || s.currentTurnPlayerId !== id) return null;
    const v = this.getSanitizedState(s, id);
    if (v.phase === 'refute') return { type: 'SHOW', card: v.showable[0] };
    const known = new Set([...v.hand, ...v.proofs.map((p) => p.card)]),
      possible = [0, 1, 2].map((cat) =>
        Array.from({ length: 6 }, (_, i) => cat * 6 + i).filter((c) => !known.has(c)),
      );
    if (possible.every((p) => p.length === 1))
      return { type: 'ACCUSE', cards: possible.map((p) => p[0]) as MysteryTriple };
    if (v.phase === 'conclude')
      return v.hypothesis &&
        !v.hypothesis.refuterId &&
        !v.hypothesis.cards.some((c) => v.hand.includes(c))
        ? { type: 'ACCUSE', cards: v.hypothesis.cards }
        : { type: 'END_TURN' };
    return {
      type: 'HYPOTHESIS',
      cards: possible.map(
        (p) => p[Math.min(p.length - 1, Math.floor(this.random() * p.length))],
      ) as MysteryTriple,
    };
  }
}
