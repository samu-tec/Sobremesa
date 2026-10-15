import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({
  path: process.env.ENV_FILE || fileURLToPath(new URL('../../../.env', import.meta.url)),
});
function integer(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`Configuración no válida: ${name}`);
  return value;
}
export const CONFIG = {
  PORT: integer('PORT', 3000, 1, 65535),
  HOST: process.env.HOST || '127.0.0.1',
  ALLOWED_ORIGINS: (
    process.env.ALLOWED_ORIGINS ||
    `https://games.samuelciocan.com,http://localhost:5173,http://127.0.0.1:5173,http://localhost:${process.env.PORT || '3000'},http://127.0.0.1:${process.env.PORT || '3000'}`
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  TRUST_CLOUDFLARE: process.env.TRUST_CLOUDFLARE === 'true',
  DISCONNECT_GRACE_PERIOD_MS: integer('DISCONNECT_GRACE_PERIOD_MS', 300000, 1000, 300000),
  BOT_THINKING_TIME_MS: integer('BOT_THINKING_TIME_MS', 650, 10, 10000),
  CLEANUP_INTERVAL_MS: 60000,
  ROOM_MAX_IDLE_TIME_MS: 6 * 60 * 60 * 1000,
  MAX_ROOMS: integer('MAX_ROOMS', 500, 1, 1000),
  MAX_CONNECTIONS: integer('MAX_CONNECTIONS', 2000, 1, 5000),
  ROOM_CREATE_LIMIT_PER_IP: integer('ROOM_CREATE_LIMIT_PER_IP', 10, 1, 100),
  ROOM_CREATE_LIMIT_GLOBAL: integer('ROOM_CREATE_LIMIT_GLOBAL', 30, 1, 500),
  ROOM_CREATE_WINDOW_MS: integer('ROOM_CREATE_WINDOW_MS', 60000, 1000, 3600000),
};
