# qflarebot-plugin-hello

运行在 Cloudflare Workers 上的 QQ 机器人插件示例，也是 [QFlareBot](https://github.com/QFlareBot/QFlareBot) 框架"外部插件能被加载"这条链路的验证用例。

## 开发

`@qqbot/sdk` 与 `@qqbot/plugin-cli` 不发 npm，从 QFlareBot 源码构建。把 QFlareBot 克隆到本仓库旁边（`devDependencies` 里是 `file:../QFlareBot/packages/*`）：

```bash
git clone https://github.com/QFlareBot/QFlareBot
(cd QFlareBot && pnpm install --filter '@qqbot/plugin-cli...' && pnpm --filter '@qqbot/plugin-cli...' build)
cd qflarebot-plugin-hello    # 与 QFlareBot 同级
npm install
```

CI 按同样的布局拉取并构建 QFlareBot。机器人的构建机不装 `devDependencies`，编译时一律用机器人仓库自己那一份 SDK。

- `src/index.ts`：插件入口，必须默认导出 `definePlugin(...)`。示例包含命令 `/hello`、`/count`（生成器连续回复）、`/menu`（带按键）、`/remember`（写 KV），一个正则 `ping`、一个 `qq.group.robot_added` 事件、一个回调按键 `confirm`，以及面板据以渲染配置表单的 `configSchema`。
- 插件不 import 运行时，所有能力（配置、KV、D1、日志、OpenAPI）都从处理器参数的 `ctx` 上取。
- **可以用第三方包**：写进 `dependencies`，并把更新后的 `package-lock.json` 一起提交。机器人的构建机按 lockfile 安装（只装 `dependencies`、不跑安装脚本）并打进产物；有依赖没 lockfile 会构建失败。包必须能在 Workers 里跑（不依赖 Node 内置模块、不用 `eval`）。`@qqbot/sdk` 放 `devDependencies`，其他 `@qqbot/*` 不许 import；`cloudflare:workers` 等 Workers 内建模块可以用，构建时保留为外部依赖。
- 本仓库以 MIT 发布；复制它开新插件时，把 `LICENSE` 的署名和 `package.json` 的 `license` 换成你自己的。

### 命名约定

仓库名 = 包名 = `qflarebot-plugin-<name>`（或 `@scope/qflarebot-plugin-<name>`），`definePlugin({ name })` 用**去掉前缀的短名**：

| package.json 的 `name` | `definePlugin({ name })` |
| --- | --- |
| `qflarebot-plugin-hello` | `hello` |
| `@me/qflarebot-plugin-hello` | `hello` |

`name` 只能用小写字母、数字、`-`、`_`，因为它同时是路由前缀 `/p/<name>/`、KV 前缀 `p:<name>:`、D1 表前缀 `p_<name>_`，也是安装时的撞名检测键。`qqbot-plugin build` 会校验这层关系，不一致直接报错。

改名前的 `qqbot-plugin-<name>` 前缀照样认。不带前缀也能构建，但那样包名必须与 `name` 完全相同。

### 关于 `permissions`

`permissions` **只用于安装前向用户展示**，运行时不做任何强制。插件与框架核心跑在同一个 isolate 里，无法沙箱——声明 `['kv']` 的插件照样拿得到 `ctx.db`。把它当作"告知"，不是"安全边界"。

## 测试

```bash
npm test          # vitest
npm run typecheck # tsc --noEmit
```

`@qqbot/sdk/testing` 提供 `runCommand`、`createMockSession`、`createMockContext` 等工具，不需要运行时就能直接驱动处理器并断言回复，见 `src/index.test.ts`。

## 构建与声明清单

```bash
npm run build     # 等价于 qqbot-plugin build
```

产物在 `dist/`：

- `dist/plugin.js`：单文件 ESM，已把 `@qqbot/sdk` 与第三方依赖打进去，只保留 `cloudflare:*` 为外部 import；
- `dist/plugin.js.map`：source map；
- `dist/manifest.json`：从插件定义抽出的纯数据清单（名称、版本、命令、事件、配置 Schema 等），版本取自 `package.json`。

`dist/` 不提交。仓库根目录的 `manifest.json` 是**声明清单**：机器人安装前读它展示权限、校验撞名与依赖，全程不执行插件代码；构建时再拿它与从源码抽出的清单比对，不一致就构建失败。改了插件定义后运行 `npm run sync`（构建 + 把 dist/manifest.json 复制到根目录）并提交，CI 会校验两者一致，过期即失败。

只想校验定义而不打包时运行 `npx qqbot-plugin validate`。

## 发布（源码分发）

插件以**源码**分发：机器人在构建时按 commit 拉取源码、编译并校验声明清单，不需要发布 npm，也不需要构建制品。

1. 改 `package.json` 的 `version`；
2. `npm run sync` 同步声明清单，随代码一起提交；
3. 推到 `main`：面板安装与检查更新拿的都是它的最新提交。

CI（`.github/workflows/ci.yml`）在每次 push 时构建、校验声明清单一致性并跑测试；打 `v*` tag 时额外校验 tag 与 version 一致。

## 安装到机器人

面板 → 插件 → 安装插件，粘贴 `https://github.com/clown145/qflarebot-plugin-hello`：面板解析出 `main` 的最新 commit，先预检（权限、命令重名等一次列出），确认后写进清单并触发一次构建，上线后插件出现在列表里。等价的管理 API（加 `"dryRun": true` 只预检不写）：

```bash
curl -X POST https://<机器人域名>/admin/manifest/plugins \
  -H "Authorization: Bearer <管理密钥>" -H "content-type: application/json" \
  -d '{"source": "git:clown145/qflarebot-plugin-hello@<完整commit>"}'
```

安装记录钉在具体 commit 上，推了新代码不会自动生效：在面板插件页点「检查全部更新」，勾选后点「更新选中」，几个插件一起更新也只构建一次。构建失败时线上保持上一次成功的版本，失败原因显示在插件页「未上线的改动」里，可以在那里卸载或撤销。
