/**
 * InfographicsAssetView — displays stored infographics from users/{uid}/assets
 * Used when asset type is "infographics". Data: { infographics: [...], title, prompt }
 *
 * Props:
 *   doc           object — { infographics, title, prompt, createdAt, url, sourceUrls }
 *   userId        string — optional, for Generate more
 *   assetId       string — optional, for Generate more
 *   docSource     string — optional, "assets" | "drafts"
 *   onUpdate      () => void — optional, called after successful generate more
 */

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { InfographicCard } from "../InfographicsModal";
import { auth } from "../../config/firebase";
import { updateAsset } from "../../api/userAssets";
import { INKGEST_AGENT_URL } from "../../config/agent";
import { deductCredits } from "../../api/deductCredits";

const T = {
	base: "#F7F5F0",
	surface: "#FFFFFF",
	accent: "#1A1A1A",
	warm: "#C17B2F",
	muted: "#7A7570",
	border: "#E8E4DC",
};

function formatCreatedAt(doc) {
	const ts = doc?.createdAt;
	if (!ts) return null;
	const d =
		ts?.toDate?.() ??
		(typeof ts === "object" && ts?.seconds
			? new Date(ts.seconds * 1000)
			: new Date(ts));
	return d.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function serializeInfographicsForApi(doc) {
	const infographics = doc?.infographics || [];
	const parts = [
		`Title: ${doc?.title || "Infographics"}`,
		doc?.prompt ? `Prompt: ${doc.prompt}` : "",
		"",
		"Existing infographics (generate different types and data points):",
		...infographics.map((ig) => {
			const data = ig.data || ig;
			const stats = data.stats ? JSON.stringify(data.stats) : "";
			const segments = data.segments ? JSON.stringify(data.segments) : "";
			return `- ${ig.type}: ${data.title || ""} — ${data.subtitle || ""} ${stats} ${segments}`.trim();
		}),
	];
	return parts.filter(Boolean).join("\n");
}

export default function InfographicsAssetView({
	doc,
	userId,
	assetId,
	docSource,
	onUpdate,
}) {
	const [generating, setGenerating] = useState(false);
	const [error, setError] = useState("");

	const infographics = doc?.infographics || [];
	const title = doc?.title || "Infographics";
	const prompt = doc?.prompt || "";
	const createdAt = formatCreatedAt(doc);
	const link = doc?.url || doc?.sourceUrls?.[0] || null;
	const canGenerateMore = Boolean(userId && assetId && docSource && onUpdate);

	const handleGenerateMore = useCallback(async () => {
		if (generating || !canGenerateMore) return;
		const content = serializeInfographicsForApi(doc);
		if (!content.trim()) {
			setError("No content to generate from.");
			return;
		}
		setGenerating(true);
		setError("");
		try {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Session expired. Please sign in again.");
			const excludeTypes = infographics.map((ig) => ig.type);
			const res = await fetch(INKGEST_AGENT_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					content,
					title: doc?.title || "Infographics",
					idToken,
					excludeTypes,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Generation failed");
			const newBatch = data.infographics || [];
			if (newBatch.length > 0) {
				deductCredits(idToken, 1);
				await updateAsset(
					userId,
					assetId,
					{ infographics: [...infographics, ...newBatch] },
					docSource,
				);
				onUpdate?.();
			}
		} catch (err) {
			setError(err.message || "Something went wrong. Please try again.");
		} finally {
			setGenerating(false);
		}
	}, [
		doc,
		infographics,
		userId,
		assetId,
		docSource,
		onUpdate,
		generating,
		canGenerateMore,
	]);

	if (infographics.length === 0) {
		return (
			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					padding: 48,
					background: T.base,
				}}
			>
				<p style={{ fontSize: 32, marginBottom: 12 }}>📊</p>
				<p
					style={{
						fontSize: 16,
						fontWeight: 600,
						color: T.accent,
						marginBottom: 8,
					}}
				>
					No infographics yet
				</p>
				<p
					style={{
						fontSize: 13,
						color: T.muted,
						textAlign: "center",
						maxWidth: 320,
					}}
				>
					{prompt
						? `Prompt: ${prompt}`
						: "This asset has no infographics data."}
				</p>
			</div>
		);
	}

	return (
		<div
			style={{
				flex: 1,
				overflowY: "auto",
				background: T.base,
				padding: "24px 20px",
			}}
		>
			<div style={{ maxWidth: 900, margin: "0 auto" }}>
				{/* Meta: date, link */}
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						alignItems: "center",
						gap: 12,
						marginBottom: 20,
					}}
				>
					{createdAt && (
						<span style={{ fontSize: 12, color: T.muted }}>
							Created {createdAt}
						</span>
					)}
					{link && (
						<a
							href={link}
							target="_blank"
							rel="noopener noreferrer"
							style={{
								fontSize: 12,
								color: T.warm,
								textDecoration: "underline",
								wordBreak: "break-all",
							}}
						>
							Source link
						</a>
					)}
				</div>

				{prompt && (
					<p
						style={{
							fontSize: 12,
							color: T.muted,
							marginBottom: 20,
							padding: "10px 14px",
							background: T.surface,
							borderRadius: 8,
							border: `1px solid ${T.border}`,
						}}
					>
						<strong>Prompt:</strong> {prompt}
					</p>
				)}

				<div style={{ columns: "2 360px", gap: 20 }}>
					{infographics.map((ig, i) => (
						<motion.div
							key={i}
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: i * 0.06, duration: 0.4 }}
							style={{
								breakInside: "avoid",
								marginBottom: 20,
								borderRadius: 16,
								overflow: "hidden",
								boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
								background: T.surface,
							}}
						>
							<InfographicCard ig={ig} />
						</motion.div>
					))}
				</div>

				{canGenerateMore && (
					<div
						style={{
							marginTop: 24,
							display: "flex",
							flexDirection: "column",
							alignItems: "flex-start",
							gap: 8,
						}}
					>
						<button
							type="button"
							onClick={handleGenerateMore}
							disabled={generating}
							style={{
								padding: "10px 18px",
								fontSize: 14,
								fontWeight: 600,
								color: T.surface,
								background: T.accent,
								border: "none",
								borderRadius: 10,
								cursor: generating ? "not-allowed" : "pointer",
								opacity: generating ? 0.7 : 1,
							}}
						>
							{generating ? "Generating…" : "Generate more"}
						</button>
						{error && (
							<span style={{ fontSize: 13, color: "#C53030" }}>{error}</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
