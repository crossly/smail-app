import test from "node:test";
import assert from "node:assert/strict";
import { action as createMailboxAction } from "./api.mailboxes.ts";
import { loader as listMailboxEmailsLoader } from "./api.mailbox.emails.ts";
import { loader as getMailboxEmailLoader } from "./api.mailbox.email.ts";

type StoredEmail = {
	id: string;
	to_address: string;
	from_name: string;
	from_address: string;
	subject: string;
	time: number;
};

type ReservationRow = {
	address: string;
	owner_token: string;
	expires_at: number;
};

function createApiMailboxEnv(options?: {
	now?: number;
	emails?: StoredEmail[];
	rawEmails?: Record<string, string>;
	reservations?: ReservationRow[];
}) {
	const now = options?.now ?? 1_700_000_000_000;
	const emails = [...(options?.emails ?? [])];
	const rawEmails = new Map(Object.entries(options?.rawEmails ?? {}));
	const reservations = [...(options?.reservations ?? [])];

	const env = {
		MAIL_DOMAIN: "mail.056650.xyz",
		SESSION_SECRETS: "test-secret",
		D1: {
			prepare(sql: string) {
				return {
					bind(...values: unknown[]) {
						return {
							async run() {
								if (sql.startsWith("DELETE FROM email_reservations WHERE address")) {
									const [address, threshold] = values as [string, number];
									for (let index = reservations.length - 1; index >= 0; index--) {
										if (
											reservations[index]!.address === address &&
											reservations[index]!.expires_at <= threshold
										) {
											reservations.splice(index, 1);
										}
									}
									return {};
								}

								if (sql.startsWith("INSERT INTO email_reservations")) {
									const [address, ownerToken, _issuedAt, expiresAt] = values as [
										string,
										string,
										number,
										number,
									];
									if (reservations.some((row) => row.address === address)) {
										throw new Error("UNIQUE constraint failed");
									}
									reservations.push({
										address,
										owner_token: ownerToken,
										expires_at: expiresAt,
									});
									return {};
								}

								if (sql.startsWith("UPDATE email_reservations")) {
									const [_issuedAt, expiresAt, address, ownerToken] = values as [
										number,
										number,
										string,
										string,
									];
									const row = reservations.find(
										(candidate) =>
											candidate.address === address &&
											candidate.owner_token === ownerToken,
									);
									if (!row) {
										return { meta: { changes: 0 } };
									}
									row.expires_at = expiresAt;
									return { meta: { changes: 1 } };
								}

								throw new Error(`Unexpected run SQL: ${sql}`);
							},
							async all() {
								if (
									sql ===
									"SELECT * FROM emails WHERE to_address = ? AND time >= ? ORDER BY time DESC LIMIT 100"
								) {
									const [toAddress, visibleSince] = values as [string, number];
									return {
										results: emails
											.filter(
												(email) =>
													email.to_address === toAddress &&
													email.time >= visibleSince,
											)
											.sort((left, right) => right.time - left.time),
									};
								}

								throw new Error(`Unexpected all SQL: ${sql}`);
							},
							async first<T>() {
								if (
									sql ===
									"SELECT owner_token, expires_at FROM email_reservations WHERE address = ? AND expires_at > ?"
								) {
									const [address, threshold] = values as [string, number];
									const row = reservations.find(
										(candidate) =>
											candidate.address === address &&
											candidate.expires_at > threshold,
									);
									return (row ?? null) as T | null;
								}

								if (
									sql ===
									"SELECT * FROM emails WHERE id = ? AND to_address = ? AND time >= ?"
								) {
									const [id, address, visibleSince] = values as [
										string,
										string,
										number,
									];
									const row =
										emails.find(
											(email) =>
												email.id === id &&
												email.to_address === address &&
												email.time >= visibleSince,
										) ?? null;
									return row as T | null;
								}

								throw new Error(`Unexpected first SQL: ${sql}`);
							},
						};
					},
				};
			},
		},
		R2: {
			async get(id: string) {
				const body = rawEmails.get(id);
				if (!body) {
					return null;
				}

				return {
					body,
				};
			},
		},
	};

	return { env, now, reservations };
}

test("POST /api/mailboxes creates a custom mailbox and returns a bearer token", async () => {
	const { env } = createApiMailboxEnv();
	const previousNow = Date.now;
	Date.now = () => 1_700_000_000_000;

	try {
		const response = await createMailboxAction({
			request: new Request("https://mail.056650.xyz/api/mailboxes", {
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				body: JSON.stringify({ prefix: "reuse-this-box" }),
			}),
			context: {
				cloudflare: {
					env,
				},
			},
			params: {},
		} as never);

		assert.ok(response instanceof Response);
		assert.equal(response.status, 201);

		const payload = (await response.json()) as {
			address: string;
			mailboxToken: string;
			expiresAt: number;
		};

		assert.equal(payload.address, "reuse-this-box@mail.056650.xyz");
		assert.equal(typeof payload.mailboxToken, "string");
		assert.equal(payload.expiresAt, 1_700_000_000_000 + 24 * 60 * 60 * 1000);
	} finally {
		Date.now = previousNow;
	}
});

test("GET /api/mailboxes/:address/emails rejects requests without a bearer token", async () => {
	const { env } = createApiMailboxEnv();

	const response = await listMailboxEmailsLoader({
		request: new Request(
			"https://mail.056650.xyz/api/mailboxes/reuse-this-box@mail.056650.xyz/emails",
		),
		context: {
			cloudflare: {
				env,
			},
		},
		params: {
			address: "reuse-this-box@mail.056650.xyz",
		},
	} as never);

	assert.ok(response instanceof Response);
	assert.equal(response.status, 401);
});

