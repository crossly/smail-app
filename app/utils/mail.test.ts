import test from "node:test";
import assert from "node:assert/strict";
import { generateEmailAddress } from "./mail.ts";

test("generateEmailAddress uses the provided mail domain", () => {
	const address = generateEmailAddress("mail.056650.xyz");

	assert.match(address, /^[a-z0-9-]+@mail\.056650\.xyz$/);
});
