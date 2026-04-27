import test from "node:test";
import assert from "node:assert/strict";
import {
	getLayoutShellLoaderData,
	getRootTheme,
} from "./route-loader-data.ts";

test("falls back to the default root theme when loader data is unavailable", () => {
	assert.deepEqual(getRootTheme(undefined), "light");
	assert.deepEqual(getRootTheme(null), "light");
});

test("preserves the loaded root theme when it exists", () => {
	assert.equal(getRootTheme({ theme: "dark" }), "dark");
});

test("falls back to safe layout shell data when route loader data is unavailable", () => {
	assert.deepEqual(
		getLayoutShellLoaderData(undefined, 2030),
		{
			locale: "en",
			renderedYear: 2030,
			theme: "light",
		},
	);
});

test("preserves layout shell loader data when it exists", () => {
	assert.deepEqual(
		getLayoutShellLoaderData(
			{
				locale: "zh",
				renderedYear: 2026,
				theme: "dark",
			},
			2030,
		),
		{
			locale: "zh",
			renderedYear: 2026,
			theme: "dark",
		},
	);
});
