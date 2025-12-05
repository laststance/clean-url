/**
 * Unit Tests for Clean URL Logic
 *
 * Comprehensive tests for URL cleaning functionality including:
 * - Core cleanUrl function
 * - Input validation
 * - Tracking parameter categories (UTM, social, ads, email, affiliate)
 * - Hash fragment edge cases
 * - Real-world URL examples
 * - Utility functions (analyzeUrl, cleanUrls, isValidUrl)
 * - Performance tests
 */

import { describe, test, expect } from 'vitest';

import {
  cleanUrl,
  analyzeUrl,
  cleanUrls,
  isValidUrl,
  cleanHashFragment,
  TRACKING_PARAM_PATTERNS,
} from '../../utils/clean-url-logic';

interface TestUrlCase {
  original: string;
  expected: string;
  expectedRemovedCount: number;
  description: string;
}

const testUrls: Record<string, TestUrlCase> = require('../test-urls.json');

describe('Clean URL Logic', () => {
  // ============================================================================
  // Core cleanUrl Function
  // ============================================================================
  describe('cleanUrl function', () => {
    describe('Basic functionality', () => {
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

      test('should not modify URLs without tracking parameters', () => {
        const testCase = testUrls.no_tracking_params;
        const result = cleanUrl(testCase.original);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(testCase.expected);
        expect(result.removedCount).toBe(0);
        expect(result.hasChanges).toBe(false);
      });
    });

    describe('Parameter preservation', () => {
      test('should preserve legitimate parameters while removing tracking', () => {
        const testCase = testUrls.mixed_parameters;
        const result = cleanUrl(testCase.original);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(testCase.expected);
        expect(result.removedCount).toBe(testCase.expectedRemovedCount);
        expect(result.cleanedUrl).toContain('category=shoes');
        expect(result.cleanedUrl).toContain('color=red');
      });

      test('should preserve URL fragments while cleaning parameters', () => {
        const testCase = testUrls.complex_url_with_fragment;
        const result = cleanUrl(testCase.original);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(testCase.expected);
        expect(result.removedCount).toBe(testCase.expectedRemovedCount);
        expect(result.cleanedUrl).toContain('#section-intro');
      });
    });

    describe('Return value structure', () => {
      test('should return all expected properties on success', () => {
        const url = 'https://example.com?utm_source=test&page=1';
        const result = cleanUrl(url);

        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('cleanedUrl');
        expect(result).toHaveProperty('removedCount');
        expect(result).toHaveProperty('hasChanges');
        expect(result).toHaveProperty('savedBytes');
        expect(result).toHaveProperty('removedParams');
      });

      test('should calculate saved bytes correctly', () => {
        const url =
          'https://example.com?utm_source=longsource&utm_medium=longmedium';
        const result = cleanUrl(url);

        expect(result.savedBytes).toBeGreaterThan(0);
        expect(result.savedBytes).toBe(
          url.length - (result.cleanedUrl?.length || 0)
        );
      });
    });
  });

  // ============================================================================
  // Input Validation
  // ============================================================================
  describe('Input Validation', () => {
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

    test('should handle URLs with non-http protocols', () => {
      const result = cleanUrl('ftp://example.com?utm_source=test');

      expect(result.success).toBe(true); // URL constructor accepts ftp://
      expect(result.cleanedUrl).toBe('ftp://example.com/');
    });
  });

  // ============================================================================
  // Tracking Parameter Categories
  // ============================================================================
  describe('Tracking Parameter Categories', () => {
    describe('UTM parameters', () => {
      test('should remove all UTM parameters', () => {
        const url =
          'https://example.com?utm_source=a&utm_medium=b&utm_campaign=c&utm_term=d&utm_content=e&utm_nooverride=f';
        const result = cleanUrl(url);

        expect(result.removedCount).toBe(6);
        expect(result.cleanedUrl).not.toContain('utm_');
      });

      test('should remove utm_ad parameter', () => {
        const url = 'https://example.com?utm_source=google&utm_ad=12345&page=home';
        const result = cleanUrl(url);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe('https://example.com/?page=home');
        expect(result.removedCount).toBe(2);
        expect(result.cleanedUrl).not.toContain('utm_ad');
      });

      test('should include all specified UTM parameters in patterns', () => {
        const utmParams = [
          'utm_source',
          'utm_medium',
          'utm_campaign',
          'utm_term',
          'utm_content',
          'utm_nooverride',
        ];

        utmParams.forEach((param) => {
          expect(TRACKING_PARAM_PATTERNS).toContain(param);
        });
      });
    });

    describe('Social media trackers', () => {
      test('should handle multiple social media trackers', () => {
        const testCase = testUrls.multiple_social_trackers;
        const result = cleanUrl(testCase.original);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(testCase.expected);
        expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      });

      test('should include social media tracker patterns', () => {
        const socialParams = [
          'fbclid',
          'igshid',
          'ttclid',
          'tiktok_r',
          'li_fat_id',
          'mkt_tok',
          'trk',
        ];

        socialParams.forEach((param) => {
          expect(TRACKING_PARAM_PATTERNS).toContain(param);
        });
      });
    });

    describe('Ad platform trackers', () => {
      test('should remove ad platform trackers', () => {
        const url = 'https://example.com?gclid=abc&msclkid=def&yclid=ghi';
        const result = cleanUrl(url);

        expect(result.removedCount).toBe(3);
      });

      test('should include ad platform tracker patterns', () => {
        const adParams = ['gclid', 'yclid', 'dclid', 'msclkid'];

        adParams.forEach((param) => {
          expect(TRACKING_PARAM_PATTERNS).toContain(param);
        });
      });
    });

    describe('Email trackers', () => {
      test('should handle ConvertKit subscriber IDs', () => {
        const testCase = testUrls.convertkit_newsletter;
        const result = cleanUrl(testCase.original);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(testCase.expected);
        expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      });

      test('should remove email marketing trackers', () => {
        const url =
          'https://example.com?ck_subscriber_id=123&mc_cid=456&_hsenc=789';
        const result = cleanUrl(url);

        expect(result.removedCount).toBe(3);
      });

      test('should include email tracker patterns', () => {
        const emailParams = [
          'ck_subscriber_id',
          'mc_cid',
          'mc_eid',
          '_hsenc',
          '_hsmi',
        ];

        emailParams.forEach((param) => {
          expect(TRACKING_PARAM_PATTERNS).toContain(param);
        });
      });
    });

    describe('Google Ads parameters (Issue #1)', () => {
      test('should clean comprehensive Google Ads search URL', () => {
        const testCase = testUrls.mixpanel_google_ads_search_issue_1;
        const result = cleanUrl(testCase.original);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(testCase.expected);
        expect(result.removedCount).toBe(testCase.expectedRemovedCount);
        expect(result.hasChanges).toBe(true);

        // Verify all tracking parameters are removed
        expect(result.cleanedUrl).not.toContain('utm_source');
        expect(result.cleanedUrl).not.toContain('utm_medium');
        expect(result.cleanedUrl).not.toContain('utm_campaign');
        expect(result.cleanedUrl).not.toContain('utm_content');
        expect(result.cleanedUrl).not.toContain('utm_ad');
        expect(result.cleanedUrl).not.toContain('utm_term');
        expect(result.cleanedUrl).not.toContain('matchtype');
        expect(result.cleanedUrl).not.toContain('campaign_id');
        expect(result.cleanedUrl).not.toContain('ad_id');
        expect(result.cleanedUrl).not.toContain('gclid');
        expect(result.cleanedUrl).not.toContain('gad_source');
        expect(result.cleanedUrl).not.toContain('gad_campaignid');
        expect(result.cleanedUrl).not.toContain('gbraid');
      });

      test('should handle individual Google Ads parameters', () => {
        const url =
          'https://example.com/page?matchtype=e&campaign_id=123&ad_id=456&category=tech';
        const result = cleanUrl(url);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe('https://example.com/page?category=tech');
        expect(result.removedCount).toBe(3);
        expect(result.cleanedUrl).toContain('category=tech');
        expect(result.cleanedUrl).not.toContain('matchtype');
        expect(result.cleanedUrl).not.toContain('campaign_id');
        expect(result.cleanedUrl).not.toContain('ad_id');
      });

      test('should include Google Ads parameter patterns', () => {
        expect(TRACKING_PARAM_PATTERNS).toContain('gclid');
        expect(TRACKING_PARAM_PATTERNS).toContain('matchtype');
        expect(TRACKING_PARAM_PATTERNS).toContain('campaign_id');
        expect(TRACKING_PARAM_PATTERNS).toContain('ad_id');
      });
    });

    describe('HubSpot tracking parameters', () => {
      test('should clean HubSpot tracking parameters', () => {
        const url =
          'https://ngrok.com/blog-post/self-hosted-local-ai-workflows-with-docker-n8n-ollama-and-ngrok-2025?utm_campaign=august_2025_newsletter&utm_medium=newsletter&_hsenc=p2ANqtz-8oH1Wg1z9Xerl6KzExNgza_GCHijNoPRtBwlAYpnmUg4J_zQgujEKv8TZdFwsqobD1dw8osq6f7pZue07q8zZ--rl5Mg&_hsmi=377631143&utm_content=homepage&utm_source=email';
        const result = cleanUrl(url);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(
          'https://ngrok.com/blog-post/self-hosted-local-ai-workflows-with-docker-n8n-ollama-and-ngrok-2025'
        );
        expect(result.removedCount).toBe(6);
        expect(result.removedParams).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ key: 'utm_campaign' }),
            expect.objectContaining({ key: 'utm_medium' }),
            expect.objectContaining({ key: '_hsenc' }),
            expect.objectContaining({ key: '_hsmi' }),
            expect.objectContaining({ key: 'utm_content' }),
            expect.objectContaining({ key: 'utm_source' }),
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

    describe('Amazon affiliate & tracking parameters', () => {
      test('should remove Amazon affiliate tag and linkCode', () => {
        const testCase = testUrls.amazon_product_with_affiliate;
        const result = cleanUrl(testCase.original);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(testCase.expected);
        expect(result.removedCount).toBe(testCase.expectedRemovedCount);
        expect(result.cleanedUrl).not.toContain('tag=');
        expect(result.cleanedUrl).not.toContain('linkCode=');
        // Verify legitimate Amazon parameters are preserved
        expect(result.cleanedUrl).toContain('th=1');
        expect(result.cleanedUrl).toContain('psc=1');
      });

      test('should remove all Amazon tracking parameters', () => {
        const testCase = testUrls.amazon_product_full_tracking;
        const result = cleanUrl(testCase.original);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(testCase.expected);
        // 9 params: tag, linkCode, ascsubtag, camp, creative, pd_rd_i, pd_rd_r, pd_rd_w, pd_rd_wg
        expect(result.removedCount).toBe(9);
        // Verify all Amazon tracking parameters are removed
        expect(result.cleanedUrl).not.toContain('tag=');
        expect(result.cleanedUrl).not.toContain('linkCode=');
        expect(result.cleanedUrl).not.toContain('ascsubtag=');
        expect(result.cleanedUrl).not.toContain('camp=');
        expect(result.cleanedUrl).not.toContain('creative=');
        expect(result.cleanedUrl).not.toContain('pd_rd_');
      });

      test('should clean Amazon search URL with affiliate tracking', () => {
        const testCase = testUrls.amazon_search_with_tracking;
        const result = cleanUrl(testCase.original);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(testCase.expected);
        expect(result.removedCount).toBe(testCase.expectedRemovedCount);
        // Verify search query is preserved
        expect(result.cleanedUrl).toContain('k=headphones');
      });

      test('should categorize Amazon parameters as affiliate tracking', () => {
        const url = 'https://amazon.com/dp/B123?tag=test-20&linkCode=abc&camp=123';
        const result = analyzeUrl(url);

        expect(result.success).toBe(true);
        expect(result.summary.affiliate).toBe(3);
        expect(result.categories.affiliate).toHaveLength(3);
      });

      test('should include Amazon tracking parameter patterns', () => {
        const amazonParams = [
          'tag',
          'linkCode',
          'linkId',
          'ascsubtag',
          'camp',
          'creative',
          'pd_rd_i',
          'pd_rd_r',
          'pd_rd_w',
          'pd_rd_wg',
        ];

        amazonParams.forEach((param) => {
          expect(TRACKING_PARAM_PATTERNS).toContain(param);
        });
      });
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
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

    test('should handle case insensitive parameter matching', () => {
      const testCase = testUrls.case_sensitivity;
      const result = cleanUrl(testCase.original);

      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
    });

    test('should handle empty query strings', () => {
      const url = 'https://example.com/path?';
      const result = cleanUrl(url);

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Hash Fragment Edge Cases
  // ============================================================================
  describe('Hash Fragment Edge Cases', () => {
    test('should clean tracking parameters from hash fragments', () => {
      const url = 'https://example.com#utm_source=newsletter&fbclid=123';
      const result = cleanUrl(url);

      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe('https://example.com/');
      expect(result.cleanedUrl).not.toContain('utm_source');
      expect(result.cleanedUrl).not.toContain('fbclid');
    });

    test('should handle mixed query params and hash with tracking', () => {
      const url =
        'https://example.com?page=2&utm_source=email#fbclid=123&ref=twitter';
      const result = cleanUrl(url);

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(1); // Only utm_source from query
      expect(result.cleanedUrl).toContain('page=2');
      expect(result.cleanedUrl).not.toContain('fbclid');
      expect(result.hasChanges).toBe(true);
    });

    test('should clean URL-encoded tracking parameters from hash', () => {
      const url =
        'https://example.com/article#utm_source%3Dnewsletter%26utm_medium%3Demail';
      const result = cleanUrl(url);

      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe('https://example.com/article');
      expect(result.cleanedUrl).not.toContain('#');
      expect(result.cleanedUrl).not.toContain('utm_source');
    });

    test('should handle empty hash after query parameters', () => {
      const url = 'https://example.com?utm_source=test&page=1#';
      const result = cleanUrl(url);

      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe('https://example.com/?page=1');
      expect(result.removedCount).toBe(1);
      expect(result.cleanedUrl).toContain('page=1');
      expect(result.cleanedUrl).not.toContain('#');
      expect(result.hasChanges).toBe(true);
    });

    test('should clean tracking parameters from hash-only URL', () => {
      const url = 'https://example.com/#gclid=abc123&utm_campaign=summer';
      const result = cleanUrl(url);

      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe('https://example.com/');
      expect(result.cleanedUrl).not.toContain('gclid');
      expect(result.cleanedUrl).not.toContain('utm_campaign');
    });

    test('should clean query params while preserving legitimate complex hash fragments', () => {
      const url =
        'https://example.com?utm_source=google&utm_medium=cpc&utm_campaign=spring&category=shoes#product-reviews?sort=recent&filter=verified';
      const result = cleanUrl(url);

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(3);
      expect(result.cleanedUrl).toContain('category=shoes');
      expect(result.cleanedUrl).toContain('#product-reviews');
      expect(result.cleanedUrl).toContain('sort=recent');
      expect(result.hasChanges).toBe(true);
    });

    test('should handle SPA routing hash with tracking-like content', () => {
      const url =
        'https://app.example.com/dashboard#/analytics?utm_source=internal&section=overview';
      const result = cleanUrl(url);

      expect(result.success).toBe(true);
      // SPA routing hash (starts with /) should be preserved
      expect(result.cleanedUrl).toContain('#');
      expect(result.cleanedUrl).toContain('analytics');
      expect(result.cleanedUrl).toContain('section=overview');
      expect(result.removedCount).toBe(0);
      expect(result.hasChanges).toBe(false);
    });

    test('should preserve normal anchor links', () => {
      const url = 'https://example.com/docs#section-intro';
      const result = cleanUrl(url);

      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe('https://example.com/docs#section-intro');
      expect(result.removedCount).toBe(0);
    });

    test('should handle the reported LogRocket blog URL with hash tracking', () => {
      const testCase = testUrls.logrocket_blog_with_hash_tracking;
      const result = cleanUrl(testCase.original);

      expect(result.success).toBe(true);
      expect(result.cleanedUrl).toBe(testCase.expected);
      expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      expect(result.cleanedUrl).not.toContain('ck_subscriber_id');
      expect(result.cleanedUrl).not.toContain('utm_source');
      expect(result.cleanedUrl).not.toContain('#');
    });
  });

  // ============================================================================
  // cleanHashFragment Helper Function
  // ============================================================================
  describe('cleanHashFragment helper function', () => {
    test('should return null for empty input', () => {
      expect(cleanHashFragment('')).toBe(null);
    });

    test('should preserve normal anchor links', () => {
      expect(cleanHashFragment('section-1')).toBe('section-1');
      expect(cleanHashFragment('top')).toBe('top');
      expect(cleanHashFragment('installation')).toBe('installation');
    });

    test('should clean URL-encoded tracking params', () => {
      expect(cleanHashFragment('utm_source%3Dgoogle')).toBe(null);
    });

    test('should clean multiple URL-encoded tracking params', () => {
      expect(cleanHashFragment('utm_source%3Dgoogle%26utm_medium%3Demail')).toBe(
        null
      );
    });

    test('should preserve non-tracking params in hash', () => {
      expect(cleanHashFragment('page%3D1')).toBe('page%3D1');
    });

    test('should clean tracking but preserve non-tracking in mixed hash', () => {
      expect(cleanHashFragment('utm_source%3Dgoogle%26page%3D1')).toBe('page=1');
    });

    test('should handle malformed URL encoding gracefully', () => {
      expect(cleanHashFragment('%invalid%')).toBe('%invalid%');
    });

    test('should handle SPA routing paths', () => {
      expect(cleanHashFragment('/analytics?section=overview')).toBe(
        '/analytics?section=overview'
      );
    });

    test('should remove malformed tracking data patterns', () => {
      expect(cleanHashFragment('242:%20Vite%20RSC,%20Next.js')).toBe(null);
    });
  });

  // ============================================================================
  // Real-world URL Tests
  // ============================================================================
  describe('Real-world URL Tests', () => {
    describe('Newsletter URLs (ConvertKit / This Week In React)', () => {
      test('should clean DevonGovett blog URL', () => {
        const testCase = testUrls.devongovett_blog;
        const result = cleanUrl(testCase.original);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(testCase.expected);
        expect(result.removedCount).toBe(testCase.expectedRemovedCount);
        expect(result.cleanedUrl).not.toContain('ck_subscriber_id');
        expect(result.cleanedUrl).not.toContain('utm_source');
      });

      test('should clean Frontend Masters blog URL', () => {
        const testCase = testUrls.frontendmasters_blog;
        const result = cleanUrl(testCase.original);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(testCase.expected);
        expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      });

      test('should clean Shadcn UI docs URL', () => {
        const testCase = testUrls.shadcn_docs;
        const result = cleanUrl(testCase.original);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(testCase.expected);
        expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      });

      test('should clean GitHub issue URL', () => {
        const testCase = testUrls.github_issue;
        const result = cleanUrl(testCase.original);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(testCase.expected);
        expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      });

      test('should clean 56kode blog URL', () => {
        const testCase = testUrls['56kode_blog'];
        const result = cleanUrl(testCase.original);

        expect(result.success).toBe(true);
        expect(result.cleanedUrl).toBe(testCase.expected);
        expect(result.removedCount).toBe(testCase.expectedRemovedCount);
      });
    });

    describe('test-urls.json fixture-based tests', () => {
      Object.entries(testUrls).forEach(([_testName, testCase]) => {
        test(`should handle ${testCase.description}`, () => {
          const result = cleanUrl(testCase.original);

          expect(result.success).toBe(true);
          expect(result.cleanedUrl).toBe(testCase.expected);
          expect(result.removedCount).toBe(testCase.expectedRemovedCount);

          if (testCase.expectedRemovedCount > 0) {
            expect(result.hasChanges).toBe(true);
            expect(result.removedParams).toHaveLength(
              testCase.expectedRemovedCount
            );
          } else {
            expect(result.hasChanges).toBe(false);
          }
        });
      });
    });
  });

  // ============================================================================
  // Utility Functions
  // ============================================================================
  describe('Utility Functions', () => {
    describe('analyzeUrl function', () => {
      test('should provide detailed analysis of tracking parameters', () => {
        const url =
          'https://example.com?utm_source=google&fbclid=123&mc_cid=456&gclid=789';
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
        const url =
          'https://example.com?utm_source=test&utm_medium=email&fbclid=123&igshid=456';
        const result = analyzeUrl(url);

        expect(result.categories.utm).toHaveLength(2);
        expect(result.categories.social).toHaveLength(2);
        expect(result.categories.ads).toHaveLength(0);
        expect(result.categories.affiliate).toHaveLength(0);
      });

      test('should categorize Google Ads parameters correctly', () => {
        const url =
          'https://example.com?gclid=abc&matchtype=e&campaign_id=123&ad_id=456';
        const result = analyzeUrl(url);

        expect(result.success).toBe(true);
        expect(result.summary.ads).toBe(4);
        expect(result.categories.ads).toHaveLength(4);
      });

      test('should handle analytics category', () => {
        const url = 'https://example.com?sthash=test&source=analytics';
        const result = analyzeUrl(url);

        expect(result.summary.analytics).toBe(2);
      });
    });

    describe('cleanUrls batch function', () => {
      test('should clean multiple URLs', () => {
        const urls = [
          'https://example1.com?utm_source=test',
          'https://example2.com?fbclid=123',
          'https://example3.com?clean=param',
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
        expect(isValidUrl('https://sub.domain.com/path?param=value#hash')).toBe(
          true
        );
        expect(isValidUrl('ftp://example.com')).toBe(true);
      });

      test('should reject invalid URLs', () => {
        expect(isValidUrl('not-a-url')).toBe(false);
        expect(isValidUrl('')).toBe(false);
        expect(isValidUrl(null as any)).toBe(false);
        expect(isValidUrl(undefined as any)).toBe(false);
        expect(isValidUrl('//example.com')).toBe(false);
        expect(isValidUrl('example.com')).toBe(false);
      });
    });

    describe('TRACKING_PARAM_PATTERNS exports', () => {
      test('should export parameter patterns array', () => {
        expect(TRACKING_PARAM_PATTERNS).toBeDefined();
        expect(Array.isArray(TRACKING_PARAM_PATTERNS)).toBe(true);
        expect(TRACKING_PARAM_PATTERNS.length).toBeGreaterThan(25);
      });
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================
  describe('Performance Tests', () => {
    test('should handle large numbers of parameters efficiently', () => {
      let url = 'https://example.com?regular=param';

      // Add 100 tracking parameters
      for (let i = 0; i < 100; i++) {
        url += `&utm_source=test${i}`;
      }

      const startTime = performance.now();
      const result = cleanUrl(url);
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(result.removedCount).toBeGreaterThan(0);
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
