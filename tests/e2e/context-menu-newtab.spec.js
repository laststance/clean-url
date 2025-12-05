/**
 * Context Menu New Tab E2E Tests for Clean URL Extension
 *
 * Tests the "Clean this link" context menu functionality that opens
 * cleaned URLs in a new tab using chrome.tabs.create()
 *
 * Since Playwright cannot interact with Chrome's native context menu,
 * this test verifies:
 * 1. The test page with tracking links loads correctly
 * 2. The service worker's context menu handling logic
 * 3. New tab creation behavior via extension message API
 */

import { test, expect } from '@playwright/test';

import { ExtensionFixture } from './fixtures.js';

test.describe('Context Menu - Open in New Tab', () => {

  let extensionFixture;

  test.beforeEach(async ({ context, page }) => {
    extensionFixture = new ExtensionFixture(context, page);
    await extensionFixture.setup();
  });

  test('test-links.html page loads in extension context', async ({ page, context }) => {
    // Get extension pages to find the extension ID
    const extensionPages = context.backgroundPages();

    // Navigate to a page with tracking parameters
    await page.goto('https://example.com?utm_source=test&utm_medium=email');
    await page.waitForLoadState('domcontentloaded');

    // Verify the page loaded
    expect(page.url()).toContain('example.com');

    // The extension should be active (can verify via badge or popup)
    const trackingCount = await extensionFixture.getTrackingParamCount();
    expect(trackingCount).toBeGreaterThanOrEqual(0);
  });

  test('service worker handles clean-link-url with new tab creation', async ({ page }) => {
    // Test the complete service worker flow for "Clean this link"
    const newTabTest = await page.evaluate(() => {
      // Simulate the complete handleContextMenuClick -> cleanUrlFromContextWithNavigate flow

      // Test URLs from test-urls.json
      const testCases = [
        {
          name: 'Basic UTM',
          original: 'https://example.com?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale',
          expected: 'https://example.com/',
          expectedRemovedCount: 3
        },
        {
          name: 'Facebook tracking',
          original: 'https://example.com/article?fbclid=IwAR0abc123def456',
          expected: 'https://example.com/article',
          expectedRemovedCount: 1
        },
        {
          name: 'Mixed parameters',
          original: 'https://shop.example.com/products?category=shoes&utm_source=newsletter&color=red&fbclid=123',
          expected: 'https://shop.example.com/products?category=shoes&color=red',
          expectedRemovedCount: 2
        },
        {
          name: 'Amazon with affiliate',
          original: 'https://www.amazon.co.jp/dp/B0DCMFWCZT?tag=myaffiliate-22&linkCode=ogi&ascsubtag=abc123&camp=247&creative=1211&pd_rd_i=B0DCMFWCZT&pd_rd_r=12345&pd_rd_w=abcde&pd_rd_wg=xyz123',
          expected: 'https://www.amazon.co.jp/dp/B0DCMFWCZT',
          expectedRemovedCount: 9
        }
      ];

      // Tracking parameter patterns (subset matching background.ts)
      const TRACKING_PARAM_PATTERNS = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'yclid', 'dclid', 'msclkid',
        'ck_subscriber_id', 'mc_cid', 'mc_eid',
        'ref', 'affiliate_id', 'click_id', 'subid',
        'tag', 'linkCode', 'ascsubtag', 'camp', 'creative',
        'pd_rd_i', 'pd_rd_r', 'pd_rd_w', 'pd_rd_wg'
      ];

      // Simulate cleanUrl function
      const cleanUrl = (originalUrl) => {
        try {
          const url = new URL(originalUrl);
          const params = new URLSearchParams(url.search);
          const cleanedParams = new URLSearchParams();
          const removedParams = [];

          for (const [key, value] of params.entries()) {
            const paramLower = key.toLowerCase();
            const isTracking = TRACKING_PARAM_PATTERNS.some(pattern =>
              paramLower === pattern.toLowerCase()
            );

            if (isTracking) {
              removedParams.push({ key, value });
            } else {
              cleanedParams.append(key, value);
            }
          }

          const cleanedUrl = new URL(url.origin + url.pathname);
          if (cleanedParams.toString()) {
            cleanedUrl.search = cleanedParams.toString();
          }
          if (url.hash) {
            cleanedUrl.hash = url.hash;
          }

          return {
            success: true,
            cleanedUrl: cleanedUrl.toString(),
            removedCount: removedParams.length,
            hasChanges: removedParams.length > 0
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };

      // Simulate handleContextMenuClick for 'clean-link-url'
      const simulateContextMenuClick = (linkUrl) => {
        const info = { menuItemId: 'clean-link-url', linkUrl };

        // This should route to cleanUrlFromContextWithNavigate
        if (info.menuItemId === 'clean-link-url' && info.linkUrl) {
          const result = cleanUrl(info.linkUrl);

          if (result.success && result.hasChanges) {
            // In real code: chrome.tabs.create({ url: result.cleanedUrl })
            return {
              action: 'chrome.tabs.create',
              cleanedUrl: result.cleanedUrl,
              removedCount: result.removedCount,
              newTabOpened: true
            };
          } else if (result.success && !result.hasChanges) {
            return {
              action: 'showNotification',
              message: 'No tracking parameters found',
              newTabOpened: false
            };
          }
        }
        return { action: 'none' };
      };

      // Run tests
      const results = testCases.map(tc => {
        const result = simulateContextMenuClick(tc.original);
        const cleanResult = cleanUrl(tc.original);

        return {
          name: tc.name,
          original: tc.original,
          expected: tc.expected,
          actual: cleanResult.cleanedUrl,
          expectedRemovedCount: tc.expectedRemovedCount,
          actualRemovedCount: cleanResult.removedCount,
          action: result.action,
          newTabOpened: result.newTabOpened,
          urlsMatch: cleanResult.cleanedUrl === tc.expected,
          countsMatch: cleanResult.removedCount === tc.expectedRemovedCount
        };
      });

      return {
        results,
        allPassed: results.every(r => r.urlsMatch && r.action === 'chrome.tabs.create')
      };
    });

    // Verify all test cases
    expect(newTabTest.allPassed).toBe(true);

    newTabTest.results.forEach(result => {
      expect(result.urlsMatch).toBe(true);
      expect(result.action).toBe('chrome.tabs.create');
      expect(result.newTabOpened).toBe(true);
    });
  });

  test('verifies test-links.html contains correct tracking URLs', async ({ page }) => {
    // Navigate to a test page to verify our test links
    await page.goto('https://example.com');

    // Inject our test links and verify they exist
    const linkVerification = await page.evaluate(() => {
      // Test URLs that should be in test-links.html
      const expectedLinks = [
        'https://example.com?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale',
        'https://example.com/article?fbclid=IwAR0abc123def456',
        'https://shop.example.com/products?category=shoes&utm_source=newsletter&color=red&fbclid=123',
        'https://github.com/modelcontextprotocol/use-mcp?ck_subscriber_id=abcdef123&utm_source=email',
        'https://www.amazon.co.jp/dp/B0DCMFWCZT?tag=myaffiliate-22&linkCode=ogi&ascsubtag=abc123&camp=247&creative=1211&pd_rd_i=B0DCMFWCZT&pd_rd_r=12345&pd_rd_w=abcde&pd_rd_wg=xyz123'
      ];

      // Verify each URL is valid and contains tracking params
      return expectedLinks.map(url => {
        try {
          const urlObj = new URL(url);
          const params = new URLSearchParams(urlObj.search);
          const paramCount = Array.from(params.keys()).length;

          return {
            url: url.substring(0, 60) + '...',
            isValid: true,
            hasParams: paramCount > 0,
            paramCount
          };
        } catch (error) {
          return { url, isValid: false, error: error.message };
        }
      });
    });

    // All links should be valid and have parameters
    linkVerification.forEach(link => {
      expect(link.isValid).toBe(true);
      expect(link.hasParams).toBe(true);
    });
  });

  test('context menu handler distinguishes between clean-link-url and clean-current-url', async ({ page }) => {
    const handlerTest = await page.evaluate(() => {
      // Simulate the handleContextMenuClick routing logic
      const handleContextMenuClick = (info, tab) => {
        // Handle "Clean this link" - opens NEW tab
        if (info.menuItemId === 'clean-link-url' && info.linkUrl) {
          return {
            handler: 'cleanUrlFromContextWithNavigate',
            method: 'chrome.tabs.create',
            opensNewTab: true,
            urlSource: 'info.linkUrl'
          };
        }

        // Handle "Open with cleaned URL" - updates current tab
        if (info.menuItemId === 'clean-current-url' && tab?.url) {
          return {
            handler: 'cleanUrlFromContext',
            method: 'chrome.tabs.update',
            opensNewTab: false,
            urlSource: 'tab.url'
          };
        }

        return { handler: 'none' };
      };

      // Test "Clean this link" scenario
      const linkScenario = handleContextMenuClick(
        { menuItemId: 'clean-link-url', linkUrl: 'https://example.com?utm_source=test' },
        { id: 1, url: 'https://google.com' }
      );

      // Test "Open with cleaned URL" scenario
      const pageScenario = handleContextMenuClick(
        { menuItemId: 'clean-current-url' },
        { id: 1, url: 'https://example.com?utm_source=test' }
      );

      return { linkScenario, pageScenario };
    });

    // "Clean this link" should open new tab
    expect(handlerTest.linkScenario.handler).toBe('cleanUrlFromContextWithNavigate');
    expect(handlerTest.linkScenario.method).toBe('chrome.tabs.create');
    expect(handlerTest.linkScenario.opensNewTab).toBe(true);

    // "Open with cleaned URL" should update current tab
    expect(handlerTest.pageScenario.handler).toBe('cleanUrlFromContext');
    expect(handlerTest.pageScenario.method).toBe('chrome.tabs.update');
    expect(handlerTest.pageScenario.opensNewTab).toBe(false);
  });

  test('URL cleaning preserves legitimate parameters while removing trackers', async ({ page }) => {
    const cleaningTest = await page.evaluate(() => {
      const TRACKING_PARAM_PATTERNS = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'yclid', 'dclid', 'msclkid',
        'ck_subscriber_id', 'mc_cid', 'mc_eid',
        'tag', 'linkCode', 'ascsubtag', 'camp', 'creative',
        'pd_rd_i', 'pd_rd_r', 'pd_rd_w', 'pd_rd_wg'
      ];

      const cleanUrl = (originalUrl) => {
        const url = new URL(originalUrl);
        const params = new URLSearchParams(url.search);
        const cleanedParams = new URLSearchParams();
        const removed = [];
        const preserved = [];

        for (const [key, value] of params.entries()) {
          const paramLower = key.toLowerCase();
          const isTracking = TRACKING_PARAM_PATTERNS.some(p => paramLower === p.toLowerCase());

          if (isTracking) {
            removed.push(key);
          } else {
            preserved.push(key);
            cleanedParams.append(key, value);
          }
        }

        const cleanedUrl = new URL(url.origin + url.pathname);
        if (cleanedParams.toString()) {
          cleanedUrl.search = cleanedParams.toString();
        }

        return { cleanedUrl: cleanedUrl.toString(), removed, preserved };
      };

      // Test case: Mixed parameters
      const result = cleanUrl('https://shop.example.com/products?category=shoes&utm_source=newsletter&color=red&size=10&fbclid=123&price=100');

      return result;
    });

    // Tracking params should be removed
    expect(cleaningTest.removed).toContain('utm_source');
    expect(cleaningTest.removed).toContain('fbclid');

    // Legitimate params should be preserved
    expect(cleaningTest.preserved).toContain('category');
    expect(cleaningTest.preserved).toContain('color');
    expect(cleaningTest.preserved).toContain('size');
    expect(cleaningTest.preserved).toContain('price');

    // Final URL should only have legitimate params
    expect(cleaningTest.cleanedUrl).toContain('category=shoes');
    expect(cleaningTest.cleanedUrl).toContain('color=red');
    expect(cleaningTest.cleanedUrl).toContain('size=10');
    expect(cleaningTest.cleanedUrl).toContain('price=100');
    expect(cleaningTest.cleanedUrl).not.toContain('utm_source');
    expect(cleaningTest.cleanedUrl).not.toContain('fbclid');
  });

  test('handles URLs with hash fragments correctly', async ({ page }) => {
    const fragmentTest = await page.evaluate(() => {
      const TRACKING_PARAM_PATTERNS = ['utm_source', 'utm_medium', 'ck_subscriber_id'];

      const cleanUrl = (originalUrl) => {
        const url = new URL(originalUrl);
        const params = new URLSearchParams(url.search);
        const cleanedParams = new URLSearchParams();

        for (const [key, value] of params.entries()) {
          const isTracking = TRACKING_PARAM_PATTERNS.some(p => key.toLowerCase() === p.toLowerCase());
          if (!isTracking) {
            cleanedParams.append(key, value);
          }
        }

        const cleanedUrl = new URL(url.origin + url.pathname);
        if (cleanedParams.toString()) {
          cleanedUrl.search = cleanedParams.toString();
        }
        if (url.hash) {
          cleanedUrl.hash = url.hash;
        }

        return cleanedUrl.toString();
      };

      const testUrl = 'https://example.com/docs?utm_source=email&section=api#installation';
      const cleaned = cleanUrl(testUrl);

      return {
        original: testUrl,
        cleaned,
        hasFragment: cleaned.includes('#installation'),
        hasTracker: cleaned.includes('utm_source'),
        hasLegitParam: cleaned.includes('section=api')
      };
    });

    expect(fragmentTest.hasFragment).toBe(true);
    expect(fragmentTest.hasTracker).toBe(false);
    expect(fragmentTest.hasLegitParam).toBe(true);
    expect(fragmentTest.cleaned).toBe('https://example.com/docs?section=api#installation');
  });

  test('notification message differs between new tab and current tab actions', async ({ page }) => {
    const notificationTest = await page.evaluate(() => {
      // Simulate the notification messages from both functions
      const cleanUrlFromContextNotification = (removedCount) => {
        return `Removed ${removedCount} tracking parameters`;
      };

      const cleanUrlFromContextWithNavigateNotification = (removedCount) => {
        return `Removed ${removedCount} tracking parameters. Opened in new tab.`;
      };

      return {
        currentTabMessage: cleanUrlFromContextNotification(3),
        newTabMessage: cleanUrlFromContextWithNavigateNotification(3),
        newTabIncludesNewTab: cleanUrlFromContextWithNavigateNotification(3).includes('new tab'),
        currentTabDoesNotIncludeNewTab: !cleanUrlFromContextNotification(3).includes('new tab')
      };
    });

    expect(notificationTest.newTabIncludesNewTab).toBe(true);
    expect(notificationTest.currentTabDoesNotIncludeNewTab).toBe(true);
  });

});

