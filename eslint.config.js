import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';

export default [
  eslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    ignores: ['src/scripts/**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        HTMLCanvasElement: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        Event: 'readonly',
        requestAnimationFrame: 'readonly',
        performance: 'readonly',
        console: 'readonly',
        Window: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-fallthrough': 'off',
      'no-unused-vars': 'off', // Using @typescript-eslint/no-unused-vars instead
      'import/extensions': ['error', 'never', { js: 'never', ts: 'never' }],
    },
  },
  {
    files: ['src/scripts/**/*.ts'],
    ignores: ['src/scripts/**/*.test.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        require: 'readonly',
        module: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        performance: 'readonly',
        WeightLoader: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': 'off', // Allow console statements in scripts
      'no-fallthrough': 'off',
      'no-unused-vars': 'off', // Using @typescript-eslint/no-unused-vars instead
      'import/extensions': ['error', 'never', { js: 'never', ts: 'never' }],
    },
  },
  {
    files: ['src/scripts/**/*.test.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        require: 'readonly',
        module: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        performance: 'readonly',
        WeightLoader: 'readonly',
        BenchmarkResult: 'readonly',
        vi: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in test files for mocking
      '@typescript-eslint/explicit-function-return-type': 'off', // Allow implicit returns in tests
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': 'off', // Allow console statements in tests
      'no-fallthrough': 'off',
      'no-unused-vars': 'off', // Using @typescript-eslint/no-unused-vars instead
      'import/extensions': ['error', 'never', { js: 'never', ts: 'never' }],
      'no-undef': 'off', // Allow implicit globals in test files
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  prettier,
];
