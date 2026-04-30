import { nanoid } from "nanoid";
import { handleIncomingEmail } from "../app/utils/incoming-email.ts";
import { cleanupExpiredEmails } from "../app/utils/mail-cleanup.ts";
import { app } from "../src/server/app.ts";

export default {
	async fetch(request, env, ctx) {
		return app.fetch(request, env, ctx);
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
