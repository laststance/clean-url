/**
 * Unit Tests for Clean URL Logic
 * Tests the core URL cleaning functionality
 */

const fs = require('fs');
const path = require('path');

// Import the module under test - we'll eval it since it's designed for browser
const cleanUrlLogicCode = fs.readFileSync(path.join(__dirname, '../../clean-url-logic.js'), 'utf8');

// Execute the code in Node.js environment
eval(cleanUrlLogicCode);

// The module exports should now be available
const CleanUrlLogic = module.exports;

// Load test URL fixtures
const testUrlsPath = path.join(__dirname, '..', 'test-urls.json');
const testUrls = JSON.parse(fs.readFileSync(testUrlsPath, 'utf8'));

describe('Clean URL Logic', () => {
  
  describe('cleanUrl function', () => {
    
    test('should clean basic UTM parameters', () => {
      const testCase = testUrls.basic_utm;
      const result = CleanUrlLogic.cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      expect(result.hasChanges).toBe(true);
    });

    test('should remove Facebook tracking ID', () => {
      const testCase = testUrls.facebook_tracking;
      const result = CleanUrlLogic.cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

    test('should preserve legitimate parameters while removing tracking', () => {
      const testCase = testUrls.mixed_parameters;
      const result = CleanUrlLogic.cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      expect(result.cleanedUrl).toContain('category=shoes');
      expect(result.cleanedUrl).toContain('color=red');
    });

    test('should handle ConvertKit subscriber IDs', () => {
      const testCase = testUrls.convertkit_newsletter;
      const result = CleanUrlLogic.cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

    test('should preserve URL fragments while cleaning parameters', () => {
      const testCase = testUrls.complex_url_with_fragment;
      const result = CleanUrlLogic.cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      expect(result.cleanedUrl).toContain('#section-intro');
    });

    test('should handle multiple social media trackers', () => {
      const testCase = testUrls.multiple_social_trackers;
      const result = CleanUrlLogic.cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

    test('should not modify URLs without tracking parameters', () => {
      const testCase = testUrls.no_tracking_params;
      const result = CleanUrlLogic.cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(0);
      expect(result.hasChanges).toBe(false);
    });

    test('should handle case insensitive parameter matching', () => {
      const testCase = testUrls.case_sensitivity;
      const result = CleanUrlLogic.cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

  });

  describe('Input validation', () => {
    
    test('should handle null input', () => {
      const result = CleanUrlLogic.cleanUrl(null);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
      expect(result.cleanedUrl).toBe(null);
      expect(result.removedCount).toBe(0);
    });

    test('should handle undefined input', () => {
      const result = CleanUrlLogic.cleanUrl(undefined);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
      expect(result.cleanedUrl).toBe(null);
    });

    test('should handle empty string input', () => {
      const result = CleanUrlLogic.cleanUrl('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    test('should handle non-string input', () => {
      const result = CleanUrlLogic.cleanUrl(123);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    test('should handle malformed URLs', () => {
      const result = CleanUrlLogic.cleanUrl('not-a-valid-url');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    test('should handle URLs with invalid protocols', () => {
      const result = CleanUrlLogic.cleanUrl('ftp://example.com?utm_source=test');
      
      expect(result.success).toBe(true); // URL constructor accepts ftp://
      expect(result.cleanedUrl).toBe('ftp://example.com');
    });

  });

  describe('Edge cases', () => {
    
    test('should handle URLs with only fragments', () => {
      const testCase = testUrls.only_fragment;
      const result = CleanUrlLogic.cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(0);
    });

    test('should handle empty parameter values', () => {
      const testCase = testUrls.empty_parameter_values;
      const result = CleanUrlLogic.cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

    test('should handle very long URLs', () => {
      const testCase = testUrls.very_long_url;
      const result = CleanUrlLogic.cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      expect(result.savedBytes).toBeGreaterThan(0);
    });

    test('should handle special characters and encoding', () => {
      const testCase = testUrls.special_characters;
      const result = CleanUrlLogic.cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

    test('should handle international domains', () => {
      const testCase = testUrls.international_domain;
      const result = CleanUrlLogic.cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

    test('should handle localhost and port numbers', () => {
      const testCase = testUrls.port_number;
      const result = CleanUrlLogic.cleanUrl(testCase.original);
      
      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

  });

  describe('analyzeUrl function', () => {
    
    test('should provide detailed analysis of tracking parameters', () => {
      const url = 'https://example.com?utm_source=google&fbclid=123&mc_cid=456&gclid=789';
      const result = CleanUrlLogic.analyzeUrl(url);
      
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
      const result = CleanUrlLogic.analyzeUrl(url);
      
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
      
      const results = CleanUrlLogic.cleanUrls(urls);
      
      expect(results).toHaveLength(3);
      expect(results[0].removedCount).toBe(1);
      expect(results[1].removedCount).toBe(1);
      expect(results[2].removedCount).toBe(0);
    });

    test('should handle empty array', () => {
      const results = CleanUrlLogic.cleanUrls([]);
      
      expect(results).toHaveLength(0);
    });

    test('should throw error for non-array input', () => {
      expect(() => {
        CleanUrlLogic.cleanUrls('not-an-array');
      }).toThrow('Input must be an array');
    });

  });

  describe('isValidUrl function', () => {
    
    test('should validate correct URLs', () => {
      expect(CleanUrlLogic.isValidUrl('https://example.com')).toBe(true);
      expect(CleanUrlLogic.isValidUrl('http://localhost:3000')).toBe(true);
      expect(CleanUrlLogic.isValidUrl('https://sub.domain.com/path?param=value#hash')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(CleanUrlLogic.isValidUrl('not-a-url')).toBe(false);
      expect(CleanUrlLogic.isValidUrl('')).toBe(false);
      expect(CleanUrlLogic.isValidUrl(null)).toBe(false);
      expect(CleanUrlLogic.isValidUrl(undefined)).toBe(false);
    });

  });

  describe('Tracking parameter patterns', () => {
    
    test('should include all specified UTM parameters', () => {
      const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_nooverride'];
      
      utmParams.forEach(param => {
        expect(CleanUrlLogic.TRACKING_PARAM_PATTERNS).toContain(param);
      });
    });

    test('should include social media trackers', () => {
      const socialParams = ['fbclid', 'igshid', 'ttclid', 'tiktok_r', 'li_fat_id', 'mkt_tok', 'trk'];
      
      socialParams.forEach(param => {
        expect(CleanUrlLogic.TRACKING_PARAM_PATTERNS).toContain(param);
      });
    });

    test('should include ad platform trackers', () => {
      const adParams = ['gclid', 'yclid', 'dclid', 'msclkid'];
      
      adParams.forEach(param => {
        expect(CleanUrlLogic.TRACKING_PARAM_PATTERNS).toContain(param);
      });
    });

    test('should include email trackers', () => {
      const emailParams = ['ck_subscriber_id', 'mc_cid', 'mc_eid'];
      
      emailParams.forEach(param => {
        expect(CleanUrlLogic.TRACKING_PARAM_PATTERNS).toContain(param);
      });
    });

  });

  describe('Performance tests', () => {
    
    test('should handle large numbers of parameters efficiently', () => {
      let url = 'https://example.com?regular=param';
      
      // Add 100 tracking parameters
      for (let i = 0; i < 100; i++) {
        url += `&utm_source${i}=test${i}`;
      }
      
      const startTime = performance.now();
      const result = CleanUrlLogic.cleanUrl(url);
      const endTime = performance.now();
      
      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(100);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    test('should handle very long parameter values', () => {
      const longValue = 'x'.repeat(10000);
      const url = `https://example.com?utm_source=${longValue}&regular=param`;
      
      const result = CleanUrlLogic.cleanUrl(url);
      
      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(1);
      expect(result.cleanedUrl).toBe('https://example.com?regular=param');
    });

  });

});

describe('Browser environment compatibility', () => {
  
  test('should work in browser environment', () => {
    // Mock browser globals
    global.window = {
      CleanUrlLogic: CleanUrlLogic
    };
    
    expect(global.window.CleanUrlLogic.cleanUrl).toBeDefined();
    expect(global.window.CleanUrlLogic.analyzeUrl).toBeDefined();
    expect(global.window.CleanUrlLogic.isValidUrl).toBeDefined();
  });

});

// Integration tests with real-world URLs (if test-urls.json contains them)
describe('Real-world URL tests', () => {
  
  Object.entries(testUrls).forEach(([testName, testCase]) => {
    test(`should handle ${testCase.description}`, () => {
      const result = CleanUrlLogic.cleanUrl(testCase.original);
      
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