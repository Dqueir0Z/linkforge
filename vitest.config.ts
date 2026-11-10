/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // As regras testadas (URL, alias, datas) são funções puras: não precisam de DOM.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
