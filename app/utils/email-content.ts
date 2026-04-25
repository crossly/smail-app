import { parseDocument } from "htmlparser2";

type EmailBodyParts = {
	html: string | null | undefined;
	text: string | null | undefined;
};

const ALLOWED_EMAIL_TAGS = new Set([
	"a",
	"abbr",
	"b",
	"blockquote",
	"br",
	"code",
	"dd",
	"del",
	"div",
	"dl",
	"dt",
	"em",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"hr",
	"i",
	"img",
	"ins",
	"li",
	"ol",
	"p",
	"pre",
	"s",
	"small",
	"span",
	"strong",
	"sub",
	"sup",
	"table",
	"tbody",
	"td",
	"tfoot",
	"th",
	"thead",
	"tr",
	"u",
	"ul",
]);

const VOID_EMAIL_TAGS = new Set(["br", "hr", "img"]);
const DROP_WITH_CONTENT_TAGS = new Set([
	"base",
	"canvas",
	"embed",
	"form",
	"iframe",
	"input",
	"link",
	"math",
	"meta",
	"object",
	"script",
	"select",
	"source",
	"style",
	"svg",
	"textarea",
	"video",
]);

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

function isSafeUrl(value: string): boolean {
	const trimmed = value.trim().replace(/[\u0000-\u001f\u007f\s]+/g, "");
	if (
		trimmed.startsWith("#") ||
		/^(https?:|mailto:|tel:)/i.test(trimmed)
	) {
		return true;
	}

	return !/^[a-z][a-z0-9+.-]*:/i.test(trimmed);
}

function isSafeImageSource(value: string): boolean {
	return /^\s*(?:cid:|data:image\/(?:gif|png|jpe?g|webp);base64,)/i.test(value);
}

function renderAttributes(tagName: string, attributes: Record<string, string>) {
	const safeAttributes: Record<string, string> = {};

	for (const [rawName, rawValue] of Object.entries(attributes)) {
		const name = rawName.toLowerCase();
		const value = rawValue ?? "";

		if (name.startsWith("on") || name === "style") {
			continue;
		}

		if (tagName === "a" && name === "href" && isSafeUrl(value)) {
			safeAttributes.href = value;
			safeAttributes.rel = "noopener noreferrer nofollow";
			continue;
		}

		if (tagName === "img" && name === "src" && isSafeImageSource(value)) {
			safeAttributes.src = value;
			continue;
		}

		if (
			["alt", "title", "dir", "lang", "width", "height", "colspan", "rowspan"].includes(
				name,
			)
		) {
			safeAttributes[name] = value;
		}
	}

	return Object.entries(safeAttributes)
		.map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
		.join("");
}

type HtmlNode = ReturnType<typeof parseDocument>["children"][number];

function renderSanitizedNode(node: HtmlNode): string {
	if (node.type === "text" && "data" in node) {
		return escapeHtml(node.data);
	}

	if (!("name" in node)) {
		return "children" in node
			? node.children.map(renderSanitizedNode).join("")
			: "";
	}
	if (node.type !== "tag") {
		return "";
	}

	const tagName = node.name.toLowerCase();
	if (DROP_WITH_CONTENT_TAGS.has(tagName)) {
		return "";
	}

	const children = "children" in node
		? node.children.map(renderSanitizedNode).join("")
		: "";
	if (!ALLOWED_EMAIL_TAGS.has(tagName)) {
		return children;
	}

	const attributes = renderAttributes(tagName, node.attribs ?? {});
	if (VOID_EMAIL_TAGS.has(tagName)) {
		return `<${tagName}${attributes}>`;
	}

	return `<${tagName}${attributes}>${children}</${tagName}>`;
}

function sanitizeHtml(value: string): string {
	const document = parseDocument(value);
	return document.children.map(renderSanitizedNode).join("");
}

export function wrapEmailContent(content: string): string {
	return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: cid:; style-src 'unsafe-inline'; font-src data:; media-src 'none'; object-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none';">
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
