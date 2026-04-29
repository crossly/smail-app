import test from "node:test";
import assert from "node:assert/strict";
import { reduceHomeAddresses } from "./home-addresses.ts";

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
