# GitHub Workflows

This directory contains comprehensive GitHub Actions workflows for the Clean URL Chrome extension project built with WXT framework.

## Available Workflows

### 🔄 CI (`ci.yml`)
**Triggers:** Push/PR to `main`/`develop` branches

- **Linting & Type Checking:** Validates code quality and TypeScript types
- **Unit Testing:** Runs all unit tests with Vitest
- **Build Testing:** Builds extension for Chrome
- **Artifact Upload:** Saves build artifacts for download

**Coverage:** Integrated with Codecov for test coverage tracking

### 🧪 Test (`test.yml`)
**Triggers:** Push/PR to `main`/`develop` branches

- **Coverage Testing:** Runs tests with coverage reporting
- **Codecov Integration:** Uploads coverage reports to Codecov

### 📦 Build (`build.yml`)
**Triggers:** Push to `main`, tags (`v*`), manual dispatch

- **Chrome Build:** Creates package for Chrome
- **ZIP Creation:** Generates distributable ZIP file
- **Release Assets:** Attaches ZIP file to GitHub releases

### 🚀 Release (`release.yml`)
**Triggers:** Push to version tags (`v*`), manual dispatch

- **Chrome Store API v2:** [Submission script](../../scripts/submit-chrome.mjs) uploads the package and submits it for review; Google approval and public availability are separate stages
- **Optional Edge Support:** Enabled only when the `ENABLE_EDGE_PUBLISH` repository variable is `true`
- **Dry Run Mode:** Exchanges the OAuth refresh token and reads the configured Chrome item status without uploading or submitting, including while an existing revision is pending review
- **Pending Review Protection:** Stops a real submission when an existing revision is under review
- **Artifact Management:** Downloads and processes build packages
- **Release Runtime:** Uses Node.js 24 and the pnpm version declared in `package.json`'s `packageManager` field

### 🔒 Security (`security.yml`)
**Triggers:** Push/PR to `main`/`develop`, weekly schedule

- **Dependency Audit:** Checks for vulnerable dependencies with `pnpm audit`
- **Security Scanning:** Uses Snyk for advanced vulnerability detection
- **CodeQL Analysis:** Static security analysis for code vulnerabilities
- **License Checking:** Validates dependency licenses and generates reports
- **Dependency Review:** PR-based dependency vulnerability checking

### 🌐 Browser Compatibility (`browser-compatibility.yml`)
**Triggers:** Push/PR to `main`, weekly schedule

- **E2E Testing:** Runs Playwright tests on Chrome
- **Manifest Validation:** Ensures generated manifest is valid JSON
- **Size Checking:** Validates extension size limits (50MB)

## Required Secrets

### For Release Workflow
```bash
# Chrome Web Store
CHROME_EXTENSION_ID=your_32_character_extension_id
CHROME_PUBLISHER_ID=your_publisher_id_from_store_dashboard_settings
CHROME_CLIENT_ID=your_chrome_client_id
CHROME_CLIENT_SECRET=your_chrome_client_secret
CHROME_REFRESH_TOKEN=your_chrome_refresh_token

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
3. Release workflow builds the Chrome ZIP and submits it for review with automatic publication after approval
4. Use manual dispatch with `dry_run=true` to verify credentials and item access without changing the current Store revision

### Chrome OAuth maintenance

Use the existing Google Cloud OAuth client with the `https://www.googleapis.com/auth/chromewebstore` scope. External OAuth apps in **Testing** issue refresh tokens that expire after seven days. Set the consent screen's publishing status to **In production**, then authorize again to obtain a new refresh token. Production status removes that testing-specific lifetime; tokens can still be revoked or expire for other reasons. See [Google's refresh token expiration rules](https://developers.google.com/identity/protocols/oauth2#expiration).

Save the new client secret and refresh token only as repository Actions secrets. Never commit credentials, print token responses, or include them in workflow artifacts. Preserve an existing client secret until the replacement passes verification. The publisher ID is available in the Chrome Web Store developer dashboard's Settings page.

Verify the saved secrets with:

```bash
gh workflow run release.yml --ref main -f dry_run=true
```

The `publish-chrome` job must report `Chrome Store API v2 authentication verified`. A green build alone does not verify credentials. The API v2 submission script replaces v1, whose support [ends on October 15, 2026](https://developer.chrome.com/docs/webstore/api/v1).

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
- **Edge:** Chromium-based, same as Chrome build

## Best Practices

1. **Always test locally** before pushing to main branches
2. **Use dry-run mode** for release testing
3. **Monitor security scans** for dependency vulnerabilities
4. **Review coverage reports** to maintain testing quality
5. **Check browser compatibility** before releases
