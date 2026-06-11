import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Fragment, Slice } from "@tiptap/pm/model";
import {
	INK_INFOGRAPHIC_DRAG_MIME,
	infographicSpecToSrcDoc,
} from "./infographicInsertion";
import { INK_MERMAID_DRAG_MIME } from "./mermaidInsertion";

export const inkEmbedClipboardKey = new PluginKey("inkEmbedClipboard");

const CLIPBOARD_NODES_V = 3;
const EMBED_TYPES = new Set(["inkInfographicIframe", "inkMermaidBlock"]);

function escapeHtml(s) {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function infographicAttrsToEmbedHtml(attrs) {
	const caption = escapeHtml(attrs.caption || "Infographic");
	const srcDoc = escapeHtml(attrs.srcDoc || "");
	return `<div data-ink-infographic-wrap=""><iframe data-ink-infographic="1" title="${caption}" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" loading="lazy" referrerpolicy="no-referrer" style="width:-webkit-fill-available;min-height:240px;border:0;border-radius:12px;display:block;margin:auto;max-width:560px;" srcdoc="${srcDoc}"></iframe></div>`;
}

function mermaidAttrsToEmbedHtml(attrs) {
	const code = escapeHtml(attrs.code || "");
	const caption = attrs.caption
		? ` data-caption="${escapeHtml(attrs.caption)}"`
		: "";
	return `<div data-ink-mermaid-wrap="" class="ink-mermaid-slot"${caption}><pre class="mermaid" data-ink-mermaid="1">${code}</pre></div>`;
}

function embedNodeToPayload(node) {
	if (node.type.name === "inkInfographicIframe") {
		return {
			type: "inkInfographicIframe",
			attrs: {
				srcDoc: node.attrs.srcDoc || "",
				caption: node.attrs.caption || "Infographic",
			},
		};
	}
	if (node.type.name === "inkMermaidBlock") {
		return {
			type: "inkMermaidBlock",
			attrs: {
				code: node.attrs.code || "",
				caption: node.attrs.caption || "",
			},
		};
	}
	return null;
}

function payloadToHtml(payload) {
	if (payload.type === "inkInfographicIframe") {
		return infographicAttrsToEmbedHtml(payload.attrs);
	}
	if (payload.type === "inkMermaidBlock") {
		return mermaidAttrsToEmbedHtml(payload.attrs);
	}
	return "";
}

/** @returns {{ type: string, attrs: Record<string, string> }[] | null} */
export function parseEmbedClipboardPayload(raw) {
	if (!raw || typeof raw !== "string") return null;
	try {
		const p = JSON.parse(raw);
		if (p?.v === CLIPBOARD_NODES_V && Array.isArray(p.nodes)) {
			return p.nodes
				.filter((n) => n && typeof n === "object" && EMBED_TYPES.has(n.type))
				.map((n) => ({
					type: n.type,
					attrs: { ...(n.attrs || {}) },
				}));
		}
		if (p?.v === 2 && Array.isArray(p.nodes)) {
			return p.nodes.map((n) => ({
				type: "inkInfographicIframe",
				attrs: {
					srcDoc: String(n.srcDoc ?? ""),
					caption: String(n.caption ?? "Infographic"),
				},
			}));
		}
		if (p?.v === 1 && typeof p.code === "string") {
			return [
				{
					type: "inkMermaidBlock",
					attrs: {
						code: p.code,
						caption: String(p.title || ""),
					},
				},
			];
		}
		if (p?.v === 1 && p.spec && typeof p.spec === "object") {
			return [
				{
					type: "inkInfographicIframe",
					attrs: {
						srcDoc: infographicSpecToSrcDoc(p.spec),
						caption: String(p.spec.title || p.spec.type || "Infographic"),
					},
				},
			];
		}
		if (p?.kind === "ink-infographic-spec" && p.spec) {
			return [
				{
					type: "inkInfographicIframe",
					attrs: {
						srcDoc: infographicSpecToSrcDoc(p.spec),
						caption: String(p.spec.title || p.spec.type || "Infographic"),
					},
				},
			];
		}
	} catch {
		return null;
	}
	return null;
}

export function serializeEmbedClipboardPayload(nodes) {
	return JSON.stringify({ v: CLIPBOARD_NODES_V, nodes });
}

function getSelectedEmbedNodes(state) {
	const { selection } = state;
	const out = [];
	if (selection.node && EMBED_TYPES.has(selection.node.type.name)) {
		out.push(selection.node);
		return out;
	}
	state.doc.nodesBetween(selection.from, selection.to, (node) => {
		if (EMBED_TYPES.has(node.type.name)) out.push(node);
	});
	return out;
}

function deleteSelectedEmbedNodes(tr, state) {
	const { selection } = state;
	const toDelete = [];
	if (selection.node && EMBED_TYPES.has(selection.node.type.name)) {
		toDelete.push({
			from: selection.from,
			to: selection.from + selection.node.nodeSize,
		});
	} else {
		state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
			if (EMBED_TYPES.has(node.type.name)) {
				toDelete.push({ from: pos, to: pos + node.nodeSize });
			}
		});
	}
	toDelete.sort((a, b) => b.from - a.from);
	for (const { from, to } of toDelete) tr.delete(from, to);
	return tr;
}

