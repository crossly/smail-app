# mail.056650.xyz

简洁的临时邮箱工具，部署在 Cloudflare Workers 上。当前版本已经瘦身为 Vite React SPA + Hono API，只保留临时邮箱创建、收件箱读取、邮件详情渲染和自动化 API。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/crossly/smail-app)

## 核心能力

- 生成随机临时邮箱。
- 使用自定义前缀复用邮箱地址。
- 在网页内查看收件箱，并在邮件条目下方展开邮件内容。
- 通过 API 创建邮箱、轮询列表、读取邮件详情，方便 agent、脚本、CI 和浏览器自动化流程使用。
- 邮件按接收时间保留 24 小时，过期后由定时任务清理。
- API 响应默认 `cache-control: no-store`，避免收件箱结果被缓存。

## 技术栈

- Vite + React 19 + TanStack Query
- Hono on Cloudflare Workers
- Cloudflare Email Workers
- Cloudflare D1：邮件元数据和自定义前缀 reservation
- Cloudflare R2：邮件原始内容，对象 key 为邮件 `id`
- JWT HttpOnly session cookie：浏览器访问
- JWT Bearer mailbox token：自动化 API 访问

## 架构与数据流

1. Cloudflare Email Worker 收到邮件后进入 `workers/app.ts` 的 `email` handler。
2. `app/utils/incoming-email.ts` 解析邮件并把收件人地址规范化为小写。
3. `app/utils/email-ingest.ts` 先把原始邮件写入 R2，再把邮件元数据写入 D1。
4. 浏览器通过 `/api/session/*` 读取当前邮箱、收件箱和邮件详情。
5. 自动化程序通过 `/api/mailboxes/*` 创建邮箱，并使用 Bearer token 读取邮件。
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
wrangler.jsonc                   # Cloudflare 绑定、域名、Assets 和 cron 配置
```

## API 调用指南

生产环境 Base URL：

```text
https://mail.056650.xyz
```

本地预览 Base URL 以 Wrangler 输出为准，通常是：

```text
http://localhost:8787
```

### 通用约定

- 时间戳字段使用毫秒级 Unix timestamp。
- 邮件地址会规范化为小写。
- 自定义前缀会 `trim`、转小写，并移除首尾连字符。
- 自定义前缀长度必须是 3-32 个字符，只能使用小写字母、数字和单个连字符。
- 保留前缀不能使用，例如 `admin`、`mail`、`support`、`postmaster`、`security`。
- 收件箱只返回当前时间往前 24 小时内的邮件，窗口按邮件接收时间计算。
- 路径里的 `address` 和 `id` 建议使用 `encodeURIComponent()` 后再拼接。

### 数据结构

邮箱响应：

```json
{
  "address": "agent-demo@mail.056650.xyz",
  "expiresAt": 1777619894982,
  "refreshIntervalMs": 10000
}
```

邮件摘要：

```json
{
  "id": "msg-1",
  "to_address": "agent-demo@mail.056650.xyz",
  "from_name": "Sender",
  "from_address": "sender@example.test",
  "subject": "Verification",
  "time": 1777533494982
}
```

邮件详情：

```json
{
  "id": "msg-1",
  "to_address": "agent-demo@mail.056650.xyz",
  "from_name": "Sender",
  "from_address": "sender@example.test",
  "subject": "Verification",
  "time": 1777533494982,
  "body": "<!DOCTYPE html>...",
  "text": "Verification code: 123456",
  "html": "<!DOCTYPE html>..."
}
```

`body` 和 `html` 是同一份清洗后的 HTML，适合放入 sandbox iframe 渲染。`text` 是解析出的纯文本内容。

## 浏览器 Session API

浏览器 API 使用 `__session` HttpOnly Cookie 保存邮箱访问权。Cookie 由服务端签发，前端无法读取或伪造。

### 读取当前邮箱

```http
GET /api/session/mailbox
```

无邮箱时：

```json
{
  "address": null,
  "refreshIntervalMs": 10000
}
```

有邮箱时：

```json
{
  "address": "reuse-this-box@mail.056650.xyz",
  "expiresAt": 1777619894982,
  "refreshIntervalMs": 10000
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
  "expiresAt": 1777619894982,
  "refreshIntervalMs": 10000
}
```

如果当前浏览器已经有自定义邮箱，切换到新邮箱时会释放旧邮箱的 reservation。

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
      "time": 1777533494982
    }
  ]
}
```

### 读取邮件详情

```http
GET /api/session/emails/:id
```

成功响应包含邮件摘要字段、`text`、`html` 和 `body`。

## Automation API

Automation API 面向 agent、脚本、CI、浏览器自动化和第三方程序集成。它不依赖浏览器 Cookie，而是使用 `mailboxToken`：

```http
Authorization: Bearer <mailboxToken>
```

### mailboxToken 怎么生成

`mailboxToken` 由服务端在 `POST /api/mailboxes` 成功后返回，客户端不能自行拼接。实现位于 `src/server/jwt.ts` 和 `src/server/mailbox-service.ts`。

当前 token 是 HS256 JWT：

- `typ`：固定为 `mailbox`
- `address`：邮箱地址，规范化为小写
- `ownerToken`：仅自定义前缀邮箱携带，用来绑定 D1 reservation
- `iat`：签发时间，Unix 秒
- `exp`：过期时间，Unix 秒，当前为签发后 24 小时

签名密钥优先读取 `TOKEN_SECRETS`，没有配置时回退到 `SESSION_SECRETS`。多个 secret 可用逗号分隔，最左侧用于签发，所有值都可用于验签，便于密钥轮换。

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

随机邮箱：

