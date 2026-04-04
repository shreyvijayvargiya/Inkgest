import {
	useState,
	useRef,
	useCallback,
	useEffect,
	useMemo,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../config/firebase";
import { requestGenerate } from "../api/generateClient";
import { persistGenerateResponse } from "../utils/persistGenerateResponse";
import { deductCredits } from "../api/deductCredits";
import { taskTitleForType } from "../config/generateAssets";
import {
	mergeCanvasNodesFromAssets,
	getDefaultStarterNode,
} from "../utils/canvasNodesFromAssets";
import {
	listCanvasProjects,
	createCanvasProject,
	addAssetToCanvasProject,
	saveCanvasEdges,
} from "../api/canvasProjects";
import { regenerateAsset } from "../utils/regenerateAsset";

const NW = 280;
const NH = 188;

/** UI keys → POST /generate/:type (matches Hono ASSET_SKILL_MAP) */
const SPAWN_TO_API = {
	blog: "blog",
	newsletter: "newsletter",
	twitter: "twitter",
	infographics: "infographics",
	table: "table",
	article: "article",
	linkedin: "linkedin",
	landingPage: "landing-page",
	imageGallery: "image-gallery",
	infographicsSvg: "infographics",
	imageReading: "image-reading",
};

function buildCanvasConfig(T) {
	return {
		blog: {
			label: "Blog",
			icon: "✦",
			color: T.warm,
			actions: [
				"newsletter",
				"twitter",
				"landingPage",
				"imageGallery",
				"infographicsSvg",
				"table",
			],
		},
		newsletter: {
			label: "Newsletter",
			icon: "◈",
			color: "#7c3aed",
			actions: ["blog", "twitter", "linkedin", "landingPage", "imageReading"],
		},
		twitter: {
			label: "Thread",
			icon: "◉",
			color: "#2563eb",
			actions: ["blog", "newsletter", "landingPage", "imageGallery"],
		},
		infographics: {
			label: "Infographics",
			icon: "▣",
			color: "#db2777",
			actions: ["blog", "infographicsSvg", "table", "landingPage"],
		},
		table: {
			label: "Table",
			icon: "⊞",
			color: "#0891b2",
			actions: ["blog", "infographics", "infographicsSvg", "article"],
		},
		article: {
			label: "Article",
			icon: "≡",
			color: T.muted,
			actions: ["blog", "twitter", "newsletter", "landingPage"],
		},
		linkedin: {
			label: "LinkedIn",
			icon: "💼",
			color: "#0a66c2",
			actions: ["blog", "newsletter", "landingPage", "imageGallery"],
		},
		landingPage: {
			label: "Landing",
			icon: "🚀",
			color: "#059669",
			actions: ["blog", "newsletter", "imageGallery", "twitter"],
		},
		imageGallery: {
			label: "Gallery",
			icon: "🖼",
			color: "#ea580c",
			actions: ["blog", "landingPage", "twitter", "imageReading"],
		},
		infographicsSvg: {
			label: "SVG graphics",
			icon: "📐",
			color: "#c026d3",
			actions: ["blog", "table", "infographics", "article"],
		},
		imageReading: {
			label: "Image read",
			icon: "👁",
			color: "#64748b",
			actions: ["blog", "newsletter", "imageGallery", "twitter"],
		},
	};
}

const SAMPLE = {
	blog: "Start from the bar below or add a node — each block becomes a generated asset via the same generate API.",
	newsletter: "Weekly digest tone. Short sections, clear headings.",
	twitter: "1/ Hook\n2/ Insight\n3/ CTA",
	infographics: "Visual outline: title, 3–5 bullets, one stat callout.",
	table: "Columns: Item · Notes · Priority — you can refine after generate.",
	article: "Long-form explainer with subheads and citations from your sources.",
	linkedin: "Professional hook, 3 takeaways, soft CTA.",
	landingPage: "Landing page from URLs + brief — hero, sections, CTA, sources.",
	imageGallery: "Gallery spec (JSON images) from page content and image links.",
	infographicsSvg: "SVG infographic panels from analyzed source material.",
	imageReading: "Image-based reading / extraction (backend skill). Add URLs or prompt.",
};

/** Top bar: spawn node types (matches SPAWN_TO_API keys) */
const CANVAS_QUICK_ADD = [
	"blog",
	"newsletter",
	"twitter",
	"table",
	"landingPage",
	"imageGallery",
	"infographicsSvg",
	"imageReading",
];

function normalizeUrls(list) {
	return (Array.isArray(list) ? list : [])
		.map((u) => (typeof u === "string" ? u.trim() : ""))
		.filter((u) => /^https?:\/\//i.test(u));
}

/** True when a pending child can Run using only the parent's generated body (no URL/prompt required). */
function parentIngestAvailable(nodes, childNode) {
	if (!childNode?.parentId) return false;
	const parent = nodes.find((n) => n.id === childNode.parentId);
	if (!parent || parent.pending) return false;
	return Boolean((parent.content || "").trim());
}

function buildPromptForChild({ apiType, parentContent, userLine, C }) {
	const uiKey =
		Object.keys(SPAWN_TO_API).find((k) => SPAWN_TO_API[k] === apiType) || "blog";
	const label = C[uiKey]?.label || apiType;
	const head =
		userLine?.trim() ||
		`Create a ${label} based on the source material below. Keep facts aligned with the source.`;
	if (!parentContent?.trim()) return head;
	return `${head}\n\n--- Source material ---\n${parentContent.slice(0, 14000)}`;
}

function EdgePath({ edge, nodes, C }) {
	const src = nodes.find((n) => n.id === edge.from);
	const dst = nodes.find((n) => n.id === edge.to);
	if (!src || !dst) return null;
	const color = C[src.type]?.color || "#999";
	const x1 = src.x + NW;
	const y1 = src.y + NH / 2;
	const x2 = dst.x;
	const y2 = dst.y + NH / 2;
	const mx = x1 + (x2 - x1) * 0.5;
	return (
		<g>
			<path
				d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
				fill="none"
				stroke={color}
				strokeWidth={2}
				strokeOpacity={0.12}
			/>
			<path
				d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
				fill="none"
				stroke={color}
				strokeWidth={1}
				strokeOpacity={0.2}
				strokeDasharray="6 4"
			/>
		</g>
	);
}

function NodeCard({
	node,
	C,
	T,
	isSelected,
	generatingId,
	onPointerDown,
	onClick,
	onSpawn,
	onDelete,
	canDelete,
	onStop,
	onRegenerate,
	isRegenerating,
}) {
	const cfg = C[node.type];
	if (!cfg) return null;
	const busy = generatingId === node.id;
	const isPending = Boolean(node.pending);
	const assetId = node.tasks?.[0]?.id;
	const canRegen =
		!busy &&
		!isPending &&
		assetId &&
		onRegenerate &&
		!isRegenerating;
	const streamPreview =
		busy && typeof node.content === "string" && node.content.trim().length > 0;
	return (
		<motion.div
			initial={{ scale: 0.96, opacity: 0, y: 8 }}
			animate={{ scale: 1, opacity: 1, y: 0 }}
			exit={{ scale: 0.96, opacity: 0, y: 6 }}
			transition={{ type: "spring", stiffness: 420, damping: 32 }}
			style={{
				position: "absolute",
				left: node.x,
				top: node.y,
				width: NW,
				userSelect: "none",
				zIndex: isSelected ? 20 : 1,
			}}
			onPointerDown={onPointerDown}
		>
			<div
				onClick={onClick}
				style={{
					background: isSelected ? T.surface : T.base,
					border: `1.5px solid ${isSelected ? `${cfg.color}55` : T.border}`,
					borderRadius: 14,
					overflow: "hidden",
					boxShadow: isSelected
						? `0 0 0 1px ${cfg.color}30, 0 16px 40px rgba(0,0,0,0.08)`
						: `0 4px 20px rgba(0,0,0,0.06)`,
					transition: "border-color 0.18s, box-shadow 0.18s",
					cursor: "pointer",
				}}
			>
				<div
					style={{
						height: 3,
						background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}99)`,
						opacity: isSelected ? 1 : 0.75,
					}}
				/>
				<div
					style={{
						padding: "10px 12px 4px",
						display: "flex",
						alignItems: "center",
						gap: 6,
						flexWrap: "nowrap",
					}}
				>
					<span style={{ fontSize: 12, color: cfg.color, lineHeight: 1 }}>
						{cfg.icon}
					</span>
					<span
						style={{
							fontSize: 10,
							fontWeight: 700,
							color: cfg.color,
							textTransform: "uppercase",
							letterSpacing: "0.12em",
						}}
					>
						{cfg.label}
					</span>
					{node.parentId && (
						<span
							style={{
								fontSize: 9,
								color: T.muted,
								letterSpacing: 0.5,
								flexShrink: 0,
							}}
						>
							↳ branch
						</span>
					)}
					<span style={{ flex: 1, minWidth: 8 }} />
					{streamPreview && (
						<span
							style={{
								fontSize: 8,
								fontWeight: 800,
								color: T.warm,
								textTransform: "uppercase",
								letterSpacing: "0.14em",
								flexShrink: 0,
							}}
						>
							Stream
						</span>
					)}
					{busy && onStop && (
						<button
							type="button"
							title="Stop generation"
							onPointerDown={(e) => e.stopPropagation()}
							onClick={(e) => {
								e.stopPropagation();
								onStop();
							}}
							style={{
								flexShrink: 0,
								background: `${T.warm}22`,
								border: `1px solid ${T.border}`,
								borderRadius: 6,
								padding: "1px 6px",
								fontSize: 9,
								fontWeight: 700,
								color: T.warm,
								cursor: "pointer",
							}}
						>
							Stop
						</button>
					)}
					{canRegen && (
						<button
							type="button"
							title="Regenerate asset"
							onPointerDown={(e) => e.stopPropagation()}
							onClick={(e) => {
								e.stopPropagation();
								onRegenerate();
							}}
							style={{
								flexShrink: 0,
								background: `${T.warm}14`,
								border: `1px solid ${T.border}`,
								borderRadius: 6,
								padding: "1px 6px",
								fontSize: 9,
								fontWeight: 700,
								color: T.warm,
								cursor: "pointer",
							}}
						>
							↻
						</button>
					)}
					{isRegenerating && (
						<span
							style={{
								fontSize: 8,
								color: T.muted,
								flexShrink: 0,
							}}
						>
							…
						</span>
					)}
					{!busy && canDelete && onDelete && (
						<button
							type="button"
							title="Remove node"
							onPointerDown={(e) => e.stopPropagation()}
							onClick={(e) => {
								e.stopPropagation();
								onDelete();
							}}
							style={{
								flexShrink: 0,
								background: "transparent",
								border: `1px solid ${T.border}`,
								borderRadius: 6,
								padding: "1px 6px",
								fontSize: 10,
								lineHeight: 1,
								color: T.muted,
								cursor: "pointer",
							}}
						>
							🗑
						</button>
					)}
				</div>
				<div
					style={{
						padding: "0 12px 6px",
						fontSize: 12.5,
						fontWeight: 600,
						color: T.accent,
						lineHeight: 1.35,
					}}
				>
					{busy ? (streamPreview ? "Streaming…" : "Generating…") : node.title}
				</div>
				<div
					style={{
						padding: "0 12px 10px",
						fontSize: 10.5,
						color: T.muted,
						lineHeight: 1.55,
					}}
				>
					{busy
						? streamPreview
							? (
									<>
										{(node.content || "").slice(0, 120)}
										{(node.content || "").length > 120 ? "…" : ""}
									</>
								)
							: "Calling generate API…"
						: (
								<>
									{(node.content || "").slice(0, 120)}
									{(node.content || "").length > 120 ? "…" : ""}
								</>
							)}
				</div>
				{node.tasks?.length > 0 && (
					<div style={{ padding: "0 12px 8px" }}>
						{node.tasks.map((tk) => (
							<a
								key={tk.id}
								href={tk.path}
								onClick={(e) => {
									e.stopPropagation();
								}}
								style={{
									fontSize: 10,
									fontWeight: 600,
									color: T.warm,
									textDecoration: "none",
								}}
							>
								Open {taskTitleForType(tk.type)} →
							</a>
						))}
					</div>
				)}
				<div
					style={{
						padding: "8px 12px 10px",
						display: "flex",
						flexWrap: "wrap",
						gap: 5,
						borderTop: `1px solid ${T.border}`,
					}}
				>
					{cfg.actions.slice(0, 4).map((a) => (
						<button
							key={a}
							type="button"
							onPointerDown={(e) => e.stopPropagation()}
							onClick={(e) => {
								e.stopPropagation();
								if (!busy && !isPending) onSpawn(a);
							}}
							disabled={busy || isPending}
							style={{
								background: "transparent",
								border: `1px solid ${T.border}`,
								borderRadius: 6,
								padding: "2px 7px",
								fontSize: 9.5,
								color: C[a]?.color || T.muted,
								cursor: busy || isPending ? "not-allowed" : "pointer",
								opacity: busy || isPending ? 0.45 : 1,
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
	parentNode,
	C,
	T,
	onClose,
	onSpawn,
	onUpdateDraft,
	onRun,
	canRun,
	generatingId,
	onDelete,
	canDelete,
	onStop,
	onRegenerate,
	regenerating,
}) {
	const cfg = C[node.type];
	if (!cfg) return null;
	const busy = generatingId === node.id;
	const isPending = Boolean(node.pending);
	const assetId = node.tasks?.[0]?.id;
	const canRegenPanel =
		!busy &&
		!isPending &&
		assetId &&
		onRegenerate &&
		!regenerating;
	const streamPreview =
		busy && typeof node.content === "string" && node.content.trim().length > 0;
	const inputStyle = {
		width: "100%",
		background: T.base,
		border: `1px solid ${T.border}`,
		borderRadius: 8,
		padding: "8px 10px",
		color: T.accent,
		fontSize: 12,
		outline: "none",
		boxSizing: "border-box",
	};
	return (
		<motion.div
			initial={{ opacity: 0, x: 16 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: 16 }}
			transition={{ type: "spring", stiffness: 380, damping: 34 }}
			style={{
				width: 320,
				flexShrink: 0,
				alignSelf: "stretch",
				background: T.surface,
				borderLeft: `1px solid ${T.border}`,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				minHeight: 0,
			}}
		>
			<div
				style={{
					height: 3,
					background: `linear-gradient(90deg, ${cfg.color}, transparent)`,
				}}
			/>
			<div
				style={{
					padding: "14px 16px 10px",
					borderBottom: `1px solid ${T.border}`,
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "flex-start",
						gap: 8,
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
						<span style={{ fontSize: 14, color: cfg.color }}>{cfg.icon}</span>
						<span
							style={{
								fontSize: 10,
								fontWeight: 700,
								color: cfg.color,
								textTransform: "uppercase",
								letterSpacing: "0.12em",
							}}
						>
							{cfg.label}
						</span>
						{streamPreview && (
							<span
								style={{
									fontSize: 8,
									fontWeight: 800,
									color: T.warm,
									textTransform: "uppercase",
									letterSpacing: "0.12em",
								}}
							>
								Stream
							</span>
						)}
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
						{busy && onStop && (
							<button
								type="button"
								onClick={onStop}
								style={{
									background: `${T.warm}22`,
									border: `1px solid ${T.border}`,
									borderRadius: 6,
									padding: "2px 8px",
									fontSize: 11,
									fontWeight: 700,
									color: T.warm,
									cursor: "pointer",
								}}
							>
								Stop
							</button>
						)}
						{canRegenPanel && (
							<button
								type="button"
								title="Regenerate asset"
								onClick={onRegenerate}
								style={{
									background: `${T.warm}14`,
									border: `1px solid ${T.border}`,
									borderRadius: 6,
									padding: "2px 8px",
									fontSize: 11,
									fontWeight: 700,
									color: T.warm,
									cursor: "pointer",
									lineHeight: 1,
								}}
							>
								↻ Regenerate
							</button>
						)}
						{regenerating && (
							<span style={{ fontSize: 10, color: T.muted }}>…</span>
						)}
						{canDelete && onDelete && (
							<button
								type="button"
								title="Delete this node"
								onClick={onDelete}
								style={{
									background: "transparent",
									border: `1px solid ${T.border}`,
									borderRadius: 6,
									padding: "2px 8px",
									fontSize: 12,
									color: T.muted,
									cursor: "pointer",
									lineHeight: 1,
								}}
							>
								🗑
							</button>
						)}
						<button
							type="button"
							onClick={onClose}
							style={{
								background: "none",
								border: "none",
								color: T.muted,
								cursor: "pointer",
								fontSize: 20,
								padding: 0,
								lineHeight: 1,
							}}
						>
							×
						</button>
					</div>
				</div>
				<div
					style={{
						fontSize: 14,
						fontWeight: 600,
						color: T.accent,
						lineHeight: 1.35,
						marginTop: 6,
					}}
				>
					{node.title}
				</div>
			</div>

			{isPending ? (
				<>
					<div
						style={{
							padding: "14px 16px",
							borderBottom: `1px solid ${T.border}`,
							flexShrink: 0,
						}}
					>
						{parentNode &&
							!parentNode.pending &&
							(parentNode.content || "").trim() && (
								<div
									style={{
										marginBottom: 12,
										padding: "10px 12px",
										borderRadius: 10,
										background: T.warmBg,
										border: `1px solid ${T.border}`,
										fontSize: 11,
										color: T.accent,
										lineHeight: 1.5,
									}}
								>
									<strong style={{ display: "block", marginBottom: 6 }}>
										Parent asset → this prompt
									</strong>
									<span style={{ color: T.muted }}>
										The connected parent&apos;s output is sent as source material to
										the model. You can Run with that alone, or add a URL / extra
										instructions below.
									</span>
									<details style={{ marginTop: 8 }}>
										<summary
											style={{
												cursor: "pointer",
												fontSize: 10,
												fontWeight: 600,
												color: T.warm,
											}}
										>
											Preview parent text
										</summary>
										<pre
											style={{
												marginTop: 8,
												fontSize: 10,
												color: T.muted,
												whiteSpace: "pre-wrap",
												wordBreak: "break-word",
												maxHeight: 160,
												overflow: "auto",
												lineHeight: 1.45,
											}}
										>
											{(parentNode.content || "").slice(0, 6000)}
											{(parentNode.content || "").length > 6000 ? "…" : ""}
										</pre>
									</details>
								</div>
							)}
						<label
							style={{
								display: "block",
								fontSize: 10,
								fontWeight: 700,
								color: T.muted,
								textTransform: "uppercase",
								letterSpacing: "0.08em",
								marginBottom: 6,
							}}
						>
							Source URL (optional)
						</label>
						<input
							type="url"
							value={node.urlInput ?? ""}
							onChange={(e) => onUpdateDraft({ urlInput: e.target.value })}
							placeholder="https://…"
							disabled={busy}
							style={inputStyle}
						/>
						<label
							style={{
								display: "block",
								fontSize: 10,
								fontWeight: 700,
								color: T.muted,
								textTransform: "uppercase",
								letterSpacing: "0.08em",
								marginTop: 12,
								marginBottom: 6,
							}}
						>
							Prompt (optional)
						</label>
						<textarea
							value={node.promptInput ?? ""}
							onChange={(e) => onUpdateDraft({ promptInput: e.target.value })}
							placeholder="Angle, audience, tone…"
							disabled={busy}
							rows={5}
							style={{
								...inputStyle,
								resize: "vertical",
								minHeight: 100,
								lineHeight: 1.5,
							}}
						/>
						<p style={{ fontSize: 11, color: T.muted, marginTop: 8 }}>
							{parentNode && !parentNode.pending && (parentNode.content || "").trim()
								? "Optional: URL or extra prompt — or Run to use parent output only."
								: "Add at least one URL or a prompt, then Run."}
						</p>
						<motion.button
							type="button"
							whileTap={{ scale: 0.98 }}
							disabled={busy || !canRun}
							onClick={onRun}
							style={{
								marginTop: 12,
								width: "100%",
								padding: "10px 14px",
								borderRadius: 10,
								border: "none",
								background: busy || !canRun ? T.border : cfg.color,
								color: busy || !canRun ? T.muted : "white",
								fontSize: 13,
								fontWeight: 700,
								cursor: busy || !canRun ? "not-allowed" : "pointer",
							}}
						>
							{busy ? "Running…" : "Run"}
						</motion.button>
						{busy && streamPreview && (
							<div
								style={{
									marginTop: 14,
									padding: "10px 12px",
									borderRadius: 10,
									background: T.base,
									border: `1px solid ${T.border}`,
									maxHeight: 220,
									overflow: "auto",
								}}
							>
								<div
									style={{
										fontSize: 9,
										fontWeight: 700,
										color: T.muted,
										textTransform: "uppercase",
										letterSpacing: "0.1em",
										marginBottom: 8,
									}}
								>
									Live stream
								</div>
								<pre
									style={{
										margin: 0,
										fontSize: 11,
										color: T.accent,
										whiteSpace: "pre-wrap",
										wordBreak: "break-word",
										lineHeight: 1.5,
										fontFamily: "inherit",
									}}
								>
									{node.content}
								</pre>
							</div>
						)}
					</div>
					<div style={{ flex: 1, minHeight: 0 }} />
				</>
			) : (
				<>
					<div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
						{busy && streamPreview && (
							<div
								style={{
									fontSize: 9,
									fontWeight: 700,
									color: T.warm,
									textTransform: "uppercase",
									letterSpacing: "0.1em",
									marginBottom: 10,
								}}
							>
								Live stream
							</div>
						)}
						<div
							style={{
								fontSize: 12,
								color: T.muted,
								lineHeight: 1.75,
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
							}}
						>
							{node.content}
						</div>
					</div>
					<div
						style={{
							padding: "12px 16px",
							borderTop: `1px solid ${T.border}`,
						}}
					>
						<div
							style={{
								fontSize: 9,
								fontWeight: 700,
								color: T.muted,
								textTransform: "uppercase",
								letterSpacing: "0.1em",
								marginBottom: 8,
							}}
						>
							Spawn next asset
						</div>
						<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
							{cfg.actions.map((a) => (
								<button
									key={a}
									type="button"
									disabled={busy}
									onClick={() => onSpawn(a)}
									style={{
										background: `${C[a]?.color || T.accent}14`,
										border: `1px solid ${(C[a]?.color || T.accent) + "44"}`,
										borderRadius: 8,
										padding: "6px 10px",
										fontSize: 11,
										color: C[a]?.color || T.accent,
										cursor: busy ? "not-allowed" : "pointer",
										opacity: busy ? 0.5 : 1,
									}}
								>
									{C[a]?.icon} {C[a]?.label}
								</button>
							))}
						</div>
					</div>
				</>
			)}
		</motion.div>
	);
}

function Minimap({
	nodes,
	edges,
	pan,
	scale,
	C,
	T,
	vpW,
	vpH,
	topBar,
	bottomBar,
}) {
	const mmW = 140;
	const mmH = 92;
	if (!nodes.length) return null;
	const xs = nodes.flatMap((n) => [n.x, n.x + NW]);
	const ys = nodes.flatMap((n) => [n.y, n.y + NH]);
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);
	const cW = maxX - minX || 1;
	const cH = maxY - minY || 1;
	const s = Math.min((mmW - 10) / cW, (mmH - 10) / cH);
	const ox = (mmW - cW * s) / 2 - minX * s;
	const oy = (mmH - cH * s) / 2 - minY * s;
	const innerH = Math.max(320, vpH - topBar - bottomBar);
	const vW = (vpW / scale) * s;
	const vH = (innerH / scale) * s;
	const vX = (-pan.x / scale) * s + ox;
	const vY = (-pan.y / scale) * s + oy;
	return (
		<div
			style={{
				position: "absolute",
				bottom: bottomBar + 12,
				right: 12,
				width: mmW,
				height: mmH,
				background: T.surface,
				border: `1px solid ${T.border}`,
				borderRadius: 8,
				overflow: "hidden",
				pointerEvents: "none",
				zIndex: 90,
				boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
			}}
		>
			<svg width={mmW} height={mmH}>
				{edges.map((e) => {
					const src = nodes.find((n) => n.id === e.from);
					const dst = nodes.find((n) => n.id === e.to);
					if (!src || !dst) return null;
					return (
						<line
							key={e.id}
							x1={src.x * s + ox + (NW * s) / 2}
							y1={src.y * s + oy + (NH * s) / 2}
							x2={dst.x * s + ox + (NW * s) / 2}
							y2={dst.y * s + oy + (NH * s) / 2}
							stroke="rgba(0,0,0,0.12)"
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
						fill={C[n.type]?.color || "#999"}
						fillOpacity={0.35}
					/>
				))}
				<rect
					x={vX}
					y={vY}
					width={Math.max(vW, 4)}
					height={Math.max(vH, 4)}
					fill="rgba(0,0,0,0.04)"
					stroke="rgba(0,0,0,0.25)"
					strokeWidth={0.6}
					rx={1}
				/>
			</svg>
		</div>
	);
}

/**
 * Node-based canvas for chained generate/{type} calls — theme matches app (stone/amber).
 */
const CANVAS_HIDDEN_KEY = (uid) =>
	uid ? `inkgest-canvas-hidden-${uid}` : "";

function loadHiddenIds(uid) {
	if (!uid || typeof sessionStorage === "undefined") return new Set();
	try {
		const raw = sessionStorage.getItem(CANVAS_HIDDEN_KEY(uid));
		const arr = raw ? JSON.parse(raw) : [];
		return new Set(Array.isArray(arr) ? arr : []);
	} catch {
		return new Set();
	}
}

function saveHiddenIds(uid, set) {
	if (!uid || typeof sessionStorage === "undefined") return;
	try {
		sessionStorage.setItem(
			CANVAS_HIDDEN_KEY(uid),
			JSON.stringify([...set]),
		);
	} catch {
		/* ignore quota */
	}
}

export default function GenerateCanvasTab({
	theme: T,
	sidebarOpen: _sidebarOpen = false,
	reduxUser,
	router,
	queryClient,
	creditRemaining,
	onLogin,
	format = "substack",
	style = "casual",
	/** User assets from React Query (listAssets) — used to assemble canvas nodes */
	assets = [],
	assetsLoading = false,
}) {
	const C = useMemo(() => buildCanvasConfig(T), [T]);

	const uidRef = useRef(10);
	const dragRef = useRef(null);
	const panRef = useRef(null);
	const wasDragRef = useRef(false);
	const abortMapRef = useRef(new Map());
	const containerRef = useRef(null);
	const prevProjectForEdgesRef = useRef(null);
	const edgesHydratedRef = useRef(false);

	const [nodes, setNodes] = useState(() => [getDefaultStarterNode()]);
	const [hiddenIds, setHiddenIds] = useState(() => new Set());
	const [edges, setEdges] = useState([]);
	const [pan, setPan] = useState({ x: 80, y: 72 });
	const [scale, setScale] = useState(0.9);
	const [selected, setSelected] = useState("1");
	const [showPanel, setShowPanel] = useState(true);
	const [generatingId, setGeneratingId] = useState(null);
	const [genError, setGenError] = useState(null);
	const [vp, setVp] = useState({ w: 1200, h: 800 });
	const [workspaceTab, setWorkspaceTab] = useState("canvas"); // canvas | nodes
	const [bottomUrl, setBottomUrl] = useState("");
	const [bottomPrompt, setBottomPrompt] = useState("");
	const [activeProjectId, setActiveProjectId] = useState(null);
	const [regeneratingAssetId, setRegeneratingAssetId] = useState(null);

	const { data: projects = [] } = useQuery({
		queryKey: ["canvasProjects", reduxUser?.uid],
		queryFn: () => listCanvasProjects(reduxUser.uid),
		enabled: !!reduxUser?.uid,
	});

	const activeProject = useMemo(
		() => projects.find((p) => p.id === activeProjectId),
		[projects, activeProjectId],
	);

	const serverEdgesSig = useMemo(
		() => JSON.stringify(activeProject?.edges ?? []),
		[activeProject],
	);

	const nodeIdsSig = useMemo(
		() => [...nodes.map((n) => n.id)].sort().join(","),
		[nodes],
	);

	const canvasAssetsForMerge = useMemo(() => {
		if (!reduxUser?.uid) return assets || [];
		if (!projects?.length) return assets || [];
		const p = projects.find((x) => x.id === activeProjectId);
		if (!activeProjectId || !p) return assets || [];
		const ids = p.assetIds;
		if (!Array.isArray(ids) || ids.length === 0) return [];
		const set = new Set(ids);
		return (assets || []).filter((a) => set.has(a.id));
	}, [assets, projects, activeProjectId, reduxUser?.uid]);

	useEffect(() => {
		if (!reduxUser?.uid || !projects.length) return;
		const key = `inkgest-active-project-${reduxUser.uid}`;
		setActiveProjectId((prev) => {
			if (prev && projects.some((p) => p.id === prev)) return prev;
			try {
				const stored =
					typeof localStorage !== "undefined"
						? localStorage.getItem(key)
						: null;
				if (stored && projects.some((p) => p.id === stored)) return stored;
			} catch {
				/* ignore */
			}
			return projects[0].id;
		});
	}, [reduxUser?.uid, projects]);

	useEffect(() => {
		if (!reduxUser?.uid || assetsLoading || projects.length > 0) return;
		if (!assets?.length) return;
		(async () => {
			try {
				await createCanvasProject(reduxUser.uid, {
					name: "My workspace",
					assetIds: assets.map((a) => a.id),
				});
				if (queryClient)
					queryClient.invalidateQueries({
						queryKey: ["canvasProjects", reduxUser.uid],
					});
			} catch (e) {
				console.error("[canvas] default project", e);
			}
		})();
	}, [reduxUser?.uid, assets, assetsLoading, projects.length, queryClient]);

	const persistActiveProject = useCallback(
		(id) => {
			setActiveProjectId(id);
			if (reduxUser?.uid && typeof localStorage !== "undefined") {
				try {
					localStorage.setItem(`inkgest-active-project-${reduxUser.uid}`, id);
				} catch {
					/* ignore */
				}
			}
		},
		[reduxUser?.uid],
	);

	const handleNewProject = useCallback(() => {
		if (!reduxUser?.uid) {
			onLogin?.();
			return;
		}
		const name = window.prompt("Project name", "New project");
		if (!name?.trim()) return;
		(async () => {
			const id = await createCanvasProject(reduxUser.uid, {
				name: name.trim(),
				assetIds: [],
			});
			persistActiveProject(id);
			if (queryClient)
				queryClient.invalidateQueries({
					queryKey: ["canvasProjects", reduxUser.uid],
				});
		})().catch((e) => console.error("[canvas] create project", e));
	}, [reduxUser?.uid, onLogin, queryClient, persistActiveProject]);

	const updateNodeField = useCallback((id, patch) => {
		setNodes((prev) =>
			prev.map((n) => (n.id === id ? { ...n, ...patch } : n)),
		);
	}, []);

	const canvasSyncKeyRef = useRef("");

	useEffect(() => {
		if (reduxUser?.uid) setHiddenIds(loadHiddenIds(reduxUser.uid));
		else setHiddenIds(new Set());
	}, [reduxUser?.uid]);

	useEffect(() => {
		if (!reduxUser?.uid) {
			setNodes([getDefaultStarterNode()]);
			setEdges([]);
			setSelected("1");
			canvasSyncKeyRef.current = "";
			edgesHydratedRef.current = false;
			prevProjectForEdgesRef.current = null;
			return;
		}
		if (assetsLoading) return;
		const key = `${[...hiddenIds].sort().join(",")}|${(canvasAssetsForMerge || [])
			.map((a) => a.id)
			.sort()
			.join(",")}`;
		if (key === canvasSyncKeyRef.current) return;
		canvasSyncKeyRef.current = key;
		setNodes((prev) =>
			mergeCanvasNodesFromAssets({
				assets: canvasAssetsForMerge || [],
				prevNodes: prev,
				hiddenIds,
			}),
		);
	}, [reduxUser?.uid, canvasAssetsForMerge, assetsLoading, hiddenIds]);

	/** Load / merge edges from Firestore; keep local-only edges until server has the same pair. */
	useEffect(() => {
		if (!activeProjectId || !activeProject) return;
		const normalized = (Array.isArray(activeProject.edges)
			? activeProject.edges
			: []
		).map((e) => ({
			id: String(e.id || `${e.from}-${e.to}`),
			from: String(e.from),
			to: String(e.to),
		}));
		const ids = new Set(nodes.map((n) => n.id));
		const fromServer = normalized.filter(
			(e) => ids.has(e.from) && ids.has(e.to),
		);
		const switched =
			prevProjectForEdgesRef.current != null &&
			prevProjectForEdgesRef.current !== activeProjectId;
		prevProjectForEdgesRef.current = activeProjectId;
		setEdges((prev) => {
			let next;
			if (switched) {
				next = fromServer;
			} else {
				const serverPairs = new Set(
					fromServer.map((e) => `${e.from}|${e.to}`),
				);
				const localOnly = prev.filter(
					(e) =>
						ids.has(e.from) &&
						ids.has(e.to) &&
						!serverPairs.has(`${e.from}|${e.to}`),
				);
				next = [...fromServer, ...localOnly];
			}
			const stable = (arr) =>
				JSON.stringify(
					[...arr].sort((a, b) => a.id.localeCompare(b.id)),
				);
			if (stable(next) === stable(prev)) return prev;
			return next;
		});
		edgesHydratedRef.current = true;
	}, [activeProjectId, serverEdgesSig, nodeIdsSig, activeProject]);

	useEffect(() => {
		const ids = new Set(nodes.map((n) => n.id));
		setEdges((prev) =>
			prev.filter((e) => ids.has(e.from) && ids.has(e.to)),
		);
	}, [nodes]);

	useEffect(() => {
		if (!edgesHydratedRef.current || !activeProjectId || !reduxUser?.uid)
			return;
		const t = setTimeout(() => {
			saveCanvasEdges(reduxUser.uid, activeProjectId, edges).catch(() => {});
		}, 650);
		return () => clearTimeout(t);
	}, [edges, activeProjectId, reduxUser?.uid]);

	useEffect(() => {
		const fn = () =>
			setVp({ w: window.innerWidth, h: window.innerHeight });
		fn();
		window.addEventListener("resize", fn);
		return () => window.removeEventListener("resize", fn);
	}, []);

	useEffect(() => {
		const n = nodes.find((x) => x.id === selected);
		if (n?.pending) {
			setBottomUrl(n.urlInput ?? "");
			setBottomPrompt(n.promptInput ?? "");
		} else if (!n) {
			setBottomUrl("");
			setBottomPrompt("");
		}
	}, [selected, nodes]);

	/** After deleting a node, `selected` may still point at a removed id — snap to a valid node. */
	useEffect(() => {
		if (selected != null && !nodes.some((n) => n.id === selected)) {
			setSelected(nodes[0]?.id ?? null);
		}
	}, [nodes, selected]);

	const TOP = 52;
	const BOTTOM = 56;

	const runGenerate = useCallback(
		async ({
			nodeId,
			apiType,
			urls,
			promptStr,
			onStreamContent,
		}) => {
			if (!reduxUser) {
				onLogin?.();
				return;
			}
			if (creditRemaining <= 0) {
				router.push("/pricing");
				return;
			}
			setGenError(null);
			setGeneratingId(nodeId);
			const ac = new AbortController();
			abortMapRef.current.set(nodeId, ac);
			let usedLiveStream = false;
			try {
				const idToken = await auth.currentUser?.getIdToken();
				if (!idToken) throw new Error("Session expired. Please sign in again.");

				const { data, streamedText } = await requestGenerate({
					type: apiType,
					idToken,
					urls,
					prompt: promptStr,
					format,
					style,
					signal: ac.signal,
					onStreamText: (full) => {
						usedLiveStream = true;
						onStreamContent?.(full);
					},
				});

				const text =
					streamedText ||
					(typeof data.content === "string"
						? data.content
						: typeof data.result?.content === "string"
							? data.result.content
							: "");

				const nonStreamAssetTypes = new Set([
					"table",
					"infographics",
					"image-gallery",
					"landing-page",
				]);
				if (text && !nonStreamAssetTypes.has(apiType) && !usedLiveStream) {
					onStreamContent?.(text);
				}

				const tasks = await persistGenerateResponse({
					uid: reduxUser.uid,
					generateType: apiType,
					data,
					prompt: promptStr,
					urlList: urls,
					format,
					queryClient: queryClient || null,
				});

				if (tasks.length > 0) {
					deductCredits(idToken, 1);
					if (reduxUser?.uid && queryClient) {
						queueMicrotask(() => {
							queryClient.invalidateQueries({
								queryKey: ["assets", reduxUser.uid],
							});
						});
					}
					if (
						activeProjectId &&
						tasks[0]?.id &&
						reduxUser?.uid
					) {
						addAssetToCanvasProject(
							reduxUser.uid,
							activeProjectId,
							tasks[0].id,
						)
							.then(() => {
								if (queryClient)
									queryClient.invalidateQueries({
										queryKey: ["canvasProjects", reduxUser.uid],
									});
							})
							.catch(() => {});
					}
				}

				let preview =
					text?.trim() ||
					tasks.map((t) => `${t.label} — open in editor`).join("\n") ||
					"Generated.";
				if (
					apiType === "table" ||
					apiType === "infographics" ||
					apiType === "image-gallery" ||
					apiType === "landing-page"
				) {
					preview =
						tasks[0]?.label
							? `${tasks[0].label}\n${preview.slice(0, 400)}`
							: preview;
				}

				const assetId = tasks[0]?.id;
				const newNodeId =
					typeof assetId === "string" && assetId && assetId !== nodeId
						? assetId
						: nodeId;

				setNodes((prev) =>
					prev.map((n) => {
						if (n.id !== nodeId) return n;
						return {
							...n,
							id: newNodeId,
							pending: false,
							urlInput: "",
							promptInput: "",
							content: preview.slice(0, 8000),
							title:
								tasks[0]?.label ||
								n.title ||
								taskTitleForType(apiType),
							tasks,
						};
					}),
				);
				if (newNodeId !== nodeId) {
					setEdges((ePrev) =>
						ePrev.map((e) => ({
							...e,
							from: e.from === nodeId ? newNodeId : e.from,
							to: e.to === nodeId ? newNodeId : e.to,
						})),
					);
					setSelected((sel) => (sel === nodeId ? newNodeId : sel));
				}
			} catch (e) {
				const aborted =
					e?.name === "AbortError" ||
					e?.code === "ABORT_ERR" ||
					/abort/i.test(e?.message || "");
				if (!aborted) setGenError(e?.message || "Generate failed");
			} finally {
				abortMapRef.current.delete(nodeId);
				setGeneratingId(null);
			}
		},
		[
			reduxUser,
			creditRemaining,
			router,
			queryClient,
			format,
			style,
			onLogin,
			activeProjectId,
		],
	);

	const stopGenerate = useCallback((nodeId) => {
		abortMapRef.current.get(nodeId)?.abort();
	}, []);

	const handleRegenerateNode = useCallback(
		async (node) => {
			const assetId = node.tasks?.[0]?.id;
			if (!reduxUser?.uid || !assetId) return;
			if (creditRemaining <= 0) {
				router.push("/pricing");
				return;
			}
			setRegeneratingAssetId(assetId);
			setGenError(null);
			try {
				const idToken = await auth.currentUser?.getIdToken();
				if (!idToken) throw new Error("Session expired. Please sign in again.");
				const ok = await regenerateAsset({
					uid: reduxUser.uid,
					assetId,
					idToken,
					format,
					style,
				});
				if (ok && queryClient) {
					queryClient.invalidateQueries({
						queryKey: ["assets", reduxUser.uid],
					});
				}
			} catch (e) {
				setGenError(e?.message || "Regenerate failed");
			} finally {
				setRegeneratingAssetId(null);
			}
		},
		[reduxUser, creditRemaining, router, format, style, queryClient],
	);

	const deleteNode = useCallback(
		(id) => {
			if (reduxUser?.uid && id !== "1") {
				setHiddenIds((prev) => {
					const next = new Set(prev);
					next.add(id);
					saveHiddenIds(reduxUser.uid, next);
					return next;
				});
			}
			setNodes((prev) => {
				if (prev.length <= 1) {
					setGenError("Keep at least one node on the canvas.");
					setTimeout(() => setGenError(null), 4000);
					return prev;
				}
				abortMapRef.current.get(id)?.abort();
				return prev
					.filter((n) => n.id !== id)
					.map((n) => (n.parentId === id ? { ...n, parentId: null } : n));
			});
			setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
		},
		[reduxUser?.uid],
	);

	const runPendingNode = useCallback(
		async (nodeId, overrides = {}) => {
			if (!reduxUser) {
				onLogin?.();
				return;
			}
			if (creditRemaining <= 0) {
				router.push("/pricing");
				return;
			}
			const node = nodes.find((n) => n.id === nodeId);
			if (!node?.pending) return;
			const urlInput =
				overrides.urlInput !== undefined ? overrides.urlInput : node.urlInput;
			const promptInput =
				(overrides.promptInput !== undefined
					? overrides.promptInput
					: node.promptInput) || "";
			const urls = normalizeUrls([urlInput]);
			const prompt = promptInput.trim();
			const ingestOk = parentIngestAvailable(nodes, node);
			if (!urls.length && !prompt && !ingestOk) {
				setGenError("Add a URL or prompt, or connect from a parent with generated content.");
				return;
			}
			setGenError(null);
			const apiType = SPAWN_TO_API[node.type];
			const parent = node.parentId
				? nodes.find((n) => n.id === node.parentId)
				: null;

			let promptStr = "";
			let urlsForApi = [...urls];
			if (parent) {
				promptStr = buildPromptForChild({
					apiType,
					parentContent: parent.content,
					userLine: prompt || null,
					C,
				});
				if (parent.urls?.length) {
					urlsForApi = [
						...new Set([...urlsForApi, ...normalizeUrls(parent.urls)]),
					];
				}
			} else {
				promptStr =
					prompt ||
					(urls.length ? "Generate from the source URL(s)." : "Write a concise draft.");
			}

			await runGenerate({
				nodeId,
				apiType,
				urls: urlsForApi,
				promptStr,
				onStreamContent: (full) => {
					setNodes((prev) =>
						prev.map((n) => (n.id === nodeId ? { ...n, content: full } : n)),
					);
				},
			});
		},
		[nodes, reduxUser, creditRemaining, router, onLogin, C, runGenerate],
	);

	const addPendingChild = useCallback(
		(fromNode, spawnKey) => {
			if (!reduxUser) {
				onLogin?.();
				return;
			}
			if (fromNode.pending) return;
			const apiType = SPAWN_TO_API[spawnKey];
			if (!apiType || !fromNode) return;
			const id = String(++uidRef.current);
			const childCount = edges.filter((e) => e.from === fromNode.id).length;
			const x = fromNode.x + NW + 72;
			const y = fromNode.y + childCount * (NH + 24);
			const newNode = {
				id,
				type: spawnKey,
				title: `New ${C[spawnKey]?.label}`,
				x,
				y,
				content:
					!fromNode.pending && (fromNode.content || "").trim()
						? "Linked to parent — parent output will be sent as source to the model. Run when ready, or add URL / extra prompt."
						: "Add a source URL and/or a prompt in the panel, then click Run.",
				parentId: fromNode.id,
				tasks: [],
				pending: true,
				urlInput: "",
				promptInput: "",
				urls: [],
			};
			setNodes((p) => [...p, newNode]);
			setEdges((p) => [...p, { id: `e${id}`, from: fromNode.id, to: id }]);
			setSelected(id);
			setShowPanel(true);
		},
		[edges, C, reduxUser, onLogin],
	);

	const addPendingRoot = useCallback(
		(spawnKey) => {
			if (!reduxUser) {
				onLogin?.();
				return;
			}
			const id = String(++uidRef.current);
			const x = (-pan.x + vp.w * 0.45) / scale - NW / 2;
			const y = (-pan.y + (vp.h - TOP - BOTTOM) * 0.42) / scale;
			const newNode = {
				id,
				type: spawnKey,
				title: `New ${C[spawnKey]?.label}`,
				x,
				y,
				content:
					SAMPLE[spawnKey] ||
					"Add a source URL and/or a prompt in the panel, then click Run.",
				parentId: null,
				tasks: [],
				pending: true,
				urlInput: "",
				promptInput: "",
				urls: [],
			};
			setNodes((p) => [...p, newNode]);
			setSelected(id);
			setShowPanel(true);
		},
		[pan, scale, vp, C, reduxUser, onLogin],
	);

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
			if (e.button !== 0) return;
			wasDragRef.current = false;
			panRef.current = { sx: e.clientX, sy: e.clientY, opx: pan.x, opy: pan.y };
		},
		[pan],
	);

	const onPointerMove = useCallback(
		(e) => {
			if (dragRef.current) {
				const { id, sx, sy, ox, oy } = dragRef.current;
				const dx = (e.clientX - sx) / scale;
				const dy = (e.clientY - sy) / scale;
				if (Math.abs(dx) + Math.abs(dy) > 3) wasDragRef.current = true;
				setNodes((p) =>
					p.map((n) => (n.id === id ? { ...n, x: ox + dx, y: oy + dy } : n)),
				);
			} else if (panRef.current) {
				const { sx, sy, opx, opy } = panRef.current;
				const dx = e.clientX - sx;
				const dy = e.clientY - sy;
				if (Math.abs(dx) + Math.abs(dy) > 3) wasDragRef.current = true;
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
		}, 50);
	}, []);

	const onWheel = useCallback((e) => {
		e.preventDefault();
		const rect = containerRef.current?.getBoundingClientRect();
		if (!rect) return;
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		const factor = e.deltaY < 0 ? 1.08 : 0.92;
		setScale((prev) => {
			const next = Math.min(Math.max(prev * factor, 0.25), 2.5);
			const r = next / prev;
			setPan((p) => ({
				x: mx - r * (mx - p.x),
				y: my - r * (my - p.y),
			}));
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

	const handleBarRun = useCallback(async () => {
		const urls = normalizeUrls([bottomUrl]);
		const prompt = bottomPrompt.trim();
		const selectedNodeNow = nodes.find((n) => n.id === selected);
		if (selectedNodeNow?.pending) {
			if (
				!urls.length &&
				!prompt &&
				!parentIngestAvailable(nodes, selectedNodeNow)
			) {
				setGenError(
					"Add a URL or prompt, or Run using the parent asset’s content.",
				);
				return;
			}
			setGenError(null);
			await runPendingNode(selectedNodeNow.id, {
				urlInput: bottomUrl,
				promptInput: bottomPrompt,
			});
			return;
		}
		if (!urls.length && !prompt) {
			setGenError("Add at least one URL or a prompt.");
			return;
		}
		setGenError(null);
		const id = String(++uidRef.current);
		const x = (-pan.x + vp.w * 0.45) / scale - NW / 2;
		const y = (-pan.y + (vp.h - TOP - BOTTOM) * 0.42) / scale;
		setNodes((prev) => [
			...prev,
			{
				id,
				type: "blog",
				title: prompt.slice(0, 40) || "New asset",
				x,
				y,
				content: "…",
				parentId: null,
				tasks: [],
				pending: true,
				urlInput: bottomUrl,
				promptInput: bottomPrompt,
				urls: [],
			},
		]);
		setSelected(id);
		setShowPanel(true);
		setTimeout(() => {
			runPendingNode(id, { urlInput: bottomUrl, promptInput: bottomPrompt });
		}, 0);
	}, [
		bottomUrl,
		bottomPrompt,
		selected,
		nodes,
		pan,
		scale,
		vp,
		runPendingNode,
	]);

	const selectedNode = nodes.find((n) => n.id === selected);
	const parentForSelected = selectedNode?.parentId
		? nodes.find((n) => n.id === selectedNode.parentId)
		: null;

	const canDeleteNode = nodes.length > 1;

	const canRunPending = useMemo(() => {
		const n = nodes.find((x) => x.id === selected);
		if (!n?.pending) return false;
		const u = normalizeUrls([n.urlInput]);
		const p = (n.promptInput || "").trim();
		if (u.length > 0 || p.length > 0) return true;
		return parentIngestAvailable(nodes, n);
	}, [selected, nodes]);

	const barCanRun = useMemo(() => {
		const n = nodes.find((x) => x.id === selected);
		const urls = normalizeUrls([bottomUrl]);
		const prompt = bottomPrompt.trim();
		if (urls.length > 0 || prompt.length > 0) return true;
		if (n?.pending) return parentIngestAvailable(nodes, n);
		return false;
	}, [selected, nodes, bottomUrl, bottomPrompt]);

	return (
		<div
			style={{
				position: "relative",
				width: "100%",
				flex: 1,
				minHeight: 0,
				alignSelf: "stretch",
				display: "flex",
				flexDirection: "row",
				background: T.base,
				borderTop: `1px solid ${T.border}`,
				overflow: "hidden",
				fontFamily: "'Outfit', sans-serif",
			}}
		>
			<div
				style={{
					flex: 1,
					minWidth: 0,
					display: "flex",
					flexDirection: "column",
					minHeight: 0,
					position: "relative",
				}}
			>
			{/* Top bar */}
			<div
				style={{
					height: TOP,
					flexShrink: 0,
					background: T.surface,
					borderBottom: `1px solid ${T.border}`,
					display: "flex",
					alignItems: "center",
					padding: "0 14px",
					gap: 10,
					zIndex: 100,
					flexWrap: "wrap",
				}}
			>
				<div style={{ display: "flex", gap: 4, alignItems: "center" }}>
					{[
						{ id: "canvas", label: "Canvas" },
						{ id: "nodes", label: "Nodes · Links" },
					].map(({ id, label }) => (
						<button
							key={id}
							type="button"
							onClick={() => setWorkspaceTab(id)}
							style={{
								padding: "4px 9px",
								borderRadius: 7,
								border: `1px solid ${workspaceTab === id ? T.warm : T.border}`,
								background: workspaceTab === id ? T.warmBg : "transparent",
								color: workspaceTab === id ? T.accent : T.muted,
								fontSize: 10,
								fontWeight: workspaceTab === id ? 700 : 600,
								cursor: "pointer",
								lineHeight: 1.2,
							}}
						>
							{label}
						</button>
					))}
				</div>
				<span style={{ fontSize: 11, color: T.muted }}>
					{nodes.length} nodes · {edges.length} links
				</span>
				{reduxUser && projects.length > 0 && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							flexWrap: "wrap",
						}}
					>
						<span
							style={{
								fontSize: 9,
								fontWeight: 700,
								color: T.muted,
								letterSpacing: "0.08em",
							}}
						>
							PROJECT
						</span>
						<select
							value={activeProjectId || ""}
							onChange={(e) => persistActiveProject(e.target.value)}
							style={{
								background: T.base,
								border: `1px solid ${T.border}`,
								borderRadius: 8,
								padding: "4px 8px",
								fontSize: 11,
								color: T.accent,
								maxWidth: 220,
							}}
						>
							{projects.map((p) => (
								<option key={p.id} value={p.id}>
									{p.name} ({(p.assetIds || []).length})
								</option>
							))}
						</select>
						<button
							type="button"
							onClick={handleNewProject}
							style={{
								background: T.warmBg,
								border: `1px solid ${T.border}`,
								borderRadius: 8,
								padding: "4px 10px",
								fontSize: 10,
								fontWeight: 600,
								color: T.accent,
								cursor: "pointer",
							}}
						>
							+ New project
						</button>
					</div>
				)}
				<div style={{ display: "flex", gap: 6, marginLeft: 8, flexWrap: "wrap" }}>
					{CANVAS_QUICK_ADD.map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => {
								const cur = nodes.find((n) => n.id === selected);
								const anchor =
									cur && !cur.pending
										? cur
										: nodes.find((n) => !n.pending);
								if (anchor) addPendingChild(anchor, t);
								else addPendingRoot(t);
							}}
							disabled={!reduxUser || generatingId !== null}
							style={{
								background: `${C[t]?.color}14`,
								border: `1px solid ${C[t]?.color}40`,
								borderRadius: 6,
								padding: "2px 7px",
								fontSize: 9,
								color: C[t]?.color,
								cursor:
									!reduxUser || generatingId ? "not-allowed" : "pointer",
							}}
						>
							+ {C[t]?.label}
						</button>
					))}
				</div>
				<div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
					<button
						type="button"
						onClick={() => setScale((s) => Math.min(2.5, +(s + 0.1).toFixed(2)))}
						style={{
							background: T.base,
							border: `1px solid ${T.border}`,
							borderRadius: 6,
							width: 28,
							height: 28,
							cursor: "pointer",
							color: T.accent,
						}}
					>
						+
					</button>
					<button
						type="button"
						onClick={() => setScale((s) => Math.max(0.25, +(s - 0.1).toFixed(2)))}
						style={{
							background: T.base,
							border: `1px solid ${T.border}`,
							borderRadius: 6,
							width: 28,
							height: 28,
							cursor: "pointer",
							color: T.accent,
						}}
					>
						−
					</button>
					<span style={{ fontSize: 10, color: T.muted, minWidth: 36 }}>
						{Math.round(scale * 100)}%
					</span>
					<button
						type="button"
						onClick={() => {
							setPan({ x: 80, y: 72 });
							setScale(0.9);
						}}
						style={{
							background: T.base,
							border: `1px solid ${T.border}`,
							borderRadius: 6,
							padding: "4px 10px",
							fontSize: 10,
							color: T.muted,
							cursor: "pointer",
						}}
					>
						Reset view
					</button>
				</div>
			</div>

			{workspaceTab === "canvas" ? (
			<div
				style={{
					position: "relative",
					flex: 1,
					minHeight: 0,
					cursor: panRef.current ? "grabbing" : "grab",
				}}
			>
				<div
					ref={containerRef}
					style={{
						position: "absolute",
						inset: 0,
						overflow: "hidden",
					}}
					onPointerDown={onBgPointerDown}
					onClick={() => {
						if (!wasDragRef.current) {
							setSelected(null);
							setShowPanel(false);
						}
					}}
				>
					<div
						style={{
							position: "absolute",
							inset: 0,
							backgroundImage: `radial-gradient(${T.border} 1px, transparent 1px)`,
							backgroundSize: "24px 24px",
							pointerEvents: "none",
							opacity: 0.7,
						}}
					/>
					<div
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							transformOrigin: "0 0",
							transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
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
							{edges.map((e) => (
								<EdgePath key={e.id} edge={e} nodes={nodes} C={C} />
							))}
						</svg>
						<AnimatePresence>
							{nodes.map((node) => (
								<NodeCard
									key={node.id}
									node={node}
									C={C}
									T={T}
									isSelected={selected === node.id}
									generatingId={generatingId}
									onPointerDown={(e) => onNodePointerDown(e, node)}
									onClick={(e) => {
										e.stopPropagation();
										if (!wasDragRef.current) {
											setSelected(node.id);
											setShowPanel(true);
										}
									}}
									onSpawn={(spawnKey) => addPendingChild(node, spawnKey)}
									canDelete={canDeleteNode}
									onDelete={() => deleteNode(node.id)}
									onStop={
										generatingId === node.id
											? () => stopGenerate(node.id)
											: undefined
									}
									onRegenerate={() => handleRegenerateNode(node)}
									isRegenerating={
										regeneratingAssetId === node.tasks?.[0]?.id
									}
								/>
							))}
						</AnimatePresence>
					</div>
				</div>

				<Minimap
					nodes={nodes}
					edges={edges}
					pan={pan}
					scale={scale}
					C={C}
					T={T}
					vpW={vp.w}
					vpH={vp.h}
					topBar={TOP}
					bottomBar={BOTTOM}
				/>
			</div>
			) : (
				<div
					style={{
						flex: 1,
						overflowY: "auto",
						padding: "16px 18px",
						minHeight: 0,
					}}
				>
					<p
						style={{
							fontSize: 11,
							fontWeight: 700,
							color: T.muted,
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							marginBottom: 12,
						}}
					>
						All nodes
					</p>
					<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
						{nodes.map((n) => {
							const cfg = C[n.type];
							return (
								<div
									key={n.id}
									style={{
										display: "flex",
										alignItems: "stretch",
										gap: 8,
									}}
								>
									<button
										type="button"
										onClick={() => {
											setSelected(n.id);
											setShowPanel(true);
											setWorkspaceTab("canvas");
										}}
										style={{
											flex: 1,
											textAlign: "left",
											padding: "12px 14px",
											borderRadius: 10,
											border: `1px solid ${T.border}`,
											background: selected === n.id ? T.warmBg : T.surface,
											cursor: "pointer",
										}}
									>
										<span style={{ fontSize: 11, color: cfg?.color, fontWeight: 700 }}>
											{cfg?.icon} {cfg?.label}
										</span>
										<div
											style={{
												fontSize: 13,
												fontWeight: 600,
												color: T.accent,
												marginTop: 4,
											}}
										>
											{n.title}
										</div>
										{n.pending && (
											<span style={{ fontSize: 10, color: T.warm }}>Draft</span>
										)}
									</button>
									{canDeleteNode && (
										<button
											type="button"
											title="Delete node"
											onClick={(e) => {
												e.stopPropagation();
												deleteNode(n.id);
											}}
											style={{
												width: 40,
												flexShrink: 0,
												borderRadius: 10,
												border: `1px solid ${T.border}`,
												background: T.surface,
												color: T.muted,
												cursor: "pointer",
												fontSize: 16,
											}}
										>
											🗑
										</button>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{genError && (
				<div
					style={{
						position: "absolute",
						left: 12,
						right: 12,
						bottom: BOTTOM + 8,
						padding: "8px 12px",
						background: "#FEF2F2",
						border: "1px solid #FECACA",
						borderRadius: 8,
						fontSize: 12,
						color: "#B91C1C",
						zIndex: 130,
					}}
				>
					{genError}
				</div>
			)}

			{/* Bottom: URL + prompt + Run */}
			<div
				style={{
					minHeight: BOTTOM,
					flexShrink: 0,
					background: T.surface,
					borderTop: `1px solid ${T.border}`,
					display: "flex",
					alignItems: "center",
					padding: "8px 10px",
					gap: 8,
					zIndex: 100,
					flexWrap: "wrap",
				}}
			>
				{selectedNode ? (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							padding: "4px 8px",
							background: T.warmBg,
							border: `1px solid ${T.border}`,
							borderRadius: 8,
							flexShrink: 0,
							maxWidth: 140,
						}}
					>
						<span
							style={{
								fontSize: 10,
								color: T.accent,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
							}}
						>
							↳ {selectedNode.title.slice(0, 18)}
							{selectedNode.title.length > 18 ? "…" : ""}
						</span>
						<button
							type="button"
							onClick={() => {
								setSelected(null);
								setShowPanel(false);
							}}
							style={{
								background: "none",
								border: "none",
								color: T.muted,
								cursor: "pointer",
								fontSize: 14,
							}}
						>
							×
						</button>
					</div>
				) : (
					<span style={{ fontSize: 10, color: T.muted, flexShrink: 0 }}>
						No selection
					</span>
				)}
				<input
					type="url"
					value={bottomUrl}
					onChange={(e) => {
						const v = e.target.value;
						setBottomUrl(v);
						if (selectedNode?.pending) {
							updateNodeField(selectedNode.id, { urlInput: v });
						}
					}}
					placeholder="https://…"
					style={{
						flex: 1,
						minWidth: 120,
						background: T.base,
						border: `1px solid ${T.border}`,
						borderRadius: 8,
						padding: "7px 10px",
						color: T.accent,
						fontSize: 11,
						outline: "none",
					}}
				/>
				<input
					value={bottomPrompt}
					onChange={(e) => {
						const v = e.target.value;
						setBottomPrompt(v);
						if (selectedNode?.pending) {
							updateNodeField(selectedNode.id, { promptInput: v });
						}
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							handleBarRun();
						}
					}}
					placeholder="Prompt (optional if URL set)"
					style={{
						flex: 2,
						minWidth: 140,
						background: T.base,
						border: `1px solid ${T.border}`,
						borderRadius: 8,
						padding: "7px 10px",
						color: T.accent,
						fontSize: 11,
						outline: "none",
					}}
				/>
				{generatingId ? (
					<button
						type="button"
						onClick={() => stopGenerate(generatingId)}
						style={{
							background: `${T.warm}22`,
							border: `1px solid ${T.border}`,
							borderRadius: 8,
							padding: "8px 14px",
							color: T.warm,
							cursor: "pointer",
							fontSize: 12,
							fontWeight: 700,
							flexShrink: 0,
						}}
					>
						Stop
					</button>
				) : (
					<button
						type="button"
						onClick={handleBarRun}
						disabled={!barCanRun}
						style={{
							background: !barCanRun ? T.border : T.warm,
							border: "none",
							borderRadius: 8,
							padding: "8px 14px",
							color: !barCanRun ? T.muted : "white",
							cursor: !barCanRun ? "not-allowed" : "pointer",
							fontSize: 12,
							fontWeight: 700,
							flexShrink: 0,
						}}
					>
						Run
					</button>
				)}
			</div>
			</div>

			<AnimatePresence>
				{showPanel && selectedNode && (
					<SidePanel
						key={selectedNode.id}
						node={selectedNode}
						parentNode={parentForSelected}
						C={C}
						T={T}
						onClose={() => {
							setShowPanel(false);
							setSelected(null);
						}}
						onSpawn={(spawnKey) => addPendingChild(selectedNode, spawnKey)}
						onUpdateDraft={(patch) =>
							updateNodeField(selectedNode.id, patch)
						}
						onRun={() => runPendingNode(selectedNode.id)}
						canRun={canRunPending}
						generatingId={generatingId}
						canDelete={canDeleteNode}
						onDelete={() => deleteNode(selectedNode.id)}
						onStop={
							generatingId === selectedNode.id
								? () => stopGenerate(selectedNode.id)
								: undefined
						}
						onRegenerate={() => handleRegenerateNode(selectedNode)}
						regenerating={
							regeneratingAssetId === selectedNode.tasks?.[0]?.id
						}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}
