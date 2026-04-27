import { DEFAULT_LOCALE, type Locale } from "../i18n/config.ts";
import { DEFAULT_THEME, type ThemeMode } from "./theme.ts";

type ThemeLoaderData = {
	theme?: ThemeMode | null;
} | null | undefined;

type LayoutShellLoaderData = {
	locale?: Locale;
	renderedYear?: number;
	theme?: ThemeMode | null;
} | null | undefined;

export function getRootTheme(loaderData: ThemeLoaderData): ThemeMode {
	return loaderData?.theme ?? DEFAULT_THEME;
}

export function getLayoutShellLoaderData(
	loaderData: LayoutShellLoaderData,
	fallbackYear = new Date().getUTCFullYear(),
) {
	return {
		locale: loaderData?.locale ?? DEFAULT_LOCALE,
		renderedYear: loaderData?.renderedYear ?? fallbackYear,
		theme: getRootTheme(loaderData),
	};
}