test("GET /api/mailboxes/:address/emails returns matching emails for a valid mailbox token", async () => {
	const { env } = createApiMailboxEnv({
		emails: [
			{
				id: "msg-2",
				to_address: "reuse-this-box@mail.056650.xyz",
				from_name: "Sender Two",
				from_address: "two@example.test",
				subject: "Second",
				time: 1_700_000_000_000 - 1_000,
			},
			{
				id: "msg-1",
				to_address: "reuse-this-box@mail.056650.xyz",
				from_name: "Sender One",
				from_address: "one@example.test",
				subject: "First",
				time: 1_700_000_000_000 - 2_000,
			},
		],
	});
	const previousNow = Date.now;
	Date.now = () => 1_700_000_000_000;

	try {
		const createResponse = await createMailboxAction({
			request: new Request("https://mail.056650.xyz/api/mailboxes", {
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				body: JSON.stringify({ prefix: "reuse-this-box" }),
			}),
			context: {
				cloudflare: {
					env,
				},
			},
			params: {},
		} as never);
		const { mailboxToken } = (await createResponse.json()) as {
			mailboxToken: string;
		};

		const response = await listMailboxEmailsLoader({
			request: new Request(
				"https://mail.056650.xyz/api/mailboxes/reuse-this-box@mail.056650.xyz/emails",
				{
					headers: {
						authorization: `Bearer ${mailboxToken}`,
					},
				},
			),
			context: {
				cloudflare: {
					env,
				},
			},
			params: {
				address: "reuse-this-box@mail.056650.xyz",
			},
		} as never);

		assert.ok(response instanceof Response);
		assert.equal(response.status, 200);

		const payload = (await response.json()) as {
			emails: StoredEmail[];
		};
		assert.deepEqual(
			payload.emails.map((email) => email.id),
			["msg-2", "msg-1"],
		);
	} finally {
		Date.now = previousNow;
	}
});

test("GET /api/mailboxes/:address/emails/:id returns the parsed email detail for a valid token", async () => {
	const { env } = createApiMailboxEnv({
		emails: [
			{
				id: "msg-1",
				to_address: "reuse-this-box@mail.056650.xyz",
				from_name: "Sender One",
				from_address: "one@example.test",
				subject: "Hello",
				time: 1_700_000_000_000 - 1_000,
			},
		],
		rawEmails: {
			"msg-1":
				"From: Sender One <one@example.test>\r\nSubject: Hello\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nVerification code: 123456",
		},
	});
	const previousNow = Date.now;
	Date.now = () => 1_700_000_000_000;

	try {
		const createResponse = await createMailboxAction({
			request: new Request("https://mail.056650.xyz/api/mailboxes", {
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				body: JSON.stringify({ prefix: "reuse-this-box" }),
			}),
			context: {
				cloudflare: {
					env,
				},
			},
			params: {},
		} as never);
		const { mailboxToken } = (await createResponse.json()) as {
			mailboxToken: string;
		};

		const response = await getMailboxEmailLoader({
			request: new Request(
				"https://mail.056650.xyz/api/mailboxes/reuse-this-box@mail.056650.xyz/emails/msg-1",
				{
					headers: {
						authorization: `Bearer ${mailboxToken}`,
					},
				},
			),
			context: {
				cloudflare: {
					env,
				},
			},
			params: {
				address: "reuse-this-box@mail.056650.xyz",
				id: "msg-1",
			},
		} as never);

		assert.ok(response instanceof Response);
		assert.equal(response.status, 200);

		const payload = (await response.json()) as {
			id: string;
			text: string;
			html: string;
		};
		assert.equal(payload.id, "msg-1");
		assert.match(payload.text, /123456/);
		assert.match(payload.html, /123456/);
	} finally {
		Date.now = previousNow;
	}
});

test("GET /api/mailboxes/:address/emails rejects a custom mailbox token after ownership changes", async () => {
	const { env, reservations } = createApiMailboxEnv();
	const previousNow = Date.now;
	Date.now = () => 1_700_000_000_000;

	try {
		const createResponse = await createMailboxAction({
			request: new Request("https://mail.056650.xyz/api/mailboxes", {
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				body: JSON.stringify({ prefix: "reuse-this-box" }),
			}),
			context: {
				cloudflare: {
					env,
				},
			},
			params: {},
		} as never);
		const { mailboxToken } = (await createResponse.json()) as {
			mailboxToken: string;
		};

		reservations[0] = {
			address: "reuse-this-box@mail.056650.xyz",
			owner_token: "another-owner",
			expires_at: 1_700_000_000_000 + 24 * 60 * 60 * 1000,
		};

		const response = await listMailboxEmailsLoader({
			request: new Request(
				"https://mail.056650.xyz/api/mailboxes/reuse-this-box@mail.056650.xyz/emails",
				{
					headers: {
						authorization: `Bearer ${mailboxToken}`,
					},
				},
			),
			context: {
				cloudflare: {
					env,
				},
			},
			params: {
				address: "reuse-this-box@mail.056650.xyz",
			},
		} as never);

		assert.ok(response instanceof Response);
		assert.equal(response.status, 403);
	} finally {
		Date.now = previousNow;
	}
});
