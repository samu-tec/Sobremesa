import { resolveGameSettings } from '../../settings.js';
import type { IGameEngine } from '../../engine/IGameEngine.js';
import {
  participants,
  liveTurn,
  nextPlayer,
  die,
  integer,
  finishScores,
  type Match,
  type Participant,
} from '../../engine/helpers.js';
export const SCORE_CATEGORIES = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
  'threeKind',
  'fourKind',
  'fullHouse',
  'smallStraight',
  'largeStraight',
  'fiveKind',
  'chance',
] as const;
export type ScoreCategory = (typeof SCORE_CATEGORIES)[number];
interface ScorePlayer extends Participant {
  scores: Partial<Record<ScoreCategory, number>>;
  bonus: number;
}
export type DadosDeCombinacionesAction =
  { type: 'ROLL'; keep: number[] } | { type: 'SCORE'; category: ScoreCategory };
export interface DadosDeCombinacionesState extends Match {
  players: ScorePlayer[];
  dice: number[];
  rolls: number;
  round: number;
  maxRolls: number;
  upperBonus: boolean;
}
export function combinationScore(dice: number[], category: ScoreCategory, joker = false): number {
  if (dice.length !== 5) return 0;
  const counts = Array.from({ length: 6 }, (_, i) => dice.filter((d) => d === i + 1).length),
    sum = dice.reduce((a, b) => a + b, 0),
    upper = SCORE_CATEGORIES.indexOf(category);
  if (upper < 6 && upper >= 0) return counts[upper] * (upper + 1);
  if (category === 'threeKind') return counts.some((n) => n >= 3) ? sum : 0;
  if (category === 'fourKind') return counts.some((n) => n >= 4) ? sum : 0;
  if (category === 'fullHouse') return joker || (counts.includes(3) && counts.includes(2)) ? 25 : 0;
  if (category === 'smallStraight')
    return joker || [0, 1, 2].some((start) => counts.slice(start, start + 4).every((n) => n > 0))
      ? 30
      : 0;
  if (category === 'largeStraight')
    return joker || [0, 1].some((start) => counts.slice(start, start + 5).every((n) => n > 0))
      ? 40
      : 0;
  if (category === 'fiveKind') return counts.includes(5) ? 50 : 0;
  return category === 'chance' ? sum : 0;
}
export function combinationTotal(p: ScorePlayer, upperBonus = true): number {
  const upper = SCORE_CATEGORIES.slice(0, 6).reduce((n, k) => n + (p.scores[k] || 0), 0);
  return (
    Object.values(p.scores).reduce((a, b) => a + b, 0) +
    (upperBonus && upper >= 63 ? 35 : 0) +
    p.bonus
  );
}
function categories(s: DadosDeCombinacionesState, id: string): ScoreCategory[] {
  const p = s.players.find((p) => p.id === id)!;
  const open = SCORE_CATEGORIES.filter((k) => p.scores[k] === undefined);
  if (s.rolls && s.dice.every((d) => d === s.dice[0]) && p.scores.fiveKind === 50) {
    const matching = SCORE_CATEGORIES[s.dice[0] - 1];
    if (open.includes(matching)) return [matching];
    const lower = open.filter((k) => SCORE_CATEGORIES.indexOf(k) >= 6);
    if (lower.length) return lower;
  }
  return open;
}
export interface DadosDeCombinacionesPublicState extends DadosDeCombinacionesState {
  available: Partial<Record<ScoreCategory, number>>;
  totals: Record<string, number>;
}
export class DadosDeCombinacionesEngine implements IGameEngine<
  DadosDeCombinacionesState,
  DadosDeCombinacionesAction,
  DadosDeCombinacionesPublicState
