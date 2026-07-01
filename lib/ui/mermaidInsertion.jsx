"use client";

/** Drag payload for chat → draft (optional). */
export const INK_MERMAID_DRAG_MIME = "application/x-ink-mermaid-v1";

export function mermaidDragPayloadString(payload) {
	return JSON.stringify({ v: 1, ...payload });
}

export function buildMermaidDomWidget(code, caption = "") {
	const wrap = document.createElement("div");
	wrap.setAttribute("data-ink-mermaid-wrap", "");
	wrap.className = "ink-mermaid-slot";
	if (caption) wrap.setAttribute("data-caption", String(caption).slice(0, 500));
	const pre = document.createElement("pre");
	pre.className = "mermaid";
	pre.setAttribute("data-ink-mermaid", "1");
	pre.textContent = code;
	wrap.appendChild(pre);
	return wrap;
}

export function mermaidMarkdownFence(code) {
	const body = String(code || "").replace(/\n?$/, "\n");
	return `\`\`\`mermaid\n${body}\`\`\`\n`;
}

export function insertMermaidAfterCollapsedRange(
	editorDom,
	range,
	code,
	caption,
	atEnd = true,
) {
	if (!(editorDom instanceof HTMLElement) || !range || typeof window === "undefined")
		return false;
	editorDom.focus();
	const sel = window.getSelection();
	if (!sel) return false;
	try {
		const r = range.cloneRange();
		if (atEnd) r.collapse(false);
		else r.collapse(true);
		const wrap = buildMermaidDomWidget(code, caption);
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

export function appendMermaidToEditor(editorDom, code, caption = "") {
	if (!(editorDom instanceof HTMLElement)) return false;
	editorDom.focus();
	try {
		const wrap = buildMermaidDomWidget(code, caption);
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

export function tryInsertMermaidFromDragData(editorDom, dataTransfer) {
	if (!dataTransfer || !(editorDom instanceof HTMLElement)) return false;
	const raw =
		dataTransfer.getData(INK_MERMAID_DRAG_MIME) ||
		dataTransfer.getData("application/json");
	if (!raw) return false;
	let payload = null;
	try {
		const p = JSON.parse(raw);
		if (p?.v === 1 && typeof p.code === "string") payload = p;
	} catch {
		return false;
	}
	if (!payload?.code) return false;
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
	return insertMermaidAfterCollapsedRange(
		editorDom,
		range,
		payload.code,
		payload.title || "",
		false,
	);
}
