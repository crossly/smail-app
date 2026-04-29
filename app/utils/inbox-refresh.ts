export type AddressUpdateState = {
	didUpdateAddress: boolean;
	addresses: string[];
};

export const INBOX_AUTO_REFRESH_INTERVAL_MS = 10_000;
export const INBOX_REFRESH_LABEL_DELAY_MS = 150;
export const INBOX_REFRESH_LABEL_MIN_VISIBLE_MS = 400;

export type InboxRefreshUiPhase =
	| "idle"
	| "requested"
	| "running"
	| "visible";

export function shouldRefreshInboxAfterAddressUpdate(
	update: AddressUpdateState,
): boolean {
	return update.didUpdateAddress && update.addresses.length > 0;
}

export function isInboxRefreshing(
	activeAddress: string | null,
	revalidatorState: "idle" | "loading",
): boolean {
	return Boolean(activeAddress) && revalidatorState !== "idle";
}

export function shouldShowRefreshingInboxLabel(
	activeAddress: string | null,
	uiPhase: InboxRefreshUiPhase,
): boolean {
	return Boolean(activeAddress) && uiPhase === "visible";
}

export function shouldLockInboxRefreshButton(
	activeAddress: string | null,
	uiPhase: InboxRefreshUiPhase,
): boolean {
	return Boolean(activeAddress) && uiPhase !== "idle";
}

export function getRemainingInboxRefreshLabelTime(
	visibleAt: number,
	now = Date.now(),
): number {
	return Math.max(INBOX_REFRESH_LABEL_MIN_VISIBLE_MS - (now - visibleAt), 0);
}

export function resolveInboxAutoRefreshIntervalMs(
	value: number | string | undefined,
): number {
	const intervalMs =
		typeof value === "number" ? value : value ? Number(value) : Number.NaN;

	if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
		return INBOX_AUTO_REFRESH_INTERVAL_MS;
	}

	return Math.round(intervalMs);
}

export function getInboxAutoRefreshCountdown({
	nextRefreshAt,
	now,
	intervalMs,
}: {
	nextRefreshAt: number;
	now: number;
	intervalMs: number;
}): {
	remainingMs: number;
	remainingSeconds: number;
	progress: number;
} {
	const safeIntervalMs = Math.max(intervalMs, 0);
	if (safeIntervalMs === 0) {
		return {
			remainingMs: 0,
			remainingSeconds: 0,
			progress: 1,
		};
	}

	const remainingMs = Math.min(
		Math.max(nextRefreshAt - now, 0),
		safeIntervalMs,
	);
	const elapsedMs = safeIntervalMs - remainingMs;

	return {
		remainingMs,
		remainingSeconds: Math.ceil(remainingMs / 1000),
		progress: Math.min(Math.max(elapsedMs / safeIntervalMs, 0), 1),
	};
}

export function shouldAutoRefreshInbox({
	activeAddress,
	isDocumentVisible,
	now,
	nextRefreshAt,
	revalidatorState,
}: {
	activeAddress: string | null;
	isDocumentVisible: boolean;
	now: number;
	nextRefreshAt: number;
	revalidatorState: "idle" | "loading";
}): boolean {
	return (
		Boolean(activeAddress) &&
		isDocumentVisible &&
		revalidatorState === "idle" &&
		now >= nextRefreshAt
	);
}
