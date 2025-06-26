/**
 * Clean URL - Core Logic Module
 * Removes tracking parameters from URLs while preserving essential functionality
 */

// Comprehensive tracking parameter patterns
const TRACKING_PARAM_PATTERNS = [
  // UTM parameters
  'utm_source',
  'utm_medium', 
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_nooverride',
  
  // Social media trackers
  'fbclid',     // Facebook Click ID
  'igshid',     // Instagram Share ID
  'ttclid',     // TikTok Click ID
  'tiktok_r',   // TikTok Referral
  'li_fat_id',  // LinkedIn Fat ID
  'mkt_tok',    // LinkedIn/Marketo token
  'trk',        // General tracking
  
  // Ad platform trackers
  'gclid',      // Google Click ID
  'yclid',      // Yandex Click ID
  'dclid',      // DoubleClick Click ID
  'msclkid',    // Microsoft Click ID
  
  // Affiliate & referral trackers
  'ref',
  'referral',
  'affiliate_id',
  'afid',
  'click_id',
  'clickid',
  'subid',
  'sub_id',
  'partner_id',
  'sr_share',   // ShareThis
  
  // Email & newsletter trackers
  'ck_subscriber_id',  // ConvertKit
  'mc_cid',           // MailChimp Campaign ID
  'mc_eid',           // MailChimp Email ID
  
  // Analytics & other
  'sthash',     // ShareThis hash
  'source',     // Standalone source parameter
  'campaign',   // Standalone campaign parameter
  'adgroup',
  'adposition'
];

/**
 * Validates if a string is a proper URL
 * @param {string} urlString - The URL string to validate
 * @returns {boolean} True if valid URL, false otherwise
 */
function isValidUrl(urlString) {
  try {
    new URL(urlString);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Removes tracking parameters from a URL
 * @param {string} originalUrl - The original URL string
 * @returns {Object} Result object with cleaned URL and metadata
 */
function cleanUrl(originalUrl) {
  // Input validation
  if (!originalUrl || typeof originalUrl !== 'string') {
    return {
      success: false,
      error: 'Invalid URL: URL must be a non-empty string',
      originalUrl: originalUrl,
      cleanedUrl: null,
      removedParams: [],
      removedCount: 0
    };
  }

  // Trim whitespace
  const trimmedUrl = originalUrl.trim();
  
  if (!isValidUrl(trimmedUrl)) {
    return {
      success: false,
      error: 'Invalid URL: Not a properly formatted URL',
      originalUrl: originalUrl,
      cleanedUrl: null,
      removedParams: [],
      removedCount: 0
    };
  }

  try {
    const url = new URL(trimmedUrl);
    const originalParams = new URLSearchParams(url.search);
    const cleanedParams = new URLSearchParams();
    const removedParams = [];

    // Check each parameter against tracking patterns
    for (const [key, value] of originalParams.entries()) {
      const paramLower = key.toLowerCase();
      
      // Check if this parameter matches any tracking pattern
      const isTrackingParam = TRACKING_PARAM_PATTERNS.some(pattern => 
        paramLower === pattern.toLowerCase()
      );

      if (isTrackingParam) {
        removedParams.push({ key, value });
      } else {
        // Keep non-tracking parameters
        cleanedParams.append(key, value);
      }
    }

    // Construct cleaned URL
    const cleanedUrl = new URL(url.origin + url.pathname);
    
    // Add remaining parameters if any
    if (cleanedParams.toString()) {
      cleanedUrl.search = cleanedParams.toString();
    }
    
    // Add hash fragment if present
    if (url.hash) {
      cleanedUrl.hash = url.hash;
    }

    const finalCleanedUrl = cleanedUrl.toString();

    return {
      success: true,
      error: null,
      originalUrl: originalUrl,
      cleanedUrl: finalCleanedUrl,
      removedParams: removedParams,
      removedCount: removedParams.length,
      hasChanges: removedParams.length > 0,
      savedBytes: originalUrl.length - finalCleanedUrl.length
    };

  } catch (error) {
    return {
      success: false,
      error: `URL processing error: ${error.message}`,
      originalUrl: originalUrl,
      cleanedUrl: null,
      removedParams: [],
      removedCount: 0
    };
  }
}

/**
 * Batch clean multiple URLs
 * @param {string[]} urls - Array of URL strings to clean
 * @returns {Object[]} Array of cleaning results
 */
function cleanUrls(urls) {
  if (!Array.isArray(urls)) {
    throw new Error('Input must be an array of URLs');
  }
  
  return urls.map(url => cleanUrl(url));
}

/**
 * Get statistics about tracking parameters in a URL
 * @param {string} url - The URL to analyze
 * @returns {Object} Analysis results
 */
function analyzeUrl(url) {
  const result = cleanUrl(url);
  
  if (!result.success) {
    return result;
  }

  // Categorize removed parameters
  const categories = {
    utm: [],
    social: [],
    ads: [],
    affiliate: [],
    email: [],
    analytics: []
  };

  result.removedParams.forEach(({ key, value }) => {
    const paramLower = key.toLowerCase();
    
    if (paramLower.startsWith('utm_')) {
      categories.utm.push({ key, value });
    } else if (['fbclid', 'igshid', 'ttclid', 'tiktok_r', 'li_fat_id', 'mkt_tok', 'trk'].includes(paramLower)) {
      categories.social.push({ key, value });
    } else if (['gclid', 'yclid', 'dclid', 'msclkid'].includes(paramLower)) {
      categories.ads.push({ key, value });
    } else if (['ref', 'referral', 'affiliate_id', 'afid', 'click_id', 'clickid', 'subid', 'sub_id', 'partner_id', 'sr_share'].includes(paramLower)) {
      categories.affiliate.push({ key, value });
    } else if (['ck_subscriber_id', 'mc_cid', 'mc_eid'].includes(paramLower)) {
      categories.email.push({ key, value });
    } else {
      categories.analytics.push({ key, value });
    }
  });

  return {
    ...result,
    categories: categories,
    summary: {
      utm: categories.utm.length,
      social: categories.social.length,
      ads: categories.ads.length,
      affiliate: categories.affiliate.length,
      email: categories.email.length,
      analytics: categories.analytics.length
    }
  };
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment (for testing)
  module.exports = {
    cleanUrl,
    cleanUrls,
    analyzeUrl,
    isValidUrl,
    TRACKING_PARAM_PATTERNS
  };
} else {
  // Browser environment (Chrome extension)
  window.CleanUrlLogic = {
    cleanUrl,
    cleanUrls,
    analyzeUrl,
    isValidUrl,
    TRACKING_PARAM_PATTERNS
  };
}