type HomeAddressEvent =
	| {
			source: "loader";
			addresses: string[];
	  }
	| {
			source: "action";
			addresses: string[];
			didUpdateAddress: boolean;
	  };

export function reduceHomeAddresses(
	currentAddresses: string[],
	event: HomeAddressEvent,
): string[] {
	if (event.source === "loader") {
		return event.addresses;
	}

	if (!event.didUpdateAddress) {
		return currentAddresses;
	}

	return event.addresses;
}

export function shouldProcessHomeAddressAction(
	action:
		| {
				actionId: string;
				didUpdateAddress: boolean;
		  }
		| undefined,
	lastProcessedActionId: string | null,
): boolean {
	return Boolean(
		action?.didUpdateAddress && action.actionId !== lastProcessedActionId,
	);
}
