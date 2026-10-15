import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@games/game-logic';
export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
const memory = new Map<string, string>();
export const sessionStore = {
  get(key: string) {
    try {
      return sessionStorage.getItem(key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  set(key: string, value: string) {
    memory.set(key, value);
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* Private browsers can disallow persistence. */
    }
  },
  remove(key: string) {
    memory.delete(key);
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* Memory remains usable. */
    }
  },
};
let token = sessionStore.get('sobremesa.session');
if (!token || !/^[a-f0-9]{64}$/.test(token)) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  sessionStore.set('sobremesa.session', token);
}
// Same origin in production and through the Vite proxy; no hard-coded public server.
export const socket: GameSocket = io(import.meta.env.VITE_SERVER_URL || undefined, {
  autoConnect: false,
  auth: { sessionToken: token },
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
});
