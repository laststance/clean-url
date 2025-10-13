# Clean URL - Chrome Extension

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store%20-blue)](https://chromewebstore.google.com/detail/clean-url/konddpmmdjghlicegcfdjehalocbkmpl)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Built with WXT](https://img.shields.io/badge/Built%20with-WXT-orange)](https://wxt.dev)
[![codecov](https://codecov.io/gh/laststance/clean-url/graph/badge.svg?token=67AW0P4XIU)](https://codecov.io/gh/laststance/clean-url)

A privacy-focused Chrome extension that removes tracking parameters from URLs with a single click. Built with WXT framework and TypeScript for a modern, type-safe development experience.

## 🚀 Features

- **Manual URL Cleaning**: Click the extension icon to clean the current tab's URL
- **Comprehensive Tracking Removal**: Removes 25+ types of tracking parameters
- **Visual Feedback**: Shows badge with tracking parameter count
- **Copy to Clipboard**: Easily copy cleaned URLs
- **Privacy First**: All processing happens locally - no data collection
- **Real-time Analysis**: Instantly see what tracking parameters are found
- **TypeScript**: Fully type-safe codebase with excellent IDE support
- **Modern Development**: Hot Module Replacement (HMR) for instant feedback

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
- `gad_source`, `gad_campaignid`, `gbraid` (Google Ads)
- `utm_ad`, `matchtype`, `campaign_id`, `ad_id` (Campaign tracking)

### Email & Newsletter Trackers
- `ck_subscriber_id` (ConvertKit)
- `mc_cid`, `mc_eid` (MailChimp)
- `_hsenc`, `_hsmi` (HubSpot)

### Affiliate & Referral Trackers
- `ref`, `referral`, `affiliate_id`, `click_id`, `subid`, `partner_id`

[View complete list](./utils/clean-url-logic.ts)

## 🔧 Installation

### For Users
1. Download from the Chrome Web Store (coming soon)
2. Click "Add to Chrome"
3. Start cleaning URLs by clicking the extension icon!

### For Developers
1. Clone this repository:
   ```bash
   git clone https://github.com/laststance/clean-url.git
   cd clean-url
   ```

2. Install dependencies (using pnpm):
   ```bash
   pnpm install
   ```

3. Start development server:
   ```bash
   pnpm dev
   ```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select `.output/chrome-mv3` directory

5. The extension icon should appear in your toolbar with live reloading!

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
- Minimal permissions (only `tabs`, `storage`, `contextMenus`)
- Input validation and sanitization
- Open source and auditable

## 🧪 Testing

### Run Unit Tests
```bash
pnpm test
```

### Run Unit Tests with Coverage (93.78%)
```bash
pnpm test:coverage
```

### Run E2E Tests
```bash
pnpm install:playwright
pnpm test:e2e
```

### Run in Watch Mode
```bash
pnpm test:watch
```

### Run All Validation
```bash
pnpm validate  # Runs lint, tests, and TypeScript checks
```

## 🏗️ Development

### Project Structure
```
clean-url/
├── wxt.config.ts          # WXT framework configuration
├── tsconfig.json          # TypeScript configuration
├── vitest.config.ts       # Vitest testing configuration
├── entrypoints/           # Extension entrypoints (WXT convention)
│   ├── background.ts      # Service worker
│   └── popup/             # Popup interface
│       ├── index.html     # Popup HTML
│       ├── main.ts        # Popup logic
│       └── style.css      # Popup styling
├── utils/                 # Shared utilities
│   └── clean-url-logic.ts # Core cleaning logic (TypeScript)
├── public/                # Static assets
│   ├── icon-*.png         # Extension icons
│   └── privacy-policy.md  # Privacy policy
├── tests/                 # Test suites
│   ├── unit/              # Vitest unit tests
│   ├── e2e/               # Playwright E2E tests
│   ├── test-urls.json     # Test fixtures
│   └── setup.ts           # Test setup
└── .output/               # Build output
    └── chrome-mv3/        # Built extension
```

### Key Components

#### Core Logic (`utils/clean-url-logic.ts`)
TypeScript module containing URL cleaning algorithms and tracking parameter patterns with full type safety.

#### Popup Interface (`entrypoints/popup/`)
User interface built with TypeScript, including URL display, cleaning controls, and feedback.

#### Background Service Worker (`entrypoints/background.ts`)
Handles badge updates, context menus, and extension lifecycle using WXT's `defineBackground` pattern.

### Technology Stack
- **Framework**: WXT (Web Extension Tools)
- **Language**: TypeScript 5.9
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Build**: Vite (via WXT)
- **Manifest**: V3 (auto-generated)

### Development Commands

```bash
pnpm dev              # Start dev server with HMR
pnpm dev:firefox      # Start dev server for Firefox
pnpm build            # Build production extension
pnpm build:firefox    # Build for Firefox
pnpm zip              # Create distribution ZIP
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint code quality check
pnpm validate         # Run all quality checks
```

### Adding New Tracking Parameters
1. Add the parameter to `TRACKING_PARAM_PATTERNS` in `utils/clean-url-logic.ts`
2. Add test cases to `tests/test-urls.json`
3. Update this README documentation
4. Run tests to ensure compatibility: `pnpm test`

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with TypeScript
4. Add tests for new functionality
5. Run the test suite: `pnpm validate`
6. Commit your changes: `git commit -am 'Add feature'`
7. Push to the branch: `git push origin feature-name`
8. Create a Pull Request

### Reporting Issues
- Use the [GitHub Issues](https://github.com/laststance/clean-url/issues) page
- Provide detailed reproduction steps
- Include browser version and extension version
- Add example URLs that demonstrate the issue

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Chrome Web Store](https://chrome.google.com/webstore) (coming soon)
- [Privacy Policy](privacy-policy.md)
- [Bug Reports](https://github.com/laststance/clean-url/issues)
- [Feature Requests](https://github.com/laststance/clean-url/issues)

## 📊 Statistics

- **Language**: TypeScript
- **Framework**: WXT
- **Test Coverage**: 93.78%
- **Tracking Parameters**: 25+ supported
- **Build Size**: ~40KB
- **Tests**: 163 passing

## 🎯 Roadmap

- [x] TypeScript migration
- [x] WXT framework integration
- [x] 90%+ test coverage
- [ ] Firefox Add-ons publication
- [ ] Safari extension support
- [ ] Custom tracking parameter rules
- [ ] Bulk URL cleaning
- [ ] URL cleaning history
- [ ] Whitelist/blacklist domains

## 🙏 Acknowledgments

- Inspired by the need for better online privacy
- Built with [WXT](https://wxt.dev) - next-generation web extension framework
- Powered by [Vite](https://vitejs.dev) for blazing fast builds
- Thanks to the open source community for tools and libraries

---

**Made with ❤️ for privacy-conscious users**

*Clean URL helps you browse the web without leaving tracking breadcrumbs behind.*
