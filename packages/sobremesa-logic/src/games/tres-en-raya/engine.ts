import { participants } from '../../engine/helpers.js';
import { IGameEngine } from '../../engine/IGameEngine.js';
import {
  TresEnRayaAction,
  TresEnRayaBoard,
  TresEnRayaPublicState,
  TresEnRayaState,
  TresEnRayaSymbol,
} from './types.js';
import { checkBoardWinner, getBestTresEnRayaMove, isBoardFull } from './bot.js';

export class TresEnRayaEngine implements IGameEngine<
  TresEnRayaState,
  TresEnRayaAction,
  TresEnRayaPublicState
> {
  initGame(players: { id: string; isBot: boolean; name?: string }[]): TresEnRayaState {
    players = participants(players, 2, 2);

    const assignedPlayers = [
      { id: players[0].id, symbol: 'X' as TresEnRayaSymbol, isBot: players[0].isBot },
      { id: players[1].id, symbol: 'O' as TresEnRayaSymbol, isBot: players[1].isBot },
    ];

    return {
      board: Array(9).fill(null),
      players: assignedPlayers,
      currentTurn: assignedPlayers[0].id,
      winner: null,
      winningLine: null,
      isDraw: false,
    };
  }

  validateAction(state: TresEnRayaState, playerId: string, action: TresEnRayaAction): boolean {
    if (!action || typeof action !== 'object' || Array.isArray(action)) return false;
    if (state.winner !== null || state.isDraw) {
      return false;
    }

    if (state.currentTurn !== playerId) {
      return false;
    }

    if (action.type !== 'MAKE_MOVE') {
      return false;
    }

    const index = action.index;
    if (!Number.isInteger(index) || index < 0 || index > 8) {
      return false;
    }

    return state.board[index] === null;
  }

  applyAction(state: TresEnRayaState, playerId: string, action: TresEnRayaAction): TresEnRayaState {
    if (!this.validateAction(state, playerId, action)) return state;
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found in game state`);
    }

    const newBoard: TresEnRayaBoard = [...state.board];
    newBoard[action.index] = player.symbol;

    const { winnerSymbol, line } = checkBoardWinner(newBoard);

    if (winnerSymbol) {
      return {
        ...state,
        board: newBoard,
        winner: playerId,
        winningLine: line,
        isDraw: false,
      };
    }

    if (isBoardFull(newBoard)) {
      return {
        ...state,
        board: newBoard,
        winner: null,
        winningLine: null,
        isDraw: true,
      };
    }

    // Next player's turn
    const nextPlayer = state.players.find((p) => p.id !== playerId);
    return {
      ...state,
      board: newBoard,
      currentTurn: nextPlayer ? nextPlayer.id : state.currentTurn,
    };
  }

  getSanitizedState(state: TresEnRayaState, _playerId: string): TresEnRayaPublicState {
    // Tic-Tac-Toe has full public visibility
    return {
      board: [...state.board],
      players: state.players.map((p) => ({ ...p })),
      currentTurn: state.currentTurn,
      winner: state.winner,
      winningLine: state.winningLine ? ([...state.winningLine] as [number, number, number]) : null,
      isDraw: state.isDraw,
    };
  }

  checkWinner(state: TresEnRayaState): string | null {
    return state.winner;
  }

  forfeitPlayer(state: TresEnRayaState, id: string): TresEnRayaState {
    if (state.winner || state.isDraw || !state.players.some((p) => p.id === id)) return state;
    return { ...state, winner: state.players.find((p) => p.id !== id)!.id };
  }

  getBotAction(state: TresEnRayaState, botId: string): TresEnRayaAction | null {
    if (state.winner !== null || state.isDraw) {
      return null;
    }

    if (state.currentTurn !== botId) {
      return null;
    }

    const botPlayer = state.players.find((p) => p.id === botId);
    if (!botPlayer) {
      return null;
    }

    const moveIndex = getBestTresEnRayaMove([...state.board], botPlayer.symbol);
    return {
      type: 'MAKE_MOVE',
      index: moveIndex,
    };
  }
}
