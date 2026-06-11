import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
	T,
	EMBED_ICONS,
	makeEmbedHtml,
	resolveEmbed,
} from "../draftPageLib";

export default function DraftEmbedModal({
	open,
	embedUrlInput,
	setEmbedUrlInput,
	embedResolved,
	setEmbedResolved,
	setEmbedModalOpen,
	editorRef,
	embedRangeRef,
	countWords,
}) {
	if (!open || typeof document === "undefined") return null;

	const doInsert = () => {
		const html = makeEmbedHtml(embedResolved);
		if (!html || !editorRef.current) return;
		editorRef.current.focus();
		if (embedRangeRef.current) {
			const sel = window.getSelection();
			if (sel) {
				sel.removeAllRanges();
				sel.addRange(embedRangeRef.current);
			}
			embedRangeRef.current = null;
		}
		document.execCommand("insertHTML", false, html);
		countWords();
		setEmbedModalOpen(false);
		setEmbedResolved(null);
		setEmbedUrlInput("");
	};

	const eColor = embedResolved?.color ?? T.border;
	const btnBg = embedResolved
		? embedResolved.color === "#000000" || embedResolved.color === "#010101"
			? "#1A1A1A"
			: embedResolved.color
		: T.border;

	return createPortal(
		<div
			role="dialog"
			aria-modal="true"
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 140,
				background: "rgba(28,26,24,0.6)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backdropFilter: "blur(4px)",
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					setEmbedModalOpen(false);
					setEmbedResolved(null);
					setEmbedUrlInput("");
				}
			}}
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.93, y: 18 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{ opacity: 0, scale: 0.93, y: 18 }}
				transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
				style={{
					background: T.surface,
					border: `1px solid ${T.border}`,
					borderRadius: 20,
					padding: "24px 24px 20px",
					width: "100%",
					maxWidth: 560,
					boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
					display: "flex",
					flexDirection: "column",
					gap: 0,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 18,
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
						<div
							style={{
								width: 34,
								height: 34,
								borderRadius: 9,
								background: embedResolved ? eColor + "18" : "#F0ECE5",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: 18,
								transition: "background 0.2s",
								flexShrink: 0,
							}}
						>
							{(embedResolved && EMBED_ICONS[embedResolved.platform]) || "🔗"}
						</div>
						<div>
							<p
								style={{
									fontSize: 14,
									fontWeight: 700,
									color: T.accent,
									lineHeight: 1.2,
								}}
							>
								{embedResolved
									? `${embedResolved.label} Embed`
									: "Embed Content"}
							</p>
							<p style={{ fontSize: 11, color: T.muted }}>
								YouTube · X · Instagram · Reddit · TikTok · Spotify · Vimeo ·
								Loom · Figma
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={() => {
							setEmbedModalOpen(false);
							setEmbedResolved(null);
							setEmbedUrlInput("");
						}}
						style={{
							width: 28,
							height: 28,
							borderRadius: "50%",
							border: `1px solid ${T.border}`,
							background: "transparent",
							color: T.muted,
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: 13,
							flexShrink: 0,
						}}
					>
						✕
					</button>
				</div>

				<p
					style={{
						fontSize: 10.5,
						fontWeight: 700,
						color: T.muted,
						textTransform: "uppercase",
						letterSpacing: "0.07em",
						marginBottom: 6,
					}}
				>
					Paste a link
				</p>
				<input
					autoFocus
					value={embedUrlInput}
					onChange={(e) => {
						const val = e.target.value;
						setEmbedUrlInput(val);
						setEmbedResolved(val.trim() ? resolveEmbed(val.trim()) : null);
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" && embedResolved) doInsert();
					}}
					placeholder="https://youtube.com/watch?v=... or any social link"
					style={{
						width: "100%",
						padding: "9px 12px",
						borderRadius: 9,
						border: `1.5px solid ${embedResolved ? eColor : T.border}`,
						background: T.bg,
						color: T.accent,
						fontSize: 13,
						outline: "none",
						boxSizing: "border-box",
						marginBottom: 14,
						transition: "border-color 0.2s",
					}}
				/>

				{!embedResolved && (
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: 5,
							marginBottom: 16,
						}}
					>
						{[
							{ label: "YouTube", color: "#FF0000" },
							{ label: "X / Twitter", color: "#000" },
							{ label: "Instagram", color: "#E1306C" },
							{ label: "Reddit", color: "#FF4500" },
							{ label: "TikTok", color: "#010101" },
							{ label: "Spotify", color: "#1DB954" },
							{ label: "Vimeo", color: "#1AB7EA" },
							{ label: "Loom", color: "#625DF5" },
							{ label: "Figma", color: "#F24E1E" },
							{ label: "CodeSandbox", color: "#333" },
						].map((p) => (
							<span
								key={p.label}
								style={{
									fontSize: 10,
									fontWeight: 600,
									padding: "3px 8px",
									borderRadius: 100,
									background: p.color + "12",
									color: ["#000", "#010101"].includes(p.color)
										? "#333"
										: p.color,
									border: `1px solid ${p.color}20`,
								}}
							>
								{p.label}
							</span>
						))}
					</div>
				)}

				{embedResolved && (
					<div style={{ marginBottom: 18 }}>
						<p
							style={{
								fontSize: 10.5,
								fontWeight: 700,
								color: T.muted,
								textTransform: "uppercase",
								letterSpacing: "0.07em",
								marginBottom: 8,
							}}
						>
							Preview
						</p>
						{embedResolved.cardEmbed ? (
							<div
								style={{
									border: `1.5px solid #E8E4DC`,
									borderRadius: 12,
									overflow: "hidden",
									display: "flex",
									alignItems: "center",
									gap: 14,
									padding: "14px 18px",
									background: "#FAFAF8",
								}}
							>
								<span
									style={{
										fontSize: 24,
										flexShrink: 0,
										lineHeight: 1,
									}}
								>
									{EMBED_ICONS[embedResolved.platform] || "🔗"}
								</span>
								<div style={{ flex: 1, minWidth: 0 }}>
									<p
										style={{
											fontSize: 13,
											fontWeight: 700,
											color: "#37352F",
											margin: "0 0 2px",
										}}
									>
										{embedResolved.label}
									</p>
									<p
										style={{
											fontSize: 11,
											color: "#C17B2F",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
											margin: 0,
										}}
									>
										{embedUrlInput
											.replace(/^https?:\/\/(www\.)?/, "")
											.slice(0, 60)}
									</p>
								</div>
								<span
									style={{
										fontSize: 11,
										color: "#9A9490",
										whiteSpace: "nowrap",
										padding: "5px 10px",
										border: "1px solid #E8E4DC",
										borderRadius: 6,
										background: "#fff",
									}}
								>
									Open ↗
								</span>
							</div>
						) : (
							<div
								style={{
									borderRadius: 12,
									overflow: "hidden",
									border: `1px solid ${T.border}`,
									background: "#F7F5F0",
									position: "relative",
								}}
							>
								<iframe
									key={embedResolved.iframeSrc}
									src={embedResolved.iframeSrc}
									style={{
										width: "100%",
										aspectRatio: embedResolved.aspectRatio?.includes("px")
											? undefined
											: embedResolved.aspectRatio || "16/9",
										height: embedResolved.aspectRatio?.includes("px")
											? embedResolved.aspectRatio
											: undefined,
										minHeight: embedResolved.aspectRatio?.includes("px")
											? undefined
											: 200,
										border: "none",
										display: "block",
									}}
									loading="lazy"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
									allowFullScreen
								/>
							</div>
						)}
						<p style={{ fontSize: 10, color: T.muted, marginTop: 5 }}>
							<span style={{ color: eColor, fontWeight: 700 }}>
								{embedResolved.label}
							</span>
							{embedResolved.cardEmbed
								? " · inserted as a link card"
								: " · live embed"}
						</p>
					</div>
				)}

				<div
					style={{
						display: "flex",
						gap: 8,
						justifyContent: "flex-end",
					}}
				>
					<button
						type="button"
						onClick={() => {
							setEmbedModalOpen(false);
							setEmbedResolved(null);
							setEmbedUrlInput("");
						}}
						style={{
							padding: "8px 18px",
							borderRadius: 9,
							border: `1px solid ${T.border}`,
							background: "transparent",
							color: T.muted,
							fontWeight: 500,
							fontSize: 13,
							cursor: "pointer",
						}}
					>
						Cancel
					</button>
					<button
						type="button"
						disabled={!embedResolved}
						onClick={doInsert}
						style={{
							padding: "8px 20px",
							borderRadius: 9,
							border: "none",
							background: embedResolved ? btnBg : T.border,
							color: embedResolved ? "white" : T.muted,
							fontWeight: 700,
							fontSize: 13,
							cursor: embedResolved ? "pointer" : "not-allowed",
							display: "flex",
							alignItems: "center",
							gap: 6,
							transition: "background 0.2s",
						}}
					>
						<svg
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
						Add to Editor
					</button>
				</div>
			</motion.div>
		</div>,
		document.body,
	);
}
