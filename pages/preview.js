import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const NW = 292,
	NH = 196;

const C = {
	blog: {
		label: "Blog Post",
		icon: "✦",
		color: "#ff6b35",
		actions: ["newsletter", "twitter", "infographic", "table", "summary"],
	},
	newsletter: {
		label: "Newsletter",
		icon: "◈",
		color: "#a855f7",
		actions: ["blog", "twitter", "summary"],
	},
	twitter: {
		label: "Thread",
		icon: "◉",
		color: "#38bdf8",
		actions: ["blog", "newsletter"],
	},
	infographic: {
		label: "Infographic",
		icon: "▣",
		color: "#f43f5e",
		actions: ["blog", "table", "summary"],
	},
	table: {
		label: "Data Table",
		icon: "⊞",
		color: "#22d3ee",
		actions: ["blog", "infographic", "summary"],
	},
	summary: {
		label: "Summary",
		icon: "≡",
		color: "#94a3b8",
		actions: ["blog", "twitter", "newsletter"],
	},
	seoAudit: {
		label: "SEO Audit",
		icon: "◎",
		color: "#10b981",
		actions: ["blog", "competitor", "summary"],
	},
	competitor: {
		label: "Competitor",
		icon: "⚑",
		color: "#fb923c",
		actions: ["blog", "seoAudit", "summary"],
	},
};

const SAMPLE = {
	blog: "A comprehensive deep-dive into modern React patterns for 2026 — server components, concurrent features, and the future of state management in the edge-first era.",
	newsletter:
		"This week: React 20 drops server actions v2, Vercel's edge-first architecture shift, and why every production team is moving to Hono.js on the backend.",
	twitter:
		"1/ React changed everything again. Here's the pattern nobody is talking about →\n2/ The real problem with current state management is complexity creep...\n3/ Here is the fix that changes how you think about it.\n4/ Thread concludes: edge + signals = the future.",
	infographic:
		"Visual breakdown of the complete 2026 web stack — from edge runtime to UI layer. Real performance data, flow diagrams, and architectural trade-offs across six dimensions.",
	table:
		"State library head-to-head: Zustand · Jotai · Valtio · Redux Toolkit.\nBundle (gz): 1.1kb / 2.4kb / 0.9kb / 12kb\nDX Score: 9/10 / 8/10 / 8/10 / 6/10\nRuntime perf: fast / fast / fastest / medium\nLearning curve: low / low / low / high",
	summary:
		"Key insight: edge-first computing has fundamentally changed data fetching, state patterns, and perceived performance. Three things every team should change in 2026.",
	seoAudit:
		"Score: 78/100.\nPrimary keywords: 'react patterns 2026', 'nextjs edge' — density OK.\nGaps: long-tail edge computing queries severely underserved.\nFixes: H1 keyword missing, meta description needs rewrite, 3 broken internal links.",
	competitor:
		"vs dev.to: stronger community engagement, weaker domain authority. Keyword overlap: 34%.\nvs hashnode: similar reach, better technical depth. Win opportunity: 'edge-first' topic cluster.",
};

const INIT_NODES = [
	{
		id: "1",
		type: "blog",
		title: "React Patterns in 2026",
		x: 100,
		y: 140,
		content: SAMPLE.blog,
	},
	{
		id: "2",
		type: "twitter",
		title: "Thread: React patterns →",
		x: 500,
		y: 40,
		content: SAMPLE.twitter,
		parentId: "1",
	},
	{
		id: "3",
		type: "newsletter",
		title: "Weekly Dev Digest #42",
		x: 500,
		y: 294,
		content: SAMPLE.newsletter,
		parentId: "1",
	},
	{
		id: "4",
		type: "seoAudit",
		title: "ihatereading.in Audit",
		x: 900,
		y: 40,
		content: SAMPLE.seoAudit,
		parentId: "2",
	},
	{
		id: "5",
		type: "infographic",
		title: "2026 Web Stack Visual",
		x: 900,
		y: 294,
		content: SAMPLE.infographic,
		parentId: "3",
	},
];
const INIT_EDGES = [
	{ id: "e1", from: "1", to: "2" },
	{ id: "e2", from: "1", to: "3" },
	{ id: "e3", from: "2", to: "4" },
	{ id: "e4", from: "3", to: "5" },
];

let UID = 50;

// ─── Helpers ──────────────────────────────────────────────────────
const parseType = (text) => {
	const t = text.toLowerCase();
	if (/newsletter|email digest|digest/.test(t)) return "newsletter";
	if (/tweet|twitter|thread/.test(t)) return "twitter";
	if (/infographic|visual|illustration|chart/.test(t)) return "infographic";
	if (/\btable\b|comparison|spreadsheet|vs\b/.test(t)) return "table";
	if (/summary|summarize|tldr|key point/.test(t)) return "summary";
	if (/\bseo\b|audit|keyword|search rank/.test(t)) return "seoAudit";
	if (/competitor|competition|compare site/.test(t)) return "competitor";
	return "blog";
};
const genTitle = (type, prompt) => {
	const short = prompt
		.replace(/^(write|create|make|generate|build|give me)\s+(a|an)?\s*/i, "")
		.trim();
	const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
	const labels = {
		blog: "Blog:",
		newsletter: "Newsletter:",
		twitter: "Thread:",
		infographic: "Infographic:",
		table: "Table:",
		summary: "Summary:",
		seoAudit: "SEO Audit:",
		competitor: "Competitor Analysis:",
	};
	return `${labels[type] || ""} ${cap(short.slice(0, 44))}${short.length > 44 ? "…" : ""}`;
};
const genContent = (type, prompt) => {
	const topic = prompt
		.replace(/^(write|create|make|generate|give me|build)\s+(a|an)?\s*/i, "")
		.trim();
	return (SAMPLE[type] || "").replace(
		/react patterns? (in )?2026|modern react|nextjs edge|state management|edge.first/gi,
		topic.slice(0, 40) || "this topic",
	);
};

// ═══════════════════════════════════════════════════════════════════
// EDGE SPAWN INPUT — floats at midpoint of the pending edge
// ═══════════════════════════════════════════════════════════════════

