/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  root: true,
  extends: ['plugin:vue/vue3-recommended', 'eslint:recommended', '@vue/eslint-config-typescript/recommended'],
  parserOptions: { ecmaVersion: 'latest' },
  ignorePatterns: ['dist', '.eslintrc.cjs', 'tailwind.config.js', 'postcss.config.js'],
  rules: {
    'vue/multi-word-component-names': 'off',
    // template formatting is left to the editor; these rules only police line wrapping
    'vue/max-attributes-per-line': 'off',
    'vue/singleline-html-element-content-newline': 'off',
    'vue/multiline-html-element-content-newline': 'off',
    'vue/html-self-closing': 'off',
    'vue/html-indent': 'off',
    'vue/first-attribute-linebreak': 'off',
    'vue/html-closing-bracket-newline': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
  },
};
