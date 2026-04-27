export type AddressUpdateState = {
	didUpdateAddress: boolean;
	addresses: string[];
};

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
