import test from "node:test";
import assert from "node:assert/strict";
import {
	createSiteConfig,
	replaceSiteText,
	replaceSiteTextDeep,
} from "./site-config.ts";

test("createSiteConfig derives site and mail settings from env vars", () => {
	const siteConfig = createSiteConfig({
		env: {
			SITE_DOMAIN: "mail.056650.xyz",
			MAIL_DOMAIN: "mail.056650.xyz",
		},
	});

	assert.equal(siteConfig.siteDomain, "mail.056650.xyz");
	assert.equal(siteConfig.siteUrl, "https://mail.056650.xyz");
	assert.equal(siteConfig.mailDomain, "mail.056650.xyz");
	assert.equal(siteConfig.supportEmail, "support@mail.056650.xyz");
});

test("replaceSiteText updates legacy brand references", () => {
	const siteConfig = createSiteConfig({
		env: {
			SITE_DOMAIN: "mail.056650.xyz",
			MAIL_DOMAIN: "mail.056650.xyz",
			SUPPORT_EMAIL: "support@mail.056650.xyz",
		},
	});

	assert.equal(
		replaceSiteText("Open https://smail.pw or email support@smail.pw", siteConfig),
		"Open https://mail.056650.xyz or email support@mail.056650.xyz",
	);
});

test("replaceSiteTextDeep walks nested site copy objects", () => {
	const siteConfig = createSiteConfig({
		env: {
			SITE_DOMAIN: "mail.056650.xyz",
		},
	});

	const copy = replaceSiteTextDeep(
		{
			title: "About smail.pw",
			items: ["support@smail.pw", "smail.pw Blog"],
		},
		siteConfig,
	);

	assert.deepEqual(copy, {
		title: "About mail.056650.xyz",
		items: ["support@mail.056650.xyz", "mail.056650.xyz Blog"],
	});
});