function parseEmbedNodesFromHtml(html) {
	if (!html) return [];
	const doc = new DOMParser().parseFromString(html, "text/html");
	const out = [];

	doc.querySelectorAll('iframe[data-ink-infographic="1"]').forEach((iframe) => {
		out.push({
			type: "inkInfographicIframe",
			attrs: {
				srcDoc: iframe.getAttribute("srcdoc") || "",
				caption: iframe.getAttribute("title") || "Infographic",
			},
		});
	});

	doc.querySelectorAll("div[data-ink-mermaid-wrap]").forEach((wrap) => {
		const pre = wrap.querySelector("pre.mermaid");
		if (!pre) return;
		out.push({
			type: "inkMermaidBlock",
			attrs: {
				code: pre.textContent || "",
				caption: wrap.getAttribute("data-caption") || "",
			},
		});
	});

	return out.filter((n) => {
		if (n.type === "inkInfographicIframe") return n.attrs.srcDoc.length > 0;
		if (n.type === "inkMermaidBlock") return n.attrs.code.trim().length > 0;
		return false;
	});
}

function insertEmbedNodesAtSelection(view, nodes) {
	const pmNodes = [];
	for (const payload of nodes) {
		const type = view.state.schema.nodes[payload.type];
		if (!type) continue;
		pmNodes.push(type.create(payload.attrs));
	}
	if (!pmNodes.length) return false;

	const { selection } = view.state;
	let tr = view.state.tr;
	if (selection.node && EMBED_TYPES.has(selection.node.type.name)) {
		tr = tr.replaceWith(
			selection.from,
			selection.from + selection.node.nodeSize,
			pmNodes,
		);
	} else {
		tr = tr.replaceSelection(new Slice(Fragment.from(pmNodes), 0, 0));
	}
	view.dispatch(tr.scrollIntoView());
	view.focus();
	return true;
}

function writeEmbedClipboard(event, nodes) {
	const payloads = nodes.map(embedNodeToPayload).filter(Boolean);
	if (!payloads.length) return false;
	const json = serializeEmbedClipboardPayload(payloads);
	event.clipboardData.setData("application/x-ink-embed-v1", json);
	event.clipboardData.setData(INK_INFOGRAPHIC_DRAG_MIME, json);
	event.clipboardData.setData(INK_MERMAID_DRAG_MIME, json);
	event.clipboardData.setData("application/json", json);
	event.clipboardData.setData(
		"text/html",
		payloads.map(payloadToHtml).join(""),
	);
	const label =
		payloads.length === 1
			? payloads[0].type === "inkMermaidBlock"
				? "[Ink mermaid diagram]"
				: "[Ink infographic]"
			: `[Ink embed ×${payloads.length}]`;
	event.clipboardData.setData("text/plain", label);
	return true;
}

export function createInkEmbedClipboardPlugin() {
	return new Plugin({
		key: inkEmbedClipboardKey,
		props: {
			handleDOMEvents: {
				copy(view, event) {
					const nodes = getSelectedEmbedNodes(view.state);
					if (!nodes.length || !event.clipboardData) return false;
					writeEmbedClipboard(event, nodes);
					event.preventDefault();
					return true;
				},
				cut(view, event) {
					const nodes = getSelectedEmbedNodes(view.state);
					if (!nodes.length || !event.clipboardData) return false;
					writeEmbedClipboard(event, nodes);
					event.preventDefault();
					let tr = view.state.tr;
					tr = deleteSelectedEmbedNodes(tr, view.state);
					view.dispatch(tr.scrollIntoView());
					return true;
				},
			},
			handlePaste(view, event) {
				const dt = event.clipboardData;
				if (!dt) return false;
				const raw =
					dt.getData("application/x-ink-embed-v1") ||
					dt.getData(INK_INFOGRAPHIC_DRAG_MIME) ||
					dt.getData(INK_MERMAID_DRAG_MIME) ||
					dt.getData("application/json");
				let nodes = parseEmbedClipboardPayload(raw);
				if (!nodes?.length) {
					const html = dt.getData("text/html");
					if (
						html &&
						(html.includes("data-ink-infographic") ||
							html.includes("data-ink-mermaid"))
					) {
						nodes = parseEmbedNodesFromHtml(html);
					}
				}
				if (!nodes?.length) return false;
				event.preventDefault();
				return insertEmbedNodesAtSelection(view, nodes);
			},
		},
	});
}

/** @deprecated use createInkEmbedClipboardPlugin */
export const createInkInfographicClipboardPlugin = createInkEmbedClipboardPlugin;