> {
  private options = resolveGameSettings('combinations');
  setRules(rules: Record<string, unknown>) {
    this.options = resolveGameSettings('combinations', rules);
  }
  initGame(players: Participant[]): DadosDeCombinacionesState {
    return {
      players: participants(players, 2, 6).map((p) => ({ ...p, scores: {}, bonus: 0 })),
      currentTurnPlayerId: players[0].id,
      winner: null,
      isDraw: false,
      dice: [],
      rolls: 0,
      round: 1,
      maxRolls: Number(this.options.maxRolls),
      upperBonus: Boolean(this.options.upperBonus),
    };
  }
  validateAction(s: DadosDeCombinacionesState, id: string, a: DadosDeCombinacionesAction): boolean {
    if (!a || !liveTurn(s, id)) return false;
    if (a.type === 'ROLL')
      return (
        s.rolls < s.maxRolls &&
        Array.isArray(a.keep) &&
        a.keep.length <= 5 &&
        new Set(a.keep).size === a.keep.length &&
        a.keep.every((i) => integer(i, 0, s.dice.length - 1)) &&
        (s.rolls > 0 || !a.keep.length)
      );
    return a.type === 'SCORE' && s.rolls > 0 && categories(s, id).includes(a.category);
  }
  applyAction(
    s: DadosDeCombinacionesState,
    id: string,
    a: DadosDeCombinacionesAction,
  ): DadosDeCombinacionesState {
    if (!this.validateAction(s, id, a)) return s;
    const n = structuredClone(s),
      p = n.players.find((p) => p.id === id)!;
    if (a.type === 'ROLL') {
      n.dice = Array.from({ length: 5 }, (_, i) => (a.keep.includes(i) ? s.dice[i] : die()));
      n.rolls++;
      return n;
    }
    const bonus = n.dice.every((d) => d === n.dice[0]) && p.scores.fiveKind === 50;
    if (bonus) p.bonus += 100;
    p.scores[a.category] = combinationScore(n.dice, a.category, bonus);
    if (n.players.every((p) => SCORE_CATEGORIES.every((k) => p.scores[k] !== undefined)))
      return finishScores(
        n,
        n.players.map((p) => combinationTotal(p, n.upperBonus)),
      );
    n.currentTurnPlayerId = nextPlayer(n);
    n.round = Math.min(...n.players.map((p) => Object.keys(p.scores).length)) + 1;
    n.dice = [];
    n.rolls = 0;
    return n;
  }
  getSanitizedState(s: DadosDeCombinacionesState, id: string): DadosDeCombinacionesPublicState {
    const p = s.players.find((p) => p.id === id),
      joker =
        !!p &&
        p.scores.fiveKind === 50 &&
        s.dice.length === 5 &&
        s.dice.every((d) => d === s.dice[0]);
    return {
      ...structuredClone(s),
      available:
        liveTurn(s, id) && s.rolls
          ? Object.fromEntries(
              categories(s, id).map((k) => [k, combinationScore(s.dice, k, joker)]),
            )
          : {},
      totals: Object.fromEntries(s.players.map((p) => [p.id, combinationTotal(p, s.upperBonus)])),
    };
  }
  checkWinner(s: DadosDeCombinacionesState) {
    return s.winner;
  }
  getBotAction(s: DadosDeCombinacionesState, id: string): DadosDeCombinacionesAction | null {
    if (!liveTurn(s, id)) return null;
    if (!s.rolls) return { type: 'ROLL', keep: [] };
    const p = s.players.find((p) => p.id === id)!,
      available = categories(s, id),
      ranked = available
        .map((k) => ({
          k,
          score:
            combinationScore(
              s.dice,
              k,
              p.scores.fiveKind === 50 && s.dice.every((d) => d === s.dice[0]),
            ) -
            (k === 'chance' ? 12 : 0) -
            (SCORE_CATEGORIES.indexOf(k) < 6 ? (SCORE_CATEGORIES.indexOf(k) + 1) * 2 : 0),
        }))
        .sort((a, b) => b.score - a.score);
    if (s.rolls === s.maxRolls || ranked[0].score >= 25)
      return { type: 'SCORE', category: ranked[0].k };
    const counts = Array.from({ length: 6 }, (_, i) => ({
      value: i + 1,
      count: s.dice.filter((d) => d === i + 1).length,
    })).sort((a, b) => b.count - a.count || b.value - a.value);
    const target = counts[0].value;
    return { type: 'ROLL', keep: s.dice.flatMap((d, i) => (d === target ? [i] : [])) };
  }
  forfeitPlayer(s: DadosDeCombinacionesState, id: string): DadosDeCombinacionesState {
    if (s.winner || s.isDraw || !s.players.some((p) => p.id === id)) return s;
    const n = structuredClone(s),
      next = nextPlayer(n);
    n.players = n.players.filter((p) => p.id !== id);
    if (n.players.length === 1) n.winner = n.players[0].id;
    else if (n.currentTurnPlayerId === id) {
      n.currentTurnPlayerId = next;
      n.dice = [];
      n.rolls = 0;
    }
    if (
      !n.winner &&
      n.players.every((p) => SCORE_CATEGORIES.every((k) => p.scores[k] !== undefined))
    )
      return finishScores(
        n,
        n.players.map((p) => combinationTotal(p, n.upperBonus)),
      );
    return n;
  }
}
