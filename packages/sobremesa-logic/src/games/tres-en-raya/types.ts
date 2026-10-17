export type TresEnRayaCell = 'X' | 'O' | null;

export type TresEnRayaBoard = TresEnRayaCell[];

export type TresEnRayaSymbol = 'X' | 'O';

export interface TresEnRayaPlayer {
  id: string;
  symbol: TresEnRayaSymbol;
  isBot: boolean;
}

export interface TresEnRayaState {
  board: TresEnRayaBoard;
  players: TresEnRayaPlayer[];
  currentTurn: string; // playerId whose turn it is
  winner: string | null; // playerId or null
  winningLine: [number, number, number] | null; // e.g. [0, 1, 2]
  isDraw: boolean;
}

export type TresEnRayaAction = {
  type: 'MAKE_MOVE';
  index: number; // 0-8
};

export type TresEnRayaPublicState = TresEnRayaState;
