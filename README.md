# Clean URL - Chrome Extension

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Coming%20Soon-blue)](https://chrome.google.com/webstore)

A privacy-focused Chrome extension that removes tracking parameters from URLs with a single click. Protect your privacy by cleaning UTM, social media, and affiliate tracking parameters.

## 🚀 Features

- **Manual URL Cleaning**: Click the extension icon to clean the current tab's URL
- **Comprehensive Tracking Removal**: Removes 20+ types of tracking parameters
- **Visual Feedback**: Shows badge with tracking parameter count
- **Copy to Clipboard**: Easily copy cleaned URLs
- **Privacy First**: All processing happens locally - no data collection
- **Real-time Analysis**: Instantly see what tracking parameters are found

## 📋 Supported Tracking Parameters

### UTM Parameters
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `utm_nooverride`

### Social Media Trackers
- `fbclid` (Facebook Click ID)
- `igshid` (Instagram Share ID)
- `ttclid` (TikTok Click ID)
- `tiktok_r` (TikTok Referral)
- `li_fat_id` (LinkedIn Fat ID)
- `mkt_tok` (LinkedIn/Marketo token)

### Ad Platform Trackers
- `gclid` (Google Click ID)
- `yclid` (Yandex Click ID)
- `dclid` (DoubleClick Click ID)
- `msclkid` (Microsoft Click ID)

### Email & Newsletter Trackers
- `ck_subscriber_id` (ConvertKit)
- `mc_cid`, `mc_eid` (MailChimp)

### Affiliate & Referral Trackers
- `ref`, `referral`, `affiliate_id`, `click_id`, `subid`, `partner_id`

[View complete list](./clean-url-logic.js#L8-L52)

## 🔧 Installation

### For Users
1. Download from the Chrome Web Store (coming soon)
2. Click "Add to Chrome"
3. Start cleaning URLs by clicking the extension icon!

### For Developers
1. Clone this repository:
   ```bash
   git clone https://github.com/ryota-murakami/clean-url.git
   cd clean-url
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project directory

4. The extension icon should appear in your toolbar!

## 📱 Usage

### Basic Usage
1. Navigate to any URL with tracking parameters
2. Click the Clean URL extension icon
3. Review the tracking parameters found
4. Click "Apply Cleaned URL" to navigate to the clean version

### Copy Cleaned URLs
1. Use the copy button next to the cleaned URL
2. Share clean URLs without exposing tracking data

### Context Menu
1. Right-click on any link
2. Select "Clean this link" to copy a cleaned version

## 🛡️ Privacy & Security

### Data Minimization
- **Local Processing Only**: All URL cleaning happens in your browser
- **No Data Collection**: We don't collect, store, or transmit any user data
- **No Analytics**: No usage tracking or telemetry
- **No Remote Requests**: Fully offline functionality

### Security Best Practices
- Content Security Policy compliance
- Minimal permissions (only `tabs` access)
- Input validation and sanitization
- Open source and auditable

## 🧪 Testing

### Run Unit Tests
```bash
npm test
```

### Run Unit Tests with Coverage
```bash
npm run test:coverage
```

### Run E2E Tests
```bash
npm run install:playwright
npm run test:e2e
```

### Run All Tests
```bash
npm run validate
```

## 🏗️ Development

### Project Structure
```
clean-url/
├── manifest.json          # Extension metadata
├── popup.html             # Popup interface
├── popup.js               # Popup logic
├── popup.css              # Popup styling
├── background.js          # Service worker
├── clean-url-logic.js     # Core cleaning logic
├── icons/                 # Extension icons
├── tests/                 # Test suites
│   ├── unit/              # Jest unit tests
│   ├── e2e/               # Playwright E2E tests
│   └── test-urls.json     # Test fixtures
└── docs/                  # Documentation
```

### Key Components

#### Core Logic (`clean-url-logic.js`)
The heart of the extension. Contains the URL cleaning algorithms and tracking parameter patterns.

#### Popup Interface (`popup.html`, `popup.css`, `popup.js`)
User interface for the extension popup, including URL display, cleaning controls, and feedback.

#### Background Service Worker (`background.js`)
Handles badge updates, context menus, and extension lifecycle events.

### Adding New Tracking Parameters
1. Add the parameter to `TRACKING_PARAM_PATTERNS` in `clean-url-logic.js`
2. Add test cases to `tests/test-urls.json`
3. Update this README documentation
4. Run tests to ensure compatibility

### Build & Validation
```bash
# Lint code
npm run lint

# Run unit tests
npm run test:unit

# Validate everything
npm run validate
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `npm run validate`
6. Commit your changes: `git commit -am 'Add feature'`
7. Push to the branch: `git push origin feature-name`
8. Create a Pull Request

### Reporting Issues
- Use the [GitHub Issues](https://github.com/ryota-murakami/clean-url/issues) page
- Provide detailed reproduction steps
- Include browser version and extension version
- Add example URLs that demonstrate the issue

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Chrome Web Store](https://chrome.google.com/webstore) (coming soon)
- [Privacy Policy](privacy-policy.md)
- [Bug Reports](https://github.com/ryota-murakami/clean-url/issues)
- [Feature Requests](https://github.com/ryota-murakami/clean-url/issues)

## 📊 Statistics

- **Lines of Code**: ~2,000
- **Test Coverage**: 80%+
- **Tracking Parameters**: 25+ supported
- **Bundle Size**: <50KB

## 🎯 Roadmap

- [ ] Firefox extension support
- [ ] Safari extension support
- [ ] Custom tracking parameter rules
- [ ] Bulk URL cleaning
- [ ] URL cleaning history
- [ ] Whitelist/blacklist domains

## 🙏 Acknowledgments

- Inspired by the need for better online privacy
- Built with modern web extension standards (Manifest V3)
- Thanks to the open source community for tools and libraries

---

**Made with ❤️ for privacy-conscious users**

*Clean URL helps you browse the web without leaving tracking breadcrumbs behind.*