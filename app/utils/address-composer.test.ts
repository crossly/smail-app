import test from "node:test";
import assert from "node:assert/strict";

test("uses the generate label when there is no active address and the prefix input is empty", async () => {
	const { getAddressActionLabelKey } = await import("./address-composer.ts").catch(
		() => ({
			getAddressActionLabelKey: undefined,
		}),
	);

	assert.equal(
		getAddressActionLabelKey?.({
			activeAddress: null,
			customPrefix: "",
		}),
		"generateAddress",
	);
});

test("uses the reuse label when there is no active address and the prefix input has content", async () => {
	const { getAddressActionLabelKey } = await import("./address-composer.ts").catch(
		() => ({
			getAddressActionLabelKey: undefined,
		}),
	);

	assert.equal(
		getAddressActionLabelKey?.({
			activeAddress: null,
			customPrefix: "reuse-this-box",
		}),
		"customPrefixAction",
	);
});

test("keeps the generate-new label when an address is already active", async () => {
	const { getAddressActionLabelKey } = await import("./address-composer.ts").catch(
		() => ({
			getAddressActionLabelKey: undefined,
		}),
	);

	assert.equal(
		getAddressActionLabelKey?.({
			activeAddress: "active-box@mail.056650.xyz",
			customPrefix: "reuse-this-box",
		}),
		"generateNew",
	);
});
