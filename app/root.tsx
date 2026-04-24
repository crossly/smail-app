import {
	Navigate,
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
	useLocation,
} from "react-router";

import {
	DEFAULT_LOCALE,
	getLocaleDirection,
	getLocaleFromPathname,
	normalizePathname,
	SUPPORTED_LOCALES,
	stripLocalePrefix,
	toLocalePath,
} from "~/i18n/config";
import {
	BLOG_INDEXABLE_LOCALES,
	isBlogBasePath,
	isBlogLocaleIndexable,
	isMarkdownBasePath,
	isMarkdownLocaleIndexable,
	MARKDOWN_INDEXABLE_LOCALES,
} from "~/seo.config";
import {
	DEFAULT_SITE_CONFIG,
	createSiteConfig,
	replaceSiteText,
} from "~/utils/site-config";
import { DEFAULT_THEME, parseThemeFromCookieHeader } from "~/utils/theme";
import type { Route } from "./+types/root";
import "./app.css";

const SITE_OG_TITLE = "smail.pw · 24-Hour Temporary Email";
const SITE_OG_DESCRIPTION =
	"Free disposable email inbox with 24-hour auto-expiry. Use a temporary address for sign-ups and verification.";

export async function loader({ request, context }: Route.LoaderArgs) {
	const theme = parseThemeFromCookieHeader(request.headers.get("Cookie"));
	const siteConfig = createSiteConfig({
		env: context.cloudflare.env,
	});
	return { theme, siteConfig };
}

export function meta({ data, location }: Route.MetaArgs) {
	const siteConfig = data?.siteConfig ?? DEFAULT_SITE_CONFIG;
	const pathname = normalizePathname(location.pathname);
	const locale = getLocaleFromPathname(pathname);
	const basePath = stripLocalePrefix(pathname);
	const isMarkdownPage = isMarkdownBasePath(basePath);
	const isBlogPage = isBlogBasePath(basePath);

	const canonicalLocale =
		isMarkdownPage && !isMarkdownLocaleIndexable(locale)
			? DEFAULT_LOCALE
			: isBlogPage && !isBlogLocaleIndexable(locale)
				? DEFAULT_LOCALE
				: locale;
	const canonicalPath = toLocalePath(basePath, canonicalLocale);
	const rssLocale = canonicalLocale === "zh" ? "zh" : DEFAULT_LOCALE;
	const canonicalUrl = `${siteConfig.siteUrl}${canonicalPath}`;
	const alternateLocales = isMarkdownPage
		? MARKDOWN_INDEXABLE_LOCALES
		: isBlogPage
			? BLOG_INDEXABLE_LOCALES
			: SUPPORTED_LOCALES;
	const alternateLinks = alternateLocales.map((supportedLocale) => ({
		tagName: "link" as const,
		rel: "alternate",
		hrefLang: supportedLocale,
		href: `${siteConfig.siteUrl}${toLocalePath(basePath, supportedLocale)}`,
	}));
	const siteOgTitle = replaceSiteText(SITE_OG_TITLE, siteConfig);
	const siteOgDescription = replaceSiteText(SITE_OG_DESCRIPTION, siteConfig);
	const rssTitle = replaceSiteText("smail.pw Blog RSS", siteConfig);

	return [
		{
			tagName: "link",
			rel: "canonical",
			href: canonicalUrl,
		},
		...alternateLinks,
		{
			tagName: "link",
			rel: "alternate",
			hrefLang: "x-default",
			href: `${siteConfig.siteUrl}${toLocalePath(basePath, DEFAULT_LOCALE)}`,
		},
		{
			tagName: "link",
			rel: "alternate",
			type: "application/rss+xml",
			title: rssTitle,
			href: `${siteConfig.siteUrl}${toLocalePath("/rss.xml", rssLocale)}`,
		},
		{
			property: "og:type",
			content: "website",
		},
		{
			property: "og:site_name",
			content: siteConfig.siteName,
		},
		{
			property: "og:url",
			content: canonicalUrl,
		},
		{
			property: "og:title",
			content: siteOgTitle,
		},
		{
			property: "og:description",
			content: siteOgDescription,
		},
		{
			name: "twitter:card",
			content: "summary",
		},
		{
			name: "twitter:title",
			content: siteOgTitle,
		},
		{
			name: "twitter:description",
			content: siteOgDescription,
		},
	];
}

export function Layout({ children }: { children: React.ReactNode }) {
	const location = useLocation();
	const { theme } = useLoaderData<typeof loader>();
	const locale = getLocaleFromPathname(location.pathname);
	const resolvedTheme = theme ?? DEFAULT_THEME;

		return (
			<html
				lang={locale}
				dir={getLocaleDirection(locale)}
				data-theme={resolvedTheme === "light" ? "light" : undefined}
			>
				<head>
					<meta charSet="utf-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<Meta />
					<Links />
				</head>
				<body>
					{children}
					<ScrollRestoration />
					<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	const location = useLocation();
	const locale = getLocaleFromPathname(location.pathname);
	const homePath = toLocalePath("/", locale);
	const isNotFound = isRouteErrorResponse(error) && error.status === 404;

	if (isNotFound) {
		return <Navigate to={homePath} replace />;
	}

	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="pt-16 p-4 container mx-auto">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className="w-full p-4 overflow-x-auto">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
