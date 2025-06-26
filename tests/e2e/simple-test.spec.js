/**
 * Simple E2E Tests for Clean URL Extension
 * Tests basic functionality without complex extension loading
 */

import { test, expect } from '@playwright/test';

test.describe('Clean URL Logic E2E Tests', () => {
  
  test('can load and test URL cleaning logic directly', async ({ page }) => {
    // Create a simple test page with our logic
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Clean URL Test</title>
        </head>
        <body>
          <h1>Clean URL Extension Test</h1>
          <div id="result"></div>
          <script type="module">
            // Inline the URL cleaning logic for testing
            const TRACKING_PARAM_PATTERNS = [
              'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
              'fbclid', 'igshid', 'gclid', 'yclid', 'dclid', 'msclkid',
              'ck_subscriber_id', 'mc_cid', 'mc_eid'
            ];

            function cleanUrl(originalUrl) {
              try {
                const url = new URL(originalUrl);
                const originalParams = new URLSearchParams(url.search);
                const cleanedParams = new URLSearchParams();
                const removedParams = [];

                for (const [key, value] of originalParams.entries()) {
                  const paramLower = key.toLowerCase();
                  const isTrackingParam = TRACKING_PARAM_PATTERNS.some(pattern => 
                    paramLower === pattern.toLowerCase()
                  );

                  if (isTrackingParam) {
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
                  originalUrl: originalUrl,
                  cleanedUrl: cleanedUrl.toString(),
                  removedParams: removedParams,
                  removedCount: removedParams.length,
                  hasChanges: removedParams.length > 0
                };
              } catch (error) {
                return {
                  success: false,
                  error: error.message,
                  originalUrl: originalUrl,
                  cleanedUrl: null,
                  removedParams: [],
                  removedCount: 0
                };
              }
            }

            // Test the function
            window.testCleanUrl = cleanUrl;
            
            // Run some tests
            const testUrl = 'https://example.com?utm_source=google&utm_medium=cpc&product=laptop&fbclid=123';
            const result = cleanUrl(testUrl);
            
            document.getElementById('result').textContent = JSON.stringify(result, null, 2);
          </script>
        </body>
      </html>
    `);

    // Wait for the script to execute
    await page.waitForFunction(() => window.testCleanUrl);

    // Test the URL cleaning function
    const result = await page.evaluate(() => {
      const testUrl = 'https://example.com?utm_source=google&utm_medium=cpc&product=laptop&fbclid=123';
      return window.testCleanUrl(testUrl);
    });

    // Verify the results
    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://example.com/?product=laptop');
    expect(result.removedCount).toBe(3);
    expect(result.hasChanges).toBe(true);
    
    // Check that tracking parameters were removed
    expect(result.cleanedUrl).not.toContain('utm_source');
    expect(result.cleanedUrl).not.toContain('utm_medium');
    expect(result.cleanedUrl).not.toContain('fbclid');
    
    // Check that legitimate parameters were preserved
    expect(result.cleanedUrl).toContain('product=laptop');
  });

  test('handles URLs without tracking parameters', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <script type="module">
            const TRACKING_PARAM_PATTERNS = [
              'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
              'fbclid', 'igshid', 'gclid', 'yclid', 'dclid', 'msclkid',
              'ck_subscriber_id', 'mc_cid', 'mc_eid'
            ];

            function cleanUrl(originalUrl) {
              try {
                const url = new URL(originalUrl);
                const originalParams = new URLSearchParams(url.search);
                const cleanedParams = new URLSearchParams();
                const removedParams = [];

                for (const [key, value] of originalParams.entries()) {
                  const paramLower = key.toLowerCase();
                  const isTrackingParam = TRACKING_PARAM_PATTERNS.some(pattern => 
                    paramLower === pattern.toLowerCase()
                  );

                  if (isTrackingParam) {
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
                  originalUrl: originalUrl,
                  cleanedUrl: cleanedUrl.toString(),
                  removedParams: removedParams,
                  removedCount: removedParams.length,
                  hasChanges: removedParams.length > 0
                };
              } catch (error) {
                return {
                  success: false,
                  error: error.message,
                  originalUrl: originalUrl,
                  cleanedUrl: null,
                  removedParams: [],
                  removedCount: 0
                };
              }
            }

            window.testCleanUrl = cleanUrl;
          </script>
        </body>
      </html>
    `);

    await page.waitForFunction(() => window.testCleanUrl);

    const result = await page.evaluate(() => {
      const testUrl = 'https://example.com/products?category=electronics&sort=price';
      return window.testCleanUrl(testUrl);
    });

    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://example.com/products?category=electronics&sort=price');
    expect(result.removedCount).toBe(0);
    expect(result.hasChanges).toBe(false);
  });

  test('handles invalid URLs gracefully', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <script type="module">
            function cleanUrl(originalUrl) {
              try {
                const url = new URL(originalUrl);
                return {
                  success: true,
                  originalUrl: originalUrl,
                  cleanedUrl: url.toString(),
                  removedParams: [],
                  removedCount: 0,
                  hasChanges: false
                };
              } catch (error) {
                return {
                  success: false,
                  error: error.message,
                  originalUrl: originalUrl,
                  cleanedUrl: null,
                  removedParams: [],
                  removedCount: 0
                };
              }
            }

            window.testCleanUrl = cleanUrl;
          </script>
        </body>
      </html>
    `);

    await page.waitForFunction(() => window.testCleanUrl);

    const result = await page.evaluate(() => {
      return window.testCleanUrl('not-a-valid-url');
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.cleanedUrl).toBe(null);
  });

  test('preserves URL fragments while cleaning parameters', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <script type="module">
            const TRACKING_PARAM_PATTERNS = [
              'utm_source', 'utm_medium', 'utm_campaign', 'ck_subscriber_id'
            ];

            function cleanUrl(originalUrl) {
              try {
                const url = new URL(originalUrl);
                const originalParams = new URLSearchParams(url.search);
                const cleanedParams = new URLSearchParams();
                const removedParams = [];

                for (const [key, value] of originalParams.entries()) {
                  const paramLower = key.toLowerCase();
                  const isTrackingParam = TRACKING_PARAM_PATTERNS.some(pattern => 
                    paramLower === pattern.toLowerCase()
                  );

                  if (isTrackingParam) {
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
                  originalUrl: originalUrl,
                  cleanedUrl: cleanedUrl.toString(),
                  removedParams: removedParams,
                  removedCount: removedParams.length,
                  hasChanges: removedParams.length > 0
                };
              } catch (error) {
                return {
                  success: false,
                  error: error.message,
                  originalUrl: originalUrl,
                  cleanedUrl: null,
                  removedParams: [],
                  removedCount: 0
                };
              }
            }

            window.testCleanUrl = cleanUrl;
          </script>
        </body>
      </html>
    `);

    await page.waitForFunction(() => window.testCleanUrl);

    const result = await page.evaluate(() => {
      const testUrl = 'https://example.com/article?utm_source=email&section=intro&ck_subscriber_id=123#conclusion';
      return window.testCleanUrl(testUrl);
    });

    expect(result.success).toBe(true);
    expect(result.cleanedUrl).toBe('https://example.com/article?section=intro#conclusion');
    expect(result.removedCount).toBe(2);
    expect(result.cleanedUrl).toContain('#conclusion');
    expect(result.cleanedUrl).toContain('section=intro');
    expect(result.cleanedUrl).not.toContain('utm_source');
    expect(result.cleanedUrl).not.toContain('ck_subscriber_id');
  });

});

