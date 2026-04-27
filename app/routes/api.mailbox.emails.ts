import {
	ApiMailboxError,
	getMailboxTokenFromAuthorizationHeader,
	listApiMailboxEmails,
} from "../.server/api-mailboxes.ts";
import type { Route } from "./+types/api.mailbox.emails";

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

	if (!params.address) {
		return jsonError(404, "Mailbox not found.");
	}

	try {
		const emails = await listApiMailboxEmails(context.cloudflare.env, {
			address: params.address,
			mailboxToken,
		});

		return Response.json(
			{
				address: params.address.toLowerCase(),
				emails,
			},
			{
				headers: {
					"cache-control": "no-store",
				},
			},
		);
	} catch (error) {
		if (error instanceof ApiMailboxError) {
			return jsonError(error.status, error.message);
		}

		return jsonError(500, "Failed to load mailbox emails.");
	}
}
