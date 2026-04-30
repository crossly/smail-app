import {
	MailboxServiceError,
	createMailbox,
	deleteMailbox,
	getBearerToken,
	getMailboxEmail,
	listMailboxEmails,
} from "./mailbox-service.ts";
import { verifyToken } from "./jwt.ts";
import { Hono } from "hono";

type AppEnv = Pick<
	Env,
	"ASSETS" | "D1" | "INBOX_AUTO_REFRESH_INTERVAL_MS" | "MAIL_DOMAIN" | "R2"
> & {
	TOKEN_SECRETS?: string;
	SESSION_SECRETS?: string;
};

type ServerAppOptions = {
	now?: () => number;
};

type RouteHandler = (params: {
	request: Request;
	env: AppEnv;
	params: Record<string, string>;
}) => Promise<Response>;

type Route = {
	method: string;
	path: string;
	keys: string[];
	handler: RouteHandler;
};

type FetchHandler = (
	request: Request,
	env: AppEnv,
	ctx?: ExecutionContext,
) => Promise<Response>;

const SESSION_COOKIE_NAME = "__session";
const DEFAULT_INBOX_AUTO_REFRESH_INTERVAL_MS = 10_000;

function json(payload: unknown, init: ResponseInit = {}): Response {
	const headers = new Headers(init.headers);
	headers.set("content-type", "application/json");
	headers.set("cache-control", "no-store");

	return new Response(JSON.stringify(payload), {
		...init,
		headers,
	});
}

function jsonError(status: number, error: string): Response {
	return json({ error }, { status });
}

function getInboxAutoRefreshIntervalMs(env: AppEnv): number {
	const value = Number(env.INBOX_AUTO_REFRESH_INTERVAL_MS);
	if (!Number.isFinite(value) || value < 1_000) {
		return DEFAULT_INBOX_AUTO_REFRESH_INTERVAL_MS;
	}

	return Math.floor(value);
}

function getCookie(request: Request, name: string): string | null {
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) {
		return null;
	}

	for (const cookie of cookieHeader.split(";")) {
		const [rawName, ...rawValue] = cookie.trim().split("=");
		if (rawName === name) {
			return rawValue.join("=") || null;
		}
	}

	return null;
}

