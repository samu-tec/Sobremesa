import { IGameEngine } from '../../engine/IGameEngine.js';
import {
  TicTacToeAction,
  TicTacToeBoard,
  TicTacToePublicState,
  TicTacToeState,
  TicTacToeSymbol,
} from './types.js';
import { checkBoardWinner, getBestTicTacToeMove, isBoardFull } from './bot.js';

export class TicTacToeEngine implements IGameEngine<
  TicTacToeState,
  TicTacToeAction,
  TicTacToePublicState
> {
  initGame(players: { id: string; isBot: boolean; name?: string }[]): TicTacToeState {
    if (players.length !== 2) {
      throw new Error('TicTacToe requires exactly 2 players');
    }

    const assignedPlayers = [
      { id: players[0].id, symbol: 'X' as TicTacToeSymbol, isBot: players[0].isBot },
      { id: players[1].id, symbol: 'O' as TicTacToeSymbol, isBot: players[1].isBot },
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

  validateAction(state: TicTacToeState, playerId: string, action: TicTacToeAction): boolean {
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

  applyAction(state: TicTacToeState, playerId: string, action: TicTacToeAction): TicTacToeState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found in game state`);
    }

    const newBoard: TicTacToeBoard = [...state.board];
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

  getSanitizedState(state: TicTacToeState, _playerId: string): TicTacToePublicState {
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

  checkWinner(state: TicTacToeState): string | null {
    return state.winner;
  }

  forfeitPlayer(state: TicTacToeState, id: string): TicTacToeState {
    return { ...state, winner: state.players.find((p) => p.id !== id)!.id };
  }

  getBotAction(state: TicTacToeState, botId: string): TicTacToeAction | null {
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

    const moveIndex = getBestTicTacToeMove([...state.board], botPlayer.symbol);
    return {
      type: 'MAKE_MOVE',
      index: moveIndex,
    };
  }
}
