import test from "node:test";
import assert from "node:assert/strict";
import {
	cleanupExpiredEmailReservations,
	reserveEmailAddress,
} from "./mail-reservations.ts";

function createReservationEnv(rows: {
	address: string;
	owner_token: string;
	expires_at: number;
}[] = []) {
	const reservations = [...rows];

	const env = {
		D1: {
			prepare(sql: string) {
				return {
					bind(...values: unknown[]) {
						return {
							async run() {
								if (sql.startsWith("DELETE FROM email_reservations WHERE address")) {
									const [address, now] = values as [string, number];
									for (let index = reservations.length - 1; index >= 0; index--) {
										if (
											reservations[index]!.address === address &&
											reservations[index]!.expires_at <= now
										) {
											reservations.splice(index, 1);
										}
									}
									return {};
								}

								if (sql.startsWith("DELETE FROM email_reservations WHERE expires_at")) {
									const [now] = values as [number];
									for (let index = reservations.length - 1; index >= 0; index--) {
										if (reservations[index]!.expires_at <= now) {
											reservations.splice(index, 1);
										}
									}
									return {};
								}

								if (sql.startsWith("INSERT INTO email_reservations")) {
									const [address, ownerToken, issuedAt, expiresAt] = values as [
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
									assert.equal(issuedAt, 1_700_000_000_000);
									return {};
								}

								throw new Error(`Unexpected SQL: ${sql}`);
							},
						};
					},
				};
			},
		},
	};

	return { env, reservations };
}

test("reserveEmailAddress stores a new reservation for the requested address", async () => {
	const now = 1_700_000_000_000;
	const { env, reservations } = createReservationEnv();

	const reserved = await reserveEmailAddress(
		env as unknown as Pick<Env, "D1">,
		{
			address: "reuse-this-box@mail.056650.xyz",
			ownerToken: "owner-1",
			now,
		},
	);

	assert.equal(reserved, true);
	assert.deepEqual(reservations, [
		{
			address: "reuse-this-box@mail.056650.xyz",
			owner_token: "owner-1",
			expires_at: now + 24 * 60 * 60 * 1000,
		},
	]);
});

test("reserveEmailAddress rejects an active reservation owned by another session", async () => {
	const now = 1_700_000_000_000;
	const { env, reservations } = createReservationEnv([
		{
			address: "reuse-this-box@mail.056650.xyz",
			owner_token: "owner-1",
			expires_at: now + 60_000,
		},
	]);

	const reserved = await reserveEmailAddress(
		env as unknown as Pick<Env, "D1">,
		{
			address: "reuse-this-box@mail.056650.xyz",
			ownerToken: "owner-2",
			now,
		},
	);

	assert.equal(reserved, false);
	assert.equal(reservations[0]!.owner_token, "owner-1");
});

test("reserveEmailAddress replaces an expired reservation", async () => {
	const now = 1_700_000_000_000;
	const { env, reservations } = createReservationEnv([
		{
			address: "reuse-this-box@mail.056650.xyz",
			owner_token: "owner-1",
			expires_at: now,
		},
	]);

	const reserved = await reserveEmailAddress(
		env as unknown as Pick<Env, "D1">,
		{
			address: "reuse-this-box@mail.056650.xyz",
			ownerToken: "owner-2",
			now,
		},
	);

	assert.equal(reserved, true);
	assert.deepEqual(reservations, [
		{
			address: "reuse-this-box@mail.056650.xyz",
			owner_token: "owner-2",
			expires_at: now + 24 * 60 * 60 * 1000,
		},
	]);
});

test("cleanupExpiredEmailReservations removes expired reservations", async () => {
	const now = 1_700_000_000_000;
	const { env, reservations } = createReservationEnv([
		{
			address: "old@mail.056650.xyz",
			owner_token: "owner-1",
			expires_at: now,
		},
		{
			address: "fresh@mail.056650.xyz",
			owner_token: "owner-2",
			expires_at: now + 1,
		},
	]);

	await cleanupExpiredEmailReservations(env as unknown as Pick<Env, "D1">, now);

	assert.deepEqual(reservations, [
		{
			address: "fresh@mail.056650.xyz",
			owner_token: "owner-2",
			expires_at: now + 1,
		},
	]);
});
