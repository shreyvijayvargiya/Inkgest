/**
 * Capture Mermaid source before `mermaid.run()` mutates the DOM, then replace
 * Mermaid's default error SVG ("Syntax error in text", version footer) with a
 * readable in-page fallback for public posts.
 */

const SLOT_SELECTOR = "[data-ink-mermaid-wrap], .ink-mermaid-slot";
const ROOT_SELECTOR = ".ink-prose, .ink-themed-post-root";
const PRE_MERMAID_SELECTOR =
	".ink-prose pre.mermaid, .ink-themed-post-root pre.mermaid";

/** Raw source keyed by slot/pre — survives races better than data-* attrs alone. */
const inkMermaidSourceByEl =
	typeof WeakMap !== "undefined" ? new WeakMap() : null;

function isInsidePublicProse(el) {
	return Boolean(el.closest(ROOT_SELECTOR));
}

/** Only stash when `pre` still holds markup source (not SVG/CSS from Mermaid). */
function looksLikeUnrenderedMermaidPre(pre) {
	if (!pre?.querySelector) return false;
	if (pre.querySelector("svg")) return false;
	return true;
}

function rememberInkMermaidSource(el, raw) {
	if (!inkMermaidSourceByEl || !el) return;
	const s = String(raw ?? "").trim();
	if (!s) return;
	inkMermaidSourceByEl.set(el, s);
}

function readInkMermaidStoredSource(el) {
	if (!el) return "";
	if (inkMermaidSourceByEl) {
		const w = inkMermaidSourceByEl.get(el);
		if (typeof w === "string" && w.trim()) return w.trim();
	}
	const ds = el.dataset?.inkMermaidSource;
	return typeof ds === "string" && ds.trim() ? ds.trim() : "";
}

function buildMermaidErrorFallback(rawSource) {
	const wrap = document.createElement("div");
	wrap.className = "ink-mermaid-error-fallback";
	wrap.setAttribute("role", "note");
	wrap.style.boxSizing = "border-box";
	wrap.style.border = "1px solid #F6D9A8";
	wrap.style.borderRadius = "12px";
	wrap.style.padding = "14px 16px";
	wrap.style.background = "#FFFBEB";
	wrap.style.textAlign = "left";
	wrap.style.margin = "16px auto";
	wrap.style.maxWidth = "560px";

	const title = document.createElement("p");
	title.style.margin = "0 0 6px";
	title.style.fontWeight = "700";
	title.style.color = "#92400E";
	title.style.fontSize = "15px";
	title.style.fontFamily = "inherit";
	title.textContent = "Diagram couldn't be displayed";

	const sub = document.createElement("p");
	sub.style.margin = "0 0 12px";
	sub.style.fontSize = "13px";
	sub.style.color = "#78716C";
	sub.style.lineHeight = "1.55";
	sub.style.fontFamily = "inherit";
	sub.textContent =
		"This diagram uses invalid or unsupported Mermaid syntax. The original source is shown below.";

	const pre = document.createElement("pre");
	pre.style.margin = "0";
	pre.style.padding = "12px 14px";
	pre.style.background = "#FAFAF9";
	pre.style.border = "1px solid #E8E4DC";
	pre.style.borderRadius = "10px";
	pre.style.fontSize = "12px";
	pre.style.lineHeight = "1.45";
	pre.style.overflow = "auto";
	pre.style.maxHeight = "280px";
	pre.style.fontFamily =
		"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
	pre.style.color = "#292524";
	pre.style.whiteSpace = "pre-wrap";
	pre.style.wordBreak = "break-word";
	pre.textContent = String(rawSource || "").trim() || "(Source unavailable.)";

	wrap.append(title, sub, pre);
	return wrap;
}

