# Security Policy

## Supported Versions

This project is currently maintained from the `main` branch.

## Reporting a Vulnerability

Please do not open a public issue for sensitive security reports. Contact the maintainer privately, or create a private security advisory if the repository is hosted on GitHub.

## Secrets And Deployment Safety

- Never commit `.env`, `.dev.vars`, Cloudflare API tokens, JWT secrets, or generated Wrangler configs.
- `SESSION_SECRETS` is required for browser session tokens.
- `TOKEN_SECRETS` is optional, but recommended for Automation API mailbox tokens. If omitted, `SESSION_SECRETS` is reused.
- Rotate secrets by placing the new secret first and keeping previous secrets after it, separated by commas.

## Product Boundary

This app is designed for temporary receiving, registration verification, testing, and low-risk automation. Do not use it for banking, government, employment, legal, production account recovery, or other sensitive mailbox workflows.

## License Notice

This project was refactored from `akazwz/smail`. At the time of review, the upstream repository did not expose an explicit license file or package license field. Keep this repository marked as `UNLICENSED` until upstream authorization or a valid relicensing decision is documented.
