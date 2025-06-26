/**
 * Global Teardown for Playwright E2E Tests
 * Runs once after all tests complete
 */

async function globalTeardown() {
  console.log('Cleaning up E2E test environment...');
  
  try {
    // Clean up any temporary files or resources
    
    // Close any remaining browser instances
    // (Playwright usually handles this automatically)
    
    // Clean up test artifacts if needed
    
    console.log('E2E test cleanup completed');
    
  } catch (error) {
    console.warn('Cleanup warning:', error.message);
  }
}

export default globalTeardown;