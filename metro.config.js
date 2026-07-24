const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for tflite files
config.resolver.assetExts.push('tflite');

// Enable worklets support
config.transformer.unstable_allowRequireContext = true;


module.exports = config;