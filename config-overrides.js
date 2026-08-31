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

// KVS webrtc 的 npm 包发布了 lib/*.js 却没随包带 src/*.ts，source-map-loader
// 找不到对应源码映射就每次编译刷一堆告警。纯噪音，不影响功能。
// 只按"这个包 + Failed to parse source map"精确过滤——我们自己代码里真出源码
// 映射问题时照样会报出来，不会被一起吞掉。
const ignoreKvsSourceMapWarnings = (config) => {
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    (warning) => {
      const msg = warning?.message || '';
      const res = warning?.module?.resource || '';
      return /Failed to parse source map/.test(msg) && /amazon-kinesis-video-streams-webrtc/.test(res + msg);
    },
  ];
  return config;
};
plugins.push(ignoreKvsSourceMapWarnings);

if (process.env.REMOVE_CONSOLE === 'true') {
  plugins.push(addBabelPlugin(['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }]));
}

module.exports = override(...plugins);
