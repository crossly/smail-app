import test from "node:test";
import assert from "node:assert/strict";
import {
	getMailboxVisibleSince,
	isEmailVisibleForIssuedAddress,
} from "./mail-access.ts";
import { MAIL_RETENTION_MS } from "./mail-retention.ts";

test("getMailboxVisibleSince follows the retention cutoff regardless of address issue time", () => {
	const now = 1_700_000_000_000;
	const oldIssueTime = now - MAIL_RETENTION_MS - 60_000;

	assert.equal(getMailboxVisibleSince(undefined, now), now - MAIL_RETENTION_MS);
	assert.equal(getMailboxVisibleSince(oldIssueTime, now), now - MAIL_RETENTION_MS);
});

test("isEmailVisibleForIssuedAddress keeps mail visible for the full retention window", () => {
	const now = 1_700_000_000_000;
	const issuedAt = now - 60_000;

	assert.equal(
		isEmailVisibleForIssuedAddress(now - 120_000, issuedAt, now),
		true,
	);
	assert.equal(
		isEmailVisibleForIssuedAddress(now - MAIL_RETENTION_MS, issuedAt, now),
		true,
	);
	assert.equal(
		isEmailVisibleForIssuedAddress(now - MAIL_RETENTION_MS - 1, issuedAt, now),
		false,
	);
});
