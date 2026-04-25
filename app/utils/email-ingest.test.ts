import test from "node:test";
import assert from "node:assert/strict";
import { persistIncomingEmail } from "./email-ingest.ts";

type Operation = {
	kind: string;
	id: string;
};

function createEmailIngestEnv(options?: {
	failInsert?: boolean;
}) {
	const operations: Operation[] = [];
	const storedObjects = new Set<string>();

	const env = {
		R2: {
			async put(id: string, _value: ArrayBuffer) {
				operations.push({ kind: "r2-put", id });
				storedObjects.add(id);
			},
			async delete(id: string) {
				operations.push({ kind: "r2-delete", id });
				storedObjects.delete(id);
			},
		},
		D1: {
			prepare(_sql: string) {
				return {
					bind(id: string) {
						return {
							async run() {
								operations.push({ kind: "d1-insert", id });
								if (options?.failInsert) {
									throw new Error("insert failed");
								}
								return {};
							},
						};
					},
				};
			},
		},
	};

	return { env, operations, storedObjects };
}

test("persistIncomingEmail stores the raw message before inserting D1 metadata", async () => {
	const raw = new Uint8Array([1, 2, 3]).buffer;
	const { env, operations, storedObjects } = createEmailIngestEnv();

	await persistIncomingEmail(env as unknown as Pick<Env, "D1" | "R2">, {
		id: "msg-1",
		raw,
		toAddress: "box@mail.056650.xyz",
		fromName: "Sender",
		fromAddress: "sender@example.test",
		subject: "Hello",
		time: 1_700_000_000_000,
	});

	assert.deepEqual(operations, [
		{ kind: "r2-put", id: "msg-1" },
		{ kind: "d1-insert", id: "msg-1" },
	]);
	assert.deepEqual([...storedObjects], ["msg-1"]);
});

test("persistIncomingEmail removes the raw object when D1 metadata insertion fails", async () => {
	const raw = new Uint8Array([1, 2, 3]).buffer;
	const { env, operations, storedObjects } = createEmailIngestEnv({
		failInsert: true,
	});

	await assert.rejects(
		persistIncomingEmail(env as unknown as Pick<Env, "D1" | "R2">, {
			id: "msg-2",
			raw,
			toAddress: "box@mail.056650.xyz",
			fromName: "Sender",
			fromAddress: "sender@example.test",
			subject: "Hello",
			time: 1_700_000_000_000,
		}),
		/insert failed/,
	);

	assert.deepEqual(operations, [
		{ kind: "r2-put", id: "msg-2" },
		{ kind: "d1-insert", id: "msg-2" },
		{ kind: "r2-delete", id: "msg-2" },
	]);
	assert.deepEqual([...storedObjects], []);
});
