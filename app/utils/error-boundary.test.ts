import test from "node:test";
import assert from "node:assert/strict";
import { getRouteErrorContent } from "./error-boundary.ts";

test("getRouteErrorContent keeps 404 as a renderable not found response", () => {
	assert.deepEqual(getRouteErrorContent({ status: 404, statusText: "Not Found" }), {
		message: "404",
		details: "The requested page could not be found.",
		status: 404,
	});
});
