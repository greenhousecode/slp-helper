const webpack = require('webpack')
const path = require('path')

module.exports = {
  entry: './src/slp.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'slp.min.js'
  },
  module: {
    rules: [{ loader: 'babel-loader' }]
  },
  plugins: [ new webpack.optimize.UglifyJsPlugin() ]
}
