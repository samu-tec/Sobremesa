import { WORD_CATEGORIES, resolveGameSettings } from '../../settings.js';
import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  liveTurn,
  shuffle,
  type Match,
  type Participant,
  systemRandom,
  type RandomSource,
} from '../../engine/helpers.js';
import { IMPOSTOR_WORDS, type SecretWord } from './words.js';
export type ImpostorAction =
  | { type: 'CLUE'; word: string }
  | { type: 'VOTE'; target: string }
  | { type: 'GUESS'; word: string }
  | { type: 'SPOKEN_CLUE' | 'SKIP_CLUE' }
  | { type: 'RECORD_VOTE'; counts: { playerId: string; count: number }[] }
  | { type: 'CONFIRM_GUESS'; correct: boolean };
export interface ImpostorState extends Match {
  mode: 'online' | 'physical';
  physicalVoting: boolean;
  moderatorId: string;
  physicalCounts: Record<string, number> | null;
  secret: SecretWord;
  impostorId: string;
  phase: 'clue' | 'vote' | 'guess' | 'result';
  clueRound: number;
  clueRounds: number;
  showCategory: boolean;
  clues: {
    playerId: string;
    word: string;
    round: number;
    bot: boolean;
    spoken?: boolean;
    skipped?: boolean;
  }[];
  votes: Record<string, string>;
  runoff: string[] | null;
  accused: string | null;
  winnerIds: string[];
  outcome: 'caught' | 'escaped' | 'guessed' | null;
  guess: string | null;
}
export interface ImpostorPublicState extends Omit<
  ImpostorState,
  'secret' | 'impostorId' | 'votes'
> {
  category: string | null;
  word: { es: string; en: string } | null;
  isImpostor: boolean;
  votes: Record<string, string>;
  votedIds: string[];
  revealedImpostor: string | null;
  revealedWord: { es: string; en: string } | null;
}
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
function finish(s: ImpostorState, outcome: NonNullable<ImpostorState['outcome']>): ImpostorState {
  s.outcome = outcome;
  s.phase = 'result';
  s.winnerIds =
    outcome === 'caught'
      ? s.players.filter((p) => p.id !== s.impostorId).map((p) => p.id)
      : [s.impostorId];
  s.winner = s.winnerIds[0] || null;
  return s;
}
function clueProgress(s: ImpostorState): ImpostorState {
  let remaining = s.players.filter(
    (p) => !s.clues.some((c) => c.playerId === p.id && c.round === s.clueRound),
  );
  if (!remaining.length && s.clueRound < s.clueRounds) {
    s.clueRound++;
    remaining = s.players;
  }
  if (!remaining.length) {
    s.phase = 'vote';
    s.currentTurnPlayerId = s.physicalVoting ? s.moderatorId : s.players[0].id;
  } else s.currentTurnPlayerId = remaining[0].id;
  return s;
}
export class ImpostorEngine implements IGameEngine<
  ImpostorState,
  ImpostorAction,
  ImpostorPublicState
