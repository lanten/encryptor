# 前端架构设计

产品行为以 `plan.md` 为准。前端形态以本文为准。两者冲突时，页面结构、依赖和部署形态按本文，加解密规则仍按 `plan.md`。

本文只做设计，不含实现。

## 与 plan.md 的差异

原先按无构建静态页设计。现改为可扩展的 React 应用，下面四条作废：

- 不再使用单文件 HTML + 原生 `<dialog>`
- 不再把 `hash-wasm` 的 UMD 文件放进 `js/vendor`
- 不再无构建直接上传源码
- 部署产物改为 Vite 的 `dist/`

加解密规则不变：Argon2id 19 MiB / 2 次迭代 / 并行度 1 / 32 字节，AES-256-GCM，`tagLength` 128，编码默认 Hex。

## 技术栈

| 层 | 选择 | 说明 |
| --- | --- | --- |
| 构建 | Vite | 官方静态部署路径，产物是纯静态文件 |
| UI | React + TypeScript | shadcn 组件按 TypeScript 接入 |
| 路由 | `react-router` | 库模式，声明式 `<Routes>`，不使用框架模式 |
| 组件 | shadcn/ui | 组件复制进仓库，不运行时拉取注册表 |
| 样式 | Tailwind CSS v4 + `@tailwindcss/vite` | 跟随当前 shadcn Vite 安装方式 |
| 密钥派生 | `hash-wasm@4.12.0` | 从包导入 `argon2id`，不走 CDN |
| 对称加密 | Web Crypto `AES-GCM` | 不引入第二套加密库 |
| 包管理 | npm | 本机已有，Actions 用 `npm ci` |

不引入 React Router 框架模式、Next.js、状态库或表单库。本页是一次提交的命令式校验，受控输入足够。

shadcn 只装本页会用到的组件：`button`、`input`、`textarea`、`label`、`select`、`dialog`、`card`、`alert`、`separator`。图标用 `lucide-react`，随 shadcn 安装，不手写 SVG 图标库。

## 路由

加密功能单独成页。首页只做入口，方便以后加页面。

| 路径 | 页面 | 职责 |
| --- | --- | --- |
| `/` | 首页 | 工具列表，链到各功能页 |
| `/aes-gcm` | AES-256-GCM | 本功能的全部交互 |

路由用 `HashRouter`，不用 `BrowserRouter`。

GitHub Pages 项目站是 `https://用户.github.io/仓库名/`，且不支持把任意路径回退到 `index.html`。用 History 路由时，刷新 `/aes-gcm` 会 404，还得写 `404.html` 转发，并提前知道仓库名。Hash 路由的页面在 `#` 之后，刷新和深层链接都不依赖服务器，也不把仓库名写进路由。

资源路径仍由 Vite `base` 处理，与路由模式分开。以后若改到自定义域名或用户站根路径，只需把 `HashRouter` 换成带 `basename` 的 `BrowserRouter`，页面组件不用动。

```text
HashRouter
└─ AppShell
   ├─ index        HomePage
   └─ aes-gcm      AesGcmPage
```

导航数据只有一处：`src/app/nav.ts`。首页卡片和顶栏都读它。新增页面时加一条导航、加一个路由组件，不改壳层结构。

密码、明文、密文不进入 URL，也不写 `localStorage`。

## 目录

```text
src/
  main.tsx
  index.css
  app/
    router.tsx
    app-shell.tsx
    nav.ts
  pages/
    home/
      home-page.tsx
    aes-gcm/
      aes-gcm-page.tsx
  features/
    aes-gcm/
      types.ts
      codec.ts
      crypto.ts
      format.ts
      result-dialog.tsx
  components/
    ui/
  lib/
    clipboard.ts
    utils.ts
```

依赖方向：`pages` 组装 `features` 和 `components/ui`。`features/aes-gcm/crypto.ts`、`codec.ts`、`format.ts` 不引用 React。`components/ui` 不引用业务。

以后新算法放 `src/features/<name>` 和 `src/pages/<name>`，不把逻辑堆进 AES 页面。

## 页面职责

`AppShell` 只负责顶栏、主内容宽度和 `<Outlet>`。顶栏用 `NavLink` 标出当前页。

`HomePage` 从 `nav.ts` 渲染卡片。AES 卡片说明固定参数和“密码遗失不可恢复”，不在首页放表单。

`AesGcmPage` 持有全部交互状态：

- 五个文本字段和编码
- 空闲 / 派生中 / 错误
- 加密结果或解密结果，二者不会同时存在

页面不自己实现编码和 Web Crypto。它只收集字符串、调用 feature，再展示返回值。

## 状态