function EdgeSpawnInput({ pending, pan, scale, onConfirm, onCancel }) {
	const [url, setUrl] = useState("");
	const [prompt, setPrompt] = useState("");
	const urlRef = useRef(null);
	const cfg = C[pending.type];
	const fn = pending.fromNode;

	// Canvas midpoint: parent right-edge → 48px along the future edge
	const midCX = fn.x + NW + 52;
	const midCY = fn.y + NH / 2;

	// Screen position
	const sx = midCX * scale + pan.x;
	const sy = midCY * scale + pan.y;

	useEffect(() => {
		setTimeout(() => urlRef.current?.focus(), 80);
	}, []);

	useEffect(() => {
		const onKey = (e) => {
			if (e.key === "Escape") onCancel();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onCancel]);

	const canConfirm = url.trim() || prompt.trim();

	const handleConfirm = () => {
		if (!canConfirm || pending.generating) return;
		onConfirm({ url: url.trim(), prompt: prompt.trim() });
	};

	const isUrl = url.trim().startsWith("http");

	return (
		<div
			style={{
				position: "fixed",
				left: sx,
				top: sy,
				transform: "translate(-50%,-50%)",
				zIndex: 500,
				pointerEvents: "all",
			}}
			onPointerDown={(e) => e.stopPropagation()}
			onClick={(e) => e.stopPropagation()}
		>
			<AnimatePresence mode="wait">
				{pending.generating ? (
					// ── Generating state ──────────────────────────────────────
					<motion.div
						key="gen"
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.85, opacity: 0 }}
						style={{
							background: "#0d0d17",
							border: `1.5px solid ${cfg.color}50`,
							borderRadius: 12,
							padding: "14px 20px",
							display: "flex",
							alignItems: "center",
							gap: 12,
							boxShadow: `0 0 32px ${cfg.color}20, 0 12px 40px rgba(0,0,0,0.7)`,
							minWidth: 220,
						}}
					>
						{/* Spinning ring */}
						<svg width={20} height={20} style={{ flexShrink: 0 }}>
							<circle
								cx={10}
								cy={10}
								r={7}
								fill="none"
								stroke={`${cfg.color}30`}
								strokeWidth={2}
							/>
							<motion.circle
								cx={10}
								cy={10}
								r={7}
								fill="none"
								stroke={cfg.color}
								strokeWidth={2}
								strokeLinecap="round"
								strokeDasharray="12 32"
								animate={{ rotate: 360 }}
								transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
								style={{ transformOrigin: "10px 10px" }}
							/>
						</svg>
						<div>
							<div
								style={{
									fontSize: 11,
									fontFamily: "'Courier New',monospace",
									color: cfg.color,
									textTransform: "uppercase",
									letterSpacing: 2,
									marginBottom: 3,
								}}
							>
								{cfg.label}
							</div>
							<div
								style={{
									fontSize: 10,
									fontFamily: "'Courier New',monospace",
									color: "rgba(255,255,255,0.35)",
								}}
							>
								Generating asset…
							</div>
						</div>
					</motion.div>
				) : (
					// ── Input card ────────────────────────────────────────────
					<motion.div
						key="input"
						initial={{ scale: 0.85, opacity: 0, y: 6 }}
						animate={{ scale: 1, opacity: 1, y: 0 }}
						exit={{ scale: 0.88, opacity: 0, y: 4 }}
						transition={{ type: "spring", stiffness: 420, damping: 28 }}
						style={{
							background: "#0e0e1a",
							border: `1.5px solid ${cfg.color}40`,
							borderRadius: 14,
							overflow: "hidden",
							width: 300,
							boxShadow: `0 0 0 1px ${cfg.color}18, 0 24px 60px rgba(0,0,0,0.8), 0 0 48px ${cfg.color}0c`,
						}}
					>
						{/* Top accent + type label */}
						<div
							style={{
								height: 2.5,
								background: `linear-gradient(90deg,${cfg.color},${cfg.color}55)`,
							}}
						/>
						<div
							style={{
								padding: "10px 14px 8px",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: 7 }}>
								<span style={{ fontSize: 12, color: cfg.color }}>
									{cfg.icon}
								</span>
								<span
									style={{
										fontSize: 9,
										fontFamily: "'Courier New',monospace",
										color: cfg.color,
										textTransform: "uppercase",
										letterSpacing: 2.5,
									}}
								>
									New {cfg.label}
								</span>
							</div>
							<button
								onClick={onCancel}
								style={{
									background: "none",
									border: "none",
									color: "rgba(255,255,255,0.2)",
									cursor: "pointer",
									fontSize: 17,
									padding: 0,
									lineHeight: 1,
								}}
							>
								×
							</button>
						</div>

						<div
							style={{
								padding: "0 14px 14px",
								display: "flex",
								flexDirection: "column",
								gap: 9,
							}}
						>
							{/* URL input */}
							<div>
								<label
									style={{
										display: "block",
										fontSize: 8.5,
										fontFamily: "'Courier New',monospace",
										color: "rgba(255,255,255,0.3)",
										textTransform: "uppercase",
										letterSpacing: 1.8,
										marginBottom: 5,
									}}
								>
									Source URL{" "}
									<span style={{ color: "rgba(255,255,255,0.15)" }}>
										optional
									</span>
								</label>
								<div style={{ position: "relative" }}>
									<input
										ref={urlRef}
										value={url}
										onChange={(e) => setUrl(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter" && !e.shiftKey) {
												e.preventDefault();
												canConfirm && handleConfirm();
											}
										}}
										placeholder="https://..."
										style={{
											width: "100%",
											boxSizing: "border-box",
											background: "rgba(255,255,255,0.04)",
											border: `1px solid ${isUrl ? cfg.color + "60" : "rgba(255,255,255,0.09)"}`,
											borderRadius: 8,
											padding: "7px 32px 7px 10px",
											color: "#dce2f4",
											fontSize: 11.5,
											outline: "none",
											fontFamily: "'Courier New',monospace",
											transition: "border-color 0.15s",
										}}
									/>
									{isUrl && (
										<motion.span
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											style={{
												position: "absolute",
												right: 9,
												top: "50%",
												transform: "translateY(-50%)",
												fontSize: 11,
												color: cfg.color,
											}}
										>
											✓
										</motion.span>
									)}
								</div>
							</div>

							{/* Prompt input */}
							<div>
								<label
									style={{
										display: "block",
										fontSize: 8.5,
										fontFamily: "'Courier New',monospace",
										color: "rgba(255,255,255,0.3)",
										textTransform: "uppercase",
										letterSpacing: 1.8,
										marginBottom: 5,
									}}
								>
									What to create{" "}
									<span style={{ color: `${cfg.color}80` }}>required</span>
								</label>
								<textarea
									value={prompt}
									onChange={(e) => setPrompt(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											canConfirm && handleConfirm();
										}
									}}
									placeholder={
										pending.type === "seoAudit"
											? "Focus on: keywords, meta, structure…"
											: pending.type === "competitor"
												? "Compare against which competitors?"
												: pending.type === "twitter"
													? "Key insight or angle for the thread…"
													: pending.type === "newsletter"
														? "Topic, tone, target audience…"
														: pending.type === "infographic"
															? "What data or concept to visualise?"
															: pending.type === "table"
																? "What to compare and which metrics?"
																: "Describe the angle, tone, key points…"
									}
									rows={3}
									style={{
										width: "100%",
										boxSizing: "border-box",
										resize: "none",
										background: "rgba(255,255,255,0.04)",
										border: `1px solid ${prompt.trim() ? cfg.color + "50" : "rgba(255,255,255,0.09)"}`,
										borderRadius: 8,
										padding: "8px 10px",
										color: "#dce2f4",
										fontSize: 11.5,
										outline: "none",
										fontFamily: "'Courier New',monospace",
										lineHeight: 1.6,
										transition: "border-color 0.15s",
									}}
								/>
								<div
									style={{
										fontSize: 8.5,
										fontFamily: "'Courier New',monospace",
										color: "rgba(255,255,255,0.18)",
										marginTop: 4,
									}}
								>
									↵ confirm · esc cancel
								</div>
							</div>

							{/* Confirm button */}
							<motion.button
								onClick={handleConfirm}
								disabled={!canConfirm}
								whileHover={canConfirm ? { scale: 1.02 } : {}}
								whileTap={canConfirm ? { scale: 0.97 } : {}}
								style={{
									width: "100%",
									background: canConfirm
										? `linear-gradient(135deg, ${cfg.color}, ${cfg.color}bb)`
										: "rgba(255,255,255,0.05)",
									border: canConfirm
										? `1px solid ${cfg.color}`
										: "1px solid rgba(255,255,255,0.07)",
									borderRadius: 8,
									padding: "9px",
									color: canConfirm ? "#fff" : "rgba(255,255,255,0.2)",
									cursor: canConfirm ? "pointer" : "default",
									fontSize: 11.5,
									fontWeight: 600,
									fontFamily: "'Courier New',monospace",
									transition: "all 0.15s",
									letterSpacing: 0.5,
								}}
							>
								Generate {cfg.label} →
							</motion.button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════
// CANVAS SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function EdgePath({ edge, nodes, isPending }) {
	const src = nodes.find((n) => n.id === edge.from),
		dst = nodes.find((n) => n.id === edge.to);
	if (!src || !dst) return null;
	const color = C[src.type]?.color || "#fff";
	const x1 = src.x + NW,
		y1 = src.y + NH / 2,
		x2 = dst.x,
		y2 = dst.y + NH / 2;
	const mx = x1 + (x2 - x1) * 0.5;
	const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
	return (
		<g opacity={isPending ? 0.3 : 1} style={{ transition: "opacity 0.3s" }}>
			<path
				d={d}
				fill="none"
				stroke={color}
				strokeWidth={2}
				strokeOpacity={0.13}
			/>
			<path
				d={d}
				fill="none"
				stroke={color}
				strokeWidth={1}
				strokeOpacity={0.22}
				strokeDasharray="6 4"
			/>
		</g>
	);
}

// Animated preview edge — dashed, pulsing, from parent to input card
function PreviewEdge({ fromNode, pan, scale, color, generating }) {
	// Draw in canvas space: from parent right-center toward the pending card
	const x1 = fromNode.x + NW;
	const y1 = fromNode.y + NH / 2;
	// End at card position in canvas coords
	const x2 = fromNode.x + NW + 52;
	const y2 = fromNode.y + NH / 2;
	// Also project a ghost line further right to show where node will land
	const x3 = fromNode.x + NW + 96 + NW;
	const y3 = fromNode.y + NH / 2;
	const mx12 = x1 + (x2 - x1) * 0.5;
	const mx23 = x2 + (x3 - x2) * 0.5;

	return (
		<g>
			{/* Solid short segment to card */}
			<path
				d={`M${x1},${y1} C${mx12},${y1} ${mx12},${y2} ${x2},${y2}`}
				fill="none"
				stroke={color}
				strokeWidth={1.5}
				strokeOpacity={0.7}
			/>
			{/* Ghost dashed segment to where node will land */}
			<path
				d={`M${x2},${y2} C${mx23},${y2} ${mx23},${y3} ${x3},${y3}`}
				fill="none"
				stroke={color}
				strokeWidth={1}
				strokeOpacity={0.22}
				strokeDasharray="5 5"
			/>
			{/* Pulsing dot at card anchor */}
			<circle
				cx={x2}
				cy={y2}
				r={4}
				fill={color}
				opacity={generating ? 1 : 0.7}
			/>
			{/* Ghost node outline */}
			{!generating && (
				<rect
					x={fromNode.x + NW + 96}
					y={fromNode.y}
					width={NW}
					height={NH}
					rx={12}
					fill="none"
					stroke={color}
					strokeWidth={1}
					strokeOpacity={0.1}
					strokeDasharray="4 4"
				/>
			)}
		</g>
	);
}

