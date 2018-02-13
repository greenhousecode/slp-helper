const webpack = require('webpack')
const path = require('path')

module.exports = {
  entry: './src/slp.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'slp.min.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'src'),
        loader: 'babel-loader'
      }
    ]
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        screw_ie8: true,
        unused: true,
        dead_code: true
      },
      mangle: {
        screw_ie8: true
      },
      output: {
        screw_ie8: true
      }
    })
  ]
}
