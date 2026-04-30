# mail.056650.xyz

简洁的临时邮箱工具，部署在 Cloudflare Workers 上。当前版本已经瘦身为 Vite React SPA + Hono API，只保留临时邮箱创建、收件箱读取、邮件详情渲染和自动化 API。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/akazwz/smail)

## 核心能力

- 生成随机临时邮箱。
- 使用自定义前缀复用邮箱地址。
- 在网页内查看收件箱和展开邮件内容。
- 通过 API 创建邮箱、轮询列表、读取邮件详情，方便 agent、脚本和自动化流程使用。
- 邮件按接收时间保留 24 小时，过期后由定时任务清理。

## 技术栈

- Vite + React 19 + TanStack Query
- Hono on Cloudflare Workers
- Cloudflare Email Workers
- Cloudflare D1：邮件元数据和自定义前缀 reservation
- Cloudflare R2：邮件原始内容，对象 key 为邮件 `id`
- JWT HttpOnly session cookie：浏览器访问
- JWT Bearer mailbox token：自动化 API 访问

## 数据流

1. Cloudflare Email Worker 收到邮件后进入 `workers/app.ts` 的 `email` handler。
2. `app/utils/incoming-email.ts` 解析邮件并规范化收件人地址为小写。
3. `app/utils/email-ingest.ts` 先把原始邮件写入 R2，再把邮件元数据写入 D1。
4. 浏览器通过 `/api/session/*` 读取当前邮箱、收件箱和邮件详情。
5. 自动化程序通过 `/api/mailboxes/*` 创建邮箱并使用 Bearer token 读取邮件。
6. `scheduled` handler 每 30 分钟运行 `cleanupExpiredEmails()`，清理过期邮件和 reservation。

## 目录结构

```text
app/
  types/email.ts                 # D1 邮件元数据类型
  utils/                         # 邮件解析、入库、保留策略、地址生成、清理等核心工具
src/
  client/                        # Vite React SPA
  server/                        # Hono API、JWT、邮箱 service
workers/
  app.ts                         # Worker fetch/email/scheduled 入口
migrations/
  *.sql                          # D1 迁移
wrangler.jsonc                   # Cloudflare 绑定和域名配置
```

## 浏览器 API

浏览器 API 使用 `__session` HttpOnly Cookie 保存邮箱访问权。Cookie 内容是服务端签发的 JWT，前端无法读取或伪造。

### 读取当前邮箱

```http
GET /api/session/mailbox
```

无邮箱时：

```json
{
  "address": null
}
```

有邮箱时：

```json
{
  "address": "reuse-this-box@mail.056650.xyz",
  "expiresAt": 1700086400000
}
```

### 创建或切换邮箱

```http
POST /api/session/mailbox
Content-Type: application/json
```

随机邮箱：

```json
{}
```

自定义前缀：

```json
{
  "prefix": "reuse-this-box"
}
```

成功响应：

```json
{
  "address": "reuse-this-box@mail.056650.xyz",
  "expiresAt": 1700086400000
}
```

### 删除当前邮箱

```http
DELETE /api/session/mailbox
```

成功响应：

```json
{
  "ok": true
}
```

如果当前邮箱是自定义前缀，删除时会释放对应 reservation。

### 读取收件箱

```http
GET /api/session/inbox
```

成功响应：

```json
{
  "address": "reuse-this-box@mail.056650.xyz",
  "emails": [
    {
      "id": "msg-1",
      "to_address": "reuse-this-box@mail.056650.xyz",
      "from_name": "Sender",
      "from_address": "sender@example.test",
      "subject": "Verification",
      "time": 1700000000000
    }
  ]
}
```

### 读取邮件详情

```http
GET /api/session/emails/:id
```

成功响应：

```json
{
  "id": "msg-1",
  "to_address": "reuse-this-box@mail.056650.xyz",
  "from_name": "Sender",
  "from_address": "sender@example.test",
  "subject": "Verification",
  "time": 1700000000000,
  "body": "<!DOCTYPE html>...",
  "text": "Verification code: 123456",
  "html": "<!DOCTYPE html>..."
}
```

`body/html` 会经过清洗并包裹 CSP，适合放入 sandbox iframe 渲染。

## Automation API

Automation API 面向 agent、脚本、CI、浏览器自动化和第三方程序集成。

### mailboxToken 怎么生成

`mailboxToken` 由服务端生成，不能由客户端自行拼接。实现位于 `src/server/jwt.ts` 和 `src/server/mailbox-service.ts`。

当前 token 是 HS256 JWT：

- `typ`：固定为 `mailbox`
- `address`：邮箱地址，会规范化为小写
- `ownerToken`：仅自定义前缀邮箱携带，用来绑定 D1 reservation
- `iat`：签发时间，Unix 秒
- `exp`：过期时间，Unix 秒，当前为签发后 24 小时

