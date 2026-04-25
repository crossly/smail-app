import { getRetentionCutoff } from "./mail-retention.ts";

export const MAIL_CLEANUP_BATCH_SIZE = 250;

type ExpiredEmailRow = {
	id: string;
};

export async function cleanupExpiredEmails(
	env: Pick<Env, "D1" | "R2">,
	options?: {
		now?: number;
		batchSize?: number;
	},
): Promise<{ deleted: number; cutoff: number }> {
	const now = options?.now ?? Date.now();
	const batchSize = options?.batchSize ?? MAIL_CLEANUP_BATCH_SIZE;
	const cutoff = getRetentionCutoff(now);
	let deleted = 0;

	while (true) {
		const { results } = await env.D1.prepare(
			"SELECT id FROM emails WHERE time < ? ORDER BY time ASC LIMIT ?",
		)
			.bind(cutoff, batchSize)
			.all<ExpiredEmailRow>();
		const ids = results.map((row) => row.id).filter(Boolean);

		if (ids.length === 0) {
			return { deleted, cutoff };
		}

		await Promise.all(ids.map((id) => env.R2.delete(id)));

		const placeholders = ids.map(() => "?").join(", ");
		await env.D1.prepare(`DELETE FROM emails WHERE id IN (${placeholders})`)
			.bind(...ids)
			.run();

		deleted += ids.length;
		if (ids.length < batchSize) {
			return { deleted, cutoff };
		}
	}
}