```bash
curl -sS -X POST 'https://mail.056650.xyz/api/mailboxes' \
  -H 'content-type: application/json' \
  -d '{}'
```

自定义前缀：

```bash
curl -sS -X POST 'https://mail.056650.xyz/api/mailboxes' \
  -H 'content-type: application/json' \
  -d '{"prefix":"agent-demo"}'
```

成功响应：

```json
{
  "address": "agent-demo@mail.056650.xyz",
  "mailboxToken": "<jwt>",
  "expiresAt": 1777619894982
}
```

### 拉取邮件列表

```bash
curl -sS 'https://mail.056650.xyz/api/mailboxes/agent-demo%40mail.056650.xyz/emails' \
  -H "authorization: Bearer $MAILBOX_TOKEN"
```

成功响应：

```json
{
  "address": "agent-demo@mail.056650.xyz",
  "emails": [
    {
      "id": "msg-1",
      "to_address": "agent-demo@mail.056650.xyz",
      "from_name": "Sender",
      "from_address": "sender@example.test",
      "subject": "Verification",
      "time": 1777533494982
    }
  ]
}
```

### 拉取单封邮件

```bash
curl -sS 'https://mail.056650.xyz/api/mailboxes/agent-demo%40mail.056650.xyz/emails/msg-1' \
  -H "authorization: Bearer $MAILBOX_TOKEN"
```

成功响应包含邮件摘要字段、`text`、`html` 和 `body`。

### 完整 Shell 示例

下面示例会创建一个自定义邮箱，保存 `mailboxToken`，然后轮询收件箱。需要本机有 Node.js 用于解析 JSON 和 URL 编码。

```bash
BASE_URL='https://mail.056650.xyz'
PREFIX='agent-demo'

CREATE_RESPONSE=$(
  curl -sS -X POST "$BASE_URL/api/mailboxes" \
    -H 'content-type: application/json' \
    -d "{\"prefix\":\"$PREFIX\"}"
)

ADDRESS=$(node -pe 'JSON.parse(process.argv[1]).address' "$CREATE_RESPONSE")
MAILBOX_TOKEN=$(node -pe 'JSON.parse(process.argv[1]).mailboxToken' "$CREATE_RESPONSE")
ENCODED_ADDRESS=$(node -pe 'encodeURIComponent(process.argv[1])' "$ADDRESS")

echo "address=$ADDRESS"
echo "token=$MAILBOX_TOKEN"

curl -sS "$BASE_URL/api/mailboxes/$ENCODED_ADDRESS/emails" \
  -H "authorization: Bearer $MAILBOX_TOKEN"
```

读取第一封邮件详情：

```bash
EMAIL_ID='msg-1'

curl -sS "$BASE_URL/api/mailboxes/$ENCODED_ADDRESS/emails/$EMAIL_ID" \
  -H "authorization: Bearer $MAILBOX_TOKEN"
```

### 完整 JavaScript 示例

```js
const baseUrl = "https://mail.056650.xyz";

const created = await fetch(`${baseUrl}/api/mailboxes`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ prefix: "agent-demo" }),
}).then((response) => response.json());

const address = created.address;
const token = created.mailboxToken;
const encodedAddress = encodeURIComponent(address);

const inbox = await fetch(`${baseUrl}/api/mailboxes/${encodedAddress}/emails`, {
  headers: { authorization: `Bearer ${token}` },
}).then((response) => response.json());

if (inbox.emails.length > 0) {
  const emailId = encodeURIComponent(inbox.emails[0].id);
  const detail = await fetch(
    `${baseUrl}/api/mailboxes/${encodedAddress}/emails/${emailId}`,
    { headers: { authorization: `Bearer ${token}` } },
  ).then((response) => response.json());

  console.log(detail.text || detail.body);
}
```

### 常见错误

- `400`：JSON 无效、前缀不是字符串，或前缀不合法。
- `401`：缺少 session Cookie 或 Bearer token。
- `403`：token 无效、过期、地址不匹配，或自定义前缀占有权已变化。
- `404`：邮件不存在、已过期，或 R2 原始内容已被清理。
- `409`：自定义前缀当前被其他会话占用。
- `415`：请求体不是 `application/json`。
- `500`：服务端未知错误，接口会返回通用错误文案，不泄露后端细节。

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
- `INBOX_AUTO_REFRESH_INTERVAL_MS`：前端自动刷新间隔，低于 `1000` 会回退到默认 `10000`。

Worker Secret：

- `SESSION_SECRETS`：必填。浏览器 session JWT 签名密钥。
- `TOKEN_SECRETS`：可选。Automation API mailbox token 签名密钥；未配置时回退到 `SESSION_SECRETS`。

设置生产 secret：

```bash
pnpm wrangler secret put SESSION_SECRETS
pnpm wrangler secret put TOKEN_SECRETS
```

部署前确认 Wrangler 已登录：

```bash
pnpm exec wrangler whoami
```

部署：

```bash
pnpm run deploy
```

## Cloudflare Email Routing

生产环境需要在 Cloudflare Email Routing / Email Workers 中把 `mail.056650.xyz` 的收信路由指向该 Worker。当前 Worker 入口 `workers/app.ts` 同时提供：

- `fetch`：网站和 HTTP API
- `email`：接收 Email Routing 投递的邮件
- `scheduled`：清理过期邮件和 reservation

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

## 运维与边界

- 临时邮箱用于注册验证、测试、低风险自动化流程和短期收信。
- 不建议用于银行、工作、政务、法律、关键账号找回等高敏感场景。
- API 目前只支持收信，不支持发信。
- 旧自定义邮箱可以重新创建同名前缀，并读取最近 24 小时内仍存在的邮件。
