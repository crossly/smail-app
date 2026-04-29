# mail.056650.xyz（smail-v3）

基于 React Router Framework Mode + Cloudflare Workers 的临时邮箱服务。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/akazwz/smail)

- 当前站点域名：`https://mail.056650.xyz`
- Worker 名称：`smail-app`
- 默认语言：`en`（同时支持 10 种语言）

## 一键部署（Deploy to Cloudflare）

- 上方按钮可让其他开发者将本项目一键部署到他们自己的 Cloudflare 账号。
- 部署流程会基于仓库中的 `wrangler.jsonc` 自动创建并绑定所需资源（D1 / R2）。
- 当前仓库默认把自定义域名与收信域名配置为 `mail.056650.xyz`；如果你要部署到别的域名，请同步修改 `wrangler.jsonc` 和 `.env.example` 中的域名变量。
- 项目仓库需要保持公开（public）才能让他人正常使用该按钮。

## 项目简介

这是一个面向低风险场景的临时邮箱网站，核心目标是：

- 一键生成临时邮箱地址
- 即时查看收件箱
- 用于注册验证、OTP、一次性下载等短期流程
- 避免暴露长期个人邮箱

项目同时包含多语言 SEO 页面（Markdown）和多语言博客。

## 技术栈

- React 19 + React Router 7（Framework Mode，SSR）
- Cloudflare Workers（HTTP + Email Worker）
- Cloudflare D1（存储邮件元数据）
- Cloudflare R2（存储邮件原始内容）
- Signed Cookie Session（React Router 内置 Session）
- Tailwind CSS 4
- Markdoc（渲染 Markdown 页面与博客）

## 核心功能

- 首页临时邮箱收件箱
- 邮件预览弹窗（解析 HTML/Text）
- 面向 agent / 自动化程序的 Mailbox API
- 多语言路由（`/:lang?`）
- SEO 路由：`/robots.txt`、`/sitemap.xml`、`/rss.xml`
- 多语言 Markdown 页面（about/faq/privacy/terms + 长尾 SEO 落地页）
- 多语言博客列表、分页、文章页

## 数据流（真实实现）

1. 邮件进入 Worker 的 `email` 事件（`workers/app.ts`）
2. 解析原始邮件后：
   - 元数据写入 D1 `emails` 表（`id/to_address/from/subject/time`）
   - 原始邮件内容写入 R2（对象 key 为 `id`）
3. 首页按当前会话中的地址读取 D1 列表
4. 打开邮件详情时，通过 `/api/email/:id`：
   - 校验该邮件地址属于当前会话
   - 校验邮件仍在 24 小时保留窗口内
   - 从 R2 读取原始邮件并解析后返回

5. 自动化 API 通过 `/api/mailboxes` 创建邮箱并返回 `mailboxToken`
6. 自动化 API 通过 `Authorization: Bearer <mailboxToken>` 拉取列表和邮件详情

说明：当前“24 小时”同时体现在 Cookie Session 可访问窗口、收件箱查询窗口以及 `scheduled` 定时清理；Worker 每 30 分钟调用 `cleanupExpiredEmails`，清理过期 D1 元数据、R2 原始邮件内容和自定义地址占用记录。

## Automation API

这套 API 主要给 agent、脚本、CI、浏览器自动化流程和第三方程序集成临时邮箱使用。

### 认证方式

- 所有自动化接口都使用 `Authorization: Bearer <mailboxToken>`
- `mailboxToken` 只能由服务端生成，客户端不能自行伪造
- 自定义前缀邮箱如果占有权发生变化，旧 `mailboxToken` 会立即失效，即使 token 自身还没过期

### mailboxToken 怎么生成

`mailboxToken` 不是随机字符串拼出来的，而是服务端签发的带签名令牌，当前实现位于 `app/.server/api-mailboxes.ts`：

1. 服务端先构造 payload：
   - `v`：token 版本，当前固定为 `1`
   - `address`：邮箱地址
   - `expiresAt`：token 到期时间（当前为签发后 24 小时）
   - `ownerToken`：只有自定义前缀邮箱才会带上，用于绑定当前 reservation 占有权
2. payload 会先被 JSON 序列化，再做 `base64url` 编码
3. 服务端使用 `SESSION_SECRETS` 的第一个 secret，对编码后的 payload 做 `HMAC-SHA256` 签名
4. 最终 token 结构是：

