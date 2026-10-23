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
export interface DrawWord {
  es: string;
  en: string;
}
export interface DrawStroke {
  points: [number, number][];
  color: number;
  width: number;
}
export const DRAW_COLORS = [
  '#202e29',
  '#bf3542',
  '#286aa0',
  '#398142',
  '#e4b52b',
  '#985ca2',
  '#e27c31',
  '#ffffff',
] as const;
const normalize = (word: string) =>
  word
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, ' ');
export interface DrawingState {
  players: (Participant & { score: number; left: boolean })[];
  deck: DrawWord[];
  choices: DrawWord[];
  secret: DrawWord | null;
  order: string[];
  turnIndex: number;
  cycles: number;
  drawSeconds: number;
  currentTurnPlayerId: string;
  phase: 'choose' | 'draw' | 'review' | 'finished';
  strokes: DrawStroke[];
  guessed: string[];
  attempts: Record<string, number>;
  lastGuessAt: Record<string, number>;
  lastMarkAt: number;
  guesses: { playerId: string; text: string | null; correct: boolean }[];
  revision: number;
  winner: string | null;
  winnerIds: string[];
  isDraw: boolean;
  message: GameText;
}
export interface DrawingPublicState extends Omit<
  DrawingState,
  'deck' | 'choices' | 'secret' | 'lastGuessAt' | 'lastMarkAt'
> {
  choices: DrawWord[];
  word: DrawWord | null;
  wordLength: { es: number; en: number } | null;
}
export type DrawingAction =
  | { type: 'CHOOSE'; index: number }
  | { type: 'STROKE'; stroke: DrawStroke }
  | { type: 'GUESS'; text: string }
  | { type: 'CLEAR' | 'END' | 'NEXT' };
