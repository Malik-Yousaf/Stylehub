import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// StyleHub React frontend.
// In dev (`npm run dev` inside /client) it proxies API/upload calls to the
// Node backend (server.js) which you run separately on port 3000.
// In prod (`npm run build`) it outputs to ../dist, which server.js serves
// as static files, so `node server.js` alone serves the whole site.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000'
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});
