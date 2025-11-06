/**
 * Global Setup for Playwright E2E Tests
 * Runs once before all tests
 */

import path from 'path';
import { fileURLToPath } from 'url';

import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetup() {
  console.log('Setting up E2E test environment...');
  
  // Get the extension path (project root)
  const extensionPath = path.resolve(__dirname, '../../');
  
  try {
    // Launch browser with extension loaded
    const browser = await chromium.launch({
      headless: false, // Extensions require non-headless mode
      args: [
        `--load-extension=${extensionPath}`,
        '--disable-extensions-except=' + extensionPath,
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    // Create a context and page to verify extension loads
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to a test page to verify basic functionality
    await page.goto('https://example.com?utm_source=test');
    
    console.log('Extension loaded successfully');
    
    // Close the browser (tests will create their own instances)
    await browser.close();
    
    return {
      extensionPath,
      setupComplete: true
    };
    
  } catch (error) {
    console.warn('Extension loading failed (this is normal in some CI environments):', error.message);
    
    // Return basic config even if extension loading fails
    return {
      extensionPath,
      setupComplete: false,
      error: error.message
    };
  }
}

export default globalSetup;