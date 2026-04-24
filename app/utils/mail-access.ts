import { getRetentionCutoff } from "./mail-retention.ts";

export function getMailboxVisibleSince(
	addressIssuedAt: number | undefined,
	now = Date.now(),
): number | null {
	if (typeof addressIssuedAt !== "number" || !Number.isFinite(addressIssuedAt)) {
		return null;
	}

	return Math.max(addressIssuedAt, getRetentionCutoff(now));
}

export function isEmailVisibleForIssuedAddress(
	emailTime: number,
	addressIssuedAt: number | undefined,
	now = Date.now(),
): boolean {
	const visibleSince = getMailboxVisibleSince(addressIssuedAt, now);
	return visibleSince !== null && emailTime >= visibleSince;
}
