/**
 * Coverage-Enabled Tests for Clean URL Logic
 * Uses proper module imports for Vitest coverage instrumentation
 */

import { describe, test, expect } from 'vitest';
import { cleanUrl, analyzeUrl, cleanUrls, isValidUrl, TRACKING_PARAM_PATTERNS } from '../../utils/clean-url-logic';

interface TestUrlCase {
  original: string;
  expected: string;
  expectedRemovedCount: number;
  description: string;
}

const testUrls: Record<string, TestUrlCase> = require('../test-urls.json');

describe('Clean URL Logic - Coverage Tests', () => {

  describe('Core functionality with test-urls.json', () => {
    // Generate tests for each URL in test-urls.json
    Object.entries(testUrls).forEach(([testName, testCase]) => {
      test(`${testCase.description}`, () => {
        const result = cleanUrl(testCase.original);

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
      const result = analyzeUrl(url);

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
      const result = analyzeUrl(url);

      expect(result.summary.analytics).toBe(2);
    });
  });

  describe('cleanUrls batch processing coverage', () => {
    test('should process multiple URLs', () => {
      const urls = Object.values(testUrls).slice(0, 5).map(t => t.original);
      const results = cleanUrls(urls);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Error handling coverage', () => {
    test('should handle processing errors gracefully', () => {
      const result = cleanUrl(null as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle invalid URL format', () => {
      const result = cleanUrl('not-a-url');
      expect(result.success).toBe(false);
    });
  });

  describe('Edge cases coverage', () => {
    test('should handle URLs with ports', () => {
      const url = 'https://localhost:8080/path?utm_source=test&param=value';
      const result = cleanUrl(url);

      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toContain(':8080');
      expect(result.cleanedUrl).toContain('param=value');
      expect(result.cleanedUrl).not.toContain('utm_source');
    });

    test('should preserve hash fragments', () => {
      const url = 'https://example.com/page?utm_source=test#section';
      const result = cleanUrl(url);

      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toContain('#section');
    });

    test('should handle empty query strings', () => {
      const url = 'https://example.com/path?';
      const result = cleanUrl(url);

      expect(result.success).toBe(true);
    });
  });

  describe('Parameter pattern coverage', () => {
    test('should have complete tracking parameter list', () => {
      expect(TRACKING_PARAM_PATTERNS).toBeDefined();
      expect(TRACKING_PARAM_PATTERNS.length).toBeGreaterThan(25);

      // Verify key parameters are included
      expect(TRACKING_PARAM_PATTERNS).toContain('utm_source');
      expect(TRACKING_PARAM_PATTERNS).toContain('fbclid');
      expect(TRACKING_PARAM_PATTERNS).toContain('gclid');
      expect(TRACKING_PARAM_PATTERNS).toContain('ck_subscriber_id');
    });
  });

  describe('isValidUrl coverage', () => {
    test('should validate various URL formats', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('ftp://example.com')).toBe(true);
      expect(isValidUrl('//example.com')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
    });
  });

  describe('Saved bytes calculation', () => {
    test('should calculate bytes saved correctly', () => {
      const longTrackingUrl = 'https://example.com?utm_source=verylongsourcevalue&utm_medium=verylongmediumvalue&utm_campaign=verylongcampaignvalue';
      const result = cleanUrl(longTrackingUrl);

      expect(result.savedBytes).toBeGreaterThan(50);
      expect(result.savedBytes).toBe(longTrackingUrl.length - (result.cleanedUrl?.length || 0));
    });
  });

});
