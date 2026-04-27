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

test("delays the refreshing label long enough to avoid flicker on short refreshes", async () => {
	const { INBOX_REFRESH_LABEL_DELAY_MS, shouldShowRefreshingInboxLabel } =
		await import("./inbox-refresh.ts").catch(() => ({
			INBOX_REFRESH_LABEL_DELAY_MS: undefined,
			shouldShowRefreshingInboxLabel: undefined,
		}));

	assert.equal(
		shouldShowRefreshingInboxLabel?.(
			"fresh-box@mail.056650.xyz",
			"loading",
			false,
		),
		false,
	);
	assert.equal(
		shouldShowRefreshingInboxLabel?.(
			"fresh-box@mail.056650.xyz",
			"loading",
			true,
		),
		true,
	);
	assert.equal(
		shouldShowRefreshingInboxLabel?.(null, "loading", true),
		false,
	);
	assert.equal(
		shouldShowRefreshingInboxLabel?.(
			"fresh-box@mail.056650.xyz",
			"idle",
			true,
		),
		false,
	);
	assert.equal(INBOX_REFRESH_LABEL_DELAY_MS, 150);
});
