import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Failed modulepreload requests can remain cached across reloads in WebKit.
  // Keep native lazy imports and Vite's async CSS loading, without speculative JS preloads.
  build: { modulePreload: false },
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: true,
    proxy: {
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        ws: true,
      },
      '/api': {
        target: 'http://127.0.0.1:3000',
      },
      '/health': {
        target: 'http://127.0.0.1:3000',
      },
    },
  },
});
