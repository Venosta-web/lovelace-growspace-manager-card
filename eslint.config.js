import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import nPlugin from 'eslint-plugin-n';
import promisePlugin from 'eslint-plugin-promise';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  nPlugin.configs['flat/recommended'],
  promisePlugin.configs['flat/recommended'],
  {
    files: ['**/*.{ts,js}'],
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-useless-constructor': 'off',
      'n/no-missing-import': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
      // This card is a rollup-bundled browser artifact, never published to npm,
      // so the dependencies/devDependencies split is meaningless — everything is
      // bundled. n/no-extraneous-import is intentionally kept: it still catches
      // imports of packages declared in neither dependencies nor devDependencies.
      'n/no-unpublished-import': 'off',
      // Core rules superseded by the TypeScript compiler / typescript-eslint.
      // no-undef false-positives on type-space DOM globals (RequestInit,
      // NodeListOf, FocusOptions); no-redeclare can't see TS's value/type
      // namespace split (zod `const X` + `type X = z.infer<typeof X>`).
      'no-undef': 'off',
      'no-redeclare': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // A terminal `.then()` whose callback only performs a side effect (set
      // state, requestUpdate, showToast) has nothing meaningful to return.
      'promise/always-return': ['error', { ignoreLastCallback: true }],
      // `.finally()` genuinely terminates a chain; without this the default
      // (catch-only) flags chains that already handle errors via `.catch()`.
      'promise/catch-or-return': ['error', { terminationMethod: ['catch', 'finally'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Tests legitimately use `any` to reach into component internals
    // (`(el as any)._privateField`) and to build partial mocks of large HA
    // objects. The "avoid any in shipped code" intent does not apply here, and
    // tsc still type-checks the specs.
    files: ['**/*.{test,spec}.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettierConfig,
];
