/**
 * Unit Tests for Clean URL Logic
 * Tests the core URL cleaning functionality
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

describe('Clean URL Logic', () => {
  
  describe('cleanUrl function', () => {
    
    test('should clean basic UTM parameters', () => {
      const testCase = testUrls.basic_utm;
      const result = cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      expect(result.hasChanges).toBe(true);
    });

    test('should remove Facebook tracking ID', () => {
      const testCase = testUrls.facebook_tracking;
      const result = cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

    test('should preserve legitimate parameters while removing tracking', () => {
      const testCase = testUrls.mixed_parameters;
      const result = cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      expect(result.cleanedUrl).toContain('category=shoes');
      expect(result.cleanedUrl).toContain('color=red');
    });

    test('should handle ConvertKit subscriber IDs', () => {
      const testCase = testUrls.convertkit_newsletter;
      const result = cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

    test('should preserve URL fragments while cleaning parameters', () => {
      const testCase = testUrls.complex_url_with_fragment;
      const result = cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      expect(result.cleanedUrl).toContain('#section-intro');
    });

    test('should handle multiple social media trackers', () => {
      const testCase = testUrls.multiple_social_trackers;
      const result = cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

    test('should not modify URLs without tracking parameters', () => {
      const testCase = testUrls.no_tracking_params;
      const result = cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(0);
      expect(result.hasChanges).toBe(false);
    });

    test('should handle case insensitive parameter matching', () => {
      const testCase = testUrls.case_sensitivity;
      const result = cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

  });

  describe('Input validation', () => {
    
    test('should handle null input', () => {
      const result = cleanUrl(null as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
      expect(result.cleanedUrl).toBe(null);
      expect(result.removedCount).toBe(0);
    });

    test('should handle undefined input', () => {
      const result = cleanUrl(undefined as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
      expect(result.cleanedUrl).toBe(null);
    });

    test('should handle empty string input', () => {
      const result = cleanUrl('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    test('should handle non-string input', () => {
      const result = cleanUrl(123 as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    test('should handle malformed URLs', () => {
      const result = cleanUrl('not-a-valid-url');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    test('should handle URLs with invalid protocols', () => {
      const result = cleanUrl('ftp://example.com?utm_source=test');
      
      expect(result.success).toBe(true); // URL constructor accepts ftp://
      expect(result.cleanedUrl).toBe('ftp://example.com/');
    });

  });

  describe('Edge cases', () => {
    
    test('should handle URLs with only fragments', () => {
      const testCase = testUrls.only_fragment;
      const result = cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(0);
    });

    test('should handle empty parameter values', () => {
      const testCase = testUrls.empty_parameter_values;
      const result = cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

    test('should handle very long URLs', () => {
      const testCase = testUrls.very_long_url;
      const result = cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      expect(result.savedBytes).toBeGreaterThan(0);
    });

    test('should handle special characters and encoding', () => {
      const testCase = testUrls.special_characters;
      const result = cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

    test('should handle international domains', () => {
      const testCase = testUrls.international_domain;
      const result = cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

    test('should handle localhost and port numbers', () => {
      const testCase = testUrls.port_number;
      const result = cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

  });

  describe('HubSpot tracking parameters', () => {
    test('should clean HubSpot tracking parameters', () => {
      const url = 'https://ngrok.com/blog-post/self-hosted-local-ai-workflows-with-docker-n8n-ollama-and-ngrok-2025?utm_campaign=august_2025_newsletter&utm_medium=newsletter&_hsenc=p2ANqtz-8oH1Wg1z9Xerl6KzExNgza_GCHijNoPRtBwlAYpnmUg4J_zQgujEKv8TZdFwsqobD1dw8osq6f7pZue07q8zZ--rl5Mg&_hsmi=377631143&utm_content=homepage&utm_source=email';
      const result = cleanUrl(url);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe('https://ngrok.com/blog-post/self-hosted-local-ai-workflows-with-docker-n8n-ollama-and-ngrok-2025');
      expect(result.removedCount).toBe(6);
      expect(result.removedParams).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'utm_campaign' }),
          expect.objectContaining({ key: 'utm_medium' }),
          expect.objectContaining({ key: '_hsenc' }),
          expect.objectContaining({ key: '_hsmi' }),
          expect.objectContaining({ key: 'utm_content' }),
          expect.objectContaining({ key: 'utm_source' })
        ])
      );
    });

    test('should categorize HubSpot parameters as email tracking', () => {
      const url = 'https://example.com?_hsenc=test123&_hsmi=456';
      const result = analyzeUrl(url);
      
      expect(result.categories.email).toHaveLength(2);
      expect(result.summary.email).toBe(2);
    });
  });

  describe('analyzeUrl function', () => {
    
    test('should provide detailed analysis of tracking parameters', () => {
      const url = 'https://example.com?utm_source=google&fbclid=123&mc_cid=456&gclid=789';
      const result = analyzeUrl(url);
      
      expect(result.success).toBe(true);
      expect(result.categories).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.utm).toBe(1);
      expect(result.summary.social).toBe(1);
      expect(result.summary.email).toBe(1);
      expect(result.summary.ads).toBe(1);
    });

    test('should categorize parameters correctly', () => {
      const url = 'https://example.com?utm_source=test&utm_medium=email&fbclid=123&igshid=456';
      const result = analyzeUrl(url);
      
      expect(result.categories.utm).toHaveLength(2);
      expect(result.categories.social).toHaveLength(2);
      expect(result.categories.ads).toHaveLength(0);
      expect(result.categories.affiliate).toHaveLength(0);
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

    test('should throw error for non-array input', () => {
      expect(() => {
        cleanUrls('not-an-array' as any);
      }).toThrow('Input must be an array');
    });

  });

  describe('isValidUrl function', () => {
    
    test('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://sub.domain.com/path?param=value#hash')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null as any)).toBe(false);
      expect(isValidUrl(undefined as any)).toBe(false);
    });

  });

  describe('Tracking parameter patterns', () => {
    
    test('should include all specified UTM parameters', () => {
      const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_nooverride'];
      
      utmParams.forEach(param => {
        expect(TRACKING_PARAM_PATTERNS).toContain(param);
      });
    });

    test('should include social media trackers', () => {
      const socialParams = ['fbclid', 'igshid', 'ttclid', 'tiktok_r', 'li_fat_id', 'mkt_tok', 'trk'];
      
      socialParams.forEach(param => {
        expect(TRACKING_PARAM_PATTERNS).toContain(param);
      });
    });

    test('should include ad platform trackers', () => {
      const adParams = ['gclid', 'yclid', 'dclid', 'msclkid'];
      
      adParams.forEach(param => {
        expect(TRACKING_PARAM_PATTERNS).toContain(param);
      });
    });

    test('should include email trackers', () => {
      const emailParams = ['ck_subscriber_id', 'mc_cid', 'mc_eid', '_hsenc', '_hsmi'];
      
      emailParams.forEach(param => {
        expect(TRACKING_PARAM_PATTERNS).toContain(param);
      });
    });

  });

  describe('Performance tests', () => {
    
    test('should handle large numbers of parameters efficiently', () => {
      let url = 'https://example.com?regular=param';
      
      // Add 100 tracking parameters (using utm_source repeatedly)
      for (let i = 0; i < 100; i++) {
        url += `&utm_source=test${i}`;
      }
      
      const startTime = performance.now();
      const result = cleanUrl(url);
      const endTime = performance.now();
      
      expect(result.success).toBe(true);
      expect(result.removedCount).toBeGreaterThan(0); // Multiple utm_source params will be merged by URLSearchParams
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    test('should handle very long parameter values', () => {
      const longValue = 'x'.repeat(10000);
      const url = `https://example.com?utm_source=${longValue}&regular=param`;
      
      const result = cleanUrl(url);
      
      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(1);
      expect(result.cleanedUrl).toBe('https://example.com/?regular=param');
    });

  });

});

// Integration tests with real-world URLs (if test-urls.json contains them)
describe('Real-world URL tests', () => {
  
  Object.entries(testUrls).forEach(([_testName, testCase]) => {
    test(`should handle ${testCase.description}`, () => {
      const result = cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      
      if (testCase.expectedRemovedCount > 0) {
        expect(result.hasChanges).toBe(true);
        expect(result.removedParams).toHaveLength(testCase.expectedRemovedCount);
      } else {
        expect(result.hasChanges).toBe(false);
      }
    });
  });

});
