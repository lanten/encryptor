# 客户端加解密工具方案

纯浏览器、无后端。用 Argon2id 从密码派生 AES-256 密钥，再用 AES-256-GCM 加解密。编码不写死，由页面下拉框选择。

本文只描述方案，不含实现。

## 目标

- 明文、密码、IV、盐、附加数据全部留在浏览器内，不上传
- 加密结果可复制，凭同一套字段可以解密回来
- 静态文件即可部署到 GitHub Pages

## 已确认约束

- `tagLength` 固定 `128`，不提供修改入口
- Argon2id 固定参数：内存 19 MiB（19456 KiB）、迭代 2、并行度 1、派生 32 字节
- 编码可选 `Base64`、`Base64URL`、`Hex`，默认 `Hex`
- 解密时，密文填在明文输入框，不另加密文框
- 引入 `hash-wasm@4.12.0`，随仓库存放，不从 CDN 加载
- 只取 Argon2 单文件构建 `argon2.umd.min.js`（约 29 KiB），全局名为 `hashwasm.argon2id`

并行度必须为 1。GitHub Pages 不能加 COOP/COEP，无法使用多线程 WASM。

## 技术选型

| 项 | 选择 | 原因 |
| --- | --- | --- |
| 页面 | 静态 HTML + CSS + JS | 无构建步骤，Pages 直接发布 |
| AES-256-GCM | Web Crypto `AES-GCM` | 浏览器原生支持，`tagLength: 128` 为必须支持的值 |
| Argon2id | `hash-wasm` UMD | Web Crypto 没有 Argon2 |
| 弹窗 | 原生 `<dialog>` | 不引入 UI 库 |
| 部署 | GitHub Actions Pages | 官方三步：configure / upload / deploy |

Argon2id 在这里是密钥派生，不是对密码再做一层加密。用 `密码 + salt` 派生 32 字节密钥，再交给 AES-256-GCM。

Web Crypto 的 GCM 密文末尾已附 16 字节认证标签。结果里只展示 `tagLength`，不单列 tag。

## 页面

单列表单，中文界面。

| 控件 | 规则 |
| --- | --- |
| 明文 | 加密时填原文；解密时填密文。加密必填 |
| 密码 | 必填。解密也必填。默认明文显示，便于核对 |
| IV | 可选。留空则加密时生成 12 字节 |
| 盐 | 可选。留空则加密时生成 16 字节。解密必填 |
| 附加数据 | 可选。逐字节参与认证，解密必须与加密时一致 |
| 编码 | 下拉框：`Hex`（默认）、`Base64`、`Base64URL` |
| 加密 / 解密 | 两个按钮 |

字段旁注明：编码只作用于密文、IV、盐；附加数据仍是原文。

处理中禁用两个按钮，并提示“正在派生密钥…”。Argon2id 会占用主线程约几百毫秒、内存约 20 MiB。这是已接受的性能成本。

校验失败、编码非法、解密失败，都用 toast 提示，不用浏览器 `alert`。

## 编码

三种编码互不影响加密强度。同一条记录的密文、IV、盐必须用同一种。解密时以下拉框为准，不从密文内容猜测编码。

| 编码 | 写入规则 | 读入规则 |
| --- | --- | --- |
| Hex | 小写，无分隔符 | 去空白后不区分大小写；长度必须为偶数；只允许 `0-9a-f` |
| Base64 | 标准字母表，保留 `=` | 去空白后严格解码；长度或字符非法则报错 |
| Base64URL | `-` `_` 替换 `+` `/`，不写填充 | 接受有无填充；不接受标准 Base64 的 `+` `/` |

空白只在解析密文、IV、盐时去掉，避免粘贴换行导致失败。明文、密码、附加数据原样保留，包括首尾空格。

长度：

- 填写了 IV：解码后必须正好 12 字节，否则报错。不接受其它 nonce 长度，避免加得上、别处解不开
- 填写了盐：解码后必须在 8 到 64 字节之间，否则报错。留空时生成 16 字节
- 密文：解码后至少 16 字节（含标签），否则报错

## 加密

1. 明文或密码为空（长度为 0）则报错，不派生密钥
2. IV 为空则生成 12 字节；否则按当前编码解码并校验长度
3. 盐为空则生成 16 字节；否则按当前编码解码并校验长度
4. 用 Argon2id 派生密钥：`outputType: "binary"`，不用库的默认 hex
5. `crypto.subtle.importKey` 导入为不可提取的 AES-GCM 密钥
6. 加密。附加数据去掉首尾空白后为空则不传该字段；非空则按 UTF-8 传入，保留中间内容，首尾空白不参与
7. 将 IV、盐按当前编码写回输入框。不改明文，避免覆盖原文
8. 弹出加密结果

