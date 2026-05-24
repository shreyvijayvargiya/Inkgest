"use client";

import { useCallback } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { X } from "lucide-react";
import { createInkInfographicClipboardPlugin } from "./TiptapInkInfographicClipboard";

function InkInfographicView({ node, editor, getPos, selected }) {
	const srcDoc = node.attrs.srcDoc || "";
	const caption = node.attrs.caption || "Infographic";

	const deleteNode = useCallback(() => {
		if (typeof getPos !== "function") return;
		const pos = getPos();
		if (pos != null)
			editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
	}, [editor, getPos, node.nodeSize]);

	const selectNode = useCallback(
		(e) => {
			if (e.target.closest("button")) return;
			e.preventDefault();
			if (typeof getPos === "function") {
				const pos = getPos();
				if (pos != null) editor.commands.setNodeSelection(pos);
			}
		},
		[editor, getPos],
	);

	return (
		<NodeViewWrapper
			className="my-[18px] ink-infographic-node-view group"
			data-node-type="inkInfographicIframe"
			contentEditable={false}
		>
			<div
				className="relative mx-auto max-w-[560px] w-full"
				onClick={selectNode}
				onMouseDown={(e) => {
					if (!e.target.closest("button")) e.preventDefault();
				}}
			>
				<iframe
					title={caption}
					data-ink-infographic="1"
					sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
					loading="lazy"
					referrerPolicy="no-referrer"
					srcDoc={srcDoc}
					className="w-full min-h-[440px] border-0 rounded-xl block pointer-events-none"
				/>
				<button
					type="button"
					onClick={deleteNode}
					onMouseDown={(e) => e.preventDefault()}
					title="Remove infographic"
					className={`absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/95 border border-zinc-200 shadow-sm text-zinc-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-opacity ${
						selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
					}`}
				>
					<X className="w-3.5 h-3.5" />
					<span className="sr-only">Remove infographic</span>
				</button>
			</div>
		</NodeViewWrapper>
	);
}

export const InkInfographicIframe = Node.create({
	name: "inkInfographicIframe",

	group: "block",

	atom: true,

	draggable: true,

	addOptions() {
		return {
			HTMLAttributes: {},
		};
	},

	addAttributes() {
		return {
			srcDoc: {
				default: "",
			},
			caption: {
				default: "Infographic",
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'iframe[data-ink-infographic="1"]',
				getAttrs(dom) {
					if (typeof dom === "string") return false;
					const el = /** @type {HTMLIFrameElement} */ (dom);
					return {
						srcDoc: el.getAttribute("srcdoc") || "",
						caption: el.getAttribute("title") || "Infographic",
					};
				},
			},
			{
				tag: "div[data-ink-infographic-wrap]",
				priority: 55,
				getAttrs(dom) {
					if (typeof dom === "string") return false;
					const el = /** @type {HTMLElement} */ (dom);
					const iframe =
						el.querySelector('iframe[data-ink-infographic="1"]');
					if (!(iframe instanceof HTMLIFrameElement))
						return {
							srcDoc: "",
							caption: "Infographic",
						};
					return {
						srcDoc: iframe.getAttribute("srcdoc") || "",
						caption: iframe.getAttribute("title") || "Infographic",
					};
				},
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		const caption =
			(typeof HTMLAttributes.caption === "string" &&
				HTMLAttributes.caption.trim()) ||
			"Infographic";
		const srcDoc =
			(typeof HTMLAttributes.srcDoc === "string" &&
				HTMLAttributes.srcDoc) ||
			"";
		return [
			"div",
			mergeAttributes({ "data-ink-infographic-wrap": "" }),
			[
				"iframe",
				mergeAttributes(this.options.HTMLAttributes || {}, {
					"data-ink-infographic": "1",
					title: caption,
					sandbox:
						"allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox",
					loading: "lazy",
					referrerpolicy: "no-referrer",
					style:
						"width:100%;min-height:440px;border:0;border-radius:12px;display:block;margin:18px auto;max-width:560px;",
					srcdoc: srcDoc,
				}),
			],
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(InkInfographicView);
	},

	addCommands() {
		return {
			insertInkInfographicIframe:
				(attrs) =>
				({ commands }) =>
					commands.insertContent({
						type: this.name,
						attrs:
							typeof attrs === "object" && attrs
								? attrs
								: { srcDoc: "", caption: "Infographic" },
					}),
		};
	},

	addProseMirrorPlugins() {
		return [createInkInfographicClipboardPlugin()];
	},
});
