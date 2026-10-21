/// <reference types="vitest" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

// BASE_PATH lets the same bundle be served from a sub-path (e.g. GitHub Pages: /vue-cloud-console/).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173 },
  test: { globals: true, environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], css: false },
});
