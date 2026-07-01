"use client";

/** Shared Mermaid init — keep in sync with TiptapInkMermaid + draft editor hydrate. */
export const INK_MERMAID_RENDER_CONFIG = {
	startOnLoad: false,
	securityLevel: "strict",
	theme: "neutral",
	fontFamily: "inherit",
};

let mermaidReady = false;

async function getInkMermaid() {
	const mermaid = (await import("mermaid")).default;
	if (!mermaidReady) {
		mermaid.initialize(INK_MERMAID_RENDER_CONFIG);
		mermaidReady = true;
	}
	return mermaid;
}

function readMermaidSource(pre, wrap) {
	const fromPre = pre?.getAttribute?.("data-ink-mermaid-source")?.trim();
	if (fromPre) return fromPre;
	const fromWrap = wrap?.getAttribute?.("data-ink-mermaid-source")?.trim();
	if (fromWrap) return fromWrap;
	if (pre?.querySelector?.("svg")) return "";
	return (pre?.textContent || "").trim();
}

/**
 * Render `pre.mermaid` blocks inside a full HTML document string (preview srcDoc).
 * Uses the same bundled Mermaid + theme as the editor — no CDN iframe bootstrap.
 */
export async function renderMermaidInHtmlDoc(htmlDoc) {
	if (typeof document === "undefined" || !htmlDoc?.trim()) return htmlDoc;

	const parser = new DOMParser();
	const doc = parser.parseFromString(htmlDoc, "text/html");
	const pres = Array.from(
		doc.querySelectorAll(
			"pre.mermaid, pre[data-ink-mermaid], .ink-mermaid-slot pre",
		),
	);
	if (!pres.length) return htmlDoc;

	const mermaid = await getInkMermaid();
	let seq = 0;

	for (const pre of pres) {
		if (!(pre instanceof HTMLElement)) continue;
		const wrap = pre.closest("[data-ink-mermaid-wrap], .ink-mermaid-slot");
		const source = readMermaidSource(pre, wrap);
		if (!source) continue;

		try {
			const id = `ink_pv_${++seq}_${Math.random().toString(36).slice(2, 9)}`;
			const { svg } = await mermaid.render(id, source);
			pre.innerHTML = svg;
			pre.classList.add("mermaid", "ink-mermaid-rendered");
			pre.setAttribute("data-ink-mermaid-rendered", "1");
			if (wrap instanceof HTMLElement && !wrap.dataset.inkMermaidSource) {
				wrap.dataset.inkMermaidSource = source;
			}
		} catch (e) {
			console.warn("[ink mermaid preview render]", e);
		}
	}

	const serialized = doc.documentElement.outerHTML;
	return htmlDoc.trimStart().startsWith("<!DOCTYPE")
		? `<!DOCTYPE html>\n${serialized}`
		: serialized;
}

/**
 * Render Mermaid blocks inside a live DOM root (e.g. contenteditable editor).
 */
export async function renderMermaidInRoot(root) {
	if (!(root instanceof HTMLElement)) return;
	const pres = Array.from(root.querySelectorAll("pre.mermaid")).filter(
		(n) => n instanceof HTMLElement && !n.querySelector("svg"),
	);
	if (!pres.length) return;

	const mermaid = await getInkMermaid();
	let seq = 0;
	for (const pre of pres) {
		const wrap = pre.closest("[data-ink-mermaid-wrap], .ink-mermaid-slot");
		const raw = readMermaidSource(pre, wrap);
		if (!raw) continue;
		if (pre.dataset.inkMermaidSource == null) pre.dataset.inkMermaidSource = raw;
		if (wrap instanceof HTMLElement && wrap.dataset.inkMermaidSource == null) {
			wrap.dataset.inkMermaidSource = raw;
		}
		try {
			const id = `ink_ed_${++seq}_${Math.random().toString(36).slice(2, 9)}`;
			const { svg } = await mermaid.render(id, raw);
			pre.innerHTML = svg;
			pre.classList.add("ink-mermaid-rendered");
			pre.dataset.inkMermaidRendered = "1";
		} catch (e) {
			console.warn("[ink mermaid root render]", e);
		}
	}
}
