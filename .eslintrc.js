/* global module */
module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  plugins: ['prettier'],
  extends: ['eslint:recommended', 'google', 'prettier'],
  rules: {
    'prettier/prettier': ['warn'],
    'prefer-template': ['warn'],
    'require-jsdoc': ['off'],
    'no-debugger': ['warn'],
    'brace-style': ['error', '1tbs', {allowSingleLine: true}],
    eqeqeq: ['error', 'always'],
    curly: ['error', 'multi-or-nest', 'consistent'],
  },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
};
