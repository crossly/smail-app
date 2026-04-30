import test from "node:test";
import assert from "node:assert/strict";
import {
	createMailbox,
	deleteMailbox,
	fetchEmailDetail,
	fetchInbox,
	fetchMailbox,
	mailboxKeys,
} from "./api.ts";

type FetchCall = {
	url: string;
	init: RequestInit | undefined;
};

function installFetch(
	handler: (url: string, init: RequestInit | undefined) => Response,
) {
	const calls: FetchCall[] = [];
	const originalFetch = globalThis.fetch;

	globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
		const url = input.toString();
		calls.push({ url, init });
		return Promise.resolve(handler(url, init));
	}) as typeof fetch;

	return {
		calls,
		restore() {
			globalThis.fetch = originalFetch;
		},
	};
}

function jsonResponse(payload: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(payload), {
		status: 200,
		headers: { "content-type": "application/json" },
		...init,
	});
}

test("fetchMailbox calls the session mailbox endpoint with credentials", async () => {
	const fetchMock = installFetch(() =>
		jsonResponse({ address: "box@example.test", issuedAt: 1 }),
	);

	try {
		const mailbox = await fetchMailbox();

		assert.deepEqual(mailbox, {
			address: "box@example.test",
			issuedAt: 1,
		});
		assert.deepEqual(fetchMock.calls, [
			{
				url: "/api/session/mailbox",
				init: {
					credentials: "include",
					headers: {
						accept: "application/json",
					},
				},
			},
		]);
	} finally {
		fetchMock.restore();
	}
});

test("createMailbox sends an optional trimmed custom prefix", async () => {
	const fetchMock = installFetch(() =>
		jsonResponse({ address: "custom@example.test", issuedAt: 2 }),
	);

	try {
		await createMailbox("  custom  ");

		assert.equal(fetchMock.calls[0]?.url, "/api/session/mailbox");
		assert.deepEqual(fetchMock.calls[0]?.init, {
			method: "POST",
			credentials: "include",
			headers: {
				accept: "application/json",
				"content-type": "application/json",
			},
			body: JSON.stringify({ prefix: "custom" }),
		});
	} finally {
		fetchMock.restore();
	}
});

test("createMailbox omits the prefix for random generation", async () => {
	const fetchMock = installFetch(() =>
		jsonResponse({ address: "random@example.test", issuedAt: 3 }),
	);

	try {
		await createMailbox("");

		assert.equal(fetchMock.calls[0]?.init?.body, JSON.stringify({}));
	} finally {
		fetchMock.restore();
	}
});

test("fetchInbox and fetchEmailDetail use the session endpoints", async () => {
	const fetchMock = installFetch((url) => {
		if (url === "/api/session/inbox") {
			return jsonResponse({ emails: [] });
		}

		return jsonResponse({
			id: "email-1",
			to_address: "box@example.test",
			from_name: "Sender",
			from_address: "sender@example.test",
			subject: "Hello",
			time: 1_700_000_000_000,
			body: "<p>Hello</p>",
		});
	});

	try {
		await fetchInbox();
		await fetchEmailDetail("email-1");

		assert.deepEqual(
			fetchMock.calls.map((call) => call.url),
			["/api/session/inbox", "/api/session/emails/email-1"],
		);
		assert.equal(fetchMock.calls[1]?.init?.credentials, "include");
	} finally {
		fetchMock.restore();
	}
});

test("deleteMailbox uses DELETE and no request body", async () => {
	const fetchMock = installFetch(() => jsonResponse({ ok: true }));

	try {
		await deleteMailbox();

		assert.deepEqual(fetchMock.calls[0], {
			url: "/api/session/mailbox",
			init: {
				method: "DELETE",
				credentials: "include",
				headers: {
					accept: "application/json",
				},
			},
		});
	} finally {
		fetchMock.restore();
	}
});

test("session helpers surface API error messages", async () => {
	const fetchMock = installFetch(() =>
		jsonResponse({ error: "Mailbox expired." }, { status: 410 }),
	);

	try {
		await assert.rejects(fetchInbox, {
			message: "Mailbox expired.",
		});
	} finally {
		fetchMock.restore();
	}
});

test("mailboxKeys provide stable TanStack Query cache keys", () => {
	assert.deepEqual(mailboxKeys.mailbox(), ["session", "mailbox"]);
	assert.deepEqual(mailboxKeys.inbox(), ["session", "inbox"]);
	assert.deepEqual(mailboxKeys.email("email-1"), [
		"session",
		"emails",
		"email-1",
	]);
});
