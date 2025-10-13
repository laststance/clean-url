/**
 * Simplified Unit Tests for Clean URL Logic
 * Tests the core URL cleaning functionality
 */

import { describe, test, expect } from 'vitest';
import { cleanUrl, analyzeUrl, isValidUrl } from '../../utils/clean-url-logic';

describe('Clean URL Logic - Core Tests', () => {
  
  test('should clean basic UTM parameters', () => {
    const originalUrl = 'https://example.com?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale';
    const result = cleanUrl(originalUrl);
    
    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://example.com/');
    expect(result.removedCount).toBe(3);
    expect(result.hasChanges).toBe(true);
  });

  test('should preserve legitimate parameters while removing tracking', () => {
    const originalUrl = 'https://shop.example.com/products?category=shoes&utm_source=newsletter&color=red&fbclid=123';
    const result = cleanUrl(originalUrl);
    
    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://shop.example.com/products?category=shoes&color=red');
    expect(result.removedCount).toBe(2);
    expect(result.cleanedUrl).toContain('category=shoes');
    expect(result.cleanedUrl).toContain('color=red');
    expect(result.cleanedUrl).not.toContain('utm_source');
    expect(result.cleanedUrl).not.toContain('fbclid');
  });

  test('should handle URLs without tracking parameters', () => {
    const originalUrl = 'https://clean.example.com/page?category=tech&sort=date&page=2';
    const result = cleanUrl(originalUrl);
    
    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe(originalUrl);
    expect(result.removedCount).toBe(0);
    expect(result.hasChanges).toBe(false);
  });

  test('should handle Facebook tracking ID', () => {
    const originalUrl = 'https://example.com/article?fbclid=IwAR0abc123def456';
    const result = cleanUrl(originalUrl);
    
    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://example.com/article');
    expect(result.removedCount).toBe(1);
  });

  test('should preserve URL fragments while cleaning parameters', () => {
    const originalUrl = 'https://plainvanillaweb.com/blog/articles/2025-06-12-view-transitions/?ck_subscriber_id=xyz789&utm_medium=social#section-intro';
    const result = cleanUrl(originalUrl);
    
    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://plainvanillaweb.com/blog/articles/2025-06-12-view-transitions/#section-intro');
    expect(result.removedCount).toBe(2);
    expect(result.cleanedUrl).toContain('#section-intro');
    expect(result.cleanedUrl).not.toContain('ck_subscriber_id');
    expect(result.cleanedUrl).not.toContain('utm_medium');
  });

  test('should handle ConvertKit subscriber IDs', () => {
    const originalUrl = 'https://www.premieroctet.com/blog/en/tanstack-future-react-frameworks?ck_subscriber_id=1234567890';
    const result = cleanUrl(originalUrl);
    
    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://www.premieroctet.com/blog/en/tanstack-future-react-frameworks');
    expect(result.removedCount).toBe(1);
  });

  test('should handle multiple social media trackers', () => {
    const originalUrl = 'https://news.example.com/article?fbclid=fb123&igshid=ig456&ttclid=tt789&li_fat_id=li012';
    const result = cleanUrl(originalUrl);
    
    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://news.example.com/article');
    expect(result.removedCount).toBe(4);
  });

  test('should handle Google Click ID with legitimate parameter', () => {
    const originalUrl = 'https://store.example.com?gclid=TeSter-123_abc.def&product=laptop';
    const result = cleanUrl(originalUrl);

    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://store.example.com/?product=laptop');
    expect(result.removedCount).toBe(1);
    expect(result.cleanedUrl).toContain('product=laptop');
    expect(result.cleanedUrl).not.toContain('gclid');
  });

});

describe('Google Ads Search Parameters (Issue #1)', () => {

  test('should clean comprehensive Google Ads search URL with all tracking parameters', () => {
    // Real-world URL from GitHub issue #1
    const originalUrl = 'https://mixpanel.com/compare/posthog/?utm_source=google&utm_medium=ppc&utm_campaign=APAC-Competitive-Search-EN-Exact-All-Devices&utm_source=google&utm_medium=cpc&utm_campaign=APAC-Competitive-Search-EN-Exact-All-Devices&utm_content=PostHog&utm_ad=766540614712&utm_term=posthog&matchtype=e&campaign_id=22010460477&ad_id=766540614712&gclid=CjwKCAjwlaTGBhANEiwAoRgXBU1m6NTENxdBAyV7Uj4boyYa-0xpOW9Suhq89T7ZTV7nv0drZKwK8hoCh_0QAvD_BwE&gad_source=1&gad_campaignid=22010460477&gbraid=0AAAAAD85aTZffck7MiJP3pnt5uLyOHmYK';
    const result = cleanUrl(originalUrl);

    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://mixpanel.com/compare/posthog/');
    expect(result.removedCount).toBeGreaterThan(10); // Should remove many tracking parameters
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
    const originalUrl = 'https://example.com/page?matchtype=e&campaign_id=123&ad_id=456&category=tech';
    const result = cleanUrl(originalUrl);

    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://example.com/page?category=tech');
    expect(result.removedCount).toBe(3);
    expect(result.cleanedUrl).toContain('category=tech');
    expect(result.cleanedUrl).not.toContain('matchtype');
    expect(result.cleanedUrl).not.toContain('campaign_id');
    expect(result.cleanedUrl).not.toContain('ad_id');
  });

  test('should handle utm_ad parameter', () => {
    const originalUrl = 'https://example.com?utm_source=google&utm_ad=12345&page=home';
    const result = cleanUrl(originalUrl);

    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://example.com/?page=home');
    expect(result.removedCount).toBe(2);
    expect(result.cleanedUrl).not.toContain('utm_ad');
  });

  test('should categorize Google Ads parameters correctly in analyzeUrl', () => {
    const url = 'https://example.com?gclid=abc&matchtype=e&campaign_id=123&ad_id=456';
    const result = analyzeUrl(url);

    expect(result.success).toBe(true);
    expect(result.summary.ads).toBe(4);
    expect(result.categories.ads).toHaveLength(4);
  });

});

