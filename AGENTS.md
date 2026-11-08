# Biz3

Biz 是 PC、Android Web APP、iOS Web APP 三端共用的 UI 与业务逻辑；原生壳只提供平台能力，Bridge 只负责通信。架构见 README。

## 改动范围

- 任何改动三端同时生效：确认 PC、Android、iOS 都不受影响，包括按壳环境判断的分支。
- Biz 发布即生效，壳需要用户更新：依赖新 Bridge 接口时，要考虑壳尚未更新的情况。
- 只维护 PC、Android Web APP、iOS Web APP。旧版原生 APP 不再新增兼容；已有的兼容代码保留不删（如 `biz3utils.js` 的 `iOSHandler` / `AndroidHandler`）。

## 约定

- 与原生通信统一走 `src/services/appBridge.js`，Android 与 iOS 接口一致，业务代码不区分平台。
- 新增的变量名和注释不出现 Android / iOS 等平台字样，用 APP 级命名（如 `APP_IOT_HISTORY_PREFIX`），按平台取值集中在 `appBridge.js` 的 `appShells`。已有标识符（如 `isAndroidShell`）不顺手改名。
- 本仓库推送 master 后同步到公开仓库：新增含密钥或内部配置的文件时，同一提交中在 `.github/workflows/sync-to-public.yml` 加排除规则。

## 验证

```bash
yarn lint
yarn check-format
```

BLE、扫码、NFC 等原生能力需在 Android / iOS 壳中验证。
