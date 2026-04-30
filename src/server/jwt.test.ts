import test from "node:test";
import assert from "node:assert/strict";
import { signToken, verifyToken } from "./jwt.ts";

test("signToken creates and verifies HS256 session tokens with typ=session", async () => {
	const now = 1_700_000_000_000;
	const token = await signToken(
		{ TOKEN_SECRETS: "primary-secret" },
		{
			typ: "session",
			address: "box@mail.056650.xyz",
			ownerToken: "owner-1",
			iat: Math.floor(now / 1000),
			exp: Math.floor((now + 86_400_000) / 1000),
		},
	);

	const payload = await verifyToken(
		{ TOKEN_SECRETS: "primary-secret" },
		token,
		"session",
		{ now },
	);

	assert.equal(payload?.typ, "session");
	assert.equal(payload?.address, "box@mail.056650.xyz");
	assert.equal(payload?.ownerToken, "owner-1");
});

test("verifyToken falls back to SESSION_SECRETS when TOKEN_SECRETS is absent", async () => {
	const now = 1_700_000_000_000;
	const env = {
		SESSION_SECRETS: "legacy-secret",
	};
	const token = await signToken(env, {
		typ: "mailbox",
		address: "box@mail.056650.xyz",
		ownerToken: "owner-1",
		iat: Math.floor(now / 1000),
		exp: Math.floor((now + 86_400_000) / 1000),
	});

	const payload = await verifyToken(env, token, "mailbox", { now });

	assert.equal(payload?.typ, "mailbox");
	assert.equal(payload?.address, "box@mail.056650.xyz");
});

test("verifyToken rejects tokens with the wrong typ or expired exp", async () => {
	const now = 1_700_000_000_000;
	const env = {
		TOKEN_SECRETS: "primary-secret",
	};
	const token = await signToken(env, {
		typ: "mailbox",
		address: "box@mail.056650.xyz",
		iat: Math.floor((now - 172_800_000) / 1000),
		exp: Math.floor((now - 86_400_000) / 1000),
	});

	assert.equal(await verifyToken(env, token, "session", { now }), null);
	assert.equal(await verifyToken(env, token, "mailbox", { now }), null);
});
