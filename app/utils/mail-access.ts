import { getRetentionCutoff } from "./mail-retention.ts";

export function getMailboxVisibleSince(
	_addressIssuedAt: number | undefined,
	now = Date.now(),
): number {
	return getRetentionCutoff(now);
}

export function isEmailVisibleForIssuedAddress(
	emailTime: number,
	_addressIssuedAt: number | undefined,
	now = Date.now(),
): boolean {
	return emailTime >= getRetentionCutoff(now);
}
