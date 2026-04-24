import test from "node:test";
import assert from "node:assert/strict";

test("refreshes the inbox after issuing a new address", async () => {
	const { shouldRefreshInboxAfterAddressUpdate } = await import(
		"./inbox-refresh.ts"
	).catch(() => ({
		shouldRefreshInboxAfterAddressUpdate: undefined,
	}));

	assert.equal(
		shouldRefreshInboxAfterAddressUpdate?.({
			didUpdateAddress: true,
			addresses: ["fresh-box@mail.056650.xyz"],
		}),
		true,
	);
});

test("does not refresh the inbox after deleting the current address", async () => {
	const { shouldRefreshInboxAfterAddressUpdate } = await import(
		"./inbox-refresh.ts"
	).catch(() => ({
		shouldRefreshInboxAfterAddressUpdate: undefined,
	}));

	assert.equal(
		shouldRefreshInboxAfterAddressUpdate?.({
			didUpdateAddress: true,
			addresses: [],
		}),
		false,
	);
});

test("does not refresh the inbox when the address update failed", async () => {
	const { shouldRefreshInboxAfterAddressUpdate } = await import(
		"./inbox-refresh.ts"
	).catch(() => ({
		shouldRefreshInboxAfterAddressUpdate: undefined,
	}));

	assert.equal(
		shouldRefreshInboxAfterAddressUpdate?.({
			didUpdateAddress: false,
			addresses: ["unchanged@mail.056650.xyz"],
		}),
		false,
	);
});

test("shows the inbox as refreshing only while an address is active", async () => {
	const { isInboxRefreshing } = await import("./inbox-refresh.ts").catch(() => ({
		isInboxRefreshing: undefined,
	}));

	assert.equal(
		isInboxRefreshing?.("fresh-box@mail.056650.xyz", "loading"),
		true,
	);
	assert.equal(isInboxRefreshing?.(null, "loading"), false);
	assert.equal(
		isInboxRefreshing?.("fresh-box@mail.056650.xyz", "idle"),
		false,
	);
});
