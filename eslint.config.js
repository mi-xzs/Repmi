// ESLint flat config — https://docs.expo.dev/guides/using-eslint/
// Run with `npm run lint`. Prettier owns formatting; eslint-config-prettier
// disables ESLint's stylistic rules so the two don't fight.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    rules: {
      // eslint-config-expo@56 ships the React Compiler hook rules
      // (eslint-plugin-react-hooks v6) at "error". Two of them produce
      // false positives for idiomatic React Native animation code that is
      // correct here, so we don't block on them:
      //   • refs — `useRef(new Animated.Value(0)).current` read during render
      //     is the standard RN Animated pattern.
      //   • immutability — Reanimated shared `.value = withSpring(...)` writes
      //     are Reanimated's official API, not a mutation bug.
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      // Real but noisy — keep them visible as warnings rather than failing
      // the lint, so we can address them deliberately over time.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      // Apostrophes in JSX text are safe in React Native <Text> (this rule
      // guards against HTML entity issues on the web, which don't apply here).
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'ios/*', 'android/*', 'public/*'],
  },
]);
