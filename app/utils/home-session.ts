export function shouldCommitHomeSession(
	addresses: string[],
	addressIssuedAt: number | undefined,
): boolean {
	return addresses.length > 0 && !addressIssuedAt;
}
