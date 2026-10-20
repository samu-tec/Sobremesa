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
export const WORDS_SIZE = 11;
export type WordLanguage = 'es' | 'en';
export const normalizeWord = (s: string) =>
  s
    .toUpperCase()
    .replaceAll('Ñ', '~')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('~', 'Ñ');
export const letterPoints = (letter: string) =>
  'AEIOU'.includes(letter)
    ? 1
    : 'RSTNLD'.includes(letter)
      ? 2
      : 'BCGMP'.includes(letter)
        ? 3
        : 'FHVY'.includes(letter)
          ? 4
          : 5;
export interface WordLexicon {
  es: ReadonlySet<string>;
  en: ReadonlySet<string>;
}
export interface WordPlacement {
  rackIndex: number;
  row: number;
  col: number;
}
export interface WordsState {
  players: (Participant & { hand: string[]; score: number })[];
  bag: string[];
  board: (string | null)[];
  language: WordLanguage;
  currentTurnPlayerId: string;
  quietTurns: number;
  lastWords: { word: string; score: number }[];
  revision: number;
  winner: string | null;
  winnerIds: string[];
  isDraw: boolean;
  message: GameText;
}
export interface WordsPublicState extends Omit<WordsState, 'players' | 'bag'> {
  players: (Participant & { handCount: number; score: number })[];
  hand: string[];
  bagCount: number;
}
export type WordsAction =
  | { type: 'PLACE'; tiles: WordPlacement[] }
  | { type: 'EXCHANGE'; indices: number[] }
  | { type: 'PASS' };
