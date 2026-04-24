type EmailBodyParts = {
	html: string | null | undefined;
	text: string | null | undefined;
};

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function renderPlainText(value: string): string {
	return escapeHtml(value).replace(/\r\n|\r|\n/g, "<br>");
}

function sanitizeHtml(value: string): string {
	return value
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
		.replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "")
		.replace(/\s+(href|src)\s*=\s*javascript:[^\s>]+/gi, "");
}

export function wrapEmailContent(content: string): string {
	return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src http: https: data: cid:; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none';">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            margin: 16px;
            color: #333;
            background: white;
        }
        .email-content {
            max-width: 100%;
            word-wrap: break-word;
        }
        img {
            max-width: 100%;
            height: auto;
        }
        a {
            color: #2563eb;
        }
        blockquote {
            border-left: 4px solid #e5e7eb;
            margin: 1em 0;
            padding: 0 1em;
            color: #6b7280;
        }
        pre {
            background: #f3f4f6;
            padding: 1em;
            border-radius: 6px;
            overflow-x: auto;
            white-space: pre-wrap;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }
        th, td {
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background: #f9fafb;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="email-content">${content}</div>
</body>
</html>`;
}

export function renderEmailBody({ html, text }: EmailBodyParts): string {
	const content = html ? sanitizeHtml(html) : renderPlainText(text ?? "");
	return wrapEmailContent(content);
}
