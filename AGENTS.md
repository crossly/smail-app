# Repository Guidelines

## 交流与输出语言
- 与用户沟通、任务说明、变更总结默认使用中文。
- 仅在用户明确要求时使用英文。
- 代码标识符、文件名、路由 slug 保持英文，不做无必要翻译。

## 项目结构与模块说明
- `src/client/`：Vite React SPA，使用 TanStack Query 调用浏览器 session API。
- `src/server/`：Hono API、JWT 签发/校验、邮箱 service。
- `app/types/`：共享业务类型。
- `app/utils/`：核心邮件工具，包括入站解析、D1/R2 持久化、邮件正文清洗、保留策略、自定义邮箱 reservation、清理任务。
- `workers/app.ts`：Cloudflare Worker 入口，处理 `fetch` / `email` / `scheduled`。
- `migrations/*.sql`：D1 SQL 迁移文件，当前项目不使用 ORM。

## 真实数据架构（必须遵循）
- D1：存邮件元数据（`emails` 表）和自定义前缀占用（`email_reservations` 表）。
- R2：存邮件原始内容，对象 key = 邮件 `id`。
- 浏览器会话：`__session` HttpOnly JWT Cookie，不再使用 KV session。
- 自动化访问：`Authorization: Bearer <mailboxToken>` JWT。
- 邮件详情接口必须校验地址归属、token/session 有效性，以及邮件仍处于 24 小时保留窗口。
- 邮件可见性以邮件自身 `time` 为准，不要用邮箱签发时间提前隐藏邮件。
- 入站收件人地址必须规范化为小写，读取时也使用小写地址。

## 开发与构建命令
- `pnpm install`：安装依赖。
- `pnpm run dev`：构建、执行本地 D1 迁移，并用 Wrangler 启动完整 Worker 预览。
- `pnpm run dev:client`：仅启动 Vite 前端开发服务器。
- `pnpm run build`：生产构建 SPA 到 `dist/`。
- `pnpm run preview`：构建、执行本地 D1 迁移，并用 Wrangler 预览 Worker。
- `pnpm test`：运行核心单测。
- `pnpm run typecheck`：Cloudflare 类型生成 + TS 检查。
- `pnpm run cf-typegen`：重新生成 Cloudflare 环境类型。
- `pnpm run migrate:local`：本地执行 D1 迁移。
- `pnpm run migrate`：远端执行 D1 迁移（绑定名：`D1`）。
- `pnpm run deploy`：构建 + 迁移 + Wrangler 部署。

## 代码风格与命名规范
- 使用 TypeScript/TSX + ESM。
- 缩进使用 Tab。
- 保持现有文件风格一致，避免无关格式化。
- API 路由集中在 `src/server/app.ts`，业务逻辑优先下沉到 service 或 `app/utils/`。
- 变量/函数使用 `camelCase`，常量使用 `UPPER_SNAKE_CASE`。

## API 约定
- 浏览器 API：
  - `GET /api/session/mailbox`
  - `POST /api/session/mailbox`
  - `DELETE /api/session/mailbox`
  - `GET /api/session/inbox`
  - `GET /api/session/emails/:id`
- 自动化 API：
  - `POST /api/mailboxes`
  - `GET /api/mailboxes/:address/emails`
  - `GET /api/mailboxes/:address/emails/:id`
- 非 `/api/` 请求由 Worker 转交 `ASSETS`，用于服务 Vite SPA。

## 测试与提交前检查
提交前至少执行：
1. `pnpm test`
2. `pnpm run typecheck`
3. `pnpm run build`

涉及 D1 结构变更时还需：
- 提交对应 `migrations/*.sql`
- 在目标环境执行 `pnpm run migrate` 验证。

## Commit / PR 规范
- 提交信息使用简短祈使句，单次提交聚焦一个主题。
- PR 描述需包含：
  - 变更目的
  - 关键文件路径
  - 已执行命令及结果
  - 若有 UI 变化，附截图
- 涉及部署配置、D1/R2、Email Routing 或安全逻辑时，需明确说明影响范围。

## 安全与配置
- 禁止提交任何密钥、Token、私密凭证。
- `SESSION_SECRETS` 必填，用于浏览器 session JWT。
- `TOKEN_SECRETS` 可选，用于自动化 mailbox token；缺省回退到 `SESSION_SECRETS`。
- 多个 secret 使用逗号分隔，最左侧用于签发，全部用于验签。
- `wrangler.jsonc` 中的资源 ID/名称可公开，但不要提交可直接鉴权的敏感信息。
- 开源一键部署依赖仓库中的 `wrangler.jsonc`，不要只保留 example 文件。
