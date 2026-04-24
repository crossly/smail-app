import test from "node:test";
import assert from "node:assert/strict";
import {
	getHomeToolSections,
	getToolShellConfig,
} from "./tool-shell.ts";

test("tool shell removes promotional navigation and footer links", () => {
	const shell = getToolShellConfig();

	assert.deepEqual(shell.primaryNavItems, []);
	assert.equal(shell.showFooterDescription, false);
	assert.equal(shell.showFooterLinks, false);
});

test("home surface keeps only address and inbox workflows", () => {
	const sections = getHomeToolSections();

	assert.equal(sections.showHero, false);
	assert.equal(sections.showNarrative, false);
	assert.equal(sections.showGuides, false);
	assert.deepEqual(sections.panelOrder, ["address", "inbox"]);
	assert.deepEqual(sections.desktopColumns, [4, 6]);
});
