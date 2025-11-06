/**
 * Clean URL Extension - Popup Logic
 * Handles user interactions and URL cleaning functionality
 */

import { analyzeUrl, type AnalyzeUrlResult } from '../../utils/clean-url-logic';

class CleanUrlPopup {
  currentTab: chrome.tabs.Tab | null = null;
  cleaningResult: AnalyzeUrlResult | null = null;
  elements: Record<string, HTMLElement> = {};

  constructor() {
    this.init();
  }

  async init() {
    this.cacheElements();
    this.attachEventListeners();
    await this.loadCurrentTab();
  }

  cacheElements() {
    this.elements = {
      loadingState: document.getElementById('loading-state')!,
      mainContent: document.getElementById('main-content')!,
      originalUrl: document.getElementById('original-url')!,
      copyOriginal: document.getElementById('copy-original')!,
      resultsSection: document.getElementById('results-section')!,
      successState: document.getElementById('success-state')!,
      noChangesState: document.getElementById('no-changes-state')!,
      errorState: document.getElementById('error-state')!,
      removedCount: document.getElementById('removed-count')!,
      cleanedUrl: document.getElementById('cleaned-url')!,
      copyCleaned: document.getElementById('copy-cleaned')!,
      applyCleanUrl: document.getElementById('apply-clean-url')!,
      removedParamsDetails: document.getElementById('removed-params-details')!,
      removedParamsList: document.getElementById('removed-params-list')!,
      errorMessage: document.getElementById('error-message')!,
      statsSection: document.getElementById('stats-section')!,
      statsGrid: document.getElementById('stats-grid')!,
      toastContainer: document.getElementById('toast-container')!,
      privacyLink: document.getElementById('privacy-link')!,
      helpLink: document.getElementById('help-link')!
    };
  }

