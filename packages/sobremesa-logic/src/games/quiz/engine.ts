import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  integer,
  shuffle,
  systemRandom,
  type Participant,
  type RandomSource,
} from '../../engine/helpers.js';
import { resolveGameSettings } from '../../settings.js';
import { message as msg, type GameText } from '../../messages.js';
export interface QuizQuestion {
  id: string;
  category: string;
  prompt: { es: string; en: string };
  choices: { es: string[]; en: string[] };
  answer: number;
}
export interface QuizState {
  players: (Participant & { score: number; answered: number; left: boolean })[];
  deck: QuizQuestion[];
  question: QuizQuestion;
  phase: 'question' | 'review' | 'finished';
  currentTurnPlayerId: string;
  questionsPerPlayer: number;
  chosen: number | null;
  correct: boolean | null;
  revision: number;
  winner: string | null;
  winnerIds: string[];
  isDraw: boolean;
  message: GameText;
}
export interface QuizPublicState extends Omit<QuizState, 'deck' | 'question'> {
  question: Omit<QuizQuestion, 'answer'> & { answer: number | null };
  remainingQuestions: number;
}
export type QuizAction = { type: 'ANSWER'; index: number } | { type: 'SKIP' | 'NEXT' };
export class QuizEngine implements IGameEngine<QuizState, QuizAction, QuizPublicState> {
  private rules = resolveGameSettings('quiz');
  constructor(
    private random: RandomSource = systemRandom,
    private bank: readonly QuizQuestion[] = [],
  ) {}
  setRules(r: Record<string, unknown>) {
    this.rules = resolveGameSettings('quiz', r);
  }
  initGame(players: Participant[]): QuizState {
    const ps = participants(players, 2, 8),
      count = Number(this.rules.questionsPerPlayer);
    if (this.bank.length < ps.length * count) throw new Error('Banco de preguntas insuficiente');
    // Alterna categorías y baraja tanto las preguntas como las opciones.
    const categories = shuffle([...new Set(this.bank.map((q) => q.category))], this.random),
      groups = categories.map((c) =>
        shuffle(
          this.bank.filter((q) => q.category === c),
          this.random,
        ),
      ),
      deck: QuizQuestion[] = [];
    while (groups.some((g) => g.length))
      for (const group of groups)
        if (group.length) {
          const original = group.pop()!,
            order = shuffle([0, 1, 2, 3], this.random);
          deck.push({
            ...structuredClone(original),
            choices: {
              es: order.map((i) => original.choices.es[i]),
              en: order.map((i) => original.choices.en[i]),
            },
            answer: order.indexOf(original.answer),
          });
        }
    return {
      players: ps.map((p) => ({ ...p, score: 0, answered: 0, left: false })),
      deck,
      question: deck.shift()!,
      phase: 'question',
      currentTurnPlayerId: ps[0].id,
      questionsPerPlayer: count,
      chosen: null,
      correct: null,
      revision: 0,
      winner: null,
      winnerIds: [],
      isDraw: false,
      message: msg('Elige una respuesta. Cada acierto suma diez puntos.'),
    };
  }
  validateAction(s: QuizState, id: string, a: QuizAction): boolean {
    if (
      !a ||
      typeof a !== 'object' ||
      Array.isArray(a) ||
      s.winner ||
      s.isDraw ||
      id !== s.currentTurnPlayerId ||
      !s.players.some((p) => p.id === id && !p.left)
    )
      return false;
    return s.phase === 'review'
      ? a.type === 'NEXT'
      : s.phase === 'question' &&
          (a.type === 'SKIP' || (a.type === 'ANSWER' && integer(a.index, 0, 3)));
  }
  private finish(s: QuizState) {
    const active = s.players.filter((p) => !p.left),
      best = Math.max(...active.map((p) => p.score));
    s.winnerIds = active.filter((p) => p.score === best).map((p) => p.id);
    s.winner = s.winnerIds[0] ?? null;
    s.isDraw = !s.winner;
    s.phase = 'finished';
    s.message = msg('Preguntas completadas. Los empates en puntos comparten la victoria.');
  }
  private next(s: QuizState) {
    if (s.players.filter((p) => !p.left).every((p) => p.answered >= s.questionsPerPlayer)) {
      this.finish(s);
      return;
    }
    let i = s.players.findIndex((p) => p.id === s.currentTurnPlayerId);
    do {
      i = (i + 1) % s.players.length;
    } while (s.players[i].left || s.players[i].answered >= s.questionsPerPlayer);
    s.currentTurnPlayerId = s.players[i].id;
    s.question = s.deck.shift()!;
    s.phase = 'question';
    s.chosen = null;
    s.correct = null;
    s.message = msg('Nueva pregunta: el resto de participantes espera su turno.');
  }
  applyAction(state: QuizState, id: string, a: QuizAction): QuizState {
    if (!this.validateAction(state, id, a)) return state;
    const s = structuredClone(state);
    s.revision++;
    if (a.type === 'NEXT') {
      this.next(s);
      return s;
    }
    s.chosen = a.type === 'ANSWER' ? a.index : null;
    s.correct = s.chosen === s.question.answer;
    s.phase = 'review';
    const p = s.players.find((p) => p.id === id)!;
    p.answered++;
    if (s.correct) p.score += 10;
    s.message = s.correct
      ? msg('Respuesta correcta: diez puntos.')
      : msg('Sin puntos esta vez. Revisa la respuesta antes de continuar.');
    return s;
  }
  getSanitizedState(s: QuizState, _id: string): QuizPublicState {
    const { deck: _deck, question, ...visible } = structuredClone(s);
    return {
      ...visible,
      question: { ...question, answer: s.phase === 'question' ? null : question.answer },
      remainingQuestions: Math.max(
        0,
        s.players.filter((p) => !p.left).reduce((n, p) => n + s.questionsPerPlayer - p.answered, 0),
      ),
    };
  }
  checkWinner(s: QuizState) {
    return s.winner;
  }
  forfeitPlayer(state: QuizState, id: string): QuizState {
    if (state.winner || state.isDraw || !state.players.some((p) => p.id === id && !p.left))
      return state;
    const s = structuredClone(state);
    s.revision++;
    s.players.find((p) => p.id === id)!.left = true;
    if (s.players.filter((p) => !p.left).length <= 1) this.finish(s);
    else if (s.currentTurnPlayerId === id) this.next(s);
    return s;
  }
  getBotAction(s: QuizState, id: string): QuizAction | null {
    if (s.winner || s.isDraw || s.currentTurnPlayerId !== id) return null;
    // No consulta la solución: responde al azar entre las cuatro opciones públicas.
    return s.phase === 'review'
      ? { type: 'NEXT' }
      : { type: 'ANSWER', index: Math.min(3, Math.floor(this.random() * 4)) };
  }
}
