import test from "node:test";
import assert from "node:assert/strict";
import {
	generateCustomEmailAddress,
	generateEmailAddress,
	normalizeEmailPrefix,
} from "./mail.ts";

test("generateEmailAddress uses the provided mail domain", () => {
	const address = generateEmailAddress("mail.056650.xyz");

	assert.match(address, /^[a-z0-9-]+@mail\.056650\.xyz$/);
});

test("normalizeEmailPrefix trims outer dashes and lowercases custom prefixes", () => {
	assert.equal(normalizeEmailPrefix("  --Reuse-This-Box--  "), "reuse-this-box");
});

test("generateCustomEmailAddress creates an address from a normalized prefix", () => {
	const address = generateCustomEmailAddress(
		"  --Reuse-This-Box--  ",
		"mail.056650.xyz",
	);

	assert.equal(address, "reuse-this-box@mail.056650.xyz");
});

test("generateCustomEmailAddress rejects invalid prefixes", () => {
	assert.throws(
		() => generateCustomEmailAddress("bad_prefix", "mail.056650.xyz"),
		/3-32 characters/,
	);
});
