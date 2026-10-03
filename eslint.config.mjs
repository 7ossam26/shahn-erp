import tseslint from 'typescript-eslint';
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-types/**',
      'ui-preview/**',
      'output/**',
      'node_modules/**',
      '.tools/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: [
      'apps/web/src/**/*.{ts,tsx}',
      'packages/ui/src/**/*.{ts,tsx}',
      'packages/domain/src/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@shahn/database', '@shahn/test-support', '@shahn/api', 'node:*'],
              message: 'Browser packages cannot import server infrastructure.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        document: 'readonly',
        window: 'readonly',
        sessionStorage: 'readonly',
        AbortController: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
