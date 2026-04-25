import test from "node:test";
import assert from "node:assert/strict";
import {
	getMailboxVisibleSince,
	isAddressExpired,
	isEmailVisibleForIssuedAddress,
} from "./mail-access.ts";
import { MAIL_RETENTION_MS } from "./mail-retention.ts";

test("getMailboxVisibleSince requires an address issue timestamp", () => {
	assert.equal(getMailboxVisibleSince(undefined, 1_700_000_000_000), null);
});

test("getMailboxVisibleSince uses the later of issue time and retention cutoff", () => {
	const now = 1_700_000_000_000;
	const recentIssueTime = now - 60_000;
	const oldIssueTime = now - MAIL_RETENTION_MS - 60_000;

	assert.equal(getMailboxVisibleSince(recentIssueTime, now), recentIssueTime);
	assert.equal(
		getMailboxVisibleSince(oldIssueTime, now),
		now - MAIL_RETENTION_MS,
	);
});

test("isEmailVisibleForIssuedAddress rejects mail before issue time or retention cutoff", () => {
	const now = 1_700_000_000_000;
	const issuedAt = now - 60_000;

	assert.equal(isEmailVisibleForIssuedAddress(issuedAt - 1, issuedAt, now), false);
	assert.equal(isEmailVisibleForIssuedAddress(issuedAt, issuedAt, now), true);
	assert.equal(
		isEmailVisibleForIssuedAddress(now - MAIL_RETENTION_MS - 1, issuedAt, now),
		false,
	);
});

test("isAddressExpired only expires issued addresses after the retention window", () => {
	const now = 1_700_000_000_000;

	assert.equal(isAddressExpired(undefined, now), false);
	assert.equal(isAddressExpired(now - 60_000, now), false);
	assert.equal(isAddressExpired(now - MAIL_RETENTION_MS, now), true);
	assert.equal(isAddressExpired(now - MAIL_RETENTION_MS - 1, now), true);
});