一次操作的状态机：

```text
idle → deriving → idle
         └→ error → idle
```

`deriving` 时两个按钮都禁用，表单下方显示“正在派生密钥…”。Argon2id 占用主线程约几百毫秒、内存约 20 MiB。这是已接受的成本，不把它移进 Worker。

点击后先进入 `deriving` 并让出一次渲染，再调用 `argon2id`。否则按钮禁用会被同步计算挡住，用户看不到状态。

错误只保留一条。新操作开始时清掉旧错误和旧弹窗。失败不关闭已打开的成功弹窗，因为失败前会先清弹窗。

## 模块边界

### codec.ts

只做字节和文本的转换。

- `Hex`：写出小写；读入去空白、忽略大小写、要求偶数长度
- `Base64`：标准字母表，保留填充
- `Base64URL`：写出不带填充；读入接受有无填充，拒绝 `+` `/`
- 非法输入抛带稳定错误码的错误，页面映射成 `plan.md` 里的中文文案

### crypto.ts

只接受已解码的 `Uint8Array` 和原始字符串。

- 校验明文、密码、IV、盐、密文长度
- 生成 12 字节 IV、16 字节盐
- 调用 `hashwasm.argon2id`，`outputType` 固定 `"binary"`
- 导入不可提取的 AES-GCM 密钥，用完把派生字节清零
- 附加数据去首尾空白后为空则不传；否则传入空白已去掉的 UTF-8

这里锁定 `plan.md` 里两句冲突的规则：明文和密码按长度 0 判空，保留首尾空格。附加数据用去空白后的结果判空和参与认证，这样“不展示”和“未传入”是同一条件。

参数对象集中在此文件，页面和弹窗都不能改：

```ts
{
  parallelism: 1,
  iterations: 2,
  memorySize: 19456,
  hashLength: 32,
  tagLength: 128,
}
```

### format.ts

把加密结果格式化成复制文本。字段顺序和省略规则按 `plan.md`：密文、iv、salt、tagLength、additionalData、编码。附加数据为空则不出现该行。

解密弹窗的复制不经过这里，只复制原文。

### result-dialog.tsx

shadcn `Dialog`。加密和解密共用一个组件，用结果类型区分内容。弹窗打开时背景表单保持可见，关闭不修改输入框。

加密成功后，页面把生成或规范化后的 IV、盐写回输入框。写回值使用当前编码。不改明文，不改编码选项。

## 表单

中文标签，单列，最大宽度约 40rem，放在 `Card` 内。

| 字段 | 控件 | 说明 |
| --- | --- | --- |
| 明文 / 密文 | `Textarea` | 加密填原文，解密填密文 |
| 密码 | `Input`，`type="text"` | 明文显示，便于核对，不使用密码遮罩 |
| IV | `Input` | 留空则加密时生成 |
| 盐 | `Input` | 留空则加密时生成 |
| 附加数据 | `Input` | 可选 |
| 编码 | `Select` | `Hex`、`Base64`、`Base64URL`，默认 `Hex` |

编码字段下用一行说明：只作用于密文、IV、盐。

主按钮一组：加密、解密。错误用 `Alert` 放在按钮下方，不用浏览器 `alert`。

## 弹窗

加密结果按 `plan.md` 顺序展示字段，并显示“请牢记密码，遗失不可恢复”。复制按钮复制带字段名的文本。

解密结果只展示原文和编码。复制按钮只复制原文。

复制优先 `navigator.clipboard.writeText`。失败时回退到隐藏文本域和 `document.execCommand("copy")`。两种都失败才显示“复制失败”。

## 部署

工作流在推送到 `main` 和 `workflow_dispatch` 时运行。

1. `npm ci`
2. `npm run build`
3. 上传 `dist/`
4. 部署到 GitHub Pages

Vite `base` 在 Actions 里设为 `/${{ github.event.repository.name }}/`，本地默认 `/`。不要把仓库名写死在源码里。

权限保持 `contents: read`、`pages: write`、`id-token: write`。并发组 `pages`。构建使用当前 Node LTS。

启用 Pages 的 Actions 源、创建仓库和推送仍由人工完成。不在实施时自动提交。

## 实施顺序

1. 用 Vite 生成 React + TypeScript 工程，接上 Tailwind 和 shadcn
2. 搭壳层、导航和两个空页面，确认 Hash 路由可刷新
3. 实现 `codec`、`crypto`、`format`，页面先不接 UI
4. 接上表单、状态和结果弹窗
5. 补 Pages 工作流，本地 `npm run build` 确认产物包含 WASM 运行时

不提前加测试框架。纯函数稳定后，再决定是否加测试依赖。
