## 简介

- 项目名： Biz3
- 计划改进：
  - API Gateway 使用 WebSocket 替代 REST。 好处： 可以即时双向通信， 取消 IoT 权限， 不用依赖订阅 MQTT 主题或者查询数据库来获取实时状态。
  - 刷卡机不再使用 影子， 改用 DynomaDB 处理所有的数据操作。 好处： 节省 IoT 影子的费用。
  - 支持多语言（国际化和本地化）， 依赖： react-i18next 、 react-intl 等。 好处： 方便翻译成不同的语言版本。
  - JS 改为 TS， 逐步修改后， 从 src\apis 目录， 迁移到 src\hooks 目录。 目标：批量解决 ESLint 在 'react/prop-types': 'warn' 规则下的大量报错

## 安装调试

- 1. 安装 Node.js LTS 版本 20.18.1
  - 参考网址： https://nodejs.org/en/download/
  - 根据需要在当前执行命令的 powershell 窗口里设置代理服务器的环境变量。(深圳办公室需要VPN设置)

```sh
# 打开 PowerShell 作为管理员运行

# 添加或更新 HTTP_PROXY 环境变量
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' -Name 'HTTP_PROXY' -Value 'http://127.0.0.1:7890'

# 检查HTTP_PROXY 环境变量设置是否生效
Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' -Name 'HTTP_PROXY'

# 添加或更新 HTTPS_PROXY 环境变量
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' -Name 'HTTPS_PROXY' -Value 'http://127.0.0.1:7890'

# 检查 HTTPS_PROXY 环境变量设置是否生效
Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' -Name 'HTTPS_PROXY'

# 刷新环境变量而不重启计算机
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# 安装 yarn
# 确保 Node.js 和 npm 已安装
npm install -g yarn

# 安装依赖包
yarn install --frozen-lockfile

# 安装 gatsby
yarn add gatsby-cli --dev # 本地安装 gatsby-cli
$env:Path += ";$(yarn global bin)"
gatsby --version

# 构建项目
yarn cross-env REMOVE_CONSOLE=true gatsby build

```

- 2. 运行命令： yarn install --frozen-lockfile
- 3. 运行命令： yarn dev
- 4. 打开浏览器， 输入网址： http://localhost:8080/
- 5. 运行命令： yarn build
- 6. 成功后， 打开项目根目录， 运行命令： yarn deploy
- 7. 成功后， 打开浏览器，输入： http://localhost:9000/

## 部署

- 参考网址： https://ap-northeast-1.console.aws.amazon.com/amplify/apps/duzoe8x2qcf7y/build
- amplify.yml 文件用于配置 amplify cli, AWS Amplify 会自动根据 amplify.yml 文件执行部署步骤。

### github 仓库同步

- 在AWS Amplif 部署时，如果选择组织的 github 仓库， 则需要 组织的 owner 授权。
- 提交代码前， 请先运行： yarn prepare， 安装 huskey Git hooks

## 常见问题及处理方法

### `Stripe.js`

- 是一家提供在线支付处理服务的公司。
- 它提供了一系列 API 和工具，帮助企业在其网站和应用程序中集成支付功能。
- `Stripe` 的服务包括处理信用卡支付、订阅管理、发票生成、反欺诈保护等。

### aws-amplify

- AWS Amplify 是一个用于构建全栈应用程序的开发平台，专门设计来帮助开发者快速构建、部署和管理现代 Web 和移动应用。
- 托管后端：支持无服务器架构，包括身份验证、数据存储（通过 Amazon DynamoDB）、文件存储（通过 Amazon S3）和 API（通过 AWS Lambda 和 Amazon API Gateway）。
- Biz3 使用它主要用于托管后端。
- 参考链接： https://docs.amplify.aws/react/start/quickstart/

### Gatsby

- Gatsby 是一个基于 React 的静态网站生成器(Static Site Generator, SSG), 它允许开发者使用现代前端技术来构建快速、动态的网站和应用。

