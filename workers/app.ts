import { nanoid } from "nanoid";
import { createRequestHandler } from "react-router";
import { handleIncomingEmail } from "../app/utils/incoming-email.ts";
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
		await handleIncomingEmail(
			env,
			{
				to: msg.to,
				raw: msg.raw,
			},
			{
				createId: nanoid,
			},
		);
	},
	async scheduled(_controller, env, ctx) {
		ctx.waitUntil(cleanupExpiredEmails(env));
	},
} satisfies ExportedHandler<Env>;
