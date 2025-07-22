const webpack = require('webpack');

module.exports = function override(config, env) {
  // Exclude mock files from the build
  config.module.rules.forEach(rule => {
    if (rule.oneOf) {
      rule.oneOf.forEach(loader => {
        if (loader.test && loader.test.toString().includes('tsx?')) {
          loader.exclude = [
            /node_modules/,
            /__mocks__/,
            /__tests__/,
            /\.test\.(ts|tsx)$/,
            /\.spec\.(ts|tsx)$/,
            /setupTests\.ts$/
          ];
        }
      });
    }
  });

  // Existing polyfills for crypto and streams
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    assert: require.resolve('assert'),
    buffer: require.resolve('buffer'),
    process: require.resolve('process/browser'),
    path: false,
    fs: false,
    os: false,
    util: false,
    url: false,
    zlib: false,
    http: false,
    https: false,
  };
  
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ];
  
  if (env === 'production') {
    // Set relative paths for static hosting
    config.output.publicPath = './';
    
    // Note: SubresourceIntegrityPlugin can be added later if needed
    
    // Optimize chunk splitting
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        },
        monaco: {
          test: /[\\/]node_modules[\\/]monaco-editor/,
          name: 'monaco-editor',
          priority: 20
        }
      }
    };
  }

  config.ignoreWarnings = [
    /Failed to parse source map/,
    /Critical dependency: the request of a dependency is an expression/,
  ];
  
  return config;
};