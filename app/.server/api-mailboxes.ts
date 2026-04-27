import Parser from "postal-mime";
import { nanoid } from "nanoid";
import { getSessionSecrets } from "./session.ts";
import type { Email } from "../types/email.ts";
import { renderEmailBody } from "../utils/email-content.ts";
import {
	generateCustomEmailAddress,
	generateEmailAddress,
	normalizeEmailPrefix,
} from "../utils/mail.ts";
import { getMailboxVisibleSince } from "../utils/mail-access.ts";
import { MAIL_RETENTION_MS } from "../utils/mail-retention.ts";
import {
	getActiveEmailReservation,
	releaseEmailAddressReservation,
	reserveEmailAddress,
} from "../utils/mail-reservations.ts";

type MailboxTokenPayload = {
	v: 1;
	address: string;
	expiresAt: number;
	ownerToken?: string;
};

type ApiMailboxEnv = Pick<
	Env,
	"D1" | "MAIL_DOMAIN" | "R2" | "SESSION_SECRETS"
>;

type CreateApiMailboxOptions = {
	prefix?: string;
	currentMailboxToken?: string | null;
	now?: number;
};

type AuthorizeApiMailboxOptions = {
	address: string;
	mailboxToken: string;
	now?: number;
};

type MailboxEmailSummary = {
	id: string;
	address: string;
	fromName: string;
	fromAddress: string;
	subject: string;
	time: number;
};

type MailboxEmailDetail = MailboxEmailSummary & {
	text: string;
	html: string;
};

export class ApiMailboxError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "ApiMailboxError";
		this.status = status;
	}
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodeBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
	const padded = value.replace(/-/g, "+").replace(/_/g, "/");
	const normalized = padded + "=".repeat((4 - (padded.length % 4)) % 4);
	const binary = atob(normalized);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes;
}

function normalizeMailboxAddress(address: string): string {
	return address.trim().toLowerCase();
}

function isMailboxTokenPayload(value: unknown): value is MailboxTokenPayload {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Partial<MailboxTokenPayload>;
	return (
		candidate.v === 1 &&
		typeof candidate.address === "string" &&
		typeof candidate.expiresAt === "number" &&
		Number.isFinite(candidate.expiresAt) &&
		(candidate.ownerToken === undefined || typeof candidate.ownerToken === "string")
	);
}

async function signMailboxTokenValue(
	secret: string,
	encodedPayload: string,
): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(encodedPayload),
	);

	return encodeBase64Url(new Uint8Array(signature));
}

async function createMailboxToken(
	secrets: string[],
	payload: MailboxTokenPayload,
): Promise<string> {
	const encodedPayload = encodeBase64Url(
		encoder.encode(JSON.stringify(payload)),
	);
	const signature = await signMailboxTokenValue(secrets[0]!, encodedPayload);
	return `${encodedPayload}.${signature}`;
}

async function verifyMailboxToken(
	secrets: string[],
	token: string,
	now: number,
): Promise<MailboxTokenPayload | null> {
	const [encodedPayload, signature] = token.split(".");
	if (!encodedPayload || !signature) {
		return null;
	}

	for (const secret of secrets) {
		const expectedSignature = await signMailboxTokenValue(secret, encodedPayload);
		if (expectedSignature !== signature) {
			continue;
		}

		try {
			const payload = JSON.parse(
				decoder.decode(decodeBase64Url(encodedPayload)),
			) as unknown;
			if (!isMailboxTokenPayload(payload)) {
				return null;
			}

			const normalizedAddress = normalizeMailboxAddress(payload.address);
			if (payload.expiresAt <= now) {
				return null;
			}

			return {
				...payload,
				address: normalizedAddress,
			};
		} catch {
			return null;
		}
	}

	return null;
}

function toMailboxEmailSummary(email: Email): MailboxEmailSummary {
	return {
		id: email.id,
		address: email.to_address,
		fromName: email.from_name,
		fromAddress: email.from_address,
		subject: email.subject,
		time: email.time,
	};
}

export function getMailboxTokenFromAuthorizationHeader(
	authorizationHeader: string | null,
): string | null {
	if (!authorizationHeader) {
		return null;
	}

	const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
	if (scheme?.toLowerCase() !== "bearer" || !token) {
		return null;
	}

	return token;
}

