/**
 * Direct Import Tests for Coverage
 * Tests that properly import the module for Vitest coverage instrumentation
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

describe('Clean URL Logic - Direct Import Coverage', () => {

  describe('cleanUrl function', () => {
    test('should clean basic UTM parameters', () => {
      const url = 'https://example.com?utm_source=google&utm_medium=cpc';
      const result = cleanUrl(url);

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(2);
      expect(result.hasChanges).toBe(true);
    });

    test('should preserve non-tracking parameters', () => {
      const url = 'https://example.com?category=tech&utm_source=google';
      const result = cleanUrl(url);

      expect(result.cleanedUrl).toContain('category=tech');
      expect(result.cleanedUrl).not.toContain('utm_source');
    });

    test('should handle URLs without tracking', () => {
      const url = 'https://example.com?page=1&sort=date';
      const result = cleanUrl(url);

      expect(result.hasChanges).toBe(false);
      expect(result.removedCount).toBe(0);
    });
  });

  describe('Input validation', () => {
    test('should reject null input', () => {
      const result = cleanUrl(null as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    test('should reject undefined input', () => {
      const result = cleanUrl(undefined as any);
      expect(result.success).toBe(false);
    });

    test('should reject empty string', () => {
      const result = cleanUrl('');
      expect(result.success).toBe(false);
    });

    test('should reject malformed URLs', () => {
      const result = cleanUrl('not-a-url');
      expect(result.success).toBe(false);
    });

    test('should reject non-string input', () => {
      const result = cleanUrl(123 as any);
      expect(result.success).toBe(false);
    });
  });

  describe('Tracking parameters', () => {
    test('should remove all UTM parameters', () => {
      const url = 'https://example.com?utm_source=a&utm_medium=b&utm_campaign=c&utm_term=d&utm_content=e';
      const result = cleanUrl(url);

      expect(result.removedCount).toBe(5);
      expect(result.cleanedUrl).not.toContain('utm_');
    });

    test('should remove social media trackers', () => {
      const url = 'https://example.com?fbclid=123&igshid=456&ttclid=789';
      const result = cleanUrl(url);

      expect(result.removedCount).toBe(3);
    });

    test('should remove ad platform trackers', () => {
      const url = 'https://example.com?gclid=abc&msclkid=def&yclid=ghi';
      const result = cleanUrl(url);

      expect(result.removedCount).toBe(3);
    });

    test('should remove email trackers', () => {
      const url = 'https://example.com?ck_subscriber_id=123&mc_cid=456&_hsenc=789';
      const result = cleanUrl(url);

      expect(result.removedCount).toBe(3);
    });

    test('should remove Google Ads parameters (Issue #1)', () => {
      const url = 'https://example.com?utm_ad=123&matchtype=e&campaign_id=456&ad_id=789';
      const result = cleanUrl(url);

      expect(result.removedCount).toBe(4);
      expect(result.cleanedUrl).not.toContain('matchtype');
      expect(result.cleanedUrl).not.toContain('campaign_id');
      expect(result.cleanedUrl).not.toContain('ad_id');
    });
  });

  describe('Edge cases', () => {
    test('should handle case insensitive parameters', () => {
      const url = 'https://example.com?UTM_SOURCE=test&Fbclid=123';
      const result = cleanUrl(url);

      expect(result.removedCount).toBe(2);
    });

    test('should preserve hash fragments', () => {
      const url = 'https://example.com?utm_source=test#section';
      const result = cleanUrl(url);

      expect(result.cleanedUrl).toContain('#section');
      expect(result.cleanedUrl).not.toContain('utm_source');
    });

    test('should handle empty parameter values', () => {
      const url = 'https://example.com?utm_source=&param=value';
      const result = cleanUrl(url);

      expect(result.cleanedUrl).toContain('param=value');
      expect(result.removedCount).toBe(1);
    });

    test('should calculate saved bytes', () => {
      const url = 'https://example.com?utm_source=longsource&utm_medium=longmedium';
      const result = cleanUrl(url);

      expect(result.savedBytes).toBeGreaterThan(0);
      expect(result.savedBytes).toBe(url.length - (result.cleanedUrl?.length || 0));
    });
  });

  describe('analyzeUrl function', () => {
    test('should categorize tracking parameters', () => {
      const url = 'https://example.com?utm_source=a&fbclid=b&gclid=c&mc_cid=d&ref=e';
      const result = analyzeUrl(url);

      expect(result.summary.utm).toBe(1);
      expect(result.summary.social).toBe(1);
      expect(result.summary.ads).toBe(1);
      expect(result.summary.email).toBe(1);
      expect(result.summary.affiliate).toBe(1);
    });

    test('should provide category details', () => {
      const url = 'https://example.com?utm_source=test&utm_medium=email';
      const result = analyzeUrl(url);

      expect(result.categories).toBeDefined();
      expect(result.categories.utm).toHaveLength(2);
    });
  });

  describe('cleanUrls batch function', () => {
    test('should clean multiple URLs', () => {
      const urls = [
        'https://example1.com?utm_source=test',
        'https://example2.com?fbclid=123',
        'https://example3.com?clean=param'
      ];

      const results = cleanUrls(urls);

      expect(results).toHaveLength(3);
      expect(results[0].removedCount).toBe(1);
      expect(results[1].removedCount).toBe(1);
      expect(results[2].removedCount).toBe(0);
    });

    test('should handle empty array', () => {
      const results = cleanUrls([]);
      expect(results).toHaveLength(0);
    });

    test('should throw for non-array input', () => {
      expect(() => cleanUrls('not-array' as any)).toThrow();
    });
  });

  describe('isValidUrl function', () => {
    test('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null as any)).toBe(false);
    });
  });

  describe('TRACKING_PARAM_PATTERNS', () => {
    test('should export parameter patterns', () => {
      expect(TRACKING_PARAM_PATTERNS).toBeDefined();
      expect(Array.isArray(TRACKING_PARAM_PATTERNS)).toBe(true);
      expect(TRACKING_PARAM_PATTERNS.length).toBeGreaterThan(25);
    });

    test('should include UTM parameters', () => {
      expect(TRACKING_PARAM_PATTERNS).toContain('utm_source');
      expect(TRACKING_PARAM_PATTERNS).toContain('utm_medium');
      expect(TRACKING_PARAM_PATTERNS).toContain('utm_campaign');
      expect(TRACKING_PARAM_PATTERNS).toContain('utm_ad');
    });

    test('should include Google Ads parameters', () => {
      expect(TRACKING_PARAM_PATTERNS).toContain('gclid');
      expect(TRACKING_PARAM_PATTERNS).toContain('matchtype');
      expect(TRACKING_PARAM_PATTERNS).toContain('campaign_id');
      expect(TRACKING_PARAM_PATTERNS).toContain('ad_id');
    });
  });

  describe('Real-world test-urls.json data', () => {
    const sampleTests = ['basic_utm', 'facebook_tracking', 'google_click_id', 'mixpanel_google_ads_search_issue_1'];

    sampleTests.forEach(testName => {
      if (testUrls[testName as keyof typeof testUrls]) {
        test(`should handle ${testUrls[testName as keyof typeof testUrls].description}`, () => {
          const testCase = testUrls[testName as keyof typeof testUrls];
          const result = cleanUrl(testCase.original);

          expect(result.success).toBe(true);
          expect(result.removedCount).toBe(testCase.expectedRemovedCount);
        });
      }
    });
  });

});
