import randomName from "@scaleway/random-name";
import { customAlphabet } from "nanoid";
import { DEFAULT_SITE_CONFIG } from "./site-config.ts";

const nanoSuffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);
const EMAIL_PREFIX_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const EMAIL_PREFIX_MIN_LENGTH = 3;
export const EMAIL_PREFIX_MAX_LENGTH = 32;

export function normalizeEmailPrefix(prefix: string) {
	return prefix.trim().toLowerCase().replace(/^-+|-+$/g, "");
}

export function isValidEmailPrefix(prefix: string) {
	return (
		prefix.length >= EMAIL_PREFIX_MIN_LENGTH &&
		prefix.length <= EMAIL_PREFIX_MAX_LENGTH &&
		EMAIL_PREFIX_PATTERN.test(prefix)
	);
}

export function generateCustomEmailAddress(
	prefix: string,
	mailDomain = DEFAULT_SITE_CONFIG.mailDomain,
) {
	const normalizedPrefix = normalizeEmailPrefix(prefix);

	if (!isValidEmailPrefix(normalizedPrefix)) {
		throw new Error(
			`Email prefixes must be ${EMAIL_PREFIX_MIN_LENGTH}-${EMAIL_PREFIX_MAX_LENGTH} characters and use only letters, numbers, or single hyphens.`,
		);
	}

	return `${normalizedPrefix}@${mailDomain}`;
}

export function generateEmailAddress(
	mailDomain = DEFAULT_SITE_CONFIG.mailDomain,
) {
	return `${randomName()}-${nanoSuffix()}@${mailDomain}`;
}
