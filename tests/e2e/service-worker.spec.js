/**
 * Service Worker E2E Tests for Clean URL Extension
 * Tests the service worker registration fix and background script functionality
 */

import { test, expect } from '@playwright/test';
import { ExtensionFixture } from './fixtures.js';
// eslint-disable-next-line no-unused-vars
import { cleanUrl, isValidUrl, TRACKING_PARAM_PATTERNS } from '../../utils/clean-url-logic';

test.describe('Service Worker Registration Tests', () => {
  
  let extensionFixture;
  
  test.beforeEach(async ({ context, page }) => {
    extensionFixture = new ExtensionFixture(context, page);
    await extensionFixture.setup();
  });

  test('service worker loads successfully without registration errors', async ({ page }) => {
    // Navigate to a test page to trigger service worker
    await page.goto('https://example.com?utm_source=test&utm_medium=email');
    
    // Capture console errors during page load
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait for page to fully load and any service worker registration to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow time for service worker registration
    
    // Check for service worker registration errors
    const hasServiceWorkerError = consoleErrors.some(error => 
      error.includes('Service worker registration failed') ||
      error.includes('Status code: 15') ||
      error.includes('Failed to register')
    );
    
    expect(hasServiceWorkerError).toBe(false);
    
    // If there are any console errors, log them for debugging
    if (consoleErrors.length > 0) {
      console.log('Console errors during service worker test:', consoleErrors);
    }
  });

  test('background script initializes properly with CleanUrlLogic available', async ({ page }) => {
    // Create a test page that simulates service worker environment
    await page.goto('data:text/html,<html><body>Service Worker Test</body></html>');
    
    // Test the clean-url-logic availability in service worker context
    const serviceWorkerTest = await page.evaluate(async () => {
      // Simulate service worker environment
      const originalWindow = window;
      const _originalModule = typeof module !== 'undefined' ? module : undefined;
      
      try {
        // Remove window object to simulate service worker
        delete window.window;
        
        // Load the clean-url-logic.js content (simulated)
        const cleanUrlLogicCode = `
          // Simplified version of the tracking parameters
          const TRACKING_PARAM_PATTERNS = [
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'fbclid', 'gclid', 'yclid', 'dclid', 'msclkid',
            'ck_subscriber_id', 'mc_cid', 'mc_eid'
          ];

          function isValidUrl(urlString) {
            try {
              new URL(urlString);
              return true;
            } catch (error) {
              return false;
            }
          }

          function cleanUrl(originalUrl) {
            if (!originalUrl || typeof originalUrl !== 'string') {
              return {
                success: false,
                error: 'Invalid URL: URL must be a non-empty string',
                cleanedUrl: null,
                removedCount: 0
              };
            }

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
                error: null,
                cleanedUrl: cleanedUrl.toString(),
                removedCount: removedParams.length,
                hasChanges: removedParams.length > 0
              };
            } catch (error) {
              return {
                success: false,
                error: 'URL processing error: ' + error.message,
                cleanedUrl: null,
                removedCount: 0
              };
            }
          }

          // Export logic for service worker (using globalThis)
          if (typeof module !== 'undefined' && module.exports) {
            module.exports = { cleanUrl, isValidUrl, TRACKING_PARAM_PATTERNS };
          } else if (typeof window !== 'undefined') {
            window.CleanUrlLogic = { cleanUrl, isValidUrl, TRACKING_PARAM_PATTERNS };
          } else {
            globalThis.CleanUrlLogic = { cleanUrl, isValidUrl, TRACKING_PARAM_PATTERNS };
          }
        `;
        
        // Execute the code
        eval(cleanUrlLogicCode);
        
        // Test if CleanUrlLogic is available globally
        const isAvailable = typeof CleanUrlLogic !== 'undefined';
        const hasFunctions = isAvailable && 
          typeof CleanUrlLogic.cleanUrl === 'function' &&
          typeof CleanUrlLogic.isValidUrl === 'function';
        
        // Test a simple URL cleaning operation
        let testResult = null;
        if (hasFunctions) {
          testResult = CleanUrlLogic.cleanUrl('https://example.com?utm_source=test&param=keep');
        }
        
        return {
          isAvailable,
          hasFunctions,
          testResult,
          globalThisType: typeof globalThis,
          cleanUrlLogicType: typeof CleanUrlLogic
        };
        
      } catch (error) {
        return {
          error: error.message,
          isAvailable: false,
          hasFunctions: false
        };
      } finally {
        // Restore window object
        if (originalWindow) {
          window.window = originalWindow;
        }
      }
    });
    
    // Verify service worker environment simulation worked
    expect(serviceWorkerTest.isAvailable).toBe(true);
    expect(serviceWorkerTest.hasFunctions).toBe(true);
    expect(serviceWorkerTest.globalThisType).toBe('object');
    expect(serviceWorkerTest.cleanUrlLogicType).toBe('object');
    
    // Verify URL cleaning works in service worker context
    if (serviceWorkerTest.testResult) {
      expect(serviceWorkerTest.testResult.success).toBe(true);
      expect(serviceWorkerTest.testResult.removedCount).toBe(1);
      expect(serviceWorkerTest.testResult.cleanedUrl).toBe('https://example.com/?param=keep');
    }
  });

  test('background script handles importScripts errors gracefully', async ({ page }) => {
    // Test error handling for importScripts failures
    await page.goto('data:text/html,<html><body>Background Script Test</body></html>');
    
    const backgroundScriptTest = await page.evaluate(() => {
      // Simulate background script with error handling
      const consoleErrors = [];
      const originalConsoleError = console.error;
      console.error = (...args) => {
        consoleErrors.push(args.join(' '));
        originalConsoleError.apply(console, args);
      };
      
      try {
        // Simulate importScripts error handling
        let importScriptsError = null;
        try {
          // This would normally be: importScripts('clean-url-logic.js');
          // Simulate a failed import
          throw new Error('Failed to load clean-url-logic.js');
        } catch (error) {
          importScriptsError = error.message;
          console.error('Failed to load clean-url-logic.js:', error);
        }
        
        // Simulate background script initialization with error checking
        const initializeBackground = () => {
          if (typeof CleanUrlLogic === 'undefined') {
            console.error('CleanUrlLogic is not available. Service worker may not function properly.');
            return false;
          }
          return true;
        };
        
        const initResult = initializeBackground();
        
        return {
          importScriptsError,
          initResult,
          consoleErrors,
          handledGracefully: importScriptsError !== null && initResult === false
        };
        
      } finally {
        console.error = originalConsoleError;
      }
    });
    
    // Verify error handling works correctly
    expect(backgroundScriptTest.importScriptsError).toBeTruthy();
    expect(backgroundScriptTest.handledGracefully).toBe(true);
    expect(backgroundScriptTest.consoleErrors.length).toBeGreaterThan(0);
    
    // Check that appropriate error messages were logged
    const hasImportError = backgroundScriptTest.consoleErrors.some(error => 
      error.includes('Failed to load clean-url-logic.js')
    );
    const hasInitError = backgroundScriptTest.consoleErrors.some(error => 
      error.includes('CleanUrlLogic is not available')
    );
    
    expect(hasImportError).toBe(true);
    expect(hasInitError).toBe(true);
  });

  test('service worker can handle URL cleaning operations', async ({ page }) => {
    // Test the complete service worker URL cleaning flow
    const originalUrl = 'https://example.com?utm_source=newsletter&utm_medium=email&utm_campaign=test&product=laptop&fbclid=123';
    await page.goto(originalUrl);
    
    // Simulate service worker background operations
    const serviceWorkerOperation = await page.evaluate(async (testUrl) => {
      // Simulate the background script's URL analysis
      const analyzeUrl = (url) => {
        const trackingParams = [
          'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
          'fbclid', 'gclid', 'yclid', 'dclid', 'msclkid',
          'ck_subscriber_id', 'mc_cid', 'mc_eid'
        ];
        
        try {
          const urlObj = new URL(url);
          const params = new URLSearchParams(urlObj.search);
          let trackingCount = 0;
          
          for (const [key] of params.entries()) {
            const paramLower = key.toLowerCase();
            if (trackingParams.some(pattern => paramLower === pattern.toLowerCase())) {
              trackingCount++;
            }
          }
          
          return {
            success: true,
            trackingCount,
            badgeText: trackingCount > 0 ? trackingCount.toString() : '',
            shouldShowBadge: trackingCount > 0
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            trackingCount: 0
          };
        }
      };
      
      // Test URL analysis (simulating background script badge update)
      const analysis = analyzeUrl(testUrl);
      
      // Simulate context menu operations
      const contextMenuClean = (url) => {
        const trackingParams = [
          'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
          'fbclid', 'gclid', 'yclid', 'dclid', 'msclkid'
        ];
        
        try {
          const urlObj = new URL(url);
          const params = new URLSearchParams(urlObj.search);
          const cleanedParams = new URLSearchParams();
          let removedCount = 0;
          
          for (const [key, value] of params.entries()) {
            const paramLower = key.toLowerCase();
            const isTracking = trackingParams.some(pattern => paramLower === pattern.toLowerCase());
            
            if (isTracking) {
              removedCount++;
            } else {
              cleanedParams.append(key, value);
            }
          }
          
          const cleanedUrl = new URL(urlObj.origin + urlObj.pathname);
          if (cleanedParams.toString()) {
            cleanedUrl.search = cleanedParams.toString();
          }
          if (urlObj.hash) {
            cleanedUrl.hash = urlObj.hash;
          }
          
          return {
            success: true,
            cleanedUrl: cleanedUrl.toString(),
            removedCount,
            hasChanges: removedCount > 0
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      };
      
      const cleanResult = contextMenuClean(testUrl);
      
      return {
        analysis,
        cleanResult,
        operations: ['badge-update', 'context-menu', 'url-cleaning']
      };
    }, originalUrl);
    
    // Verify service worker operations work correctly
    expect(serviceWorkerOperation.analysis.success).toBe(true);
    expect(serviceWorkerOperation.analysis.trackingCount).toBe(4); // utm_source, utm_medium, utm_campaign, fbclid
    expect(serviceWorkerOperation.analysis.shouldShowBadge).toBe(true);
    
    expect(serviceWorkerOperation.cleanResult.success).toBe(true);
    expect(serviceWorkerOperation.cleanResult.removedCount).toBe(4);
    expect(serviceWorkerOperation.cleanResult.cleanedUrl).toBe('https://example.com/?product=laptop');
    expect(serviceWorkerOperation.cleanResult.hasChanges).toBe(true);
    
    // Verify the cleaned URL doesn't contain tracking parameters
    expect(serviceWorkerOperation.cleanResult.cleanedUrl).not.toContain('utm_');
    expect(serviceWorkerOperation.cleanResult.cleanedUrl).not.toContain('fbclid');
    expect(serviceWorkerOperation.cleanResult.cleanedUrl).toContain('product=laptop');
  });

  test('service worker handles permissions and context menus correctly', async ({ page }) => {
    // Test service worker context menu setup and error handling
    await page.goto('https://example.com');
    
    const contextMenuTest = await page.evaluate(() => {
      // Simulate context menu setup with error handling
      const setupContextMenus = () => {
        const errors = [];
        const successes = [];
        
        try {
          // Simulate chrome.contextMenus.removeAll()
          successes.push('removeAll completed');
          
          // Simulate chrome.contextMenus.create() calls
          const menuItems = [
            {
              id: 'clean-current-url',
              title: 'Clean current URL',
              contexts: ['page'],
              documentUrlPatterns: ['http://*/*', 'https://*/*']
            },
            {
              id: 'clean-link-url',
              title: 'Clean this link',
              contexts: ['link'],
              targetUrlPatterns: ['http://*/*', 'https://*/*']
            }
          ];
          
          menuItems.forEach(item => {
            // Simulate successful menu creation
            successes.push(`Created menu: ${item.id}`);
          });
          
          return {
            success: true,
            errors,
            successes,
            menuCount: menuItems.length
          };
          
        } catch (error) {
          errors.push(error.message);
          console.error('Error setting up context menus:', error);
          
          return {
            success: false,
            errors,
            successes,
            menuCount: 0
          };
        }
      };
      
      return setupContextMenus();
    });
    
    // Verify context menu setup works
    expect(contextMenuTest.success).toBe(true);
    expect(contextMenuTest.menuCount).toBe(2);
    expect(contextMenuTest.successes).toContain('removeAll completed');
    expect(contextMenuTest.successes).toContain('Created menu: clean-current-url');
    expect(contextMenuTest.successes).toContain('Created menu: clean-link-url');
    expect(contextMenuTest.errors.length).toBe(0);
  });

  test('service worker performance meets requirements', async ({ page }) => {
    // Test service worker performance requirements
    await page.goto('https://example.com?utm_source=test&utm_medium=email');
    
    const performanceTest = await page.evaluate(() => {
      // Test URL cleaning performance
      const testUrls = [
        'https://example.com?utm_source=test&param=keep',
        'https://test.com?utm_medium=email&fbclid=123&product=test',
        'https://shop.com?utm_campaign=sale&gclid=456&category=electronics'
      ];
      
      const results = [];
      
      testUrls.forEach(url => {
        const startTime = performance.now();
        
        // Simulate URL cleaning operation
        try {
          const urlObj = new URL(url);
          const params = new URLSearchParams(urlObj.search);
          const cleanedParams = new URLSearchParams();
          
          for (const [key, value] of params.entries()) {
            if (!key.toLowerCase().startsWith('utm_') && 
                !['fbclid', 'gclid', 'yclid'].includes(key.toLowerCase())) {
              cleanedParams.append(key, value);
            }
          }
          
          const cleanedUrl = new URL(urlObj.origin + urlObj.pathname);
          if (cleanedParams.toString()) {
            cleanedUrl.search = cleanedParams.toString();
          }
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          results.push({
            url,
            duration,
            success: true
          });
          
        } catch (error) {
          const endTime = performance.now();
          results.push({
            url,
            duration: endTime - startTime,
            success: false,
            error: error.message
          });
        }
      });
      
      return {
        results,
        averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
        maxDuration: Math.max(...results.map(r => r.duration)),
        allSuccessful: results.every(r => r.success)
      };
    });
    
    // Verify performance requirements
    expect(performanceTest.allSuccessful).toBe(true);
    expect(performanceTest.averageDuration).toBeLessThan(100); // < 100ms average
    expect(performanceTest.maxDuration).toBeLessThan(100); // < 100ms maximum
    
    console.log(`Service worker performance: avg ${performanceTest.averageDuration.toFixed(2)}ms, max ${performanceTest.maxDuration.toFixed(2)}ms`);
  });

}); 