export type StoredEmail = {
	id: string;
	to_address: string;
	from_name: string;
	from_address: string;
	subject: string;
	time: number;
};

export type ReservationRow = {
	address: string;
	owner_token: string;
	expires_at: number;
};

type TestEnvOptions = {
	now?: number;
	emails?: StoredEmail[];
	rawEmails?: Record<string, string>;
	reservations?: ReservationRow[];
	tokenSecrets?: string;
	sessionSecrets?: string;
};

export function createTestEnv(options: TestEnvOptions = {}) {
	const emails = [...(options.emails ?? [])];
	const rawEmails = new Map(Object.entries(options.rawEmails ?? {}));
	const reservations = [...(options.reservations ?? [])];
	const deletedReservations: ReservationRow[] = [];

	const env = {
		MAIL_DOMAIN: "mail.056650.xyz",
		INBOX_AUTO_REFRESH_INTERVAL_MS: "10000",
		TOKEN_SECRETS: options.tokenSecrets,
		SESSION_SECRETS: options.sessionSecrets ?? "legacy-secret",
		D1: {
			prepare(sql: string) {
				return {
					bind(...values: unknown[]) {
						return {
							async run() {
								if (
									sql.startsWith(
										"DELETE FROM email_reservations WHERE address = ? AND owner_token = ?",
									)
								) {
									const [address, ownerToken] = values as [string, string];
									const previousLength = reservations.length;
									for (let index = reservations.length - 1; index >= 0; index--) {
										const row = reservations[index]!;
										if (
											row.address === address &&
											row.owner_token === ownerToken
										) {
											deletedReservations.push(row);
											reservations.splice(index, 1);
										}
									}
									return {
										meta: {
											changes: previousLength - reservations.length,
										},
									};
								}

								if (sql.startsWith("DELETE FROM email_reservations WHERE address")) {
									const [address, threshold] = values as [string, number];
									for (let index = reservations.length - 1; index >= 0; index--) {
										const row = reservations[index]!;
										if (row.address === address && row.expires_at <= threshold) {
											deletedReservations.push(row);
											reservations.splice(index, 1);
										}
									}
									return {};
								}

								if (sql.startsWith("DELETE FROM email_reservations WHERE expires_at")) {
									const [threshold] = values as [number];
									for (let index = reservations.length - 1; index >= 0; index--) {
										const row = reservations[index]!;
										if (row.expires_at <= threshold) {
											deletedReservations.push(row);
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

	return {
		env,
		emails,
		reservations,
		deletedReservations,
		now: options.now ?? 1_700_000_000_000,
	};
}
