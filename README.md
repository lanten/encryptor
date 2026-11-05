# 客户端加解密工具

纯浏览器端的 AES-256-GCM 加解密工具。用 Argon2id 从密码派生密钥，再用 AES-256-GCM 加解密。明文、密码、IV、盐、附加数据全部在浏览器内处理，不上传任何内容。

## 功能

- AES-256-GCM 加解密，`tagLength` 固定 128
- Argon2id 密钥派生：内存 19 MiB、迭代 2 次、并行度 1、派生 32 字节
- 编码可选 Hex / Base64 / Base64URL，默认 Hex
- IV 和盐留空时自动随机生成
- 支持附加数据（AAD）参与认证
- 加密结果可一键复制，凭同一套字段可解密回来

## 技术栈

- Vite + React + TypeScript
- shadcn/ui + Tailwind CSS v4
- react-router（Hash 路由）
- hash-wasm（Argon2id）
- Web Crypto API（AES-GCM）

## 本地开发

```bash
npm install
npm run dev
```

## 脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 类型检查并构建到 `dist/` |
| `npm test` | 运行 vitest 测试 |
| `npm run lint` | 运行 oxlint |
| `npm run preview` | 本地预览构建产物 |

## 使用

### 加密

1. 在「明文 / 密文」输入原文，在「密码」输入密码
2. IV、盐留空则自动生成；也可手动填写（IV 必须 12 字节，盐 8 到 64 字节）
3. 附加数据可选，参与认证
4. 选择编码，点击「加密」
5. 弹出结果，包含密文、iv、salt、tagLength、编码，可一键复制

### 解密

1. 把密文填在「明文 / 密文」输入框
2. 填写密码、IV、盐，附加数据需与加密时一致
3. 选择与加密时相同的编码，点击「解密」

> 密码遗失不可恢复。加密参数（Argon2id 参数、tagLength）是兼容性契约，改动会使旧密文无法解密。

## 部署到 GitHub Pages

推送到 `master` 分支会自动触发 `.github/workflows/pages.yml` 构建并部署。首次使用需在仓库 Settings → Pages 中把 Source 设为 GitHub Actions。

## 目录结构

```text
src/
  app/           路由、壳层、导航
  pages/         页面组件
  features/      业务逻辑（codec / crypto / format）
  components/ui/ shadcn 组件
  lib/           通用工具
```

## 方案文档

- `plan.md`：产品行为方案
- `design.md`：前端架构设计
