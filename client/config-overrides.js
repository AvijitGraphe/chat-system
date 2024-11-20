const path = require('path');

module.exports = {
  webpack: function(config, env) {
    config.output.path = path.resolve(__dirname, '../backend/build');
    return config;
  },
  paths: function(paths, env) {
    paths.appBuild = path.resolve(__dirname, '../backend/build');
    return paths;
  }
};
