import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup após cada teste
afterEach(() => {
  cleanup();
});

// Mock do window.matchMedia (usado por componentes responsivos)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock do IntersectionObserver (usado por lazy loading)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock do ResizeObserver (usado por alguns componentes UI)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Suprimir console.error para testes mais limpos (opcional)
// Pode ser útil para não poluir o output dos testes
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    // Ignorar erros específicos do React Testing Library
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Adicionar matchers customizados do jest-dom
import { cleanup as cleanupHooks } from '@testing-library/react';
import { afterAll, beforeAll } from 'vitest';

// Export para uso em testes
export { expect, vi };
