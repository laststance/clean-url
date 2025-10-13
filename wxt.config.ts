import { defineConfig } from 'wxt';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Manifest configuration
  manifest: {
    name: 'Clean URL',
    version: '1.0.3',
    description: 'Remove tracking parameters from URLs with a single click. Cleaning UTM, social media, and affiliate tracking parameters.',
    permissions: ['tabs', 'storage', 'contextMenus'],
    author: { email: 'dojce1048@gmail.com' },
    homepage_url: 'https://github.com/laststance/clean-url',

    // Content Security Policy
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';"
    }
  },

  // Path aliases for imports
  alias: {
    '@': resolve(__dirname, 'utils')
  },

  // Vite configuration for better TypeScript resolution
  vite: () => ({
    resolve: {
      alias: {
        '@': resolve(__dirname, 'utils')
      },
      extensions: ['.ts', '.js', '.json']
    }
  }),

  // Output configuration
  outDir: '.output',

  // Browser targets
  browser: 'chrome',
  manifestVersion: 3,

  // Module configuration
  modules: []
});
