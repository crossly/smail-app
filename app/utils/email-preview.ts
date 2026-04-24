export function toggleExpandedEmailId(
	currentEmailId: string | null,
	clickedEmailId: string,
): string | null {
	return currentEmailId === clickedEmailId ? null : clickedEmailId;
}
