export type Mailbox = {
	address: string | null;
	issuedAt?: number;
	expiresAt?: number;
	refreshIntervalMs?: number;
};

export type InboxEmail = {
	id: string;
	to_address: string;
	from_name: string;
	from_address: string;
	subject: string;
	time: number;
};

export type EmailDetail = InboxEmail & {
	body: string;
};

export type InboxResponse = {
	emails: InboxEmail[];
};

type JsonRequestOptions = {
	method?: "GET" | "POST" | "DELETE";
	body?: unknown;
};

export const mailboxKeys = {
	mailbox: () => ["session", "mailbox"] as const,
	inbox: () => ["session", "inbox"] as const,
	email: (id: string) => ["session", "emails", id] as const,
};

async function readApiError(response: Response): Promise<string> {
	try {
		const payload = (await response.json()) as { error?: unknown };
		if (typeof payload.error === "string" && payload.error.trim()) {
			return payload.error;
		}
	} catch {
		// Fall through to the status text when the server does not return JSON.
	}

	return response.statusText || "Request failed.";
}

async function requestJson<T>(
	url: string,
	options: JsonRequestOptions = {},
): Promise<T> {
	const headers: Record<string, string> = {
		accept: "application/json",
	};
	const init: RequestInit = {
		credentials: "include",
		headers,
	};

	if (options.method) {
		init.method = options.method;
	}

	if (options.body !== undefined) {
		headers["content-type"] = "application/json";
		init.body = JSON.stringify(options.body);
	}

	const response = await fetch(url, init);

	if (!response.ok) {
		throw new Error(await readApiError(response));
	}

	return (await response.json()) as T;
}

export function fetchMailbox(): Promise<Mailbox> {
	return requestJson<Mailbox>("/api/session/mailbox");
}

export function createMailbox(prefix?: string): Promise<Mailbox> {
	const trimmedPrefix = prefix?.trim();

	return requestJson<Mailbox>("/api/session/mailbox", {
		method: "POST",
		body: trimmedPrefix ? { prefix: trimmedPrefix } : {},
	});
}

export function deleteMailbox(): Promise<{ ok: boolean }> {
	return requestJson<{ ok: boolean }>("/api/session/mailbox", {
		method: "DELETE",
	});
}

export function fetchInbox(): Promise<InboxResponse> {
	return requestJson<InboxResponse>("/api/session/inbox");
}

export function fetchEmailDetail(id: string): Promise<EmailDetail> {
	return requestJson<EmailDetail>(
		`/api/session/emails/${encodeURIComponent(id)}`,
	);
}