签名密钥优先读取 `TOKEN_SECRETS`，没有配置时回退到 `SESSION_SECRETS`。多个 secret 可用逗号分隔，最左侧用于签发，所有值都可用于验签，便于轮换。

校验时会检查：

- JWT 签名合法。
- `typ` 与接口场景匹配。
- token 未过期。
- token 中的 `address` 与 URL 参数一致。
- 自定义前缀邮箱还会回查 D1，确认 reservation 的 `ownerToken` 没有变化。

### 创建邮箱

```http
POST /api/mailboxes
Content-Type: application/json
Authorization: Bearer <oldMailboxToken>
```

`Authorization` 可选。如果切换邮箱时带上旧 token，服务端会释放旧自定义前缀 reservation。

示例：

```bash
curl -X POST 'https://mail.056650.xyz/api/mailboxes' \
  -H 'content-type: application/json' \
  -d '{"prefix":"reuse-this-box"}'
```

成功响应：

```json
{
  "address": "reuse-this-box@mail.056650.xyz",
  "mailboxToken": "<jwt>",
  "expiresAt": 1700086400000
}
```

### 拉取邮件列表

```bash
curl 'https://mail.056650.xyz/api/mailboxes/reuse-this-box@mail.056650.xyz/emails' \
  -H "Authorization: Bearer $MAILBOX_TOKEN"
```

成功响应：

```json
{
  "address": "reuse-this-box@mail.056650.xyz",
  "emails": [
    {
      "id": "msg-1",
      "to_address": "reuse-this-box@mail.056650.xyz",
      "from_name": "Sender",
      "from_address": "sender@example.test",
      "subject": "Verification",
      "time": 1700000000000
    }
  ]
}
```

### 拉取单封邮件

```bash
curl 'https://mail.056650.xyz/api/mailboxes/reuse-this-box@mail.056650.xyz/emails/msg-1' \
  -H "Authorization: Bearer $MAILBOX_TOKEN"
```

成功响应包含邮件元数据、`text` 和清洗后的 `html/body`。

常见错误：

- `400`：JSON 无效或前缀不合法。
- `401`：缺少 Cookie 或 Bearer token。
- `403`：token 无效、过期、地址不匹配，或自定义前缀占有权已变化。
- `404`：邮件不存在、已过期，或 R2 原始内容已被清理。
- `409`：自定义前缀当前被其他会话占用。
- `415`：请求体不是 `application/json`。

## 本地开发

安装依赖：

```bash
pnpm install
```

准备本地环境变量：

```bash
cp .env.example .env
```

启动完整本地预览：

```bash
pnpm run dev
```

`pnpm run dev` 会构建 SPA、执行本地 D1 迁移，并用 Wrangler 启动 Worker。只开发前端静态界面时可以使用：

```bash
pnpm run dev:client
```

## 常用命令

- `pnpm test`：运行核心单测。
- `pnpm run typecheck`：生成 Cloudflare 类型并执行 TypeScript 检查。
- `pnpm run build`：构建 Vite SPA。
- `pnpm run preview`：构建、执行本地 D1 迁移，并启动 Wrangler Worker 预览。
- `pnpm run migrate:local`：对本地 Miniflare D1 执行迁移。
- `pnpm run migrate`：对远端 D1 执行迁移。
- `pnpm run deploy`：构建、迁移并部署 Worker。

## Cloudflare 配置

`wrangler.jsonc` 当前配置：

- Worker 名称：`smail-app`
- 自定义域名：`mail.056650.xyz`
- Assets binding：`ASSETS`，目录 `./dist`
- D1 binding：`D1`
- R2 binding：`R2`
- Cron：`*/30 * * * *`

环境变量：

- `SITE_DOMAIN`：站点域名。
- `SITE_URL`：站点 URL。
- `MAIL_DOMAIN`：生成邮箱和接收邮件使用的域名。
- `SUPPORT_EMAIL`：支持邮箱。
- `INBOX_AUTO_REFRESH_INTERVAL_MS`：前端自动刷新间隔。

Worker Secret：

- `SESSION_SECRETS`：必填。浏览器 session JWT 签名密钥。
- `TOKEN_SECRETS`：可选。Automation API mailbox token 签名密钥；未配置时回退到 `SESSION_SECRETS`。

设置生产 secret：

```bash
pnpm wrangler secret put SESSION_SECRETS
pnpm wrangler secret put TOKEN_SECRETS
```

## 数据库迁移

当前迁移文件：

- `migrations/20260211_create_emails.sql`
- `migrations/20260212_email_indexes.sql`
- `migrations/20260213_create_email_reservations.sql`
- `migrations/20260427_normalize_email_recipient_casing.sql`

首次部署或表结构变更后执行：

```bash
pnpm run migrate
```

## 边界说明

本项目面向临时收信、注册验证、测试和低风险自动化流程。不建议用于银行、工作、政务、法律、关键账号找回等高敏感场景。
