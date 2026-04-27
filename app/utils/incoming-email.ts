import Parser from "postal-mime";
import { persistIncomingEmail } from "./email-ingest.ts";

export const MAX_INCOMING_EMAIL_BYTES = 1024 * 1024;

type IncomingEmailInput = {
	to: string;
	raw: BodyInit;
};

type IncomingEmailOptions = {
	createId: () => string;
	maxRawBytes?: number;
	now?: () => number;
	warn?: typeof console.warn;
};

export type IncomingEmailResult =
	| { status: "persisted"; id: string }
	| { status: "ignored-domain" }
	| { status: "too-large" }
	| { status: "parse-failed" };

function getAddressDomain(address: string): string | null {
	const atIndex = address.lastIndexOf("@");
	if (atIndex < 0 || atIndex === address.length - 1) {
		return null;
	}
	return address.slice(atIndex + 1).toLowerCase();
}

function normalizeIncomingAddress(address: string): string {
	return address.trim().toLowerCase();
}

export async function handleIncomingEmail(
	env: Pick<Env, "D1" | "R2" | "MAIL_DOMAIN">,
	input: IncomingEmailInput,
	options: IncomingEmailOptions,
): Promise<IncomingEmailResult> {
	const mailDomain = env.MAIL_DOMAIN.toLowerCase();
	const normalizedToAddress = normalizeIncomingAddress(input.to);
	if (getAddressDomain(normalizedToAddress) !== mailDomain) {
		return { status: "ignored-domain" };
	}

	const raw = await new Response(input.raw).arrayBuffer();
	const maxRawBytes = options.maxRawBytes ?? MAX_INCOMING_EMAIL_BYTES;
	if (raw.byteLength > maxRawBytes) {
		(options.warn ?? console.warn)(
			"Incoming email rejected because it exceeded the size limit",
			{
				to: normalizedToAddress,
				rawBytes: raw.byteLength,
				maxRawBytes,
			},
		);
		return { status: "too-large" };
	}

	let parsed: Awaited<ReturnType<Parser["parse"]>>;
	try {
		const parser = new Parser();
		parsed = await parser.parse(raw);
	} catch {
		(options.warn ?? console.warn)("Incoming email rejected because parsing failed", {
			to: normalizedToAddress,
			rawBytes: raw.byteLength,
		});
		return { status: "parse-failed" };
	}

	const id = options.createId();
	await persistIncomingEmail(env, {
		id,
		raw,
		toAddress: normalizedToAddress,
		fromName: parsed.from?.name,
		fromAddress: parsed.from?.address,
		subject: parsed.subject,
		time: options.now?.() ?? Date.now(),
	});

	return { status: "persisted", id };
}
