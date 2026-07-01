"use client";

import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { auth } from "../config/firebase";
import { fetchMermaidFromAgent } from "../api/mermaidAgentClient";

const T = {
	border: "#E8E4DC",
	muted: "#7A7570",
	accent: "#1A1A1A",
	surface: "#FFFFFF",
	warm: "#C17B2F",
};

function contextOk(selectionText, promptText) {
	const s = String(selectionText || "").trim().length;
	const p = String(promptText || "").trim().length;
	return s >= 8 || p >= 8;
}

/**
 * Bubble menu: prompt-only Mermaid generation (no diagram-type dropdown).
 */
export default function MermaidInlineGeneratePanel({
	userId,
	sourceText,
	draftTitle = "Draft",
	onInsert,
	requestClose,
}) {
	const [prompt, setPrompt] = useState("");
	const [loading, setLoading] = useState(false);
	const [preview, setPreview] = useState(null);

	const uid = userId?.trim?.() ? userId.trim() : auth.currentUser?.uid || "";

	const runGenerate = useCallback(async () => {
		if (!uid) {
			toast.error("Sign in to generate diagrams.");
			return;
		}
		if (!contextOk(sourceText, prompt)) {
			toast.error("Add a prompt (or select ~8+ characters from the draft).");
			return;
		}
		setLoading(true);
		setPreview(null);
		try {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Session expired. Sign in again.");
			const { mermaid, title } = await fetchMermaidFromAgent({
				userId: uid,
				idToken,
				prompt,
				contextText: sourceText,
				articleTitle: draftTitle,
			});
			if (!mermaid) throw new Error("Empty diagram from server.");
			setPreview({ code: mermaid, title });
			toast.success("Diagram ready — insert below.");
		} catch (e) {
			toast.error(e?.message || "Generation failed.");
		} finally {
			setLoading(false);
		}
	}, [uid, sourceText, draftTitle, prompt]);

	const insertNow = () => {
		if (!preview?.code) return;
		onInsert?.({ code: preview.code, title: preview.title || "" });
		setPreview(null);
		requestClose?.();
	};

	return (
		<div className="p-2">
			<p className="text-sm text-zinc-500 mb-2">Create Mermaid diagrams</p>
			<p className="text-xs text-zinc-500 mb-2">
				Describe the diagram
			</p>
			<textarea
				value={prompt}
				onChange={(e) => setPrompt(e.target.value)}
				onMouseDown={(e) => e.stopPropagation()}
				disabled={loading}
				placeholder="e.g. sequence of signup → verify email → onboarding states"
				maxLength={4000}
				rows={4}
				style={{
					width: "100%",
					boxSizing: "border-box",
					fontSize: 12,
					padding: "8px 10px",
					borderRadius: 8,
					border: `1px solid ${T.border}`,
					background: T.surface,
					color: T.accent,
					resize: "vertical",
					minHeight: 72,
					outline: "none",
					fontFamily: "inherit",
					lineHeight: 1.45,
				}}
			/>

			<button
				type="button"
				disabled={loading || !contextOk(sourceText, prompt)}
				onMouseDown={(e) => e.preventDefault()}
				onClick={() => runGenerate()}
				style={{
					marginTop: 10,
					width: "100%",
					padding: "9px 12px",
					borderRadius: 9,
					border: "none",
					background: loading ? T.border : T.warm,
					color: "white",
					fontWeight: 700,
					fontSize: 12,
					cursor: loading ? "wait" : "pointer",
				}}
			>
				{loading ? "Generating…" : "Generate Mermaid"}
			</button>

			<p className="text-xs text-zinc-500 my-2">
				Uses your text selection when present; otherwise follows your prompt. One diagram per run.
			</p>

			{preview?.code ? (
				<div
					style={{
						marginTop: 12,
						border: `1px solid ${T.border}`,
						borderRadius: 12,
						padding: "10px 10px",
						background: T.surface,
					}}
				>
					<p style={{ fontSize: 11, fontWeight: 700, color: T.accent, margin: "0 0 8px" }}>
						{preview.title || "Diagram"}
					</p>
					<pre
						style={{
							fontSize: 10,
							maxHeight: 120,
							overflow: "auto",
							background: "#FAFAF9",
							borderRadius: 8,
							padding: 8,
							border: `1px solid ${T.border}`,
							margin: "0 0 10px",
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
						}}
					>
						{preview.code}
					</pre>
					<button
						type="button"
						onMouseDown={(e) => e.preventDefault()}
						onClick={insertNow}
						style={{
							width: "100%",
							padding: "8px 10px",
							borderRadius: 8,
							border: `1px solid ${T.warm}`,
							background: "#FFFDF8",
							color: T.warm,
							fontWeight: 700,
							fontSize: 12,
							cursor: "pointer",
						}}
					>
						Insert into editor
					</button>
				</div>
			) : null}
		</div>
	);
}
