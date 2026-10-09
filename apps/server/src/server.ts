import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import {
  ClientToServerEvents,
  GameLifecycleHooks,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@games/game-logic';
import { CONFIG } from './config.js';
import { RoomManager } from './RoomManager.js';
import { registerSocketHandlers } from './socketHandlers.js';

const app = express();
app.use(cors({ origin: CONFIG.CORS_ORIGIN, credentials: true }));
app.use(express.json());

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
  cors: {
    origin: CONFIG.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 10000,
});

// Lifecycle hooks for analytics, ad hooks, or reward logic
const lifecycleHooks: GameLifecycleHooks = {
  onGameStart: ({ roomCode, gameType, playerIds }) => {
    console.log(`[Lifecycle] Game started in room ${roomCode} (${gameType}) with ${playerIds.length} players`);
  },
  onGameEnd: ({ roomCode, gameType, winnerId, durationMs }) => {
    console.log(`[Lifecycle] Game finished in room ${roomCode} (${gameType}). Winner: ${winnerId || 'Draw'}. Duration: ${(durationMs / 1000).toFixed(1)}s`);
  },
};

const roomManager = new RoomManager(io, lifecycleHooks);

// Health check endpoint (for Cloudflare Tunnels, Docker, monitoring)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    activeRooms: roomManager.getRoomsCount(),
    timestamp: new Date().toISOString(),
  });
});

// Platform stats endpoint
app.get('/api/stats', (_req, res) => {
  res.json({
    activeRooms: roomManager.getRoomsCount(),
    serverTime: Date.now(),
    supportedGames: ['tictactoe', 'colorclash', 'monopoly'],
  });
});

// Serve static frontend assets in production if built
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

if (fs.existsSync(clientDistPath)) {
  console.log(`Serving static client files from ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Socket connection
io.on('connection', (socket) => {
  registerSocketHandlers(io, socket, roomManager);
});

server.listen(CONFIG.PORT, () => {
  console.log(`🎮 Game Server running on http://localhost:${CONFIG.PORT}`);
  console.log(`⚡ Socket.IO listening on port ${CONFIG.PORT} with Server-Authoritative state`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down server gracefully...');
  roomManager.dispose();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
