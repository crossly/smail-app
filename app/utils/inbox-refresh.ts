export type AddressUpdateState = {
	didUpdateAddress: boolean;
	addresses: string[];
};

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