export interface WordsMove {
  board: (string | null)[];
  words: { word: string; score: number }[];
  score: number;
}
/** Comprueba geometría y forma palabras; el diccionario se consulta únicamente en el servidor. */
export function analyzeWordsMove(
  s: Pick<WordsState, 'board'>,
  hand: readonly string[],
  tiles: readonly WordPlacement[],
): WordsMove | null {
  if (!Array.isArray(tiles) || tiles.length < 1 || tiles.length > 7) return null;
  const positions = new Set<number>(),
    indices = new Set<number>();
  for (const tile of tiles) {
    if (
      !tile ||
      typeof tile !== 'object' ||
      !integer(tile.row, 0, 10) ||
      !integer(tile.col, 0, 10) ||
      !integer(tile.rackIndex, 0, hand.length - 1)
    )
      return null;
    const pos = tile.row * 11 + tile.col;
    if (positions.has(pos) || indices.has(tile.rackIndex) || s.board[pos] !== null) return null;
    positions.add(pos);
    indices.add(tile.rackIndex);
  }
  const sameRow = tiles.every((t) => t.row === tiles[0].row),
    sameCol = tiles.every((t) => t.col === tiles[0].col);
  if (!sameRow && !sameCol) return null;
  const board = [...s.board];
  tiles.forEach((t) => (board[t.row * 11 + t.col] = hand[t.rackIndex]));
  if (tiles.length > 1) {
    const step = sameRow ? 1 : 11,
      sorted = [...positions].sort((a, b) => a - b);
    for (let i = sorted[0]; i <= sorted[sorted.length - 1]; i += step)
      if (board[i] === null) return null;
  }
  const empty = s.board.every((c) => c === null);
  if (empty && !positions.has(60)) return null;
  if (
    !empty &&
    ![...positions].some((pos) =>
      [pos % 11 > 0 ? pos - 1 : -1, pos % 11 < 10 ? pos + 1 : -1, pos - 11, pos + 11].some(
        (n) => n >= 0 && n < 121 && s.board[n] !== null,
      ),
    )
  )
    return null;
  const found = new Map<string, { word: string; score: number }>();
  for (const pos of positions)
    for (const vertical of [false, true]) {
      const step = vertical ? 11 : 1;
      let start = pos,
        end = pos;
      while (start - step >= 0 && (vertical || start % 11 > 0) && board[start - step] !== null)
        start -= step;
      while (end + step < 121 && (vertical || end % 11 < 10) && board[end + step] !== null)
        end += step;
      if (end === start) continue;
      let word = '',
        score = 0;
      for (let i = start; i <= end; i += step) {
        word += board[i]!;
        score += letterPoints(board[i]!);
      }
      found.set(`${start}:${step}`, { word, score });
    }
  if (!found.size) return null;
  const words = [...found.values()];
  return {
    board,
    words,
    score: words.reduce((sum, w) => sum + w.score, 0) + (tiles.length === 7 ? 10 : 0),
  };
}
export class WordsEngine implements IGameEngine<WordsState, WordsAction, WordsPublicState> {
  private rules = resolveGameSettings('words');
  constructor(
    private random: RandomSource = systemRandom,
    private lexicon?: WordLexicon,
  ) {}
  setRules(r: Record<string, unknown>) {
    this.rules = resolveGameSettings('words', r);
  }
  private draw(s: WordsState, p: WordsState['players'][number]) {
    while (p.hand.length < 7 && s.bag.length) p.hand.push(s.bag.pop()!);
  }
  initGame(players: Participant[]): WordsState {
    if (!this.lexicon) throw new Error('Falta el diccionario local');
    const language: WordLanguage = this.rules.wordLanguage === 1 ? 'en' : 'es',
      alphabet = language === 'es' ? 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      bag = alphabet
        .split('')
        .flatMap((letter) =>
          Array.from(
            { length: 'AEIOU'.includes(letter) ? 8 : 'RSTNLD'.includes(letter) ? 4 : 2 },
            () => letter,
          ),
        ),
      ps = participants(players, 2, 4),
      s: WordsState = {
        players: ps.map((p) => ({ ...p, hand: [], score: 0 })),
        bag: shuffle(bag, this.random),
        board: Array.from({ length: 121 }, () => null),
        language,
        currentTurnPlayerId: ps[0].id,
        quietTurns: 0,
        lastWords: [],
        revision: 0,
        winner: null,
        winnerIds: [],
        isDraw: false,
        message: msg(
          'La primera palabra debe pasar por el centro. Las palabras tienen al menos dos letras.',
        ),
      };
    s.players.forEach((p) => this.draw(s, p));
    return s;
  }
  private move(s: WordsState, id: string, tiles: WordPlacement[]) {
    const move = analyzeWordsMove(s, s.players.find((p) => p.id === id)!.hand, tiles);
    return move && move.words.every((w) => this.lexicon?.[s.language].has(w.word)) ? move : null;
  }
  validateAction(s: WordsState, id: string, a: WordsAction): boolean {
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
    if (a.type === 'PASS') return true;
    if (a.type === 'EXCHANGE')
      return (
        s.bag.length >= 7 &&
        Array.isArray(a.indices) &&
        a.indices.length > 0 &&
        a.indices.length <= 7 &&
        new Set(a.indices).size === a.indices.length &&
        a.indices.every((i) => integer(i, 0, p.hand.length - 1))
      );
    return a.type === 'PLACE' && Boolean(this.move(s, id, a.tiles));
  }
  private finish(s: WordsState, emptyId: string | null) {
    let remainder = 0;
    s.players.forEach((p) => {
      const cost = p.hand.reduce((v, l) => v + letterPoints(l), 0);
      p.score -= cost;
      if (p.id !== emptyId) remainder += cost;
    });
    if (emptyId) s.players.find((p) => p.id === emptyId)!.score += remainder;
    const best = Math.max(...s.players.map((p) => p.score));
    s.winnerIds = s.players.filter((p) => p.score === best).map((p) => p.id);
    s.winner = s.winnerIds[0];
    s.message = msg(
      'Recuento final: se descuentan las letras del atril. Gana la mayor puntuación.',
    );
  }
  applyAction(state: WordsState, id: string, a: WordsAction): WordsState {
    if (!this.validateAction(state, id, a)) return state;
    const s = structuredClone(state),
      p = s.players.find((p) => p.id === id)!;
    s.revision++;
    s.lastWords = [];
    if (a.type === 'PLACE') {
      const move = this.move(state, id, a.tiles)!;
      s.board = move.board;
      s.lastWords = move.words;
      p.score += move.score;
      const indices = new Set(a.tiles.map((t) => t.rackIndex));
      p.hand = p.hand.filter((_l, i) => !indices.has(i));
      this.draw(s, p);
      s.quietTurns = 0;
      s.message = msg(
        'Palabras aceptadas: {0}. Puntos de la jugada: {1}.',
        move.words.map((w) => w.word).join(', '),
        move.score,
      );
      if (!s.bag.length && !p.hand.length) {
        this.finish(s, id);
        return s;
      }
    } else {
      s.quietTurns++;
      if (a.type === 'EXCHANGE') {
        const back = a.indices.map((i) => p.hand[i]);
        p.hand = p.hand.filter((_l, i) => !a.indices.includes(i));
        this.draw(s, p);
        s.bag = shuffle([...s.bag, ...back], this.random);
        s.message = msg('Letras cambiadas. El cambio consume el turno.');
      } else s.message = msg('Turno pasado sin colocar letras.');
      if (s.quietTurns >= s.players.length * 2) {
        this.finish(s, null);
        return s;
      }
    }
    s.currentTurnPlayerId =
      s.players[(s.players.findIndex((p) => p.id === id) + 1) % s.players.length].id;
    return s;
  }
  getSanitizedState(s: WordsState, id: string): WordsPublicState {
    const { players, bag, ...visible } = structuredClone(s);
    return {
      ...visible,
      players: players.map(({ hand, ...p }) => ({ ...p, handCount: hand.length })),
      hand: players.find((p) => p.id === id)?.hand ?? [],
      bagCount: bag.length,
    };
  }
  checkWinner(s: WordsState) {
    return s.winner;
  }
  forfeitPlayer(state: WordsState, id: string): WordsState {
    if (state.winner || state.isDraw || !state.players.some((p) => p.id === id)) return state;
    return {
      ...structuredClone(state),
      revision: state.revision + 1,
      isDraw: true,
      message: msg('Partida cerrada por abandono sin descubrir los atriles restantes.'),
    };
  }
  getBotAction(s: WordsState, id: string): WordsAction | null {
    if (s.winner || s.isDraw || id !== s.currentTurnPlayerId) return null;
    const v = this.getSanitizedState(s, id),
      dictionary = this.lexicon![v.language],
      occupied = v.board.flatMap((l, i) => (l ? [i] : []));
    const available = new Set([...v.hand, ...v.board.filter((l): l is string => l !== null)]);
    let attempts = 0,
      candidates = 0;
    const best: { tiles: WordPlacement[]; score: number }[] = [];
    for (const word of dictionary) {
      if (word.length < 2 || word.length > 11) continue;
      // Descarte barato: cada letra debe estar en el atril o ya en el tablero.
      if ([...word].some((l) => !available.has(l))) continue;
      if (++candidates > 2500) break;
      const anchors = occupied.length ? occupied : [60];
      for (const anchor of anchors)
        for (let offset = 0; offset < word.length; offset++) {
          if (occupied.length && v.board[anchor] !== word[offset]) continue;
          for (const vertical of [false, true]) {
            const row = Math.floor(anchor / 11) - (vertical ? offset : 0),
              col = (anchor % 11) - (vertical ? 0 : offset);
            if (
              row < 0 ||
              col < 0 ||
              row + (vertical ? word.length : 1) > 11 ||
              col + (vertical ? 1 : word.length) > 11
            )
              continue;
            const used = new Set<number>(),
              tiles: WordPlacement[] = [];
            let possible = true;
            for (let j = 0; j < word.length; j++) {
              const r = row + (vertical ? j : 0),
                c = col + (vertical ? 0 : j),
                old = v.board[r * 11 + c];
              if (old !== null) {
                if (old !== word[j]) {
                  possible = false;
                  break;
                }
                continue;
              }
              const index = v.hand.findIndex((l, k) => l === word[j] && !used.has(k));
              if (index < 0) {
                possible = false;
                break;
              }
              used.add(index);
              tiles.push({ row: r, col: c, rackIndex: index });
            }
            if (!possible || !tiles.length) continue;
            attempts++;
            const move = analyzeWordsMove(v, v.hand, tiles);
            if (
              move &&
              move.words.every((w) => dictionary.has(w.word)) &&
              (!best[0] || move.score > best[0].score)
            )
              best[0] = { tiles, score: move.score };
            if (attempts >= 1500)
              return best[0] ? { type: 'PLACE', tiles: best[0].tiles } : { type: 'PASS' };
          }
        }
      if (best[0] && best[0].score >= 30) break;
    }
    return best[0]
      ? { type: 'PLACE', tiles: best[0].tiles }
      : v.bagCount >= 7
        ? { type: 'EXCHANGE', indices: v.hand.map((_l, i) => i) }
        : { type: 'PASS' };
  }
}
