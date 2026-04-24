import { useEffect, useState } from "react";
import {
	data,
	redirect,
	useFetcher,
	useRevalidator,
} from "react-router";
import { commitSession, getSession } from "~/.server/session";
import {
	DEFAULT_LOCALE,
	type Locale,
	resolveLocaleParam,
	stripDefaultLocalePrefix,
	toIntlLocale,
	toLocalePath,
} from "~/i18n/config";
import { getDictionary } from "~/i18n/messages";
import type { Email, EmailDetail } from "~/types/email";
import { generateEmailAddress } from "~/utils/mail";
import { MAIL_RETENTION_MS } from "~/utils/mail-retention";
import { mergeRouteMeta } from "~/utils/meta";
import {
	DEFAULT_SITE_CONFIG,
	type SiteConfig,
	createSiteConfig,
	getSiteConfigFromMatches,
	replaceSiteTextDeep,
	useSiteConfig,
} from "~/utils/site-config";
import { getHomeToolSections } from "~/utils/tool-shell";
import type { Route } from "./+types/home";

function getLocaleFromParams(lang: string | undefined): Locale {
	const { locale } = resolveLocaleParam(lang);
	return locale;
}

function formatRefreshTime(timestamp: number, locale: Locale): string {
	return new Date(timestamp).toLocaleTimeString(toIntlLocale(locale), {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "UTC",
	});
}

function getHomeJsonLd(
	locale: Locale,
	siteConfig: SiteConfig = DEFAULT_SITE_CONFIG,
) {
	const localizedHomeUrl = `${siteConfig.siteUrl}${toLocalePath("/", locale)}`;
	const descriptionByLocale: Record<Locale, string> = {
		en: "smail.pw provides free temporary email (temp mail) inboxes for sign-up and OTP verification with 24-hour auto cleanup.",
		zh: "smail.pw 提供免费临时邮箱（一次性邮箱）服务，适合临时邮箱注册和验证码接收，邮件 24 小时后自动清理。",
		es: "smail.pw ofrece correo temporal gratis (temp mail) para registros y códigos OTP con limpieza automática en 24 horas.",
		fr: "smail.pw propose un email temporaire gratuit (temp mail) pour inscription et OTP avec suppression automatique après 24h.",
		de: "smail.pw bietet kostenlose temporäre E-Mail (Temp Mail) für Registrierung und OTP mit automatischer 24h-Bereinigung.",
		ja: "smail.pw は登録とOTP認証に使える無料の一時メール（temp mail）を提供し、24時間後に自動削除されます。",
		ko: "smail.pw는 가입과 OTP 인증에 쓰는 무료 임시 이메일(temp mail)을 제공하며 24시간 후 자동 정리됩니다.",
		ru: "smail.pw предоставляет бесплатную временную почту (temp mail) для регистрации и OTP с автоочисткой через 24 часа.",
		pt: "smail.pw oferece email temporário grátis (temp mail) para cadastro e OTP com limpeza automática após 24h.",
		ar: "يوفر smail.pw بريدًا مؤقتًا مجانيًا (temp mail) للتسجيل ورموز OTP مع حذف تلقائي بعد 24 ساعة.",
	};
	const description = descriptionByLocale[locale] ?? descriptionByLocale.en;

	return replaceSiteTextDeep({
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				name: siteConfig.siteName,
				url: localizedHomeUrl,
				inLanguage: locale,
				description,
				potentialAction: {
					"@type": "UseAction",
					target: localizedHomeUrl,
				},
			},
			{
				"@type": "WebApplication",
				name: `${siteConfig.siteName} Temporary Email`,
				url: localizedHomeUrl,
				applicationCategory: "UtilitiesApplication",
				operatingSystem: "Web",
				inLanguage: locale,
				description,
				offers: {
					"@type": "Offer",
					price: "0",
					priceCurrency: "USD",
				},
			},
		],
	}, siteConfig);
}

export function meta({ params, matches }: Route.MetaArgs) {
	const locale = getLocaleFromParams(params.lang);
	const siteConfig = getSiteConfigFromMatches(matches);
	const copy = getDictionary(locale, siteConfig).home;

	return mergeRouteMeta(matches, [
		{
			title: copy.title,
		},
		{
			name: "description",
			content: copy.description,
		},
		{
			name: "keywords",
			content: copy.keywords,
		},
		{
			name: "robots",
			content: "index, follow",
		},
	]);
}

function isAddressExpired(
	addressIssuedAt: number | undefined,
	now = Date.now(),
): boolean {
	if (!addressIssuedAt) {
		return false;
	}
	return now - addressIssuedAt >= MAIL_RETENTION_MS;
}

