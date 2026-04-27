import Parser from "postal-mime";
import { getSession } from "~/.server/session";
import type { EmailDetail } from "~/types/email";
import { renderEmailBody } from "~/utils/email-content";
import { getMailboxVisibleSince } from "~/utils/mail-access";
import type { Route } from "./+types/api.email";

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const { id } = params;
	if (!id) {
		throw new Response("Not found", { status: 404 });
	}
	const d1 = context.cloudflare.env.D1;
	const r2 = context.cloudflare.env.R2;
	const session = await getSession(request.headers.get("Cookie"));
	const addresses = (session.get("addresses") || []).filter(
		(address): address is string => typeof address === "string",
	);
	const addressIssuedAt = session.get("addressIssuedAt");
	const now = Date.now();
	const visibleSince = getMailboxVisibleSince(addressIssuedAt, now);
	if (addresses.length === 0) {
		throw new Response("Unauthorized", { status: 403 });
	}

	const addressPlaceholders = addresses.map(() => "?").join(", ");
	const mail = await d1
		.prepare(
			`SELECT * FROM emails WHERE id = ? AND time >= ? AND to_address IN (${addressPlaceholders})`,
		)
		.bind(id, visibleSince, ...addresses)
		.first<EmailDetail>();
	if (!mail) {
		throw new Response("Not found", { status: 404 });
	}

	const object = await r2.get(id);
	if (!object) {
		throw new Response("Not found", { status: 404 });
	}

	const parser = new Parser();
	const message = await parser.parse(object.body);
	return {
		body: renderEmailBody({
			html: message.html,
			text: message.text,
		}),
	};
}