function NodeCard({
	node,
	isSelected,
	onPointerDown,
	onClick,
	onPrepareSpawn,
	isPending,
}) {
	const cfg = C[node.type];
	if (!cfg) return null;
	return (
		<motion.div
			initial={{ scale: 0.8, opacity: 0, y: 12 }}
			animate={{ scale: 1, opacity: 1, y: 0 }}
			exit={{ scale: 0.85, opacity: 0, y: 8 }}
			transition={{ type: "spring", stiffness: 400, damping: 28 }}
			style={{
				position: "absolute",
				left: node.x,
				top: node.y,
				width: NW,
				userSelect: "none",
				zIndex: isSelected ? 20 : 1,
				opacity: isPending ? 0.5 : 1,
				filter: isPending ? "blur(0.5px)" : "none",
				transition: "opacity 0.2s, filter 0.2s",
				pointerEvents: isPending ? "none" : "auto",
			}}
			onPointerDown={onPointerDown}
		>
			<div
				onClick={onClick}
				style={{
					background: isSelected ? "#13131e" : "#0d0d17",
					border: `1px solid ${isSelected ? cfg.color + "55" : "rgba(255,255,255,0.07)"}`,
					borderRadius: 14,
					overflow: "hidden",
					boxShadow: isSelected
						? `0 0 0 1.5px ${cfg.color}35,0 20px 60px rgba(0,0,0,0.7)`
						: "0 4px 28px rgba(0,0,0,0.5)",
					transition: "border-color 0.18s,box-shadow 0.18s",
					cursor: "pointer",
				}}
			>
				<div
					style={{
						height: 2.5,
						background: `linear-gradient(90deg,${cfg.color},${cfg.color}88)`,
						opacity: isSelected ? 1 : 0.7,
					}}
				/>
				<div
					style={{
						padding: "11px 14px 5px",
						display: "flex",
						alignItems: "center",
						gap: 7,
					}}
				>
					<span style={{ fontSize: 12, color: cfg.color, lineHeight: 1 }}>
						{cfg.icon}
					</span>
					<span
						style={{
							fontSize: 9,
							fontFamily: "'Courier New',monospace",
							color: cfg.color,
							textTransform: "uppercase",
							letterSpacing: 2.5,
							opacity: 0.9,
						}}
					>
						{cfg.label}
					</span>
					{node.fromChat && (
						<span
							style={{
								marginLeft: "auto",
								fontSize: 8,
								fontFamily: "'Courier New',monospace",
								color: "rgba(255,255,255,0.22)",
								letterSpacing: 1,
								border: "1px solid rgba(255,255,255,0.1)",
								borderRadius: 3,
								padding: "1px 5px",
							}}
						>
							from chat
						</span>
					)}
					{node.url && (
						<span
							style={{
								marginLeft: "auto",
								fontSize: 8,
								fontFamily: "'Courier New',monospace",
								color: "rgba(255,255,255,0.22)",
								letterSpacing: 0.5,
								border: "1px solid rgba(255,255,255,0.1)",
								borderRadius: 3,
								padding: "1px 5px",
								maxWidth: 90,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
							}}
							title={node.url}
						>
							⊕ url
						</span>
					)}
				</div>
				<div
					style={{
						padding: "0 14px 7px",
						fontSize: 12.5,
						fontWeight: 600,
						color: "#dce2f4",
						lineHeight: 1.38,
					}}
				>
					{node.title}
				</div>
				<div
					style={{
						padding: "0 14px 12px",
						fontSize: 10.5,
						color: "rgba(255,255,255,0.24)",
						lineHeight: 1.68,
						fontFamily: "'Courier New',monospace",
					}}
				>
					{node.content.slice(0, 108)}…
				</div>

				{/* action chips — now trigger prepare spawn */}
				<div
					style={{
						padding: "8px 14px 11px",
						display: "flex",
						flexWrap: "wrap",
						gap: 5,
						borderTop: "1px solid rgba(255,255,255,0.05)",
					}}
				>
					{cfg.actions.slice(0, 4).map((a) => (
						<button
							key={a}
							onPointerDown={(e) => e.stopPropagation()}
							onClick={(e) => {
								e.stopPropagation();
								onPrepareSpawn(a);
							}}
							style={{
								background: "transparent",
								border: "1px solid rgba(255,255,255,0.09)",
								borderRadius: 5,
								padding: "2px 7px",
								fontSize: 9.5,
								color: C[a]?.color || "#aaa",
								cursor: "pointer",
								fontFamily: "'Courier New',monospace",
								letterSpacing: 0.2,
								transition: "all 0.1s",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background =
									(C[a]?.color || "#fff") + "1a";
								e.currentTarget.style.borderColor = C[a]?.color || "#fff";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = "transparent";
								e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
							}}
						>
							+ {C[a]?.label}
						</button>
					))}
				</div>
			</div>
		</motion.div>
	);
}