```sh
yarn add gatsby@latest
```

#### npm 的问题 （已废弃使用 npm， 请使用 yarn ）

- 原因： npm 处理依赖没有 yarn 灵活， 需要自己处理 --legacy-peer-deps 等command line 参数。

参考网址： https://www.gatsbyjs.com/docs/reference/release-notes/migrating-from-v4-to-v5/#handling-deprecations

> Please note: If you use npm 7 or higher you’ll want to use the --legacy-peer-deps option when following the instructions in this guide

#### Gatsby 报错的处理

```sh
 ERROR  UNKNOWN

(node:5152) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)

```

- 原因： 这是因为 Node.js 21.x 版本中 punycode 模块被弃用，需要降级版本。 参考： https://github.com/yarnpkg/yarn/issues/9005
- 分析： punycode 可能是在 Gatsby 或其依赖的某个模块内使用的， 从内核改为 userland modules 后， 还需要修改对应的模块代码， 不方便维护。
- 参考： https://github.com/gatsbyjs/gatsby/issues/39019, https://github.com/mathiasbynens/punycode.js#installation
- 采用的解决方法：
  - 安装 Node.js 的包管理器，例如 https://github.com/coreybutler/nvm-windows/releases
  - 切换到 LTS 的 Node.js 20.x 版本
  - 安装好 nvm-windows 后，在 windows 的 powershell 里，参考命令如下：

```sh
nvm list available
nvm install 20.18.1
nvm use 20.18.1
node -v

```

#### 使用 Clash 代理翻墙时, 需要设置代理, 防止 nvm 报错

- 报错信息

```sh
PS C:\Users\13316> nvm install 20.18.0

Could not retrieve https://nodejs.org/dist/latest/SHASUMS256.txt.


Get "https://nodejs.org/dist/latest/SHASUMS256.txt": net/http: TLS handshake timeout
PS C:\Users\13316> nvm install 20.18.0
```

- 分析： 这是网络超时。 因为 深圳的网络， 有墙。 Clash 打开全局代理后， 还需要在当前执行命令的 powershell 窗口里设置代理的环境变量。才能正常访问 nodejs.org
- 解决方法

```sh
$proxy = "http://127.0.0.1:7890"
[System.Environment]::SetEnvironmentVariable("HTTP_PROXY", $proxy, [System.EnvironmentVariableTarget]::Process)
[System.Environment]::SetEnvironmentVariable("HTTPS_PROXY", $proxy, [System.EnvironmentVariableTarget]::Process)

# 验证设置是否成功
echo $env:HTTP_PROXY
echo $env:HTTPS_PROXY
```

#### xlsx

- 问题：

```log
xlsx  *
Severity: high
Prototype Pollution in sheetJS - https://github.com/advisories/GHSA-4r6h-8v6p-xvw6
SheetJS Regular Expression Denial of Service (ReDoS) - https://github.com/advisories/GHSA-5pgg-2g8v-p4x9
No fix available
node_modules/xlsx
```

- 参考解决方案： https://docs.sheetjs.com/docs/getting-started/installation/nodejs

```sh
yarn remove xlsx
yarn add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

### yarn lintfix 报错

```sh
PS E:\code\biz> yarn lintfix
yarn run v1.22.22
$ eslint . --fix
=============

WARNING: You are currently running a version of TypeScript which is not officially supported by @typescript-eslint/typescript-estree.

You may find that it works just fine, or you may not.

SUPPORTED TYPESCRIPT VERSIONS: >=3.3.1 <5.2.0

YOUR TYPESCRIPT VERSION: 5.7.2

Please only submit bug reports when using the officially supported version.

=============

# 查看 typescript 的版本

PS E:\code\biz> yarn info typescript versions

# 解决方法： 降级 typescript 版本

PS E:\code\biz> yarn add typescript@5.1.6 --dev
```
