/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The FastAPI backend does not enable cross-origin requests, so during local
// development Vite forwards API paths to it from the same origin (a dev proxy).
// No backend security setting is changed.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.BDZ_BACKEND_URL || 'http://127.0.0.1:8000';
  const proxy = Object.fromEntries(
    ['/api', '/fhir', '/health'].map((path) => [path, { target, changeOrigin: false }]),
  );
  return {
    plugins: [react()],
    server: { host: '127.0.0.1', port: 5173, proxy },
    preview: { host: '127.0.0.1', port: 4173, proxy },
    build: {
      rollupOptions: { output: { manualChunks: { charts: ['recharts'], react: ['react', 'react-dom', 'react-router-dom'] } } },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
