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
export const CONQUEST_REGIONS = ['Costa del Alba', 'Sierra del Viento', 'Cuenca de Bruma'] as const;
export const CONQUEST_MAP = [
  { name: 'Puerto Claro', x: 100, y: 70 },
  { name: 'Duna Serena', x: 210, y: 45 },
  { name: 'Salinas', x: 280, y: 105 },
  { name: 'Risco Solar', x: 245, y: 205 },
  { name: 'Bahía Mansa', x: 130, y: 240 },
  { name: 'Islote Verde', x: 50, y: 155 },
  { name: 'Paso del Aire', x: 410, y: 65 },
  { name: 'Cumbre Azul', x: 525, y: 45 },
  { name: 'Bosque Alto', x: 620, y: 110 },
  { name: 'Puente de Pino', x: 595, y: 215 },
  { name: 'Valle del Eco', x: 475, y: 240 },
  { name: 'Molino Norte', x: 380, y: 160 },
  { name: 'Lago de Bruma', x: 200, y: 345 },
  { name: 'Huerta Nueva', x: 320, y: 310 },
  { name: 'Archivo Viejo', x: 455, y: 345 },
  { name: 'Vado de Piedra', x: 490, y: 435 },
  { name: 'Juncal', x: 355, y: 465 },
  { name: 'Faro del Sur', x: 225, y: 440 },
] as const;
export const CONQUEST_EDGES: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 0],
  [0, 3],
  [6, 7],
  [7, 8],
  [8, 9],
  [9, 10],
  [10, 11],
  [11, 6],
  [6, 9],
  [12, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [16, 17],
  [17, 12],
  [12, 15],
  [2, 6],
  [3, 11],
  [4, 12],
  [5, 17],
  [10, 14],
  [9, 15],
];
export const conquestNeighbors = (id: number) =>
  CONQUEST_EDGES.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []));
export interface ConquestState {
  players: (Participant & { score: number; left: boolean })[];
  territories: { owner: string | null; armies: number }[];
  currentTurnPlayerId: string;
  phase: 'reinforce' | 'attack' | 'fortify' | 'finished';
  reinforcements: number;
  attacks: number;
  moved: boolean;
  round: number;
  maxRounds: number;
  lastBattle: {
    from: number;
    to: number;
    troops: number;
    attackDie: number;
    defendDie: number;
    captured: boolean;
    attackerLost: number;
    defenderLost: number;
  } | null;
  revision: number;
  winner: string | null;
  winnerIds: string[];
  isDraw: boolean;
  message: GameText;
}
export type ConquestPublicState = ConquestState;
export type ConquestAction =
  | { type: 'REINFORCE'; territory: number; amount: number }
  | { type: 'ATTACK'; from: number; to: number; troops: number }
  | { type: 'MOVE'; from: number; to: number; amount: number }
  | { type: 'FORTIFY' | 'END_TURN' };
export function conquestConnected(
  s: ConquestState,
  from: number,
  to: number,
  owner: string,
): boolean {
  if (s.territories[from]?.owner !== owner || s.territories[to]?.owner !== owner) return false;
  const seen = new Set([from]),
    queue = [from];
  while (queue.length) {
    const i = queue.shift()!;
    if (i === to) return true;
    for (const n of conquestNeighbors(i))
      if (!seen.has(n) && s.territories[n].owner === owner) {
        seen.add(n);
        queue.push(n);
      }
  }
  return false;
}
export class ConquestEngine implements IGameEngine<
  ConquestState,
  ConquestAction,
  ConquestPublicState
