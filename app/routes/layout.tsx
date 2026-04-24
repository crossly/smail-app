import { useEffect, useRef, useState } from "react";
import {
	Link,
	Outlet,
	redirect,
	useLocation,
	useNavigate,
} from "react-router";
import {
	LOCALE_LABELS,
	type Locale,
	resolveLocaleParam,
	stripDefaultLocalePrefix,
	toLocalePath,
} from "~/i18n/config";
import { getDictionary } from "~/i18n/messages";
import {
	createThemeCookie,
	parseThemeFromCookieHeader,
	type ThemeMode,
} from "~/utils/theme";
import { useSiteConfig } from "~/utils/site-config";
import { getToolShellConfig } from "~/utils/tool-shell";
import type { Route } from "./+types/layout";

export async function loader({ params, request }: Route.LoaderArgs) {
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
	const theme = parseThemeFromCookieHeader(request.headers.get("Cookie"));
	return {
		locale,
		theme,
		renderedYear: new Date().getUTCFullYear(),
	};
}

export default function Layout({ loaderData }: Route.ComponentProps) {
	const siteConfig = useSiteConfig();
	const toolShell = getToolShellConfig();
	const [theme, setTheme] = useState<ThemeMode>(loaderData.theme);
	const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
	const languageMenuRef = useRef<HTMLDivElement | null>(null);
	const location = useLocation();
	const navigate = useNavigate();
	const locale = loaderData.locale;
	const copy = getDictionary(locale, siteConfig).layout;
	const localeEntries = Object.entries(LOCALE_LABELS) as [Locale, string][];
	const currentLocaleLabel = LOCALE_LABELS[locale];

	const localizeLink = (path: string) => toLocalePath(path, locale);

	useEffect(() => {
		if (typeof document === "undefined") {
			return;
		}
		if (theme === "light") {
			document.documentElement.dataset.theme = "light";
		} else {
			delete document.documentElement.dataset.theme;
		}
	}, [theme]);

	useEffect(() => {
		setIsLanguageMenuOpen(false);
	}, [location.pathname, location.search, location.hash]);

	useEffect(() => {
		if (!isLanguageMenuOpen) {
			return;
		}

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) {
				return;
			}
			if (!languageMenuRef.current?.contains(target)) {
				setIsLanguageMenuOpen(false);
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsLanguageMenuOpen(false);
			}
		};

		window.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("keydown", handleEscape);
		return () => {
			window.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("keydown", handleEscape);
		};
	}, [isLanguageMenuOpen]);

	const toggleTheme = () => {
		const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
		setTheme(nextTheme);
		document.cookie = createThemeCookie(nextTheme);
	};

	const switchLocale = (nextLocale: Locale) => {
		if (nextLocale === locale) {
			setIsLanguageMenuOpen(false);
			return;
		}
		const targetPath = `${toLocalePath(location.pathname, nextLocale)}${location.search}${location.hash}`;
		navigate(targetPath);
		setIsLanguageMenuOpen(false);
	};

	return (
		<div className="min-h-dvh px-4 py-4 sm:px-6 sm:py-5">
			<div className="site-frame flex min-h-[calc(100dvh-2rem)] flex-col gap-4">
				<header className="glass-panel sticky top-2 z-40 px-4 py-3 sm:px-5">
					<div className="flex items-center gap-3">
						<Link
							to={localizeLink("/")}
							prefetch="viewport"
							className="group inline-flex min-w-0 items-center gap-2.5"
						>
							<span className="brand-badge relative inline-flex size-[36px]">
								<img
									src="/favicon.ico"
									alt={`${siteConfig.siteName} logo`}
									className="size-[20px]"
								/>
								<span className="absolute -inset-px -z-10 rounded-xl bg-blue-500/25 blur-sm transition group-hover:bg-cyan-400/35" />
							</span>
							<div className="space-y-0.5">
								<span className="font-display block text-base font-bold tracking-tight text-theme-primary">
									{siteConfig.siteName}
								</span>
								<span className="block text-[10px] uppercase tracking-[0.2em] text-theme-faint sm:text-[11px]">
									{copy.siteSubtitle}
								</span>
							</div>
						</Link>
						<div className="flex-1" />
						{toolShell.primaryNavItems.length > 0 && (
							<nav className="hidden items-center gap-2 text-xs font-semibold sm:flex" />
						)}
						<div
							className="language-menu"
							ref={languageMenuRef}
						>
							<button
								type="button"
								className="language-menu-trigger"
								aria-haspopup="menu"
								aria-expanded={isLanguageMenuOpen}
								onClick={() => {
									setIsLanguageMenuOpen((open) => !open);
								}}
							>
								<span className="language-menu-icon" aria-hidden="true">
									🌐
								</span>
								<span className="language-menu-label">
									{currentLocaleLabel}
								</span>
								<span
									className="language-menu-caret"
									aria-hidden="true"
									data-open={isLanguageMenuOpen}
								>
									▾
								</span>
							</button>
							<div
								className="language-menu-panel"
								role="menu"
								aria-label="Select language"
								aria-hidden={!isLanguageMenuOpen}
								data-open={isLanguageMenuOpen ? "true" : "false"}
							>
								{localeEntries.map(([localeCode, label]) => (
									<button
										key={localeCode}
										type="button"
										role="menuitemradio"
										aria-checked={localeCode === locale}
										className="language-menu-option"
										data-active={localeCode === locale}
										onClick={() => switchLocale(localeCode)}
									>
										<span className="language-menu-check" aria-hidden="true">
											{localeCode === locale ? "✓" : ""}
										</span>
										<span className="language-menu-option-label">{label}</span>
										<span className="language-menu-option-code">
											{localeCode}
										</span>
									</button>
								))}
							</div>
						</div>
						<button
							type="button"
							className="theme-toggle"
							onClick={toggleTheme}
						>
							{theme === "dark" ? copy.themeToLight : copy.themeToDark}
						</button>
					</div>
				</header>

				<main className="flex flex-1 flex-col">
					<Outlet />
				</main>

				<footer className="px-1 pb-1 pt-2 text-[11px] text-theme-faint">
					{toolShell.showFooterDescription || toolShell.showFooterLinks ? (
						<div />
					) : (
						<div className="text-center sm:text-left">
							© {loaderData.renderedYear} {siteConfig.siteName} · {copy.copyright}
						</div>
					)}
				</footer>
			</div>
		</div>
	);
}
