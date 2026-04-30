import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const OUTPUT_PATH = ".wrangler/generated-wrangler.jsonc";
const ENV_FILES = [".env", ".env.local", ".dev.vars"];
const PLACEHOLDER_PREFIX = "replace-with-";

const defaults = {
	WORKER_NAME: "smail-app",
	WORKER_COMPATIBILITY_DATE: "2025-11-26",
	WORKER_MAIN: "./workers/app.ts",
	ASSETS_DIRECTORY: "./dist",
	WORKER_ROUTE_PATTERN: "mail.example.com",
	WORKER_CUSTOM_DOMAIN: "true",
	SITE_DOMAIN: "mail.example.com",
	SITE_URL: "https://mail.example.com",
	MAIL_DOMAIN: "mail.example.com",
	SUPPORT_EMAIL: "support@mail.example.com",
	INBOX_AUTO_REFRESH_INTERVAL_MS: "10000",
	OBSERVABILITY_ENABLED: "true",
	CLEANUP_CRON: "*/30 * * * *",
	D1_DATABASE_NAME: "smail",
	D1_DATABASE_ID: "replace-with-d1-database-id",
	D1_PREVIEW_DATABASE_ID: "replace-with-preview-d1-database-id",
	R2_BUCKET_NAME: "smail",
	R2_PREVIEW_BUCKET_NAME: "smail-preview",
};

function parseEnvValue(value) {
	const trimmed = value.trim();
	if (
		(trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}

	return trimmed;
}

function parseEnvFile(content) {
	const values = {};

	for (const line of content.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		const separatorIndex = trimmed.indexOf("=");
		if (separatorIndex < 0) {
			continue;
		}

		const key = trimmed.slice(0, separatorIndex).trim();
		if (!key) {
			continue;
		}

		values[key] = parseEnvValue(trimmed.slice(separatorIndex + 1));
	}

	return values;
}

async function readEnvFiles() {
	const merged = {};

	for (const file of ENV_FILES) {
		try {
			Object.assign(merged, parseEnvFile(await readFile(file, "utf8")));
		} catch (error) {
			if (error?.code !== "ENOENT") {
				throw error;
			}
		}
	}

	return merged;
}

function readBoolean(value) {
	return String(value).toLowerCase() !== "false";
}

function createConfig(env) {
	const routePattern = env.WORKER_ROUTE_PATTERN.trim();
	const config = {
		$schema: "node_modules/wrangler/config-schema.json",
		name: env.WORKER_NAME,
		compatibility_date: env.WORKER_COMPATIBILITY_DATE,
		main: env.WORKER_MAIN,
		assets: {
			directory: env.ASSETS_DIRECTORY,
			binding: "ASSETS",
			not_found_handling: "single-page-application",
		},
		vars: {
			SITE_DOMAIN: env.SITE_DOMAIN,
			SITE_URL: env.SITE_URL,
			MAIL_DOMAIN: env.MAIL_DOMAIN,
			SUPPORT_EMAIL: env.SUPPORT_EMAIL,
			INBOX_AUTO_REFRESH_INTERVAL_MS: env.INBOX_AUTO_REFRESH_INTERVAL_MS,
		},
		secrets: {
			required: ["SESSION_SECRETS"],
		},
		observability: {
			enabled: readBoolean(env.OBSERVABILITY_ENABLED),
		},
		triggers: {
			crons: [env.CLEANUP_CRON],
		},
		d1_databases: [
			{
				binding: "D1",
				database_name: env.D1_DATABASE_NAME,
				database_id: env.D1_DATABASE_ID,
				preview_database_id: env.D1_PREVIEW_DATABASE_ID,
				migrations_dir: "migrations",
			},
		],
		r2_buckets: [
			{
				binding: "R2",
				bucket_name: env.R2_BUCKET_NAME,
				preview_bucket_name: env.R2_PREVIEW_BUCKET_NAME,
			},
		],
	};

	if (routePattern) {
		config.routes = [
			{
				pattern: routePattern,
				custom_domain: readBoolean(env.WORKER_CUSTOM_DOMAIN),
			},
		];
	}

	return config;
}

function validateConfig(env) {
	const requiredKeys = [
		"WORKER_ROUTE_PATTERN",
		"SITE_DOMAIN",
		"SITE_URL",
		"MAIL_DOMAIN",
		"SUPPORT_EMAIL",
		"D1_DATABASE_NAME",
		"D1_DATABASE_ID",
		"D1_PREVIEW_DATABASE_ID",
		"R2_BUCKET_NAME",
		"R2_PREVIEW_BUCKET_NAME",
	];
	const missing = [];

	for (const key of requiredKeys) {
		const value = env[key]?.trim();
		if (!value || value.startsWith(PLACEHOLDER_PREFIX)) {
			missing.push(key);
		}
	}

	if (missing.length > 0) {
		throw new Error(
			`Missing deployment config: ${missing.join(", ")}. Copy .env.example to .env and fill real Cloudflare resource values.`,
		);
	}
}

const args = new Set(process.argv.slice(2));
const env = {
	...defaults,
	...(await readEnvFiles()),
	...process.env,
};

if (args.has("--check") || process.env.CONFIG_STRICT === "1") {
	validateConfig(env);
}

const outputPath = resolve(OUTPUT_PATH);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(createConfig(env), null, "\t")}\n`);
console.log(`Generated ${OUTPUT_PATH}`);
