import test from "node:test";
import assert from "node:assert/strict";
import { shouldCommitHomeSession } from "./home-session.ts";

test("commits the home session only when active address metadata is repaired", () => {
	assert.equal(shouldCommitHomeSession(["box@mail.056650.xyz"], undefined), true);
	assert.equal(
		shouldCommitHomeSession(["box@mail.056650.xyz"], 1_700_000_000_000),
		false,
	);
	assert.equal(shouldCommitHomeSession([], undefined), false);
});
