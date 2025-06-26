# Clean-URL Chrome Extension Project Plan (Manual Click-Based)

## Project Overview
Create a Chrome extension that removes tracking parameters from URLs when the user clicks the extension icon. No automatic cleaning - only manual activation.

## Core Features
1. **Manual URL Cleaning**: Click extension icon to clean current tab's URL
2. **Tracking Parameter Detection**: Remove UTM, ck_subscriber_id, and other common trackers
3. **Visual Feedback**: Show badge/notification when parameters are removed
4. **Simple Popup**: Display cleaned URL and number of parameters removed

## Tracking Parameters to Remove

### UTM Parameters:
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- `utm_nooverride`

### Social Media & Platform Trackers:
- `fbclid` (Facebook Click ID)
- `igshid` (Instagram Share ID)
- `ttclid` (TikTok Click ID)
- `tiktok_r` (TikTok Referral)
- `li_fat_id` (LinkedIn Fat ID)
- `mkt_tok` (LinkedIn/Marketo token)
- `trk` (General tracking)

### Ad Platform Trackers:
- `gclid` (Google Click ID)
- `yclid` (Yandex Click ID)
- `dclid` (DoubleClick Click ID)
- `msclkid` (Microsoft Click ID)

### Affiliate & Referral Trackers:
- `ref`, `referral`
- `affiliate_id`, `afid`
- `click_id`, `clickid`
- `subid`, `sub_id`
- `partner_id`
- `sr_share` (ShareThis)

### Email & Newsletter Trackers:
- `ck_subscriber_id` (ConvertKit)
- `mc_cid`, `mc_eid` (MailChimp)

### Analytics & Other:
- `sthash` (ShareThis hash)
- `source`, `campaign` (standalone)
- `adgroup`, `adposition`
- URL fragments after `#` containing tracking data

## Project Structure
```
clean-url/
├── manifest.json          # Extension metadata (Manifest V3, permissions: tabs)
├── popup.html             # Simple popup interface
├── popup.js               # Popup logic for cleaning URLs
├── popup.css              # Popup styling
├── background.js          # Service worker (optional for badge updates)
├── clean-url-logic.js     # Core URL cleaning functions
├── icons/                 # Extension icons (16px, 32px, 48px, 128px)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── tests/                 # Test suites
│   ├── unit/              # Unit tests for URL cleaning logic
│   │   └── clean-url-logic.test.js
│   ├── e2e/               # Playwright E2E tests
│   │   ├── fixtures.js    # Test fixtures for extension setup
│   │   └── clean-url.spec.js
│   └── test-urls.json     # Test URL fixtures
├── package.json           # NPM dependencies (@playwright/test, jest)
├── jest.config.js         # Jest configuration for unit tests
├── privacy-policy.md      # Privacy policy for Chrome Web Store
└── README.md              # Project documentation
```

## Implementation Steps

### Phase 1: Core Extension Setup
1. **Manifest V3 Setup**
   - Create manifest.json with `tabs` permission
   - Configure service worker (background.js)
   - Set up popup action with HTML/CSS/JS
   - Add icon declarations for all required sizes

2. **URL Cleaning Logic Module**
   - Implement comprehensive tracking parameter patterns
   - Add URL validation and error handling
   - Support for query parameters and fragments
   - Preserve essential parameters (avoid breaking functionality)
   - Return cleaning results with count of removed parameters

### Phase 2: User Interface & Experience
3. **Popup Interface**
   - Display current URL and cleaned version
   - Show count of parameters removed
   - Add copy-to-clipboard functionality
   - Handle edge cases (no parameters, invalid URLs)
   - Provide clear success/error feedback

4. **Extension Integration**
   - Icon click triggers URL cleaning
   - Use `chrome.tabs.update()` for navigation
   - Handle permission errors gracefully
   - Optional: Badge with parameter count

### Phase 3: Testing & Quality Assurance
5. **Unit Testing**
   - Test URL cleaning logic with Jest
   - Comprehensive parameter removal tests
   - Edge case handling (malformed URLs, no parameters)
   - Performance testing with large URLs

6. **E2E Testing with Playwright**
   - Extension loading and initialization
   - User interaction flows (click → clean → verify)
   - Cross-browser compatibility testing
   - Test with real-world URL samples

### Phase 4: Publishing Preparation
7. **Chrome Web Store Assets**
   - Create extension icons (16px, 32px, 48px, 128px)
   - Record demo video showing functionality
   - Capture screenshots for store listing
   - Write privacy policy and store description

## Test Scenarios

### Basic Functionality Tests:
1. **UTM Parameter Removal**
   - `https://example.com?utm_source=google&utm_medium=cpc` → `https://example.com`

2. **Social Media Trackers**
   - `https://example.com?fbclid=IwAR...` → `https://example.com`
   - `https://example.com?igshid=abc123` → `https://example.com`

3. **Multiple Parameters**
   - `https://example.com?utm_source=google&fbclid=123&product=shoe` → `https://example.com?product=shoe`

### Real-World Test URLs:
4. **ConvertKit Newsletter**
   - `https://www.premieroctet.com/blog/en/tanstack-future-react-frameworks?ck_subscriber_id=...`

5. **GitHub with Tracking**
   - `https://github.com/modelcontextprotocol/use-mcp?ck_subscriber_id=...`

6. **Complex URLs with Fragments**
   - `https://plainvanillaweb.com/blog/articles/2025-06-12-view-transitions/?ck_subscriber_id=...#section`

### Edge Cases:
7. **No Parameters** - `https://example.com` → No change
8. **Only Essential Parameters** - `https://shop.com?product=123` → No change
9. **Malformed URLs** - Handle gracefully with error messages
10. **Very Long URLs** - Performance and memory considerations