describe('Real-world Newsletter URL Tests', () => {
  
  test('should clean DevonGovett blog URL with ConvertKit tracking', () => {
    const originalUrl = 'https://devongovett.me/blog/scope-hoisting.html?ck_subscriber_id=1866526852&utm_source=convertkit&utm_medium=email&utm_campaign=%E2%9A%9B%EF%B8%8F%20This%20Week%20In%20React%20#242:%20Vite%20RSC,%20Next.js,%20NuxtLabs,%20shadcn,%20TanStack,%20Valtio,%20XState,%20RHF%20%7C%20Unistyles,%20Rag,%20Shadow%20Insets,%20Ignite,%20Metro,%20RN%200.81%20RC%20%7C%20TypeScript,%20CSS%20Gaps,%20Browserlist-rs,%20Biome,%20Astro,%20esbuild%20-%2018236230';
    const result = cleanUrl(originalUrl);
    
    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://devongovett.me/blog/scope-hoisting.html');
    expect(result.removedCount).toBe(4);
    expect(result.cleanedUrl).not.toContain('ck_subscriber_id');
    expect(result.cleanedUrl).not.toContain('utm_source');
    expect(result.cleanedUrl).not.toContain('utm_medium');
    expect(result.cleanedUrl).not.toContain('utm_campaign');
  });

  test('should clean Frontend Masters blog URL with ConvertKit tracking', () => {
    const originalUrl = 'https://frontendmasters.com/blog/satisfies-in-typescript/?ck_subscriber_id=1866526852&utm_source=convertkit&utm_medium=email&utm_campaign=%E2%9A%9B%EF%B8%8F%20This%20Week%20In%20React%20#242:%20Vite%20RSC,%20Next.js,%20NuxtLabs,%20shadcn,%20TanStack,%20Valtio,%20XState,%20RHF%20%7C%20Unistyles,%20Rag,%20Shadow%20Insets,%20Ignite,%20Metro,%20RN%200.81%20RC%20%7C%20TypeScript,%20CSS%20Gaps,%20Browserlist-rs,%20Biome,%20Astro,%20esbuild%20-%2018236230';
    const result = cleanUrl(originalUrl);
    
    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://frontendmasters.com/blog/satisfies-in-typescript/');
    expect(result.removedCount).toBe(4);
    expect(result.cleanedUrl).not.toContain('ck_subscriber_id');
    expect(result.cleanedUrl).not.toContain('utm_source');
    expect(result.cleanedUrl).not.toContain('utm_medium');
    expect(result.cleanedUrl).not.toContain('utm_campaign');
  });

  test('should clean Shadcn UI docs URL with ConvertKit tracking', () => {
    const originalUrl = 'https://ui.shadcn.com/docs/changelog?ck_subscriber_id=1866526852&utm_source=convertkit&utm_medium=email&utm_campaign=%E2%9A%9B%EF%B8%8F%20This%20Week%20In%20React%20#242:%20Vite%20RSC,%20Next.js,%20NuxtLabs,%20shadcn,%20TanStack,%20Valtio,%20XState,%20RHF%20%7C%20Unistyles,%20Rag,%20Shadow%20Insets,%20Ignite,%20Metro,%20RN%200.81%20RC%20%7C%20TypeScript,%20CSS%20Gaps,%20Browserlist-rs,%20Biome,%20Astro,%20esbuild%20-%2018236230';
    const result = cleanUrl(originalUrl);
    
    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://ui.shadcn.com/docs/changelog');
    expect(result.removedCount).toBe(4);
    expect(result.cleanedUrl).not.toContain('ck_subscriber_id');
    expect(result.cleanedUrl).not.toContain('utm_source');
    expect(result.cleanedUrl).not.toContain('utm_medium');
    expect(result.cleanedUrl).not.toContain('utm_campaign');
  });

  test('should clean GitHub issue URL with ConvertKit tracking', () => {
    const originalUrl = 'https://github.com/vitejs/vite-plugin-react/issues/531?ck_subscriber_id=1866526852&utm_source=convertkit&utm_medium=email&utm_campaign=%E2%9A%9B%EF%B8%8F%20This%20Week%20In%20React%20#242:%20Vite%20RSC,%20Next.js,%20NuxtLabs,%20shadcn,%20TanStack,%20Valtio,%20XState,%20RHF%20%7C%20Unistyles,%20Rag,%20Shadow%20Insets,%20Ignite,%20Metro,%20RN%200.81%20RC%20%7C%20TypeScript,%20CSS%20Gaps,%20Browserlist-rs,%20Biome,%20Astro,%20esbuild%20-%2018236230';
    const result = cleanUrl(originalUrl);
    
    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://github.com/vitejs/vite-plugin-react/issues/531');
    expect(result.removedCount).toBe(4);
    expect(result.cleanedUrl).not.toContain('ck_subscriber_id');
    expect(result.cleanedUrl).not.toContain('utm_source');
    expect(result.cleanedUrl).not.toContain('utm_medium');
    expect(result.cleanedUrl).not.toContain('utm_campaign');
  });

  test('should clean 56kode blog URL with ConvertKit tracking', () => {
    const originalUrl = 'https://www.56kode.com/posts/level-up-react-deep-dive-into-state-and-usestate/?ck_subscriber_id=1866526852&utm_source=convertkit&utm_medium=email&utm_campaign=%E2%9A%9B%EF%B8%8F%20This%20Week%20In%20React%20#242:%20Vite%20RSC,%20Next.js,%20NuxtLabs,%20shadcn,%20TanStack,%20Valtio,%20XState,%20RHF%20%7C%20Unistyles,%20Rag,%20Shadow%20Insets,%20Ignite,%20Metro,%20RN%200.81%20RC%20%7C%20TypeScript,%20CSS%20Gaps,%20Browserlist-rs,%20Biome,%20Astro,%20esbuild%20-%2018236230';
    const result = cleanUrl(originalUrl);
    
    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://www.56kode.com/posts/level-up-react-deep-dive-into-state-and-usestate/');
    expect(result.removedCount).toBe(4);
    expect(result.cleanedUrl).not.toContain('ck_subscriber_id');
    expect(result.cleanedUrl).not.toContain('utm_source');
    expect(result.cleanedUrl).not.toContain('utm_medium');
    expect(result.cleanedUrl).not.toContain('utm_campaign');
  });

});

