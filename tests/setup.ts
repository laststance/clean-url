/**
 * Vitest Test Setup
 * Global test configuration and mocks
 */

import { vi } from 'vitest';

// Mock Chrome Extension APIs for testing
(global as any).chrome = {
  tabs: {
    query: vi.fn(),
    update: vi.fn(),
    get: vi.fn()
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn()
  },
  runtime: {
    onInstalled: {
      addListener: vi.fn()
    },
    onStartup: {
      addListener: vi.fn()
    },
    onMessage: {
      addListener: vi.fn()
    }
  },
  contextMenus: {
    create: vi.fn(),
    removeAll: vi.fn(),
    onClicked: {
      addListener: vi.fn()
    }
  },
  storage: {
    local: {
      set: vi.fn(),
      get: vi.fn()
    }
  }
};

// Mock navigator.clipboard for testing
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined)
  },
  configurable: true
});

// Console error handler for tests
const originalError = console.error;
console.error = (...args: any[]) => {
  // Suppress known warnings/errors during tests
  const message = args[0];
  if (typeof message === 'string') {
    // Suppress Chrome extension API warnings
    if (message.includes('chrome') || message.includes('extension')) {
      return;
    }
  }
  originalError.apply(console, args);
};
