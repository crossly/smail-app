import {
	ApiMailboxError,
	getApiMailboxEmail,
	getMailboxTokenFromAuthorizationHeader,
} from "../.server/api-mailboxes.ts";
import type { Route } from "./+types/api.mailbox.email";

function jsonError(status: number, error: string) {
	return Response.json(
		{
			error,
		},
		{
			status,
			headers: {
				"cache-control": "no-store",
			},
		},
	);
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const mailboxToken = getMailboxTokenFromAuthorizationHeader(
		request.headers.get("authorization"),
	);
	if (!mailboxToken) {
		return jsonError(401, "Missing mailbox token.");
	}

	if (!params.address || !params.id) {
		return jsonError(404, "Email not found.");
	}

	try {
		const email = await getApiMailboxEmail(context.cloudflare.env, {
			address: params.address,
			id: params.id,
			mailboxToken,
		});

		return Response.json(email, {
			headers: {
				"cache-control": "no-store",
			},
		});
	} catch (error) {
		if (error instanceof ApiMailboxError) {
			return jsonError(error.status, error.message);
		}

		return jsonError(500, "Failed to load mailbox email.");
	}
}