```text
<base64url-payload>.<base64url-signature>
```

5. 校验时会：
   - 用 `SESSION_SECRETS` 中所有 secret 依次验签，支持 secret 轮换
   - 检查 `expiresAt`
   - 检查 token 中的 `address` 是否与 URL 中的地址一致
   - 如果是自定义前缀邮箱，再回查 D1 `email_reservations`，确认 `ownerToken` 仍是当前占有者

说明：

- 随机邮箱 token 只校验签名、地址和过期时间
- 自定义前缀邮箱 token 额外校验 reservation 占有权
- 因为签名依赖 `SESSION_SECRETS`，所以外部程序不能脱离服务端自己生成合法 token

### 1. 创建邮箱

`POST /api/mailboxes`

请求头：

```http
Content-Type: application/json
Authorization: Bearer <oldMailboxToken>
```

说明：

- `Authorization` 是可选的
- 如果你要从一个已有自定义前缀邮箱切换到另一个邮箱，带上旧 token，服务端会顺手释放旧 reservation
- 不传 `prefix` 时会生成随机邮箱
- 传 `prefix` 时会生成固定前缀邮箱，例如 `reuse-this-box@mail.056650.xyz`

请求体：

```json
{
  "prefix": "reuse-this-box"
}
```

随机邮箱也可以传空对象：

```json
{}
```

示例：

```bash
curl -X POST 'https://mail.056650.xyz/api/mailboxes' \
  -H 'content-type: application/json' \
  -d '{"prefix":"reuse-this-box"}'
```

成功响应：`201 Created`

```json
{
  "address": "reuse-this-box@mail.056650.xyz",
  "mailboxToken": "eyJ2IjoxLCJhZGRyZXNzIjoicmV1c2UtdGhpcy1ib3hAbWFpbC4wNTY2NTAueHl6IiwiZXhwaXJlc0F0IjoxNzAwMDg2NDAwMDAwLCJvd25lclRva2VuIjoiZ1M2R2JjT3VfRjJqQ2J6In0.<signature>",
  "expiresAt": 1700086400000
}
```

常见错误：

- `400`：prefix 非法，或 JSON 格式错误
- `409`：自定义前缀当前已被别的会话占用
- `415`：请求不是 `application/json`

### 2. 拉取邮件列表

`GET /api/mailboxes/:address/emails`

示例：

```bash
curl 'https://mail.056650.xyz/api/mailboxes/reuse-this-box@mail.056650.xyz/emails' \
  -H "Authorization: Bearer $MAILBOX_TOKEN"
```

成功响应：`200 OK`

```json
{
  "address": "reuse-this-box@mail.056650.xyz",
  "emails": [
    {
      "id": "msg-2",
      "address": "reuse-this-box@mail.056650.xyz",
      "fromName": "Sender Two",
      "fromAddress": "two@example.test",
      "subject": "Second",
      "time": 1700000000000
    }
  ]
}
```

说明：

- 只返回当前 24 小时保留窗口内的邮件
- 按时间倒序返回
- 最多返回 100 封

常见错误：

- `401`：缺少 `Authorization: Bearer ...`
- `403`：token 无效、已过期，或自定义前缀占有权已变化
- `404`：地址参数缺失或路由不匹配

### 3. 拉取单封邮件详情

`GET /api/mailboxes/:address/emails/:id`

示例：

```bash
curl 'https://mail.056650.xyz/api/mailboxes/reuse-this-box@mail.056650.xyz/emails/msg-1' \
  -H "Authorization: Bearer $MAILBOX_TOKEN"
```

成功响应：`200 OK`

```json
{
  "id": "msg-1",
  "address": "reuse-this-box@mail.056650.xyz",
  "fromName": "Sender One",
  "fromAddress": "one@example.test",
  "subject": "Hello",
  "time": 1700000000000,
  "text": "Verification code: 123456",
  "html": "<!DOCTYPE html>..."
}
```

说明：

- `text` 是解析出的纯文本正文
- `html` 是经过清洗后的可渲染 HTML，适合直接嵌入预览 iframe 或 HTML viewer

常见错误：

- `401`：缺少 token
- `403`：token 无效、过期，或占有权变化
- `404`：邮件不存在、已过期，或原始内容已被清理