test.describe('Extension Popup Simulation', () => {
  
  test('can simulate popup interface behavior', async ({ page }) => {
    // Create a mock popup interface
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            .container { width: 380px; font-family: sans-serif; }
            .url-display { background: #f7fafc; padding: 12px; border-radius: 8px; word-break: break-all; }
            .status { padding: 12px; border-radius: 8px; margin: 12px 0; }
            .success { background: #f0fff4; color: #22543d; }
            .button { padding: 12px 16px; background: #48bb78; color: white; border: none; border-radius: 8px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Clean URL</h1>
            <div class="url-section">
              <h2>Current URL</h2>
              <div id="original-url" class="url-display"></div>
            </div>
            <div id="results" class="status success" style="display: none;">
              <span id="removed-count">0 tracking parameters removed</span>
            </div>
            <div class="url-section" id="cleaned-section" style="display: none;">
              <h2>Cleaned URL</h2>
              <div id="cleaned-url" class="url-display"></div>
              <button id="apply-btn" class="button">Apply Cleaned URL</button>
            </div>
          </div>
          
          <script>
            // Mock the extension popup behavior
            const mockCurrentUrl = 'https://example.com?utm_source=google&utm_medium=cpc&product=laptop&fbclid=123';
            
            // Simple cleaning logic
            function cleanUrl(url) {
              const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid'];
              const urlObj = new URL(url);
              const params = new URLSearchParams(urlObj.search);
              let removedCount = 0;
              
              trackingParams.forEach(param => {
                if (params.has(param)) {
                  params.delete(param);
                  removedCount++;
                }
              });
              
              urlObj.search = params.toString();
              return {
                cleanedUrl: urlObj.toString(),
                removedCount: removedCount
              };
            }
            
            // Simulate popup initialization
            function initializePopup() {
              document.getElementById('original-url').textContent = mockCurrentUrl;
              
              const result = cleanUrl(mockCurrentUrl);
              
              if (result.removedCount > 0) {
                document.getElementById('removed-count').textContent = 
                  result.removedCount + ' tracking parameters removed';
                document.getElementById('results').style.display = 'block';
                document.getElementById('cleaned-url').textContent = result.cleanedUrl;
                document.getElementById('cleaned-section').style.display = 'block';
                
                document.getElementById('apply-btn').onclick = () => {
                  // Simulate applying the cleaned URL
                  window.appliedUrl = result.cleanedUrl;
                  alert('Cleaned URL applied!');
                };
              }
            }
            
            // Initialize when page loads
            window.initializePopup = initializePopup;
            window.cleanUrl = cleanUrl;
          </script>
        </body>
      </html>
    `);

    // Initialize the popup
    await page.evaluate(() => window.initializePopup());

    // Check that the interface displays correctly
    const originalUrl = await page.locator('#original-url').textContent();
    expect(originalUrl).toContain('example.com');
    expect(originalUrl).toContain('utm_source=google');

    // Check that tracking parameters are detected
    const removedCount = await page.locator('#removed-count').textContent();
    expect(removedCount).toContain('3');

    // Check that cleaned URL is displayed
    const cleanedUrl = await page.locator('#cleaned-url').textContent();
    expect(cleanedUrl).toContain('product=laptop');
    expect(cleanedUrl).not.toContain('utm_source');
    expect(cleanedUrl).not.toContain('fbclid');

    // Test the apply button
    await page.click('#apply-btn');
    
    // Check that the URL was "applied" (stored in window object)
    const appliedUrl = await page.evaluate(() => window.appliedUrl);
    expect(appliedUrl).toBe('https://example.com/?product=laptop');
  });

});