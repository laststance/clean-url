# Clean-URL Chrome Extension Project Plan (Manual Click-Based)

## Project Overview
Create a Chrome extension that removes tracking parameters from URLs when the user clicks the extension icon. No automatic cleaning - only manual activation.

## Core Features
1. **Manual URL Cleaning**: Click extension icon to clean current tab's URL
2. **Tracking Parameter Detection**: Remove UTM, ck_subscriber_id, and other common trackers
3. **Visual Feedback**: Show badge/notification when parameters are removed
4. **Simple Popup**: Display cleaned URL and number of parameters removed

## Tracking Parameters to Remove
Based on provided examples:
- `utm_source`, `utm_medium`, `utm_campaign`
- `ck_subscriber_id`
- URL fragments after `#` (like the long fragment in examples)
- Other common trackers: `fbclid`, `gclid`, `ref`, etc.

## Project Structure
```
clean-url/
├── manifest.json          # Extension metadata (permissions: activeTab, scripting)
├── popup.html             # Simple popup interface
├── popup.js               # Popup logic for cleaning URLs
├── popup.css              # Popup styling
├── background.js          # Service worker (optional for badge updates)
├── content.js             # Content script for URL manipulation
├── clean-url-logic.js     # Core URL cleaning functions
├── icons/                 # Extension icons (16px, 32px, 48px, 128px)
├── tests/                 # Playwright E2E tests
│   ├── fixtures.js        # Test fixtures for extension setup
│   └── clean-url.spec.js  # Main test file
├── package.json           # NPM dependencies (@playwright/test)
└── README.md              # Project documentation
```

## Implementation Steps
1. **Setup Extension Structure**
   - Create manifest.json with activeTab and scripting permissions
   - Setup popup HTML/CSS/JS for the UI
   - Create URL cleaning logic module

2. **Core URL Cleaning Logic**
   - Parse URLs and remove tracking parameters
   - Handle edge cases (preserve essential parameters)
   - Return cleaned URL and count of removed parameters

3. **Extension Integration**
   - Popup triggers cleaning on current tab
   - Update tab URL with cleaned version
   - Show visual feedback (badge or popup message)

4. **Playwright Testing Setup**
   - Install @playwright/test
   - Create test fixtures for loading extension
   - Setup persistent browser context with extension loaded

5. **E2E Test Implementation**
   - Test with provided fixture URLs
   - Verify tracking parameters are removed after icon click
   - Test edge cases and different URL formats

## Test Scenarios
Using provided test fixtures:
1. `https://www.premieroctet.com/blog/en/tanstack-future-react-frameworks?ck_subscriber_id=...` → Should remove all tracking params
2. `https://github.com/modelcontextprotocol/use-mcp?ck_subscriber_id=...` → Should clean GitHub URLs
3. `https://plainvanillaweb.com/blog/articles/2025-06-12-view-transitions/?ck_subscriber_id=...` → Should handle complex fragments

## Technical Approach
- Use Manifest V3 with minimal permissions (activeTab, scripting)
- Regex-based parameter removal for common trackers
- Chrome tabs API to update URL after cleaning
- Playwright persistent context for extension testing