const webpack = require('webpack');

module.exports = {
  entry: './src/slp.js',
  output: { filename: 'dist/slp.min.js' },
  module: {
    rules: [
      {
        test: /.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: true,
      compress: {
        screw_ie8: true,
        unused: true,
        dead_code: true,
      },
      mangle: {
        screw_ie8: true,
      },
      output: {
        screw_ie8: true,
      },
    }),
  ],
};