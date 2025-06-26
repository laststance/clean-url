/**
 * Jest Test Setup
 * Global test configuration and mocks
 */

// Mock Chrome Extension APIs for testing
global.chrome = {
  tabs: {
    query: jest.fn(),
    update: jest.fn(),
    get: jest.fn()
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn()
  },
  runtime: {
    onInstalled: {
      addListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    },
    onMessage: {
      addListener: jest.fn()
    }
  },
  contextMenus: {
    create: jest.fn(),
    onClicked: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      set: jest.fn(),
      get: jest.fn()
    }
  }
};

// Mock navigator.clipboard for testing
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
});

// Mock URL constructor if needed
if (!global.URL) {
  global.URL = class URL {
    constructor(url) {
      const urlObj = new (require('url')).URL(url);
      Object.assign(this, urlObj);
    }
  };
}

// Mock URLSearchParams if needed
if (!global.URLSearchParams) {
  global.URLSearchParams = require('url').URLSearchParams;
}

// Add custom Jest matchers
expect.extend({
  toBeValidUrl(received) {
    const pass = typeof received === 'string' && 
                 received.length > 0 && 
                 (received.startsWith('http://') || received.startsWith('https://'));
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false,
      };
    }
  },

  toHaveTrackingParams(received) {
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'ck_subscriber_id', 'mc_cid', 'mc_eid'
    ];
    
    const url = new URL(received);
    const params = url.searchParams;
    const hasTracking = trackingParams.some(param => params.has(param));
    
    if (hasTracking) {
      return {
        message: () => `expected ${received} not to have tracking parameters`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have tracking parameters`,
        pass: false,
      };
    }
  }
});

// Console error handler for tests
const originalError = console.error;
console.error = (...args) => {
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