/**
 * Vitest Setup File
 * Configuração global para testes
 */

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup após cada teste
afterEach(() => {
  cleanup();
});

// Mock global do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

global.localStorage = localStorageMock as any;

// Mock global do fetch
global.fetch = vi.fn();

// Reset mocks após cada teste
afterEach(() => {
  vi.clearAllMocks();
});
