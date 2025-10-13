# GitHub Workflows

This directory contains comprehensive GitHub Actions workflows for the Clean URL Chrome extension project built with WXT framework.

## Available Workflows

### 🔄 CI (`ci.yml`)
**Triggers:** Push/PR to `main`/`develop` branches

- **Linting & Type Checking:** Validates code quality and TypeScript types
- **Unit Testing:** Runs all unit tests with Vitest
- **Build Testing:** Builds extensions for Chrome and Firefox
- **Artifact Upload:** Saves build artifacts for download

**Coverage:** Integrated with Codecov for test coverage tracking

### 🧪 Test (`test.yml`)
**Triggers:** Push/PR to `main`/`develop` branches

- **Coverage Testing:** Runs tests with coverage reporting
- **Codecov Integration:** Uploads coverage reports to Codecov

### 📦 Build (`build.yml`)
**Triggers:** Push to `main`, tags (`v*`), manual dispatch

- **Multi-browser Builds:** Creates packages for Chrome and Firefox
- **ZIP Creation:** Generates distributable ZIP files
- **Release Assets:** Attaches ZIP files to GitHub releases
- **Manual Dispatch:** Allows building specific browsers on-demand

### 🚀 Release (`release.yml`)
**Triggers:** Push to version tags (`v*`), manual dispatch

- **Automated Publishing:** Submits extensions to Chrome Web Store, Firefox Add-ons, and Edge Add-ons
- **Multi-store Support:** Handles different store requirements and credentials
- **Dry Run Mode:** Test publishing without actual submission
- **Artifact Management:** Downloads and processes build packages

### 🔒 Security (`security.yml`)
**Triggers:** Push/PR to `main`/`develop`, weekly schedule

- **Dependency Audit:** Checks for vulnerable dependencies with `pnpm audit`
- **Security Scanning:** Uses Snyk for advanced vulnerability detection
- **CodeQL Analysis:** Static security analysis for code vulnerabilities
- **License Checking:** Validates dependency licenses and generates reports
- **Dependency Review:** PR-based dependency vulnerability checking

### 🌐 Browser Compatibility (`browser-compatibility.yml`)
**Triggers:** Push/PR to `main`, weekly schedule

- **E2E Testing:** Runs Playwright tests on Chrome and Firefox
- **Manifest Validation:** Ensures generated manifests are valid JSON
- **Size Checking:** Validates extension size limits (50MB)
- **Cross-browser Testing:** Verifies functionality across browsers

## Required Secrets

### For Release Workflow
```bash
# Chrome Web Store
CHROME_CLIENT_ID=your_chrome_client_id
CHROME_CLIENT_SECRET=your_chrome_client_secret
CHROME_REFRESH_TOKEN=your_chrome_refresh_token

# Firefox Add-ons
FIREFOX_JWT_ISSUER=your_firefox_jwt_issuer
FIREFOX_JWT_SECRET=your_firefox_jwt_secret

# Edge Addons
EDGE_CLIENT_ID=your_edge_client_id
EDGE_CLIENT_SECRET=your_edge_client_secret
EDGE_ACCESS_TOKEN_URL=your_edge_access_token_url
```

### For Security Workflow
```bash
# Snyk (optional)
SNYK_TOKEN=your_snyk_token
```

### For Coverage (already configured)
```bash
# Codecov (already configured)
CODECOV_TOKEN=your_codecov_token
```

## Usage

### Development Workflow
1. Push/PR to `main` or `develop` triggers CI, Test, and Browser Compatibility workflows
2. All workflows run in parallel for faster feedback
3. Failed workflows block merging

### Release Process
1. Create a version tag: `git tag v1.2.3`
2. Push the tag: `git push origin v1.2.3`
3. Release workflow automatically builds and publishes to all stores
4. Use manual dispatch for testing or specific browser releases

### Manual Operations
- **Build specific browser:** Use workflow dispatch in GitHub Actions tab
- **Test publishing:** Use dry-run mode in release workflow
- **Security scanning:** Runs automatically weekly or can be triggered manually

## Workflow Architecture

- **Parallel Execution:** Most workflows run independently for speed
- **Artifact Sharing:** Build artifacts are shared between jobs
- **Conditional Execution:** Jobs run only when prerequisites are met
- **Error Handling:** Comprehensive error reporting and notifications

## Browser Support

- **Chrome:** Manifest V3, modern Chrome APIs
- **Firefox:** Manifest V2 (for compatibility), modern Firefox APIs
- **Edge:** Chromium-based, same as Chrome build

## Best Practices

1. **Always test locally** before pushing to main branches
2. **Use dry-run mode** for release testing
3. **Monitor security scans** for dependency vulnerabilities
4. **Review coverage reports** to maintain testing quality
5. **Check browser compatibility** before releases
