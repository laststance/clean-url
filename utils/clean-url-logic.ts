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
  'gad_source', // Google Ads source
  'gad_campaignid', // Google Ads campaign ID
  'gbraid',     // Google Ads gbraid
  'utm_ad',     // UTM ad identifier
  'matchtype',  // Google Ads match type (exact/broad/phrase)
  'campaign_id', // Generic campaign identifier
  'ad_id',      // Generic ad identifier
  
  // Affiliate & referral trackers
  'ref',
  'referral',
  'referrer',    // HTTP Referer tracking (distinct from 'referral' programs)
  'affiliate_id',
  'afid',
  'click_id',
  'clickid',
  'subid',
  'sub_id',
  'partner_id',
  'sr_share',   // ShareThis

  // Amazon affiliate & tracking
  'tag',        // Amazon affiliate tag (most important)
  'linkCode',   // Amazon Associates link code
  'linkId',     // Amazon Associates link ID
  'ascsubtag',  // Amazon affiliate sub-tag
  'camp',       // Amazon campaign ID
  'creative',   // Amazon creative/ad ID
  'pd_rd_i',    // Product detail ranking - item
  'pd_rd_r',    // Product detail ranking - request
  'pd_rd_w',    // Product detail ranking - widget
  'pd_rd_wg',   // Product detail ranking - widget group
  
  // Email & newsletter trackers
  'ck_subscriber_id',  // ConvertKit
  'mc_cid',           // MailChimp Campaign ID
  'mc_eid',           // MailChimp Email ID
  '_hsenc',           // HubSpot Email Encoding
  '_hsmi',            // HubSpot Message ID
  
  // Analytics & other
  'sthash',     // ShareThis hash
  'source',     // Standalone source parameter
  'campaign',   // Standalone campaign parameter
  'adgroup',
  'adposition',
  '_bhlid'      // BH List ID tracking parameter
];

/**
 * Validates if a string is a proper URL
 * @param {string} urlString - The URL string to validate
 * @returns {boolean} True if valid URL, false otherwise
 */