function SidePanel({
	node,
	onClose,
	onPrepareSpawn,
	chatVal,
	setChatVal,
	onChat,
}) {
	const cfg = C[node.type];
	return (
		<motion.div
			initial={{ x: 320, opacity: 0 }}
			animate={{ x: 0, opacity: 1 }}
			exit={{ x: 320, opacity: 0 }}
			transition={{ type: "spring", stiffness: 300, damping: 30 }}
			style={{
				position: "fixed",
				right: 0,
				top: 52,
				bottom: 64,
				width: 308,
				background: "#0d0d17",
				borderLeft: "1px solid rgba(255,255,255,0.07)",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				zIndex: 120,
			}}
		>
			<div
				style={{
					height: 2,
					background: `linear-gradient(90deg,${cfg.color},${cfg.color}00)`,
				}}
			/>
			<div
				style={{
					padding: "14px 18px 12px",
					borderBottom: "1px solid rgba(255,255,255,0.05)",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "flex-start",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 7,
							marginBottom: 8,
						}}
					>
						<span style={{ fontSize: 13, color: cfg.color }}>{cfg.icon}</span>
						<span
							style={{
								fontSize: 9,
								fontFamily: "'Courier New',monospace",
								color: cfg.color,
								textTransform: "uppercase",
								letterSpacing: 2.5,
							}}
						>
							{cfg.label}
						</span>
					</div>
					<button
						onClick={onClose}
						style={{
							background: "none",
							border: "none",
							color: "rgba(255,255,255,0.2)",
							cursor: "pointer",
							fontSize: 20,
							padding: 0,
							lineHeight: 1,
						}}
					>
						×
					</button>
				</div>
				<div
					style={{
						fontSize: 13.5,
						fontWeight: 600,
						color: "#dce2f4",
						lineHeight: 1.38,
					}}
				>
					{node.title}
				</div>
				{node.url && (
					<div
						style={{
							marginTop: 6,
							fontSize: 9.5,
							fontFamily: "'Courier New',monospace",
							color: "rgba(255,255,255,0.3)",
							wordBreak: "break-all",
						}}
					>
						⊕ {node.url}
					</div>
				)}
			</div>
			<div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
				<div
					style={{
						fontSize: 11.5,
						color: "rgba(255,255,255,0.4)",
						lineHeight: 1.9,
						fontFamily: "'Courier New',monospace",
						whiteSpace: "pre-wrap",
					}}
				>
					{node.content}
				</div>
			</div>
			<div
				style={{
					padding: "13px 18px",
					borderTop: "1px solid rgba(255,255,255,0.05)",
				}}
			>
				<div
					style={{
						fontSize: 8.5,
						fontFamily: "'Courier New',monospace",
						color: "rgba(255,255,255,0.2)",
						textTransform: "uppercase",
						letterSpacing: 2.5,
						marginBottom: 9,
					}}
				>
					Spawn next asset
				</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
					{cfg.actions.map((a) => (
						<button
							key={a}
							onClick={() => onPrepareSpawn(a)}
							style={{
								background: (C[a]?.color || "#fff") + "11",
								border: `1px solid ${C[a]?.color || "#fff"}30`,
								borderRadius: 7,
								padding: "6px 11px",
								fontSize: 10.5,
								color: C[a]?.color || "#fff",
								cursor: "pointer",
								fontFamily: "'Courier New',monospace",
								display: "flex",
								alignItems: "center",
								gap: 5,
							}}
							onMouseEnter={(e) =>
								(e.currentTarget.style.background =
									(C[a]?.color || "#fff") + "22")
							}
							onMouseLeave={(e) =>
								(e.currentTarget.style.background =
									(C[a]?.color || "#fff") + "11")
							}
						>
							<span style={{ fontSize: 10 }}>{C[a]?.icon}</span>
							{C[a]?.label}
						</button>
					))}
				</div>
			</div>
			<div
				style={{
					padding: "10px 18px 16px",
					borderTop: "1px solid rgba(255,255,255,0.05)",
				}}
			>
				<div style={{ display: "flex", gap: 7 }}>
					<input
						value={chatVal}
						onChange={(e) => setChatVal(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && onChat()}
						placeholder="Describe next asset…"
						style={{
							flex: 1,
							background: "rgba(255,255,255,0.04)",
							border: "1px solid rgba(255,255,255,0.08)",
							borderRadius: 8,
							padding: "7px 11px",
							color: "#dce2f4",
							fontSize: 11.5,
							outline: "none",
							fontFamily: "'Courier New',monospace",
						}}
					/>
					<button
						onClick={onChat}
						style={{
							background: cfg.color,
							border: "none",
							borderRadius: 8,
							padding: "7px 12px",
							color: "#fff",
							cursor: "pointer",
							fontSize: 11.5,
							fontWeight: 600,
							flexShrink: 0,
						}}
					>
						→
					</button>
				</div>
			</div>
		</motion.div>
	);
}

function Minimap({ nodes, edges, pan, scale }) {
	const mmW = 152,
		mmH = 100;
	if (!nodes.length) return null;
	const xs = nodes.flatMap((n) => [n.x, n.x + NW]),
		ys = nodes.flatMap((n) => [n.y, n.y + NH]);
	const minX = Math.min(...xs),
		maxX = Math.max(...xs),
		minY = Math.min(...ys),
		maxY = Math.max(...ys);
	const cW = maxX - minX || 1,
		cH = maxY - minY || 1;
	const s = Math.min((mmW - 10) / cW, (mmH - 10) / cH);
	const ox = (mmW - cW * s) / 2 - minX * s,
		oy = (mmH - cH * s) / 2 - minY * s;
	const vW = (window.innerWidth / scale) * s,
		vH = ((window.innerHeight - 116) / scale) * s;
	const vX = (-pan.x / scale) * s + ox,
		vY = (-pan.y / scale) * s + oy;
	return (
		<div
			style={{
				position: "absolute",
				bottom: 72,
				right: 16,
				width: mmW,
				height: mmH,
				background: "rgba(7,7,9,0.85)",
				border: "1px solid rgba(255,255,255,0.08)",
				borderRadius: 8,
				overflow: "hidden",
				pointerEvents: "none",
				zIndex: 10,
			}}
		>
			<svg width={mmW} height={mmH}>
				{edges.map((e) => {
					const src = nodes.find((n) => n.id === e.from),
						dst = nodes.find((n) => n.id === e.to);
					if (!src || !dst) return null;
					return (
						<line
							key={e.id}
							x1={(src.x + NW / 2) * s + ox}
							y1={(src.y + NH / 2) * s + oy}
							x2={(dst.x + NW / 2) * s + ox}
							y2={(dst.y + NH / 2) * s + oy}
							stroke="rgba(255,255,255,0.1)"
							strokeWidth={0.6}
						/>
					);
				})}
				{nodes.map((n) => (
					<rect
						key={n.id}
						x={n.x * s + ox}
						y={n.y * s + oy}
						width={NW * s}
						height={NH * s}
						rx={2}
						fill={C[n.type]?.color || "#fff"}
						fillOpacity={0.38}
					/>
				))}
				<rect
					x={vX}
					y={vY}
					width={Math.max(vW, 4)}
					height={Math.max(vH, 4)}
					fill="rgba(255,255,255,0.04)"
					stroke="rgba(255,255,255,0.4)"
					strokeWidth={0.7}
					rx={1}
				/>
			</svg>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════
// CANVAS TAB
// ═══════════════════════════════════════════════════════════════════

function CanvasTab({ nodes, setNodes, edges, setEdges }) {
	const [pan, setPan] = useState({ x: 100, y: 80 });
	const [scale, setScale] = useState(0.85);
	const [selected, setSelected] = useState(null);
	const [showPanel, setShowPanel] = useState(false);
	const [panelChat, setPanelChat] = useState("");
	const [chat, setChat] = useState("");

	// pendingSpawn: { type, fromNode, generating }  — null when idle
	const [pendingSpawn, setPendingSpawn] = useState(null);

	const dragRef = useRef(null);
	const panRef = useRef(null);
	const wasDragRef = useRef(false);
	const containerRef = useRef(null);

	const onNodePointerDown = useCallback((e, node) => {
		e.stopPropagation();
		wasDragRef.current = false;
		dragRef.current = {
			id: node.id,
			sx: e.clientX,
			sy: e.clientY,
			ox: node.x,
			oy: node.y,
		};
	}, []);

	const onBgPointerDown = useCallback(
		(e) => {
			if (pendingSpawn) {
				setPendingSpawn(null);
				return;
			}
			wasDragRef.current = false;
			panRef.current = { sx: e.clientX, sy: e.clientY, opx: pan.x, opy: pan.y };
		},
		[pan, pendingSpawn],
	);

	const onPointerMove = useCallback(
		(e) => {
			if (dragRef.current) {
				const { id, sx, sy, ox, oy } = dragRef.current;
				const dx = (e.clientX - sx) / scale,
					dy = (e.clientY - sy) / scale;
				if (Math.abs(dx) + Math.abs(dy) > 4) wasDragRef.current = true;
				setNodes((p) =>
					p.map((n) => (n.id === id ? { ...n, x: ox + dx, y: oy + dy } : n)),
				);
			} else if (panRef.current) {
				const { sx, sy, opx, opy } = panRef.current;
				const dx = e.clientX - sx,
					dy = e.clientY - sy;
				if (Math.abs(dx) + Math.abs(dy) > 4) wasDragRef.current = true;
				setPan({ x: opx + dx, y: opy + dy });
			}
		},
		[scale],
	);

	const onPointerUp = useCallback(() => {
		dragRef.current = null;
		panRef.current = null;
		setTimeout(() => {
			wasDragRef.current = false;
		}, 60);
	}, []);

	const onWheel = useCallback((e) => {
		e.preventDefault();
		const rect = containerRef.current?.getBoundingClientRect();
		if (!rect) return;
		const mx = e.clientX - rect.left,
			my = e.clientY - rect.top;
		const factor = e.deltaY < 0 ? 1.1 : 0.9;
		setScale((prev) => {
			const next = Math.min(Math.max(prev * factor, 0.2), 3);
			const r = next / prev;
			setPan((p) => ({ x: mx - r * (mx - p.x), y: my - r * (my - p.y) }));
			return next;
		});
	}, []);

	useEffect(() => {
		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
		return () => {
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
		};
	}, [onPointerMove, onPointerUp]);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, [onWheel]);

	// ── Spawn ─────────────────────────────────────────────────────────
	const spawnNode = useCallback(
		(type, fromNode = null, title = null, extraData = {}) => {
			const id = String(++UID);
			let x, y;
			if (fromNode) {
				const cc = edges.filter((e) => e.from === fromNode.id).length;
				x = fromNode.x + NW + 96;
				y = fromNode.y + cc * (NH + 28);
			} else {
				const vpW = window.innerWidth - (showPanel ? 308 : 0);
				x = (-pan.x + vpW / 2) / scale - NW / 2 + (Math.random() - 0.5) * 160;
				y =
					(-pan.y + (window.innerHeight - 116) / 2) / scale -
					NH / 2 +
					(Math.random() - 0.5) * 100;
			}
			const newNode = {
				id,
				type,
				title: title || `New ${C[type]?.label}`,
				x,
				y,
				content: SAMPLE[type] || "",
				parentId: fromNode?.id,
				...extraData,
			};
			setNodes((p) => [...p, newNode]);
			if (fromNode)
				setEdges((p) => [...p, { id: `e${id}`, from: fromNode.id, to: id }]);
			setSelected(id);
			setShowPanel(true);
			return id;
		},
		[edges, pan, scale, showPanel],
	);

	// ── Prepare spawn (opens edge input card) ─────────────────────────
	const prepareSpawn = useCallback((type, fromNode) => {
		setPendingSpawn({ type, fromNode, generating: false });
		// Close side panel so the card is the focus
		setShowPanel(false);
	}, []);

	// ── Confirm spawn (called from EdgeSpawnInput) ────────────────────
	const confirmSpawn = useCallback(
		({ url, prompt }) => {
			if (!pendingSpawn) return;
			const { type, fromNode } = pendingSpawn;

			// Mark as generating → show spinner
			setPendingSpawn((prev) => ({ ...prev, generating: true }));

			// Simulate API delay — replace setTimeout with real fetch later
			setTimeout(() => {
				const effectivePrompt =
					prompt ||
					(url
						? `Create ${C[type]?.label} from ${url}`
						: `Create ${C[type]?.label}`);
				const title = genTitle(type, effectivePrompt);
				const content = genContent(type, effectivePrompt);
				spawnNode(type, fromNode, title, {
					url: url || undefined,
					prompt: effectivePrompt,
					content,
				});
				setPendingSpawn(null);
			}, 1400);
		},
		[pendingSpawn, spawnNode],
	);

	// ── Chat bar submit ────────────────────────────────────────────────
	const handleChatSubmit = () => {
		if (!chat.trim()) return;
		const type = parseType(chat);
		const fromNode = selected ? nodes.find((n) => n.id === selected) : null;
		// Chat bar skips the input gate — URL can be in the prompt text
		const urlMatch = chat.match(/https?:\/\/\S+/);
		spawnNode(
			type,
			fromNode,
			chat.length > 52 ? chat.slice(0, 52) + "…" : chat,
			{
				content: genContent(type, chat),
				url: urlMatch?.[0] || undefined,
			},
		);
		setChat("");
	};

	const selectedNode = nodes.find((n) => n.id === selected);
	const isPending = !!pendingSpawn;

	return (
		<div style={{ position: "absolute", inset: 0, top: 52 }}>
			{/* Canvas area */}
			<div
				ref={containerRef}
				style={{
					position: "absolute",
					inset: 0,
					bottom: 64,
					overflow: "hidden",
					cursor: isPending ? "crosshair" : "grab",
				}}
				onPointerDown={onBgPointerDown}
				onClick={() => {
					if (pendingSpawn) {
						setPendingSpawn(null);
						return;
					}
					if (!wasDragRef.current) {
						setSelected(null);
						setShowPanel(false);
					}
				}}
			>
				{/* Dot grid — dims when spawn input is open */}
				<div
					style={{
						position: "absolute",
						inset: 0,
						backgroundImage:
							"radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px)",
						backgroundSize: "28px 28px",
						pointerEvents: "none",
						opacity: isPending ? 0.4 : 1,
						transition: "opacity 0.3s",
					}}
				/>

				{/* Transform layer */}
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						transformOrigin: "0 0",
						transform: `translate(${pan.x}px,${pan.y}px) scale(${scale})`,
						willChange: "transform",
					}}
					onClick={(e) => e.stopPropagation()}
				>
					<svg
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: 1,
							height: 1,
							overflow: "visible",
							pointerEvents: "none",
							zIndex: 0,
						}}
					>
						{/* Regular edges — dim when a spawn is pending */}
						{edges.map((e) => (
							<EdgePath
								key={e.id}
								edge={e}
								nodes={nodes}
								isPending={isPending}
							/>
						))}
						{/* Preview edge — only when pendingSpawn is set */}
						{pendingSpawn && (
							<PreviewEdge
								fromNode={pendingSpawn.fromNode}
								pan={pan}
								scale={scale}
								color={C[pendingSpawn.type]?.color || "#fff"}
								generating={pendingSpawn.generating}
							/>
						)}
					</svg>

					<AnimatePresence>
						{nodes.map((node) => (
							<NodeCard
								key={node.id}
								node={node}
								isSelected={selected === node.id}
								isPending={isPending && node.id !== pendingSpawn?.fromNode?.id}
								onPointerDown={(e) => {
									if (!isPending) onNodePointerDown(e, node);
								}}
								onClick={(e) => {
									e.stopPropagation();
									if (pendingSpawn) {
										setPendingSpawn(null);
										return;
									}
									if (!wasDragRef.current) {
										setSelected(node.id);
										setShowPanel(true);
									}
								}}
								onPrepareSpawn={(type) => prepareSpawn(type, node)}
							/>
						))}
					</AnimatePresence>
				</div>
			</div>

			{/* Edge spawn input — positioned in fixed screen space */}
			<AnimatePresence>
				{pendingSpawn && (
					<EdgeSpawnInput
						key="edge-input"
						pending={pendingSpawn}
						pan={pan}
						scale={scale}
						onConfirm={confirmSpawn}
						onCancel={() => setPendingSpawn(null)}
					/>
				)}
			</AnimatePresence>

			{/* Hint bar when pending */}
			<AnimatePresence>
				{isPending && !pendingSpawn?.generating && (
					<motion.div
						key="hint"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 8 }}
						style={{
							position: "absolute",
							top: 16,
							left: "50%",
							transform: "translateX(-50%)",
							background: "rgba(5,5,8,0.9)",
							border: "1px solid rgba(255,255,255,0.1)",
							borderRadius: 8,
							padding: "6px 16px",
							fontSize: 10,
							fontFamily: "'Courier New',monospace",
							color: "rgba(255,255,255,0.4)",
							pointerEvents: "none",
							zIndex: 50,
							backdropFilter: "blur(8px)",
						}}
					>
						Fill in the card on the edge to generate ·{" "}
						<span style={{ color: "rgba(255,255,255,0.25)" }}>
							esc to cancel
						</span>
					</motion.div>
				)}
			</AnimatePresence>

			<Minimap nodes={nodes} edges={edges} pan={pan} scale={scale} />

			{/* Legend */}
			<div
				style={{
					position: "absolute",
					bottom: 72,
					left: 16,
					display: "flex",
					flexDirection: "column",
					gap: 3.5,
					pointerEvents: "none",
					zIndex: 10,
				}}
			>
				{Object.entries(C).map(([k, v]) => (
					<div
						key={k}
						style={{ display: "flex", alignItems: "center", gap: 5 }}
					>
						<div
							style={{
								width: 5,
								height: 5,
								borderRadius: "50%",
								background: v.color,
								opacity: 0.65,
							}}
						/>
						<span
							style={{
								fontSize: 8.5,
								fontFamily: "'Courier New',monospace",
								color: "rgba(255,255,255,0.18)",
							}}
						>
							{v.label}
						</span>
					</div>
				))}
			</div>

			{/* Side panel */}
			<AnimatePresence>
				{showPanel && selectedNode && !isPending && (
					<SidePanel
						key={selectedNode.id}
						node={selectedNode}
						onClose={() => {
							setShowPanel(false);
							setSelected(null);
						}}
						onPrepareSpawn={(type) => prepareSpawn(type, selectedNode)}
						chatVal={panelChat}
						setChatVal={setPanelChat}
						onChat={() => {
							if (!panelChat.trim()) return;
							const type = parseType(panelChat);
							spawnNode(type, selectedNode, panelChat.slice(0, 52), {
								content: genContent(type, panelChat),
							});
							setPanelChat("");
						}}
					/>
				)}
			</AnimatePresence>

			{/* Bottom chat bar */}
			<div
				style={{
					position: "absolute",
					bottom: 0,
					left: 0,
					right: 0,
					height: 64,
					background: "rgba(5,5,8,0.94)",
					borderTop: "1px solid rgba(255,255,255,0.06)",
					backdropFilter: "blur(20px)",
					display: "flex",
					alignItems: "center",
					padding: "0 16px",
					gap: 10,
					zIndex: 100,
				}}
			>
				{selectedNode && !isPending ? (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							padding: "3px 10px",
							background: C[selectedNode.type]?.color + "14",
							border: `1px solid ${C[selectedNode.type]?.color}28`,
							borderRadius: 6,
							flexShrink: 0,
						}}
					>
						<span
							style={{
								fontSize: 9.5,
								color: C[selectedNode.type]?.color,
								fontFamily: "'Courier New',monospace",
							}}
						>
							↳ {selectedNode.title.slice(0, 22)}
							{selectedNode.title.length > 22 ? "…" : ""}
						</span>
						<button
							onClick={() => {
								setSelected(null);
								setShowPanel(false);
							}}
							style={{
								background: "none",
								border: "none",
								color: "rgba(255,255,255,0.25)",
								cursor: "pointer",
								fontSize: 13,
								padding: 0,
								lineHeight: 1,
							}}
						>
							×
						</button>
					</div>
				) : (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 5,
							padding: "3px 10px",
							background: "rgba(255,255,255,0.04)",
							border: "1px solid rgba(255,255,255,0.07)",
							borderRadius: 6,
							flexShrink: 0,
						}}
					>
						<span
							style={{
								fontSize: 9.5,
								color: "rgba(255,255,255,0.25)",
								fontFamily: "'Courier New',monospace",
							}}
						>
							{isPending ? "edge input open" : "no context"}
						</span>
					</div>
				)}
				<input
					value={chat}
					onChange={(e) => setChat(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
					disabled={isPending}
					placeholder={
						isPending
							? "Fill in the edge card to generate…"
							: "Paste a URL or describe an asset — blog, newsletter, SEO audit, thread…"
					}
					style={{
						flex: 1,
						background: isPending
							? "rgba(255,255,255,0.02)"
							: "rgba(255,255,255,0.04)",
						border: "1px solid rgba(255,255,255,0.08)",
						borderRadius: 9,
						padding: "9px 14px",
						color: isPending ? "rgba(255,255,255,0.3)" : "#dce2f4",
						fontSize: 12.5,
						outline: "none",
						fontFamily: "'Courier New',monospace",
						cursor: isPending ? "not-allowed" : "text",
					}}
				/>
				<button
					onClick={handleChatSubmit}
					disabled={isPending}
					style={{
						background: isPending ? "rgba(255,255,255,0.05)" : "#ff6b35",
						border: "none",
						borderRadius: 9,
						padding: "9px 20px",
						color: isPending ? "rgba(255,255,255,0.2)" : "#fff",
						cursor: isPending ? "not-allowed" : "pointer",
						fontSize: 12.5,
						fontWeight: 600,
						flexShrink: 0,
					}}
				>
					Create →
				</button>
			</div>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════
// CHAT TAB
// ═══════════════════════════════════════════════════════════════════

const AI_INTROS = [
	"On it. Analysing your request…",
	"Got it — generating now.",
	"Sure. Let me put that together.",
	"Working on it.",
];
const AI_OUTROS = [
	"Done. You can expand the asset, spawn follow-ups, or send it to the canvas.",
	"Here it is. Hit any action chip to keep building.",
	"Created. Want to chain a newsletter or thread from this?",
	"That's ready. Continue from here or push it to the canvas.",
];
const buildAIReply = (type, title, content) => ({
	intro: AI_INTROS[Math.floor(Math.random() * AI_INTROS.length)],
	asset: { type, title, content },
	outro: AI_OUTROS[Math.floor(Math.random() * AI_OUTROS.length)],
});

function ChatAssetCard({ asset, onAction, onSendToCanvas }) {
	const cfg = C[asset.type];
	if (!cfg) return null;
	const [expanded, setExpanded] = useState(false);
	return (
		<motion.div
			initial={{ opacity: 0, y: 8, scale: 0.97 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ type: "spring", stiffness: 340, damping: 26 }}
			style={{
				background: "#0d0d17",
				border: `1px solid ${cfg.color}30`,
				borderRadius: 12,
				overflow: "hidden",
				marginTop: 6,
				marginBottom: 2,
				maxWidth: 480,
			}}
		>
			<div
				style={{
					height: 2,
					background: `linear-gradient(90deg,${cfg.color},${cfg.color}55)`,
				}}
			/>
			<div
				style={{
					padding: "10px 14px 0",
					display: "flex",
					alignItems: "center",
					gap: 7,
				}}
			>
				<span style={{ fontSize: 11, color: cfg.color }}>{cfg.icon}</span>
				<span
					style={{
						fontSize: 8.5,
						fontFamily: "'Courier New',monospace",
						color: cfg.color,
						textTransform: "uppercase",
						letterSpacing: 2.2,
					}}
				>
					{cfg.label}
				</span>
				<div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
					<button
						onClick={onSendToCanvas}
						style={{
							background: "rgba(255,255,255,0.05)",
							border: "1px solid rgba(255,255,255,0.1)",
							borderRadius: 5,
							padding: "2px 8px",
							fontSize: 9,
							color: "rgba(255,255,255,0.45)",
							cursor: "pointer",
							fontFamily: "'Courier New',monospace",
						}}
						onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
						onMouseLeave={(e) =>
							(e.currentTarget.style.color = "rgba(255,255,255,0.45)")
						}
					>
						⊕ canvas
					</button>
					<button
						onClick={() => setExpanded((v) => !v)}
						style={{
							background: "rgba(255,255,255,0.05)",
							border: "1px solid rgba(255,255,255,0.1)",
							borderRadius: 5,
							padding: "2px 8px",
							fontSize: 9,
							color: "rgba(255,255,255,0.45)",
							cursor: "pointer",
							fontFamily: "'Courier New',monospace",
						}}
						onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
						onMouseLeave={(e) =>
							(e.currentTarget.style.color = "rgba(255,255,255,0.45)")
						}
					>
						{expanded ? "↑ less" : "↓ more"}
					</button>
				</div>
			</div>
			<div
				style={{
					padding: "6px 14px 4px",
					fontSize: 12.5,
					fontWeight: 600,
					color: "#dce2f4",
					lineHeight: 1.35,
				}}
			>
				{asset.title}
			</div>
			<div
				style={{
					padding: "0 14px 10px",
					fontSize: 10.5,
					color: "rgba(255,255,255,0.3)",
					lineHeight: 1.7,
					fontFamily: "'Courier New',monospace",
					whiteSpace: "pre-wrap",
				}}
			>
				{expanded ? asset.content : asset.content.slice(0, 120) + "…"}
			</div>
			<div
				style={{
					padding: "8px 14px 10px",
					display: "flex",
					flexWrap: "wrap",
					gap: 5,
					borderTop: "1px solid rgba(255,255,255,0.05)",
				}}
			>
				<span
					style={{
						fontSize: 8.5,
						fontFamily: "'Courier New',monospace",
						color: "rgba(255,255,255,0.18)",
						alignSelf: "center",
						letterSpacing: 1,
					}}
				>
					continue →
				</span>
				{cfg.actions.slice(0, 4).map((a) => (
					<button
						key={a}
						onClick={() => onAction(a, asset)}
						style={{
							background: (C[a]?.color || "#fff") + "10",
							border: `1px solid ${C[a]?.color || "#fff"}25`,
							borderRadius: 5,
							padding: "3px 8px",
							fontSize: 9.5,
							color: C[a]?.color || "#aaa",
							cursor: "pointer",
							fontFamily: "'Courier New',monospace",
						}}
						onMouseEnter={(e) =>
							(e.currentTarget.style.background =
								(C[a]?.color || "#fff") + "22")
						}
						onMouseLeave={(e) =>
							(e.currentTarget.style.background =
								(C[a]?.color || "#fff") + "10")
						}
					>
						{C[a]?.icon} {C[a]?.label}
					</button>
				))}
			</div>
		</motion.div>
	);
}

function TypingIndicator({ stage }) {
	const stages = ["Thinking…", "Generating asset…", "Finalising…"];
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 10,
				padding: "10px 14px",
				background: "rgba(255,255,255,0.03)",
				border: "1px solid rgba(255,255,255,0.06)",
				borderRadius: 10,
				width: "fit-content",
			}}
		>
			<div style={{ display: "flex", gap: 4 }}>
				{[0, 1, 2].map((i) => (
					<motion.div
						key={i}
						style={{
							width: 5,
							height: 5,
							borderRadius: "50%",
							background: "rgba(255,255,255,0.4)",
						}}
						animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
						transition={{
							duration: 0.9,
							repeat: Infinity,
							delay: i * 0.18,
							ease: "easeInOut",
						}}
					/>
				))}
			</div>
			<span
				style={{
					fontSize: 10.5,
					fontFamily: "'Courier New',monospace",
					color: "rgba(255,255,255,0.3)",
				}}
			>
				{stages[stage] || "Working…"}
			</span>
		</div>
	);
}

