export type TokenType = "session" | "mailbox";

export type TokenPayload = {
	typ: TokenType;
	address: string;
	ownerToken?: string;
	iat: number;
	exp: number;
};

type TokenEnv = {
	TOKEN_SECRETS?: string;
	SESSION_SECRETS?: string;
};

type VerifyTokenOptions = {
	now?: number;
};

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

function getTokenSecrets(env: TokenEnv): string[] {
	const source = env.TOKEN_SECRETS || env.SESSION_SECRETS || "";
	const secrets = source
		.split(",")
		.map((secret) => secret.trim())
		.filter(Boolean);

	if (secrets.length === 0) {
		throw new Error("Missing token secret. Set TOKEN_SECRETS or SESSION_SECRETS.");
	}

	return secrets;
}

async function importHmacKey(secret: string, usage: KeyUsage) {
	return crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		[usage],
	);
}

async function signValue(secret: string, value: string): Promise<string> {
	const key = await importHmacKey(secret, "sign");
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

	return encodeBase64Url(new Uint8Array(signature));
}

async function verifyValue(
	secret: string,
	value: string,
	signature: string,
): Promise<boolean> {
	const key = await importHmacKey(secret, "verify");
	const signatureBytes = decodeBase64Url(signature);
	const signatureBuffer = signatureBytes.buffer.slice(
		signatureBytes.byteOffset,
		signatureBytes.byteOffset + signatureBytes.byteLength,
	) as ArrayBuffer;

	return crypto.subtle.verify(
		"HMAC",
		key,
		signatureBuffer,
		encoder.encode(value),
	);
}

function isTokenPayload(value: unknown): value is TokenPayload {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Partial<TokenPayload>;
	return (
		(candidate.typ === "session" || candidate.typ === "mailbox") &&
		typeof candidate.address === "string" &&
		typeof candidate.iat === "number" &&
		Number.isFinite(candidate.iat) &&
		typeof candidate.exp === "number" &&
		Number.isFinite(candidate.exp) &&
		(candidate.ownerToken === undefined || typeof candidate.ownerToken === "string")
	);
}

export async function signToken(
	env: TokenEnv,
	payload: TokenPayload,
): Promise<string> {
	const header = {
		alg: "HS256",
		typ: "JWT",
	};
	const encodedHeader = encodeBase64Url(encoder.encode(JSON.stringify(header)));
	const encodedPayload = encodeBase64Url(
		encoder.encode(
			JSON.stringify({
				...payload,
				address: payload.address.trim().toLowerCase(),
			}),
		),
	);
	const signedValue = `${encodedHeader}.${encodedPayload}`;
	const [secret] = getTokenSecrets(env);
	const signature = await signValue(secret!, signedValue);

	return `${signedValue}.${signature}`;
}

export async function verifyToken(
	env: TokenEnv,
	token: string,
	expectedType: TokenType,
	options: VerifyTokenOptions = {},
): Promise<TokenPayload | null> {
	const [encodedHeader, encodedPayload, signature] = token.split(".");
	if (!encodedHeader || !encodedPayload || !signature) {
		return null;
	}

	const signedValue = `${encodedHeader}.${encodedPayload}`;
	for (const secret of getTokenSecrets(env)) {
		if (!(await verifyValue(secret, signedValue, signature))) {
			continue;
		}

		try {
			const header = JSON.parse(decoder.decode(decodeBase64Url(encodedHeader))) as {
				alg?: unknown;
			};
			if (header.alg !== "HS256") {
				return null;
			}

			const payload = JSON.parse(
				decoder.decode(decodeBase64Url(encodedPayload)),
			) as unknown;
			if (!isTokenPayload(payload) || payload.typ !== expectedType) {
				return null;
			}

			const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
			if (payload.exp <= nowSeconds) {
				return null;
			}

			return {
				...payload,
				address: payload.address.trim().toLowerCase(),
			};
		} catch {
			return null;
		}
	}

	return null;
}
