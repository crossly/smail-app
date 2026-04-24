export function getAddressActionLabelKey({
	activeAddress,
	customPrefix,
}: {
	activeAddress: string | null;
	customPrefix: string;
}): "generateAddress" | "customPrefixAction" | "generateNew" {
	if (activeAddress) {
		return "generateNew";
	}

	return customPrefix.trim() ? "customPrefixAction" : "generateAddress";
}
