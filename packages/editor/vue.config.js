const path = require('path');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

function resolve(dir) {
  return path.join(__dirname, '.', dir);
}

module.exports = {
  // VUE Cli 相关的配置
  configureWebpack: {
    devtool: 'inline-source-map',
    resolve: {
      extensions: ['.js', '.vue', '.json', '.ts'],
      alias: {
        vue$: 'vue/dist/vue.esm.js',
        '@': resolve('src'),
      },
    },
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.(js|vue)$/,
          loader: 'eslint-loader',
          exclude: /node_modules/,
        },
      ],
    },
    plugins: [new MonacoWebpackPlugin()],
  },
  css: {
    loaderOptions: {
      less: {
        // If you are using less-loader@5 please spread the lessOptions to options directly
        modifyVars: {
          'primary-color': '#02b875',
          'text-selection-bg': '#d8d8dc',
          'text-color-inverse': 'inherit',
        },
        javascriptEnabled: true,
      },
    },
  },
  devServer: {
    proxy: 'http://localhost:8000',
  },
};
