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
		html: '<style>.hero{background:url("https://tracker.test/bg.png")}</style><p onclick="alert(1)" style="background-image:url(https://tracker.test/inline.png)">Hi<script>alert(1)</script><a href="javascript:alert(1)">open</a><img src="https://example.test/pixel" srcset="https://tracker.test/a.png 1x, https://tracker.test/b.png 2x" onerror="alert(1)"><img src="cid:local-image"></p>',
		text: "",
	});

	assert.doesNotMatch(body, /<script/i);
	assert.doesNotMatch(body, /onclick=/i);
	assert.doesNotMatch(body, /onerror=/i);
	assert.doesNotMatch(body, /style=/i);
	assert.doesNotMatch(body, /srcset=/i);
	assert.doesNotMatch(body, /javascript:/i);
	assert.doesNotMatch(body, /https:\/\/example\.test\/pixel/i);
	assert.doesNotMatch(body, /https:\/\/tracker\.test/i);
	assert.doesNotMatch(body, /img-src http: https:/i);
	assert.match(body, /<p>Hi<a>open<\/a><img><img src="cid:local-image"><\/p>/);
});

test("renderEmailBody strips high risk document and embed tags from HTML email bodies", () => {
	const body = renderEmailBody({
		html: '<meta http-equiv="refresh" content="0;url=https://example.test"><base href="https://example.test"><form action="https://example.test"><button>Send</button></form><iframe srcdoc="<script>alert(1)</script>"></iframe><object data="https://example.test/file"></object><p>Safe</p>',
		text: "",
	});

	assert.doesNotMatch(body, /<meta http-equiv="refresh"/i);
	assert.doesNotMatch(body, /<base href=/i);
	assert.doesNotMatch(body, /<form/i);
	assert.doesNotMatch(body, /<iframe/i);
	assert.doesNotMatch(body, /<object/i);
	assert.match(body, /<p>Safe<\/p>/);
});