function EmailModal({
	email,
	onClose,
	copy,
}: {
	email: Email;
	onClose: () => void;
	copy: ReturnType<typeof getDictionary>["home"]["modal"];
}) {
	const [detail, setDetail] = useState<EmailDetail | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		fetch(`/api/email/${email.id}`, {
			credentials: "include",
		})
			.then((res) => res.json() as Promise<EmailDetail>)
			.then((emailDetail) => {
				setDetail(emailDetail);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, [email.id]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	return (
		<div
			className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="email-preview-title"
				className="glass-panel modal-sheet flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="border-theme-soft flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
					<div className="space-y-1">
						<div className="text-theme-faint text-[11px] font-semibold uppercase tracking-[0.16em]">
							{copy.title}
						</div>
						<div
							id="email-preview-title"
							className="text-theme-primary font-display max-w-xl truncate pr-2 text-base font-semibold sm:text-[1.05rem]"
						>
							{email.subject}
						</div>
					</div>
					<button
						type="button"
						aria-label="Close email preview"
						onClick={onClose}
						className="border-theme-strong text-theme-secondary bg-theme-soft inline-flex h-8 w-8 items-center justify-center rounded-full border hover:brightness-95"
					>
						<svg
							viewBox="0 0 20 20"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
							className="h-4 w-4"
							aria-hidden="true"
						>
							<path d="M5 5L15 15M15 5L5 15" strokeLinecap="round" />
						</svg>
					</button>
				</div>

				<div className="border-theme-soft text-theme-secondary grid gap-2.5 border-b px-4 py-3 text-[12px] leading-relaxed sm:grid-cols-2 sm:px-5">
					<div className="border-theme-soft bg-theme-subtle min-w-0 rounded-lg border px-3 py-2.5">
						<span className="text-theme-faint block text-[11px] font-semibold uppercase tracking-[0.1em]">
							{copy.from}
						</span>
						<p className="mt-1 break-all">
							{email.from_name} &lt;{email.from_address}&gt;
						</p>
					</div>
					<div className="border-theme-soft bg-theme-subtle rounded-lg border px-3 py-2.5">
						<span className="text-theme-faint block text-[11px] font-semibold uppercase tracking-[0.1em]">
							{copy.time}
						</span>
						<p className="mt-1">{new Date(email.time).toLocaleString()}</p>
					</div>
				</div>

				<div className="p-4 sm:p-5">
					{loading ? (
						<div className="text-theme-muted flex h-[min(62vh,700px)] items-center justify-center rounded-xl border border-dashed border-theme-soft text-[13px]">
							{copy.loading}
						</div>
					) : detail?.body ? (
						<iframe
							srcDoc={detail.body}
							title="Email content"
							className="border-theme-soft h-[min(62vh,700px)] w-full overflow-hidden rounded-xl border bg-white"
							sandbox=""
							referrerPolicy="no-referrer"
						/>
					) : (
						<div className="text-theme-muted flex h-[min(62vh,700px)] items-center justify-center rounded-xl border border-dashed border-theme-soft text-[13px]">
							{copy.empty}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function formatTime(
	timestamp: number,
	locale: Locale,
	referenceNow: number,
): string {
	const intlLocale = toIntlLocale(locale);
	const relative = new Intl.RelativeTimeFormat(intlLocale, { numeric: "auto" });
	const diffSeconds = Math.round((timestamp - referenceNow) / 1000);

	if (Math.abs(diffSeconds) < 60) {
		return relative.format(diffSeconds, "second");
	}

	const diffMinutes = Math.round(diffSeconds / 60);
	if (Math.abs(diffMinutes) < 60) {
		return relative.format(diffMinutes, "minute");
	}

	const diffHours = Math.round(diffMinutes / 60);
	if (Math.abs(diffHours) < 24) {
		return relative.format(diffHours, "hour");
	}

	const diffDays = Math.round(diffHours / 24);
	if (Math.abs(diffDays) < 7) {
		return relative.format(diffDays, "day");
	}

	return new Date(timestamp).toLocaleDateString(intlLocale, {
		timeZone: "UTC",
	});
}

async function getEmails(d1: D1Database, toAddress: string) {
	const { results } = await d1
		.prepare(
			"SELECT * FROM emails WHERE to_address = ? ORDER BY time DESC LIMIT 100",
		)
		.bind(toAddress)
		.all();
	return results as Email[];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { locale, shouldRedirectToDefault, isInvalid } = resolveLocaleParam(
		params.lang,
	);
	if (isInvalid) {
		throw new Response("Not Found", { status: 404 });
	}
	if (shouldRedirectToDefault) {
		const url = new URL(request.url);
		const normalizedPath = stripDefaultLocalePrefix(url.pathname);
		throw redirect(`${normalizedPath}${url.search}`, 301);
	}

	const cookieHeader = request.headers.get("Cookie");
	const session = await getSession(cookieHeader);
	let addresses = (session.get("addresses") || []) as string[];
	const addressIssuedAt = session.get("addressIssuedAt");
	const now = Date.now();
	let shouldCommitSession = false;
	const siteConfig = createSiteConfig({
		env: context.cloudflare.env,
		requestUrl: request.url,
	});

	if (addresses.length > 0 && isAddressExpired(addressIssuedAt, now)) {
		addresses = [generateEmailAddress(siteConfig.mailDomain)];
		session.set("addresses", addresses);
		session.set("addressIssuedAt", now);
		shouldCommitSession = true;
	} else if (addresses.length > 0 && !addressIssuedAt) {
		session.set("addressIssuedAt", now);
		shouldCommitSession = true;
	}

	const emails =
		addresses.length > 0
			? await getEmails(context.cloudflare.env.D1, addresses[0]!)
			: [];

	if (shouldCommitSession) {
		const headers = new Headers();
		headers.set("Set-Cookie", await commitSession(session));
		return data(
			{
				addresses,
				emails,
				locale,
				renderedAt: now,
			},
			{ headers },
		);
	}

	return {
		addresses,
		emails,
		locale,
		renderedAt: now,
	};
}

export async function action({ request, context }: Route.ActionArgs) {
	const formData = await request.formData();
	const intent = formData.get("intent");
	const cookieHeader = request.headers.get("Cookie");
	const session = await getSession(cookieHeader);
	let addresses: string[] = (session.get("addresses") || []) as string[];
	const siteConfig = createSiteConfig({
		env: context.cloudflare.env,
		requestUrl: request.url,
	});
	switch (intent) {
		case "generate": {
			addresses = [generateEmailAddress(siteConfig.mailDomain)];
			session.set("addressIssuedAt", Date.now());
			break;
		}
		case "delete": {
			addresses = [];
			session.unset("addressIssuedAt");
			break;
		}
	}
	session.set("addresses", addresses);
	const cookie = await commitSession(session);
	const headers = new Headers();
	headers.set("Set-Cookie", cookie);
	return data(
		{
			addresses: session.get("addresses") || [],
		},
		{
			headers,
		},
	);
}

export default function Home({ loaderData, actionData }: Route.ComponentProps) {
	const siteConfig = useSiteConfig();
	const toolSections = getHomeToolSections();
	const fetcher = useFetcher<typeof actionData>();
	const revalidator = useRevalidator();
	const [copied, setCopied] = useState(false);
	const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
	const [lastInboxRefreshAt, setLastInboxRefreshAt] = useState(() =>
		loaderData.renderedAt,
	);
	const locale = loaderData.locale || DEFAULT_LOCALE;
	const copy = getDictionary(locale, siteConfig).home;
	const homeJsonLd = getHomeJsonLd(locale, siteConfig);
	const addresses = fetcher.data?.addresses ?? loaderData.addresses;
	const activeAddress = addresses[0] ?? null;
	const loaderAddress = loaderData.addresses[0] ?? null;
	const isSubmitting = fetcher.state === "submitting";
	const submittingIntent = fetcher.formData?.get("intent");
	const isRefreshingInbox = revalidator.state !== "idle";
	const shouldHideStaleEmails = activeAddress !== loaderAddress;
	const emails = shouldHideStaleEmails ? [] : loaderData.emails;
	const toolFacts = [
		{
			value: copy.stats.lifetimeValue,
			label: copy.stats.lifetime,
		},
		{
			value: copy.stats.refreshValue,
			label: copy.stats.refresh,
		},
		{
			value: copy.stats.registrationValue,
			label: copy.stats.registration,
		},
	] as const;

	useEffect(() => {
		setLastInboxRefreshAt(loaderData.renderedAt);
	}, [loaderData.renderedAt]);

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) {
			return;
		}

		setSelectedEmail(null);
		revalidator.revalidate();
	}, [fetcher.data, fetcher.state, revalidator]);

	return (
		<div className="flex flex-1 py-3 sm:py-4">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
			/>
			<div className="grid w-full gap-4 xl:grid-cols-10">
				{toolSections.panelOrder.map((panel) =>
					panel === "address" ? (
						<section
							key={panel}
							className="tool-surface xl:col-span-2 xl:self-start"
						>
							<header className="tool-toolbar">
								<div className="space-y-1">
									<p className="tool-kicker">{copy.currentAddress}</p>
									<p className="tool-title">
										{activeAddress ?? copy.noAddressTitle}
									</p>
									<p className="tool-caption">{siteConfig.mailDomain}</p>
								</div>
							</header>

							<div className="tool-body">
								{activeAddress ? (
									<div className="tool-address-shell">
										<div className="tool-address">{activeAddress}</div>
										<button
											type="button"
											className="neo-button-secondary w-full sm:w-auto sm:min-w-20"
											onClick={async () => {
												if (
													typeof navigator !== "undefined" &&
													navigator.clipboard
												) {
													try {
														await navigator.clipboard.writeText(activeAddress);
														setCopied(true);
														setTimeout(() => setCopied(false), 1500);
													} catch {
														// ignore clipboard errors
													}
												}
											}}
										>
											{copied ? copy.copied : copy.copy}
										</button>
									</div>
								) : (
									<div className="tool-empty-state">
										<p className="tool-empty-title">{copy.noAddressTitle}</p>
										<p className="tool-empty-copy">
											{copy.noAddressDescription}
										</p>
									</div>
								)}

								<dl className="tool-facts">
									{toolFacts.map((fact) => (
										<div key={fact.label} className="tool-fact">
											<dd className="tool-fact-value">{fact.value}</dd>
											<dt className="tool-fact-label">{fact.label}</dt>
										</div>
									))}
								</dl>

								<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
									<button
										type="button"
										name="intent"
										value="generate"
										className="neo-button w-full justify-center sm:min-w-[10.5rem] sm:w-auto"
										onClick={() => {
											fetcher.submit(
												{ intent: "generate" },
												{ method: "post" },
											);
										}}
										disabled={isSubmitting}
									>
										{submittingIntent === "generate" && isSubmitting
											? copy.generating
											: activeAddress
												? copy.generateNew
												: copy.generateAddress}
									</button>
									{activeAddress ? (
										<button
											type="button"
											name="intent"
											value="delete"
											className="neo-button-secondary w-full justify-center sm:w-auto"
											onClick={() => {
												fetcher.submit(
													{ intent: "delete" },
													{ method: "post" },
												);
											}}
											disabled={isSubmitting}
										>
											{submittingIntent === "delete" && isSubmitting
												? copy.deleting
												: copy.deleteAddress}
										</button>
									) : null}
								</div>

								<p className="tool-note">{copy.safetyHint}</p>
							</div>
						</section>
					) : (
						<section key={panel} className="tool-surface min-w-0 xl:col-span-8">
							<header className="tool-toolbar">
								<div className="space-y-1">
									<p className="tool-kicker">{copy.inboxTag}</p>
									<p className="tool-title">{copy.inboxTitle}</p>
									<p className="tool-caption">
										{copy.lastRefresh}:{" "}
										{formatRefreshTime(lastInboxRefreshAt, locale)}
									</p>
								</div>
								<div className="flex flex-wrap items-center justify-end gap-2">
									<span className="tool-chip hidden sm:inline-flex">
										{copy.tapToOpen}
									</span>
									<button
										type="button"
										className="tool-chip tool-chip-button"
										onClick={() => {
											revalidator.revalidate();
										}}
										disabled={isRefreshingInbox || !activeAddress}
									>
										{isRefreshingInbox
											? copy.refreshingInbox
											: copy.refreshInbox}
									</button>
								</div>
							</header>

							<div className="tool-body min-h-[26rem]">
								<div className="tool-inbox-list">
									{emails.length === 0 ? (
										<div className="tool-empty-state flex-1">
											<p className="tool-empty-title">
												{copy.emptyInboxTitle}
											</p>
											<p className="tool-empty-copy">
												{copy.emptyInboxDescription}
											</p>
										</div>
									) : (
										emails.map((email) => (
											<button
												key={email.id}
												type="button"
												className="email-item"
												onClick={() => setSelectedEmail(email)}
											>
												<div className="min-w-0">
													<div className="flex items-start justify-between gap-3">
														<div className="text-theme-primary font-display truncate text-sm font-semibold">
															{email.subject}
														</div>
														<div className="text-theme-faint whitespace-nowrap text-[11px]">
															{formatTime(
																email.time,
																locale,
																loaderData.renderedAt,
															)}
														</div>
													</div>
													<div className="text-theme-muted mt-1 truncate text-xs">
														{email.from_name}
														<span className="text-theme-faint">
															{" "}
															&lt;{email.from_address}&gt;
														</span>
													</div>
												</div>
											</button>
										))
									)}
								</div>
							</div>
						</section>
					),
				)}
			</div>

			{selectedEmail && (
				<EmailModal
					email={selectedEmail}
					onClose={() => setSelectedEmail(null)}
					copy={copy.modal}
				/>
			)}
		</div>
	);
}
