const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { DefinePlugin } = require('webpack')
const Dotenv = require('dotenv-webpack')

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production'
  
  // Загружаем переменные окружения вручную для DefinePlugin
  // dotenv-webpack загрузит их автоматически, но для DefinePlugin нужно их явно прочитать
  require('dotenv').config({ path: './.env' })

  return {
    entry: './src/main.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].js',
      chunkFilename: isProduction ? 'js/[name].[contenthash].chunk.js' : 'js/[name].chunk.js',
      assetModuleFilename: 'assets/[name].[hash][ext]',
      publicPath: './',
      clean: true
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|jpe?g|gif|svg|ico)$/i,
          type: 'asset/resource'
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource'
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        inject: 'body',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true
        } : false
      }),
      new Dotenv({
        path: './.env',
        safe: false,
        systemvars: true,
        silent: false
      }),
      new DefinePlugin({
        'process.env.GOOGLE_CLIENT_ID': JSON.stringify(process.env.GOOGLE_CLIENT_ID || ''),
        'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(process.env.GOOGLE_CLIENT_SECRET || ''),
        'process.env.GOOGLE_REDIRECT_URI': JSON.stringify(process.env.GOOGLE_REDIRECT_URI || '')
      })
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist')
      },
      port: 3000,
      host: '0.0.0.0', // Позволяет доступ из локальной сети
      open: true,
      hot: true,
      historyApiFallback: true,
      compress: true
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10
          }
        }
      }
    }
  }
}
