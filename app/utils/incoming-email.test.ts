import test from "node:test";
import assert from "node:assert/strict";
import { handleIncomingEmail } from "./incoming-email.ts";

function createIncomingEmailEnv() {
	const persisted: string[] = [];
	const insertedToAddresses: string[] = [];

	const env = {
		MAIL_DOMAIN: "mail.056650.xyz",
		R2: {
			async put(id: string) {
				persisted.push(id);
			},
			async delete() {},
		},
		D1: {
			prepare() {
				return {
					bind(id: string, toAddress: string) {
						return {
							async run() {
								persisted.push(`d1:${id}`);
								insertedToAddresses.push(toAddress);
								return {};
							},
						};
					},
				};
			},
		},
	};

	return { env, insertedToAddresses, persisted };
}

test("handleIncomingEmail ignores mail for domains outside MAIL_DOMAIN", async () => {
	const { env, persisted } = createIncomingEmailEnv();

	const result = await handleIncomingEmail(
		env as unknown as Pick<Env, "D1" | "R2" | "MAIL_DOMAIN">,
		{
			to: "box@example.test",
			raw: new TextEncoder().encode("Subject: Hello\r\n\r\nBody").buffer,
		},
		{ createId: () => "msg-1" },
	);

	assert.equal(result.status, "ignored-domain");
	assert.deepEqual(persisted, []);
});

test("handleIncomingEmail rejects raw messages above the size limit", async () => {
	const { env, persisted } = createIncomingEmailEnv();

	const result = await handleIncomingEmail(
		env as unknown as Pick<Env, "D1" | "R2" | "MAIL_DOMAIN">,
		{
			to: "box@mail.056650.xyz",
			raw: new Uint8Array(11).buffer,
		},
		{
			createId: () => "msg-1",
			maxRawBytes: 10,
			warn: () => {},
		},
	);

	assert.equal(result.status, "too-large");
	assert.deepEqual(persisted, []);
});

test("handleIncomingEmail persists valid mail for MAIL_DOMAIN", async () => {
	const { env, persisted } = createIncomingEmailEnv();

	const result = await handleIncomingEmail(
		env as unknown as Pick<Env, "D1" | "R2" | "MAIL_DOMAIN">,
		{
			to: "box@mail.056650.xyz",
			raw: new TextEncoder().encode(
				"From: Sender <sender@example.test>\r\nSubject: Hello\r\n\r\nBody",
			).buffer,
		},
		{ createId: () => "msg-1" },
	);

	assert.equal(result.status, "persisted");
	assert.deepEqual(persisted, ["msg-1", "d1:msg-1"]);
});

test("handleIncomingEmail normalizes the recipient address before persisting it", async () => {
	const { env, insertedToAddresses } = createIncomingEmailEnv();

	const result = await handleIncomingEmail(
		env as unknown as Pick<Env, "D1" | "R2" | "MAIL_DOMAIN">,
		{
			to: "Reuse-This-Box@MAIL.056650.XYZ",
			raw: new TextEncoder().encode(
				"From: Sender <sender@example.test>\r\nSubject: Hello\r\n\r\nBody",
			).buffer,
		},
		{ createId: () => "msg-1" },
	);

	assert.equal(result.status, "persisted");
	assert.deepEqual(insertedToAddresses, ["reuse-this-box@mail.056650.xyz"]);
});
