import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tsPrefixer from 'eslint-config-ts-prefixer'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

const patchedPrefixer = tsPrefixer.map((config) => {
  if (config?.languageOptions?.parserOptions) {
    return {
      ...config,
      languageOptions: {
        ...config.languageOptions,
        parserOptions: {
          ...config.languageOptions.parserOptions,
          tsconfigRootDir: projectRoot,
          allowDefaultProject: true,
        },
      },
    }
  }

  return config
})

export default [
  // Global ignores for build output
  {
    ignores: [
      '**/node_modules/**',
      '**/.output/**',
      '**/.wxt/**',
      '**/coverage/**',
      '**/dist/**',
    ],
  },
  ...patchedPrefixer,
  {
    // Project-specific globals
    languageOptions: {
      globals: {
        CleanUrlLogic: 'readonly',
      },
    },
  },
  // Config for JavaScript-based tooling and tests
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      parserOptions: {
        allowDefaultProject: true,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]
