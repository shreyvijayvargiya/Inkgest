/**
 * Extract Mermaid + infographic payloads from draft editor HTML (browser).
 */

function looksLikeMermaidSource(text) {
	const t = String(text || "").trim();
	if (!t) return false;
	if (/^#mermaid-\d+\{/i.test(t)) return false;
	return /\b(flowchart|graph\b|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie\b|mindmap|timeline|gitGraph)\b/i.test(
		t,
	);
}

function readMermaidSourceFromWrap(wrap) {
	if (!wrap) return "";
	const fromWrap = wrap.getAttribute("data-ink-mermaid-source");
	if (fromWrap?.trim() && looksLikeMermaidSource(fromWrap)) return fromWrap.trim();
	const pre =
		wrap.querySelector("pre.mermaid") ||
		wrap.querySelector("pre[data-ink-mermaid]");
	if (!pre) return "";
	const fromPre = pre.getAttribute("data-ink-mermaid-source");
	if (fromPre?.trim() && looksLikeMermaidSource(fromPre)) return fromPre.trim();
	if (pre.querySelector("svg")) return "";
	const raw = (pre.textContent || "").trim();
	return looksLikeMermaidSource(raw) ? raw : "";
}

/** @returns {{ code: string, caption: string }[]} */
export function extractMermaidSourcesFromHtml(html) {
	if (typeof document === "undefined" || !html?.trim()) return [];
	try {
		const doc = new DOMParser().parseFromString(html, "text/html");
		const out = [];
		const seen = new Set();
		doc
			.querySelectorAll("[data-ink-mermaid-wrap], .ink-mermaid-slot")
			.forEach((wrap) => {
				const code = readMermaidSourceFromWrap(wrap);
				if (!code || seen.has(code)) return;
				seen.add(code);
				out.push({
					code,
					caption: wrap.getAttribute("data-caption")?.trim() || "",
				});
			});
		doc.querySelectorAll("pre.mermaid, pre[data-ink-mermaid]").forEach((pre) => {
			if (pre.closest("[data-ink-mermaid-wrap], .ink-mermaid-slot")) return;
			const code =
				pre.getAttribute("data-ink-mermaid-source")?.trim() ||
				(pre.querySelector("svg") ? "" : (pre.textContent || "").trim());
			if (!code || seen.has(code)) return;
			seen.add(code);
			out.push({ code, caption: "" });
		});
		return out;
	} catch {
		return [];
	}
}

export function mermaidSourcesToMarkdown(blocks) {
	if (!blocks?.length) return "";
	return blocks
		.map(({ code, caption }) => {
			const head = caption ? `<!-- ${caption} -->\n` : "";
			return `${head}\`\`\`mermaid\n${code.replace(/\n?$/, "\n")}\`\`\``;
		})
		.join("\n\n");
}

/** @returns {string[]} outer HTML strings for each infographic embed */
export function extractInfographicEmbedHtmlFromHtml(html) {
	if (typeof document === "undefined" || !html?.trim()) return [];
	try {
		const doc = new DOMParser().parseFromString(html, "text/html");
		const out = [];
		doc
			.querySelectorAll("[data-ink-infographic-wrap], .ink-infographic-slot")
			.forEach((wrap) => {
				const iframe = wrap.querySelector('iframe[data-ink-infographic="1"]');
				const srcdoc = iframe?.getAttribute("srcdoc");
				if (!srcdoc?.trim()) return;
				out.push(wrap.outerHTML);
			});
		doc.querySelectorAll('iframe[data-ink-infographic="1"]').forEach((iframe) => {
			if (iframe.closest("[data-ink-infographic-wrap], .ink-infographic-slot"))
				return;
			const srcdoc = iframe.getAttribute("srcdoc");
			if (!srcdoc?.trim()) return;
			const wrap = iframe.parentElement;
			out.push(wrap?.outerHTML || iframe.outerHTML);
		});
		return out;
	} catch {
		return [];
	}
}

export function infographicEmbedsToStandaloneDoc(embeds, title = "Infographics") {
	if (!embeds?.length) return "";
	const body = embeds.join("\n\n");
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${String(title).replace(/</g, "")}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #F7F5F0; }
  .ink-infographic-slot, [data-ink-infographic-wrap] { margin: 24px auto; max-width: 560px; }
  iframe[data-ink-infographic="1"] { width: 100%; min-height: 440px; border: 0; border-radius: 12px; display: block; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}
