import randomName from "@scaleway/random-name";
import { customAlphabet } from "nanoid";
import { DEFAULT_SITE_CONFIG } from "./site-config.ts";

const nanoSuffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

export function generateEmailAddress(
	mailDomain = DEFAULT_SITE_CONFIG.mailDomain,
) {
	return `${randomName()}-${nanoSuffix()}@${mailDomain}`;
}
