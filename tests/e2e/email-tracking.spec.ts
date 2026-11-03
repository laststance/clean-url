import path from 'node:path';

import { expect, test } from '@playwright/test';

// Exercise the built extension for both fresh email links and previously cleaned links.
for (const scenario of [
  {
    name: 'all Claude email tracking',
    url: 'https://platform.claude.com/docs/ja/managed-agents/quickstart?utm_content=hero_cta&utm_source=it&utm_medium=email&utm_campaign=managed_agents_onboarding&utm_term=api&utm_campaignId=12345#ctaButton',
    count: '7',
    status: '7 tracking parameters removed',
  },
  {
    name: 'campaign ID and CTA marker left by an earlier version',
    url: 'https://platform.claude.com/docs/ja/managed-agents/quickstart?utm_campaignId=12345#ctaButton',
    count: '2',
    status: '2 tracking parameters removed',
  },
  {
    name: 'a remaining CTA marker without query parameters',
    url: 'https://platform.claude.com/docs/ja/managed-agents/quickstart#ctaButton',
    count: '1',
    status: '1 tracking parameter removed',
  },
]) {
  test(`Apply Cleaned URL removes ${scenario.name}`, async ({ playwright }, testInfo) => {
    // Arrange
    const extensionPath = path.resolve('.output/chrome-mv3');
    const context = await playwright.chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      viewport: { width: 480, height: 900 },
      recordVideo: { dir: testInfo.outputPath('videos'), size: { width: 480, height: 900 } },
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    try {
      const serviceWorker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
      const extensionId = new URL(serviceWorker.url()).host;
      // Keep navigation deterministic while using real Chrome tabs and extension APIs.
      await context.route('https://platform.claude.com/**', async route => route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Managed Agents quickstart</title><h1>Managed Agents quickstart</h1>',
      }));
      const page = await context.newPage();
      await page.goto(scenario.url);
      const popup = await context.newPage();
      // Keep the documentation tab active so the popup analyzes the actual target tab.
      await page.bringToFront();
      await popup.goto(`chrome-extension://${extensionId}/popup.html`);
      await expect(popup.locator('#success-state')).toBeVisible();
      await expect(popup.locator('#removed-count')).toHaveText(scenario.status);
      await expect(popup.locator('#cleaned-url')).toBeVisible();
      await expect.poll(async () => serviceWorker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return chrome.action.getBadgeText({ tabId: tab.id });
      })).toBe(scenario.count);
      await popup.getByText('View removed parameters', { exact: true }).click();
      await expect(popup.locator('#removed-params-list')).toContainText('#ctaButton');
      await popup.screenshot({ path: testInfo.outputPath('before-apply.png'), fullPage: true });

      // Act
      await popup.getByRole('button', { name: 'Apply Cleaned URL', exact: true }).click();

      // Assert
      await expect(page).toHaveURL('https://platform.claude.com/docs/ja/managed-agents/quickstart');
      await expect(page.getByRole('heading', { name: 'Managed Agents quickstart' })).toBeVisible();
      await expect.poll(async () => serviceWorker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return chrome.action.getBadgeText({ tabId: tab.id });
      })).toBe('');
    } finally {
      // Finalize videos and release the isolated browser profile even after a failure.
      await context.close();
    }
  });
}
