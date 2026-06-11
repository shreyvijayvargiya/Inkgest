"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	INK_MERMAID_DRAG_MIME,
	appendMermaidToEditor,
	insertMermaidAfterCollapsedRange,
	mermaidMarkdownFence,
	mermaidDragPayloadString,
} from "./mermaidInsertion";

const WARM = {
	border: "#EAD9BF",
	hdr: "#5e5e5e",
	sub: "#B08B5F",
	muted: "#5A5550",
	bg: "linear-gradient(180deg, #FFFDF8 0%, #FDF8F4 100%)",
	accent: "#C17B2F",
};

/**
 * Chat attachment card for AI-generated Mermaid blocks.
 *
 * @param {{ items?: Array<{ title?: string, code: string }>, editorRef?: React.RefObject }} props
 */
export default function ChatMermaidPanel({ items = [], editorRef }) {
	const [openIdx, setOpenIdx] = useState(null);

	useEffect(() => {
		if (openIdx == null) return;
		const close = (e) => {
			const el = e.target;
			if (!(el instanceof Element)) return;
			if (el.closest("[data-chat-mermaid-root]")) return;
			setOpenIdx(null);
		};
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, [openIdx]);

	const insertIntoDraft = useCallback(
		(row) => {
			const el = editorRef?.current;
			if (!el) {
				toast.error("Editor not connected.");
				return;
			}
			const sel = window.getSelection();
			let ok = false;
			if (
				sel?.rangeCount > 0 &&
				el.contains(sel.getRangeAt(0).commonAncestorContainer)
			) {
				ok = insertMermaidAfterCollapsedRange(
					el,
					sel.getRangeAt(0),
					row.code,
					row.title || "",
					false,
				);
			} else {
				ok = appendMermaidToEditor(el, row.code, row.title || "");
			}
			if (ok) toast.success("Inserted Mermaid block");
			else toast.error("Could not insert — click inside the editor first.");
			setOpenIdx(null);
		},
		[editorRef],
	);

	const copyFence = useCallback((row) => {
		const md = mermaidMarkdownFence(row.code);
		navigator.clipboard.writeText(md).then(
			() => toast.success("Markdown copied"),
			() => toast.error("Clipboard failed"),
		);
		setOpenIdx(null);
	}, []);

	const startDrag = useCallback((e, row) => {
		try {
			e.dataTransfer.setData(
				INK_MERMAID_DRAG_MIME,
				mermaidDragPayloadString({
					code: row.code,
					title: row.title || "",
				}),
			);
			e.dataTransfer.effectAllowed = "copy";
		} catch {
			/* ignore */
		}
	}, []);

	if (!items?.length) return null;

	const headline =
		items.length === 1
			? items[0].title || "Mermaid diagram"
			: `${items.length} Mermaid diagrams`;

	return (
		<div
			data-chat-mermaid-root
			style={{
				marginBottom: 10,
				borderRadius: 10,
				border: `1px solid ${WARM.border}`,
				background: WARM.bg,
				overflow: "hidden",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "8px 10px",
					borderBottom: `1px solid #EDE4D6`,
					background: "#FFFFFF95",
				}}
			>
				<span style={{ fontSize: 11, fontWeight: 700, color: WARM.hdr }}>
					Mermaid
				</span>
				<span style={{ fontSize: 10.5, color: WARM.sub }}>{headline}</span>
			</div>
			<div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
				{items.map((row, i) => (
					<div
						key={`${i}-${row.code?.slice(0, 12)}`}
						draggable
						onDragStart={(e) => startDrag(e, row)}
						style={{
							border: `1px solid ${WARM.border}`,
							borderRadius: 10,
							background: "#FFFFFF",
							padding: "8px 10px",
							cursor: "grab",
						}}
					>
						<div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
							<div style={{ minWidth: 0 }}>
								<p style={{ fontSize: 12, fontWeight: 700, color: "#3A3530", margin: "0 0 4px" }}>
									{row.title || `Diagram ${i + 1}`}
								</p>
								<pre
									style={{
										fontSize: 10,
										color: WARM.muted,
										maxHeight: 72,
										overflow: "hidden",
										margin: 0,
										whiteSpace: "pre-wrap",
										wordBreak: "break-word",
										lineHeight: 1.45,
									}}
								>
									{String(row.code || "").slice(0, 280)}
									{(row.code?.length || 0) > 280 ? "…" : ""}
								</pre>
							</div>
							<button
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => setOpenIdx(openIdx === i ? null : i)}
								style={{
									flexShrink: 0,
									fontSize: 10,
									fontWeight: 700,
									padding: "5px 8px",
									borderRadius: 7,
									border: `1px solid ${WARM.border}`,
									background: "#FFFDF8",
									color: WARM.accent,
									cursor: "pointer",
								}}
							>
								⋯
							</button>
						</div>
						{openIdx === i ? (
							<div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
								<button
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => insertIntoDraft(row)}
									style={{
										width: "100%",
										padding: "7px 10px",
										borderRadius: 8,
										border: "none",
										background: WARM.accent,
										color: "white",
										fontWeight: 700,
										fontSize: 11,
										cursor: "pointer",
									}}
								>
									Insert into draft
								</button>
								<button
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => copyFence(row)}
									style={{
										width: "100%",
										padding: "7px 10px",
										borderRadius: 8,
										border: `1px solid ${WARM.border}`,
										background: "white",
										color: "#5A5550",
										fontWeight: 600,
										fontSize: 11,
										cursor: "pointer",
									}}
								>
									Copy fenced markdown
								</button>
							</div>
						) : null}
					</div>
				))}
				<p style={{ fontSize: 10, color: WARM.muted, margin: 0, lineHeight: 1.45 }}>
					Drag a row into the editor or use Insert / Copy.
				</p>
			</div>
		</div>
	);
}
