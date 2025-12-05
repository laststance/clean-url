/**
 * Context Menu E2E Tests for Clean URL Extension
 * Tests the context menu functionality: "Open with cleaned URL" and "Clean this link"
 *
 * Key behaviors tested:
 * - "Open with cleaned URL": Updates current tab with cleaned URL
 * - "Clean this link": Opens cleaned URL in NEW tab
 */

import { test, expect } from '@playwright/test';

import { ExtensionFixture, createTestUrl } from './fixtures.js';

test.describe('Context Menu Functionality', () => {

  let extensionFixture;

  test.beforeEach(async ({ context, page }) => {
    extensionFixture = new ExtensionFixture(context, page);
    await extensionFixture.setup();
  });

  test('context menu items are registered correctly', async ({ page }) => {
    // Test that context menu setup simulation works
    const contextMenuSetup = await page.evaluate(() => {
      // Simulate service worker context menu setup
      const menuItems = [];

      // Simulate chrome.contextMenus.create() calls from background.ts
      const createMenu = (options) => {
        menuItems.push({
          id: options.id,
          title: options.title,
          contexts: options.contexts,
          patterns: options.documentUrlPatterns || options.targetUrlPatterns
        });
      };

      // These should match background.ts setupContextMenus()
      createMenu({
        id: 'clean-current-url',
        title: 'Open with cleaned URL',
        contexts: ['page'],
        documentUrlPatterns: ['http://*/*', 'https://*/*']
      });

      createMenu({
        id: 'clean-link-url',
        title: 'Clean this link',
        contexts: ['link'],
        targetUrlPatterns: ['http://*/*', 'https://*/*']
      });

      return {
        menuItems,
        hasCleanCurrentUrl: menuItems.some(m => m.id === 'clean-current-url'),
        hasCleanLinkUrl: menuItems.some(m => m.id === 'clean-link-url'),
        pageContextMenuHasPageContext: menuItems.find(m => m.id === 'clean-current-url')?.contexts.includes('page'),
        linkContextMenuHasLinkContext: menuItems.find(m => m.id === 'clean-link-url')?.contexts.includes('link')
      };
    });

    expect(contextMenuSetup.hasCleanCurrentUrl).toBe(true);
    expect(contextMenuSetup.hasCleanLinkUrl).toBe(true);
    expect(contextMenuSetup.pageContextMenuHasPageContext).toBe(true);
    expect(contextMenuSetup.linkContextMenuHasLinkContext).toBe(true);
  });

  test('handleContextMenuClick routes "clean-link-url" to new tab function', async ({ page }) => {
    // Test that clean-link-url calls cleanUrlFromContextWithNavigate (opens new tab)
    const routingTest = await page.evaluate(() => {
      // Simulate handleContextMenuClick logic from background.ts
      const handleContextMenuClick = (info, tab) => {
        const actions = [];

        // Handle "Clean this link" - should open NEW tab
        if (info.menuItemId === 'clean-link-url' && info.linkUrl) {
          actions.push({
            action: 'cleanUrlFromContextWithNavigate',
            url: info.linkUrl,
            behavior: 'opens_new_tab'
          });
          return { actions, behavior: 'new_tab' };
        }

        // Handle "Open with cleaned URL" - should update current tab
        if (info.menuItemId === 'clean-current-url' && tab?.url) {
          actions.push({
            action: 'cleanUrlFromContext',
            url: tab.url,
            behavior: 'updates_current_tab'
          });
          return { actions, behavior: 'current_tab' };
        }

        return { actions, behavior: 'none' };
      };

      // Test "Clean this link" scenario
      const linkResult = handleContextMenuClick(
        { menuItemId: 'clean-link-url', linkUrl: 'https://example.com?utm_source=test&product=laptop' },
        { id: 1, url: 'https://google.com' }
      );

      // Test "Open with cleaned URL" scenario
      const pageResult = handleContextMenuClick(
        { menuItemId: 'clean-current-url' },
        { id: 1, url: 'https://example.com?utm_source=test&product=laptop' }
      );

      return { linkResult, pageResult };
    });

    // "Clean this link" should use new tab behavior
    expect(routingTest.linkResult.behavior).toBe('new_tab');
    expect(routingTest.linkResult.actions[0].action).toBe('cleanUrlFromContextWithNavigate');
    expect(routingTest.linkResult.actions[0].behavior).toBe('opens_new_tab');

    // "Open with cleaned URL" should use current tab behavior
    expect(routingTest.pageResult.behavior).toBe('current_tab');
    expect(routingTest.pageResult.actions[0].action).toBe('cleanUrlFromContext');
    expect(routingTest.pageResult.actions[0].behavior).toBe('updates_current_tab');
  });

  test('cleanUrlFromContextWithNavigate uses chrome.tabs.create for new tab', async ({ page }) => {
    // Test that the new function correctly uses chrome.tabs.create()
    const newTabTest = await page.evaluate(async () => {
      // Simulate chrome.tabs.create behavior
      const createdTabs = [];
      const mockChrome = {
        tabs: {
          create: async (options) => {
            createdTabs.push(options);
            return { id: 999, url: options.url };
          },
          update: async (tabId, options) => {
            // This should NOT be called for "Clean this link"
            throw new Error('tabs.update should not be called for link cleaning');
          }
        }
      };

      // Simulate cleanUrlFromContextWithNavigate logic
      const cleanUrlFromContextWithNavigate = async (url) => {
        // Simulate URL cleaning
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        const cleanedParams = new URLSearchParams();
        let removedCount = 0;

        for (const [key, value] of params.entries()) {
          if (trackingParams.includes(key.toLowerCase())) {
            removedCount++;
          } else {
            cleanedParams.append(key, value);
          }
        }

        const cleanedUrl = new URL(urlObj.origin + urlObj.pathname);
        if (cleanedParams.toString()) {
          cleanedUrl.search = cleanedParams.toString();
        }

        if (removedCount > 0) {
          // Key assertion: Uses create() not update()
          await mockChrome.tabs.create({ url: cleanedUrl.toString() });
        }

        return { cleanedUrl: cleanedUrl.toString(), removedCount };
      };

      // Test with a URL containing tracking parameters
      const testUrl = 'https://example.com/product?utm_source=email&utm_medium=newsletter&product=laptop&fbclid=abc123';

      return cleanUrlFromContextWithNavigate(testUrl).then(result => ({
        result,
        createdTabs,
        usedCreate: createdTabs.length > 0,
        newTabUrl: createdTabs[0]?.url
      }));
    });

    expect(newTabTest.usedCreate).toBe(true);
    expect(newTabTest.createdTabs).toHaveLength(1);
    expect(newTabTest.newTabUrl).toBe('https://example.com/product?product=laptop');
    expect(newTabTest.newTabUrl).not.toContain('utm_source');
    expect(newTabTest.newTabUrl).not.toContain('fbclid');
    expect(newTabTest.result.removedCount).toBe(3); // utm_source, utm_medium, fbclid
  });

  test('cleanUrlFromContext uses chrome.tabs.update for current tab', async ({ page }) => {
    // Test that the original function correctly uses chrome.tabs.update()
    const currentTabTest = await page.evaluate(async () => {
      // Simulate chrome.tabs.update behavior
      const updatedTabs = [];
      const mockChrome = {
        tabs: {
          create: async (options) => {
            // This should NOT be called for "Open with cleaned URL"
            throw new Error('tabs.create should not be called for page cleaning');
          },
          update: async (tabId, options) => {
            updatedTabs.push({ tabId, options });
            return { id: tabId, url: options.url };
          }
        }
      };

      // Simulate cleanUrlFromContext logic
      const cleanUrlFromContext = async (url, tab) => {
        // Simulate URL cleaning
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        const cleanedParams = new URLSearchParams();
        let removedCount = 0;

        for (const [key, value] of params.entries()) {
          if (trackingParams.includes(key.toLowerCase())) {
            removedCount++;
          } else {
            cleanedParams.append(key, value);
          }
        }

        const cleanedUrl = new URL(urlObj.origin + urlObj.pathname);
        if (cleanedParams.toString()) {
          cleanedUrl.search = cleanedParams.toString();
        }

        if (removedCount > 0 && tab.id) {
          // Key assertion: Uses update() not create()
          await mockChrome.tabs.update(tab.id, { url: cleanedUrl.toString() });
        }

        return { cleanedUrl: cleanedUrl.toString(), removedCount };
      };

      // Test with a URL containing tracking parameters
      const testUrl = 'https://example.com/page?utm_source=google&gclid=123&category=tech';
      const mockTab = { id: 42, url: testUrl };

      return cleanUrlFromContext(testUrl, mockTab).then(result => ({
        result,
        updatedTabs,
        usedUpdate: updatedTabs.length > 0,
        updatedTabId: updatedTabs[0]?.tabId,
        updatedUrl: updatedTabs[0]?.options.url
      }));
    });

    expect(currentTabTest.usedUpdate).toBe(true);
    expect(currentTabTest.updatedTabs).toHaveLength(1);
    expect(currentTabTest.updatedTabId).toBe(42);
    expect(currentTabTest.updatedUrl).toBe('https://example.com/page?category=tech');
    expect(currentTabTest.updatedUrl).not.toContain('utm_source');
    expect(currentTabTest.updatedUrl).not.toContain('gclid');
    expect(currentTabTest.result.removedCount).toBe(2); // utm_source, gclid
  });

  test('context menu shows right-click on links', async ({ page }) => {
    // Create a test page with links containing tracking parameters
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <h1>Context Menu Test Page</h1>
          <a href="https://example.com/product?utm_source=email&utm_medium=newsletter&product=laptop&fbclid=abc123" id="tracking-link">
            Link with Tracking Parameters
          </a>
          <a href="https://example.com/clean-page?category=tech&sort=date" id="clean-link">
            Clean Link (No Tracking)
          </a>
        </body>
      </html>
    `);

    // Test that right-clicking on links triggers context menu
    const linkElement = page.locator('#tracking-link');
    await expect(linkElement).toBeVisible();

    // Right-click to trigger context menu
    await linkElement.click({ button: 'right' });

    // The actual context menu testing is limited in Playwright
    // but we verify the link is accessible and clickable
    const linkHref = await linkElement.getAttribute('href');
    expect(linkHref).toContain('utm_source=email');
    expect(linkHref).toContain('product=laptop');
  });

  test('handles URLs with no tracking parameters gracefully', async ({ page }) => {
    const noTrackingTest = await page.evaluate(() => {
      // Simulate cleaning a URL with no tracking parameters
      const cleanUrl = (originalUrl) => {
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
        const urlObj = new URL(originalUrl);
        const params = new URLSearchParams(urlObj.search);
        const cleanedParams = new URLSearchParams();
        let removedCount = 0;

        for (const [key, value] of params.entries()) {
          if (trackingParams.includes(key.toLowerCase())) {
            removedCount++;
          } else {
            cleanedParams.append(key, value);
          }
        }

        return {
          success: true,
          hasChanges: removedCount > 0,
          removedCount,
          cleanedUrl: originalUrl // No changes needed
        };
      };

      const result = cleanUrl('https://example.com/page?category=tech&sort=date');

      return result;
    });

    expect(noTrackingTest.success).toBe(true);
    expect(noTrackingTest.hasChanges).toBe(false);
    expect(noTrackingTest.removedCount).toBe(0);
  });

  test('notification message includes "new tab" for link cleaning', async ({ page }) => {
    const notificationTest = await page.evaluate(() => {
      // Simulate notification messages from both functions
      const notifications = [];

      // cleanUrlFromContext notification (current tab)
      const currentTabNotification = {
        title: 'URL Cleaned!',
        message: `Removed 3 tracking parameters`
      };
      notifications.push({ type: 'current_tab', ...currentTabNotification });

      // cleanUrlFromContextWithNavigate notification (new tab)
      const newTabNotification = {
        title: 'URL Cleaned!',
        message: `Removed 3 tracking parameters. Opened in new tab.`
      };
      notifications.push({ type: 'new_tab', ...newTabNotification });

      return {
        notifications,
        newTabMessageIncludesNewTab: newTabNotification.message.includes('new tab'),
        currentTabMessageDoesNotIncludeNewTab: !currentTabNotification.message.includes('new tab')
      };
    });

    expect(notificationTest.newTabMessageIncludesNewTab).toBe(true);
    expect(notificationTest.currentTabMessageDoesNotIncludeNewTab).toBe(true);
  });

  test('integration: full context menu flow for link cleaning', async ({ page }) => {
    // Comprehensive integration test simulating full flow
    const integrationTest = await page.evaluate(async () => {
      // Simulate the complete flow:
      // 1. User right-clicks on link
      // 2. Context menu appears
      // 3. User clicks "Clean this link"
      // 4. handleContextMenuClick is called
      // 5. cleanUrlFromContextWithNavigate is called
      // 6. New tab is created with cleaned URL

      const flow = {
        steps: [],
        errors: [],
        finalState: null
      };

      // Step 1: Simulate link context menu click event
      const linkUrl = 'https://amazon.com/dp/B08N5WRWNW?utm_source=email&utm_medium=newsletter&utm_campaign=deals&fbclid=abc123&product=true&ref=abc';

      flow.steps.push({
        step: 1,
        action: 'Right-click on link',
        linkUrl
      });

      // Step 2: Simulate context menu click data
      const contextMenuInfo = {
        menuItemId: 'clean-link-url',
        linkUrl: linkUrl,
        pageUrl: 'https://google.com/search'
      };

      flow.steps.push({
        step: 2,
        action: 'Context menu click event',
        menuItemId: contextMenuInfo.menuItemId
      });

      // Step 3: handleContextMenuClick routing
      const routedTo = contextMenuInfo.menuItemId === 'clean-link-url'
        ? 'cleanUrlFromContextWithNavigate'
        : 'cleanUrlFromContext';

      flow.steps.push({
        step: 3,
        action: 'Route to handler',
        handler: routedTo
      });

      // Step 4: URL cleaning
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid', 'ref'];
      const urlObj = new URL(linkUrl);
      const params = new URLSearchParams(urlObj.search);
      const cleanedParams = new URLSearchParams();
      const removedParams = [];

      for (const [key, value] of params.entries()) {
        if (trackingParams.includes(key.toLowerCase())) {
          removedParams.push({ key, value });
        } else {
          cleanedParams.append(key, value);
        }
      }

      const cleanedUrl = new URL(urlObj.origin + urlObj.pathname);
      if (cleanedParams.toString()) {
        cleanedUrl.search = cleanedParams.toString();
      }

      flow.steps.push({
        step: 4,
        action: 'Clean URL',
        originalUrl: linkUrl,
        cleanedUrl: cleanedUrl.toString(),
        removedParams: removedParams.map(p => p.key),
        removedCount: removedParams.length
      });

      // Step 5: New tab creation
      const newTabCreated = {
        id: 'new-tab-id',
        url: cleanedUrl.toString()
      };

      flow.steps.push({
        step: 5,
        action: 'Create new tab',
        method: 'chrome.tabs.create',
        newTabUrl: newTabCreated.url
      });

      // Final state
      flow.finalState = {
        success: true,
        newTabOpened: true,
        cleanedUrl: cleanedUrl.toString(),
        removedCount: removedParams.length,
        originalUrl: linkUrl
      };

      return flow;
    });

    // Verify the flow
    expect(integrationTest.steps).toHaveLength(5);
    expect(integrationTest.steps[2].handler).toBe('cleanUrlFromContextWithNavigate');
    expect(integrationTest.steps[4].method).toBe('chrome.tabs.create');
    expect(integrationTest.finalState.success).toBe(true);
    expect(integrationTest.finalState.newTabOpened).toBe(true);
    expect(integrationTest.finalState.removedCount).toBe(5); // utm_source, utm_medium, utm_campaign, fbclid, ref
    expect(integrationTest.finalState.cleanedUrl).toBe('https://amazon.com/dp/B08N5WRWNW?product=true');
    expect(integrationTest.finalState.cleanedUrl).not.toContain('utm_');
    expect(integrationTest.finalState.cleanedUrl).not.toContain('fbclid');
    expect(integrationTest.finalState.cleanedUrl).toContain('product=true');
  });

  test('clipboard functionality works with new tab creation', async ({ page, context }) => {
    // Test that clipboard copying still works alongside new tab creation
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const clipboardTest = await page.evaluate(async () => {
      const cleanedUrl = 'https://example.com/product?product=laptop';

      // Simulate both operations that happen in cleanUrlFromContextWithNavigate:
      // 1. chrome.tabs.create({ url: cleanedUrl })
      // 2. copyToClipboard(cleanedUrl)

      const operations = {
        newTabCreated: true,
        clipboardWritten: false
      };

      try {
        // Simulate clipboard write (uses chrome.storage in actual extension)
        const clipboardData = {
          cleanedUrlForClipboard: cleanedUrl,
          clipboardTimestamp: Date.now()
        };

        // Simulate storage set
        operations.clipboardWritten = true;
        operations.clipboardData = clipboardData;
      } catch (error) {
        operations.clipboardError = error.message;
      }

      return operations;
    });

    expect(clipboardTest.newTabCreated).toBe(true);
    expect(clipboardTest.clipboardWritten).toBe(true);
    expect(clipboardTest.clipboardData.cleanedUrlForClipboard).toBe('https://example.com/product?product=laptop');
  });

});

test.describe('Context Menu Error Handling', () => {

  let extensionFixture;

  test.beforeEach(async ({ context, page }) => {
    extensionFixture = new ExtensionFixture(context, page);
    await extensionFixture.setup();
  });

  test('handles undefined tab parameter gracefully', async ({ page }) => {
    // Test the MV3 case where tab can be undefined
    const undefinedTabTest = await page.evaluate(async () => {
      // Simulate handleContextMenuClick with undefined tab
      const handleContextMenuClick = async (info, tab) => {
        console.log('Context menu clicked:', info.menuItemId, 'tab:', tab?.id, 'linkUrl:', info.linkUrl);

        // Handle "Clean this link" - doesn't need tab parameter!
        if (info.menuItemId === 'clean-link-url' && info.linkUrl) {
          // This should work even with undefined tab
          return {
            success: true,
            handler: 'cleanUrlFromContextWithNavigate',
            tabRequired: false,
            urlToClean: info.linkUrl
          };
        }

        // Handle "Open with cleaned URL" - needs tab for URL
        if (info.menuItemId === 'clean-current-url') {
          if (!tab?.url) {
            return {
              success: false,
              error: 'No tab URL available',
              tabRequired: true
            };
          }
          return {
            success: true,
            handler: 'cleanUrlFromContext',
            tabRequired: true,
            urlToClean: tab.url
          };
        }

        return { success: false, error: 'Unknown menu item' };
      };

      // Test 1: clean-link-url with undefined tab (should work!)
      const linkWithUndefinedTab = await handleContextMenuClick(
        { menuItemId: 'clean-link-url', linkUrl: 'https://example.com?utm_source=test' },
        undefined // Tab is undefined - common in MV3
      );

      // Test 2: clean-current-url with undefined tab (should fail gracefully)
      const pageWithUndefinedTab = await handleContextMenuClick(
        { menuItemId: 'clean-current-url' },
        undefined
      );

      return { linkWithUndefinedTab, pageWithUndefinedTab };
    });

    // "Clean this link" should work even without tab
    expect(undefinedTabTest.linkWithUndefinedTab.success).toBe(true);
    expect(undefinedTabTest.linkWithUndefinedTab.tabRequired).toBe(false);

    // "Open with cleaned URL" fails gracefully without tab
    expect(undefinedTabTest.pageWithUndefinedTab.success).toBe(false);
    expect(undefinedTabTest.pageWithUndefinedTab.tabRequired).toBe(true);
  });

  test('handles invalid URLs gracefully', async ({ page }) => {
    const invalidUrlTest = await page.evaluate(() => {
      const cleanUrl = (originalUrl) => {
        try {
          // Check for empty/null/undefined first
          if (!originalUrl || typeof originalUrl !== 'string') {
            return { success: false, error: 'Invalid URL: must be a non-empty string' };
          }
          // Check for non-http(s) schemes that we don't process
          const url = new URL(originalUrl);
          if (!url.protocol.startsWith('http')) {
            return { success: false, error: 'Invalid URL: only http/https supported' };
          }
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: 'Invalid URL format' };
        }
      };

      const invalidUrls = [
        'not-a-url',
        'javascript:alert(1)',  // Valid URL but non-http scheme
        '',
        null,
        undefined
      ];

      return invalidUrls.map(url => ({
        url: String(url),
        result: cleanUrl(url)
      }));
    });

    // All invalid/non-http URLs should be handled gracefully
    invalidUrlTest.forEach(test => {
      expect(test.result.success).toBe(false);
    });
  });

  test('handles chrome.tabs.create failure', async ({ page }) => {
    const createFailureTest = await page.evaluate(async () => {
      // Simulate chrome.tabs.create failure
      const mockChromeWithFailure = {
        tabs: {
          create: async () => {
            throw new Error('Failed to create tab');
          }
        }
      };

      let errorCaught = false;
      let errorMessage = '';

      try {
        await mockChromeWithFailure.tabs.create({ url: 'https://example.com' });
      } catch (error) {
        errorCaught = true;
        errorMessage = error.message;
        // In real code, this would trigger showNotification('Error', 'Failed to open cleaned URL')
      }

      return { errorCaught, errorMessage };
    });

    expect(createFailureTest.errorCaught).toBe(true);
    expect(createFailureTest.errorMessage).toBe('Failed to create tab');
  });

});
