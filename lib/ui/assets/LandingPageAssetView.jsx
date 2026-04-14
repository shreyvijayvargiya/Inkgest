/**
 * LandingPageAssetView — HTML landing assets: live URL, iframe srcDoc, inline DOM, code + copy.
 */

import { useState, useCallback, useMemo } from "react";
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

	const defaultTab = useMemo(() => {
		if (url) return "url";
		if (html) return useIframe ? "iframe" : "inline";
		return "iframe";
	}, [url, html, useIframe]);

	const [tab, setTab] = useState(defaultTab);
	const [copied, setCopied] = useState(false);

	const copyCode = useCallback(() => {
		if (!html || typeof navigator === "undefined" || !navigator.clipboard) return;
		navigator.clipboard.writeText(html).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}, [html]);

	if (!html && !url) {
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
					This landing page asset has no HTML or URL yet.
				</p>
			</div>
		);
	}

	const tabItems = [];
	if (url) tabItems.push({ id: "url", label: "Live URL" });
	if (html) {
		tabItems.push(
			{ id: "iframe", label: "Preview (iframe)" },
			{ id: "inline", label: "Preview (inline)" },
			{ id: "code", label: "HTML code" },
		);
	}

	return (
		<div
			style={{
				flex: 1,
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
				background: T.base,
			}}
		>
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: 6,
					padding: "10px 12px",
					borderBottom: `1px solid ${T.border}`,
					background: T.surface,
				}}
			>
				{tabItems.map((t) => (
					<button
						key={t.id}
						type="button"
						onClick={() => setTab(t.id)}
						style={{
							padding: "6px 12px",
							borderRadius: 8,
							border: `1px solid ${tab === t.id ? T.warm : T.border}`,
							background: tab === t.id ? `${T.warm}18` : "transparent",
							color: tab === t.id ? T.warm : T.muted,
							fontSize: 11,
							fontWeight: tab === t.id ? 700 : 600,
							cursor: "pointer",
						}}
					>
						{t.label}
					</button>
				))}
			</div>

			{tab === "url" && url && (
				<div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
					<iframe
						src={url}
						title={title}
						style={{
							flex: 1,
							width: "100%",
							border: "none",
							background: T.surface,
							minHeight: 400,
						}}
						sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
					/>
				</div>
			)}

			{tab === "iframe" && html && (
				<div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
					<iframe
						title={title}
						srcDoc={html}
						style={{
							flex: 1,
							width: "100%",
							border: "none",
							background: T.surface,
							minHeight: 400,
						}}
						sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
					/>
					<p
						style={{
							fontSize: 11,
							color: T.muted,
							padding: "8px 12px",
							borderTop: `1px solid ${T.border}`,
						}}
					>
						Sandboxed iframe (srcDoc). Some scripts may be blocked by the browser.
					</p>
				</div>
			)}

			{tab === "inline" && html && (
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
						style={{ minHeight: "100%" }}
					/>
				</div>
			)}

			{tab === "code" && html && (
				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						minHeight: 0,
						background: T.surface,
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "flex-end",
							padding: "8px 12px",
							borderBottom: `1px solid ${T.border}`,
						}}
					>
						<motion.button
							type="button"
							whileTap={{ scale: 0.98 }}
							onClick={copyCode}
							style={{
								background: copied ? "#DCFCE7" : T.warm,
								color: copied ? "#166534" : "white",
								border: "none",
								borderRadius: 8,
								padding: "8px 14px",
								fontSize: 12,
								fontWeight: 700,
								cursor: "pointer",
							}}
						>
							{copied ? "Copied" : "Copy HTML"}
						</motion.button>
					</div>
					<pre
						style={{
							flex: 1,
							margin: 0,
							padding: 16,
							overflow: "auto",
							fontSize: 11,
							lineHeight: 1.5,
							color: T.accent,
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
							fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
						}}
					>
						{html}
					</pre>
				</div>
			)}
		</div>
	);
}
