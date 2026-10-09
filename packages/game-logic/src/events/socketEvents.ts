import { GameType, RoomInfo } from '../types/index.js';

export interface ServerToClientEvents {
  'room:updated': (room: RoomInfo) => void;
  'room:closed': (reason: string) => void;
  'game:started': (data: { gameType: GameType; publicState: any }) => void;
  'game:state_update': (publicState: any) => void;
  'game:ended': (data: { winnerId: string | null; winnerName: string; isDraw?: boolean }) => void;
  'game:error': (message: string) => void;
  'game:notification': (notification: { text: string; type?: 'info' | 'warning' | 'action' }) => void;
}

export interface ClientToServerEvents {
  'room:create': (
    data: { playerName: string; gameType: GameType; playerId: string },
    callback: (res: { success: boolean; room?: RoomInfo; error?: string }) => void
  ) => void;

  'room:join': (
    data: { roomCode: string; playerName: string; playerId: string },
    callback: (res: { success: boolean; room?: RoomInfo; error?: string }) => void
  ) => void;

  'room:leave': (callback?: (res: { success: boolean }) => void) => void;

  'room:add_bot': (callback: (res: { success: boolean; error?: string }) => void) => void;

  'room:remove_bot': (
    data: { botId: string },
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;

  'room:start_game': (callback: (res: { success: boolean; error?: string }) => void) => void;

  'room:update_rules': (
    rules: any,
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;

  'room:restart_game': (callback: (res: { success: boolean; error?: string }) => void) => void;

  'game:action': (
    action: any,
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;

  'game:reconnect': (
    data: { roomCode: string; playerId: string },
    callback: (res: { success: boolean; room?: RoomInfo; state?: any; error?: string }) => void
  ) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId?: string;
  playerName?: string;
  roomCode?: string;
}
