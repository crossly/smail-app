import {
	ApiMailboxError,
	createApiMailbox,
	getMailboxTokenFromAuthorizationHeader,
} from "../.server/api-mailboxes.ts";
import type { Route } from "./+types/api.mailboxes";

type CreateMailboxRequestBody = {
	prefix?: string;
};

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

async function readCreateMailboxRequestBody(
	request: Request,
): Promise<CreateMailboxRequestBody> {
	const contentType = request.headers.get("content-type");
	if (!contentType) {
		return {};
	}

	if (!contentType.toLowerCase().includes("application/json")) {
		throw new ApiMailboxError(415, "Expected application/json.");
	}

	let payload: unknown;

	try {
		payload = await request.json();
	} catch {
		throw new ApiMailboxError(400, "Invalid JSON body.");
	}

	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {};
	}

	const prefix = (payload as { prefix?: unknown }).prefix;
	if (prefix === undefined || prefix === null) {
		return {};
	}

	if (typeof prefix !== "string") {
		throw new ApiMailboxError(400, "Mailbox prefix must be a string.");
	}

	return {
		prefix,
	};
}

export async function action({ request, context }: Route.ActionArgs) {
	if (request.method.toUpperCase() !== "POST") {
		return jsonError(405, "Method not allowed.");
	}

	try {
		const body = await readCreateMailboxRequestBody(request);
		const mailbox = await createApiMailbox(context.cloudflare.env, {
			prefix: body.prefix,
			currentMailboxToken: getMailboxTokenFromAuthorizationHeader(
				request.headers.get("authorization"),
			),
		});

		return Response.json(mailbox, {
			status: 201,
			headers: {
				"cache-control": "no-store",
			},
		});
	} catch (error) {
		if (error instanceof ApiMailboxError) {
			return jsonError(error.status, error.message);
		}

		if (error instanceof Error) {
			return jsonError(400, error.message);
		}

		return jsonError(500, "Failed to create mailbox.");
	}
}
