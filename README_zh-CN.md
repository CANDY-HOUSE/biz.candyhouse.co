# Biz3

[日本語](README.md) | [简体中文](README_zh-CN.md) | [English](README_en.md)

Biz3 是提供 PC 管理页面和 Web App 业务界面的 React 项目。Web App 通过 bridge 调用宿主的蓝牙及系统能力。

**Biz 负责业务逻辑，Web App 宿主负责原生能力，Bridge 负责通信。**

```mermaid
flowchart LR
  PC[PC browser] --> Biz[Biz3 React UI]
  App[Web App host] --> Biz
  Biz <-->|Bridge| Native[Native capabilities]
  Biz <-->|WebSocket| Cloud[Cloud services]
```

## 开发

Node.js 20（`.nvmrc`）、Yarn 1.x。发布构建：`yarn build`。

```bash
nvm use
yarn install --frozen-lockfile
yarn dev
```

普通浏览器默认使用 PC 模式；App 页面预览：`http://localhost:3000/?appHome=1&fromType=app`。BLE、扫码及 NFC 需在 Web App 宿主中验证。

## 环境

APP 通过页面地址配置指定入口。页面入口与 Biz 云端服务配置相互独立。

- [正式](https://biz.candyhouse.co/)

云端连接配置见 `src/env_config.js` 和 `src/aws-exports.js`。当前 `env_config.js` 选择 production；部署分支或页面 URL 不会自动切换这些配置。切换页面域名时需同步配置 bridge 信任来源与 CORS；新域名首次使用需要联网加载页面。

## 启动与缓存

```mermaid
flowchart LR
  Page[Online or cached page] --> Local[Local device data]
  Local --> List[Shared device list]
  Page --> Session[Session]
  Session --> Socket[WebSocket]
  Socket --> Remote[Online device data]
  Remote --> List
  Remote --> DB[Native persistence]
  List --> BLE[Native BLE]
```

宿主只加载一次入口 `/?appHome=1&fromType=app`，之后由 Biz 的 SPA 路由切换页面，不再按页面单独加载 URL。

首页优先通过 bridge 读取本地设备，使用同一套列表展示本地和线上数据。线上完整列表到达后更新界面，并通知宿主更新本地数据。完整钥匙支持本地 BLE 操作；云端操作、注册和受限钥匙签名需要网络。

游客通过 Cognito 匿名凭证签名 `POST /web_route`，获取会话 token 后建立 WebSocket。

页面缓存仅在 Web App 宿主且浏览器支持 Service Worker 时注册，见 `src/services/appPageCache.js`；使用 HTTPS 或 localhost 等安全上下文，普通 PC 浏览器和仅添加 `appHome=1` 的预览不会主动注册。缓存只保存公共页面资源，不包含 API 响应、token 或钥匙。HTML 优先从网络加载，资源保存成功后更新离线入口，并按 `asset-manifest.json` 删除旧版本资源；断网时使用已缓存页面。首次使用、切换域名或清除缓存后，需要联网加载一次。

## 代码入口

| Path                                                            | Responsibility                                                    |
| --------------------------------------------------------------- | ----------------------------------------------------------------- |
| src/components/AppBootstrap.js                                  | Session startup + offline fallback                                |
| src/components/AppHomeRuntime.js                                | Cloud/BLE events, key handoff, navigation                         |
| src/components/AppOfflineDevices.js                             | Local data + shared device list + BLE                             |
| src/services/appBridge.js                                       | Trusted native bridge requests                                    |
| src/services/appSession.js                                      | Web/legacy/guest session selection                                |
| src/services/appOperations.js                                   | Existing socket app-operation adapter                             |
| src/services/deviceService.js + src/services/blePresentation.js | App mode, native device events and shared BLE status presentation |
| src/services/appPageCache.js + public/app-worker.js             | Automatic public page cache                                       |
| src/components/BackButton.js                                    | Shared PC and Web App back button                                 |
| src/api + src/websocket                                         | Existing business requests and socket lifecycle                   |
| src/i18n                                                        | ja / en / zh-CN / zh-TW UI strings                                |

## Toast

所有 toast 统一使用公共的 `GSnackbar`（`src/components/SnackBar.js`），不要新增其他实现。通过 `GlobalStateContext` 的 `setSnackbarValue` 调用：

```js
const { setSnackbarValue } = useContext(GlobalStateContext);
setSnackbarValue({ open: true, msg: t('...') });
```

`severity: 'error'` 的通知不会显示，只记录日志（见 `src/services/operationFailure.js`）。

## App 标题栏

App 页面的标题栏统一使用公共组件 `PageHeader`（`src/components/PageHeader.js`），不在页面里各自实现。PC 不在此范围内，保持现有布局。

```js
<PageHeader onBack={() => navigate(-1)} title={deviceName} action={<IconButton>...</IconButton>} />
```

- `title`：紧挨返回箭头，用于纯文字标题。字符串按 h3 显示，点击也会返回。
- `centerTitle`：位于箭头与右侧按钮之间的中间，用于带数字（如数量）或可编辑的标题。
- 传 `EditableText` 等元素时使用 `pageHeaderTitleStyle`。
- `action`：右侧按钮。
- 自带标题栏的页面需加入 `src/services/appNavigation.js` 的 `appPageHeaderPaths`（会隐藏公共返回栏 `AppTopBar`）。
- App 中文档本身不滚动，页面在 `AppFrame`（`src/App.js`）内滚动。WebView 在文档滚动时会连同 fixed 元素一起移动，因此不要依赖 `window` 的滚动。
