module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
    env: {
      production: {
        // SECURITY: Strip `console.log/info/debug/trace` in production
        // bundles so we never accidentally leak user data (session IDs,
        // workout payloads, Supabase error bodies, etc.) into Logcat or
        // device-side log inspection tools. We keep `console.error` and
        // `console.warn` so production crash reports still surface
        // useful diagnostics — anything passed to those calls MUST NOT
        // contain PII or raw Supabase error payloads (see audit HIGH
        // item re: Supabase error leakage).
        plugins: [
          ['transform-remove-console', { exclude: ['error', 'warn'] }],
        ],
      },
    },
  };
};
