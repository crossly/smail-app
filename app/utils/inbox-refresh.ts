export type AddressUpdateState = {
	didUpdateAddress: boolean;
	addresses: string[];
};

export const INBOX_REFRESH_LABEL_DELAY_MS = 150;

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
	revalidatorState: "idle" | "loading",
	hasDelayElapsed: boolean,
): boolean {
	return (
		isInboxRefreshing(activeAddress, revalidatorState) && hasDelayElapsed
	);
}
