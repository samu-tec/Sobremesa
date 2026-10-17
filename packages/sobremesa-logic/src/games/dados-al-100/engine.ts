import { die, systemRandom, type RandomSource } from '../../engine/helpers.js';
import { resolveGameSettings } from '../../settings.js';
import { message as msg, type GameText } from '../../messages.js';
import type { IGameEngine } from '../../engine/IGameEngine.js';
export interface DadosAl100State {
  players: { id: string; isBot: boolean; score: number }[];
  currentTurnPlayerId: string;
  turnTotal: number;
  targetScore: number;
  rollCount: number;
  lastRoll: number | null;
  winner: string | null;
  message: GameText;
}
export type DadosAl100Action = { type: 'ROLL' } | { type: 'HOLD' };
export class DadosAl100Engine implements IGameEngine<
  DadosAl100State,
  DadosAl100Action,
  DadosAl100State
> {
  constructor(private random: RandomSource = systemRandom) {}
  private options = resolveGameSettings('pig');
  setRules(rules: Record<string, unknown>) {
    this.options = resolveGameSettings('pig', rules);
  }
  initGame(players: { id: string; isBot: boolean }[]): DadosAl100State {
    if (players.length < 2 || players.length > 4)
      throw new Error('Se necesitan entre dos y cuatro jugadores.');
    return {
      players: players.map((p) => ({ ...p, score: 0 })),
      currentTurnPlayerId: players[0].id,
      turnTotal: 0,
      targetScore: Number(this.options.targetScore),
      rollCount: 0,
      lastRoll: null,
      winner: null,
      message: msg('Gana quien llegue a {0} puntos.', Number(this.options.targetScore)),
    };
  }
  validateAction(state: DadosAl100State, id: string, action: DadosAl100Action): boolean {
    if (!action || typeof action !== 'object' || Array.isArray(action)) return false;
    return (
      !!action &&
      !state.winner &&
      state.currentTurnPlayerId === id &&
      (action.type === 'ROLL' || (action.type === 'HOLD' && state.turnTotal > 0))
    );
  }
  applyAction(state: DadosAl100State, id: string, action: DadosAl100Action): DadosAl100State {
    if (!this.validateAction(state, id, action)) return state;
    const next = { ...state, players: state.players.map((p) => ({ ...p })) };
    const player = next.players.find((p) => p.id === id)!;
    const advance = () => {
      next.currentTurnPlayerId =
        next.players[(next.players.findIndex((p) => p.id === id) + 1) % next.players.length].id;
      next.turnTotal = 0;
    };
    if (action.type === 'HOLD') {
      player.score += next.turnTotal;
      next.message = msg('Guardados {0} puntos.', next.turnTotal);
      if (player.score >= next.targetScore) {
        next.winner = id;
        next.turnTotal = 0;
      } else advance();
    } else {
      next.rollCount++;
      next.lastRoll = die(this.random);
      if (next.lastRoll === 1) {
        next.message = msg('¡Un 1! Se pierden los {0} puntos del turno.', next.turnTotal);
        advance();
      } else {
        next.turnTotal += next.lastRoll;
        next.message = msg(
          'Un {0}. Puedes seguir o guardar {1} puntos.',
          next.lastRoll,
          next.turnTotal,
        );
      }
    }
    return next;
  }
  getSanitizedState(state: DadosAl100State): DadosAl100State {
    return structuredClone(state);
  }
  checkWinner(state: DadosAl100State): string | null {
    return state.winner;
  }
  forfeitPlayer(state: DadosAl100State, id: string): DadosAl100State {
    if (state.winner || !state.players.some((p) => p.id === id)) return state;
    const players = state.players.filter((p) => p.id !== id),
      index = state.players.findIndex((p) => p.id === id);
    return {
      ...state,
      players,
      currentTurnPlayerId:
        state.currentTurnPlayerId === id
          ? players[index % players.length].id
          : state.currentTurnPlayerId,
      turnTotal: state.currentTurnPlayerId === id ? 0 : state.turnTotal,
      winner: players.length === 1 ? players[0].id : null,
      message: msg('Un jugador ha abandonado.'),
    };
  }
  getBotAction(state: DadosAl100State, id: string): DadosAl100Action | null {
    if (state.winner || state.currentTurnPlayerId !== id) return null;
    const score = state.players.find((p) => p.id === id)!.score;
    return {
      type: state.turnTotal >= 20 || score + state.turnTotal >= state.targetScore ? 'HOLD' : 'ROLL',
    };
  }
}