function createSessionCookie(token: string, expiresAt: number, now: number): string {
	return [
		`${SESSION_COOKIE_NAME}=${token}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		"Secure",
		`Max-Age=${Math.max(Math.floor((expiresAt - now) / 1000), 0)}`,
	].join("; ");
}

function destroySessionCookie(): string {
	return [
		`${SESSION_COOKIE_NAME}=`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		"Secure",
		"Max-Age=0",
	].join("; ");
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
	const contentType = request.headers.get("content-type");
	if (!contentType) {
		return {};
	}

	if (!contentType.toLowerCase().includes("application/json")) {
		throw new MailboxServiceError(415, "Expected application/json.");
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		throw new MailboxServiceError(400, "Invalid JSON body.");
	}

	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {};
	}

	return payload as Record<string, unknown>;
}

async function readMailboxPrefix(request: Request): Promise<string | undefined> {
	const payload = await readJsonObject(request);
	const prefix = payload.prefix;
	if (prefix === undefined || prefix === null) {
		return undefined;
	}

	if (typeof prefix !== "string") {
		throw new MailboxServiceError(400, "Mailbox prefix must be a string.");
	}

	return prefix;
}

async function getSessionPayload(env: AppEnv, request: Request, now: number) {
	const token = getCookie(request, SESSION_COOKIE_NAME);
	if (!token) {
		return null;
	}

	return verifyToken(env, token, "session", { now });
}

function withSessionCookie(
	response: Response,
	token: string,
	expiresAt: number,
	now: number,
) {
	const headers = new Headers(response.headers);
	headers.append("set-cookie", createSessionCookie(token, expiresAt, now));

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

export function createServerApp(options: ServerAppOptions = {}) {
	const now = options.now ?? Date.now;
	const routes: Route[] = [
		{
			method: "GET",
			path: "/api/session/mailbox",
			keys: [],
			handler: async ({ request, env }) => {
				const payload = await getSessionPayload(env, request, now());
				if (!payload) {
					return json({
						address: null,
						refreshIntervalMs: getInboxAutoRefreshIntervalMs(env),
					});
				}

				return json({
					address: payload.address,
					expiresAt: payload.exp * 1000,
					refreshIntervalMs: getInboxAutoRefreshIntervalMs(env),
				});
			},
		},
		{
			method: "POST",
			path: "/api/session/mailbox",
			keys: [],
			handler: async ({ request, env }) => {
				const prefix = await readMailboxPrefix(request);
				const currentToken = getCookie(request, SESSION_COOKIE_NAME);
				const mailbox = await createMailbox(env, {
					prefix,
					currentToken,
					tokenType: "session",
					now,
				});

				return withSessionCookie(
					json(
						{
							address: mailbox.address,
							expiresAt: mailbox.expiresAt,
							refreshIntervalMs: getInboxAutoRefreshIntervalMs(env),
						},
						{ status: 201 },
					),
					mailbox.token,
					mailbox.expiresAt,
					now(),
				);
			},
		},
		{
			method: "DELETE",
			path: "/api/session/mailbox",
			keys: [],
			handler: async ({ request, env }) => {
				await deleteMailbox(env, {
					token: getCookie(request, SESSION_COOKIE_NAME),
					tokenType: "session",
					now,
				});

				return json({ ok: true }, {
					headers: {
						"set-cookie": destroySessionCookie(),
					},
				});
			},
		},
		{
			method: "GET",
			path: "/api/session/inbox",
			keys: [],
			handler: async ({ request, env }) => {
				const token = getCookie(request, SESSION_COOKIE_NAME);
				if (!token) {
					return jsonError(401, "Missing session.");
				}

				const emails = await listMailboxEmails(env, {
					token,
					tokenType: "session",
					now,
				});
				const payload = await verifyToken(env, token, "session", { now: now() });

				return json({
					address: payload?.address ?? null,
					emails,
				});
			},
		},
		{
			method: "GET",
			path: "/api/session/emails/:id",
			keys: ["id"],
			handler: async ({ request, env, params }) => {
				const token = getCookie(request, SESSION_COOKIE_NAME);
				if (!token) {
					return jsonError(401, "Missing session.");
				}

				const email = await getMailboxEmail(env, {
					id: decodeURIComponent(params.id!),
					token,
					tokenType: "session",
					now,
				});

				return json(email);
			},
		},
		{
			method: "POST",
			path: "/api/mailboxes",
			keys: [],
			handler: async ({ request, env }) => {
				const prefix = await readMailboxPrefix(request);
				const mailbox = await createMailbox(env, {
					prefix,
					currentToken: getBearerToken(request.headers.get("authorization")),
					tokenType: "mailbox",
					now,
				});

				return json(
					{
						address: mailbox.address,
						mailboxToken: mailbox.token,
						expiresAt: mailbox.expiresAt,
					},
					{ status: 201 },
				);
			},
		},
		{
			method: "GET",
			path: "/api/mailboxes/:address/emails",
			keys: ["address"],
			handler: async ({ request, env, params }) => {
				const token = getBearerToken(request.headers.get("authorization"));
				if (!token) {
					return jsonError(401, "Missing mailbox token.");
				}

				const address = decodeURIComponent(params.address!).toLowerCase();
				const emails = await listMailboxEmails(env, {
					address,
					token,
					tokenType: "mailbox",
					now,
				});

				return json({
					address,
					emails,
				});
			},
		},
		{
			method: "GET",
			path: "/api/mailboxes/:address/emails/:id",
			keys: ["address", "id"],
			handler: async ({ request, env, params }) => {
				const token = getBearerToken(request.headers.get("authorization"));
				if (!token) {
					return jsonError(401, "Missing mailbox token.");
				}

				const email = await getMailboxEmail(env, {
					address: decodeURIComponent(params.address!).toLowerCase(),
					id: decodeURIComponent(params.id!),
					token,
					tokenType: "mailbox",
					now,
				});

				return json(email);
			},
		},
	];
	const hono = new Hono<{ Bindings: AppEnv }>();

	for (const route of routes) {
		hono.on(route.method, route.path, async (context) => {
			const params: Record<string, string> = {};
			for (const key of route.keys) {
				const value = context.req.param(key);
				if (value !== undefined) {
					params[key] = value;
				}
			}

			try {
				return await route.handler({
					request: context.req.raw,
					env: context.env,
					params,
				});
			} catch (error) {
				if (error instanceof MailboxServiceError) {
					return jsonError(error.status, error.message);
				}

				if (error instanceof Error) {
					console.error(error);
				}

				return jsonError(500, "Request failed.");
			}
		});
	}

	hono.notFound(() => jsonError(404, "Not found."));

	return {
		async fetch(
			request: Request,
			env: AppEnv,
			_ctx?: ExecutionContext,
		): Promise<Response> {
			if (!new URL(request.url).pathname.startsWith("/api/")) {
				return env.ASSETS.fetch(request);
			}

			return hono.fetch(request, env, _ctx);
		},
	};
}

export const app = createServerApp();
