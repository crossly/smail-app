import test from "node:test";
import assert from "node:assert/strict";
import { createServerApp } from "./app.ts";
import { createTestEnv } from "./test-env.ts";

function getSetCookie(response: Response): string {
	const cookie = response.headers.get("set-cookie");
	if (!cookie) {
		throw new Error("Expected response to set a cookie.");
	}

	return cookie;
}

test("browser session API creates, reads inbox, reads detail, and deletes a mailbox", async () => {
	const now = 1_700_000_000_000;
	const { env, reservations, deletedReservations } = createTestEnv({
		now,
		tokenSecrets: "token-secret",
		emails: [
			{
				id: "fresh",
				to_address: "reuse-this-box@mail.056650.xyz",
				from_name: "Sender Fresh",
				from_address: "fresh@example.test",
				subject: "Fresh",
				time: now - 1_000,
			},
			{
				id: "old",
				to_address: "reuse-this-box@mail.056650.xyz",
				from_name: "Sender Old",
				from_address: "old@example.test",
				subject: "Old",
				time: now - 25 * 60 * 60 * 1000,
			},
		],
		rawEmails: {
			fresh:
				"From: Sender Fresh <fresh@example.test>\r\nSubject: Fresh\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nCode: 123456",
		},
	});
	const app = createServerApp({ now: () => now });

	const createResponse = await app.fetch(
		new Request("https://mail.056650.xyz/api/session/mailbox", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({ prefix: "Reuse-This-Box" }),
		}),
		env as never,
	);
	assert.equal(createResponse.status, 201);
	const createPayload = (await createResponse.json()) as {
		address: string;
		expiresAt: number;
		refreshIntervalMs: number;
	};
	assert.equal(createPayload.address, "reuse-this-box@mail.056650.xyz");
	assert.equal(createPayload.expiresAt, now + 24 * 60 * 60 * 1000);
	assert.equal(createPayload.refreshIntervalMs, 10_000);
	assert.equal(reservations.length, 1);

	const cookie = getSetCookie(createResponse);
	assert.match(cookie, /__session=/);
	assert.match(cookie, /HttpOnly/);

	const mailboxResponse = await app.fetch(
		new Request("https://mail.056650.xyz/api/session/mailbox", {
			headers: {
				cookie,
			},
		}),
		env as never,
	);
	assert.equal(mailboxResponse.status, 200);
	assert.deepEqual(await mailboxResponse.json(), {
		address: "reuse-this-box@mail.056650.xyz",
		expiresAt: now + 24 * 60 * 60 * 1000,
		refreshIntervalMs: 10_000,
	});

	const inboxResponse = await app.fetch(
		new Request("https://mail.056650.xyz/api/session/inbox", {
			headers: {
				cookie,
			},
		}),
		env as never,
	);
	assert.equal(inboxResponse.status, 200);
	const inboxPayload = (await inboxResponse.json()) as {
		address: string;
		emails: { id: string }[];
	};
	assert.equal(inboxPayload.address, "reuse-this-box@mail.056650.xyz");
	assert.deepEqual(
		inboxPayload.emails.map((email) => email.id),
		["fresh"],
	);

	const emailResponse = await app.fetch(
		new Request("https://mail.056650.xyz/api/session/emails/fresh", {
			headers: {
				cookie,
			},
		}),
		env as never,
	);
	assert.equal(emailResponse.status, 200);
	const emailPayload = (await emailResponse.json()) as {
		id: string;
		text: string;
		html: string;
	};
	assert.equal(emailPayload.id, "fresh");
	assert.match(emailPayload.text, /123456/);
	assert.match(emailPayload.html, /123456/);

	const deleteResponse = await app.fetch(
		new Request("https://mail.056650.xyz/api/session/mailbox", {
			method: "DELETE",
			headers: {
				cookie,
			},
		}),
		env as never,
	);
	assert.equal(deleteResponse.status, 200);
	assert.deepEqual(await deleteResponse.json(), { ok: true });
	assert.equal(reservations.length, 0);
	assert.equal(deletedReservations[0]?.address, "reuse-this-box@mail.056650.xyz");
});

test("switching a custom browser mailbox releases the previous reservation", async () => {
	const now = 1_700_000_000_000;
	const { env, reservations, deletedReservations } = createTestEnv({
		now,
		tokenSecrets: "token-secret",
	});
	const app = createServerApp({ now: () => now });

	const firstResponse = await app.fetch(
		new Request("https://mail.056650.xyz/api/session/mailbox", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({ prefix: "First-Box" }),
		}),
		env as never,
	);
	const firstCookie = getSetCookie(firstResponse);

	const secondResponse = await app.fetch(
		new Request("https://mail.056650.xyz/api/session/mailbox", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				cookie: firstCookie,
			},
			body: JSON.stringify({ prefix: "Second-Box" }),
		}),
		env as never,
	);
	assert.equal(secondResponse.status, 201);
	assert.deepEqual(
		reservations.map((row) => row.address),
		["second-box@mail.056650.xyz"],
	);
	assert.equal(deletedReservations[0]?.address, "first-box@mail.056650.xyz");
});

