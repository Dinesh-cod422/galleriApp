/**
 * Layering is enforced here, not just documented. The architecture survives
 * only if a violating import fails the build.
 */
const DOMAIN_MUST_NOT_IMPORT = [
  {
    group: [
      'react',
      'react-native',
      'react-native/**',
      'react-native-*',
      '@react-native/**',
      '@react-navigation/**',
      '@tanstack/**',
      '@shopify/**',
      '@gorhom/**',
      'zustand',
      'zustand/**',
      '@ds',
      '@ds/**',
      '@infra/**',
      '@app/**',
      '**/data/**',
      '**/presentation/**',
    ],
    message:
      'Domain must stay framework-free and inward-facing: no React/React Native, no libraries, no data or presentation imports. It may only import @core and its own domain files.',
  },
];

module.exports = {
  root: true,
  extends: ['@react-native', 'plugin:import/recommended', 'plugin:import/typescript'],
  plugins: ['import', '@tanstack/query'],
  settings: {
    'import/resolver': {
      typescript: { project: './tsconfig.json' },
      node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    },
  },
  rules: {
    // Cycle detection is delegated to `npm run circular` (madge): it walks the
    // graph once instead of per-file, and unlike import/no-cycle it does not
    // try to parse React Native's Flow sources with the Babel parser.
    'import/no-self-import': 'error',
    // These re-parse dependency source to validate names. TypeScript
    // already proves imports exist, and parsing RN's Flow files fails
    // noisily under the Babel parser.
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',
    'import/namespace': 'off',
    'import/default': 'off',
    '@tanstack/query/exhaustive-deps': 'error',
  },
  overrides: [
    {
      // TS-only rules. Kept off .js config files, which the Babel parser
      // handles and which have no type information.
      files: ['**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/ban-ts-comment': 'error',
      },
    },
    {
      // ── DOMAIN: the innermost circle ────────────────────────────────────
      files: ['src/features/*/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': ['error', { patterns: DOMAIN_MUST_NOT_IMPORT }],
      },
    },
    {
      // ── PRESENTATION: must never reach into its own data layer ──────────
      files: ['src/features/*/presentation/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/data', '**/data/**', '@features/*/data', '@features/*/data/**'],
                message:
                  'Presentation must not import the data layer. Depend on domain types and receive repositories from @app/di.',
              },
              {
                group: ['@react-native-firebase/**', 'firebase/**'],
                message: 'Native/backend SDKs belong in infrastructure and data only.',
              },
            ],
          },
        ],
      },
    },
    {
      // ── CORE: shared, depends on nothing internal ───────────────────────
      files: ['src/core/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@features/**', '@ds', '@ds/**', '@infra/**', '@app/**'],
                message: 'core is the base layer: it may not depend on features, design-system, infrastructure or app.',
              },
            ],
          },
        ],
      },
    },
    {
      // ── DESIGN SYSTEM: knows nothing about the domain ───────────────────
      files: ['src/design-system/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@features/**', '@infra/**', '@app/**'],
                message:
                  'The design system must stay feature-agnostic. If it needs domain knowledge, it belongs in a feature instead.',
              },
            ],
          },
        ],
      },
    },
    {
      // ── NO RAW DESIGN VALUES outside the theme ──────────────────────────
      files: ['src/**/*.{ts,tsx}'],
      excludedFiles: ['src/design-system/theme/**'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6,8})$/]",
            message: 'No raw hex colors. Use semantic theme tokens from @ds.',
          },
          {
            selector: "Property[key.name=/^(fontSize|lineHeight)$/] > Literal",
            message:
              'No hardcoded fontSize/lineHeight. Use the <Text> variants from @ds.',
          },
        ],
      },
    },
    {
      files: ['**/*.test.{ts,tsx}', '**/__tests__/**'],
      rules: { 'no-restricted-imports': 'off', 'no-restricted-syntax': 'off' },
    },
  ],
};
