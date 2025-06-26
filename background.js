/**
 * Clean URL Extension - Background Service Worker
 * Handles badge updates, tab monitoring, and extension lifecycle
 */

// Import the URL cleaning logic for the service worker
importScripts('clean-url-logic.js');

class CleanUrlBackground {
  constructor() {
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupContextMenus();
  }

  setupEventListeners() {
    // Extension installation/startup
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });

    // Tab updates - monitor URL changes
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // Tab activation - update badge when switching tabs
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivation(activeInfo);
    });

    // Action click - optional fallback if popup fails
    chrome.action.onClicked.addListener((tab) => {
      this.handleActionClick(tab);
    });
  }

  setupContextMenus() {
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

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });
  }

  handleInstallation(details) {
    console.log('Clean URL extension installed:', details.reason);
    
    if (details.reason === 'install') {
      // First installation
      this.showWelcomeNotification();
    } else if (details.reason === 'update') {
      // Extension updated
      console.log('Extension updated from version:', details.previousVersion);
    }

    // Initialize badge for all tabs
    this.updateAllTabBadges();
  }

  handleStartup() {
    console.log('Clean URL extension started');
    this.updateAllTabBadges();
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    // Only process when URL changes and is complete
    if (changeInfo.status === 'complete' && tab.url) {
      await this.updateTabBadge(tabId, tab.url);
    }
  }

  async handleTabActivation(activeInfo) {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab.url) {
        await this.updateTabBadge(activeInfo.tabId, tab.url);
      }
    } catch (error) {
      console.error('Error handling tab activation:', error);
    }
  }

  async handleActionClick(tab) {
    // Fallback: if popup doesn't open, try to clean URL directly
    console.log('Action clicked, attempting direct URL cleaning');
    
    if (tab.url) {
      const result = CleanUrlLogic.cleanUrl(tab.url);
      
      if (result.success && result.hasChanges) {
        try {
          await chrome.tabs.update(tab.id, { url: result.cleanedUrl });
          this.showNotification(
            'URL Cleaned!',
            `Removed ${result.removedCount} tracking parameters`
          );
        } catch (error) {
          console.error('Error applying cleaned URL:', error);
        }
      } else {
        this.showNotification(
          'Clean URL',
          'No tracking parameters found in this URL'
        );
      }
    }
  }

  async handleContextMenuClick(info, tab) {
    let urlToClean = '';
    
    if (info.menuItemId === 'clean-current-url') {
      urlToClean = tab.url;
    } else if (info.menuItemId === 'clean-link-url') {
      urlToClean = info.linkUrl;
    }

    if (urlToClean) {
      await this.cleanUrlFromContext(urlToClean, tab);
    }
  }

  async cleanUrlFromContext(url, tab) {
    const result = CleanUrlLogic.cleanUrl(url);
    
    if (result.success && result.hasChanges) {
      try {
        // Copy cleaned URL to clipboard
        await this.copyToClipboard(result.cleanedUrl);
        
        this.showNotification(
          'URL Cleaned & Copied!',
          `Removed ${result.removedCount} tracking parameters. Cleaned URL copied to clipboard.`
        );
      } catch (error) {
        console.error('Error handling context menu clean:', error);
        this.showNotification(
          'Error',
          'Failed to clean URL'
        );
      }
    } else {
      this.showNotification(
        'Clean URL',
        'No tracking parameters found in this URL'
      );
    }
  }

  async updateTabBadge(tabId, url) {
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      // Clear badge for non-web pages
      await this.setBadge(tabId, '');
      return;
    }

    try {
      const result = CleanUrlLogic.analyzeUrl(url);
      
      if (result.success && result.removedCount > 0) {
        const badgeText = result.removedCount > 99 ? '99+' : result.removedCount.toString();
        await this.setBadge(tabId, badgeText, '#e53e3e'); // Red background for tracking parameters
      } else {
        await this.setBadge(tabId, ''); // Clear badge if no tracking parameters
      }
    } catch (error) {
      console.error('Error updating tab badge:', error);
      await this.setBadge(tabId, '');
    }
  }

  async updateAllTabBadges() {
    try {
      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        if (tab.url) {
          await this.updateTabBadge(tab.id, tab.url);
        }
      }
    } catch (error) {
      console.error('Error updating all tab badges:', error);
    }
  }

  async setBadge(tabId, text, backgroundColor = '#667eea') {
    try {
      await chrome.action.setBadgeText({
        text: text,
        tabId: tabId
      });

      if (text) {
        await chrome.action.setBadgeBackgroundColor({
          color: backgroundColor,
          tabId: tabId
        });
      }
    } catch (error) {
      console.error('Error setting badge:', error);
    }
  }

  showWelcomeNotification() {
    this.showNotification(
      'Clean URL Extension Installed!',
      'Click the extension icon to remove tracking parameters from URLs. Your privacy is protected.'
    );
  }

  showNotification(title, message) {
    // Note: Chrome extensions need the "notifications" permission to show notifications
    // For now, we'll just log to console. Add notifications permission to manifest if needed.
    console.log(`Notification: ${title} - ${message}`);
    
    // Uncomment below if you add "notifications" permission to manifest.json
    /*
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: title,
      message: message
    });
    */
  }

  async copyToClipboard(text) {
    // Service workers can't directly access clipboard API
    // We'll need to use a content script or messaging to popup
    // For now, we'll store it in chrome.storage for the popup to access
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
  static getTrackingParamCount(url) {
    try {
      const result = CleanUrlLogic.analyzeUrl(url);
      return result.success ? result.removedCount : 0;
    } catch (error) {
      console.error('Error getting tracking param count:', error);
      return 0;
    }
  }
}

// Initialize the background service worker
const cleanUrlBackground = new CleanUrlBackground();

// Message handling for communication with popup/content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTrackingCount') {
    const count = CleanUrlBackground.getTrackingParamCount(request.url);
    sendResponse({ count: count });
  } else if (request.action === 'cleanUrl') {
    const result = CleanUrlLogic.cleanUrl(request.url);
    sendResponse(result);
  }
  
  return true; // Keep message channel open for async response
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CleanUrlBackground;
}