### 推荐接入方式

给 agent / 脚本接入时，推荐按下面流程：

1. `POST /api/mailboxes` 创建邮箱并保存 `address` 与 `mailboxToken`
2. 轮询 `GET /api/mailboxes/:address/emails`
3. 收到目标邮件后，用 `GET /api/mailboxes/:address/emails/:id` 拉取正文
4. 如果你需要稳定复用同一个地址，始终传 `prefix`
5. 如果服务返回 `403` 且你用的是自定义前缀邮箱，优先认为该地址占有权已经变化，应该重新创建邮箱并拿新 token

## 目录结构

```text
app/
  routes/              # 路由模块（home、md、blog、api、sitemap、robots 等）
  md/                  # 多语言 SEO Markdown 页面
  blog/                # 多语言博客内容与元数据
  i18n/                # 语言配置与文案
  .server/session.ts   # Signed Cookie Session
  utils/               # 公共工具（meta、theme、retention 等）
workers/
  app.ts               # Cloudflare Worker 入口（fetch + email）
migrations/
  *.sql                # D1 迁移
wrangler.jsonc         # Cloudflare 绑定配置
```

## 本地开发

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动开发

先创建本地 secret：

```bash
cp .env.example .env
```

```bash
pnpm run dev
```

默认访问：`http://localhost:5173`

### 3. 类型检查

```bash
pnpm run typecheck
```

### 4. 生产构建与预览

```bash
pnpm run build
pnpm run preview
```

## 常用命令

- `pnpm run dev`：本地开发
- `pnpm run build`：生产构建
- `pnpm run preview`：本地预览构建产物
- `pnpm run typecheck`：Cloudflare 类型生成 + 路由类型生成 + TS 检查
- `pnpm run deploy`：构建后部署到 Cloudflare Workers
- `pnpm run migrate`：对远端 D1（`smail-v3`）执行迁移

## Cloudflare 资源绑定

`wrangler.jsonc` 当前使用以下绑定：

- `D1`：邮件元数据（数据库名 `smail-v3`）
- `R2`：邮件内容对象存储（桶名 `smailv3`）
- `routes`：自定义域名路由（当前为 `mail.056650.xyz`）
- `triggers.crons`：`*/30 * * * *`（30 分钟触发一次，用于清理过期邮件与自定义地址占用记录）

此外当前通过环境变量配置以下站点域名信息：

- `SITE_DOMAIN`：站点展示域名，用于品牌名、SEO 文案替换等
- `SITE_URL`：站点基准 URL，用于 canonical / sitemap / RSS / 结构化数据
- `MAIL_DOMAIN`：生成临时邮箱地址时使用的收件域名
- `SUPPORT_EMAIL`：联系页与 Markdown 文案中的支持邮箱
- `INBOX_AUTO_REFRESH_INTERVAL_MS`：前端收件箱自动刷新间隔，默认 `10000`（10 秒）

此外还需要配置一个 Worker Secret：

- `SESSION_SECRETS`：Cookie Session 的签名密钥。支持逗号分隔多个值用于轮换，最左侧为当前生效密钥。

本地开发可使用 `.env`，生产环境使用：

注意：`.env` 和 `.dev.vars` 二选一即可；如果存在 `.dev.vars`，Wrangler 本地开发时不会再加载 `.env`。

```bash
pnpm wrangler secret put SESSION_SECRETS
```

## 数据库迁移

当前迁移文件：

- `migrations/20260211_create_emails.sql`
- `migrations/20260212_email_indexes.sql`
- `migrations/20260213_create_email_reservations.sql`
- `migrations/20260427_normalize_email_recipient_casing.sql`

首次部署或表结构变更后，执行：

```bash
pnpm run migrate
```

## 多语言与 SEO

- 支持语言：`en/zh/es/fr/de/ja/ko/ru/pt/ar`
- 默认语言为 `en`，默认语言不带前缀
- Markdown 页面与博客均支持多语言
- 自动生成 sitemap（包含首页、Markdown 页、博客列表/分页/文章）

## 部署说明

```bash
pnpm run deploy
```

发布前建议至少执行：

```bash
pnpm run typecheck
pnpm run build
```

## 重要边界

- 本项目面向临时收信与低风险验证场景。
- 不建议用于银行、工作、政务、法律与关键账号找回等高敏感场景。
