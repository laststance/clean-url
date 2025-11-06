/**
 * Clean URL Extension - Centralized Configuration
 * Single source of truth for all magic numbers, colors, URLs, and constants
 */

/**
 * Badge configuration for extension icon
 */
export const BADGE = {
  /** Background color when tracking parameters are found (red) */
  TRACKING_COLOR: '#e53e3e',
  /** Default badge background color (purple/blue) */
  DEFAULT_COLOR: '#667eea',
  /** Maximum badge count display before showing "99+" */
  MAX_COUNT: 99
} as const;

/**
 * UI configuration for popup dimensions, colors, and timing
 */
export const UI = {
  /** Popup window dimensions */
  DIMENSIONS: {
    WIDTH: 380,      // px
    MIN_HEIGHT: 200  // px
  },

  /** Color palette */
  COLORS: {
    PRIMARY: '#667eea',      // Purple/blue - used for buttons, gradients
    PRIMARY_DARK: '#764ba2', // Dark purple - used for gradients
    SUCCESS: '#48bb78',      // Green - used for success states
    ERROR: '#e53e3e',        // Red - used for error states and tracking indicators
    PARAM_KEY: '#e53e3e'     // Red - used for displaying removed param keys
  },

  /** Text truncation limits */
  TRUNCATE: {
    URL_MAX_LENGTH: 50,           // Maximum URL display length before truncation
    URL_START_CHARS: 20,          // Characters to show at start of truncated URL
    URL_END_CHARS: 20,            // Characters to show at end of truncated URL
    PARAM_VALUE_MAX_LENGTH: 30    // Maximum param value display length
  },

  /** Timing configurations (in milliseconds) */
  TIMING: {
    TOAST_DURATION: 3000,         // How long toast notifications are displayed
    APPLY_URL_DELAY: 1000         // Delay before closing popup after applying URL
  }
} as const;

/**
 * External URLs and documentation links
 */
export const URLS = {
  /** Privacy policy document location */
  PRIVACY_POLICY: 'https://github.com/laststance/clean-url/blob/main/privacy-policy.md',
  /** Help documentation and README */
  HELP: 'https://github.com/laststance/clean-url#readme'
} as const;

/**
 * Cache and storage configuration
 * Note: Currently not actively used, reserved for future caching features
 */
export const CACHE = {
  /** Time-to-live for cached cleaned URLs (in milliseconds) */
  TTL: 3600000, // 1 hour
  /** Maximum number of cached entries */
  MAX_ENTRIES: 100
} as const;
