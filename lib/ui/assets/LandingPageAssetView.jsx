/**
 * LandingPageAssetView — renders HTML from backend API
 * Asset type: "landing_page". Data: { html: string, title, url? }
 * Uses iframe for isolation or div with dangerouslySetInnerHTML
 */

import { motion } from "framer-motion";

const T = {
	base: "#F7F5F0",
	surface: "#FFFFFF",
	accent: "#1A1A1A",
	warm: "#C17B2F",
	muted: "#7A7570",
	border: "#E8E4DC",
};

export default function LandingPageAssetView({ doc, useIframe = false }) {
	const html = doc?.html ?? doc?.result?.html ?? "";
	const title = doc?.title || "Landing Page";
	const url = doc?.url ?? doc?.result?.url ?? "";

	// If we have a URL, prefer iframe for full isolation
	if (url && useIframe) {
		return (
			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					background: T.base,
				}}
			>
				<iframe
					src={url}
					title={title}
					style={{
						flex: 1,
						width: "100%",
						border: "none",
						background: T.surface,
					}}
					sandbox="allow-scripts allow-same-origin"
				/>
			</div>
		);
	}

	// Render HTML in a div (from backend API response)
	if (!html) {
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
				<p style={{ fontSize: 32, marginBottom: 12 }}>🌐</p>
				<p style={{ fontSize: 16, fontWeight: 600, color: T.accent, marginBottom: 8 }}>
					No content
				</p>
				<p style={{ fontSize: 13, color: T.muted }}>
					This landing page asset has no HTML content yet.
				</p>
			</div>
		);
	}

	return (
		<div
			style={{
				flex: 1,
				overflowY: "auto",
				background: T.surface,
			}}
		>
			<div
				className="landing-page-content"
				dangerouslySetInnerHTML={{ __html: html }}
				style={{
					minHeight: "100%",
					// Scope styles to avoid leaking into app
				}}
			/>
		</div>
	);
}
