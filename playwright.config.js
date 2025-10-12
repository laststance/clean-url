/**
 * Playwright Configuration for Clean URL Extension E2E Tests
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Timeout for each test
  timeout: 30000,
  
  // Global test timeout
  globalTimeout: 10 * 60 * 1000, // 10 minutes
  
  // Expect timeout
  expect: {
    timeout: 5000
  },
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Reporter to use
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: 'chrome-extension://test',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Browser context options
    contextOptions: {
      // Ignore HTTPS errors for local testing
      ignoreHTTPSErrors: true
    }
  },

  // Configure projects for major browsers with extension support
  projects: [
    {
      name: 'chromium-extension',
      use: { 
        ...devices['Desktop Chrome'],
        // Chrome extension specific configuration
        launchOptions: {
          args: [
            `--load-extension=${process.env.EXTENSION_PATH || '.'}`, // Load extension from environment variable or current directory
            `--disable-extensions-except=${process.env.EXTENSION_PATH || '.'}`,
            '--disable-web-security',
            '--allow-running-insecure-content'
          ]
        }
      },
    }
  ],

  // Output directory for test artifacts
  outputDir: 'test-results/',
  
  // Global setup and teardown
  globalSetup: './tests/e2e/global-setup.js',
  globalTeardown: './tests/e2e/global-teardown.js'
});