test("browser session API returns a 400 for invalid mailbox prefixes", async () => {
	const now = 1_700_000_000_000;
	const { env } = createTestEnv({
		now,
		tokenSecrets: "token-secret",
	});
	const app = createServerApp({ now: () => now });

	const response = await app.fetch(
		new Request("https://mail.056650.xyz/api/session/mailbox", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({ prefix: "no spaces please" }),
		}),
		env as never,
	);

	assert.equal(response.status, 400);
	assert.match(((await response.json()) as { error: string }).error, /prefix/i);
});

test("unexpected backend failures return a generic 500 error", async () => {
	const now = 1_700_000_000_000;
	const { env } = createTestEnv({
		now,
		tokenSecrets: "token-secret",
	});
	const app = createServerApp({ now: () => now });
	const createResponse = await app.fetch(
		new Request("https://mail.056650.xyz/api/session/mailbox", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({}),
		}),
		env as never,
	);
	const cookie = getSetCookie(createResponse);

	env.D1.prepare = () => ({
		bind: () => ({
			async all() {
				throw new Error("D1_ERROR: sensitive database details");
			},
		}),
	}) as never;

	const response = await app.fetch(
		new Request("https://mail.056650.xyz/api/session/inbox", {
			headers: {
				cookie,
			},
		}),
		env as never,
	);

	assert.equal(response.status, 500);
	assert.deepEqual(await response.json(), { error: "Request failed." });
});

test("agent API uses mailbox bearer tokens and lowercases mixed-case addresses", async () => {
	const now = 1_700_000_000_000;
	const { env } = createTestEnv({
		now,
		tokenSecrets: "token-secret",
		emails: [
			{
				id: "msg-1",
				to_address: "agent-box@mail.056650.xyz",
				from_name: "Sender",
				from_address: "sender@example.test",
				subject: "Agent",
				time: now - 1_000,
			},
		],
		rawEmails: {
			"msg-1":
				"From: Sender <sender@example.test>\r\nSubject: Agent\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nAgent code",
		},
	});
	const app = createServerApp({ now: () => now });

	const createResponse = await app.fetch(
		new Request("https://mail.056650.xyz/api/mailboxes", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({ prefix: "Agent-Box" }),
		}),
		env as never,
	);
	assert.equal(createResponse.status, 201);
	const createPayload = (await createResponse.json()) as {
		address: string;
		mailboxToken: string;
	};
	assert.equal(createPayload.address, "agent-box@mail.056650.xyz");

	const listResponse = await app.fetch(
		new Request(
			"https://mail.056650.xyz/api/mailboxes/AGENT-BOX@MAIL.056650.XYZ/emails",
			{
				headers: {
					authorization: `Bearer ${createPayload.mailboxToken}`,
				},
			},
		),
		env as never,
	);
	assert.equal(listResponse.status, 200);
	const listPayload = (await listResponse.json()) as {
		address: string;
		emails: { id: string }[];
	};
	assert.equal(listPayload.address, "agent-box@mail.056650.xyz");
	assert.deepEqual(
		listPayload.emails.map((email) => email.id),
		["msg-1"],
	);

	const detailResponse = await app.fetch(
		new Request(
			"https://mail.056650.xyz/api/mailboxes/AGENT-BOX@MAIL.056650.XYZ/emails/msg-1",
			{
				headers: {
					authorization: `Bearer ${createPayload.mailboxToken}`,
				},
			},
		),
		env as never,
	);
	assert.equal(detailResponse.status, 200);
	assert.equal(((await detailResponse.json()) as { id: string }).id, "msg-1");
});

test("non-api requests are served by the Cloudflare assets binding", async () => {
	const { env } = createTestEnv({
		tokenSecrets: "token-secret",
	});
	const app = createServerApp();
	const assetRequests: string[] = [];
	const assetResponse = new Response("<div id=\"root\"></div>", {
		headers: {
			"content-type": "text/html",
		},
	});

	const response = await app.fetch(
		new Request("https://mail.056650.xyz/"),
		{
			...env,
			ASSETS: {
				fetch(request: Request) {
					assetRequests.push(request.url);
					return Promise.resolve(assetResponse);
				},
			},
		} as never,
	);

	assert.equal(response.status, 200);
	assert.equal(await response.text(), "<div id=\"root\"></div>");
	assert.deepEqual(assetRequests, ["https://mail.056650.xyz/"]);
});
