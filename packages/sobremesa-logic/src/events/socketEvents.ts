import type { GameType, RoomInfo, GamePublicState } from '../types/index.js';
export interface RoomContext {
  matchId: string;
}
export type GameSnapshot = GamePublicState & RoomContext & { gameType: GameType };
export interface Result {
  success: boolean;
  error?: string;
  errorCode?: 'ROOM_UNAVAILABLE' | 'NOT_A_MEMBER' | 'ROOM_CREATE_RATE_LIMITED';
}
export interface RoomResult extends Result {
  room?: RoomInfo;
  state?: GameSnapshot | null;
}
export interface ServerToClientEvents {
  'session:incompatible': (data: { protocolVersion: number }) => void;
  'session:replaced': () => void;
  'session:ready': (data: { playerId: string; protocolVersion: number }) => void;
  'room:updated': (room: RoomInfo) => void;
  'room:removed': (reason: string) => void;
  'room:closed': (reason: string) => void;
  'game:started': (data: {
    gameType: GameType;
    matchId: string;
    publicState: GameSnapshot;
  }) => void;
  'game:state_update': (publicState: GameSnapshot) => void;
  'game:ended': (data: { winnerId: string | null; winnerName: string; isDraw?: boolean }) => void;
  'game:error': (message: string) => void;
  'game:notification': (notification: {
    text: import('../messages.js').GameText;
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
  'room:add_bot': (context: RoomContext, callback: (res: Result) => void) => void;
  'room:remove_bot': (
    data: { botId: string; matchId: string },
    callback: (res: Result) => void,
  ) => void;
  'room:remove_player': (
    data: RoomContext & { playerId: string },
    callback: (res: Result) => void,
  ) => void;
  'room:resolve_autoplay': (
    data: RoomContext & { playerId: string; decision: 'keep' | 'remove' },
    callback: (res: Result) => void,
  ) => void;
  'room:set_autoplay': (
    data: RoomContext & { enabled: boolean },
    callback: (res: Result) => void,
  ) => void;
  'room:update_name': (
    data: RoomContext & { playerName: string },
    callback: (res: Result) => void,
  ) => void;
  'room:change_game': (
    data: RoomContext & { gameType: GameType },
    callback: (res: Result) => void,
  ) => void;
  'room:start_game': (context: RoomContext, callback: (res: Result) => void) => void;
  'room:update_rules': (
    data: RoomContext & { rules: unknown },
    callback?: (res: Result) => void,
  ) => void;
  'room:restart_game': (context: RoomContext, callback: (res: Result) => void) => void;
  'game:action': (
    data: RoomContext & { action: unknown },
    callback?: (res: Result) => void,
  ) => void;
  'game:reconnect': (data: { roomCode: string }, callback: (res: RoomResult) => void) => void;
}
export interface InterServerEvents {
  ping: () => void;
}
export interface SocketData {
  playerId: string;
  roomCode?: string;
}
