export type GameType = 'tictactoe' | 'colorclash' | 'monopoly' | 'connect4' | 'reversi' | 'pig';

export type RoomStatus = 'waiting' | 'in_game' | 'finished';

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  connected: boolean;
  isHost: boolean;
}

export interface RoomInfo {
  code: string;
  gameType: GameType;
  hostId: string;
  status: RoomStatus;
  players: Player[];
  maxPlayers: number;
  minPlayers: number;
  customRules?: any;
  turnSeconds: number;
  turnDeadline: number | null;
  serverNow: number;
  reconnectGraceMs: number;
}
