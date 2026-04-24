import test from "node:test";
import assert from "node:assert/strict";
import { cleanupExpiredEmails } from "./mail-cleanup.ts";
import { MAIL_RETENTION_MS } from "./mail-retention.ts";

function createCleanupEnv(rows: { id: string; time: number }[]) {
	const deletedObjects: string[] = [];
	const deletedRows: string[] = [];

	const env = {
		R2: {
			async delete(id: string) {
				deletedObjects.push(id);
			},
		},
		D1: {
			prepare(sql: string) {
				return {
					bind(...values: unknown[]) {
						return {
							async all() {
								const cutoff = values[0] as number;
								const limit = values[1] as number;
								return {
									results: rows
										.filter((row) => row.time < cutoff)
										.slice(0, limit)
										.map((row) => ({ id: row.id })),
								};
							},
							async run() {
								if (!sql.startsWith("DELETE FROM emails")) {
									return {};
								}
								deletedRows.push(...(values as string[]));
								return {};
							},
						};
					},
				};
			},
		},
	};

	return { env, deletedObjects, deletedRows };
}

test("cleanupExpiredEmails deletes expired R2 objects and D1 rows", async () => {
	const now = 1_700_000_000_000;
	const { env, deletedObjects, deletedRows } = createCleanupEnv([
		{ id: "old-1", time: now - MAIL_RETENTION_MS - 1 },
		{ id: "fresh", time: now - MAIL_RETENTION_MS + 1 },
		{ id: "old-2", time: now - MAIL_RETENTION_MS - 2 },
	]);

	const result = await cleanupExpiredEmails(env as unknown as Pick<Env, "D1" | "R2">, {
		now,
		batchSize: 10,
	});

	assert.deepEqual(deletedObjects, ["old-1", "old-2"]);
	assert.deepEqual(deletedRows, ["old-1", "old-2"]);
	assert.equal(result.deleted, 2);
	assert.equal(result.cutoff, now - MAIL_RETENTION_MS);
});
