"use client";

import { renderInfographicCardInnerHtml } from "./infographicDomRender";
import { buildStandaloneIframeSrcDoc } from "../utils/standaloneInfographicDoc";

export const INK_INFOGRAPHIC_DRAG_MIME = "application/x-ink-infographic-v1";

export function infographicSpecToSrcDoc(spec) {
	const inner = renderInfographicCardInnerHtml(spec);
	return buildStandaloneIframeSrcDoc(
		inner,
		String(spec?.title || spec?.type || "Infographic").replace(/</g, ""),
	);
}

/** DOM wrapper with iframe — mirrors TipTap/export shape. */
export function buildInfographicDomWidget(spec) {
	const srcDoc = infographicSpecToSrcDoc(spec);
	const iframe = document.createElement("iframe");
	iframe.setAttribute("data-ink-infographic", "1");
	iframe.title = String(spec?.title || spec?.type || "Infographic");
	iframe.style.cssText =
		"width:-webkit-fill-available;min-height:440px;border:0;border-radius:12px;display:block;margin:18px auto;max-width:560px;";
	iframe.sandbox =
		"allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox";
	iframe.loading = "lazy";
	iframe.referrerPolicy = "no-referrer";
	iframe.srcdoc = srcDoc;
	const wrap = document.createElement("div");
	wrap.setAttribute("data-ink-infographic-wrap", "");
	wrap.className = "ink-infographic-slot";
	wrap.appendChild(iframe);
	return wrap;
}

export function infographicDragPayloadString(spec) {
	return JSON.stringify({ v: 1, spec });
}

export function insertInfographicAfterCollapsedRange(editorDom, range, spec, atEnd = true) {
	if (!(editorDom instanceof HTMLElement) || !range || typeof window === "undefined")
		return false;
	editorDom.focus();
	const sel = window.getSelection();
	if (!sel) return false;
	try {
		const r = range.cloneRange();
		if (atEnd) r.collapse(false);
		else r.collapse(true);
		const wrap = buildInfographicDomWidget(spec);
		r.insertNode(wrap);
		const spacer = document.createElement("p");
		spacer.appendChild(document.createElement("br"));
		wrap.after(spacer);
		const nr = document.createRange();
		nr.setStart(spacer, 0);
		nr.collapse(true);
		sel.removeAllRanges();
		sel.addRange(nr);
		editorDom.dispatchEvent(new Event("input", { bubbles: true }));
		return true;
	} catch {
		return false;
	}
}

export function tryInsertInfographicFromDragData(editorDom, dataTransfer) {
	if (!dataTransfer || !(editorDom instanceof HTMLElement)) return false;
	const raw =
		dataTransfer.getData(INK_INFOGRAPHIC_DRAG_MIME) ||
		dataTransfer.getData("application/json");
	if (!raw) return false;
	let spec = null;
	try {
		const p = JSON.parse(raw);
		if (p?.v === 1 && p.spec && typeof p.spec === "object") spec = p.spec;
		else if (p?.kind === "ink-infographic-spec" && p.spec) spec = p.spec;
	} catch {
		return false;
	}
	if (!spec) return false;
	const sel = window.getSelection();
	let range =
		sel?.rangeCount > 0 && editorDom.contains(sel.getRangeAt(0).commonAncestorContainer)
			? sel.getRangeAt(0)
			: null;
	if (!range) {
		const r = document.createRange();
		r.selectNodeContents(editorDom);
		r.collapse(false);
		range = r;
		sel?.removeAllRanges();
		sel?.addRange(r);
	}
	return insertInfographicAfterCollapsedRange(editorDom, range, spec, false);
}

/** Serialized markup matching the draft editor / export embed (wrapper + iframe). */
export function infographicEmbedOuterHtml(spec) {
	if (typeof document === "undefined") return "";
	try {
		const wrap = buildInfographicDomWidget(spec);
		const html = wrap.outerHTML;
		return html;
	} catch {
		return "";
	}
}

export function appendInfographicToEditor(editorDom, spec) {
	if (!(editorDom instanceof HTMLElement)) return false;
	editorDom.focus();
	try {
		const wrap = buildInfographicDomWidget(spec);
		editorDom.appendChild(wrap);
		const spacer = document.createElement("p");
		spacer.appendChild(document.createElement("br"));
		editorDom.appendChild(spacer);
		editorDom.dispatchEvent(new Event("input", { bubbles: true }));
		editorDom.scrollTop = editorDom.scrollHeight;
		return true;
	} catch {
		return false;
	}
}
