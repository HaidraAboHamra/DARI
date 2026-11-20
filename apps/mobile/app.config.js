// Extends app.json. Test builds (EXPO_PUBLIC_SERVER_SWITCH=1) may talk to a plain-HTTP
// server on a LAN or staging box; store builds stay HTTPS-only.
module.exports = ({ config }) => {
  const testBuild = process.env.EXPO_PUBLIC_SERVER_SWITCH === '1';
  return {
    ...config,
    plugins: [...config.plugins, ['expo-build-properties', { android: { usesCleartextTraffic: testBuild } }]],
  };
};
