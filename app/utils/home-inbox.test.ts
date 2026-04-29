import test from "node:test";
import assert from "node:assert/strict";
import { loadHomeInbox } from "./home-inbox.ts";

function createD1ThatReturns(results: unknown[]) {
	return {
		prepare(sql: string) {
			assert.equal(
				sql,
				"SELECT * FROM emails WHERE to_address = ? AND time >= ? ORDER BY time DESC LIMIT 100",
			);
			return {
				bind(toAddress: string, visibleSince: number) {
					assert.equal(toAddress, "box@mail.056650.xyz");
					assert.equal(visibleSince, 1_700_000_000_000);
					return {
						async all() {
							return { results };
						},
					};
				},
			};
		},
	} as D1Database;
}

test("loadHomeInbox returns empty mail instead of throwing when D1 fails", async () => {
	const inbox = await loadHomeInbox({
		d1: {
			prepare() {
				throw new Error("D1 temporarily unavailable");
			},
		} as unknown as D1Database,
		address: "box@mail.056650.xyz",
		visibleSince: 1_700_000_000_000,
	});

	assert.deepEqual(inbox, {
		emails: [],
		status: "unavailable",
	});
});

test("loadHomeInbox drops malformed rows before they reach the UI", async () => {
	const inbox = await loadHomeInbox({
		d1: createD1ThatReturns([
			{
				id: "ok",
				to_address: "box@mail.056650.xyz",
				from_name: "Sender",
				from_address: "sender@example.test",
				subject: "Hello",
				time: 1_700_000_000_001,
			},
			{
				id: "bad-time",
				to_address: "box@mail.056650.xyz",
				from_name: "Sender",
				from_address: "sender@example.test",
				subject: "Broken",
				time: Number.NaN,
			},
			{
				to_address: "box@mail.056650.xyz",
				from_name: "Sender",
				from_address: "sender@example.test",
				subject: "Missing id",
				time: 1_700_000_000_002,
			},
		]),
		address: "box@mail.056650.xyz",
		visibleSince: 1_700_000_000_000,
	});

	assert.equal(inbox.status, "ready");
	assert.deepEqual(
		inbox.emails.map((email) => email.id),
		["ok"],
	);
});
