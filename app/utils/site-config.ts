import { useMatches } from "react-router";

const LEGACY_SITE_DOMAIN = "smail.pw";
const LEGACY_SITE_URL = `https://${LEGACY_SITE_DOMAIN}`;
const LEGACY_SUPPORT_EMAIL = `support@${LEGACY_SITE_DOMAIN}`;

export const DEFAULT_SITE_DOMAIN = "mail.056650.xyz";
export const DEFAULT_SITE_URL = `https://${DEFAULT_SITE_DOMAIN}`;
export const DEFAULT_SITE_NAME = "em@il";

export type SiteEnv = Partial<{
	SITE_DOMAIN: string;
	SITE_URL: string;
	MAIL_DOMAIN: string;
	SUPPORT_EMAIL: string;
}>;

export type SiteConfig = {
	siteDomain: string;
	siteName: string;
	siteUrl: string;
	mailDomain: string;
	supportEmail: string;
};

type MatchWithData =
	| {
			data?: unknown;
	  }
	| undefined;

function normalizeDomain(value: string | undefined): string | null {
	const trimmed = value?.trim();
	if (!trimmed) {
		return null;
	}

	try {
		const url = trimmed.includes("://")
			? new URL(trimmed)
			: new URL(`https://${trimmed}`);
		return url.host.toLowerCase();
	} catch {
		return trimmed
			.replace(/^\/*/, "")
			.replace(/\/.*$/, "")
			.toLowerCase();
	}
}

function normalizeSiteUrl(value: string | undefined, fallbackDomain: string): string {
	const trimmed = value?.trim();
	if (!trimmed) {
		return `https://${fallbackDomain}`;
	}

	try {
		const url = trimmed.includes("://")
			? new URL(trimmed)
			: new URL(`https://${trimmed}`);
		return url.origin;
	} catch {
		return `https://${fallbackDomain}`;
	}
}

function normalizeSupportEmail(
	value: string | undefined,
	fallbackMailDomain: string,
): string {
	const trimmed = value?.trim();
	if (!trimmed) {
		return `support@${fallbackMailDomain}`;
	}

	if (trimmed.includes("@")) {
		return trimmed.toLowerCase();
	}

	return `${trimmed.toLowerCase()}@${fallbackMailDomain}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Object.prototype.toString.call(value) === "[object Object]";
}

function hasSiteConfig(value: unknown): value is { siteConfig: SiteConfig } {
	if (!isPlainObject(value)) {
		return false;
	}

	const siteConfig = value.siteConfig;
	if (!isPlainObject(siteConfig)) {
		return false;
	}

	return (
		typeof siteConfig.siteDomain === "string" &&
		typeof siteConfig.siteName === "string" &&
		typeof siteConfig.siteUrl === "string" &&
		typeof siteConfig.mailDomain === "string" &&
		typeof siteConfig.supportEmail === "string"
	);
}

export function createSiteConfig(options?: {
	env?: SiteEnv | null;
	requestUrl?: string | URL | null;
}): SiteConfig {
	const env = options?.env ?? undefined;
	const siteDomain =
		normalizeDomain(env?.SITE_DOMAIN) ??
		normalizeDomain(env?.SITE_URL) ??
		DEFAULT_SITE_DOMAIN;
	const siteUrl = normalizeSiteUrl(env?.SITE_URL, siteDomain);
	const mailDomain =
		normalizeDomain(env?.MAIL_DOMAIN) ??
		normalizeDomain(env?.SITE_DOMAIN) ??
		DEFAULT_SITE_DOMAIN;
	const supportEmail = normalizeSupportEmail(env?.SUPPORT_EMAIL, mailDomain);

	return {
		siteDomain,
		siteName: DEFAULT_SITE_NAME,
		siteUrl,
		mailDomain,
		supportEmail,
	};
}

export const DEFAULT_SITE_CONFIG = createSiteConfig();

export function replaceSiteText(value: string, siteConfig: SiteConfig): string {
	return value
		.replaceAll(LEGACY_SUPPORT_EMAIL, siteConfig.supportEmail)
		.replaceAll(LEGACY_SITE_URL, siteConfig.siteUrl)
		.replaceAll(LEGACY_SITE_DOMAIN, siteConfig.siteDomain);
}

export function replaceSiteTextDeep<T>(
	value: T,
	siteConfig: SiteConfig,
): T {
	if (typeof value === "string") {
		return replaceSiteText(value, siteConfig) as T;
	}

	if (Array.isArray(value)) {
		return value.map((item) => replaceSiteTextDeep(item, siteConfig)) as T;
	}

	if (isPlainObject(value)) {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [
				key,
				replaceSiteTextDeep(entry, siteConfig),
			]),
		) as T;
	}

	return value;
}

export function getSiteConfigFromMatches(
	matches: MatchWithData[] | undefined,
): SiteConfig {
	for (const match of matches ?? []) {
		if (hasSiteConfig(match?.data)) {
			return match.data.siteConfig;
		}
	}

	return DEFAULT_SITE_CONFIG;
}

export function useSiteConfig(): SiteConfig {
	return getSiteConfigFromMatches(useMatches());
}