## Technical Approach

### API Strategy:
**Primary Approach: chrome.tabs.update**
- Use `chrome.tabs.update()` to navigate tab to cleaned URL
- Requires `tabs` permission (not `activeTab`)
- Causes page reload but ensures complete URL cleaning
- Best for manual user-triggered cleaning

**Alternative Approach: Content Scripts + history.replaceState**
- Inject content script to update address bar without reload
- Uses `history.replaceState()` for seamless experience
- Requires `activeTab` permission
- Better for SPAs but doesn't reload page with clean URL

### Implementation Details:
- **Manifest V3** with service worker architecture
- **Minimal permissions**: `tabs` for primary approach
- **Regex-based** parameter removal with comprehensive pattern matching
- **Error handling** for invalid URLs and permission issues
- **CSP compliance** - no inline scripts, all code in separate files

### URL Cleaning Logic:
```javascript
// Comprehensive tracking parameter patterns
const TRACKING_PARAMS = [
  // UTM parameters
  /[?&]utm_(source|medium|campaign|term|content|nooverride)=[^&]*/g,
  
  // Social media trackers
  /[?&](fbclid|igshid|ttclid|tiktok_r|li_fat_id|mkt_tok|trk)=[^&]*/g,
  
  // Ad platform trackers
  /[?&](gclid|yclid|dclid|msclkid)=[^&]*/g,
  
  // Affiliate trackers
  /[?&](ref|referral|affiliate_id|afid|click_id|clickid|subid|sub_id|partner_id|sr_share)=[^&]*/g,
  
  // Email trackers
  /[?&](ck_subscriber_id|mc_cid|mc_eid)=[^&]*/g,
  
  // Analytics
  /[?&](sthash|source|campaign|adgroup|adposition)=[^&]*/g
];
```

## Security & Privacy Considerations

### Data Minimization:
- **Local Processing Only**: All URL cleaning happens locally in the browser
- **No Data Collection**: Extension does not collect, store, or transmit user data
- **No Analytics**: No usage tracking or telemetry
- **No Remote Requests**: Fully offline functionality

### Security Best Practices:
- **CSP Compliance**: No inline scripts, strict Content Security Policy
- **Minimal Permissions**: Only request `tabs` permission, no broad host access
- **Input Validation**: Sanitize and validate all URL inputs
- **Error Handling**: Graceful handling of malformed URLs and edge cases

### Privacy Policy Requirements:
- Clearly state no data collection
- Explain local-only processing
- Detail which tracking parameters are removed
- Provide contact information for privacy questions

### Chrome Web Store Compliance:
- Follow single-purpose policy (URL cleaning only)
- Transparent about functionality in description
- No misleading permissions requests
- Regular security updates and maintenance

## User Experience Considerations

### Success States:
- **Parameters Removed**: Show count and cleaned URL
- **No Parameters**: Inform user "URL is already clean"
- **Copy to Clipboard**: Easy sharing of cleaned URLs

### Error States:
- **Invalid URL**: Clear error message with suggested fix
- **Permission Denied**: Guide user to grant necessary permissions
- **Network Issues**: Inform about offline-only functionality

### Performance:
- **Fast Processing**: URL cleaning should complete within 100ms
- **Memory Efficient**: Minimize memory usage for large URLs
- **Responsive UI**: Immediate feedback on user actions
```

## Chrome Extension Icons & Demo Materials Guide

### Icon Requirements & Creation

#### Required Icon Sizes:
- **16x16px**: Toolbar/context menu
- **32x32px**: Windows compatibility 
- **48x48px**: Extensions management page
- **128x128px**: Chrome Web Store (required)

#### Icon Creation Tools:

**Free Options:**
- **Canva**: Easiest for beginners, templates available
- **Figma**: Vector-based, community assets
- **AI Tools**: Microsoft Designer, Canva AI Magic Media

**Paid Options:**
- **Looka**: AI logo generator ($96/year)
- **Adobe Illustrator**: Professional standard
- **Affinity Designer**: One-time purchase

**Quick Method for Non-Designers:**
1. Use AI generator (describe "blue URL cleaner icon")
2. Refine in Canva/Figma
3. Export all 4 sizes as PNG
4. Test at 16x16 for clarity

### Demo Video Requirements

#### Specifications:
- **Format**: MP4
- **Resolution**: 1280x720 (720p) or 1920x1080 (1080p)
- **Length**: 30 seconds to 2 minutes
- **Content**: Show actual extension functionality

#### Recording Tools:

**Best Overall**: **Loom** (free/paid)
- Chrome integration
- Instant sharing
- Built-in editing
- $12.50/month for premium

**Free Option**: **OBS Studio**
- High-quality recording
- Requires separate editing

**Chrome-Specific**: **Arcade** (Chrome extension)
- Records directly in browser
- $213/month for teams

### Screenshot Requirements

#### Specifications:
- **Minimum**: 1280x800px
- **Format**: PNG or JPG
- **Orientation**: Landscape
- **Content**: Actual extension UI only

#### Promotional Images:
- **Hero Image**: 440x280px minimum
- Show extension in action
- No misleading text overlays

### Quick Setup Checklist:

1. **Icons**: Create 16px, 32px, 48px, 128px versions
2. **Screenshots**: Capture 1280x800px extension UI
3. **Demo Video**: Record 30-60 second walkthrough
4. **Test**: Verify all assets show extension accurately

**Recommended Workflow**: Start with AI icon generation → Loom for demo video → Built-in screenshot tools for promotional images.