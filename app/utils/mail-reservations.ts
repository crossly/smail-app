import { MAIL_RETENTION_MS } from "./mail-retention.ts";

type ReserveEmailAddressOptions = {
	address: string;
	ownerToken: string;
	now?: number;
};

export async function reserveEmailAddress(
	env: Pick<Env, "D1">,
	options: ReserveEmailAddressOptions,
): Promise<boolean> {
	const now = options.now ?? Date.now();
	const expiresAt = now + MAIL_RETENTION_MS;

	await env.D1.prepare(
		"DELETE FROM email_reservations WHERE address = ? AND expires_at <= ?",
	)
		.bind(options.address, now)
		.run();

	try {
		await env.D1.prepare(
			"INSERT INTO email_reservations (address, owner_token, issued_at, expires_at) VALUES (?, ?, ?, ?)",
		)
			.bind(options.address, options.ownerToken, now, expiresAt)
			.run();
		return true;
	} catch {
		return false;
	}
}

export async function cleanupExpiredEmailReservations(
	env: Pick<Env, "D1">,
	now = Date.now(),
) {
	await env.D1.prepare("DELETE FROM email_reservations WHERE expires_at <= ?")
		.bind(now)
		.run();
}
