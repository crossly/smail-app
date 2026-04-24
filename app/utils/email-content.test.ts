import test from "node:test";
import assert from "node:assert/strict";
import { renderEmailBody } from "./email-content.ts";

test("renderEmailBody escapes plain text before wrapping it as HTML", () => {
	const body = renderEmailBody({
		html: "",
		text: 'Hello <img src="https://example.test/pixel"> & <b>bold</b>\nNext',
	});

	assert.match(body, /Hello &lt;img src=&quot;https:\/\/example\.test\/pixel&quot;&gt; &amp; &lt;b&gt;bold&lt;\/b&gt;<br>Next/);
	assert.doesNotMatch(body, /<img src="https:\/\/example\.test\/pixel">/);
});

test("renderEmailBody strips active content from HTML email bodies", () => {
	const body = renderEmailBody({
		html: '<p onclick="alert(1)">Hi<script>alert(1)</script><a href="javascript:alert(1)">open</a><img src="https://example.test/pixel" onerror="alert(1)"></p>',
		text: "",
	});

	assert.doesNotMatch(body, /<script/i);
	assert.doesNotMatch(body, /onclick=/i);
	assert.doesNotMatch(body, /onerror=/i);
	assert.doesNotMatch(body, /javascript:/i);
	assert.match(body, /<p>Hi<a>open<\/a><img src="https:\/\/example\.test\/pixel"><\/p>/);
});
