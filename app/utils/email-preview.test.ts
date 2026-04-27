import test from "node:test";
import assert from "node:assert/strict";
import {
	shouldCollapseExpandedEmail,
	shouldLoadEmailPreview,
	toggleExpandedEmailId,
} from "./email-preview.ts";

test("clicking a collapsed email expands it", () => {
	assert.equal(toggleExpandedEmailId(null, "email-1"), "email-1");
});

test("clicking the expanded email collapses it", () => {
	assert.equal(toggleExpandedEmailId("email-1", "email-1"), null);
});

test("clicking a different email switches the expanded preview", () => {
	assert.equal(toggleExpandedEmailId("email-1", "email-2"), "email-2");
});

test("shouldLoadEmailPreview loads only when detail and status are both missing", () => {
	assert.equal(shouldLoadEmailPreview(undefined, undefined), true);
	assert.equal(shouldLoadEmailPreview(undefined, "loading"), false);
	assert.equal(shouldLoadEmailPreview("<html></html>", "ready"), false);
});

test("keeps the expanded email open while the inbox is revalidating", () => {
	assert.equal(
		shouldCollapseExpandedEmail("email-1", [], "loading"),
		false,
	);
});

test("collapses the expanded email after revalidation when the email is gone", () => {
	assert.equal(
		shouldCollapseExpandedEmail("email-1", [], "idle"),
		true,
	);
});

test("keeps the expanded email open after revalidation when the email is still present", () => {
	assert.equal(
		shouldCollapseExpandedEmail(
			"email-1",
			[{ id: "email-1" }, { id: "email-2" }],
			"idle",
		),
		false,
	);
});
