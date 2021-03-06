const path = require('path');

module.exports = {
  entry: './src/slp.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'slp.min.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
};
