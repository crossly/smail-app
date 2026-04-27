import { MAIL_RETENTION_MS } from "./mail-retention.ts";

type ReserveEmailAddressOptions = {
	address: string;
	ownerToken: string;
	now?: number;
};

type ReleaseEmailAddressReservationOptions = {
	address: string;
	ownerToken: string;
};

export type ActiveEmailReservation = {
	owner_token: string;
	expires_at: number;
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
		const result = await env.D1.prepare(
			"UPDATE email_reservations SET issued_at = ?, expires_at = ? WHERE address = ? AND owner_token = ?",
		)
			.bind(now, expiresAt, options.address, options.ownerToken)
			.run();
		return (result.meta?.changes ?? 0) > 0;
	}
}

export async function releaseEmailAddressReservation(
	env: Pick<Env, "D1">,
	options: ReleaseEmailAddressReservationOptions,
): Promise<boolean> {
	const result = await env.D1.prepare(
		"DELETE FROM email_reservations WHERE address = ? AND owner_token = ?",
	)
		.bind(options.address, options.ownerToken)
	.run();
	return (result.meta?.changes ?? 0) > 0;
}

export async function getActiveEmailReservation(
	env: Pick<Env, "D1">,
	address: string,
	now = Date.now(),
): Promise<ActiveEmailReservation | null> {
	return env.D1
		.prepare(
			"SELECT owner_token, expires_at FROM email_reservations WHERE address = ? AND expires_at > ?",
		)
		.bind(address, now)
		.first<ActiveEmailReservation>();
}

export async function cleanupExpiredEmailReservations(
	env: Pick<Env, "D1">,
	now = Date.now(),
) {
	await env.D1.prepare("DELETE FROM email_reservations WHERE expires_at <= ?")
		.bind(now)
		.run();
}
