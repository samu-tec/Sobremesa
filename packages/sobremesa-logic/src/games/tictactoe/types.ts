export type TicTacToeCell = 'X' | 'O' | null;

export type TicTacToeBoard = TicTacToeCell[];

export type TicTacToeSymbol = 'X' | 'O';

export interface TicTacToePlayer {
  id: string;
  symbol: TicTacToeSymbol;
  isBot: boolean;
}

export interface TicTacToeState {
  board: TicTacToeBoard;
  players: TicTacToePlayer[];
  currentTurn: string; // playerId whose turn it is
  winner: string | null; // playerId or null
  winningLine: [number, number, number] | null; // e.g. [0, 1, 2]
  isDraw: boolean;
}

export type TicTacToeAction = {
  type: 'MAKE_MOVE';
  index: number; // 0-8
};

export type TicTacToePublicState = TicTacToeState;
