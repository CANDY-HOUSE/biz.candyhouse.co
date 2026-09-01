#!/usr/bin/env node
/*
 * 每次 `yarn dev` 前复刻 Amplify 的 preBuild，把"只在 Amplify 挂"的问题挪到本地。
 *
 * Amplify preBuild 实际做的是：
 *   nvm use 20 && yarn install --frozen-lockfile --prefer-offline
 * 且其 yarn 对 engines 强校验（某包 engines.node 不满足就 "Found incompatible
 * module" 直接让构建失败——这次就是 KVS 带的 jsdom@30 要 node 22+）。
 *
 * 这里做两件事：
 *   1. 提醒 node 主版本是否与 Amplify(20) 一致——引擎兼容性判定依赖 node 版本，
 *      版本不同（比如本地 node 22）本地会放行、Amplify(node 20) 却挂。
 *   2. 跑 `yarn install --frozen-lockfile --check-engines --prefer-offline`：
 *      锁文件是否与 package.json 一致 + 所有包的引擎是否兼容当前 node。
 * 任一不过就退出非 0，yarn dev 随之中止。
 */
const { execSync } = require('child_process');

const AMPLIFY_NODE_MAJOR = 20;
const major = parseInt(process.versions.node.split('.')[0], 10);
if (major !== AMPLIFY_NODE_MAJOR) {
  console.warn(
    `\n[verify-prebuild] ⚠ 当前 node v${process.versions.node}，Amplify 用 node ${AMPLIFY_NODE_MAJOR}.x。\n` +
      `  引擎兼容性判定依赖 node 版本，版本不一致时本地校验结果可能和线上不同。\n` +
      `  建议切到 node ${AMPLIFY_NODE_MAJOR}（例如 nvm use ${AMPLIFY_NODE_MAJOR}，见 .nvmrc）。\n`
  );
}

console.log('[verify-prebuild] 复刻 Amplify preBuild：yarn install --frozen-lockfile --check-engines --prefer-offline');
try {
  execSync('yarn install --frozen-lockfile --check-engines --prefer-offline', {
    stdio: 'inherit',
  });
  console.log('[verify-prebuild] ✓ preBuild 检查通过，启动 dev\n');
} catch (e) {
  console.error(
    '\n[verify-prebuild] ✗ preBuild 检查失败 —— 这在 Amplify 上同样会让构建挂掉。\n' +
      '  先解决上面的报错再启动：\n' +
      '    · 锁文件不一致 → 跑一次 `yarn install` 把 yarn.lock 更新上；\n' +
      '    · 引擎不兼容(Found incompatible module) → 用 resolutions 钉到兼容版本，\n' +
      '      或换成 Amplify 的 node 版本。\n'
  );
  process.exit(1);
}
