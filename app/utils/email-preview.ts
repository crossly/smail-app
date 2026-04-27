export function toggleExpandedEmailId(
	currentEmailId: string | null,
	clickedEmailId: string,
): string | null {
	return currentEmailId === clickedEmailId ? null : clickedEmailId;
}

export function shouldLoadEmailPreview(
	body: string | undefined,
	status: "loading" | "ready" | "error" | undefined,
): boolean {
	return !body && !status;
}

export function shouldCollapseExpandedEmail(
	currentEmailId: string | null,
	emails: Array<{ id: string }>,
	revalidatorState: "idle" | "loading",
): boolean {
	if (!currentEmailId || revalidatorState !== "idle") {
		return false;
	}

	return !emails.some((email) => email.id === currentEmailId);
}
