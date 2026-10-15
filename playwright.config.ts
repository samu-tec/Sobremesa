import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  outputDir: './tests/.output/results',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 10000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3187',
    channel: process.env.PLAYWRIGHT_BROWSER === 'chromium' ? undefined : 'chrome',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node apps/server/dist/server.js',
    url: 'http://127.0.0.1:3187/health',
    reuseExistingServer: false,
    timeout: 15000,
    env: {
      PORT: '3187',
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
      BOT_THINKING_TIME_MS: '60',
      ROOM_CREATE_LIMIT_PER_IP: '100',
      ROOM_CREATE_LIMIT_GLOBAL: '500',
    },
  },
});
