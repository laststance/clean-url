/**
 * Coverage-Enabled Tests for Clean URL Logic
 * Uses proper module imports for Jest coverage instrumentation
 */

const fs = require('fs');
const path = require('path');

// Create a proper module wrapper that Jest can instrument
const cleanUrlLogicPath = path.join(__dirname, '../../clean-url-logic.js');
const cleanUrlLogicCode = fs.readFileSync(cleanUrlLogicPath, 'utf8');

// Create a module that can be instrumented
const Module = require('module');
const originalRequire = Module.prototype.require;

// Mock the module exports for coverage
let CleanUrlLogic;

// Parse and execute the code in a way that Jest can track
const vm = require('vm');
const moduleWrapper = {
  exports: {},
  require: require,
  module: { exports: {} },
  __filename: cleanUrlLogicPath,
  __dirname: path.dirname(cleanUrlLogicPath)
};

// Execute in context that Jest can track
const script = new vm.Script(cleanUrlLogicCode, {
  filename: cleanUrlLogicPath,
  lineOffset: 0,
  displayErrors: true
});

const context = vm.createContext({
  module: moduleWrapper.module,
  exports: moduleWrapper.exports,
  require: moduleWrapper.require,
  __filename: moduleWrapper.__filename,
  __dirname: moduleWrapper.__dirname,
  console: console,
  process: process,
  Buffer: Buffer,
  setTimeout: setTimeout,
  setInterval: setInterval,
  clearTimeout: clearTimeout,
  clearInterval: clearInterval,
  URL: URL,
  URLSearchParams: URLSearchParams,
  performance: performance,
  global: global,
  globalThis: globalThis
});

script.runInContext(context);
CleanUrlLogic = moduleWrapper.module.exports;

// Load test fixtures
const testUrlsPath = path.join(__dirname, '..', 'test-urls.json');
const testUrls = JSON.parse(fs.readFileSync(testUrlsPath, 'utf8'));

describe('Clean URL Logic - Coverage Tests', () => {

  describe('Core functionality with test-urls.json', () => {
    // Generate tests for each URL in test-urls.json
    Object.entries(testUrls).forEach(([testName, testCase]) => {
      test(`${testCase.description}`, () => {
        const result = CleanUrlLogic.cleanUrl(testCase.original);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(testCase.expected);
        expect(result.removedCount).toBe(testCase.expectedRemovedCount);

        if (testCase.expectedRemovedCount > 0) {
          expect(result.hasChanges).toBe(true);
          expect(result.savedBytes).toBeGreaterThan(0);
        } else {
          expect(result.hasChanges).toBe(false);
        }
      });
    });
  });

  describe('analyzeUrl coverage', () => {
    test('should analyze URL with multiple tracking categories', () => {
      const url = 'https://example.com?utm_source=google&fbclid=123&gclid=456&mc_cid=789&ref=partner';
      const result = CleanUrlLogic.analyzeUrl(url);

      expect(result.success).toBe(true);
      expect(result.categories).toBeDefined();
      expect(result.summary.utm).toBe(1);
      expect(result.summary.social).toBe(1);
      expect(result.summary.ads).toBe(1);
      expect(result.summary.email).toBe(1);
      expect(result.summary.affiliate).toBe(1);
    });

    test('should handle analytics category', () => {
      const url = 'https://example.com?sthash=test&source=analytics';
      const result = CleanUrlLogic.analyzeUrl(url);

      expect(result.summary.analytics).toBe(2);
    });
  });

  describe('cleanUrls batch processing coverage', () => {
    test('should process multiple URLs', () => {
      const urls = Object.values(testUrls).slice(0, 5).map(t => t.original);
      const results = CleanUrlLogic.cleanUrls(urls);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Error handling coverage', () => {
    test('should handle processing errors gracefully', () => {
      const result = CleanUrlLogic.cleanUrl(null);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle invalid URL format', () => {
      const result = CleanUrlLogic.cleanUrl('not-a-url');
      expect(result.success).toBe(false);
    });
  });

  describe('Edge cases coverage', () => {
    test('should handle URLs with ports', () => {
      const url = 'https://localhost:8080/path?utm_source=test&param=value';
      const result = CleanUrlLogic.cleanUrl(url);

      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toContain(':8080');
      expect(result.cleanedUrl).toContain('param=value');
      expect(result.cleanedUrl).not.toContain('utm_source');
    });

    test('should preserve hash fragments', () => {
      const url = 'https://example.com/page?utm_source=test#section';
      const result = CleanUrlLogic.cleanUrl(url);

      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toContain('#section');
    });

    test('should handle empty query strings', () => {
      const url = 'https://example.com/path?';
      const result = CleanUrlLogic.cleanUrl(url);

      expect(result.success).toBe(true);
    });
  });

  describe('Parameter pattern coverage', () => {
    test('should have complete tracking parameter list', () => {
      expect(CleanUrlLogic.TRACKING_PARAM_PATTERNS).toBeDefined();
      expect(CleanUrlLogic.TRACKING_PARAM_PATTERNS.length).toBeGreaterThan(25);

      // Verify key parameters are included
      expect(CleanUrlLogic.TRACKING_PARAM_PATTERNS).toContain('utm_source');
      expect(CleanUrlLogic.TRACKING_PARAM_PATTERNS).toContain('fbclid');
      expect(CleanUrlLogic.TRACKING_PARAM_PATTERNS).toContain('gclid');
      expect(CleanUrlLogic.TRACKING_PARAM_PATTERNS).toContain('ck_subscriber_id');
    });
  });

  describe('isValidUrl coverage', () => {
    test('should validate various URL formats', () => {
      expect(CleanUrlLogic.isValidUrl('https://example.com')).toBe(true);
      expect(CleanUrlLogic.isValidUrl('http://example.com')).toBe(true);
      expect(CleanUrlLogic.isValidUrl('ftp://example.com')).toBe(true);
      expect(CleanUrlLogic.isValidUrl('//example.com')).toBe(false);
      expect(CleanUrlLogic.isValidUrl('example.com')).toBe(false);
    });
  });

  describe('Saved bytes calculation', () => {
    test('should calculate bytes saved correctly', () => {
      const longTrackingUrl = 'https://example.com?utm_source=verylongsourcevalue&utm_medium=verylongmediumvalue&utm_campaign=verylongcampaignvalue';
      const result = CleanUrlLogic.cleanUrl(longTrackingUrl);

      expect(result.savedBytes).toBeGreaterThan(50);
      expect(result.savedBytes).toBe(longTrackingUrl.length - result.cleanedUrl.length);
    });
  });

});