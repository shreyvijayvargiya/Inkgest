"use client";

import React, { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { auth } from "../config/firebase";
import { fetchInfographicsFromAgent } from "../api/infographicsAgentClient";
import { INFOGRAPHIC_CREATIVE_FORMATS } from "../config/infographicCreativeFormats";
import { InfographicCard } from "./InfographicsModal";
import InfographicThumbPreview from "./InfographicThumbPreview";
import MotionSelect from "./MotionSelect";
import {
	INK_INFOGRAPHIC_DRAG_MIME,
	infographicDragPayloadString,
} from "./infographicInsertion";

const T = {
	border: "#E8E4DC",
	muted: "#7A7570",
	accent: "#1A1A1A",
	surface: "#FFFFFF",
	warm: "#C17B2F",
	bg: "#F7F5F0",
};

/**
 * @param {{
 *   userId?: string,
 *   sourceText: string,
 *   draftTitle?: string,
 *   onInsertSpec: (spec: object) => void,
 *   requestClose?: () => void,
 * }} props
 */
export default function InfographicInlineGeneratePanel({
	userId,
	sourceText,
	draftTitle = "Draft",
	onInsertSpec,
	requestClose,
}) {
	const [formatId, setFormatId] = useState(INFOGRAPHIC_CREATIVE_FORMATS[0]?.id);
	const [extraPrompt, setExtraPrompt] = useState("");
	const [loading, setLoading] = useState(false);
	const [items, setItems] = useState([]);
	const [preview, setPreview] = useState(null);

	const uid = userId?.trim?.() ? userId.trim() : auth.currentUser?.uid || "";

	const runGenerate = useCallback(async () => {
		if (!uid) {
			toast.error("Sign in to generate infographics.");
			return;
		}
		const base = String(sourceText || "").trim();
		if (!baseOk(base)) {
			toast.error("Select more text — at least one sentence.");
			return;
		}
		setLoading(true);
		setItems([]);
		try {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Session expired. Sign in again.");
			const { infographics } = await fetchInfographicsFromAgent({
				userId: uid,
				idToken,
				htmlOrTextContent: base,
				title: draftTitle,
				excludeTypes: [],
				visualFormatId: formatId || null,
				extraPrompt: extraPrompt.trim() || undefined,
			});
			if (!infographics?.length)
				toast.message("No panels returned — try another format.");
			setItems(infographics);
		} catch (e) {
			toast.error(e?.message || "Generation failed.");
		} finally {
			setLoading(false);
		}
	}, [uid, sourceText, draftTitle, formatId, extraPrompt]);

	const startDragPayload = useCallback((e, ig) => {
		try {
			e.dataTransfer.setData(
				INK_INFOGRAPHIC_DRAG_MIME,
				infographicDragPayloadString(ig),
			);
			e.dataTransfer.effectAllowed = "copy";
		} catch {
			/* ignore */
		}
	}, []);

	const baseTrim = String(sourceText || "").trim();

	return (
		<div className="p-2">
			<p className="text-sm text-zinc-500 mb-2">Add Infographics</p>
			<p className="text-xs text-zinc-500 mb-2">
				Prompt <span style={{ fontWeight: 500 }}>(optional)</span>
			</p>
			<input
				type="text"
				value={extraPrompt}
				onChange={(e) => setExtraPrompt(e.target.value)}
				onMouseDown={(e) => e.stopPropagation()}
				disabled={loading}
				placeholder="Angle, audience, or emphasis…"
				maxLength={2000}
				style={{
					width: "100%",
					boxSizing: "border-box",
					fontSize: 12,
					padding: "7px 10px",
					borderRadius: 8,
					border: `1px solid ${T.border}`,
					background: T.surface,
					color: T.accent,
					marginBottom: 10,
					outline: "none",
				}}
			/>
			<p className="text-xs text-zinc-500 mb-2">
				Select format
			</p>
			<MotionSelect
				value={formatId}
				onChange={setFormatId}
				disabled={loading}
				preserveEditorSelection
				options={INFOGRAPHIC_CREATIVE_FORMATS.map((f) => ({
					value: f.id,
					label: f.label,
				}))}
				zIndex={500}
				triggerStyle={{
					width: "100%",
					fontSize: 12,
					padding: "8px 10px",
					borderRadius: 8,
					border: `1px solid ${T.border}`,
					background: T.surface,
					color: T.accent,
				}}
				menuStyle={{
					border: `1px solid ${T.border}`,
					background: T.surface,
					boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
				}}
				optionStyle={{
					color: T.accent,
				}}
			/>

			<button
				type="button"
				disabled={loading || !baseOk(baseTrim)}
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
				{loading ? "Generating…" : "Generate infographic panels"}
			</button>

			<p style={{ fontSize: 10, color: T.muted, margin: "8px 0 0", lineHeight: 1.4 }}>
				Produces 1–5 panels · drag a card into the editor or tap Insert.
			</p>

			<div
				style={{
					marginTop: 12,
					maxHeight: 220,
					overflowY: "auto",
					display: "flex",
					flexDirection: "column",
					gap: 8,
				}}
			>
				{items.map((ig, i) => (
					<motion.div
						key={`${ig.type}-${i}`}
						layout
						draggable={!loading}
						onDragStart={(e) => startDragPayload(e, ig)}
						style={{
							border: `1px solid ${T.border}`,
							borderRadius: 12,
							background: T.surface,
							padding: "8px 10px",
							cursor: loading ? "default" : "grab",
							display: "flex",
							gap: 10,
							alignItems: "center",
							flexShrink: 0,
						}}
					>
						<div
							style={{
								width: 64,
								flexShrink: 0,
								borderRadius: 8,
								overflow: "hidden",
								border: `1px solid ${T.border}`,
							}}
						>
							<InfographicThumbPreview ig={ig} height={72} />
						</div>
						<div style={{ flex: 1, minWidth: 0 }}>
							<p
								style={{
									fontSize: 11,
									fontWeight: 700,
									color: T.accent,
									margin: 0,
								}}
							>
								{ig.title || ig.type || "Visual"}
							</p>
							<p style={{ fontSize: 10, color: T.muted, margin: "4px 0 8px", lineHeight: 1.35 }}>
								{(ig.subtitle || ig.type || "").slice(0, 90)}
								{(ig.subtitle || "").length > 90 ? "…" : ""}
							</p>
							<div style={{ display: "flex", gap: 6 }}>
								<button
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => {
										onInsertSpec?.(ig);
										requestClose?.();
										toast.success("Inserted infographic");
									}}
									style={{
										padding: "4px 10px",
										borderRadius: 7,
										border: "none",
										background: "#1A1A1A",
										color: "white",
										fontWeight: 600,
										fontSize: 10,
										cursor: "pointer",
									}}
								>
									Insert
								</button>
								<button
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => setPreview(ig)}
									style={{
										padding: "4px 10px",
										borderRadius: 7,
										border: `1px solid ${T.border}`,
										background: T.surface,
										fontWeight: 600,
										fontSize: 10,
										cursor: "pointer",
									}}
								>
									Preview
								</button>
							</div>
						</div>
					</motion.div>
				))}
			</div>

			{typeof document !== "undefined" &&
				createPortal(
					<AnimatePresence>
						{preview ? (
							<motion.div
								key="ig-preview-root"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								style={{
									position: "fixed",
									inset: 0,
									zIndex: 400,
									background: "rgba(0,0,0,0.45)",
									backdropFilter: "blur(3px)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									padding: 24,
								}}
								onClick={() => setPreview(null)}
							>
								<motion.div
									initial={{ scale: 0.96, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									transition={{ duration: 0.2 }}
									onClick={(e) => e.stopPropagation()}
									style={{
										maxWidth: 560,
										width: "100%",
										maxHeight: "92vh",
										overflowY: "auto",
										background: T.surface,
										borderRadius: 16,
										border: `1px solid ${T.border}`,
										padding: 20,
										boxShadow: "0 32px 60px rgba(0,0,0,0.18)",
									}}
								>
									<button
										type="button"
										onClick={() => setPreview(null)}
										style={{
											float: "right",
											border: `1px solid ${T.border}`,
											background: "#fff",
											borderRadius: 8,
											padding: "4px 10px",
											fontSize: 11,
											fontWeight: 600,
											cursor: "pointer",
										}}
									>
										Close
									</button>
									<div style={{ clear: "both" }} />
									<div style={{ marginTop: 8 }}>
										<InfographicCard ig={preview} />
									</div>
								</motion.div>
							</motion.div>
						) : null}
					</AnimatePresence>,
					document.body,
				)}
		</div>
	);
}

function baseOk(base) {
	return String(base || "").trim().length >= 8;
}
