import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@games/game-logic';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL || (
  typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:3000'
    : '/'
);

export const socket: GameSocket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});
