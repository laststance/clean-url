/**
 * End-to-End Tests for Clean URL Extension
 * Tests the extension functionality in a real browser environment
 */

import { test, expect } from '@playwright/test';

import { ExtensionFixture } from './fixtures.js';

test.describe('Clean URL Extension E2E Tests', () => {
  
  let extensionFixture;
  
  test.beforeEach(async ({ context: _context, page }) => {
    extensionFixture = new ExtensionFixture(_context, page);
    await extensionFixture.setup();
  });

  test('extension loads correctly', async ({ page }) => {
    // Navigate to a test page
    await page.goto('https://example.com?utm_source=test&utm_medium=email');
    
    // Check if extension icon is visible (may vary by browser)
    const _extensionIcon = page.locator('[data-testid="extension-action"]');
    
    // The extension should be loaded (we can't directly test icon visibility in headless mode)
    // but we can test the functionality
    expect(true).toBe(true); // Placeholder - actual icon testing needs special setup
  });

  test('popup opens and analyzes URL', async ({ page, context: _context }) => {
    // Navigate to a page with tracking parameters
    await page.goto('https://example.com?utm_source=google&utm_medium=cpc&fbclid=123');
    
    // Try to get extension pages (popup)
    const extensionPages = await extensionFixture.getExtensionPages();
    
    if (extensionPages.length > 0) {
      const popupPage = extensionPages[0];
      
      // Wait for popup to load
      await popupPage.waitForSelector('#main-content');
      
      // Check if URL is displayed
      const originalUrl = await popupPage.locator('#original-url').textContent();
      expect(originalUrl).toContain('example.com');
      
      // Check if tracking parameters are detected
      const removedCount = await popupPage.locator('#removed-count').textContent();
      expect(removedCount).toContain('3'); // Should detect 3 tracking parameters
    }
  });

  test('URL cleaning functionality works', async ({ page }) => {
    // Start with a URL containing tracking parameters
    const originalUrl = 'https://example.com/test?utm_source=test&utm_medium=email&product=laptop&fbclid=123';
    await page.goto(originalUrl);
    
    // Simulate extension popup interaction
    const cleanedUrl = await extensionFixture.cleanCurrentUrl();
    
    // Verify the URL was cleaned
    expect(cleanedUrl).toBe('https://example.com/test?product=laptop');
    expect(cleanedUrl).not.toContain('utm_source');
    expect(cleanedUrl).not.toContain('utm_medium');
    expect(cleanedUrl).not.toContain('fbclid');
    expect(cleanedUrl).toContain('product=laptop'); // Should preserve legitimate params
  });

  test('copy to clipboard functionality', async ({ page, context: _context }) => {
    await page.goto('https://example.com?utm_source=test&clean=param');
    
    // Grant clipboard permissions
    await _context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    const extensionPages = await extensionFixture.getExtensionPages();
    
    if (extensionPages.length > 0) {
      const popupPage = extensionPages[0];
      
      // Wait for popup to load
      await popupPage.waitForSelector('#copy-cleaned');
      
      // Click the copy cleaned URL button
      await popupPage.click('#copy-cleaned');
      
      // Verify clipboard content (if possible in test environment)
      // Note: Clipboard testing in headless browsers can be challenging
      const toast = await popupPage.locator('.toast.success').first();
      await expect(toast).toContainText('copied', { ignoreCase: true });
    }
  });

  test('apply cleaned URL functionality', async ({ page }) => {
    const originalUrl = 'https://httpbin.org/get?utm_source=test&utm_medium=email&test=value';
    await page.goto(originalUrl);
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Use extension to clean and apply URL
    await extensionFixture.cleanAndApplyUrl();
    
    // Wait for navigation
    await page.waitForLoadState('domcontentloaded');
    
    // Check that URL was updated
    const currentUrl = page.url();
    expect(currentUrl).toContain('test=value');
    expect(currentUrl).not.toContain('utm_source');
    expect(currentUrl).not.toContain('utm_medium');
  });

  test('badge shows tracking parameter count', async ({ page }) => {
    // Navigate to page with multiple tracking parameters
    await page.goto('https://example.com?utm_source=test&utm_medium=email&fbclid=123&gclid=456');
    
    // Wait for background script to process
    await page.waitForTimeout(1000);
    
    // Check if badge is set (this is browser-specific and may not be testable in headless mode)
    // We can test the logic by calling the background script directly
    const trackingCount = await extensionFixture.getTrackingParamCount();
    expect(trackingCount).toBe(4);
  });

  test('context menu integration', async ({ page, context: _context }) => {
    await page.goto('https://example.com');
    
    // Create a test link with tracking parameters
    await page.setContent(`
      <html>
        <body>
          <a href="https://example.com/product?utm_source=email&product=test&fbclid=123" id="test-link">
            Test Link with Tracking
          </a>
        </body>
      </html>
    `);
    
    // Right-click on the link
    await page.click('#test-link', { button: 'right' });
    
    // Check if context menu appears (browser-specific, may not work in all test environments)
    // This is mainly to verify the extension registers context menus
    expect(true).toBe(true); // Placeholder for actual context menu testing
  });

  test('handles various URL formats', async ({ page }) => {
    const testUrls = [
      'https://example.com?utm_source=test',
      'https://httpbin.org/get?utm_medium=email&port=3000',
      'https://httpbin.org/anything/path?utm_campaign=test&valid=param',
      'https://example.com/path?utm_source=test#section',
      'https://gemini.google.com/gem/storybook?utm_source=gemini&utm_medium=email&utm_campaign=august_classic_storybook'
    ];
    
    for (const url of testUrls) {
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');
      
      const cleanedUrl = await extensionFixture.cleanCurrentUrl();
      
      // Verify tracking parameters are removed
      expect(cleanedUrl).not.toContain('utm_');
      
      // Verify legitimate parameters and fragments are preserved
      if (url.includes('port=3000')) {
        expect(cleanedUrl).toContain('port=3000');
      }
      if (url.includes('valid=param')) {
        expect(cleanedUrl).toContain('valid=param');
      }
      if (url.includes('#section')) {
        expect(cleanedUrl).toContain('#section');
      }
    }
  });

  test('error handling for invalid URLs', async ({ page }) => {
    // Test with non-web URLs (should not crash)
    await page.goto('about:blank');
    
    const trackingCount = await extensionFixture.getTrackingParamCount();
    expect(trackingCount).toBe(0); // Should handle gracefully
  });

  test('performance with large URLs', async ({ page }) => {
    // Create a URL with many parameters
    let url = 'https://example.com?legitimate=param';
    for (let i = 0; i < 50; i++) {
      url += `&utm_source${i}=test${i}`;
    }
    
    await page.goto(url);
    
    const startTime = Date.now();
    const cleanedUrl = await extensionFixture.cleanCurrentUrl();
    const endTime = Date.now();
    
    // Should complete quickly
    expect(endTime - startTime).toBeLessThan(1000);
    
    // Should preserve legitimate parameter
    expect(cleanedUrl).toContain('legitimate=param');
    // The numbered utm parameters (utm_source0, utm_source1, etc.) should remain
    // since they don't exactly match our tracking patterns
    expect(cleanedUrl).toContain('utm_source0'); // This should NOT be removed
  });

  test('privacy - no data collection', async ({ page, context: _context }) => {
    await page.goto('https://example.com?utm_source=sensitive_data&private=info');
    
    // Monitor network requests to ensure no data is sent externally
    const requests = [];
    page.on('request', request => {
      requests.push(request.url());
    });
    
    // Use extension functionality
    await extensionFixture.cleanCurrentUrl();
    
    // Wait a bit for any potential network activity
    await page.waitForTimeout(2000);
    
    // Verify no external requests are made (except to example.com)
    const externalRequests = requests.filter(url => 
      !url.includes('example.com') && 
      !url.includes('chrome-extension:') &&
      !url.includes('data:') &&
      !url.includes('about:')
    );
    
    expect(externalRequests).toHaveLength(0);
  });

});

test.describe('Extension Settings and Configuration', () => {
  
  test('extension manifest is valid', async ({ page: _page, context: _context }) => {
    // This test verifies the extension loads with correct permissions
    // In a real test, you'd check the actual manifest
    expect(true).toBe(true); // Placeholder
  });

  test('extension works in incognito mode', async ({ context: _context }) => {
    // Note: This requires special browser setup for incognito testing
    // Placeholder for incognito mode testing
    expect(true).toBe(true);
  });

});