import type { GameType, RoomInfo, GamePublicState } from '../types/index.js';
export interface Result {
  success: boolean;
  error?: string;
  errorCode?: 'ROOM_UNAVAILABLE' | 'NOT_A_MEMBER' | 'ROOM_CREATE_RATE_LIMITED';
}
export interface RoomResult extends Result {
  room?: RoomInfo;
  state?: GamePublicState | null;
}
export interface ServerToClientEvents {
  'session:incompatible': (data: { protocolVersion: number }) => void;
  'session:replaced': () => void;
  'session:ready': (data: { playerId: string; protocolVersion: number }) => void;
  'room:updated': (room: RoomInfo) => void;
  'room:closed': (reason: string) => void;
  'game:started': (data: { gameType: GameType; publicState: GamePublicState }) => void;
  'game:state_update': (publicState: GamePublicState) => void;
  'game:ended': (data: { winnerId: string | null; winnerName: string; isDraw?: boolean }) => void;
  'game:error': (message: string) => void;
  'game:notification': (notification: {
    text: string;
    type?: 'info' | 'warning' | 'action';
  }) => void;
}
export interface ClientToServerEvents {
  'room:create': (
    data: { playerName: string; gameType: GameType },
    callback: (res: RoomResult) => void,
  ) => void;
  'room:join': (
    data: { roomCode: string; playerName: string },
    callback: (res: RoomResult) => void,
  ) => void;
  'room:leave': (callback?: (res: Result) => void) => void;
  'room:add_bot': (callback: (res: Result) => void) => void;
  'room:remove_bot': (data: { botId: string }, callback: (res: Result) => void) => void;
  'room:start_game': (callback: (res: Result) => void) => void;
  'room:update_rules': (rules: unknown, callback?: (res: Result) => void) => void;
  'room:restart_game': (callback: (res: Result) => void) => void;
  'game:action': (action: unknown, callback?: (res: Result) => void) => void;
  'game:reconnect': (data: { roomCode: string }, callback: (res: RoomResult) => void) => void;
}
export interface InterServerEvents {
  ping: () => void;
}
export interface SocketData {
  playerId: string;
  roomCode?: string;
}
