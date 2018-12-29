const OneToOnePlugin = require('../index')
const webpack = require('webpack')
const path = require('path')

const CWD = __dirname

const webpackConfig = {
  optimization: {
    minimize: false
  },

  context: path.resolve(CWD, '../test-project/src'),
  entry: {
    index: path.resolve(CWD, '../test-project/src/index.js')
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(CWD, '../test-project/dist'),
    libraryTarget: 'umd'
  },

  devtool: 'source-map',

  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      }
    }]
  },

  plugins: [
    new OneToOnePlugin()
  ]
}

describe('plugin', () => {
  it('webpack transpile source code', (done) => {
    webpack(webpackConfig, (err) => {
      if (err) return done(err)
      done()
    })
  })
})
