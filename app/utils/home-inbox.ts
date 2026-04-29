import type { Email } from "../types/email.ts";

export type HomeInboxLoadStatus = "ready" | "unavailable";

type LoadHomeInboxOptions = {
	d1: D1Database;
	address: string | null;
	visibleSince: number;
};

type LoadHomeInboxResult = {
	emails: Email[];
	status: HomeInboxLoadStatus;
};

function asFiniteNumber(value: unknown): number | null {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return null;
	}

	return value;
}

function asString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function toHomeEmail(value: unknown): Email | null {
	if (!value || typeof value !== "object") {
		return null;
	}

	const row = value as Partial<Record<keyof Email, unknown>>;
	const id = asString(row.id);
	const toAddress = asString(row.to_address);
	const time = asFiniteNumber(row.time);

	if (!id || !toAddress || time === null) {
		return null;
	}

	return {
		id,
		to_address: toAddress,
		from_name: asString(row.from_name),
		from_address: asString(row.from_address),
		subject: asString(row.subject, "(No subject)"),
		time,
	};
}

export async function loadHomeInbox(
	options: LoadHomeInboxOptions,
): Promise<LoadHomeInboxResult> {
	if (!options.address) {
		return {
			emails: [],
			status: "ready",
		};
	}

	try {
		const { results } = await options.d1
			.prepare(
				"SELECT * FROM emails WHERE to_address = ? AND time >= ? ORDER BY time DESC LIMIT 100",
			)
			.bind(options.address, options.visibleSince)
			.all();

		return {
			emails: (results as unknown[]).flatMap((row) => {
				const email = toHomeEmail(row);
				return email ? [email] : [];
			}),
			status: "ready",
		};
	} catch {
		return {
			emails: [],
			status: "unavailable",
		};
	}
}
