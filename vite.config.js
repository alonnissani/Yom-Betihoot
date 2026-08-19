import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: 'client',
  publicDir: 'public',
  plugins: [react()],
  resolve: { alias: { '@shared': path.resolve(process.cwd(), 'shared') } },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': { target: 'ws://localhost:3000', ws: true },
    },
  },
  build: { outDir: '../dist', emptyOutDir: true },
});