describe('Input Validation Tests', () => {
  
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

  test('should handle malformed URLs', () => {
    const result = cleanUrl('not-a-valid-url');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid URL');
  });

});

describe('Edge Cases', () => {
  
  test('should handle case insensitive parameter matching', () => {
    // Our implementation does case-insensitive matching via toLowerCase()
    const originalUrl = 'https://example.com?UTM_SOURCE=Google&utm_medium=CPC&FBCLID=test123';
    const result = cleanUrl(originalUrl);
    
    expect(result.success).toBe(true);
    // All tracking parameters should be removed (case-insensitive)
    expect(result.removedCount).toBe(3);
    expect(result.cleanedUrl).toBe('https://example.com/');
  });

  test('should handle very long URLs', () => {
    let url = 'https://example.com/very/long/path/with/many/segments?';
    // Add actual tracking parameters that will be matched
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid', 'yclid'];
    for (let i = 0; i < trackingParams.length; i++) {
      url += `${trackingParams[i]}=test${i}&`;
    }
    url += 'normal_param=value';
    
    const result = cleanUrl(url);
    
    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(6);
    expect(result.cleanedUrl).toContain('normal_param=value');
    expect(result.cleanedUrl).not.toContain('utm_source');
  });

  test('should handle special characters and encoding', () => {
    const originalUrl = 'https://example.com/search?q=hello%20world&utm_source=test%2Bsource&utm_medium=email%40campaign';
    const result = cleanUrl(originalUrl);
    
    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(2);
    expect(result.cleanedUrl).toContain('q=hello');
    expect(result.cleanedUrl).not.toContain('utm_source');
    expect(result.cleanedUrl).not.toContain('utm_medium');
  });

});

describe('Utility Functions', () => {
  
  test('isValidUrl should validate correct URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
    expect(isValidUrl('https://sub.domain.com/path?param=value#hash')).toBe(true);
  });

  test('isValidUrl should reject invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl(null as any)).toBe(false);
    expect(isValidUrl(undefined as any)).toBe(false);
  });

  test('analyzeUrl should provide detailed analysis', () => {
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

});

describe('Performance Tests', () => {
  
  test('should handle large numbers of parameters efficiently', () => {
    let url = 'https://example.com?regular=param';
    
    // Add multiple instances of actual tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
    for (let i = 0; i < 20; i++) {
      for (const param of trackingParams) {
        url += `&${param}${i}=test${i}`;
      }
    }
    
    const startTime = Date.now();
    const result = cleanUrl(url);
    const endTime = Date.now();
    
    expect(result.success).toBe(true);
    // Only the exact parameter names will be removed, not the numbered variants
    expect(result.removedCount).toBe(0); // utm_source0 != utm_source
    expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    expect(result.cleanedUrl).toContain('regular=param');
  });

});
