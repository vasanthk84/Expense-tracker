import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            // Suppress noisy ECONNRESET logs during server restarts
            if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') return;
            console.error('[proxy error]', err.message);
          });
        }
      }
    }
  }
});
