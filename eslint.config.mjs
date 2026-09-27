import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Prettier owns formatting; this turns off ESLint rules that would conflict with it
  prettier,
  {
    rules: {
      'prefer-const': 'error',
      'no-var': 'error',
      // Allows the `x != null` idiom, which covers both null and undefined
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    // React Compiler rules from react-hooks v7. The app doesn't use the compiler,
    // so these are advisory until the flagged effects and refs are reworked.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'archive/**',
    'python/**',
    'skills/**',
    'docs/**',
    '.superpowers/**',
    '.worktrees/**',
    '.venv/**',
    '.claude/**',
  ]),
]);