> {
  private options = resolveGameSettings('impostor');
  constructor(private random: RandomSource = systemRandom) {}
  setRules(rules: Record<string, unknown>) {
    this.options = resolveGameSettings('impostor', rules);
  }
  initGame(players: (Participant & { isHost?: boolean })[]): ImpostorState {
    const ps = participants(players, 3, 10);
    if (this.options.impostorMode === 1 && ps.some((p) => p.isBot))
      throw new Error('La modalidad presencial requiere participantes humanos.');
    return {
      mode: this.options.impostorMode === 1 ? 'physical' : 'online',
      physicalVoting: this.options.impostorMode === 1 && this.options.physicalVoting === 1,
      moderatorId: players.find((p) => p.isHost)?.id ?? ps.find((p) => !p.isBot)?.id ?? ps[0].id,
      physicalCounts: null,
      players: ps,
      currentTurnPlayerId: ps[0].id,
      winner: null,
      isDraw: false,
      secret: structuredClone(
        shuffle(
          IMPOSTOR_WORDS.filter(
            (w) =>
              !this.options.wordCategory ||
              w.category === WORD_CATEGORIES[Number(this.options.wordCategory) - 1],
          ),
          this.random,
        )[0],
      ),
      impostorId: shuffle(ps, this.random)[0].id,
      phase: 'clue',
      clueRound: 1,
      clueRounds: Number(this.options.clueRounds),
      showCategory: Boolean(this.options.showCategory),
      clues: [],
      votes: {},
      runoff: null,
      accused: null,
      winnerIds: [],
      outcome: null,
      guess: null,
    };
  }
  validateAction(s: ImpostorState, id: string, a: ImpostorAction): boolean {
    if (!a || typeof a !== 'object' || Array.isArray(a)) return false;
    if (!a || !liveTurn(s, id)) return false;
    if (a.type === 'CONFIRM_GUESS')
      return (
        s.mode === 'physical' &&
        s.phase === 'guess' &&
        id === s.moderatorId &&
        typeof a.correct === 'boolean'
      );
    if (a.type === 'RECORD_VOTE')
      return (
        s.mode === 'physical' &&
        s.physicalVoting &&
        s.phase === 'vote' &&
        id === s.moderatorId &&
        Array.isArray(a.counts) &&
        a.counts.length === s.players.length &&
        new Set(a.counts.map((c) => c?.playerId)).size === s.players.length &&
        a.counts.every(
          (c) =>
            c &&
            typeof c === 'object' &&
            s.players.some((p) => p.id === c.playerId) &&
            Number.isInteger(c.count) &&
            c.count >= 0 &&
            c.count <= s.players.length &&
            (!s.runoff || s.runoff.includes(c.playerId) || c.count === 0),
        ) &&
        a.counts.reduce((n, c) => n + c.count, 0) <= s.players.length
      );
    if (a.type === 'SPOKEN_CLUE' || a.type === 'SKIP_CLUE')
      return s.mode === 'physical' && s.phase === 'clue';
    if (s.phase === 'clue')
      return (
        s.mode === 'online' &&
        a.type === 'CLUE' &&
        typeof a.word === 'string' &&
        /^[\p{L}]{2,30}$/u.test(a.word.trim()) &&
        (id === s.impostorId ||
          ![s.secret.es, s.secret.en].some((w) => normalize(w) === normalize(a.word)))
      );
    if (s.phase === 'vote')
      return (
        !s.physicalVoting &&
        a.type === 'VOTE' &&
        a.target !== id &&
        s.players.some((p) => p.id === a.target) &&
        (!s.runoff || s.runoff.includes(a.target)) &&
        !s.votes[id]
      );
    return (
      s.mode === 'online' &&
      s.phase === 'guess' &&
      id === s.impostorId &&
      a.type === 'GUESS' &&
      typeof a.word === 'string' &&
      a.word.trim().length >= 2 &&
      a.word.trim().length <= 40
    );
  }
  applyAction(s: ImpostorState, id: string, a: ImpostorAction): ImpostorState {
    if (!this.validateAction(s, id, a)) return s;
    const n = structuredClone(s);
    if (a.type === 'CONFIRM_GUESS') return finish(n, a.correct ? 'guessed' : 'caught');
    if (a.type === 'RECORD_VOTE') {
      n.physicalCounts = Object.fromEntries(a.counts.map((c) => [c.playerId, c.count]));
      return this.resolveVotes(
        n,
        a.counts.map((c) => ({ id: c.playerId, n: c.count })),
      );
    }
    if (a.type === 'SPOKEN_CLUE' || a.type === 'SKIP_CLUE') {
      n.clues.push({
        playerId: id,
        word: '',
        round: n.clueRound,
        bot: false,
        spoken: true,
        skipped: a.type === 'SKIP_CLUE',
      });
      return clueProgress(n);
    }
    if (a.type === 'CLUE') {
      n.clues.push({
        playerId: id,
        word: a.word.trim(),
        round: n.clueRound,
        bot: n.players.find((p) => p.id === id)!.isBot,
      });
      return clueProgress(n);
    }
    if (a.type === 'GUESS') {
      n.guess = a.word.trim();
      return finish(
        n,
        [n.secret.es, n.secret.en].some((w) => normalize(w) === normalize(a.word))
          ? 'guessed'
          : 'caught',
      );
    }
    if (a.type !== 'VOTE') return s;
    n.votes[id] = a.target;
    // A sole runoff candidate cannot vote for themselves: only relevant with departures.
    const pending = n.players.find(
      (p) => !n.votes[p.id] && (!n.runoff || n.runoff.some((target) => target !== p.id)),
    );
    if (pending) {
      n.currentTurnPlayerId = pending.id;
      return n;
    }
    return this.resolveVotes(
      n,
      n.players.map((p) => ({
        id: p.id,
        n: Object.values(n.votes).filter((v) => v === p.id).length,
      })),
    );
  }
  private resolveVotes(n: ImpostorState, counts: { id: string; n: number }[]): ImpostorState {
    const max = Math.max(...counts.map((c) => c.n)),
      ties = counts.filter((c) => c.n === max).map((c) => c.id);
    if (ties.length > 1) {
      if (n.runoff) return finish(n, 'escaped');
      n.runoff = ties;
      n.votes = {};
      n.physicalCounts = null;
      n.currentTurnPlayerId = n.physicalVoting ? n.moderatorId : n.players[0].id;
      return n;
    }
    n.accused = ties[0];
    if (n.accused !== n.impostorId) return finish(n, 'escaped');
    n.phase = 'guess';
    n.currentTurnPlayerId = n.mode === 'physical' ? n.moderatorId : n.impostorId;
    return n;
  }
  getSanitizedState(s: ImpostorState, id: string): ImpostorPublicState {
    const end = s.phase === 'result',
      member = s.players.some((p) => p.id === id);
    return {
      mode: s.mode,
      physicalVoting: s.physicalVoting,
      moderatorId: s.moderatorId,
      physicalCounts: s.physicalCounts ? { ...s.physicalCounts } : null,
      players: structuredClone(s.players),
      currentTurnPlayerId: s.currentTurnPlayerId,
      winner: s.winner,
      isDraw: s.isDraw,
      category: s.showCategory ? s.secret.category : null,
      clueRounds: s.clueRounds,
      showCategory: s.showCategory,
      word: member && id !== s.impostorId ? { es: s.secret.es, en: s.secret.en } : null,
      isImpostor: member && id === s.impostorId,
      phase: s.phase,
      clueRound: s.clueRound,
      clues: structuredClone(s.clues),
      votes: end ? { ...s.votes } : s.votes[id] ? { [id]: s.votes[id] } : {},
      votedIds: Object.keys(s.votes),
      runoff: structuredClone(s.runoff),
      accused: s.accused,
      winnerIds: [...s.winnerIds],
      outcome: s.outcome,
      guess: s.guess,
      revealedImpostor: end ? s.impostorId : null,
      revealedWord: end ? { es: s.secret.es, en: s.secret.en } : null,
    };
  }
  checkWinner(s: ImpostorState) {
    return s.winner;
  }
  getBotAction(s: ImpostorState, id: string): ImpostorAction | null {
    if (!liveTurn(s, id)) return null;
    if (s.mode === 'physical') {
      if (s.phase === 'clue') return { type: 'SKIP_CLUE' };
      if (s.phase === 'guess') return { type: 'CONFIRM_GUESS', correct: false };
      if (s.phase === 'vote' && s.physicalVoting)
        return {
          type: 'RECORD_VOTE',
          counts: s.players.map((p) => ({ playerId: p.id, count: 0 })),
        };
    }
    const view = this.getSanitizedState(s, id),
      known = IMPOSTOR_WORDS.find((w) => w.es === view.word?.es);
    if (s.phase === 'clue') {
      const pool = known
        ? known.clues
        : IMPOSTOR_WORDS.filter((w) => !view.category || w.category === view.category).flatMap(
            (w) => w.clues,
          );
      const used = view.clues.map((c) => normalize(c.word));
      return {
        type: 'CLUE',
        word: shuffle(pool.filter((w) => !used.includes(normalize(w))))[0] || shuffle(pool)[0],
      };
    }
    if (s.phase === 'vote') {
      const options = view.players.filter(
        (p) => p.id !== id && (!view.runoff || view.runoff.includes(p.id)),
      );
      const scored = options
        .map((p) => ({
          id: p.id,
          n: known
            ? view.clues
                .filter((c) => c.playerId === p.id)
                .reduce(
                  (n, c) =>
                    n +
                    ([...known.clues, ...known.cluesEn].some(
                      (w) => normalize(w) === normalize(c.word),
                    )
                      ? 0
                      : 1),
                  0,
                ) + Math.random()
            : Math.random(),
        }))
        .sort((a, b) => b.n - a.n);
      return scored[0] ? { type: 'VOTE', target: scored[0].id } : null;
    }
    if (s.phase === 'guess') {
      const guess = shuffle(
        IMPOSTOR_WORDS.filter((w) => !view.category || w.category === view.category),
      )
        .map((w) => ({
          w,
          n: view.clues.filter(
            (c) =>
              c.playerId !== id &&
              [...w.clues, ...w.cluesEn].some((word) => normalize(word) === normalize(c.word)),
          ).length,
        }))
        .sort((a, b) => b.n - a.n)[0].w;
      return { type: 'GUESS', word: guess.es };
    }
    return null;
  }
  forfeitPlayer(s: ImpostorState, id: string, newHostId?: string): ImpostorState {
    if (s.winner || s.isDraw || !s.players.some((p) => p.id === id)) return s;
    const n = structuredClone(s);
    n.players = n.players.filter((p) => p.id !== id);
    if (n.moderatorId === id)
      n.moderatorId =
        newHostId && n.players.some((p) => p.id === newHostId)
          ? newHostId
          : (n.players.find((p) => !p.isBot)?.id ?? n.players[0]?.id ?? id);
    if (id === n.impostorId) return finish(n, 'caught');
    if (n.players.length < 3) return finish(n, 'escaped');
    if (n.phase === 'vote') {
      n.votes = {};
      n.physicalCounts = null;
      n.runoff = null;
      n.currentTurnPlayerId = n.physicalVoting ? n.moderatorId : n.players[0].id;
    } else if (n.phase === 'clue') clueProgress(n);
    else if (n.phase === 'guess' && n.mode === 'physical') n.currentTurnPlayerId = n.moderatorId;
    return n;
  }
}
