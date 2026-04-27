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

test("shows the refreshing label only after the manual refresh becomes visible", async () => {
	const {
		INBOX_REFRESH_LABEL_DELAY_MS,
		INBOX_REFRESH_LABEL_MIN_VISIBLE_MS,
		shouldShowRefreshingInboxLabel,
	} =
		await import("./inbox-refresh.ts").catch(() => ({
			INBOX_REFRESH_LABEL_DELAY_MS: undefined,
			INBOX_REFRESH_LABEL_MIN_VISIBLE_MS: undefined,
			shouldShowRefreshingInboxLabel: undefined,
		}));

	assert.equal(
		shouldShowRefreshingInboxLabel?.("fresh-box@mail.056650.xyz", "idle"),
		false,
	);
	assert.equal(
		shouldShowRefreshingInboxLabel?.("fresh-box@mail.056650.xyz", "requested"),
		false,
	);
	assert.equal(
		shouldShowRefreshingInboxLabel?.("fresh-box@mail.056650.xyz", "running"),
		false,
	);
	assert.equal(
		shouldShowRefreshingInboxLabel?.("fresh-box@mail.056650.xyz", "visible"),
		true,
	);
	assert.equal(
		shouldShowRefreshingInboxLabel?.(null, "visible"),
		false,
	);
	assert.equal(INBOX_REFRESH_LABEL_DELAY_MS, 150);
	assert.equal(INBOX_REFRESH_LABEL_MIN_VISIBLE_MS, 400);
});

test("locks the refresh button only during a manual refresh with an active address", async () => {
	const { shouldLockInboxRefreshButton } = await import(
		"./inbox-refresh.ts"
	).catch(() => ({
		shouldLockInboxRefreshButton: undefined,
	}));

	assert.equal(
		shouldLockInboxRefreshButton?.("fresh-box@mail.056650.xyz", "idle"),
		false,
	);
	assert.equal(
		shouldLockInboxRefreshButton?.("fresh-box@mail.056650.xyz", "requested"),
		true,
	);
	assert.equal(
		shouldLockInboxRefreshButton?.("fresh-box@mail.056650.xyz", "running"),
		true,
	);
	assert.equal(
		shouldLockInboxRefreshButton?.("fresh-box@mail.056650.xyz", "visible"),
		true,
	);
	assert.equal(shouldLockInboxRefreshButton?.(null, "visible"), false);
});

test("keeps the refreshing label visible for the minimum display duration", async () => {
	const {
		INBOX_REFRESH_LABEL_MIN_VISIBLE_MS,
		getRemainingInboxRefreshLabelTime,
	} = await import("./inbox-refresh.ts").catch(() => ({
		INBOX_REFRESH_LABEL_MIN_VISIBLE_MS: undefined,
		getRemainingInboxRefreshLabelTime: undefined,
	}));
	const visibleAt = 1_700_000_000_000;

	assert.equal(
		getRemainingInboxRefreshLabelTime?.(visibleAt, visibleAt),
		INBOX_REFRESH_LABEL_MIN_VISIBLE_MS,
	);
	assert.equal(
		getRemainingInboxRefreshLabelTime?.(visibleAt, visibleAt + 150),
		250,
	);
	assert.equal(
		getRemainingInboxRefreshLabelTime?.(
			visibleAt,
			visibleAt + INBOX_REFRESH_LABEL_MIN_VISIBLE_MS + 1,
		),
		0,
	);
});
