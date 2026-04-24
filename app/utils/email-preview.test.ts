import test from "node:test";
import assert from "node:assert/strict";
import { toggleExpandedEmailId } from "./email-preview.ts";

test("clicking a collapsed email expands it", () => {
	assert.equal(toggleExpandedEmailId(null, "email-1"), "email-1");
});

test("clicking the expanded email collapses it", () => {
	assert.equal(toggleExpandedEmailId("email-1", "email-1"), null);
});

test("clicking a different email switches the expanded preview", () => {
	assert.equal(toggleExpandedEmailId("email-1", "email-2"), "email-2");
});
