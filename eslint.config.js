import pluginTypescript from '@typescript-eslint/eslint-plugin'
import parserTypescript from '@typescript-eslint/parser'
import configPrettier from 'eslint-config-prettier'
import pluginImport from 'eslint-plugin-import'
import pluginPreferArrow from 'eslint-plugin-prefer-arrow'
import pluginPrettier from 'eslint-plugin-prettier'
import pluginReact from 'eslint-plugin-react'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const off = 0
const warn = 1

export default tseslint.config([
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: parserTypescript,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
      },
      globals: globals.browser,
    },
    plugins: {
      prettier: pluginPrettier,
      '@typescript-eslint': pluginTypescript,
      'prefer-arrow': pluginPreferArrow,
      import: pluginImport,
      react: pluginReact,
    },
    rules: {
      ...configPrettier.rules,
      ...pluginTypescript.configs.recommended.rules,
      ...pluginReact.configs.recommended.rules,

      quotes: [warn, 'single', { avoidEscape: true }],

      // Common
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unnecessary-condition': warn,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // React
      'react/react-in-jsx-scope': off,
      'react/self-closing-comp': warn,
      'react/jsx-fragments': off,
      'react/button-has-type': warn,

      // Must use arrow functions
      'prefer-arrow/prefer-arrow-functions': [
        warn,
        {
          disallowPrototype: true,
          singleReturnOnly: false,
          classPropertiesAllowed: false,
        },
      ],
      'prefer-arrow-callback': [warn, { allowNamedFunctions: true }],
      'func-style': [warn, 'expression', { allowArrowFunctions: true }],

      // Restrict export default
      'import/no-default-export': warn,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
])
