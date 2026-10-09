import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  DISCONNECT_GRACE_PERIOD_MS: parseInt(process.env.DISCONNECT_GRACE_PERIOD_MS || '45000', 10),
  BOT_THINKING_TIME_MS: parseInt(process.env.BOT_THINKING_TIME_MS || '750', 10),
  CLEANUP_INTERVAL_MS: 60 * 1000,
  ROOM_MAX_IDLE_TIME_MS: 30 * 60 * 1000, // 30 minutes
};
