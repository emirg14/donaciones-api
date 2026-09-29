const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['coverage/**', 'reports/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: { ...globals.node } },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'prefer-const': 'error'
    }
  },
  {
    // Puntos de entrada del servidor (módulos ES)
    files: ['src/**/*.mjs'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node } }
  },
  {
    // Página web (navegador, módulos ES)
    files: ['public/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.browser } }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.jest } }
  }
];