> {
  constructor(private random: RandomSource = systemRandom) {}
  private count(s: ConquestState, id: string) {
    return s.territories.filter((t) => t.owner === id).length;
  }
  private regions(s: ConquestState, id: string) {
    return [0, 1, 2].filter((r) =>
      s.territories.slice(r * 6, r * 6 + 6).every((t) => t.owner === id),
    ).length;
  }
  private score(s: ConquestState) {
    s.players.forEach((p) => (p.score = this.count(s, p.id) * 2 + this.regions(s, p.id) * 5));
  }
  private begin(s: ConquestState, id: string) {
    s.currentTurnPlayerId = id;
    s.attacks = 0;
    s.moved = false;
    s.phase = 'reinforce';
    const capacity = s.territories
      .filter((t) => t.owner === id)
      .reduce((n, t) => n + 30 - t.armies, 0);
    s.reinforcements = Math.min(
      capacity,
      Math.max(3, Math.floor(this.count(s, id) / 3)) + 2 * this.regions(s, id),
    );
    if (!s.reinforcements) s.phase = 'attack';
    s.message = msg('Reparte tus refuerzos. Después puedes combatir y realizar un traslado.');
  }
  initGame(players: Participant[]): ConquestState {
    const ps = participants(players, 2, 6),
      order = shuffle(
        Array.from({ length: 18 }, (_, i) => i),
        this.random,
      ),
      s: ConquestState = {
        players: ps.map((p) => ({ ...p, score: 0, left: false })),
        territories: Array.from({ length: 18 }, () => ({
          owner: null as string | null,
          armies: 2,
        })),
        currentTurnPlayerId: ps[0].id,
        phase: 'reinforce',
        reinforcements: 0,
        attacks: 0,
        moved: false,
        round: 1,
        maxRounds: 15,
        lastBattle: null,
        revision: 0,
        winner: null,
        winnerIds: [],
        isDraw: false,
        message: msg('Tres regiones, dieciocho territorios y un mapa original por conquistar.'),
      };
    order.forEach((territory, i) => (s.territories[territory].owner = ps[i % ps.length].id));
    this.score(s);
    this.begin(s, ps[0].id);
    return s;
  }
  validateAction(s: ConquestState, id: string, a: ConquestAction): boolean {
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
    if (a.type === 'REINFORCE')
      return (
        s.phase === 'reinforce' &&
        integer(a.territory, 0, 17) &&
        integer(a.amount, 1, s.reinforcements) &&
        s.territories[a.territory].owner === id &&
        s.territories[a.territory].armies + a.amount <= 30
      );
    if (a.type === 'END_TURN') return s.phase === 'attack' || s.phase === 'fortify';
    if (a.type === 'FORTIFY') return s.phase === 'attack';
    if (a.type !== 'ATTACK' && a.type !== 'MOVE') return false;
    if (
      !integer(a.from, 0, 17) ||
      !integer(a.to, 0, 17) ||
      a.from === a.to ||
      s.territories[a.from].owner !== id
    )
      return false;
    const from = s.territories[a.from],
      to = s.territories[a.to];
    if (a.type === 'ATTACK')
      return (
        s.phase === 'attack' &&
        s.attacks < 3 &&
        to.owner !== id &&
        conquestNeighbors(a.from).includes(a.to) &&
        integer(a.troops, 1, Math.min(3, from.armies - 1))
      );
    return (
      s.phase === 'fortify' &&
      !s.moved &&
      to.owner === id &&
      integer(a.amount, 1, from.armies - 1) &&
      to.armies + a.amount <= 30 &&
      conquestConnected(s, a.from, a.to, id)
    );
  }
  private finish(s: ConquestState, ids: string[]) {
    s.winnerIds = ids;
    s.winner = ids[0] ?? null;
    s.isDraw = !s.winner;
    s.phase = 'finished';
    s.message = msg(
      'Conquista terminada. El control de territorios y regiones decide el resultado.',
    );
  }
  private end(s: ConquestState) {
    const live = s.players.filter((p) => !p.left && this.count(s, p.id) > 0),
      id = s.currentTurnPlayerId;
    if (live.length <= 1) {
      this.finish(
        s,
        live.map((p) => p.id),
      );
      return;
    }
    if (this.count(s, id) >= 12) {
      this.finish(s, [id]);
      return;
    }
    const index = s.players.findIndex((p) => p.id === id);
    let next = index;
    do {
      next = (next + 1) % s.players.length;
    } while (!live.some((p) => p.id === s.players[next].id));
    if (next <= index) {
      if (s.round >= s.maxRounds) {
        const best = Math.max(...live.map((p) => p.score));
        this.finish(
          s,
          live.filter((p) => p.score === best).map((p) => p.id),
        );
        return;
      }
      s.round++;
    }
    this.begin(s, s.players[next].id);
  }
  applyAction(state: ConquestState, id: string, a: ConquestAction): ConquestState {
    if (!this.validateAction(state, id, a)) return state;
    const s = structuredClone(state);
    s.revision++;
    if (a.type === 'REINFORCE') {
      s.territories[a.territory].armies += a.amount;
      s.reinforcements -= a.amount;
      if (!s.reinforcements) s.phase = 'attack';
    } else if (a.type === 'FORTIFY') s.phase = 'fortify';
    else if (a.type === 'END_TURN') this.end(s);
    else if (a.type === 'MOVE') {
      s.territories[a.from].armies -= a.amount;
      s.territories[a.to].armies += a.amount;
      s.moved = true;
      s.message = msg('Traslado confirmado por un camino de territorios propios.');
    } else if (a.type === 'ATTACK') {
      const from = s.territories[a.from],
        to = s.territories[a.to],
        attackDie = 1 + Math.min(5, Math.floor(this.random() * 6)),
        defendDie = 1 + Math.min(5, Math.floor(this.random() * 6)),
        attack = attackDie + a.troops,
        defense = defendDie + Math.min(3, to.armies);
      let attackerLost = 0,
        defenderLost = 0,
        captured = false;
      if (attack > defense) {
        defenderLost = Math.min(a.troops, to.armies);
        to.armies -= defenderLost;
        if (to.armies === 0) {
          to.owner = id;
          to.armies = a.troops;
          from.armies -= a.troops;
          captured = true;
        }
      } else if (attack < defense) {
        from.armies--;
        attackerLost = 1;
      } else {
        from.armies--;
        attackerLost = 1;
        if (to.armies > 1) {
          to.armies--;
          defenderLost = 1;
        }
      }
      s.attacks++;
      if (s.attacks === 3) s.phase = 'fortify';
      s.lastBattle = {
        from: a.from,
        to: a.to,
        troops: a.troops,
        attackDie,
        defendDie,
        captured,
        attackerLost,
        defenderLost,
      };
      this.score(s);
      s.message = captured
        ? msg('Territorio conquistado: el grupo atacante ocupa la nueva posición.')
        : msg('Combate resuelto. Revisa los dados, las bajas y los apoyos.');
      if (s.players.filter((p) => !p.left && this.count(s, p.id) > 0).length === 1)
        this.finish(s, [id]);
    }
    this.score(s);
    return s;
  }
  getSanitizedState(s: ConquestState, _id: string): ConquestPublicState {
    return structuredClone(s);
  }
  checkWinner(s: ConquestState) {
    return s.winner;
  }
  forfeitPlayer(state: ConquestState, id: string): ConquestState {
    if (state.winner || state.isDraw || !state.players.some((p) => p.id === id && !p.left))
      return state;
    const s = structuredClone(state);
    s.revision++;
    s.players.find((p) => p.id === id)!.left = true;
    s.territories.forEach((t) => {
      if (t.owner === id) t.owner = null;
    });
    this.score(s);
    const live = s.players.filter((p) => !p.left && this.count(s, p.id) > 0);
    if (live.length <= 1)
      this.finish(
        s,
        live.map((p) => p.id),
      );
    else if (s.currentTurnPlayerId === id) this.end(s);
    return s;
  }
  getTimeoutAction(s: ConquestState, id: string): ConquestAction | null {
    if (s.winner || s.isDraw || s.currentTurnPlayerId !== id) return null;
    if (s.phase !== 'reinforce') return { type: 'END_TURN' };
    const territory = s.territories.findIndex((t) => t.owner === id && t.armies < 30);
    return {
      type: 'REINFORCE',
      territory,
      amount: Math.min(s.reinforcements, 30 - s.territories[territory].armies),
    };
  }
  getBotAction(s: ConquestState, id: string): ConquestAction | null {
    if (s.winner || s.isDraw || s.currentTurnPlayerId !== id) return null;
    const frontier = s.territories.flatMap((t, i) =>
      t.owner === id && conquestNeighbors(i).some((n) => s.territories[n].owner !== id) ? [i] : [],
    );
    if (s.phase === 'reinforce') {
      const candidates = (
        frontier.length ? frontier : s.territories.flatMap((t, i) => (t.owner === id ? [i] : []))
      )
        .filter((i) => s.territories[i].armies < 30)
        .sort((a, b) => s.territories[a].armies - s.territories[b].armies);
      if (!candidates.length) return this.getTimeoutAction(s, id);
      const territory = candidates[0];
      return {
        type: 'REINFORCE',
        territory,
        amount: Math.min(s.reinforcements, 30 - s.territories[territory].armies),
      };
    }
    if (s.phase === 'attack') {
      const options = frontier
        .flatMap((from) =>
          conquestNeighbors(from)
            .filter((to) => s.territories[to].owner !== id && s.territories[from].armies >= 3)
            .map((to) => ({
              from,
              to,
              troops: Math.min(3, s.territories[from].armies - 1),
              value:
                Math.min(3, s.territories[from].armies - 1) -
                Math.min(3, s.territories[to].armies) +
                1 / (s.territories[to].armies + 1),
            })),
        )
        .sort((a, b) => b.value - a.value);
      if (options.length && options[0].value >= 0) {
        const { from, to, troops } = options[0];
        return { type: 'ATTACK', from, to, troops };
      }
      return { type: 'FORTIFY' };
    }
    if (s.phase === 'fortify' && !s.moved) {
      const back = s.territories
        .flatMap((t, i) => (t.owner === id && !frontier.includes(i) && t.armies > 1 ? [i] : []))
        .sort((a, b) => s.territories[b].armies - s.territories[a].armies);
      for (const from of back) {
        const to = frontier
          .filter((to) => s.territories[to].armies < 30 && conquestConnected(s, from, to, id))
          .sort((a, b) => s.territories[a].armies - s.territories[b].armies)[0];
        if (to !== undefined)
          return {
            type: 'MOVE',
            from,
            to,
            amount: Math.min(s.territories[from].armies - 1, 30 - s.territories[to].armies),
          };
      }
    }
    return { type: 'END_TURN' };
  }
}
