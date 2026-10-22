import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import {
  GAME_CATALOG,
  PROTOCOL_VERSION,
  PROTOCOL_MISMATCH,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from 'sobremesa-logic';
import { contentSecurityPolicy } from './origins.js';
import { CONFIG } from './config.js';
import { resolveClientIp } from './clientIp.js';
import { RoomManager } from './RoomManager.js';
import { RoomCreationLimiter } from './RoomCreationLimiter.js';
import { registerSocketHandlers } from './socketHandlers.js';
const app = express();
app.disable('x-powered-by');
const allowedOrigin = (origin: string | undefined) =>
  !origin || CONFIG.ALLOWED_ORIGINS.includes(origin);
app.use(cors({ origin: (origin, cb) => cb(null, allowedOrigin(origin)), credentials: false }));
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': contentSecurityPolicy(CONFIG.ALLOWED_ORIGINS),
  });
  if (process.env.NODE_ENV === 'production')
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});
const server = http.createServer(app);
server.headersTimeout = 10000;
server.requestTimeout = 15000;
const MAX_TRACKED_IPS = 10000;
const connections = new Map<string, { attempts: number; reset: number; active: number }>();
const roomCreationLimiter = new RoomCreationLimiter(
  CONFIG.ROOM_CREATE_LIMIT_PER_IP,
  CONFIG.ROOM_CREATE_LIMIT_GLOBAL,
  CONFIG.ROOM_CREATE_WINDOW_MS,
);
const ipFor = (req: http.IncomingMessage) =>
  resolveClientIp(
    req.socket.remoteAddress,
    req.headers['cf-connecting-ip'],
    CONFIG.TRUSTED_CLOUDFLARE_IPS,
  );
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  server,
  {
    cors: { origin: (origin, cb) => cb(null, allowedOrigin(origin)), methods: ['GET', 'POST'] },
    allowRequest: (req, callback) => {
      if (!allowedOrigin(req.headers.origin) || io.engine.clientsCount >= CONFIG.MAX_CONNECTIONS) {
        callback('Acceso no permitido', false);
        return;
      }
      const ip = ipFor(req),
        now = Date.now(),
        previous = connections.get(ip);
      if (!previous && connections.size >= MAX_TRACKED_IPS) {
        callback('Servidor ocupado', false);
        return;
      }
      const bucket =
        previous && previous.reset > now
          ? previous
          : { attempts: 0, reset: now + 60000, active: previous?.active || 0 };
      bucket.attempts++;
      connections.set(ip, bucket);
      callback(
        null,
        bucket.attempts <= CONFIG.MAX_HANDSHAKE_ATTEMPTS_PER_MINUTE && bucket.active < 30,
      );
    },
    maxHttpBufferSize: 16 * 1024,
    pingTimeout: 20000,
    pingInterval: 15000,
    perMessageDeflate: false,
  },
);
// Polling responses contain private game state and must never be stored by a proxy.
io.engine.on('headers', (headers) => {
  headers['Cache-Control'] = 'no-store';
  headers['X-Content-Type-Options'] = 'nosniff';
});
let activeSessions = 0;
io.use((socket, next) => {
  const clientVersion: unknown = socket.handshake.auth?.protocolVersion;
  if (clientVersion !== undefined && clientVersion !== PROTOCOL_VERSION) {
    const error = Object.assign(new Error('Actualiza Sobremesa para volver a conectar.'), {
      data: { code: PROTOCOL_MISMATCH, protocolVersion: PROTOCOL_VERSION },
    });
    next(error);
    return;
  }
  const token: unknown = socket.handshake.auth?.sessionToken;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    next(new Error('Sesión no válida. Recarga la página.'));
    return;
  }
  // Public player IDs are derived from private, cryptographically random browser secrets.
  // A supplied playerId in an event cannot authorize any action.
  // Reserve before next(): concurrent namespace handshakes must share the same limits.
  const bucket = connections.get(ipFor(socket.request));
  if (!bucket || bucket.active >= 30 || activeSessions >= CONFIG.MAX_CONNECTIONS) {
    next(new Error('Servidor ocupado'));
    return;
  }
  bucket.active++;
  activeSessions++;
  socket.data.playerId = `guest_${createHash('sha256').update(token).digest('hex').slice(0, 32)}`;
  next();
});
const manager = new RoomManager(io);
io.on('connection', (socket) => {
  const ip = ipFor(socket.request);
  socket.on('disconnect', () => {
    activeSessions = Math.max(0, activeSessions - 1);
    const entry = connections.get(ip);
    if (entry) entry.active = Math.max(0, entry.active - 1);
  });
  if (socket.handshake.auth?.protocolVersion === undefined) {
    // Browsers from before version negotiation already understand game:error.
    // They must receive a useful message even though their connect_error UI is silent.
    socket.emit(
      'game:error',
      'Recarga la página para volver a intentarlo. Si tu sala sigue activa, recuperaremos tu sitio.',
    );
    socket.emit('session:incompatible', { protocolVersion: PROTOCOL_VERSION });
    socket.disconnect(true);
    return;
  }
  registerSocketHandlers(io, socket, manager, {
    allowAttempt: () => roomCreationLimiter.allowAttempt(ip),
    canCreateGlobally: () => roomCreationLimiter.canCreateGlobally(),
    recordCreated: () => roomCreationLimiter.recordCreated(),
  });
});
const sweep = setInterval(() => {
  roomCreationLimiter.sweep();
  for (const [ip, bucket] of connections)
    if (!bucket.active && bucket.reset < Date.now()) connections.delete(ip);
}, 60000);
sweep.unref();
app.get('/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'ok' });
});
app.get('/api/stats', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ activeRooms: manager.getRoomsCount(), supportedGames: GAME_CATALOG.map((g) => g.id) });
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
const clientDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../sobremesa-client/dist',
);
if (fs.existsSync(clientDist)) {
  app.use(
    express.static(clientDist, {
      dotfiles: 'deny',
      index: false,
      setHeaders: (res, file) => {
        res.setHeader(
          'Cache-Control',
          file.includes(`${path.sep}assets${path.sep}`)
            ? 'public, max-age=31536000, immutable'
            : 'no-cache',
        );
      },
    }),
  );
  app.get('*', (req, res) => {
    if (path.extname(req.path)) {
      res.status(404).end();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}
server.listen(CONFIG.PORT, CONFIG.HOST, () =>
  console.log(`Sobremesa disponible en http://${CONFIG.HOST}:${CONFIG.PORT}`),
);
let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  clearInterval(sweep);
  manager.dispose();
  io.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
