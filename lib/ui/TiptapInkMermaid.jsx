"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { X } from "lucide-react";
import { INK_MERMAID_RENDER_CONFIG } from "../mermaid/renderMermaidInHtmlDoc";

function InkMermaidView({ node, updateAttributes, editor, getPos, selected }) {
	const code = node.attrs.code || "";
	const caption = node.attrs.caption || "";
	const svgHostRef = useRef(null);
	const [err, setErr] = useState("");
	const baseId = useRef(`inkm_${Math.random().toString(36).slice(2)}`);
	const renderSeq = useRef(0);

	useEffect(() => {
		let cancelled = false;
		setErr("");
		if (!code.trim()) {
			if (svgHostRef.current) svgHostRef.current.innerHTML = "";
			return undefined;
		}
		const rid = `${baseId.current}_${++renderSeq.current}`;
		(async () => {
			try {
				const mermaid = (await import("mermaid")).default;
				mermaid.initialize(INK_MERMAID_RENDER_CONFIG);
				const { svg } = await mermaid.render(rid, code);
				if (!cancelled && svgHostRef.current) svgHostRef.current.innerHTML = svg;
			} catch (e) {
				if (!cancelled && svgHostRef.current) {
					svgHostRef.current.innerHTML = "";
					setErr(String(e?.message || "Diagram error"));
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [code]);

	const deleteNode = useCallback(() => {
		if (typeof getPos !== "function") return;
		const pos = getPos();
		if (pos != null)
			editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
	}, [editor, getPos, node.nodeSize]);

	const selectNode = useCallback(
		(e) => {
			if (e.target.closest("button, textarea, summary, details")) return;
			e.preventDefault();
			if (typeof getPos === "function") {
				const pos = getPos();
				if (pos != null) editor.commands.setNodeSelection(pos);
			}
		},
		[editor, getPos],
	);

	const chipStyle =
		"text-[10px] font-semibold uppercase tracking-wide text-zinc-500";

	return (
		<NodeViewWrapper
			className="my-6 ink-mermaid-node-view group"
			data-node-type="inkMermaidBlock"
			contentEditable={false}
		>
			<div
				className="relative rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm"
				onClick={selectNode}
				onMouseDown={(e) => {
					if (
						!e.target.closest(
							"button, textarea, summary, details, a",
						)
					) {
						e.preventDefault();
					}
				}}
			>
				<button
					type="button"
					onClick={deleteNode}
					onMouseDown={(e) => e.preventDefault()}
					title="Remove diagram"
					className={`absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/95 border border-zinc-200 shadow-sm text-zinc-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-opacity ${
						selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
					}`}
				>
					<X className="w-3.5 h-3.5" />
					<span className="sr-only">Remove diagram</span>
				</button>
				<div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border-b border-zinc-200">
					<span className={chipStyle}>Mermaid</span>
				</div>
				{caption ? (
					<p className="text-xs text-zinc-600 px-3 pt-2 pb-1">{caption}</p>
				) : null}
				<div className="px-3 pb-3 pt-2 overflow-x-auto flex justify-center">
					<div ref={svgHostRef} className="max-w-full [&_svg]:max-w-full" />
				</div>
				{err ? (
					<div className="px-3 pb-3">
						<p className="text-xs text-red-600 font-mono whitespace-pre-wrap">
							{err}
						</p>
						<textarea
							value={code}
							onChange={(e) =>
								updateAttributes({ code: e.target.value })
							}
							className="mt-2 w-full min-h-[100px] text-xs font-mono border border-zinc-200 rounded-lg p-2"
							onMouseDown={(e) => e.stopPropagation()}
						/>
					</div>
				) : (
					<details className="border-t border-zinc-100 bg-zinc-50/80">
						<summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-medium text-zinc-600">
							Source
						</summary>
						<div className="px-3 pb-3">
							<textarea
								value={code}
								onChange={(e) =>
									updateAttributes({ code: e.target.value })
								}
								className="w-full min-h-[90px] text-xs font-mono border border-zinc-200 rounded-lg p-2 bg-white"
								onMouseDown={(e) => e.stopPropagation()}
							/>
						</div>
					</details>
				)}
			</div>
		</NodeViewWrapper>
	);
}

export const InkMermaidBlock = Node.create({
	name: "inkMermaidBlock",

	group: "block",

	atom: true,

	draggable: true,

	addAttributes() {
		return {
			code: { default: "" },
			caption: { default: "" },
		};
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-ink-mermaid-wrap]',
				getAttrs(dom) {
					if (typeof dom === "string") return false;
					const el = /** @type {HTMLElement} */ (dom);
					const pre = el.querySelector("pre.mermaid");
					const raw = pre?.textContent ?? "";
					return {
						code: raw,
						caption: el.getAttribute("data-caption") || "",
					};
				},
			},
		];
	},

	renderHTML({ node }) {
		const code = node.attrs.code || "";
		const caption = node.attrs.caption || "";
		const wrapAttrs = mergeAttributes({
			"data-ink-mermaid-wrap": "",
			class: "ink-mermaid-slot",
			...(caption
				? { "data-caption": String(caption).slice(0, 500) }
				: {}),
		});
		return [
			"div",
			wrapAttrs,
			[
				"pre",
				mergeAttributes({
					class: "mermaid",
					"data-ink-mermaid": "1",
				}),
				code,
			],
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(InkMermaidView);
	},

	addCommands() {
		return {
			insertInkMermaidBlock:
				(attrs) =>
				({ commands }) =>
					commands.insertContent({
						type: this.name,
						attrs:
							typeof attrs === "object" && attrs
								? attrs
								: { code: "", caption: "" },
					}),
		};
	},
});
