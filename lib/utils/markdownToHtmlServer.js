/**
 * Lightweight markdown → HTML for server-side translation saves (MCP).
 * Draft editor uses richer client formatting; this covers common Claude output.
 */
export function markdownToHtmlServer(markdown) {
	const md = String(markdown || "").trim();
	if (!md) return "";
	if (md.startsWith("<")) return md;

	const blocks = md.split(/\n{2,}/);
	const htmlBlocks = blocks.map((block) => {
		const lines = block.split("\n");
		const trimmed = block.trim();

		if (/^#{1,6}\s/.test(trimmed)) {
			const match = trimmed.match(/^(#{1,6})\s+(.+)$/);
			if (match) {
				const level = match[1].length;
				return `<h${level}>${inlineFormat(match[2])}</h${level}>`;
			}
		}

		if (/^[-*]\s/.test(trimmed)) {
			const items = lines
				.filter((l) => /^[-*]\s/.test(l.trim()))
				.map((l) => `<li>${inlineFormat(l.replace(/^[-*]\s+/, ""))}</li>`)
				.join("");
			return items ? `<ul>${items}</ul>` : `<p>${inlineFormat(trimmed)}</p>`;
		}

		if (/^\d+\.\s/.test(trimmed)) {
			const items = lines
				.filter((l) => /^\d+\.\s/.test(l.trim()))
				.map((l) => `<li>${inlineFormat(l.replace(/^\d+\.\s+/, ""))}</li>`)
				.join("");
			return items ? `<ol>${items}</ol>` : `<p>${inlineFormat(trimmed)}</p>`;
		}

		if (trimmed.startsWith(">")) {
			const quote = lines.map((l) => l.replace(/^>\s?/, "")).join(" ");
			return `<blockquote><p>${inlineFormat(quote)}</p></blockquote>`;
		}

		return `<p>${lines.map((l) => inlineFormat(l)).join("<br>")}</p>`;
	});

	return htmlBlocks.join("\n");
}

function inlineFormat(text) {
	return escapeHtml(String(text || ""))
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/\*(.+?)\*/g, "<em>$1</em>")
		.replace(/`([^`]+)`/g, "<code>$1</code>")
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function escapeHtml(s) {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
