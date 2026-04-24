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
