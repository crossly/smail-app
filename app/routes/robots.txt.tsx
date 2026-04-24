import { createSiteConfig } from "~/utils/site-config";
import type { Route } from "./+types/robots.txt";

export async function loader({ request, context }: Route.LoaderArgs) {
	const siteConfig = createSiteConfig({
		env: context.cloudflare.env,
		requestUrl: request.url,
	});
	const body = [
		"User-agent: *",
		"Allow: /",
		"Disallow: /api/",
		"",
		`Sitemap: ${siteConfig.siteUrl}/sitemap.xml`,
		`Feed: ${siteConfig.siteUrl}/rss.xml`,
		`Feed: ${siteConfig.siteUrl}/zh/rss.xml`,
		"",
	].join("\n");

	return new Response(body, {
		status: 200,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
}
