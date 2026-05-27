const { override, addBabelPlugin, addWebpackAlias } = require('customize-cra');
const path = require('path');

const plugins = [
  addWebpackAlias({
    '@': path.resolve(__dirname, 'src'),
    '@context': path.resolve(__dirname, 'src/context'),
    '@constants': path.resolve(__dirname, 'src/constants'),
    '@hooks': path.resolve(__dirname, 'src/hooks'),
    '@components': path.resolve(__dirname, 'src/components'),
    '@pages': path.resolve(__dirname, 'src/pages'),
    '@personal': path.resolve(__dirname, 'src/pages/personal'),
    '@biz': path.resolve(__dirname, 'src/pages/biz'),
    '@assets': path.resolve(__dirname, 'src/assets'),
    '@utils': path.resolve(__dirname, 'src/utils'),
    '@api': path.resolve(__dirname, 'src/api'),
  }),
];

if (process.env.REMOVE_CONSOLE === 'true') {
  plugins.push(addBabelPlugin(['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }]));
}

module.exports = override(...plugins);