function StreamText({ text, onDone }) {
	const [shown, setShown] = useState("");
	useEffect(() => {
		let i = 0;
		const words = text.split(" ");
		const iv = setInterval(() => {
			i++;
			setShown(words.slice(0, i * 3).join(" "));
			if (i * 3 >= words.length) {
				clearInterval(iv);
				setShown(text);
				onDone && onDone();
			}
		}, 28);
		return () => clearInterval(iv);
	}, [text]);
	return <span>{shown}</span>;
}

const WELCOME = {
	id: "sys-0",
	role: "assistant",
	parts: [
		{
			type: "text",
			text: "Hey Shrey. I'm your Inkgest agent — tell me a URL or describe what you want to create. I'll generate the asset right here in chat, and you can chain, expand, or push anything to the canvas.",
			stream: false,
		},
		{
			type: "text",
			text: 'Try: "write a blog post about scrapefast" or "SEO audit ihatereading.in" or "competitor analysis vs hashnode"',
		},
	],
};

const QUICK_PROMPTS = [
	"Blog: scrapefast launch announcement",
	"SEO audit for ihatereading.in",
	"Twitter thread on Hono.js vs Express",
	"Competitor analysis vs hashnode",
	"Newsletter: dev tools roundup 2026",
	"Infographic: SaaS pricing models",
];