Argon2id 调用固定为：

```js
hashwasm.argon2id({
  password,
  salt,
  parallelism: 1,
  iterations: 2,
  memorySize: 19456,
  hashLength: 32,
  outputType: "binary",
})
```

不传 `secret`。这些参数不写入复制结果。改参数会导致旧密文无法解密，所以参数变更必须当作不兼容变更。

## 加密结果弹窗

按顺序展示：

- 密文
- iv
- salt
- tagLength（固定 `128`）
- additionalData（去空白后为空则不展示）
- 编码（`Hex` / `Base64` / `Base64URL`，与下拉框文案一致）
- 提示：请牢记密码，遗失不可恢复

复制按钮写入剪贴板的格式：

```text
- 密文: xxx
- iv: xxx
- salt: xxx
- tagLength: 128
- additionalData: xxx
- 编码: Hex
```

`additionalData` 去空白后为空时，复制文本也不包含该行。其余行始终保留。

## 解密

1. 明文框（此时是密文）、密码、IV、盐任一为空则报错
2. 按当前编码解码密文、IV、盐；任一非法则报错，不派生密钥
3. 同一套 Argon2id 参数派生密钥并导入
4. 附加数据处理与加密相同：去空白后为空则不传
5. 成功后弹窗展示原文和编码
6. 失败统一提示：解密失败，请检查密码、IV、盐、附加数据、编码或密文。不区分密码错误、篡改或附加数据不一致

解密弹窗：

- 原文
- 编码
- 复制按钮只复制原文，不带字段名

解码弹窗里的编码，是当前下拉框的值，用来标明这条原文是用哪种编码解出来的。

## 错误文案

只报原因，不给操作步骤：

- 请填写明文
- 请填写密码
- 请填写 IV
- 请填写盐
- 请填写密文
- IV 编码无效
- 盐编码无效
- 密文编码无效
- IV 必须是 12 字节
- 盐长度必须在 8 到 64 字节之间
- 密文长度不足
- 解密失败，请检查密码、IV、盐、附加数据、编码或密文
- 复制失败

派生或加解密过程中的其它异常，归入最后一条通用失败，避免把 Web Crypto 的英文错误直接抛给用户。

## 文件

```text
index.html
css/style.css
js/app.js
js/vendor/hash-wasm-argon2.js
.github/workflows/pages.yml
.gitignore
plan.md
```

- `js/vendor/hash-wasm-argon2.js` 是 `hash-wasm@4.12.0` 的 `dist/argon2.umd.min.js` 原样复制，文件头保留上游 MIT 声明
- 不提交 `node_modules`、锁文件或打包缓存。取库时用临时目录，用完删除
- 不添加 README，除非之后明确要求
- 页面资源使用相对路径，兼容 `https://用户.github.io/仓库名/`

## 部署

工作流：

- 触发：推送到 `main`，以及 `workflow_dispatch`
- 权限：`contents: read`、`pages: write`、`id-token: write`
- 并发组 `pages`，新运行不取消正在发布的运行
- 准备目录只复制 `index.html`、`css/`、`js/`，不把 `.git`、`.github`、`plan.md` 打进产物
- `actions/configure-pages@v5`
- `actions/upload-pages-artifact@v3`
- `actions/deploy-pages@v4`
- `actions/checkout@v4`

仓库默认分支若不是 `main`，工作流触发分支要改。启用 Pages 的 Actions 源、创建仓库、推送，都不在本方案的自动范围内。

剪贴板优先 `navigator.clipboard.writeText`。Pages 与 localhost 是安全上下文。`file://` 下失败时，回退到选中隐藏文本域后执行 `document.execCommand("copy")`。

## 安全边界

- 不声称能抵御本机上的其它脚本或扩展。页面被替换即可窃取密码
- 导入密钥后，把派生字节数组尽量清零。JS 不能保证内存里没有残留
- 每次加密使用新的随机 IV。重复使用同一 IV 和同一密钥会破坏 GCM
- 工具不保存历史记录，也不把密码写入 `localStorage`
- 这不是密码管理器。丢失密码无法恢复，弹窗文案必须可见

## 实施时不做

- 不 `git init`、不提交、不推送，除非另行要求
- 不改 Argon2id 参数，不增加其它算法
- 不自动把密文填回明文框
- 不实现从复制文本一键回填。用户按字段自行粘贴
