import Parser from "postal-mime";
import { nanoid } from "nanoid";
import type { Email } from "../../app/types/email.ts";
import { renderEmailBody } from "../../app/utils/email-content.ts";
import { getMailboxVisibleSince } from "../../app/utils/mail-access.ts";
import {
	generateCustomEmailAddress,
	generateEmailAddress,
	normalizeEmailPrefix,
} from "../../app/utils/mail.ts";
import { MAIL_RETENTION_MS } from "../../app/utils/mail-retention.ts";
import {
	getActiveEmailReservation,
	releaseEmailAddressReservation,
	reserveEmailAddress,
} from "../../app/utils/mail-reservations.ts";
import { signToken, type TokenPayload, type TokenType, verifyToken } from "./jwt.ts";

type MailboxEnv = Pick<Env, "D1" | "MAIL_DOMAIN" | "R2"> & {
	TOKEN_SECRETS?: string;
	SESSION_SECRETS?: string;
};

type Clock = {
	now?: () => number;
};

type CreateMailboxOptions = Clock & {
	prefix?: string;
	currentToken?: string | null;
	tokenType: TokenType;
};

type AuthorizeMailboxOptions = Clock & {
	address?: string;
	token: string;
	tokenType: TokenType;
};

export type MailboxEmailSummary = {
	id: string;
	to_address: string;
	from_name: string;
	from_address: string;
	subject: string;
	time: number;
};

export type MailboxEmailDetail = MailboxEmailSummary & {
	body: string;
	text: string;
	html: string;
};

export class MailboxServiceError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "MailboxServiceError";
		this.status = status;
	}
}

function getNow(options: Clock): number {
	return options.now ? options.now() : Date.now();
}

function getExpiresAt(now: number): number {
	return now + MAIL_RETENTION_MS;
}

function toSeconds(value: number): number {
	return Math.floor(value / 1000);
}

function normalizeAddress(address: string): string {
	return address.trim().toLowerCase();
}

function toEmailSummary(email: Email): MailboxEmailSummary {
	return {
		id: email.id,
		to_address: email.to_address,
		from_name: email.from_name,
		from_address: email.from_address,
		subject: email.subject,
		time: email.time,
	};
}

async function readCurrentToken(
	env: MailboxEnv,
	token: string | null | undefined,
	tokenType: TokenType,
	now: number,
): Promise<TokenPayload | null> {
	if (!token) {
		return null;
	}

	return verifyToken(env, token, tokenType, { now });
}

async function releaseCurrentReservation(
	env: MailboxEnv,
	currentPayload: TokenPayload | null,
	nextAddress: string | null,
) {
	if (
		!currentPayload?.ownerToken ||
		(nextAddress && currentPayload.address === nextAddress)
	) {
		return;
	}

	await releaseEmailAddressReservation(env, {
		address: currentPayload.address,
		ownerToken: currentPayload.ownerToken,
	});
}

export async function createMailbox(
	env: MailboxEnv,
	options: CreateMailboxOptions,
) {
	const now = getNow(options);
	const currentPayload = await readCurrentToken(
		env,
		options.currentToken,
		options.tokenType,
		now,
	);
	const normalizedPrefix = normalizeEmailPrefix(options.prefix ?? "");
	const expiresAt = getExpiresAt(now);
	let address: string;
	let ownerToken: string | undefined;

	if (normalizedPrefix) {
		try {
			address = generateCustomEmailAddress(normalizedPrefix, env.MAIL_DOMAIN);
		} catch (error) {
			throw new MailboxServiceError(
				400,
				error instanceof Error ? error.message : "Invalid mailbox prefix.",
			);
		}
		ownerToken =
			currentPayload?.address === address && currentPayload.ownerToken
				? currentPayload.ownerToken
				: nanoid();

		const reserved = await reserveEmailAddress(env, {
			address,
			ownerToken,
			now,
		});
		if (!reserved) {
			throw new MailboxServiceError(
				409,
				"This mailbox prefix is currently in use.",
			);
		}
	} else {
		address = generateEmailAddress(env.MAIL_DOMAIN);
	}

	await releaseCurrentReservation(env, currentPayload, address);

	const token = await signToken(env, {
		typ: options.tokenType,
		address,
		ownerToken,
		iat: toSeconds(now),
		exp: toSeconds(expiresAt),
	});

	return {
		address,
		expiresAt,
		token,
		ownerToken,
	};
}

export async function deleteMailbox(
	env: MailboxEnv,
	options: Clock & {
		token: string | null;
		tokenType: TokenType;
	},
): Promise<void> {
	const now = getNow(options);
	const currentPayload = await readCurrentToken(
		env,
		options.token,
		options.tokenType,
		now,
	);

	await releaseCurrentReservation(env, currentPayload, null);
}

export async function authorizeMailbox(
	env: MailboxEnv,
	options: AuthorizeMailboxOptions,
): Promise<TokenPayload> {
	const now = getNow(options);
	const payload = await verifyToken(env, options.token, options.tokenType, {
		now,
	});
	const expectedAddress = options.address
		? normalizeAddress(options.address)
		: undefined;

	if (!payload || (expectedAddress && payload.address !== expectedAddress)) {
		throw new MailboxServiceError(403, "Invalid mailbox token.");
	}

	if (payload.ownerToken) {
		const reservation = await getActiveEmailReservation(env, payload.address, now);
		if (!reservation || reservation.owner_token !== payload.ownerToken) {
			throw new MailboxServiceError(403, "Mailbox ownership has changed.");
		}
	}

	return payload;
}

export async function listMailboxEmails(
	env: MailboxEnv,
	options: AuthorizeMailboxOptions,
): Promise<MailboxEmailSummary[]> {
	const now = getNow(options);
	const payload = await authorizeMailbox(env, {
		...options,
		now: () => now,
	});
	const visibleSince = getMailboxVisibleSince(undefined, now);
	const { results } = await env.D1
		.prepare(
			"SELECT * FROM emails WHERE to_address = ? AND time >= ? ORDER BY time DESC LIMIT 100",
		)
		.bind(payload.address, visibleSince)
		.all();

	return (results as Email[]).map(toEmailSummary);
}

export async function getMailboxEmail(
	env: MailboxEnv,
	options: AuthorizeMailboxOptions & { id: string },
): Promise<MailboxEmailDetail> {
	const now = getNow(options);
	const payload = await authorizeMailbox(env, {
		...options,
		now: () => now,
	});
	const visibleSince = getMailboxVisibleSince(undefined, now);
	const mail = await env.D1
		.prepare("SELECT * FROM emails WHERE id = ? AND to_address = ? AND time >= ?")
		.bind(options.id, payload.address, visibleSince)
		.first<Email>();
	if (!mail) {
		throw new MailboxServiceError(404, "Email not found.");
	}

	const object = await env.R2.get(options.id);
	if (!object) {
		throw new MailboxServiceError(404, "Email body not found.");
	}

	const parser = new Parser();
	const message = await parser.parse(object.body);
	const html = renderEmailBody({
		html: message.html,
		text: message.text,
	});

	return {
		...toEmailSummary(mail),
		body: html,
		text: message.text ?? "",
		html,
	};
}

export function getBearerToken(authorizationHeader: string | null): string | null {
	if (!authorizationHeader) {
		return null;
	}

	const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
	if (scheme?.toLowerCase() !== "bearer" || !token) {
		return null;
	}

	return token;
}
