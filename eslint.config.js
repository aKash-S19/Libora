const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**', '.expo/**', '.claude/**', 'assets/**', 'package-lock.json', '.git/**'],
  },
  ...expoConfig,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
]);