/** Persist diagram text on the wrapper (and bare `pre`) before Mermaid runs. */
export function stashInkMermaidSources(scopeEl = document.body) {
	if (typeof document === "undefined" || !scopeEl?.querySelectorAll) return;

	scopeEl.querySelectorAll(SLOT_SELECTOR).forEach((slot) => {
		if (!isInsidePublicProse(slot)) return;
		const pre = slot.querySelector("pre.mermaid");
		if (!pre || !looksLikeUnrenderedMermaidPre(pre)) return;
		const raw = (pre.textContent || "").trim();
		if (!raw) return;
		rememberInkMermaidSource(slot, raw);
		rememberInkMermaidSource(pre, raw);
		if (slot.dataset.inkMermaidSource == null)
			slot.dataset.inkMermaidSource = raw;
		if (pre.dataset.inkMermaidSource == null)
			pre.dataset.inkMermaidSource = raw;
	});

	scopeEl.querySelectorAll(PRE_MERMAID_SELECTOR).forEach((pre) => {
		if (!isInsidePublicProse(pre)) return;
		if (!looksLikeUnrenderedMermaidPre(pre)) return;
		const raw = (pre.textContent || "").trim();
		if (!raw) return;
		rememberInkMermaidSource(pre, raw);
		const slot = pre.closest(SLOT_SELECTOR);
		if (slot) rememberInkMermaidSource(slot, raw);
		if (pre.dataset.inkMermaidSource == null)
			pre.dataset.inkMermaidSource = raw;
	});
}

/**
 * Mermaid v11 error UI uses copy like "Syntax error in text" and a footer
 * "mermaid version 11.x". Earlier regex required `mermaid` + whitespace + digit,
 * which failed on the word "version" between them.
 */
function textSignalsMermaidParseError(combinedText) {
	const t = String(combinedText || "");
	if (/syntax error\s+in\s+text/i.test(t)) return true;
	if (/syntax error/i.test(t) && /mermaid\s+version/i.test(t)) return true;
	return false;
}

/** Pull visible-ish copy from diagram/error SVG (text nodes, foreignObject, etc.). */
function gatherDiagramSurfaceText(el) {
	if (!el) return "";
	const chunks = [];
	try {
		chunks.push(el.textContent || "");
	} catch {
		/* ignore */
	}
	try {
		chunks.push(el.innerText || "");
	} catch {
		/* ignore */
	}
	try {
		el.querySelectorAll(
			"svg title, svg text, svg tspan, svg foreignObject",
		).forEach((n) => {
			chunks.push(n.textContent || "");
		});
	} catch {
		/* ignore */
	}
	return chunks.join("\n");
}

/** Includes flattened SVG / foreignObject text (error title often isn't plain body text). */
function elementShowsMermaidSyntaxError(el) {
	if (!el) return false;
	const blob = gatherDiagramSurfaceText(el);
	return textSignalsMermaidParseError(blob);
}

export function replaceInkMermaidRenderErrors(scopeEl = document.body) {
	if (typeof document === "undefined" || !scopeEl?.querySelectorAll) return;

	scopeEl.querySelectorAll(SLOT_SELECTOR).forEach((slot) => {
		if (!isInsidePublicProse(slot)) return;
		if (!elementShowsMermaidSyntaxError(slot)) return;

		const raw = readInkMermaidStoredSource(slot);
		slot.replaceChildren();
		slot.appendChild(buildMermaidErrorFallback(raw));
	});

	scopeEl.querySelectorAll(PRE_MERMAID_SELECTOR).forEach((pre) => {
		if (!isInsidePublicProse(pre)) return;
		if (!elementShowsMermaidSyntaxError(pre)) return;

		const raw =
			readInkMermaidStoredSource(pre) ||
			readInkMermaidStoredSource(pre.closest(SLOT_SELECTOR));
		pre.replaceWith(buildMermaidErrorFallback(raw));
	});

	/**
	 * After render, `pre` may lose `.mermaid` but keep `data-ink-mermaid-source`
	 * from stash — still needs replacing when it contains Mermaid's error SVG.
	 */
	scopeEl
		.querySelectorAll(
			".ink-prose pre[data-ink-mermaid-source], .ink-themed-post-root pre[data-ink-mermaid-source]",
		)
		.forEach((pre) => {
			if (!isInsidePublicProse(pre)) return;
			if (pre.classList.contains("mermaid")) return;
			if (!elementShowsMermaidSyntaxError(pre)) return;

			const raw =
				readInkMermaidStoredSource(pre) ||
				readInkMermaidStoredSource(pre.closest(SLOT_SELECTOR));
			pre.replaceWith(buildMermaidErrorFallback(raw));
		});
}