export class DrawingEngine implements IGameEngine<DrawingState, DrawingAction, DrawingPublicState> {
  private rules = resolveGameSettings('drawing');
  constructor(
    private random: RandomSource = systemRandom,
    private bank: readonly DrawWord[] = [],
    private now: () => number = Date.now,
  ) {}
  setRules(r: Record<string, unknown>) {
    this.rules = resolveGameSettings('drawing', r);
  }
  private begin(s: DrawingState) {
    s.currentTurnPlayerId = s.order[s.turnIndex];
    s.choices = s.deck.splice(0, 3);
    s.secret = null;
    s.phase = 'choose';
    s.strokes = [];
    s.guessed = [];
    s.attempts = {};
    s.lastGuessAt = {};
    s.lastMarkAt = -1e15;
    s.guesses = [];
    s.message = msg('El dibujante elige una palabra. Las demás personas esperan sin verla.');
  }
  initGame(players: Participant[]): DrawingState {
    const ps = participants(players, 3, 10),
      cycles = Number(this.rules.drawCycles);
    if (ps.some((p) => p.isBot)) throw new Error('Este juego requiere participantes humanos.');
    if (this.bank.length < ps.length * cycles * 3) throw new Error('Banco de dibujo insuficiente');
    const s: DrawingState = {
      players: ps.map((p) => ({ ...p, score: 0, left: false })),
      deck: shuffle([...this.bank], this.random),
      choices: [],
      secret: null,
      order: Array.from({ length: cycles }, () => ps.map((p) => p.id)).flat(),
      turnIndex: 0,
      cycles,
      drawSeconds: Number(this.rules.drawSeconds),
      currentTurnPlayerId: ps[0].id,
      phase: 'choose',
      strokes: [],
      guessed: [],
      attempts: {},
      lastGuessAt: {},
      lastMarkAt: -1e15,
      guesses: [],
      revision: 0,
      winner: null,
      winnerIds: [],
      isDraw: false,
      message: msg('Dibuja sin escribir la palabra ni sus letras.'),
    };
    this.begin(s);
    return s;
  }
  validateAction(s: DrawingState, id: string, a: DrawingAction): boolean {
    if (
      !a ||
      typeof a !== 'object' ||
      Array.isArray(a) ||
      s.winner ||
      s.isDraw ||
      !s.players.some((p) => p.id === id && !p.left)
    )
      return false;
    if (a.type === 'GUESS')
      return (
        s.phase === 'draw' &&
        id !== s.currentTurnPlayerId &&
        !s.guessed.includes(id) &&
        (s.attempts[id] ?? 0) < 12 &&
        this.now() - (s.lastGuessAt[id] ?? -1e15) >= 1000 &&
        typeof a.text === 'string' &&
        a.text.trim().length >= 1 &&
        a.text.length <= 50 &&
        !/[\p{Cc}\p{Cf}]/u.test(a.text)
      );
    if (id !== s.currentTurnPlayerId) return false;
    if (a.type === 'CHOOSE')
      return s.phase === 'choose' && integer(a.index, 0, s.choices.length - 1);
    if (a.type === 'NEXT') return s.phase === 'review';
    if (s.phase !== 'draw') return false;
    if (a.type === 'END') return true;
    if (this.now() - s.lastMarkAt < 250) return false;
    if (a.type === 'CLEAR') return s.strokes.length > 0;
    if (a.type !== 'STROKE' || s.strokes.length >= 120 || !a.stroke || typeof a.stroke !== 'object')
      return false;
    const st = a.stroke;
    return (
      integer(st.color, 0, 7) &&
      integer(st.width, 1, 20) &&
      Array.isArray(st.points) &&
      st.points.length >= 1 &&
      st.points.length <= 48 &&
      st.points.every(
        (p) => Array.isArray(p) && p.length === 2 && p.every((n) => integer(n, 0, 1000)),
      )
    );
  }
  private finish(s: DrawingState) {
    const active = s.players.filter((p) => !p.left),
      best = Math.max(...active.map((p) => p.score));
    s.winnerIds = active.filter((p) => p.score === best).map((p) => p.id);
    s.winner = s.winnerIds[0] ?? null;
    s.isDraw = !s.winner;
    s.phase = 'finished';
    s.message = msg('Dibujos completados. Gana la mayor puntuación y los empates se comparten.');
  }
  private next(s: DrawingState) {
    do {
      s.turnIndex++;
    } while (
      s.turnIndex < s.order.length &&
      s.players.some((p) => p.id === s.order[s.turnIndex] && p.left)
    );
    if (s.turnIndex >= s.order.length) this.finish(s);
    else this.begin(s);
  }
  applyAction(state: DrawingState, id: string, a: DrawingAction): DrawingState {
    if (!this.validateAction(state, id, a)) return state;
    const s = structuredClone(state);
    s.revision++;
    if (a.type === 'CHOOSE') {
      s.secret = s.choices[a.index];
      s.choices = [];
      s.phase = 'draw';
      s.message = msg(
        'Dibuja el concepto sin letras. Las respuestas correctas no se muestran al resto.',
      );
    } else if (a.type === 'STROKE') {
      s.strokes.push(structuredClone(a.stroke));
      s.lastMarkAt = this.now();
    } else if (a.type === 'CLEAR') {
      s.strokes = [];
      s.lastMarkAt = this.now();
    } else if (a.type === 'END') {
      s.phase = 'review';
      s.message = msg('Tiempo de dibujo terminado. Esta era la palabra.');
    } else if (a.type === 'NEXT') this.next(s);
    else if (a.type === 'GUESS') {
      s.attempts[id] = (s.attempts[id] ?? 0) + 1;
      s.lastGuessAt[id] = this.now();
      const text = a.text.trim(),
        correct =
          normalize(text) === normalize(s.secret!.es) ||
          normalize(text) === normalize(s.secret!.en);
      s.guesses.push({ playerId: id, text: correct ? null : text, correct });
      if (correct) {
        s.players.find((p) => p.id === id)!.score += Math.max(40, 100 - s.guessed.length * 10);
        s.players.find((p) => p.id === s.currentTurnPlayerId)!.score += 40;
        s.guessed.push(id);
      }
      if (
        s.players
          .filter((p) => !p.left && p.id !== s.currentTurnPlayerId)
          .every((p) => s.guessed.includes(p.id))
      ) {
        s.phase = 'review';
        s.message = msg('¡Todos han acertado! Revisa la palabra antes del siguiente dibujo.');
      }
    }
    return s;
  }
  getSanitizedState(s: DrawingState, id: string): DrawingPublicState {
    const {
      deck: _deck,
      choices,
      secret,
      lastGuessAt: _guesses,
      lastMarkAt: _marks,
      ...visible
    } = s;
    return structuredClone({
      ...visible,
      choices: s.phase === 'choose' && id === s.currentTurnPlayerId ? choices : [],
      word:
        id === s.currentTurnPlayerId || s.phase === 'review' || s.phase === 'finished'
          ? secret
          : null,
      wordLength: secret ? { es: secret.es.length, en: secret.en.length } : null,
    });
  }
  checkWinner(s: DrawingState) {
    return s.winner;
  }
  forfeitPlayer(state: DrawingState, id: string): DrawingState {
    if (state.winner || state.isDraw || !state.players.some((p) => p.id === id && !p.left))
      return state;
    const s = structuredClone(state);
    s.revision++;
    s.players.find((p) => p.id === id)!.left = true;
    if (s.players.filter((p) => !p.left).length < 3) {
      s.isDraw = true;
      s.phase = 'finished';
      s.secret = null;
      s.message = msg('Partida cerrada: hacen falta al menos tres participantes humanos.');
    } else if (s.currentTurnPlayerId === id) this.next(s);
    else if (
      s.phase === 'draw' &&
      s.players
        .filter((p) => !p.left && p.id !== s.currentTurnPlayerId)
        .every((p) => s.guessed.includes(p.id))
    )
      s.phase = 'review';
    return s;
  }
  getBotAction(_s: DrawingState, _id: string): DrawingAction | null {
    return null;
  }
}
