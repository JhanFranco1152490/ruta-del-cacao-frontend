import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/api/client.ts', 'src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Usa apiFetch de @/lib/api/client.' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'fetch',
          message: 'Usa apiFetch de @/lib/api/client.',
        },
        {
          object: 'globalThis',
          property: 'fetch',
          message: 'Usa apiFetch de @/lib/api/client.',
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Salida generada por `pnpm test:coverage`; no es código del proyecto.
    'coverage/**',
  ]),
]);

export default eslintConfig;
