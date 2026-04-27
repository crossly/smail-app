import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
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
import { getAddressActionLabelKey } from "~/utils/address-composer";
import {
	shouldCollapseExpandedEmail,
	shouldLoadEmailPreview,
	toggleExpandedEmailId,
} from "~/utils/email-preview";
import {
	generateCustomEmailAddress,
	generateEmailAddress,
	normalizeEmailPrefix,
} from "~/utils/mail";
import { getMailboxVisibleSince } from "~/utils/mail-access";
import {
	releaseEmailAddressReservation,
	reserveEmailAddress,
} from "~/utils/mail-reservations";
import {
	INBOX_REFRESH_LABEL_DELAY_MS,
	getRemainingInboxRefreshLabelTime,
	type InboxRefreshUiPhase,
	shouldLockInboxRefreshButton,
	shouldShowRefreshingInboxLabel,
	shouldRefreshInboxAfterAddressUpdate,
} from "~/utils/inbox-refresh";
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

function EmailInlinePreviewPanel({
	email,
	detail,
	frameHeight,
	loading,
	onFrameLoad,
	copy,
}: {
	email: Email;
	detail: EmailDetail | null;
	frameHeight: number;
	loading: boolean;
	onFrameLoad: (frame: HTMLIFrameElement) => void;
	copy: ReturnType<typeof getDictionary>["home"]["modal"];
}) {
	return (
		<section
			id={`email-preview-${email.id}`}
			className="email-preview-panel"
			aria-label={copy.title}
		>
			<div className="email-preview-meta">
				<div className="email-preview-meta-card">
					<span className="email-preview-meta-label">{copy.from}</span>
					<p className="mt-1 break-all">
						{email.from_name} &lt;{email.from_address}&gt;
					</p>
				</div>
				<div className="email-preview-meta-card">
					<span className="email-preview-meta-label">{copy.time}</span>
					<p className="mt-1">{new Date(email.time).toLocaleString()}</p>
				</div>
			</div>

			<div className="mt-3">
				{loading ? (
					<div className="email-preview-empty">{copy.loading}</div>
				) : detail?.body ? (
					<iframe
						srcDoc={detail.body}
						title={`${copy.title}: ${email.subject}`}
						className="email-preview-frame"
						style={{ height: `${frameHeight}px` }}
						sandbox="allow-popups allow-same-origin"
						referrerPolicy="no-referrer"
						onLoad={(event) => onFrameLoad(event.currentTarget)}
					/>
				) : (
					<div className="email-preview-empty">{copy.empty}</div>
				)}
			</div>
		</section>
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

async function getEmails(
	d1: D1Database,
	toAddress: string,
	visibleSince: number,
) {
	const { results } = await d1
		.prepare(
			"SELECT * FROM emails WHERE to_address = ? AND time >= ? ORDER BY time DESC LIMIT 100",
		)
		.bind(toAddress, visibleSince)
		.all();
	return results as Email[];
}

async function releaseSessionReservationIfPresent(
	env: Pick<Env, "D1">,
	address: string | null,
	ownerToken: unknown,
) {
	if (!address || typeof ownerToken !== "string") {
		return false;
	}

	return releaseEmailAddressReservation(env, {
		address,
		ownerToken,
	});
}

type HomeActionData = {
	addresses: string[];
	customPrefix: string;
	didUpdateAddress: boolean;
	error?: string;
};

const INBOX_REFRESH_VISIBILITY_SETTLE_MS = 32;

type ManualInboxRefreshState = {
	phase: InboxRefreshUiPhase;
	visibleAt: number | null;
};

function createIdleManualInboxRefreshState(): ManualInboxRefreshState {
	return {
		phase: "idle",
		visibleAt: null,
	};
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
	let addressIssuedAt = session.get("addressIssuedAt");
	const now = Date.now();
	let shouldCommitSession = false;
	const siteConfig = createSiteConfig({
		env: context.cloudflare.env,
		requestUrl: request.url,
	});

	if (addresses.length > 0 && !addressIssuedAt) {
		addressIssuedAt = now;
		session.set("addressIssuedAt", addressIssuedAt);
	}

	if (addresses.length > 0) {
		// Keep an active mailbox session alive while the user is still visiting.
		shouldCommitSession = true;
	}

	const visibleSince = getMailboxVisibleSince(addressIssuedAt, now);
	const emails =
		addresses.length > 0
			? await getEmails(context.cloudflare.env.D1, addresses[0]!, visibleSince)
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

export async function action({ request, context, params }: Route.ActionArgs) {
	const formData = await request.formData();
	const intent = formData.get("intent");
	const cookieHeader = request.headers.get("Cookie");
	const session = await getSession(cookieHeader);
	let addresses: string[] = (session.get("addresses") || []) as string[];
	const activeAddress = addresses[0] ?? null;
	const reservationOwnerToken = session.get("reservationOwnerToken");
	let customPrefix = "";
	let didUpdateAddress = false;
	let error: string | undefined;
	const siteConfig = createSiteConfig({
		env: context.cloudflare.env,
		requestUrl: request.url,
	});
	const locale = getLocaleFromParams(params.lang);
	const copy = getDictionary(locale, siteConfig).home;
	switch (intent) {
		case "generate": {
			const requestedCustomPrefix = formData.get("customPrefix");

			customPrefix =
				typeof requestedCustomPrefix === "string"
					? normalizeEmailPrefix(requestedCustomPrefix)
					: "";

			if (customPrefix) {
				try {
					const customAddress = generateCustomEmailAddress(
						customPrefix,
						siteConfig.mailDomain,
					);
					const existingOwnerToken = session.get("reservationOwnerToken");
					const ownerToken =
						typeof existingOwnerToken === "string" ? existingOwnerToken : nanoid();
					const reserved = await reserveEmailAddress(context.cloudflare.env, {
						address: customAddress,
						ownerToken,
					});
					if (!reserved) {
						error = copy.customPrefixError;
						break;
					}

					if (activeAddress && activeAddress !== customAddress) {
						await releaseSessionReservationIfPresent(
							context.cloudflare.env,
							activeAddress,
							reservationOwnerToken,
						);
					}

					addresses = [customAddress];
					session.set("addresses", addresses);
					session.set("addressIssuedAt", Date.now());
					session.set("reservationOwnerToken", ownerToken);
					didUpdateAddress = true;
				} catch {
					error = copy.customPrefixError;
				}
			} else {
				await releaseSessionReservationIfPresent(
					context.cloudflare.env,
					activeAddress,
					reservationOwnerToken,
				);
				addresses = [generateEmailAddress(siteConfig.mailDomain)];
				session.set("addresses", addresses);
				session.set("addressIssuedAt", Date.now());
				session.unset("reservationOwnerToken");
				didUpdateAddress = true;
			}
			break;
		}
		case "delete": {
			await releaseSessionReservationIfPresent(
				context.cloudflare.env,
				activeAddress,
				reservationOwnerToken,
			);
			addresses = [];
			customPrefix = "";
			session.set("addresses", addresses);
			session.unset("addressIssuedAt");
			session.unset("reservationOwnerToken");
			didUpdateAddress = true;
			break;
		}
	}
	const headers = new Headers();

	if (didUpdateAddress) {
		headers.set("Set-Cookie", await commitSession(session));
	}

	return data<HomeActionData>(
		{
			addresses,
			customPrefix,
			didUpdateAddress,
			error,
		},
		headers.has("Set-Cookie")
			? {
					headers,
				}
			: undefined,
	);
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const siteConfig = useSiteConfig();
	const toolSections = getHomeToolSections();
	const fetcher = useFetcher<HomeActionData>();
	const revalidator = useRevalidator();
	const [copied, setCopied] = useState(false);
	const [customPrefix, setCustomPrefix] = useState("");
	const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
	const [emailDetailsById, setEmailDetailsById] = useState<
		Record<string, EmailDetail>
	>({});
	const [emailFrameHeightsById, setEmailFrameHeightsById] = useState<
		Record<string, number>
	>({});
	const [emailPreviewStatusById, setEmailPreviewStatusById] = useState<
		Record<string, "loading" | "ready" | "error">
	>({});
	const [lastInboxRefreshAt, setLastInboxRefreshAt] = useState(() =>
		loaderData.renderedAt,
	);
	const [manualInboxRefresh, setManualInboxRefresh] =
		useState<ManualInboxRefreshState>(createIdleManualInboxRefreshState);
	const refreshLabelDelayTimeoutRef = useRef<number | null>(null);
	const refreshLabelSettleTimeoutRef = useRef<number | null>(null);
	const refreshLabelHideTimeoutRef = useRef<number | null>(null);
	const previousRevalidatorStateRef = useRef(revalidator.state);
	const latestRevalidatorStateRef = useRef(revalidator.state);
	latestRevalidatorStateRef.current = revalidator.state;
	const locale = loaderData.locale || DEFAULT_LOCALE;
	const copy = getDictionary(locale, siteConfig).home;
	const homeJsonLd = getHomeJsonLd(locale, siteConfig);
	const addresses = fetcher.data?.addresses ?? loaderData.addresses;
	const activeAddress = addresses[0] ?? null;
	const loaderAddress = loaderData.addresses[0] ?? null;
	const isSubmitting = fetcher.state === "submitting";
	const submittingIntent = fetcher.formData?.get("intent");
	const shouldShowPrefixError =
		Boolean(fetcher.data?.error) && fetcher.data?.customPrefix === customPrefix;
	const shouldLockRefreshButton = shouldLockInboxRefreshButton(
		activeAddress,
		manualInboxRefresh.phase,
	);
	const shouldShowRefreshingLabel = shouldShowRefreshingInboxLabel(
		activeAddress,
		manualInboxRefresh.phase,
	);
	const shouldHideStaleEmails = activeAddress !== loaderAddress;
	const emails = shouldHideStaleEmails ? [] : loaderData.emails;
	const columnSpanClass = {
		4: "xl:col-span-4",
		6: "xl:col-span-6",
	} satisfies Record<4 | 6, string>;
	const addressColumnClass = columnSpanClass[toolSections.desktopColumns[0]];
	const inboxColumnClass = columnSpanClass[toolSections.desktopColumns[1]];
	const addressActionLabelKey = getAddressActionLabelKey({
		activeAddress,
		customPrefix,
	});
	const expandedEmailPreviewStatus = expandedEmailId
		? emailPreviewStatusById[expandedEmailId]
		: undefined;
	const expandedEmailBody = expandedEmailId
		? emailDetailsById[expandedEmailId]?.body
		: undefined;
	const clearRefreshLabelDelayTimeout = () => {
		if (refreshLabelDelayTimeoutRef.current === null) {
			return;
		}

		window.clearTimeout(refreshLabelDelayTimeoutRef.current);
		refreshLabelDelayTimeoutRef.current = null;
	};
	const clearRefreshLabelSettleTimeout = () => {
		if (refreshLabelSettleTimeoutRef.current === null) {
			return;
		}

		window.clearTimeout(refreshLabelSettleTimeoutRef.current);
		refreshLabelSettleTimeoutRef.current = null;
	};
	const clearRefreshLabelHideTimeout = () => {
		if (refreshLabelHideTimeoutRef.current === null) {
			return;
		}

		window.clearTimeout(refreshLabelHideTimeoutRef.current);
		refreshLabelHideTimeoutRef.current = null;
	};
	const clearManualInboxRefreshTimers = () => {
		clearRefreshLabelDelayTimeout();
		clearRefreshLabelSettleTimeout();
		clearRefreshLabelHideTimeout();
	};

	useEffect(() => {
		setLastInboxRefreshAt(loaderData.renderedAt);
	}, [loaderData.renderedAt]);

	useEffect(() => {
		return () => {
			clearManualInboxRefreshTimers();
		};
	}, []);

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) {
			return;
		}

		setCustomPrefix(fetcher.data.customPrefix);
	}, [fetcher.data, fetcher.state]);

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data?.didUpdateAddress) {
			return;
		}

		setExpandedEmailId(null);
		if (shouldRefreshInboxAfterAddressUpdate(fetcher.data)) {
			revalidator.revalidate();
		}
	}, [fetcher.data, fetcher.state, revalidator]);

	useEffect(() => {
		if (
			shouldCollapseExpandedEmail(
				expandedEmailId,
				emails,
				revalidator.state,
			)
		) {
			setExpandedEmailId(null);
		}
	}, [emails, expandedEmailId, revalidator.state]);

	useEffect(() => {
		if (activeAddress) {
			return;
		}

		clearManualInboxRefreshTimers();
		setManualInboxRefresh((current) =>
			current.phase === "idle" && current.visibleAt === null
				? current
				: createIdleManualInboxRefreshState(),
		);
	}, [activeAddress]);

	useEffect(() => {
		const previousRevalidatorState = previousRevalidatorStateRef.current;
		const didStartLoading =
			previousRevalidatorState === "idle" && revalidator.state === "loading";
		const didFinishLoading =
			previousRevalidatorState === "loading" && revalidator.state === "idle";

		if (manualInboxRefresh.phase === "requested" && didStartLoading) {
			setManualInboxRefresh((current) =>
				current.phase === "requested"
					? {
							phase: "running",
							visibleAt: null,
						}
					: current,
			);
		}

		if (
			(manualInboxRefresh.phase === "requested" ||
				manualInboxRefresh.phase === "running") &&
			didFinishLoading
		) {
			clearRefreshLabelDelayTimeout();
			clearRefreshLabelSettleTimeout();
			setManualInboxRefresh((current) =>
				current.phase === "requested" || current.phase === "running"
					? createIdleManualInboxRefreshState()
					: current,
			);
		}

		if (manualInboxRefresh.phase === "visible" && didFinishLoading) {
			clearRefreshLabelHideTimeout();
			const visibleAt = manualInboxRefresh.visibleAt ?? Date.now();
			const remaining = getRemainingInboxRefreshLabelTime(visibleAt);

			if (remaining === 0) {
				setManualInboxRefresh((current) =>
					current.phase === "visible"
						? createIdleManualInboxRefreshState()
						: current,
				);
			} else {
				refreshLabelHideTimeoutRef.current = window.setTimeout(() => {
					refreshLabelHideTimeoutRef.current = null;
					setManualInboxRefresh((current) =>
						current.phase === "visible"
							? createIdleManualInboxRefreshState()
							: current,
					);
				}, remaining);
			}
		}

		previousRevalidatorStateRef.current = revalidator.state;
	}, [manualInboxRefresh.phase, manualInboxRefresh.visibleAt, revalidator.state]);

	useEffect(() => {
		clearRefreshLabelDelayTimeout();
		clearRefreshLabelSettleTimeout();

		if (manualInboxRefresh.phase !== "running") {
			return;
		}

		refreshLabelDelayTimeoutRef.current = window.setTimeout(() => {
			refreshLabelDelayTimeoutRef.current = null;
			refreshLabelSettleTimeoutRef.current = window.setTimeout(() => {
				refreshLabelSettleTimeoutRef.current = null;
				if (latestRevalidatorStateRef.current !== "loading") {
					return;
				}

				setManualInboxRefresh((current) =>
					current.phase === "running"
						? {
								phase: "visible",
								visibleAt: Date.now(),
							}
						: current,
				);
			}, INBOX_REFRESH_VISIBILITY_SETTLE_MS);
		}, INBOX_REFRESH_LABEL_DELAY_MS);

		return () => {
			clearRefreshLabelDelayTimeout();
			clearRefreshLabelSettleTimeout();
		};
	}, [manualInboxRefresh.phase]);

	useEffect(() => {
		if (
			!expandedEmailId ||
			!shouldLoadEmailPreview(expandedEmailBody, expandedEmailPreviewStatus)
		) {
			return;
		}

		let cancelled = false;
		setEmailPreviewStatusById((current) => ({
			...current,
			[expandedEmailId]: "loading",
		}));

		fetch(`/api/email/${expandedEmailId}`, {
			credentials: "include",
		})
			.then(async (response) => {
				if (!response.ok) {
					throw new Error("Failed to load email");
				}

				return (await response.json()) as EmailDetail;
			})
			.then((detail) => {
				if (cancelled) {
					return;
				}

				setEmailDetailsById((current) => ({
					...current,
					[expandedEmailId]: detail,
				}));
				setEmailPreviewStatusById((current) => ({
					...current,
					[expandedEmailId]: "ready",
				}));
			})
			.catch(() => {
				if (cancelled) {
					return;
				}

				setEmailPreviewStatusById((current) => ({
					...current,
					[expandedEmailId]: "error",
				}));
			});

		return () => {
			cancelled = true;
		};
	}, [expandedEmailBody, expandedEmailId]);

	const syncPreviewFrameHeight = (
		emailId: string,
		iframe: HTMLIFrameElement,
	) => {
		if (typeof window === "undefined") {
			return;
		}

		window.requestAnimationFrame(() => {
			try {
				const documentHeight =
					iframe.contentDocument?.documentElement?.scrollHeight ?? 0;
				const bodyHeight = iframe.contentDocument?.body?.scrollHeight ?? 0;
				const nextHeight = Math.min(
					Math.max(documentHeight, bodyHeight, 360) + 8,
					1200,
				);

				setEmailFrameHeightsById((current) => {
					if (current[emailId] === nextHeight) {
						return current;
					}

					return {
						...current,
						[emailId]: nextHeight,
					};
				});
			} catch {
				// Keep the fallback height when the frame cannot be measured.
			}
		});
	};

	const submitRandomAddress = () => {
		fetcher.submit(
			{ intent: "generate", customPrefix: "" },
			{ method: "post" },
		);
	};

	const submitCustomAddress = () => {
		if (!customPrefix.trim()) {
			return;
		}

		fetcher.submit(
			{ intent: "generate", customPrefix },
			{ method: "post" },
		);
	};

	const submitAddressAction = () => {
		if (activeAddress || !customPrefix.trim()) {
			submitRandomAddress();
			return;
		}

		submitCustomAddress();
	};

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
							className={`tool-surface ${addressColumnClass} xl:self-start`}
						>
							<header className="tool-toolbar">
								<div className="space-y-1">
									<p className="tool-kicker">{siteConfig.mailDomain}</p>
									<p className="tool-title">{copy.currentAddress}</p>
								</div>
								<div className="tool-address-status">
									<span className="tool-chip">{siteConfig.mailDomain}</span>
									<span className="tool-chip">24h</span>
								</div>
							</header>

							<div className="tool-body">
								<div
									className="tool-address-console"
									data-empty={activeAddress ? "false" : "true"}
								>
									<div className="tool-address-meta">
										{activeAddress ? (
											<>
												<p className="tool-field-label">{siteConfig.mailDomain}</p>
												<div className="tool-address">{activeAddress}</div>
											</>
										) : (
											<>
												<label className="sr-only" htmlFor="custom-prefix">
													{copy.customPrefixLabel}
												</label>
												<div className="tool-prefix-composer !mt-0">
													<input
														id="custom-prefix"
														name="customPrefix"
														type="text"
														inputMode="text"
														autoCapitalize="off"
														autoComplete="off"
														autoCorrect="off"
														spellCheck={false}
														className="tool-prefix-input"
														placeholder={copy.customPrefixPlaceholder}
														value={customPrefix}
														onChange={(event) => {
															setCustomPrefix(event.currentTarget.value);
														}}
														onKeyDown={(event) => {
															if (event.key !== "Enter" || isSubmitting) {
																return;
															}

															event.preventDefault();
															submitAddressAction();
														}}
													/>
													<span className="tool-prefix-domain">
														@{siteConfig.mailDomain}
													</span>
												</div>
											</>
										)}
									</div>
									{activeAddress ? (
										<div className="tool-address-actions">
											<button
												type="button"
												className="neo-button-secondary w-full sm:w-auto"
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
											<button
												type="button"
												name="intent"
												value="delete"
												className="neo-button-secondary w-full sm:w-auto"
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
										</div>
									) : null}
								</div>

								{!activeAddress ? (
									<p className="tool-field-hint !mt-0">{copy.customPrefixHint}</p>
								) : null}

								<button
									type="button"
									name="intent"
									value="generate"
									className="neo-button w-full justify-center"
									onClick={submitAddressAction}
									disabled={isSubmitting}
								>
									{submittingIntent === "generate" && isSubmitting
										? copy.generating
										: copy[addressActionLabelKey]}
								</button>

								{shouldShowPrefixError ? (
									<p className="tool-field-error" role="alert">
										{fetcher.data?.error}
									</p>
								) : null}

								<p className="tool-note">{copy.safetyHint}</p>
							</div>
						</section>
					) : (
						<section
							key={panel}
							className={`tool-surface min-w-0 ${inboxColumnClass}`}
						>
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
										data-unavailable={activeAddress ? "false" : "true"}
										onClick={() => {
											if (
												!activeAddress ||
												revalidator.state !== "idle" ||
												shouldLockRefreshButton
											) {
												return;
											}

											setManualInboxRefresh({
												phase: "requested",
												visibleAt: null,
											});
											revalidator.revalidate();
										}}
										disabled={shouldLockRefreshButton || !activeAddress}
									>
										{shouldShowRefreshingLabel
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
										emails.map((email) => {
											const isExpanded = expandedEmailId === email.id;
											const previewStatus =
												emailPreviewStatusById[email.id] ?? "idle";
											const detail = emailDetailsById[email.id] ?? null;
											const frameHeight =
												emailFrameHeightsById[email.id] ?? 420;

											return (
												<div key={email.id} className="email-thread">
													<button
														type="button"
														className="email-item"
														aria-expanded={isExpanded}
														aria-controls={`email-preview-${email.id}`}
														data-expanded={isExpanded ? "true" : "false"}
														onClick={() => {
															setExpandedEmailId((current) =>
																toggleExpandedEmailId(current, email.id),
															);
														}}
													>
														<div className="min-w-0">
															<div className="flex items-start justify-between gap-3">
																<div className="text-theme-primary font-display truncate text-sm font-semibold">
																	{email.subject}
																</div>
																<div className="flex items-center gap-2">
																	<div className="text-theme-faint whitespace-nowrap text-[11px]">
																		{formatTime(
																			email.time,
																			locale,
																			loaderData.renderedAt,
																		)}
																	</div>
																	<span
																		className="email-item-caret"
																		aria-hidden="true"
																		data-expanded={
																			isExpanded ? "true" : "false"
																		}
																	>
																		▾
																	</span>
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

													{isExpanded ? (
															<EmailInlinePreviewPanel
																email={email}
																detail={detail}
																frameHeight={frameHeight}
																loading={
																	previewStatus !== "ready" &&
																	previewStatus !== "error"
																}
																onFrameLoad={(frame) =>
																	syncPreviewFrameHeight(email.id, frame)
																}
															copy={copy.modal}
														/>
													) : null}
												</div>
											);
										})
									)}
								</div>
							</div>
						</section>
					),
				)}
			</div>
		</div>
	);
}