  attachEventListeners() {
    // Copy buttons
    this.elements.copyOriginal.addEventListener('click', () => {
      this.copyToClipboard(this.currentTab?.url || '', 'Original URL copied!');
    });

    this.elements.copyCleaned.addEventListener('click', () => {
      this.copyToClipboard(this.cleaningResult?.cleanedUrl || '', 'Cleaned URL copied!');
    });

    // Apply cleaned URL button
    this.elements.applyCleanUrl.addEventListener('click', () => {
      this.applyCleanedUrl();
    });

    // Footer links
    this.elements.privacyLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.openPrivacyPolicy();
    });

    this.elements.helpLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.openHelp();
    });
  }

  async loadCurrentTab() {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url) {
        this.showError('Unable to access current tab URL');
        return;
      }

      this.currentTab = tab;
      this.analyzeUrl(tab.url);
      
    } catch (error) {
      console.error('Error getting current tab:', error);
      this.showError('Permission denied. Please refresh the page and try again.');
    }
  }

  analyzeUrl(url: string) {
    try {
      // Use the URL cleaning logic (now using standard ES module import)
      this.cleaningResult = analyzeUrl(url);

      this.hideLoading();
      this.displayResults();

    } catch (error) {
      console.error('Error analyzing URL:', error);
      this.showError('Failed to analyze URL');
    }
  }

  displayResults() {
    // Show original URL
    this.elements.originalUrl.textContent = this.truncateUrl(this.currentTab!.url);

    if (!this.cleaningResult) {
      this.showError('Failed to analyze URL');
      return;
    }

    if (!this.cleaningResult.success) {
      this.showError(this.cleaningResult.error ?? 'Unknown error occurred');
      return;
    }

    if (this.cleaningResult.hasChanges) {
      this.showSuccessState();
    } else {
      this.showNoChangesState();
    }
  }

  showSuccessState() {
    const result = this.cleaningResult;

    if (!result) {
      this.showError('Failed to analyze URL');
      return;
    }

    // Update removed count
    const countText = result.removedCount === 1
      ? '1 tracking parameter removed'
      : `${result.removedCount} tracking parameters removed`;
    this.elements.removedCount.textContent = countText;

    // Show cleaned URL
    this.elements.cleanedUrl.textContent = this.truncateUrl(result.cleanedUrl);

    // Populate removed parameters list
    this.populateRemovedParams(result.removedParams);

    // Show statistics if available
    if (result.summary) {
      this.showStatistics(result.summary);
    }

    // Show success state
    this.elements.successState.style.display = 'block';
    this.elements.noChangesState.style.display = 'none';
    this.elements.errorState.style.display = 'none';
  }

  showNoChangesState() {
    this.elements.successState.style.display = 'none';
    this.elements.noChangesState.style.display = 'block';
    this.elements.errorState.style.display = 'none';
  }

  showError(message: string) {
    this.hideLoading();
    this.elements.errorMessage.textContent = message;
    this.elements.successState.style.display = 'none';
    this.elements.noChangesState.style.display = 'none';
    this.elements.errorState.style.display = 'block';
  }

  populateRemovedParams(removedParams: Array<{ key: string; value: string }>) {
    if (!removedParams || removedParams.length === 0) {
      this.elements.removedParamsDetails.style.display = 'none';
      return;
    }

    const listHtml = removedParams.map(param => `
      <div class="param-item">
        <span class="param-key">${this.escapeHtml(param.key)}</span>
        <span class="param-value">${this.escapeHtml(this.truncateText(param.value, 30))}</span>
      </div>
    `).join('');

    this.elements.removedParamsList.innerHTML = listHtml;
    this.elements.removedParamsDetails.style.display = 'block';
  }

  showStatistics(summary: { utm: number; social: number; ads: number; affiliate: number; email: number; analytics: number }) {
    const stats = [
      { label: 'UTM', count: summary.utm },
      { label: 'Social', count: summary.social },
      { label: 'Ads', count: summary.ads },
      { label: 'Email', count: summary.email }
    ].filter(stat => stat.count > 0);

    if (stats.length === 0) {
      this.elements.statsSection.style.display = 'none';
      return;
    }

    const statsHtml = stats.map(stat => `
      <div class="stat-item">
        <span class="stat-count">${stat.count}</span>
        <span class="stat-label">${stat.label}</span>
      </div>
    `).join('');

    this.elements.statsGrid.innerHTML = statsHtml;
    this.elements.statsSection.style.display = 'block';
  }

  async applyCleanedUrl() {
    if (!this.cleaningResult || !this.cleaningResult.cleanedUrl) {
      this.showToast('No cleaned URL to apply', 'error');
      return;
    }

    if (!this.currentTab?.id) {
      this.showToast('Unable to access current tab', 'error');
      return;
    }

    try {
      // Navigate to the cleaned URL
      await chrome.tabs.update(this.currentTab.id, {
        url: this.cleaningResult.cleanedUrl
      });

      this.showToast('Applied cleaned URL!', 'success');
      
      // Close the popup after a short delay
      setTimeout(() => {
        window.close();
      }, 1000);

    } catch (error) {
      console.error('Error applying cleaned URL:', error);
      this.showToast('Failed to apply cleaned URL', 'error');
    }
  }

  async copyToClipboard(text: string, successMessage: string = 'Copied to clipboard!') {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(successMessage, 'success');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.showToast(successMessage, 'success');
      } catch {
        this.showToast('Failed to copy to clipboard', 'error');
      }
    }
  }

  showToast(message: string, type: 'info' | 'success' | 'error' = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    this.elements.toastContainer.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  hideLoading() {
    this.elements.loadingState.style.display = 'none';
    this.elements.mainContent.style.display = 'block';
  }

  truncateUrl(url: string | null | undefined, maxLength: number = 50): string {
    if (!url) return '';
    if (url.length <= maxLength) return url;
    
    const start = url.substring(0, 20);
    const end = url.substring(url.length - 20);
    return `${start}...${end}`;
  }

  truncateText(text: string, maxLength: number = 30): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  openPrivacyPolicy() {
    chrome.tabs.create({
              url: 'https://github.com/laststance/clean-url/blob/main/privacy-policy.md'
    });
  }

  openHelp() {
    chrome.tabs.create({
              url: 'https://github.com/laststance/clean-url#readme'
    });
  }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CleanUrlPopup();
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (event) => {
  // Ctrl/Cmd + C to copy cleaned URL
  if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
    const cleanedUrlElement = document.getElementById('cleaned-url');
    if (cleanedUrlElement && cleanedUrlElement.textContent) {
      event.preventDefault();
      navigator.clipboard.writeText(cleanedUrlElement.textContent);
    }
  }
  
  // Enter to apply cleaned URL
  if (event.key === 'Enter') {
    const applyButton = document.getElementById('apply-clean-url');
    if (applyButton && applyButton.style.display !== 'none') {
      event.preventDefault();
      applyButton.click();
    }
  }
  
  // Escape to close popup
  if (event.key === 'Escape') {
    window.close();
  }
});
