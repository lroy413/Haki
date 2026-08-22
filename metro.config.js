// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build ships wa-sqlite as a .wasm binary and imports it
// directly. Metro does not treat .wasm as an asset by default, so the web
// bundle fails to resolve it without this.
config.resolver.assetExts = [...new Set([...config.resolver.assetExts, 'wasm'])];

module.exports = config;
