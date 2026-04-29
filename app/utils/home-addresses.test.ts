import test from "node:test";
import assert from "node:assert/strict";
import {
	reduceHomeAddresses,
	shouldProcessHomeAddressAction,
} from "./home-addresses.ts";

test("loader refresh replaces stale action addresses", () => {
	const addresses = reduceHomeAddresses(["old@mail.056650.xyz"], {
		source: "loader",
		addresses: [],
	});

	assert.deepEqual(addresses, []);
});

test("successful address actions update the visible address immediately", () => {
	const addresses = reduceHomeAddresses(["old@mail.056650.xyz"], {
		source: "action",
		didUpdateAddress: true,
		addresses: ["new@mail.056650.xyz"],
	});

	assert.deepEqual(addresses, ["new@mail.056650.xyz"]);
});

test("failed address actions keep the current visible address", () => {
	const addresses = reduceHomeAddresses(["old@mail.056650.xyz"], {
		source: "action",
		didUpdateAddress: false,
		addresses: ["other@mail.056650.xyz"],
	});

	assert.deepEqual(addresses, ["old@mail.056650.xyz"]);
});

test("processes each address action result only once", () => {
	assert.equal(
		shouldProcessHomeAddressAction(
			{
				actionId: "action-1",
				didUpdateAddress: true,
			},
			null,
		),
		true,
	);
	assert.equal(
		shouldProcessHomeAddressAction(
			{
				actionId: "action-1",
				didUpdateAddress: true,
			},
			"action-1",
		),
		false,
	);
	assert.equal(
		shouldProcessHomeAddressAction(
			{
				actionId: "action-2",
				didUpdateAddress: false,
			},
			"action-1",
		),
		false,
	);
	assert.equal(shouldProcessHomeAddressAction(undefined, "action-1"), false);
});
