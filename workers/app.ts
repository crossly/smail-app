import { nanoid } from "nanoid";
import Parser from "postal-mime";
import { createRequestHandler } from "react-router";
import { persistIncomingEmail } from "../app/utils/email-ingest.ts";
import { cleanupExpiredEmails } from "../app/utils/mail-cleanup.ts";

declare module "react-router" {
	export interface AppLoadContext {
		cloudflare: {
			env: Env;
			ctx: ExecutionContext;
		};
	}
}

const requestHandler = createRequestHandler(
	() => import("virtual:react-router/server-build"),
	import.meta.env.MODE,
);

export default {
	async fetch(request, env, ctx) {
		return requestHandler(request, {
			cloudflare: { env, ctx },
		});
	},
	async email(msg, env) {
		const parser = new Parser();
		const ab = await new Response(msg.raw).arrayBuffer();
		const parsed = await parser.parse(ab);
		const id = nanoid();
		await persistIncomingEmail(env, {
			id,
			raw: ab,
			toAddress: msg.to,
			fromName: parsed.from?.name,
			fromAddress: parsed.from?.address,
			subject: parsed.subject,
			time: Date.now(),
		});
	},
	async scheduled(_controller, env, ctx) {
		ctx.waitUntil(cleanupExpiredEmails(env));
	},
} satisfies ExportedHandler<Env>;
