import { message as msg, type GameText } from '../../messages.js';
import type { IGameEngine } from '../../engine/IGameEngine.js';
export interface PigState {
  players: { id: string; isBot: boolean; score: number }[];
  currentTurnPlayerId: string;
  turnTotal: number;
  lastRoll: number | null;
  winner: string | null;
  message: GameText;
}
export type PigAction = { type: 'ROLL' } | { type: 'HOLD' };
export class PigEngine implements IGameEngine<PigState, PigAction, PigState> {
  initGame(players: { id: string; isBot: boolean }[]): PigState {
    if (players.length < 2 || players.length > 4)
      throw new Error('Se necesitan entre dos y cuatro jugadores.');
    return {
      players: players.map((p) => ({ ...p, score: 0 })),
      currentTurnPlayerId: players[0].id,
      turnTotal: 0,
      lastRoll: null,
      winner: null,
      message: msg('¡El primero en guardar 100 puntos gana!'),
    };
  }
  validateAction(state: PigState, id: string, action: PigAction): boolean {
    return (
      !!action &&
      !state.winner &&
      state.currentTurnPlayerId === id &&
      (action.type === 'ROLL' || (action.type === 'HOLD' && state.turnTotal > 0))
    );
  }
  applyAction(state: PigState, id: string, action: PigAction): PigState {
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
      if (player.score >= 100) {
        next.winner = id;
        next.turnTotal = 0;
      } else advance();
    } else {
      next.lastRoll = Math.floor(Math.random() * 6) + 1;
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
  getSanitizedState(state: PigState): PigState {
    return structuredClone(state);
  }
  checkWinner(state: PigState): string | null {
    return state.winner;
  }
  forfeitPlayer(state: PigState, id: string): PigState {
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
  getBotAction(state: PigState, id: string): PigAction | null {
    if (state.winner || state.currentTurnPlayerId !== id) return null;
    const score = state.players.find((p) => p.id === id)!.score;
    return { type: state.turnTotal >= 20 || score + state.turnTotal >= 100 ? 'HOLD' : 'ROLL' };
  }
}