export async function createApiMailbox(
	env: ApiMailboxEnv,
	options: CreateApiMailboxOptions,
): Promise<{
	address: string;
	mailboxToken: string;
	expiresAt: number;
}> {
	const now = options.now ?? Date.now();
	const secrets = getSessionSecrets(env);
	const currentTokenPayload =
		typeof options.currentMailboxToken === "string"
			? await verifyMailboxToken(secrets, options.currentMailboxToken, now)
			: null;
	const currentReservation =
		currentTokenPayload?.ownerToken && currentTokenPayload.address
			? {
					address: currentTokenPayload.address,
					ownerToken: currentTokenPayload.ownerToken,
				}
			: null;
	const normalizedPrefix = normalizeEmailPrefix(options.prefix ?? "");
	const expiresAt = now + MAIL_RETENTION_MS;
	let address: string;
	let ownerToken: string | undefined;

	if (normalizedPrefix) {
		address = generateCustomEmailAddress(normalizedPrefix, env.MAIL_DOMAIN);
		ownerToken =
			currentTokenPayload?.address === address &&
			typeof currentTokenPayload.ownerToken === "string"
				? currentTokenPayload.ownerToken
				: nanoid();

		const reserved = await reserveEmailAddress(env, {
			address,
			ownerToken,
			now,
		});
		if (!reserved) {
			throw new ApiMailboxError(
				409,
				"This mailbox prefix is currently in use.",
			);
		}
	} else {
		address = generateEmailAddress(env.MAIL_DOMAIN);
	}

	if (currentReservation && currentReservation.address !== address) {
		await releaseEmailAddressReservation(env, currentReservation);
	}

	const mailboxToken = await createMailboxToken(secrets, {
		v: 1,
		address,
		expiresAt,
		ownerToken,
	});

	return {
		address,
		mailboxToken,
		expiresAt,
	};
}

export async function authorizeApiMailbox(
	env: ApiMailboxEnv,
	options: AuthorizeApiMailboxOptions,
): Promise<MailboxTokenPayload> {
	const now = options.now ?? Date.now();
	const normalizedAddress = normalizeMailboxAddress(options.address);
	const payload = await verifyMailboxToken(
		getSessionSecrets(env),
		options.mailboxToken,
		now,
	);

	if (!payload || payload.address !== normalizedAddress) {
		throw new ApiMailboxError(403, "Invalid mailbox token.");
	}

	if (payload.ownerToken) {
		const reservation = await getActiveEmailReservation(
			env,
			normalizedAddress,
			now,
		);
		if (!reservation || reservation.owner_token !== payload.ownerToken) {
			throw new ApiMailboxError(403, "Mailbox ownership has changed.");
		}
	}

	return payload;
}

export async function listApiMailboxEmails(
	env: ApiMailboxEnv,
	options: AuthorizeApiMailboxOptions,
): Promise<MailboxEmailSummary[]> {
	const now = options.now ?? Date.now();
	const payload = await authorizeApiMailbox(env, {
		...options,
		now,
	});
	const visibleSince = getMailboxVisibleSince(undefined, now);
	const { results } = await env.D1
		.prepare(
			"SELECT * FROM emails WHERE to_address = ? AND time >= ? ORDER BY time DESC LIMIT 100",
		)
		.bind(payload.address, visibleSince)
		.all();

	return (results as Email[]).map(toMailboxEmailSummary);
}

export async function getApiMailboxEmail(
	env: ApiMailboxEnv,
	options: AuthorizeApiMailboxOptions & { id: string },
): Promise<MailboxEmailDetail> {
	const now = options.now ?? Date.now();
	const payload = await authorizeApiMailbox(env, {
		...options,
		now,
	});
	const visibleSince = getMailboxVisibleSince(undefined, now);
	const mail = await env.D1
		.prepare("SELECT * FROM emails WHERE id = ? AND to_address = ? AND time >= ?")
		.bind(options.id, payload.address, visibleSince)
		.first<Email>();
	if (!mail) {
		throw new ApiMailboxError(404, "Email not found.");
	}

	const object = await env.R2.get(options.id);
	if (!object) {
		throw new ApiMailboxError(404, "Email body not found.");
	}

	const parser = new Parser();
	const message = await parser.parse(object.body);

	return {
		...toMailboxEmailSummary(mail),
		text: message.text ?? "",
		html: renderEmailBody({
			html: message.html,
			text: message.text,
		}),
	};
}
