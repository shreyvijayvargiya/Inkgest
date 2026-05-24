import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Fragment, Slice } from "@tiptap/pm/model";
import {
	INK_INFOGRAPHIC_DRAG_MIME,
	infographicSpecToSrcDoc,
} from "./infographicInsertion";

export const inkInfographicClipboardKey = new PluginKey("inkInfographicClipboard");

const CLIPBOARD_NODES_V = 2;

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

/** @returns {{ srcDoc: string, caption: string }[] | null} */
export function parseInfographicClipboardPayload(raw) {
	if (!raw || typeof raw !== "string") return null;
	try {
		const p = JSON.parse(raw);
		if (p?.v === CLIPBOARD_NODES_V && Array.isArray(p.nodes)) {
			return p.nodes
				.filter((n) => n && typeof n === "object")
				.map((n) => ({
					srcDoc: String(n.srcDoc ?? ""),
					caption: String(n.caption ?? "Infographic"),
				}));
		}
		if (p?.v === 1 && p.spec && typeof p.spec === "object") {
			return [
				{
					srcDoc: infographicSpecToSrcDoc(p.spec),
					caption: String(p.spec.title || p.spec.type || "Infographic"),
				},
			];
		}
		if (p?.kind === "ink-infographic-spec" && p.spec) {
			return [
				{
					srcDoc: infographicSpecToSrcDoc(p.spec),
					caption: String(p.spec.title || p.spec.type || "Infographic"),
				},
			];
		}
	} catch {
		return null;
	}
	return null;
}

export function serializeInfographicClipboardPayload(nodes) {
	return JSON.stringify({ v: CLIPBOARD_NODES_V, nodes });
}

function getSelectedInfographicNodes(state) {
	const { selection } = state;
	const out = [];
	if (selection.node?.type?.name === "inkInfographicIframe") {
		out.push(selection.node);
		return out;
	}
	state.doc.nodesBetween(selection.from, selection.to, (node) => {
		if (node.type.name === "inkInfographicIframe") out.push(node);
	});
	return out;
}

function deleteSelectedInfographicNodes(tr, state) {
	const { selection } = state;
	const toDelete = [];
	if (selection.node?.type?.name === "inkInfographicIframe") {
		toDelete.push({ from: selection.from, to: selection.from + selection.node.nodeSize });
	} else {
		state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
			if (node.type.name === "inkInfographicIframe") {
				toDelete.push({ from: pos, to: pos + node.nodeSize });
			}
		});
	}
	toDelete.sort((a, b) => b.from - a.from);
	for (const { from, to } of toDelete) tr.delete(from, to);
	return tr;
}

function insertInfographicNodesAtSelection(view, nodes) {
	const type = view.state.schema.nodes.inkInfographicIframe;
	if (!type) return false;
	const pmNodes = nodes.map((attrs) => type.create(attrs));
	const { selection } = view.state;
	let tr = view.state.tr;
	if (selection.node?.type?.name === "inkInfographicIframe") {
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

export function createInkInfographicClipboardPlugin() {
	return new Plugin({
		key: inkInfographicClipboardKey,
		props: {
			handleDOMEvents: {
				copy(view, event) {
					const nodes = getSelectedInfographicNodes(view.state);
					if (!nodes.length || !event.clipboardData) return false;
					const payload = nodes.map((n) => ({
						srcDoc: n.attrs.srcDoc || "",
						caption: n.attrs.caption || "Infographic",
					}));
					const json = serializeInfographicClipboardPayload(payload);
					event.clipboardData.setData(INK_INFOGRAPHIC_DRAG_MIME, json);
					event.clipboardData.setData(
						"application/json",
						json,
					);
					event.clipboardData.setData(
						"text/html",
						payload.map(infographicAttrsToEmbedHtml).join(""),
					);
					event.clipboardData.setData("text/plain", "[Ink infographic]");
					event.preventDefault();
					return true;
				},
				cut(view, event) {
					const nodes = getSelectedInfographicNodes(view.state);
					if (!nodes.length || !event.clipboardData) return false;
					const payload = nodes.map((n) => ({
						srcDoc: n.attrs.srcDoc || "",
						caption: n.attrs.caption || "Infographic",
					}));
					const json = serializeInfographicClipboardPayload(payload);
					event.clipboardData.setData(INK_INFOGRAPHIC_DRAG_MIME, json);
					event.clipboardData.setData("application/json", json);
					event.clipboardData.setData(
						"text/html",
						payload.map(infographicAttrsToEmbedHtml).join(""),
					);
					event.clipboardData.setData("text/plain", "[Ink infographic]");
					event.preventDefault();
					let tr = view.state.tr;
					tr = deleteSelectedInfographicNodes(tr, view.state);
					view.dispatch(tr.scrollIntoView());
					return true;
				},
			},
			handlePaste(view, event) {
				const dt = event.clipboardData;
				if (!dt) return false;
				const raw =
					dt.getData(INK_INFOGRAPHIC_DRAG_MIME) ||
					dt.getData("application/json");
				let nodes = parseInfographicClipboardPayload(raw);
				if (!nodes?.length) {
					const html = dt.getData("text/html");
					if (html && html.includes("data-ink-infographic")) {
						const doc = new DOMParser().parseFromString(html, "text/html");
						const iframes = doc.querySelectorAll(
							'iframe[data-ink-infographic="1"]',
						);
						nodes = Array.from(iframes).map((iframe) => ({
							srcDoc: iframe.getAttribute("srcdoc") || "",
							caption: iframe.getAttribute("title") || "Infographic",
						}));
						nodes = nodes.filter((n) => n.srcDoc.length > 0);
					}
				}
				if (!nodes?.length) return false;
				event.preventDefault();
				return insertInfographicNodesAtSelection(view, nodes);
			},
		},
	});
}
