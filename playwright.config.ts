import { defineConfig } from '@playwright/test';
const externalURL = process.env.PLAYWRIGHT_BASE_URL;
if (externalURL && !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(externalURL).hostname))
  throw new Error('Las pruebas operativas solo pueden ejecutarse en localhost.');
const browser = process.env.PLAYWRIGHT_BROWSER || 'chrome';
export default defineConfig({
  testDir: './tests/browser',
  outputDir: `./tests/.output/results/${browser}-${externalURL ? new URL(externalURL).port || 'external' : 'local'}`,
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 10000 },
  reporter: [['list']],
  use: {
    baseURL: externalURL || 'http://127.0.0.1:3187',
    browserName: browser === 'firefox' || browser === 'webkit' ? browser : 'chromium',
    channel: browser === 'chrome' ? 'chrome' : undefined,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: externalURL
    ? undefined
    : {
        command: 'node apps/sobremesa-server/dist/server.js',
        url: 'http://127.0.0.1:3187/health',
        reuseExistingServer: false,
        timeout: 15000,
        env: {
          PORT: '3187',
          ALLOWED_ORIGINS: 'http://127.0.0.1:3187',
          TRUSTED_CLOUDFLARE_IPS: '',
          HOST: '127.0.0.1',
          NODE_ENV: 'production',
          BOT_THINKING_TIME_MS: '60',
          MAX_HANDSHAKE_ATTEMPTS_PER_MINUTE: '1000',
          ROOM_CREATE_LIMIT_PER_IP: '100',
          ROOM_CREATE_LIMIT_GLOBAL: '500',
        },
      },
});