function ChatTab({ nodes, setNodes, edges, setEdges, onSwitchToCanvas }) {
	const [messages, setMessages] = useState([WELCOME]);
	const [input, setInput] = useState("");
	const [thinking, setThinking] = useState(false);
	const [thinkStage, setThinkStage] = useState(0);
	const scrollRef = useRef(null);
	const inputRef = useRef(null);

	useEffect(() => {
		if (scrollRef.current)
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
	}, [messages, thinking]);

	const sendToCanvas = (asset) => {
		const id = String(++UID);
		const x = 100 + (nodes.length % 4) * 320,
			y = 100 + Math.floor(nodes.length / 4) * 240;
		setNodes((p) => [
			...p,
			{
				id,
				type: asset.type,
				title: asset.title,
				content: asset.content,
				x,
				y,
				fromChat: true,
			},
		]);
		setMessages((p) => [
			...p,
			{
				id: `sys-${Date.now()}`,
				role: "system",
				text: `"${asset.title.slice(0, 36)}${asset.title.length > 36 ? "…" : ""}" added to canvas →`,
			},
		]);
	};

	const handleAction = (type, parentAsset) => {
		triggerGeneration(
			`Create a ${C[type]?.label} from "${parentAsset.title}"`,
			type,
		);
	};

	const triggerGeneration = (prompt, forcedType = null) => {
		if (!prompt.trim()) return;
		setMessages((p) => [
			...p,
			{ id: `u-${Date.now()}`, role: "user", text: prompt },
		]);
		setInput("");
		setThinking(true);
		setThinkStage(0);
		const t1 = setTimeout(() => setThinkStage(1), 700),
			t2 = setTimeout(() => setThinkStage(2), 1400);
		setTimeout(() => {
			clearTimeout(t1);
			clearTimeout(t2);
			setThinking(false);
			const type = forcedType || parseType(prompt);
			const title = genTitle(type, prompt),
				content = genContent(type, prompt);
			const reply = buildAIReply(type, title, content);
			setMessages((p) => [
				...p,
				{
					id: `a-${Date.now()}`,
					role: "assistant",
					parts: [
						{ type: "text", text: reply.intro, stream: true },
						{ type: "asset", asset: { type, title, content } },
						{ type: "text", text: reply.outro },
					],
				},
			]);
		}, 2000);
	};

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				top: 52,
				display: "flex",
				background: "#070709",
			}}
		>
			{/* Sidebar */}
			<div
				style={{
					width: 220,
					borderRight: "1px solid rgba(255,255,255,0.06)",
					display: "flex",
					flexDirection: "column",
					flexShrink: 0,
					overflowY: "auto",
				}}
			>
				<div
					style={{
						padding: "14px 14px 10px",
						borderBottom: "1px solid rgba(255,255,255,0.05)",
					}}
				>
					<div
						style={{
							fontSize: 8.5,
							fontFamily: "'Courier New',monospace",
							color: "rgba(255,255,255,0.2)",
							textTransform: "uppercase",
							letterSpacing: 2,
							marginBottom: 10,
						}}
					>
						Quick create
					</div>
					{QUICK_PROMPTS.map((p, i) => (
						<button
							key={i}
							onClick={() => triggerGeneration(p)}
							style={{
								display: "block",
								width: "100%",
								textAlign: "left",
								background: "transparent",
								border: "none",
								padding: "6px 8px",
								fontSize: 10.5,
								color: "rgba(255,255,255,0.35)",
								cursor: "pointer",
								fontFamily: "'Courier New',monospace",
								lineHeight: 1.5,
								borderRadius: 5,
								marginBottom: 2,
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = "rgba(255,255,255,0.05)";
								e.currentTarget.style.color = "rgba(255,255,255,0.7)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = "transparent";
								e.currentTarget.style.color = "rgba(255,255,255,0.35)";
							}}
						>
							{p}
						</button>
					))}
				</div>
				<div
					style={{
						padding: "12px 14px",
						borderBottom: "1px solid rgba(255,255,255,0.05)",
					}}
				>
					<div
						style={{
							fontSize: 8.5,
							fontFamily: "'Courier New',monospace",
							color: "rgba(255,255,255,0.2)",
							textTransform: "uppercase",
							letterSpacing: 2,
							marginBottom: 9,
						}}
					>
						Asset types
					</div>
					{Object.entries(C).map(([k, v]) => (
						<button
							key={k}
							onClick={() => triggerGeneration(`Create a ${v.label}`)}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 7,
								width: "100%",
								background: "transparent",
								border: "none",
								padding: "5px 8px",
								cursor: "pointer",
								borderRadius: 5,
								marginBottom: 1,
							}}
							onMouseEnter={(e) =>
								(e.currentTarget.style.background = "rgba(255,255,255,0.04)")
							}
							onMouseLeave={(e) =>
								(e.currentTarget.style.background = "transparent")
							}
						>
							<span
								style={{
									fontSize: 10,
									color: v.color,
									width: 14,
									textAlign: "center",
								}}
							>
								{v.icon}
							</span>
							<span
								style={{
									fontSize: 10.5,
									color: "rgba(255,255,255,0.3)",
									fontFamily: "'Courier New',monospace",
								}}
							>
								{v.label}
							</span>
						</button>
					))}
				</div>
				<div style={{ padding: "12px 14px", marginTop: "auto" }}>
					<button
						onClick={onSwitchToCanvas}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 7,
							width: "100%",
							background: "rgba(255,107,53,0.08)",
							border: "1px solid rgba(255,107,53,0.2)",
							borderRadius: 7,
							padding: "8px 12px",
							cursor: "pointer",
						}}
						onMouseEnter={(e) =>
							(e.currentTarget.style.background = "rgba(255,107,53,0.15)")
						}
						onMouseLeave={(e) =>
							(e.currentTarget.style.background = "rgba(255,107,53,0.08)")
						}
					>
						<span style={{ fontSize: 11, color: "#ff6b35" }}>⊞</span>
						<span
							style={{
								fontSize: 10.5,
								color: "#ff6b35",
								fontFamily: "'Courier New',monospace",
							}}
						>
							View canvas ({nodes.length} nodes)
						</span>
					</button>
				</div>
			</div>

			{/* Messages */}
			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					minWidth: 0,
				}}
			>
				<div
					ref={scrollRef}
					style={{
						flex: 1,
						overflowY: "auto",
						padding: "20px 28px 10px",
						display: "flex",
						flexDirection: "column",
						gap: 0,
					}}
				>
					{messages.map((msg, mi) => (
						<div
							key={msg.id}
							style={{ marginBottom: msg.role === "system" ? 8 : 16 }}
						>
							{msg.role === "system" && (
								<motion.div
									initial={{ opacity: 0, y: 4 }}
									animate={{ opacity: 1, y: 0 }}
									style={{
										textAlign: "center",
										fontSize: 9.5,
										fontFamily: "'Courier New',monospace",
										color: "rgba(255,255,255,0.2)",
										padding: "3px 0",
									}}
								>
									✓ {msg.text}
									<button
										onClick={onSwitchToCanvas}
										style={{
											background: "none",
											border: "none",
											color: "#ff6b35",
											cursor: "pointer",
											fontSize: 9.5,
											fontFamily: "'Courier New',monospace",
											marginLeft: 4,
											textDecoration: "underline",
										}}
									>
										open canvas
									</button>
								</motion.div>
							)}
							{msg.role === "user" && (
								<motion.div
									initial={{ opacity: 0, x: 10 }}
									animate={{ opacity: 1, x: 0 }}
									style={{ display: "flex", justifyContent: "flex-end" }}
								>
									<div
										style={{
											background: "rgba(255,107,53,0.12)",
											border: "1px solid rgba(255,107,53,0.2)",
											borderRadius: "12px 12px 2px 12px",
											padding: "9px 14px",
											maxWidth: 380,
											fontSize: 12.5,
											color: "rgba(255,255,255,0.75)",
											lineHeight: 1.6,
											fontFamily: "'Courier New',monospace",
										}}
									>
										{msg.text}
									</div>
								</motion.div>
							)}
							{msg.role === "assistant" && (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
								>
									<div
										style={{
											width: 26,
											height: 26,
											borderRadius: "50%",
											background: "linear-gradient(135deg,#ff6b35,#a855f7)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											marginTop: 2,
										}}
									>
										<span
											style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}
										>
											I
										</span>
									</div>
									<div style={{ flex: 1, minWidth: 0 }}>
										{msg.parts?.map((part, pi) => (
											<div
												key={pi}
												style={{ marginBottom: part.type === "asset" ? 4 : 6 }}
											>
												{part.type === "text" && (
													<div
														style={{
															fontSize: 12.5,
															color: "rgba(255,255,255,0.58)",
															lineHeight: 1.75,
														}}
													>
														{part.stream &&
														pi === 0 &&
														mi === messages.length - 1 ? (
															<StreamText text={part.text} />
														) : (
															part.text
														)}
													</div>
												)}
												{part.type === "asset" && (
													<ChatAssetCard
														asset={part.asset}
														onAction={handleAction}
														onSendToCanvas={() => sendToCanvas(part.asset)}
													/>
												)}
											</div>
										))}
									</div>
								</motion.div>
							)}
						</div>
					))}
					{thinking && (
						<motion.div
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
						>
							<div
								style={{
									width: 26,
									height: 26,
									borderRadius: "50%",
									background: "linear-gradient(135deg,#ff6b35,#a855f7)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									flexShrink: 0,
								}}
							>
								<span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>
									I
								</span>
							</div>
							<TypingIndicator stage={thinkStage} />
						</motion.div>
					)}
				</div>

				{/* Input bar */}
				<div
					style={{
						padding: "12px 28px 16px",
						borderTop: "1px solid rgba(255,255,255,0.06)",
					}}
				>
					<div
						style={{
							display: "flex",
							gap: 8,
							background: "rgba(255,255,255,0.03)",
							border: "1px solid rgba(255,255,255,0.08)",
							borderRadius: 12,
							padding: "6px 6px 6px 14px",
						}}
					>
						<input
							ref={inputRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) =>
								e.key === "Enter" && !e.shiftKey && triggerGeneration(input)
							}
							placeholder="Ask Inkgest to create an asset, audit a URL, analyse competitors…"
							disabled={thinking}
							style={{
								flex: 1,
								background: "transparent",
								border: "none",
								color: "#dce2f4",
								fontSize: 12.5,
								outline: "none",
								fontFamily: "'Courier New',monospace",
								lineHeight: 1.5,
							}}
						/>
						<button
							onClick={() => triggerGeneration(input)}
							disabled={!input.trim() || thinking}
							style={{
								background:
									input.trim() && !thinking
										? "#ff6b35"
										: "rgba(255,255,255,0.06)",
								border: "none",
								borderRadius: 8,
								padding: "8px 18px",
								color:
									input.trim() && !thinking ? "#fff" : "rgba(255,255,255,0.2)",
								cursor: input.trim() && !thinking ? "pointer" : "default",
								fontSize: 12,
								fontWeight: 600,
								flexShrink: 0,
								transition: "all 0.15s",
							}}
						>
							{thinking ? "…" : "Send"}
						</button>
					</div>
					<div
						style={{ marginTop: 7, display: "flex", gap: 5, flexWrap: "wrap" }}
					>
						{[
							"Blog from URL",
							"SEO audit",
							"Twitter thread",
							"Newsletter",
							"Competitor analysis",
						].map((q) => (
							<button
								key={q}
								onClick={() => {
									setInput(q);
									inputRef.current?.focus();
								}}
								style={{
									background: "transparent",
									border: "1px solid rgba(255,255,255,0.07)",
									borderRadius: 5,
									padding: "2px 8px",
									fontSize: 9.5,
									color: "rgba(255,255,255,0.25)",
									cursor: "pointer",
									fontFamily: "'Courier New',monospace",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
									e.currentTarget.style.color = "rgba(255,255,255,0.55)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
									e.currentTarget.style.color = "rgba(255,255,255,0.25)";
								}}
							>
								{q}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════

export default function InkgestApp() {
	const [tab, setTab] = useState("canvas");
	const [nodes, setNodes] = useState(INIT_NODES);
	const [edges, setEdges] = useState(INIT_EDGES);
	const chatAssetCount = useMemo(
		() => nodes.filter((n) => n.fromChat).length,
		[nodes],
	);

	return (
		<div
			style={{
				width: "100%",
				height: "100vh",
				background: "#070709",
				overflow: "hidden",
				position: "relative",
				fontFamily: "system-ui,-apple-system,sans-serif",
			}}
		>
			{/* Navbar */}
			<div
				style={{
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					height: 52,
					background: "rgba(5,5,8,0.94)",
					borderBottom: "1px solid rgba(255,255,255,0.06)",
					backdropFilter: "blur(20px)",
					display: "flex",
					alignItems: "center",
					padding: "0 20px",
					gap: 0,
					zIndex: 300,
				}}
			>
				<div
					style={{
						fontSize: 14.5,
						fontWeight: 700,
						letterSpacing: -0.3,
						marginRight: 6,
					}}
				>
					<span style={{ color: "#fff" }}>ink</span>
					<span style={{ color: "#ff6b35" }}>gest</span>
				</div>
				<div
					style={{
						width: 1,
						height: 16,
						background: "rgba(255,255,255,0.1)",
						marginRight: 16,
					}}
				/>
				<div
					style={{
						display: "flex",
						gap: 2,
						background: "rgba(255,255,255,0.04)",
						borderRadius: 8,
						padding: "3px",
					}}
				>
					{[
						{ id: "canvas", label: "⊞ Canvas" },
						{ id: "chat", label: "⟡ Agent chat" },
					].map((t) => (
						<button
							key={t.id}
							onClick={() => setTab(t.id)}
							style={{
								background:
									tab === t.id ? "rgba(255,255,255,0.09)" : "transparent",
								border: "none",
								borderRadius: 6,
								padding: "5px 14px",
								fontSize: 11,
								color: tab === t.id ? "#dce2f4" : "rgba(255,255,255,0.3)",
								cursor: "pointer",
								fontFamily: "'Courier New',monospace",
								letterSpacing: 0.3,
								transition: "all 0.15s",
								position: "relative",
							}}
						>
							{t.label}
							{t.id === "canvas" && chatAssetCount > 0 && (
								<span
									style={{
										position: "absolute",
										top: 2,
										right: 4,
										background: "#ff6b35",
										borderRadius: "50%",
										width: 14,
										height: 14,
										fontSize: 8,
										color: "#fff",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontFamily: "system-ui",
									}}
								>
									{chatAssetCount}
								</span>
							)}
						</button>
					))}
				</div>

				{tab === "canvas" && (
					<>
						<div
							style={{
								width: 1,
								height: 16,
								background: "rgba(255,255,255,0.1)",
								margin: "0 12px",
							}}
						/>
						<div style={{ display: "flex", gap: 5 }}>
							{["blog", "newsletter", "twitter", "seoAudit"].map((t) => (
								<button
									key={t}
									onClick={() =>
										setNodes((p) => [
											...p,
											{
												id: String(++UID),
												type: t,
												title: `New ${C[t]?.label}`,
												x: 80 + p.length * 60,
												y: 60 + p.length * 40,
												content: SAMPLE[t] || "",
											},
										])
									}
									style={{
										background: (C[t]?.color || "#fff") + "12",
										border: `1px solid ${C[t]?.color || "#fff"}25`,
										borderRadius: 5,
										padding: "3px 9px",
										fontSize: 9.5,
										color: C[t]?.color || "#fff",
										cursor: "pointer",
										fontFamily: "'Courier New',monospace",
									}}
								>
									{C[t]?.icon} {C[t]?.label}
								</button>
							))}
						</div>
					</>
				)}

				<div style={{ marginLeft: "auto" }}>
					<span
						style={{
							fontSize: 9,
							fontFamily: "'Courier New',monospace",
							color: "rgba(255,255,255,0.15)",
						}}
					>
						{nodes.length} nodes · {edges.length} edges
					</span>
				</div>
			</div>

			{/* Views */}
			<AnimatePresence mode="wait">
				{tab === "canvas" && (
					<motion.div
						key="canvas"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						style={{ position: "absolute", inset: 0, top: 52 }}
					>
						<CanvasTab
							nodes={nodes}
							setNodes={setNodes}
							edges={edges}
							setEdges={setEdges}
						/>
					</motion.div>
				)}
				{tab === "chat" && (
					<motion.div
						key="chat"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						style={{ position: "absolute", inset: 0, top: 52 }}
					>
						<ChatTab
							nodes={nodes}
							setNodes={setNodes}
							edges={edges}
							setEdges={setEdges}
							onSwitchToCanvas={() => setTab("canvas")}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
