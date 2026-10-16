import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from 'sobremesa-logic';
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
function createSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
let token = sessionStore.get('sobremesa.session');
if (!token || !/^[a-f0-9]{64}$/.test(token)) {
  token = createSessionToken();
  sessionStore.set('sobremesa.session', token);
}
const tabId = randomId();
let tabChannel: BroadcastChannel | null = null;
try {
  if (
    typeof BroadcastChannel !== 'undefined' &&
    typeof window !== 'undefined' &&
    window.location.pathname !== '/privacy'
  ) {
    tabChannel = new BroadcastChannel('sobremesa.tab-presence');
  }
} catch {
  /* Tab detection is optional when the browser blocks BroadcastChannel. */
}
function randomId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
function fallbackFingerprint(value: string) {
  let first = 0x811c9dc5,
    second = 0x01000193;
  for (let index = 0; index < value.length; index++) {
    first = Math.imul(first ^ value.charCodeAt(index), 0x01000193);
    second = Math.imul(second ^ (value.charCodeAt(index) + index), 0x85ebca6b);
  }
  return `${(first >>> 0).toString(16)}${(second >>> 0).toString(16)}`;
}
function fingerprintFor(value: string) {
  try {
    return crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(value))
      .then((buffer) =>
        Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join(''),
      )
      .catch(() => fallbackFingerprint(value));
  } catch {
    return Promise.resolve(fallbackFingerprint(value));
  }
}
let fingerprint = fingerprintFor(token);
if (tabChannel) {
  tabChannel.addEventListener('message', (event: MessageEvent) => {
    const data = event.data;
    if (
      !data ||
      data.type !== 'probe' ||
      typeof data.requestId !== 'string' ||
      typeof data.fingerprint !== 'string' ||
      data.tabId === tabId
    )
      return;
    void fingerprint.then((current) => {
      tabChannel.postMessage({
        type: 'presence',
        requestId: data.requestId,
        tabId,
        sameSession: current === data.fingerprint,
      });
    });
  });
}
export function findOtherSobremesaTab(timeoutMs = 350): Promise<{ sameSession: boolean } | null> {
  if (!tabChannel) return Promise.resolve(null);
  return fingerprint.then(
    (current) =>
      new Promise((resolve) => {
        const requestId = randomId();
        let found: { sameSession: boolean } | null = null;
        const receive = (event: MessageEvent) => {
          const data = event.data;
          if (
            data?.type === 'presence' &&
            data.requestId === requestId &&
            data.tabId !== tabId &&
            typeof data.sameSession === 'boolean'
          ) {
            if (data.sameSession || !found) found = { sameSession: data.sameSession };
          }
        };
        tabChannel.addEventListener('message', receive);
        tabChannel.postMessage({ type: 'probe', requestId, tabId, fingerprint: current });
        setTimeout(() => {
          tabChannel.removeEventListener('message', receive);
          resolve(found);
        }, timeoutMs);
      }),
  );
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
export function startNewGuestSession() {
  token = createSessionToken();
  sessionStore.set('sobremesa.session', token);
  sessionStore.remove('sobremesa.playerId');
  sessionStore.remove('sobremesa.room');
  socket.auth = { sessionToken: token };
  fingerprint = fingerprintFor(token);
}