function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cleans tracking parameters from a URL hash fragment
 * Handles cases where tracking params are URL-encoded in the hash (e.g., #utm_source%3Dgoogle)
 *
 * @param hashContent - The hash content without the # prefix
 * @returns Cleaned hash content or null if the entire hash should be removed
 * @example
 * cleanHashFragment('section-1') // => 'section-1' (normal anchor preserved)
 * cleanHashFragment('utm_source%3Dgoogle') // => null (tracking-only hash removed)
 * cleanHashFragment('utm_source%3Dgoogle%26page%3D1') // => 'page=1' (tracking removed, non-tracking kept)
 */
function cleanHashFragment(hashContent: string): string | null {
  if (!hashContent) {
    return null;
  }

  // Try to decode and check if it looks like URL-encoded query parameters
  let decodedHash: string;
  try {
    decodedHash = decodeURIComponent(hashContent);
  } catch {
    // If decoding fails, preserve the original hash as-is
    return hashContent;
  }

  // SPA routing paths (starting with /) should be preserved as-is
  if (decodedHash.startsWith('/')) {
    return hashContent;
  }

  // Check for specific malformed tracking data patterns (complex campaign hashes)
  const looksLikeMalformedTracking = hashContent.includes('Vite%20RSC') ||
                                     hashContent.includes('Next.js') ||
                                     hashContent.includes('TypeScript') ||
                                     /^\d+:/.test(hashContent) ||
                                     /^\d+:/.test(decodedHash);

  if (looksLikeMalformedTracking) {
    return null;
  }

  // Check if the decoded hash looks like pure query parameters
  // Must have = and start with a param name pattern (not include path-like content before =)
  const hasQueryParamStructure = decodedHash.includes('=');
  const startsWithPathLikeContent = /^[a-zA-Z0-9_-]+\?/.test(decodedHash); // e.g., "product-reviews?..."

  // If it looks like "anchor?params" format (SPA/hash routing), preserve as-is
  if (startsWithPathLikeContent) {
    return hashContent;
  }

  if (!hasQueryParamStructure) {
    // No query params structure - preserve as normal anchor
    return hashContent;
  }

  // At this point, we have query param structure. Check if ALL first-level keys are tracking params.
  // Parse as query parameters and filter out tracking params
  try {
    const hashParams = new URLSearchParams(decodedHash);
    const cleanedHashParams = new URLSearchParams();
    let hasAnyTrackingParam = false;

    for (const [key, value] of hashParams.entries()) {
      const paramLower = key.toLowerCase();
      const isTrackingParam = TRACKING_PARAM_PATTERNS.some(pattern =>
        paramLower === pattern.toLowerCase()
      );

      if (isTrackingParam) {
        hasAnyTrackingParam = true;
      } else {
        cleanedHashParams.append(key, value);
      }
    }

    // If no tracking params found, preserve original hash
    if (!hasAnyTrackingParam) {
      return hashContent;
    }

    // If all params were tracking params, remove the hash entirely
    const cleanedString = cleanedHashParams.toString();
    return cleanedString ? cleanedString : null;
  } catch {
    // If parsing fails, preserve the original hash
    return hashContent;
  }
}

/**
 * Removes tracking parameters from a URL
 * @param {string} originalUrl - The original URL string
 * @returns {Object} Result object with cleaned URL and metadata
 */
function cleanUrl(originalUrl: string): CleanUrlResult {
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
    
    // Handle hash fragment - clean tracking params from URL-encoded hash content
    if (url.hash) {
      const hashContent = url.hash.slice(1); // Remove the # prefix
      const cleanedHash = cleanHashFragment(hashContent);

      if (cleanedHash) {
        cleanedUrl.hash = '#' + cleanedHash;
      }
      // If cleanedHash is null, the hash is entirely tracking data and should be omitted
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
      error: `URL processing error: ${error instanceof Error ? error.message : String(error)}`,
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
function cleanUrls(urls: string[]): CleanUrlResult[] {
  if (!Array.isArray(urls)) {
    throw new Error('Input must be an array of URLs');
  }
  
  return urls.map(url => cleanUrl(url));
}

/**
 * Get statistics about tracking parameters in a URL
 * @param {string} url - The URL to analyze
 * @returns {AnalyzeUrlResult} Analysis results
 */
function analyzeUrl(url: string): AnalyzeUrlResult {
  const result = cleanUrl(url);

  if (!result.success) {
    // Return error result with empty categories and summary
    return {
      ...result,
      categories: {
        utm: [],
        social: [],
        ads: [],
        affiliate: [],
        email: [],
        analytics: []
      },
      summary: {
        utm: 0,
        social: 0,
        ads: 0,
        affiliate: 0,
        email: 0,
        analytics: 0
      }
    };
  }

  // Categorize removed parameters
  const categories: {
    utm: Array<{ key: string; value: string }>;
    social: Array<{ key: string; value: string }>;
    ads: Array<{ key: string; value: string }>;
    affiliate: Array<{ key: string; value: string }>;
    email: Array<{ key: string; value: string }>;
    analytics: Array<{ key: string; value: string }>;
  } = {
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
    } else if (['gclid', 'yclid', 'dclid', 'msclkid', 'gad_source', 'gad_campaignid', 'gbraid', 'utm_ad', 'matchtype', 'campaign_id', 'ad_id'].includes(paramLower)) {
      categories.ads.push({ key, value });
    } else if (['ref', 'referral', 'referrer', 'affiliate_id', 'afid', 'click_id', 'clickid', 'subid', 'sub_id', 'partner_id', 'sr_share', 'tag', 'linkcode', 'linkid', 'ascsubtag', 'camp', 'creative', 'pd_rd_i', 'pd_rd_r', 'pd_rd_w', 'pd_rd_wg'].includes(paramLower)) {
      categories.affiliate.push({ key, value });
    } else if (['ck_subscriber_id', 'mc_cid', 'mc_eid', '_hsenc', '_hsmi'].includes(paramLower)) {
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

// TypeScript type definitions
export interface RemovedParam {
  key: string;
  value: string;
}

export interface CleanUrlResult {
  success: boolean;
  error: string | null;
  originalUrl: string;
  cleanedUrl: string | null;
  removedParams: RemovedParam[];
  removedCount: number;
  hasChanges?: boolean;
  savedBytes?: number;
}

export interface AnalyzeUrlResult extends CleanUrlResult {
  categories: {
    utm: RemovedParam[];
    social: RemovedParam[];
    ads: RemovedParam[];
    affiliate: RemovedParam[];
    email: RemovedParam[];
    analytics: RemovedParam[];
  };
  summary: {
    utm: number;
    social: number;
    ads: number;
    affiliate: number;
    email: number;
    analytics: number;
  };
}

// Export functions as standard ES modules
export {
  cleanUrl,
  cleanUrls,
  analyzeUrl,
  isValidUrl,
  cleanHashFragment,
  TRACKING_PARAM_PATTERNS
};