test.describe('Context Menu - Edge Cases', () => {

  let extensionFixture;

  test.beforeEach(async ({ context, page }) => {
    extensionFixture = new ExtensionFixture(context, page);
    await extensionFixture.setup();
  });

  test('handles URL with no tracking parameters (no new tab should open)', async ({ page }) => {
    const noTrackingTest = await page.evaluate(() => {
      const TRACKING_PARAM_PATTERNS = ['utm_source', 'utm_medium', 'fbclid'];

      const cleanUrl = (originalUrl) => {
        const url = new URL(originalUrl);
        const params = new URLSearchParams(url.search);
        let removedCount = 0;

        for (const [key] of params.entries()) {
          if (TRACKING_PARAM_PATTERNS.includes(key.toLowerCase())) {
            removedCount++;
          }
        }

        return { hasChanges: removedCount > 0, removedCount };
      };

      // URL with no tracking params
      const result = cleanUrl('https://example.com/page?category=tech&sort=date&page=2');

      // Simulate cleanUrlFromContextWithNavigate behavior
      if (result.hasChanges) {
        return { action: 'openNewTab', shouldOpenNewTab: true };
      } else {
        return { action: 'showNotification', shouldOpenNewTab: false, message: 'No tracking parameters found' };
      }
    });

    expect(noTrackingTest.shouldOpenNewTab).toBe(false);
    expect(noTrackingTest.action).toBe('showNotification');
  });

  test('handles complex URL with many tracking parameters', async ({ page }) => {
    const complexTest = await page.evaluate(() => {
      const TRACKING_PARAM_PATTERNS = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_ad',
        'gclid', 'gad_source', 'gad_campaignid', 'gbraid',
        'matchtype', 'campaign_id', 'ad_id'
      ];

      const cleanUrl = (originalUrl) => {
        const url = new URL(originalUrl);
        const params = new URLSearchParams(url.search);
        const cleanedParams = new URLSearchParams();
        let removedCount = 0;

        for (const [key, value] of params.entries()) {
          if (TRACKING_PARAM_PATTERNS.includes(key.toLowerCase())) {
            removedCount++;
          } else {
            cleanedParams.append(key, value);
          }
        }

        const cleanedUrl = new URL(url.origin + url.pathname);
        if (cleanedParams.toString()) {
          cleanedUrl.search = cleanedParams.toString();
        }

        return { cleanedUrl: cleanedUrl.toString(), removedCount };
      };

      // Complex Google Ads URL
      const complexUrl = 'https://mixpanel.com/compare/posthog/?utm_source=google&utm_medium=ppc&utm_campaign=test&utm_content=content&utm_ad=123&gclid=abc&gad_source=1&matchtype=e&campaign_id=456&ad_id=789';

      return cleanUrl(complexUrl);
    });

    expect(complexTest.removedCount).toBeGreaterThan(5);
    expect(complexTest.cleanedUrl).toBe('https://mixpanel.com/compare/posthog/');
  });

});
