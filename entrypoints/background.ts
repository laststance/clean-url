/**
 * Clean URL Extension - Background Service Worker
 * Handles badge updates, tab monitoring, and extension lifecycle
 */

// @ts-ignore - WXT global import issue
declare const defineBackground: any;
import { cleanUrl, analyzeUrl, type CleanUrlResult, type AnalyzeUrlResult } from '../utils/clean-url-logic';
import { BADGE } from '../utils/config';

export default defineBackground({
  main: () => {
    console.log('Clean URL background service worker initialized');

    // Setup context menus on installation
    setupContextMenus();

    // Extension installation/startup
    chrome.runtime.onInstalled.addListener((details) => {
      handleInstallation(details);
    });

    chrome.runtime.onStartup.addListener(() => {
      handleStartup();
    });

    // Tab updates - monitor URL changes
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      handleTabUpdate(tabId, changeInfo, tab);
    });

    // Tab activation - update badge when switching tabs
    chrome.tabs.onActivated.addListener((activeInfo) => {
      handleTabActivation(activeInfo);
    });

    // Action click - optional fallback if popup fails
    chrome.action.onClicked.addListener((tab) => {
      handleActionClick(tab);
    });

    // Context menu clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      handleContextMenuClick(info, tab);
    });

    // Message handling for communication with popup/content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getTrackingCount') {
        const count = getTrackingParamCount(request.url);
        sendResponse({ count });
      } else if (request.action === 'cleanUrl') {
        const result = cleanUrl(request.url);
        sendResponse(result);
      }

      return true; // Keep message channel open for async response
    });
  }
});

function setupContextMenus() {
  try {
    // Remove existing context menus first (in case of reload)
    chrome.contextMenus.removeAll(() => {
      // Create new context menus
      chrome.contextMenus.create({
        id: 'clean-current-url',
        title: 'Clean current URL',
        contexts: ['page'],
        documentUrlPatterns: ['http://*/*', 'https://*/*']
      });

      chrome.contextMenus.create({
        id: 'clean-link-url',
        title: 'Clean this link',
        contexts: ['link'],
        targetUrlPatterns: ['http://*/*', 'https://*/*']
      });
    });
  } catch (error) {
    console.error('Error setting up context menus:', error);
  }
}

function handleInstallation(details: chrome.runtime.InstalledDetails) {
  console.log('Clean URL extension installed:', details.reason);

  if (details.reason === 'install') {
    // First installation
    showWelcomeNotification();
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('Extension updated from version:', details.previousVersion);
  }

  // Initialize badge for all tabs
  updateAllTabBadges();
}

function handleStartup() {
  console.log('Clean URL extension started');
  updateAllTabBadges();
}

async function handleTabUpdate(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab
) {
  // Only process when URL changes and is complete
  if (changeInfo.status === 'complete' && tab.url) {
    await updateTabBadge(tabId, tab.url);
  }
}

async function handleTabActivation(activeInfo: chrome.tabs.TabActiveInfo) {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      await updateTabBadge(activeInfo.tabId, tab.url);
    }
  } catch (error) {
    console.error('Error handling tab activation:', error);
  }
}

async function handleActionClick(tab: chrome.tabs.Tab) {
  // Fallback: if popup doesn't open, try to clean URL directly
  console.log('Action clicked, attempting direct URL cleaning');

  if (tab.url && tab.id) {
    const result = cleanUrl(tab.url);

    if (result.success && result.hasChanges && result.cleanedUrl) {
      try {
        await chrome.tabs.update(tab.id, { url: result.cleanedUrl });
        showNotification(
          'URL Cleaned!',
          `Removed ${result.removedCount} tracking parameters`
        );
      } catch (error) {
        console.error('Error applying cleaned URL:', error);
      }
    } else {
      showNotification(
        'Clean URL',
        'No tracking parameters found in this URL'
      );
    }
  }
}

async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
) {
  let urlToClean = '';

  if (info.menuItemId === 'clean-current-url' && tab?.url) {
    urlToClean = tab.url;
  } else if (info.menuItemId === 'clean-link-url' && info.linkUrl) {
    urlToClean = info.linkUrl;
  }

  if (urlToClean && tab) {
    await cleanUrlFromContext(urlToClean, tab);
  }
}

async function cleanUrlFromContext(url: string, tab: chrome.tabs.Tab) {
  const result = cleanUrl(url);

  if (result.success && result.hasChanges && result.cleanedUrl) {
    try {
      // Copy cleaned URL to clipboard (via storage for popup to access)
      await copyToClipboard(result.cleanedUrl);

      showNotification(
        'URL Cleaned & Copied!',
        `Removed ${result.removedCount} tracking parameters. Cleaned URL copied to clipboard.`
      );
    } catch (error) {
      console.error('Error handling context menu clean:', error);
      showNotification(
        'Error',
        'Failed to clean URL'
      );
    }
  } else {
    showNotification(
      'Clean URL',
      'No tracking parameters found in this URL'
    );
  }
}

async function updateTabBadge(tabId: number, url: string) {
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    // Clear badge for non-web pages
    await setBadge(tabId, '');
    return;
  }

  try {
    const result = analyzeUrl(url);

    if (result.success && result.removedCount > 0) {
      const badgeText = result.removedCount > BADGE.MAX_COUNT ? '99+' : result.removedCount.toString();
      await setBadge(tabId, badgeText, BADGE.TRACKING_COLOR); // Red background for tracking parameters
    } else {
      await setBadge(tabId, ''); // Clear badge if no tracking parameters
    }
  } catch (error) {
    console.error('Error updating tab badge:', error);
    await setBadge(tabId, '');
  }
}

async function updateAllTabBadges() {
  try {
    const tabs = await chrome.tabs.query({});

    for (const tab of tabs) {
      if (tab.url && tab.id) {
        await updateTabBadge(tab.id, tab.url);
      }
    }
  } catch (error) {
    console.error('Error updating all tab badges:', error);
  }
}

async function setBadge(tabId: number, text: string, backgroundColor = BADGE.DEFAULT_COLOR) {
  try {
    await chrome.action.setBadgeText({
      text,
      tabId
    });

    if (text) {
      await chrome.action.setBadgeBackgroundColor({
        color: backgroundColor,
        tabId
      });
    }
  } catch (error) {
    console.error('Error setting badge:', error);
  }
}

function showWelcomeNotification() {
  showNotification(
    'Clean URL Extension Installed!',
    'Click the extension icon to remove tracking parameters from URLs. Your privacy is protected.'
  );
}

function showNotification(title: string, message: string) {
  // Note: Chrome extensions need the "notifications" permission to show notifications
  // For now, we'll just log to console. Add notifications permission to manifest if needed.
  console.log(`Notification: ${title} - ${message}`);

  // Uncomment below if you add "notifications" permission to manifest.json
  /*
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon-48.png',
    title: title,
    message: message
  });
  */
}

async function copyToClipboard(text: string) {
  // Service workers can't directly access clipboard API
  // We'll store it in chrome.storage for the popup to access
  try {
    await chrome.storage.local.set({
      'cleanedUrlForClipboard': text,
      'clipboardTimestamp': Date.now()
    });
  } catch (error) {
    console.error('Error storing cleaned URL:', error);
  }
}

// Utility method to get tracking parameter count for a URL
function getTrackingParamCount(url: string): number {
  try {
    const result = analyzeUrl(url);
    return result.success ? result.removedCount : 0;
  } catch (error) {
    console.error('Error getting tracking param count:', error);
    return 0;
  }
}
