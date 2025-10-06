import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Ambiente de teste
    environment: 'jsdom',

    // Arquivos de setup
    setupFiles: ['./test/setup.ts'],

    // Globals (opcional, mas útil para usar expect sem import)
    globals: true,

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'vite.config.ts',
        'vitest.config.ts',
      ],
      // Meta: 40% de cobertura
      statements: 40,
      branches: 40,
      functions: 40,
      lines: 40,
    },

    // Incluir arquivos de teste
    include: [
      '**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],

    // Excluir
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
    ],

    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,

    // Watch mode
    watch: false,

    // Reporters
    reporters: ['verbose'],

    // Mock de CSS e assets
    css: true,

    // Threads
    threads: true,

    // Isolate
    isolate: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@server': path.resolve(__dirname, './server'),
    },
  },
});
