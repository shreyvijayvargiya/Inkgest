import React, {
	useState,
	useRef,
	useEffect,
	useLayoutEffect,
	useMemo,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LoginModal from "../../lib/ui/LoginModal";
import InfographicsModal from "../../lib/ui/InfographicsModal";
import AIChatSidebar from "../../lib/ui/AIChatSidebar";
import AnimatedDropdown from "../../lib/ui/AnimatedDropdown";
import TableView from "../../lib/ui/TableView";
import InfographicsAssetView from "../../lib/ui/assets/InfographicsAssetView";
import LandingPageAssetView from "../../lib/ui/assets/LandingPageAssetView";
import ImageGalleryAssetView from "../../lib/ui/assets/ImageGalleryAssetView";
import {
	listAssets,
	getAsset,
	updateAsset,
	deleteAsset,
	assetRef,
} from "../../lib/api/userAssets";
import { uploadFile } from "../../lib/api/upload";
import { uploadInlineImagesToUploadThing } from "../../lib/fileUpload";
import { FREE_CREDIT_LIMIT, getUserCredits } from "../../lib/utils/credits";
import { getTheme } from "../../lib/utils/theme";
import { formatInkDateLong, TiptapSlashDatePicker } from "../../lib/ui/TiptapSlashDatePicker.jsx";
import { htmlToMarkdown } from "../../lib/utils/htmlToMarkdown";
import normalizeYoutubeEmbedsInHtml from "../../lib/utils/normalizeYoutubeEmbeds";
import IconSelectorDropdown, { lucideToSvgString } from "../../lib/ui/IconSelectorDropdown.jsx";
import {
	THEMES,
	buildThemedHTML,
	parseInlineMarkdown,
	resolvePublicThemeId,
} from "../../lib/blogExportThemes";

/* ─── Fonts ─── */
const FontLink = () => (
	<style>{`
    @import url('https://fonts.googleapis.com/css2?family=Comic:wght@300;400;500;600;700&family=Comic:wght@400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; }
    body { font-family: 'Comic', sans-serif; background: #F7F5F0; -webkit-font-smoothing: antialiased; }
    textarea, input, button { font-family: 'Comic', sans-serif; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #E8E4DC; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #C17B2F; }
    [contenteditable]:focus { outline: none; }
    [contenteditable]:empty:before { content: attr(data-placeholder); color: #B0AAA3; pointer-events: none; }
    details[data-block="draft-toggle"] summary::-webkit-details-marker { display: none; }
    details[data-block="draft-toggle"] summary { list-style: none; }
    details[data-block="draft-toggle"] summary::marker { display: none; }
    details[data-block="draft-toggle"] [data-toggle-chevron] {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border-radius: 5px;
      background: rgba(193,123,47,0.12);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transform: rotate(0deg);
      transition: transform 0.18s ease;
    }
    details[data-block="draft-toggle"] [data-toggle-chevron]::before {
      content: "";
      display: block;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 5px 0 5px 7px;
      border-color: transparent transparent transparent #6B6560;
      margin-left: 2px;
    }
    details[data-block="draft-toggle"][open] [data-toggle-chevron] { transform: rotate(90deg); }
    details[data-block="draft-toggle"] [data-toggle-grip] {
      flex-shrink: 0;
      min-width: 22px;
      height: 22px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    details[data-block="draft-toggle"] [data-toggle-grip]::before {
      content: "\\2026";
      font-weight: 700;
      color: #A8A29E;
      font-size: 15px;
      line-height: 1;
      letter-spacing: 0.02em;
    }
  `}</style>
);

const T = getTheme();

const getDateFromFirestore = (val) => {
	if (!val) return null;
	if (val.toDate) return val.toDate();
	if (val.seconds) return new Date(val.seconds * 1000);
	return new Date(val);
};

const isThisMonth = (val) => {
	const d = getDateFromFirestore(val);
	if (!d) return false;
	const now = new Date();
	return (
		d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
	);
};

/* ─── Tiny icon components (inline SVG) ─── */
const Icon = ({
	d,
	size = 16,
	stroke = T.muted,
	fill = "none",
	strokeWidth = 1.75,
}) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill={fill}
		stroke={stroke}
		strokeWidth={strokeWidth}
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d={d} />
	</svg>
);

const Icons = {
	plus: "M12 5v14M5 12h14",
	close: "M18 6L6 18M6 6l12 12",
	search: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
	trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
	copy: "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-4-4H8z M14 2v6h6 M8 12h8 M8 16h5",
	save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8",
	zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
	chevronL: "M15 18l-6-6 6-6",
	chevronR: "M9 18l6-6-6-6",
	chevronD: "M6 9l6 6 6-6",
	logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
	refresh:
		"M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
	fileText:
		"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
	eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
	bold: "M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z",
	italic: "M19 4h-9M14 20H5M15 4L9 20",
	list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
	link2:
		"M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3 M8 12h8",
	image:
		"M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-8a2 2 0 11-4 0 2 2 0 014 0zM4 20h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z",
	table:
		"M3 3h18v4H3V3zm0 8h18v4H3v-4zm0 8h18v4H3v-4z M9 3v18 M15 3v18",
	video:
		"M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
	settings:
		"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
};

/** Tailwind-style swatches for contenteditable selection toolbar (hex = v3 defaults). */
const SELECTION_TEXT_COLORS = [
	{ label: "Default", hex: "" },
	{ label: "Slate 900", hex: "#0f172a" },
	{ label: "Slate 600", hex: "#475569" },
	{ label: "Zinc 800", hex: "#27272a" },
	{ label: "Red 600", hex: "#dc2626" },
	{ label: "Orange 600", hex: "#ea580c" },
	{ label: "Amber 600", hex: "#d97706" },
	{ label: "Yellow 700", hex: "#a16207" },
	{ label: "Lime 600", hex: "#65a30d" },
	{ label: "Green 600", hex: "#16a34a" },
	{ label: "Emerald 600", hex: "#059669" },
	{ label: "Teal 600", hex: "#0d9488" },
	{ label: "Cyan 600", hex: "#0891b2" },
	{ label: "Sky 600", hex: "#0284c7" },
	{ label: "Blue 600", hex: "#2563eb" },
	{ label: "Indigo 600", hex: "#4f46e5" },
	{ label: "Violet 600", hex: "#7c3aed" },
	{ label: "Purple 600", hex: "#9333ea" },
	{ label: "Fuchsia 600", hex: "#c026d3" },
	{ label: "Pink 600", hex: "#db2777" },
	{ label: "Rose 600", hex: "#e11d48" },
];

const SELECTION_BG_COLORS = [
	{ label: "None", hex: "clear" },
	{ label: "Slate 100", hex: "#f1f5f9" },
	{ label: "Slate 200", hex: "#e2e8f0" },
	{ label: "Red 100", hex: "#fee2e2" },
	{ label: "Orange 100", hex: "#ffedd5" },
	{ label: "Amber 100", hex: "#fef3c7" },
	{ label: "Yellow 100", hex: "#fef9c3" },
	{ label: "Lime 100", hex: "#ecfccb" },
	{ label: "Green 100", hex: "#dcfce7" },
	{ label: "Emerald 100", hex: "#d1fae5" },
	{ label: "Teal 100", hex: "#ccfbf1" },
	{ label: "Cyan 100", hex: "#cffafe" },
	{ label: "Sky 100", hex: "#e0f2fe" },
	{ label: "Blue 100", hex: "#dbeafe" },
	{ label: "Indigo 100", hex: "#e0e7ff" },
	{ label: "Violet 100", hex: "#ede9fe" },
	{ label: "Purple 100", hex: "#f3e8ff" },
	{ label: "Fuchsia 100", hex: "#fae8ff" },
	{ label: "Pink 100", hex: "#fce7f3" },
	{ label: "Rose 100", hex: "#ffe4e6" },
];

/* ─── Extract a single CSS property value from a CSS string ─── */
const parseCSSProp = (cssStr = "", prop) => {
	const m = cssStr.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`));
	return m ? m[1].trim() : "";
};


/* ─── Supported translation languages (MyMemory free API) ─── */
const TRANSLATION_LANGUAGES = [
	{ code: "en", label: "English", flag: "🇬🇧" },
	{ code: "es", label: "Spanish", flag: "🇪🇸" },
	{ code: "fr", label: "French", flag: "🇫🇷" },
	{ code: "de", label: "German", flag: "🇩🇪" },
	{ code: "pt", label: "Portuguese", flag: "🇵🇹" },
	{ code: "it", label: "Italian", flag: "🇮🇹" },
	{ code: "zh", label: "Chinese", flag: "🇨🇳" },
	{ code: "ja", label: "Japanese", flag: "🇯🇵" },
	{ code: "ko", label: "Korean", flag: "🇰🇷" },
	{ code: "ar", label: "Arabic", flag: "🇸🇦" },
	{ code: "hi", label: "Hindi", flag: "🇮🇳" },
	{ code: "ru", label: "Russian", flag: "🇷🇺" },
	{ code: "nl", label: "Dutch", flag: "🇳🇱" },
	{ code: "sv", label: "Swedish", flag: "🇸🇪" },
	{ code: "tr", label: "Turkish", flag: "🇹🇷" },
	{ code: "pl", label: "Polish", flag: "🇵🇱" },
	{ code: "id", label: "Indonesian", flag: "🇮🇩" },
	{ code: "vi", label: "Vietnamese", flag: "🇻🇳" },
];

/** Clipboard helper: full themed HTML as a paste-ready React component (iframe embed). */
function buildThemedReactSnippet(currentHTML = "", themeKey, title = "") {
	const theme = THEMES[themeKey];
	if (!theme) return "";
	const htmlDoc = buildThemedHTML(currentHTML, theme, title);
	if (!htmlDoc) return "";
	const safeTitle = title || "Newsletter";
	return `import React from "react";

const THEME_HTML_DOC = ${JSON.stringify(htmlDoc)};

/** Themed newsletter — paste into any React/Next.js app. */
export default function ThemedNewsletterEmbed() {
  return (
    <iframe
      title={${JSON.stringify(safeTitle)}}
      srcDoc={THEME_HTML_DOC}
      style={{ width: "100%", border: 0, minHeight: "100vh", display: "block" }}
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    />
  );
}
`;
}

/** Best-effort copy for Export themes menu (Clipboard API + execCommand fallback). */
async function copyTextToClipboard(text) {
	if (typeof text !== "string" || !text) return false;
	try {
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		/* fall through */
	}
	try {
		const ta = document.createElement("textarea");
		ta.value = text;
		ta.setAttribute("readonly", "");
		ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
		document.body.appendChild(ta);
		ta.focus();
		ta.select();
		const ok = document.execCommand("copy");
		document.body.removeChild(ta);
		return ok;
	} catch {
		return false;
	}
}

/**
 * Translate all text nodes in an HTML string to the target language
 * using the free MyMemory API (no key required, ~1 000 words/day per IP).
 * HTML structure (tags, attributes, styles) is fully preserved.
 */
async function translateHTMLContent(html, targetLang) {
	if (!html || targetLang === "en") return html;

	const parser = new DOMParser();
	const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
	const root = doc.body.firstChild;

	const textNodes = [];
	function collectTextNodes(node) {
		for (const child of node.childNodes) {
			if (child.nodeType === 3 && child.textContent.trim()) {
				textNodes.push(child);
			} else if (child.nodeType === 1) {
				collectTextNodes(child);
			}
		}
	}
	collectTextNodes(root);

	if (textNodes.length === 0) return html;

	/* Translate each text node individually in batches of 5 parallel requests.
	   Avoids delimiter-splitting issues where the API modifies join markers. */
	const CONCURRENCY = 5;
	for (let i = 0; i < textNodes.length; i += CONCURRENCY) {
		const slice = textNodes.slice(i, i + CONCURRENCY);
		await Promise.all(
			slice.map(async (node) => {
				const text = node.textContent.trim();
				if (!text) return;
				try {
					const res = await fetch(
						`https://api.mymemory.translated.world/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`,
					);
					const json = await res.json();
					const translated = json?.responseData?.translatedText;
					if (translated && translated.toLowerCase() !== "invalid language pair") {
						/* Decode any HTML entities the API may return (e.g. &amp; → &) */
						const ta = document.createElement("textarea");
						ta.innerHTML = translated;
						node.textContent = ta.value;
					}
				} catch {
					/* keep original text on network/rate-limit error */
				}
			}),
		);
	}

	return root.innerHTML;
}

/* ─── Asset type labels ─── */
const ASSET_TYPE_LABELS = {
	table: "Table",
	draft: "Draft",
	infographics: "Infographics",
	landing_page: "Landing Page",
	image_gallery: "Gallery",
};

/* ─── Item card in sidebar (drafts + tables + assets) ─── */
function ItemCard({ item, active, onClick, onDelete }) {
	const [hovering, setHovering] = useState(false);
	const isTable = item.type === "table";
	const isAssetWithDesc = [
		"table",
		"infographics",
		"landing_page",
		"image_gallery",
	].includes(item.type);
	const tag = ASSET_TYPE_LABELS[item.type] || item.tag || "Draft";
	const preview = isAssetWithDesc ? item.description || "" : item.preview || "";
	const meta = isTable ? "" : `${item.words ?? 0}w`;
	const date = item.date
		? typeof item.date === "string"
			? item.date
			: (item.createdAt?.toDate?.()?.toLocaleDateString?.("en-US", {
					weekday: "short",
					month: "short",
					day: "numeric",
				}) ?? "")
		: "";
	return (
		<motion.div
			layout
			initial={{ opacity: 0, x: -12 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -12, scale: 0.95 }}
			whileHover={{ x: 2 }}
			transition={{ duration: 0.22 }}
			onHoverStart={() => setHovering(true)}
			onHoverEnd={() => setHovering(false)}
			onClick={onClick}
			style={{
				background: active ? T.surface : "transparent",
				border: `1px solid ${active ? T.border : "transparent"}`,
				borderRadius: 10,
				padding: "12px 14px",
				cursor: "pointer",
				boxShadow: active ? "0 1px 8px rgba(0,0,0,0.07)" : "none",
				position: "relative",
				marginBottom: 4,
				transition: "background 0.15s, border-color 0.15s",
			}}
		>
			{active && (
				<motion.div
					layoutId="active-pill"
					style={{
						position: "absolute",
						left: 0,
						top: "50%",
						transform: "translateY(-50%)",
						width: 3,
						height: 32,
						background: T.warm,
						borderRadius: "0 3px 3px 0",
					}}
				/>
			)}
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: 8,
				}}
			>
				<div style={{ flex: 1, minWidth: 0 }}>
					<p
						style={{
							fontSize: 13,
							fontWeight: 600,
							color: T.accent,
							lineHeight: 1.4,
							marginBottom: 4,
							overflow: "hidden",
							display: "-webkit-box",
							WebkitLineClamp: 2,
							WebkitBoxOrient: "vertical",
						}}
					>
						{item.title || "Untitled"}
					</p>
					<p
						style={{
							fontSize: 11.5,
							color: T.muted,
							lineHeight: 1.5,
							overflow: "hidden",
							display: "-webkit-box",
							WebkitLineClamp: 2,
							WebkitBoxOrient: "vertical",
							marginBottom: 6,
						}}
					>
						{preview}
					</p>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<span
							style={{
								fontSize: 10.5,
								fontWeight: 600,
								background: "#F0ECE5",
								color: T.muted,
								padding: "2px 7px",
								borderRadius: 100,
							}}
						>
							{tag}
						</span>
						{meta && (
							<span style={{ fontSize: 10.5, color: T.muted }}>{meta}</span>
						)}
						{meta && <span style={{ fontSize: 10.5, color: T.muted }}>·</span>}
						{date && (
							<span style={{ fontSize: 10.5, color: T.muted }}>{date}</span>
						)}
					</div>
				</div>
				<AnimatePresence>
					{hovering && (
						<motion.button
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							onClick={(e) => {
								e.stopPropagation();
								onDelete(item.id);
							}}
							style={{
								background: "none",
								border: "none",
								cursor: "pointer",
								padding: 4,
								borderRadius: 6,
								flexShrink: 0,
								color: "#EF4444",
								transition: "background 0.15s",
							}}
							whileHover={{ background: "#FEE2E2" }}
						>
							<Icon d={Icons.trash} size={14} stroke="#EF4444" />
						</motion.button>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	);
}

/* ─── Editor toolbar button ─── */
function TBtn({ icon, label, onClick, active = false }) {
	return (
		<motion.button
			whileHover={{ background: "#F0ECE5" }}
			whileTap={{ scale: 0.93 }}
			onClick={onClick}
			title={label}
			style={{
				background: active ? "#E8E4DC" : "transparent",
				border: "none",
				borderRadius: 7,
				padding: "6px 8px",
				cursor: "pointer",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				transition: "background 0.15s",
			}}
		>
			<Icon d={icon} size={15} stroke={active ? T.accent : T.muted} />
		</motion.button>
	);
}

/* ═══════════════════════════════════════════
   RICH EDITOR BLOCKS
═══════════════════════════════════════════ */

const CALLOUT_CONFIGS = {
	info: {
		emoji: "ℹ️",
		border: "#3B82F6",
		bg: "#EFF6FF",
		textColor: "#1E40AF",
		label: "Info",
	},
	warning: {
		emoji: "⚠️",
		border: "#F59E0B",
		bg: "#FFFBEB",
		textColor: "#92400E",
		label: "Callout",
	},
	success: {
		emoji: "✅",
		border: "#10B981",
		bg: "#ECFDF5",
		textColor: "#065F46",
		label: "Success",
	},
	danger: {
		emoji: "🚨",
		border: "#EF4444",
		bg: "#FEF2F2",
		textColor: "#991B1B",
		label: "Danger",
	},
};

const LANG_OPTIONS = [
	"javascript",
	"typescript",
	"python",
	"css",
	"html",
	"bash",
	"json",
	"sql",
	"text",
];

function makeCalloutHtml(type, text = "") {
	const c = CALLOUT_CONFIGS[type] || CALLOUT_CONFIGS.info;
	return `<div data-block="callout-${type}" style="border-left:4px solid ${c.border};background:${c.bg};border-radius:0 8px 8px 0;padding:13px 16px;margin:14px 0;display:flex;gap:12px;align-items:flex-start"><span style="font-size:17px;flex-shrink:0;line-height:1.6;margin-top:2px">${c.emoji}</span><div style="flex:1"><p style="font-weight:700;color:${c.textColor};font-size:10.5px;text-transform:;letter-spacing:0.1em;margin:0 0 5px;font-family:'Comic',sans-serif">${c.label}</p><div style="color:${c.textColor};font-size:14px;line-height:1.65;font-family:'Comic',sans-serif">${text}</div></div></div>`;
}

function makeCodeBlockHtml(
	language = "javascript",
	code = "// Your code here",
) {
	const lang = language.toLowerCase().trim() || "text";
	const opts = LANG_OPTIONS?.map(
		(l) =>
			`<option value="${l}" ${l === lang ? "selected" : ""}>${l?.charAt(0).toLowerCase() + l.slice(1)}</option>`,
	).join("");
	return `<div data-block="code" style="margin:16px 0;border-radius:10px;overflow:hidden;border:1px solid #E8E4DC"><div contenteditable="false" style="background:#F0ECE5;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #E8E4DC;user-select:none"><select data-action="change-lang" style="background:none;border:none;font-size:11px;font-weight:700;color:#5A5550;text-transform:;letter-spacing:0.06em;cursor:pointer;outline:none;font-family:'Comic',sans-serif">${opts}</select><button data-action="copy-code" style="background:#FFFFFF;border:1px solid #E8E4DC;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600;color:#7A7570;cursor:pointer;font-family:'Comic',sans-serif;transition:all 0.15s">Copy</button></div><pre style="background:#1A1A1A;margin:0;padding:18px 20px;overflow-x:auto"><code style="color:#E8D5B0;font-family:'Fira Code','Cascadia Code','Courier New',monospace;font-size:13px;line-height:1.75;white-space:pre;display:block">${code}</code></pre></div>`;
}

function makeButtonBlockHtml(text = "Click here →", href = "#") {
	return `<p style="margin:16px 0"><a href="${href}" style="display:inline-block;background:#C17B2F;color:#FFFFFF;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;font-family:'Comic',sans-serif;letter-spacing:0.01em">${text}</a></p>`;
}

const MAX_TABS = 5;

const TODO_LI_STYLE =
	"list-style:none;margin:4px 0;display:flex;align-items:flex-start;gap:10px;line-height:1.75";
const TODO_CHECKBOX_STYLE =
	"margin-top:4px;flex-shrink:0;width:1em;height:1em;accent-color:#37352F";
const TODO_UL_STYLE = "list-style:none;padding-left:0;margin:8px 0";

function todoLiStructureOk(li) {
	const strayText = [...li.childNodes].some(
		(n) => n.nodeType === 3 && (n.textContent || "").trim().length > 0,
	);
	if (strayText) return false;
	const els = [...li.children];
	if (els.length !== 2) return false;
	if (els[0].tagName !== "INPUT" || els[0].type !== "checkbox") return false;
	if (els[1].tagName !== "SPAN") return false;
	return true;
}

/** Force checkbox → label order and classnames on todo list items (contenteditable-safe). */
function normalizeTodoLists(root) {
	if (!root) return;
	for (const li of root.querySelectorAll('ul[data-todo="true"] > li')) {
		if (todoLiStructureOk(li)) {
			li.classList.add("todo-item");
			li.children[0].classList.add("todo-cb");
			li.children[1].classList.add("todo-label");
			continue;
		}
		const oldCb = li.querySelector("input[type=checkbox]");
		const checked = oldCb?.checked ?? false;
		let label = li.querySelector("span.todo-label") || li.querySelector(":scope > span");
		let text = label ? label.textContent || "" : "";
		for (const n of [...li.childNodes]) {
			if (n.nodeType === 3) text += n.textContent;
			else if (n.nodeType === 1 && n !== oldCb && n !== label) {
				text += n.textContent || "";
			}
		}
		const cb = document.createElement("input");
		cb.type = "checkbox";
		cb.className = "todo-cb";
		cb.setAttribute("style", TODO_CHECKBOX_STYLE);
		cb.checked = checked;
		const span = document.createElement("span");
		span.className = "todo-label";
		span.setAttribute("style", "flex:1;min-width:0");
		const trimmed = text
			.replace(/\u00a0/g, " ")
			.replace(/\s+/g, " ")
			.trim();
		span.textContent = trimmed.length ? trimmed : "\u00a0";
		li.replaceChildren(cb, span);
		li.classList.add("todo-item");
	}
}

/**
 * Walk up from the caret to find the text "block" for slash matching.
 * `Element.closest()` cannot express `summary > editable span`, and leaf fields
 * (figcaption, card heading, table cells, etc.) are often not `<p>` — without this,
 * block is null and the slash menu never opens.
 */
const DRAFT_SLASH_BLOCK_SEL =
	"p,h1,h2,h3,h4,li,blockquote,figcaption,td,th,pre,code," +
	"[data-card-heading],[data-card-desc],[data-audio-name],[data-audio-caption],[data-toggle-group-label]," +
	"div[data-draft-panel],div[data-block]";

function getDraftBlockFromSelection(editorRoot, range) {
	if (!editorRoot || !range) return null;
	let n = range.commonAncestorContainer;
	let el = n.nodeType === 3 ? n.parentElement : n;
	while (el && editorRoot.contains(el)) {
		if (
			el.matches?.("span[contenteditable='true']") &&
			el.closest?.("summary") &&
			editorRoot.contains(el.closest("summary"))
		) {
			return el;
		}
		try {
			if (el.matches?.(DRAFT_SLASH_BLOCK_SEL)) return el;
		} catch {
			/* ignore */
		}
		el = el.parentElement;
	}
	return null;
}

function getTextFromBlockStartToCaret(block, range) {
	const pre = document.createRange();
	pre.selectNodeContents(block);
	pre.setEnd(range.endContainer, range.endOffset);
	return pre.toString();
}

function unwrapDraftSlashQuerySpan(span) {
	const parent = span.parentNode;
	if (!parent) return;
	while (span.firstChild) parent.insertBefore(span.firstChild, span);
	parent.removeChild(span);
}

function unwrapAllDraftSlashQuerySpans(root) {
	if (!root) return;
	root.querySelectorAll("span[data-draft-slash-query]").forEach(unwrapDraftSlashQuerySpan);
}

function stripDraftSlashQueryFromHtmlString(html) {
	if (!html || typeof document === "undefined") return html || "";
	const d = document.createElement("div");
	d.innerHTML = html;
	unwrapAllDraftSlashQuerySpans(d);
	return d.innerHTML;
}

function getCaretCharOffsetInBlock(block, range) {
	if (!block || !range) return 0;
	const pre = document.createRange();
	pre.selectNodeContents(block);
	pre.setEnd(range.endContainer, range.endOffset);
	return pre.toString().length;
}

function setCaretCharOffsetInBlock(block, offset) {
	if (!block || offset < 0) return;
	let acc = 0;
	let node = null;
	let off = 0;
	const walk = (n) => {
		if (node) return true;
		if (n.nodeType === Node.TEXT_NODE) {
			const len = (n.textContent || "").length;
			if (acc + len >= offset) {
				node = n;
				off = Math.min(offset - acc, len);
				return true;
			}
			acc += len;
			return false;
		}
		for (const c of n.childNodes) {
			if (walk(c)) return true;
		}
		return false;
	};
	walk(block);
	if (!node) return;
	try {
		const r = document.createRange();
		r.setStart(node, off);
		r.collapse(true);
		const sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(r);
	} catch {
		/* ignore */
	}
}

/** Highlight `/query` (no spaces) so users see command mode; spans stripped before save. */
function syncDraftSlashQueryHighlight(editorRoot) {
	const sel = window.getSelection();
	if (!editorRoot || !sel?.rangeCount || !sel.isCollapsed) {
		unwrapAllDraftSlashQuerySpans(editorRoot);
		return;
	}
	let range = sel.getRangeAt(0);
	const block = getDraftBlockFromSelection(editorRoot, range);
	if (!block) {
		unwrapAllDraftSlashQuerySpans(editorRoot);
		return;
	}
	if (
		block.closest?.(
			"pre, code, [contenteditable='false']",
		)
	) {
		unwrapAllDraftSlashQuerySpans(editorRoot);
		return;
	}
	const inSummary = block.closest?.("summary");
	if (inSummary && !block.matches?.("span[contenteditable='true']")) {
		unwrapAllDraftSlashQuerySpans(editorRoot);
		return;
	}

	const caretOffset = getCaretCharOffsetInBlock(block, range);
	const textBefore = getTextFromBlockStartToCaret(block, range);
	const slash = matchDraftSlashQuery(textBefore);

	block.querySelectorAll("span[data-draft-slash-query]").forEach(unwrapDraftSlashQuerySpan);

	if (!slash) {
		setCaretCharOffsetInBlock(block, caretOffset);
		return;
	}

	setCaretCharOffsetInBlock(block, caretOffset);
	if (!window.getSelection()?.rangeCount) return;
	range = window.getSelection().getRangeAt(0);
	const text2 = getTextFromBlockStartToCaret(block, range);
	const slash2 = matchDraftSlashQuery(text2);
	if (!slash2) return;

	const slashLen = slash2.slashToken.length;
	const fullLen = text2.length;
	const startChar = fullLen - slashLen;
	if (startChar < 0) return;

	let acc = 0;
	let startNode = null;
	let startOffset = 0;
	const walkStart = (node) => {
		if (startNode) return true;
		if (node.nodeType === Node.TEXT_NODE) {
			const t = (node.textContent || "").length;
			if (acc + t >= startChar) {
				startNode = node;
				startOffset = Math.max(0, startChar - acc);
				return true;
			}
			acc += t;
			return false;
		}
		for (const c of node.childNodes) {
			if (walkStart(c)) return true;
		}
		return false;
	};
	walkStart(block);
	if (!startNode) return;

	const wrapRange = document.createRange();
	wrapRange.setStart(startNode, startOffset);
	wrapRange.setEnd(range.endContainer, range.endOffset);

	const span = document.createElement("span");
	span.setAttribute("data-draft-slash-query", "");
	span.style.background = "rgba(193, 123, 47, 0.18)";
	span.style.borderRadius = "4px";
	span.style.padding = "0 3px";
	span.style.boxDecorationBreak = "clone";
	span.style.webkitBoxDecorationBreak = "clone";

	try {
		wrapRange.surroundContents(span);
	} catch {
		const contents = wrapRange.extractContents();
		while (contents.firstChild) span.appendChild(contents.firstChild);
		wrapRange.insertNode(span);
	}

	try {
		const endR = document.createRange();
		endR.selectNodeContents(span);
		endR.collapse(false);
		sel.removeAllRanges();
		sel.addRange(endR);
	} catch {
		/* ignore */
	}
}

function matchDraftSlashQuery(text) {
	const m = text.match(/\/([^\s]*)$/);
	if (!m) return null;
	const slashIdx = text.length - m[0].length;
	const prevCh = slashIdx > 0 ? text.charAt(slashIdx - 1) : "";
	const okSlash =
		slashIdx === 0 || /\s/.test(prevCh) || !/\w/.test(prevCh);
	if (!okSlash) return null;
	return { query: m[1] || "", slashToken: m[0] };
}

function deleteDraftSlashToken(block, range, slashLen) {
	const caretOffset = getCaretCharOffsetInBlock(block, range);
	unwrapAllDraftSlashQuerySpans(block);
	setCaretCharOffsetInBlock(block, caretOffset);
	const sel = window.getSelection();
	if (!sel?.rangeCount) return;
	range = sel.getRangeAt(0);

	const pre = document.createRange();
	pre.selectNodeContents(block);
	pre.setEnd(range.endContainer, range.endOffset);
	const fullLen = pre.toString().length;
	const startChar = fullLen - slashLen;
	if (startChar < 0) return;

	let acc = 0;
	let startNode = null;
	let startOffset = 0;

	const walk = (node) => {
		if (startNode) return true;
		if (node.nodeType === 3) {
			const t = node.textContent.length;
			if (acc + t >= startChar) {
				startNode = node;
				startOffset = Math.max(0, startChar - acc);
				return true;
			}
			acc += t;
			return false;
		}
		for (const c of node.childNodes) {
			if (walk(c)) return true;
		}
		return false;
	};
	walk(block);
	if (!startNode) return;

	const del = document.createRange();
	del.setStart(startNode, startOffset);
	del.setEnd(range.endContainer, range.endOffset);
	del.deleteContents();
}

/** Remove trailing empty paragraph TipTap-style suffix from block HTML when replacing a line. */
function stripTrailingEmptyParagraphSuffix(html = "") {
	return html
		.replace(/<p>\s*<br\s*\/?>\s*<\/p>\s*$/i, "")
		.replace(/<p>\s*&nbsp;\s*<\/p>\s*$/i, "")
		.trim();
}

/**
 * After deleting `/command`, if the block is empty, replace it with parsed HTML; otherwise insert at caret.
 */
function insertDraftRichBlock(editorEl, htmlWithOptionalTrailingP) {
	if (!editorEl) return;
	editorEl.focus();
	const sel = typeof window !== "undefined" ? window.getSelection() : null;
	if (!sel?.rangeCount) {
		document.execCommand("insertHTML", false, htmlWithOptionalTrailingP);
		return;
	}
	let range = sel.getRangeAt(0);
	let block = getDraftBlockFromSelection(editorEl, range);
	if (block) {
		const text = getTextFromBlockStartToCaret(block, range);
		const slash = matchDraftSlashQuery(text);
		if (slash) {
			deleteDraftSlashToken(block, range, slash.slashToken.length);
			const sel2 = window.getSelection();
			if (sel2?.rangeCount) {
				range = sel2.getRangeAt(0);
				block = getDraftBlockFromSelection(editorEl, range);
			}
		}
	}
	const remains = (block?.innerText || "")
		.replace(/\u00a0/g, " ")
		.replace(/\u200b/g, "")
		.trim();
	const tag = block?.tagName?.toLowerCase();
	const canReplaceLine =
		block &&
		!remains &&
		["p", "h1", "h2", "h3", "h4"].includes(tag) &&
		!block.closest?.("li, td, th, blockquote");
	if (canReplaceLine) {
		const inner = stripTrailingEmptyParagraphSuffix(htmlWithOptionalTrailingP);
		const container = document.createElement("div");
		container.innerHTML = inner;
		const parent = block.parentNode;
		if (!parent) return;
		const toInsert = Array.from(container.childNodes);
		for (const n of toInsert) parent.insertBefore(n, block);
		parent.removeChild(block);
		const root = toInsert[0];
		const pre =
			root?.nodeType === 1 && root.hasAttribute?.("data-block")
				? root.querySelector("pre[contenteditable]")
				: null;
		try {
			const r = document.createRange();
			const sel2 = window.getSelection();
			if (!sel2) return;
			if (pre && pre.firstChild) {
				r.setStart(pre.firstChild, 0);
				r.collapse(true);
			} else if (pre) {
				r.selectNodeContents(pre);
				r.collapse(true);
			} else if (root?.nodeType === 1) {
				const ph =
					root.querySelector(
						"summary span[style*='flex'], [data-draft-panel] p, p",
					) || root;
				r.selectNodeContents(ph);
				r.collapse(true);
			} else {
				r.setStart(parent, 0);
				r.collapse(true);
			}
			sel2.removeAllRanges();
			sel2.addRange(r);
		} catch {
			editorEl.focus();
		}
		return;
	}
	document.execCommand("insertHTML", false, htmlWithOptionalTrailingP);
}

function deleteDraftSlashFromCaret(editorEl) {
	const sel = typeof window !== "undefined" ? window.getSelection() : null;
	if (!editorEl || !sel?.rangeCount) return;
	const range = sel.getRangeAt(0);
	const block = getDraftBlockFromSelection(editorEl, range);
	if (!block) return;
	const text = getTextFromBlockStartToCaret(block, range);
	const slash = matchDraftSlashQuery(text);
	if (slash) deleteDraftSlashToken(block, range, slash.slashToken.length);
}

/**
 * Universal social-media embed resolver.
 *
 * Returns one of two shapes:
 *   { platform, label, color, iframeSrc, aspectRatio }  — iframeable platforms
 *   { platform, label, color, cardEmbed: true, url }    — non-iframeable (X, IG, Gist…)
 *     → inserted as a styled link card; no <script> tags, works with execCommand
 */
function resolveEmbed(raw) {
	try {
		const u = String(raw || "").trim();
		if (!u) return null;
		const url = new URL(u.includes("://") ? u : `https://${u}`);
		const host = url.hostname.replace(/^www\./, "");

		/* ── YouTube ── */
		if (host === "youtu.be" || host.includes("youtube.com")) {
			let id = null;
			if (host === "youtu.be") id = url.pathname.replace(/^\//, "").split(/[?#]/)[0];
			else {
				id = url.searchParams.get("v")
					|| url.pathname.match(/\/embed\/([^/?#]+)/)?.[1]
					|| url.pathname.match(/\/shorts\/([^/?#]+)/)?.[1]
					|| url.pathname.match(/\/live\/([^/?#]+)/)?.[1];
			}
			if (!id) return null;
			return { platform: "YouTube", label: "YouTube", color: "#FF0000", iframeSrc: `https://www.youtube.com/embed/${id}?rel=0`, aspectRatio: "16/9" };
		}

		/* ── Twitter / X — blocks iframes; use a link card ── */
		if (host === "twitter.com" || host === "x.com") {
			return { platform: "Twitter/X", label: "Twitter / X", color: "#000000", cardEmbed: true, url: u };
		}

		/* ── Instagram — blocks iframes; use a link card ── */
		if (host === "instagram.com" || host === "instagr.am") {
			return { platform: "Instagram", label: "Instagram", color: "#E1306C", cardEmbed: true, url: u };
		}

		/* ── Reddit — use redditmedia embed endpoint ── */
		if (host === "reddit.com" || host === "redd.it") {
			// redditmedia allows iframing; convert the URL
			const clean = u.split("?")[0].replace(/\/$/, "");
			const embedSrc = clean.replace("www.reddit.com", "www.redditmedia.com")
				.replace("reddit.com", "www.redditmedia.com")
				+ "?ref_source=embed&ref=share&embed=true&theme=light";
			return { platform: "Reddit", label: "Reddit", color: "#FF4500", iframeSrc: embedSrc, aspectRatio: "4/3" };
		}

		/* ── TikTok ── */
		if (host === "tiktok.com" || host === "vm.tiktok.com") {
			const videoId = url.pathname.match(/\/video\/(\d+)/)?.[1];
			if (!videoId) return null;
			return { platform: "TikTok", label: "TikTok", color: "#010101", iframeSrc: `https://www.tiktok.com/embed/v2/${videoId}`, aspectRatio: "9/16" };
		}

		/* ── Spotify ── */
		if (host === "open.spotify.com" || host === "spotify.com") {
			const path = url.pathname;
			const embedPath = path
				.replace(/^\/(track|album|playlist|episode|show)\//, "/embed/$1/");
			const src = `https://open.spotify.com${embedPath}`;
			return { platform: "Spotify", label: "Spotify", color: "#1DB954", iframeSrc: src, aspectRatio: "80px" };
		}

		/* ── Vimeo ── */
		if (host === "vimeo.com" || host === "player.vimeo.com") {
			const id = url.pathname.match(/\/(\d+)/)?.[1];
			if (!id) return null;
			return { platform: "Vimeo", label: "Vimeo", color: "#1AB7EA", iframeSrc: `https://player.vimeo.com/video/${id}`, aspectRatio: "16/9" };
		}

		/* ── GitHub Gist — blocks iframes; link card ── */
		if (host === "gist.github.com") {
			return { platform: "GitHub Gist", label: "GitHub Gist", color: "#24292E", cardEmbed: true, url: u };
		}

		/* ── CodeSandbox ── */
		if (host === "codesandbox.io") {
			const src = u.replace(/codesandbox\.io\/s\//, "codesandbox.io/embed/");
			return { platform: "CodeSandbox", label: "CodeSandbox", color: "#151515", iframeSrc: src, aspectRatio: "16/9" };
		}

		/* ── Loom ── */
		if (host === "loom.com" || host === "www.loom.com") {
			const id = url.pathname.match(/\/share\/([a-z0-9]+)/i)?.[1];
			if (!id) return null;
			return { platform: "Loom", label: "Loom", color: "#625DF5", iframeSrc: `https://www.loom.com/embed/${id}`, aspectRatio: "16/9" };
		}

		/* ── Figma ── */
		if (host === "figma.com" || host === "www.figma.com") {
			const src = `https://www.figma.com/embed?embed_host=inkgest&url=${encodeURIComponent(u)}`;
			return { platform: "Figma", label: "Figma", color: "#F24E1E", iframeSrc: src, aspectRatio: "4/3" };
		}

		/* ── Generic iframe fallback ── */
		return { platform: "Embed", label: "Embed", color: "#5A5550", iframeSrc: u, aspectRatio: "16/9" };
	} catch {
	return null;
	}
}

const EMBED_ICONS = {
	"YouTube": "▶", "Twitter/X": "𝕏", "Instagram": "📸", "Reddit": "🤖",
	"TikTok": "♪", "Spotify": "🎵", "Vimeo": "🎬", "GitHub Gist": "📋",
	"CodeSandbox": "📦", "Loom": "🎥", "Figma": "🎨", "Embed": "🔗",
};

function makeEmbedHtml(embed) {
	if (!embed) return "";

	/* Card embed (non-iframeable: X, Instagram, Gist…)
	   Uses only plain HTML — no <script> tags — so execCommand works. */
	if (embed.cardEmbed) {
		const icon = EMBED_ICONS[embed.platform] || "🔗";
		const displayUrl = embed.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60);
		return `<div style="margin:16px 0;border:1.5px solid #E8E4DC;border-radius:12px;overflow:hidden;display:flex;align-items:center;gap:14px;padding:14px 18px;background:#FAFAF8;text-decoration:none;max-width:560px"><span style="font-size:24px;flex-shrink:0;line-height:1">${icon}</span><div style="flex:1;min-width:0"><p style="font-size:13px;font-weight:700;color:#37352F;margin:0 0 2px">${embed.label}</p><a href="${embed.url}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#C17B2F;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block">${displayUrl}</a></div><a href="${embed.url}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#9A9490;text-decoration:none;white-space:nowrap;padding:5px 10px;border:1px solid #E8E4DC;border-radius:6px;background:#fff">Open ↗</a></div><p><br></p>`;
	}

	/* iframeable platforms */
	const ar = embed.aspectRatio || "16/9";
	// Spotify uses a fixed px height, others use aspect-ratio
	const heightStyle = ar.includes("px")
		? `height:${ar};min-height:unset`
		: `aspect-ratio:${ar};height:auto;min-height:180px`;
	return `<p style="margin:16px 0"><iframe src="${embed.iframeSrc}" style="max-width:100%;width:100%;${heightStyle};border:0;border-radius:10px;display:block" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></p>`;
}

function escapeAttr(s) {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;");
}

/** Figure wrapper: caption, object-fit & width via ⋮ menu (editor only chrome stripped on export). */
function makeDraftImageFigureHtml(src) {
	const safe = escapeAttr(src);
	const mb =
		"display:block;width:100%;text-align:left;padding:8px 10px;border:none;background:transparent;border-radius:8px;font-size:13px;cursor:pointer;color:#37352F;font-family:inherit;font-weight:500";
	const mh = "font-size:10px;font-weight:700;color:#B0AAA3;letter-spacing:0.06em;padding:6px 10px 4px;text-transform:uppercase";
	const div =
		"position:absolute;right:0;top:100%;margin-top:6px;min-width:200px;background:#fff;border:1px solid #E8E4DC;border-radius:12px;box-shadow:0 10px 28px rgba(0,0,0,0.14);padding:6px;z-index:20;text-align:left";
	return `<figure data-draft-image-wrap="true" style="margin:18px auto 14px;text-align:center;max-width:100%"><div contenteditable="false" data-draft-image-inner style="position:relative;display:inline-block;max-width:100%;vertical-align:top"><details data-draft-img-popover style="position:absolute;top:6px;right:6px;z-index:6;margin:0"><summary style="list-style:none;cursor:pointer;width:32px;height:32px;border-radius:10px;background:rgba(45,43,40,0.88);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:20px;line-height:1;user-select:none;box-shadow:0 2px 10px rgba(0,0,0,0.18)">⋮</summary><div data-draft-img-menu style="${div}"><p style="${mh}">Object fit</p><button type="button" data-draft-img-fit="contain" style="${mb}">Contain</button><button type="button" data-draft-img-fit="cover" style="${mb}">Cover</button><button type="button" data-draft-img-fit="fill" style="${mb}">Fill</button><button type="button" data-draft-img-fit="scale-down" style="${mb}">Scale down</button><div style="height:1px;background:#E8E4DC;margin:6px 4px"></div><p style="${mh}">Width</p><button type="button" data-draft-img-size="100" style="${mb}">Full width</button><button type="button" data-draft-img-size="85" style="${mb}">Large — 85%</button><button type="button" data-draft-img-size="70" style="${mb}">Medium — 70%</button><button type="button" data-draft-img-size="50" style="${mb}">Small — 50%</button></div></details><div data-draft-image-frame style="width:100%;max-width:min(100%,720px);margin:0 auto;border-radius:10px;overflow:hidden;line-height:0"><img src="${safe}" alt="" data-draft-img="" style="width:100%;height:auto;max-height:75vh;display:block;object-fit:contain;object-position:center;vertical-align:middle;border-radius:10px"/></div></div><figcaption contenteditable="true" data-draft-caption="" data-placeholder="Add a caption…" style="margin-top:10px;font-size:12px;line-height:1.45;color:#7A7570;text-align:center;max-width:520px;margin-left:auto;margin-right:auto;outline:none;min-height:1.35em"></figcaption></figure><p><br></p>`;
}

function makeSimpleTableHtml() {
	const cell =
		"border:1px solid #e4e4e7;padding:16px 18px;line-height:1.85;min-height:3.5em;vertical-align:top;box-sizing:border-box;font-size:inherit;color:#37352F";
	const th =
		cell +
		";background:#f7f6f3;font-weight:600;text-align:left;color:#27272a";
	return `<table style="width:100%;border-collapse:collapse;border:1px solid #e4e4e7;margin:16px 0;table-layout:fixed"><thead><tr><th style="${th}">&nbsp;</th><th style="${th}">&nbsp;</th><th style="${th}">&nbsp;</th></tr></thead><tbody><tr><td style="${cell}">&nbsp;</td><td style="${cell}">&nbsp;</td><td style="${cell}">&nbsp;</td></tr><tr><td style="${cell}">&nbsp;</td><td style="${cell}">&nbsp;</td><td style="${cell}">&nbsp;</td></tr></tbody></table><p><br></p>`;
}

function makeDraftQuoteHtml() {
	return `<blockquote data-block="quote" style="margin:18px 0;padding:16px 20px 16px 22px;border-left:4px solid #C17B2F;background:linear-gradient(90deg,#FAF8F5 0%,#FFFFFF 72%);border-radius:0 10px 10px 0;box-shadow:0 1px 3px rgba(55,53,47,0.06)"><p style="margin:0;color:#45403A;font-size:15px;line-height:1.75;font-style:italic">Your quote goes here.</p></blockquote><p><br></p>`;
}

/** Self-contained switcher for copied HTML; pairs with PREVIEW_INTERACTION_SCRIPT in the editor. */
const DRAFT_TAB_BUTTON_ONCLICK = `(function(btn){var w=btn.closest("[data-block=\\"tabs\\"]");if(!w)return;var i=btn.getAttribute("data-tab-idx");w.querySelectorAll("[data-draft-panel]").forEach(function(p){p.style.display=p.getAttribute("data-draft-panel")===i?"block":"none";});w.querySelectorAll("[data-action=\\"draft-tab\\"]").forEach(function(b){var on=b.getAttribute("data-tab-idx")===i;b.style.background=on?"#fff":"transparent";b.style.boxShadow=on?"0 1px 2px rgba(0,0,0,0.06)":"none";b.style.fontWeight=on?"600":"500";b.style.color=on?"#37352F":"#7A7570";});})(this)`;

const DRAFT_CODEGROUP_TAB_ONCLICK = `(function(btn){var w=btn.closest("[data-block=\\"code-group\\"]");if(!w)return;var i=btn.getAttribute("data-cg-idx");w.querySelectorAll("[data-cg-panel]").forEach(function(p){p.style.display=p.getAttribute("data-cg-panel")===i?"block":"none";});w.querySelectorAll("[data-action=\\"cg-tab\\"]").forEach(function(b){var on=b.getAttribute("data-cg-idx")===i;b.style.background=on?"#fff":"transparent";b.style.fontWeight=on?"700":"600";b.style.color=on?"#37352F":"#6B6560";});})(this)`;

/* ─── Audio player inline JS (works in editor + exported HTML) ─────────────
   IMPORTANT: these strings are embedded inside onclick="..." (double-quoted)
   so they must NEVER contain unescaped double-quote characters.
   Use closest('figure') — no attribute selectors with inner quotes needed.
   Toggle play/pause by showing/hiding [data-pi] / [data-qi] child elements
   instead of innerHTML manipulation (which would also require quoted SVG attrs).
──────────────────────────────────────────────────────────────────────────── */
const AUDIO_PLAY_ONCLICK = `(function(btn){var fig=btn.closest('figure');var aud=fig&&fig.querySelector('audio');if(!aud)return;var fmt=function(s){var m=Math.floor(s/60)|0;var sc=Math.floor(s%60);return m+':'+(sc<10?'0':'')+sc;};var prog=fig.querySelector('[data-ap]');var curEl=fig.querySelector('[data-cur]');var durEl=fig.querySelector('[data-dur]');var pi=btn.querySelector('[data-pi]');var qi=btn.querySelector('[data-qi]');if(aud.paused){aud.play();if(pi)pi.style.display='none';if(qi)qi.style.display='';aud.onloadedmetadata=function(){if(durEl)durEl.textContent=fmt(aud.duration);};if(aud.duration&&durEl)durEl.textContent=fmt(aud.duration);aud.ontimeupdate=function(){if(curEl)curEl.textContent=fmt(aud.currentTime);if(prog&&aud.duration)prog.style.width=(aud.currentTime/aud.duration*100)+'%';};aud.onended=function(){if(pi)pi.style.display='';if(qi)qi.style.display='none';if(curEl)curEl.textContent='0:00';if(prog)prog.style.width='0%';};}else{aud.pause();if(pi)pi.style.display='';if(qi)qi.style.display='none';}})(this)`;
const AUDIO_SEEK_ONCLICK = `(function(bar,e){var fig=bar.closest('figure');var aud=fig&&fig.querySelector('audio');if(!aud)return;var rect=bar.getBoundingClientRect();var ratio=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));if(aud.duration)aud.currentTime=ratio*aud.duration;var prog=fig.querySelector('[data-ap]');if(prog)prog.style.width=(ratio*100)+'%';})(this,event)`;
const AUDIO_DELETE_ONCLICK = `(function(btn){var fig=btn.closest('figure');if(fig&&fig.parentNode){var p=document.createElement('p');p.innerHTML='<br>';fig.parentNode.insertBefore(p,fig.nextSibling||null);fig.parentNode.removeChild(fig);}})(this)`;

function makeDraftDividerHtml(type = "solid") {
	const borderMap = {
		solid: "1.5px solid #C8C4BC",
		dashed: "1.5px dashed #C8C4BC",
		dotted: "2px dotted #C8C4BC",
	};
	const border = borderMap[type] || borderMap.solid;
	return `<hr data-divider-type="${type}" style="border:none;border-top:${border};margin:28px 0" /><p><br></p>`;
}

function makeToggleGroupHtml() {
	const toggleItem = (q) =>
		`<details data-block="draft-toggle" style="border-bottom:1px solid #E8E4DC"><summary style="display:flex;align-items:center;gap:8px;padding:12px 14px;cursor:pointer;list-style:none;user-select:none;font-size:14px;font-weight:600;color:#37352F"><span data-toggle-chevron></span><span data-toggle-grip></span><span contenteditable="true" style="flex:1;outline:none">${q}</span></summary><div contenteditable="true" style="padding:10px 14px 14px 44px;font-size:14px;color:#6B6560;line-height:1.7;outline:none"><p>Answer goes here…</p></div></details>`;
	return `<div data-block="toggle-group" style="margin:18px 0;border:1px solid #E8E4DC;border-radius:12px;overflow:hidden;background:#FAFAF8"><div contenteditable="false" style="padding:8px 14px;border-bottom:1px solid #E8E4DC;background:#F3EFE8;display:flex;align-items:center;gap:6px"><span contenteditable="true" data-toggle-group-label data-placeholder="Group heading…" style="font-size:11px;font-weight:700;color:#9A9490;text-transform:uppercase;letter-spacing:0.07em;outline:none;min-width:40px">FAQ</span></div>${toggleItem("What is Inkgest?")}${toggleItem("How does the AI editor work?")}${toggleItem("Can I export to React, HTML, or Markdown?")}</div><p><br></p>`;
}

function makeCardBlockHtml() {
	return `<div data-block="card" style="margin:16px 0;border:1.5px solid #E8E4DC;border-radius:14px;padding:20px 22px;background:#FAFAF8;display:flex;gap:14px;align-items:flex-start"><div data-card-icon data-icon-selector data-icon-type="emoji" contenteditable="false" title="Click to change icon" style="font-size:28px;line-height:1;flex-shrink:0;min-width:36px;text-align:center;cursor:pointer;user-select:none"><span style="font-size:28px;line-height:1">🎯</span></div><div style="flex:1;min-width:0"><div contenteditable="true" data-card-heading data-placeholder="Card heading" style="font-size:16px;font-weight:700;color:#37352F;margin-bottom:6px;outline:none;line-height:1.3">Card heading</div><div contenteditable="true" data-card-desc data-placeholder="Write a short description…" style="font-size:14px;color:#6B6560;line-height:1.7;outline:none">Write a short description for this card.</div></div></div><p><br></p>`;
}

function makeIconBlockHtml(value = "✨", type = "emoji") {
	const inner =
		type === "lucide"
			? value /* already an SVG string */
			: `<span style="font-size:28px;line-height:1">${value}</span>`;
	return `<span data-icon-selector data-icon-type="${type}" contenteditable="false" title="Click to change icon" style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;padding:2px;border-radius:6px;vertical-align:middle">${inner}</span>`;
}

function makeAudioBlockHtml(src = "", name = "Audio track", caption = "") {
	const safeSrc = src.replace(/"/g, "&quot;");
	const safeName = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
	const safeCaption = caption.replace(/</g, "&lt;").replace(/>/g, "&gt;");
	const waveGray  = "repeating-linear-gradient(90deg,#9A9490 0,#9A9490 2px,transparent 2px,transparent 8px)";
	const waveAmber = "repeating-linear-gradient(90deg,#C17B2F 0,#C17B2F 2px,transparent 2px,transparent 8px)";
	/* Play icon ▶ and Pause icon ⏸ — both kept in DOM, toggled via display */
	const playSvg  = `<svg data-pi width="14" height="14" viewBox="0 0 24 24" style="display:block"><polygon points="5,3 19,12 5,21" fill="white" stroke="none"/></svg>`;
	const pauseSvg = `<svg data-qi width="14" height="14" viewBox="0 0 24 24" style="display:none"><rect x="5" y="3" width="4" height="18" fill="white" rx="1"/><rect x="15" y="3" width="4" height="18" fill="white" rx="1"/></svg>`;
	return (
		`<figure data-block="audio-block" style="margin:18px 0;border:1px solid #E8E4DC;border-radius:14px;overflow:hidden;background:#FAFAF8;position:relative">` +
		/* ── Delete button (top-right) ── */
		`<button type="button" onclick="${AUDIO_DELETE_ONCLICK}" contenteditable="false" title="Remove audio block" style="position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:6px;border:1px solid #E8E4DC;background:#fff;color:#9A9490;font-size:12px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;padding:0">✕</button>` +
		`<div contenteditable="false" style="padding:14px 16px 12px;display:flex;flex-direction:column;gap:10px">` +
			/* ── Header: emoji icon + editable name ── */
			`<div style="display:flex;align-items:center;gap:10px;padding-right:28px">` +
				`<div data-icon-selector data-icon-type="emoji" contenteditable="false" title="Click to change icon" style="width:34px;height:34px;border-radius:8px;background:#FEF3E2;border:1px solid #F6D9A8;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;user-select:none;font-size:18px;line-height:1">🎵</div>` +
				`<div style="flex:1;min-width:0">` +
					`<div contenteditable="true" data-audio-name data-placeholder="Track name…" style="font-size:13px;font-weight:600;color:#37352F;outline:none;line-height:1.4">${safeName}</div>` +
				`</div>` +
			`</div>` +
			/* ── Player chrome ── */
			`<div style="background:#37352F;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:12px">` +
				`<audio data-audio-src src="${safeSrc}" preload="metadata" style="display:none"></audio>` +
				/* Play/pause button — uses [data-pi] / [data-qi] children, no innerHTML swap */
				`<button type="button" onclick="${AUDIO_PLAY_ONCLICK}" style="width:34px;height:34px;border-radius:50%;background:#555250;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0">` +
					playSvg + pauseSvg +
				`</button>` +
				/* Waveform + seek + time */
				`<div style="flex:1;display:flex;flex-direction:column;gap:5px;min-width:0">` +
					`<div onclick="${AUDIO_SEEK_ONCLICK}" style="position:relative;height:20px;cursor:pointer;display:flex;align-items:center">` +
						`<div style="position:absolute;inset:0;display:flex;align-items:center;pointer-events:none">` +
							`<div style="width:100%;height:3px;background:${waveGray};border-radius:2px;opacity:0.5"></div>` +
						`</div>` +
						`<div data-ap style="position:absolute;left:0;top:0;height:100%;width:0%;overflow:hidden;pointer-events:none">` +
							`<div style="position:absolute;inset:0;display:flex;align-items:center">` +
								`<div style="width:9999px;height:3px;background:${waveAmber};border-radius:2px"></div>` +
							`</div>` +
						`</div>` +
					`</div>` +
					`<div style="display:flex;justify-content:space-between;align-items:center">` +
						`<span data-cur style="font-size:10px;color:#9A9490;font-variant-numeric:tabular-nums">0:00</span>` +
						`<span style="font-size:10px;color:#6B6560;font-weight:600;letter-spacing:0.06em">&#127911; NOW PLAYING</span>` +
						`<span data-dur style="font-size:10px;color:#9A9490;font-variant-numeric:tabular-nums">0:00</span>` +
					`</div>` +
				`</div>` +
			`</div>` +
		`</div>` +
		`<figcaption contenteditable="true" data-audio-caption data-placeholder="Add a caption…" style="padding:8px 16px 10px;font-size:12px;color:#7A7570;line-height:1.5;outline:none;border-top:1px solid #F0ECE5;min-height:1.4em">${safeCaption}</figcaption>` +
		`</figure><p><br></p>`
	);
}

function makeDraftTabsHtml() {
	return `<div data-block="tabs" style="margin:18px 0;border:1px solid #E8E4DC;border-radius:12px;background:#FAFAF8;overflow:hidden"><div contenteditable="false" style="display:flex;gap:4px;padding:8px 10px;border-bottom:1px solid #E8E4DC;background:#F3EFE8;user-select:none;flex-wrap:wrap"><button type="button" data-action="draft-tab" data-tab-idx="0" onclick="${DRAFT_TAB_BUTTON_ONCLICK}" style="padding:6px 12px;border:none;border-radius:8px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.06);font-size:12px;font-weight:600;color:#37352F;cursor:pointer">Tab 1</button><button type="button" data-action="draft-tab" data-tab-idx="1" onclick="${DRAFT_TAB_BUTTON_ONCLICK}" style="padding:6px 12px;border:none;border-radius:8px;background:transparent;font-size:12px;font-weight:500;color:#7A7570;cursor:pointer">Tab 2</button></div><div data-draft-tab-panels><div data-draft-panel="0" style="padding:12px 14px;display:block;min-height:48px"><p><br></p></div><div data-draft-panel="1" style="padding:12px 14px;display:none;min-height:48px"><p><br></p></div></div></div><p><br></p>`;
}

function makeDraftCodeGroupHtml() {
	const preStyle =
		"background:#1A1A1A;margin:0;padding:16px 18px;overflow-x:auto;min-height:72px;font-family:'Fira Code','Cascadia Code','Courier New',monospace;font-size:13px;line-height:1.75;color:#E8D5B0;white-space:pre-wrap;outline:none;border:none;display:block;width:100%;box-sizing:border-box";
	return `<div data-block="code-group" style="margin:16px 0;border:1px solid #E8E4DC;border-radius:10px;overflow:hidden"><div contenteditable="false" style="display:flex;gap:4px;padding:6px 8px;background:#F0ECE5;border-bottom:1px solid #E8E4DC;user-select:none"><button type="button" data-action="cg-tab" data-cg-idx="0" onclick="${DRAFT_CODEGROUP_TAB_ONCLICK}" style="padding:5px 10px;border:none;border-radius:6px;background:#fff;font-size:11px;font-weight:700;cursor:pointer;color:#37352F">Snippet 1</button><button type="button" data-action="cg-tab" data-cg-idx="1" onclick="${DRAFT_CODEGROUP_TAB_ONCLICK}" style="padding:5px 10px;border:none;border-radius:6px;background:transparent;font-size:11px;font-weight:600;cursor:pointer;color:#6B6560">Snippet 2</button></div><div data-cg-panel="0" style="display:block"><pre contenteditable="true" style="${preStyle}">// Snippet 1</pre></div><div data-cg-panel="1" style="display:none"><pre contenteditable="true" style="${preStyle}">// Snippet 2</pre></div></div><p><br></p>`;
}

function makeDraftToggleHtml() {
	return `<details data-block="draft-toggle" style="margin:16px 0;border:1px solid #E8E4DC;border-radius:10px;padding:0;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(55,53,47,0.06)"><summary style="display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;background:#F7F5F0;color:#37352F;list-style:none;outline:none;user-select:none;-webkit-user-select:none"><span contenteditable="false" data-toggle-chevron></span><span style="flex:1;font-weight:600">Toggle</span><span contenteditable="false" data-toggle-grip title=""></span></summary><div style="padding:14px 18px 18px;border-top:1px solid #E8E4DC;background:#fff"><p style="margin:0"><br></p></div></details><p><br></p>`;
}

function draftSlashItemMatchesQuery(item, query) {
	if (!query) return true;
	const q = query.toLowerCase();
	if ((item.label || "").toLowerCase().includes(q)) return true;
	if ((item.id || "").toLowerCase().includes(q)) return true;
	return item.keywords?.some((k) => (k || "").toLowerCase().includes(q)) ?? false;
}

function measureDraftSlashCoords(range, editorFallbackEl, editorFontSize) {
	let rect = range.getBoundingClientRect();
	if (
		(rect.width === 0 && rect.height === 0) ||
		(rect.left === 0 && rect.top === 0)
	) {
		const cr = range.getClientRects();
		if (cr.length > 0) rect = cr[0];
		else if (editorFallbackEl) {
			const er = editorFallbackEl.getBoundingClientRect();
			rect = {
				left: er.left + 48,
				top: er.top + 36,
				width: 0,
				height: editorFontSize * 1.75,
				bottom: er.top + 36 + editorFontSize * 1.75,
				right: er.left + 48,
			};
		}
	}
	return {
		x: Math.max(12, Math.min(rect.left, window.innerWidth - 280)),
		y: rect.bottom + 6,
	};
}

/** Prefer the highlighted slash-query span so the menu sits below typed /filter text. */
function measureDraftSlashMenuPosition(
	block,
	range,
	editorFallbackEl,
	editorFontSize,
) {
	if (!block || !range) return null;
	const span = block.querySelector("[data-draft-slash-query]");
	if (span) {
		const rect = span.getBoundingClientRect();
		return {
			x: Math.max(12, Math.min(rect.left, window.innerWidth - 280)),
			y: rect.bottom + 6,
		};
	}
	return measureDraftSlashCoords(range, editorFallbackEl, editorFontSize);
}

/** Find enclosing <a href> for the current selection (for toolbar link field). */
function getSelectionLinkContext(sel) {
	if (!sel?.rangeCount) return { href: "", anchor: null, collapsed: false };
	try {
		const range = sel.getRangeAt(0);
		let node = range.commonAncestorContainer;
		if (node.nodeType === 3) node = node.parentElement;
		const anchor = node?.closest?.("a[href]") || null;
		return {
			href: (anchor?.getAttribute("href") || "").trim(),
			anchor,
			collapsed: range.collapsed,
		};
	} catch {
		return { href: "", anchor: null, collapsed: false };
	}
}

const DRAFT_BUBBLE_INLINE = "data-draft-inline";

function getDraftBubbleBlock(editorRoot, node) {
	if (!editorRoot || !node) return null;
	let n = node;
	if (n.nodeType === 3) n = n.parentElement;
	const block = n?.closest?.(
		"p,h1,h2,h3,h4,li,blockquote,div[data-block],td,th",
	);
	if (!block || !editorRoot.contains(block)) return null;
	return block;
}

function draftSelectionSpansMultipleBlocks(editorRoot, range) {
	const a = getDraftBubbleBlock(editorRoot, range.startContainer);
	const b = getDraftBubbleBlock(editorRoot, range.endContainer);
	return Boolean(a && b && a !== b);
}

function unwrapDraftInlineSpan(span) {
	const parent = span.parentNode;
	if (!parent) return;
	while (span.firstChild) parent.insertBefore(span.firstChild, span);
	parent.removeChild(span);
}

/**
 * Wrap selection in span[data-draft-inline] with explicit color / background-color
 * so formatting wins over inherited editor styles (contenteditable color, etc.).
 * Returns false if skipped (e.g. cross-block) so caller can fall back to execCommand.
 */
function applyDraftBubbleInlineStyle(editorEl, patch) {
	const sel = typeof window !== "undefined" ? window.getSelection() : null;
	if (!sel?.rangeCount || !editorEl) return false;
	const range = sel.getRangeAt(0);
	if (range.collapsed) return false;
	if (!editorEl.contains(range.commonAncestorContainer)) return false;
	if (draftSelectionSpansMultipleBlocks(editorEl, range)) return false;

	try {
		const frag = range.extractContents();
		let span;
		const first = frag.firstChild;
		const singleOurSpan =
			frag.childNodes.length === 1 &&
			first?.nodeType === 1 &&
			first.tagName === "SPAN" &&
			first.getAttribute(DRAFT_BUBBLE_INLINE) === "";
		if (singleOurSpan) {
			span = first;
		} else {
			span = editorEl.ownerDocument.createElement("span");
			span.setAttribute(DRAFT_BUBBLE_INLINE, "");
			span.appendChild(frag);
		}

		if ("color" in patch) {
			if (patch.color)
				span.style.setProperty("color", patch.color);
			else span.style.removeProperty("color");
		}
		if ("backgroundColor" in patch) {
			if (patch.backgroundColor)
				span.style.setProperty("background-color", patch.backgroundColor);
			else span.style.removeProperty("background-color");
		}

		range.insertNode(span);

		const hasColor = Boolean(
			span.style.color && span.style.getPropertyValue("color") !== "",
		);
		const hasBg = Boolean(
			span.style.backgroundColor &&
				span.style.getPropertyValue("background-color") !== "",
		);
		if (!hasColor && !hasBg) {
			unwrapDraftInlineSpan(span);
			sel.removeAllRanges();
			return true;
		}

		sel.removeAllRanges();
		const nr = editorEl.ownerDocument.createRange();
		nr.selectNodeContents(span);
		sel.addRange(nr);
		return true;
	} catch {
		return false;
	}
}

function execDraftForeColor(hex) {
	try {
		document.execCommand("styleWithCSS", false, true);
	} catch {
		/* ignore */
	}
	document.execCommand("foreColor", false, hex);
}

function execDraftHiliteColor(hex) {
	try {
		document.execCommand("styleWithCSS", false, true);
	} catch {
		/* ignore */
	}
	document.execCommand("hiliteColor", false, hex);
}

/** Slash menu rows (filter by query after `/`, no spaces in query). */
// subSection gives finer grouping inside the slash dropdown
const DRAFT_SLASH_BASE_ITEMS = [
	/* ── Typography ── */
	{ id: "text",     label: "Text",          icon: "T",    section: "style",  subSection: "Typography",  keywords: ["text", "paragraph", "p", "plain", "body"] },
	{ id: "h1",       label: "Heading 1",     icon: "H₁",   section: "style",  subSection: "Typography",  keywords: ["h1", "heading", "title", "one", "1"] },
	{ id: "h2",       label: "Heading 2",     icon: "H₂",   section: "style",  subSection: "Typography",  keywords: ["h2", "heading", "two", "subtitle", "2"] },
	{ id: "h3",       label: "Heading 3",     icon: "H₃",   section: "style",  subSection: "Typography",  keywords: ["h3", "heading", "three", "3"] },
	{ id: "quote",    label: "Quote",         icon: "❝",    section: "style",  subSection: "Typography",  keywords: ["quote", "blockquote", "pull", "bq"] },
	/* ── Lists ── */
	{ id: "bullet",   label: "Bullet List",   icon: "list", section: "style",  subSection: "Lists",       keywords: ["bullet", "ul", "unordered", "list"] },
	{ id: "numbered", label: "Numbered List", icon: "list", section: "style",  subSection: "Lists",       keywords: ["numbered", "ordered", "ol", "list"] },
	{ id: "todo",     label: "To-do List",    icon: "☐",    section: "style",  subSection: "Lists",       keywords: ["todo", "task", "check", "list", "checkbox", "checklist"] },
	/* ── Media ── */
	{ id: "image",    label: "Image",         icon: "image",  section: "blocks", subSection: "Media",     keywords: ["image", "img", "photo", "picture", "upload"] },
	{ id: "embed",    label: "Embed",           icon: "embed", section: "blocks", subSection: "Media",    keywords: ["embed", "youtube", "twitter", "x", "instagram", "reddit", "tiktok", "spotify", "vimeo", "loom", "figma", "video", "social", "iframe"] },
	{ id: "audio",    label: "Audio File",    icon: "♪",    section: "blocks", subSection: "Media",       keywords: ["audio", "music", "mp3", "sound", "track", "podcast"] },
	{ id: "record",   label: "Record Audio",  icon: "⏺",    section: "blocks", subSection: "Media",       keywords: ["record", "recording", "microphone", "mic", "voice", "capture"] },
	/* ── Data ── */
	{ id: "table",    label: "Table",         icon: "table", section: "blocks", subSection: "Data",       keywords: ["table", "grid", "rows", "sheet", "csv"] },
	{ id: "date",     label: "Date",          icon: "📅",    section: "blocks", subSection: "Data",        keywords: ["date", "today", "calendar", "time"] },
	/* ── Components ── */
	{ id: "card",         label: "Card",               icon: "▭", section: "blocks", subSection: "Components", keywords: ["card", "box", "panel", "feature", "icon card"] },
	{ id: "toggle-group", label: "Toggle Group (FAQ)", icon: "☰", section: "blocks", subSection: "Components", keywords: ["faq", "toggle group", "accordion", "collapse", "questions"] },
	{ id: "toggle",       label: "Toggle",             icon: "▸", section: "blocks", subSection: "Components", keywords: ["toggle", "details", "collapse", "accordion", "disclosure"] },
	{ id: "tabs",         label: "Tabs",               icon: "▦", section: "blocks", subSection: "Components", keywords: ["tabs", "tab", "panels", "tabgroup"] },
	{ id: "icon-block",   label: "Icon",               icon: "✦", section: "blocks", subSection: "Components", keywords: ["icon", "emoji", "symbol", "glyph", "svg"] },
	/* ── Callouts ── */
	{ id: "callout-info",    label: "Info Callout",    icon: "ℹ️",  section: "blocks", subSection: "Callouts", keywords: ["info", "information", "note", "blue", "tip"] },
	{ id: "callout-warning", label: "Warning Callout", icon: "⚠️",  section: "blocks", subSection: "Callouts", keywords: ["callout", "warning", "caution", "attention"] },
	{ id: "callout-success", label: "Success Callout", icon: "✅",  section: "blocks", subSection: "Callouts", keywords: ["success", "done", "green", "check", "positive"] },
	{ id: "callout-danger",  label: "Danger Callout",  icon: "🚨",  section: "blocks", subSection: "Callouts", keywords: ["danger", "error", "red", "alert", "critical"] },
	/* ── Code ── */
	{ id: "code",      label: "Code Block", icon: "{ }", section: "blocks", subSection: "Code", keywords: ["code", "codeblock", "snippet", "pre", "program"] },
	{ id: "codeGroup", label: "Code Group", icon: "▤",   section: "blocks", subSection: "Code", keywords: ["codegroup", "code group", "snippets", "multi", "gist"] },
	/* ── Dividers ── */
	{ id: "divider",        label: "Solid Line",  icon: "—",   section: "blocks", subSection: "Dividers", keywords: ["divider", "horizontal", "hr", "rule", "separator", "solid"] },
	{ id: "divider-dashed", label: "Dashed Line", icon: "╌",   section: "blocks", subSection: "Dividers", keywords: ["divider", "dashed", "hr", "separator", "line"] },
	{ id: "divider-dotted", label: "Dotted Line", icon: "···", section: "blocks", subSection: "Dividers", keywords: ["divider", "dotted", "hr", "separator", "dots"] },
];

const DRAFT_SLASH_AI_KEYWORDS = ["ai", "ask", "chat", "gpt", "assistant", "magic"];

function getDraftSlashFlatRows(query) {
	const q = (query ?? "").trim().toLowerCase();
	const rows = [];
	const aiHit = draftSlashItemMatchesQuery(
		{ id: "ask-ai", label: "Ask AI", keywords: DRAFT_SLASH_AI_KEYWORDS },
		q,
	);
	if (aiHit) rows.push({ id: "ask-ai" });
	for (const it of DRAFT_SLASH_BASE_ITEMS) {
		if (draftSlashItemMatchesQuery(it, q)) rows.push({ id: it.id });
	}
	return rows;
}

/* ─── Draft Page ─── */
export default function DraftPage() {
	const router = useRouter();
	const { draftId, tabs: tabsQuery } = router.query;
	const reduxUser = useSelector((state) => state.user?.user ?? null);

	/* Open tabs from URL query (?tabs=id1,id2,id3) — active tab = draftId from path */
	const openTabs = (() => {
		if (!draftId) return [];
		const fromQuery =
			typeof tabsQuery === "string" ? tabsQuery.split(",").filter(Boolean) : [];
		if (fromQuery.length === 0) return [draftId];
		if (!fromQuery.includes(draftId))
			return [draftId, ...fromQuery].slice(0, MAX_TABS);
		return fromQuery;
	})();

	const navigateWithTabs = (targetDraftId, newTabIds) => {
		const ids = newTabIds.length > 0 ? newTabIds : [targetDraftId];
		router.push(`/app/${targetDraftId}?tabs=${ids.join(",")}`, undefined, {
			shallow: false,
		});
	};

	const openDraftInTab = (id) => {
		if (id === draftId) return;
		const current = openTabs.includes(draftId)
			? openTabs
			: [draftId, ...openTabs];
		let next = current.includes(id)
			? current
			: [id, ...current.filter((x) => x !== id)].slice(0, MAX_TABS);
		navigateWithTabs(id, next);
	};

	const closeTab = (id, e) => {
		e?.stopPropagation();
		const next = openTabs.filter((t) => t !== id);
		if (next.length === 0) {
			router.push("/app");
			return;
		}
		const target = id === draftId ? next[0] : draftId;
		navigateWithTabs(target, next);
	};

	/* Lookup draft title by id (from drafts list, tables list, or current doc) */
	const getTabTitle = (id) => {
		if (draft?.id === id) return draft?.title || "Untitled";
		if (docData?.type === "table" && docData.doc?.id === id)
			return docData.doc.title || "Untitled";
		if (docData?.type === "infographics" && docData.doc?.id === id)
			return docData.doc.title || "Infographics";
		if (docData?.type === "landing_page" && docData.doc?.id === id)
			return docData.doc.title || "Landing Page";
		if (docData?.type === "image_gallery" && docData.doc?.id === id)
			return docData.doc.title || "Image Gallery";
		const d =
			drafts.find((x) => x.id === id) ||
			tables.find((x) => x.id === id) ||
			infographics.find((x) => x.id === id) ||
			landingPages.find((x) => x.id === id) ||
			imageGalleries.find((x) => x.id === id);
		return d?.title || "Untitled";
	};

	const truncate = (s, len = 18) =>
		!s ? "Untitled" : s.length <= len ? s : s.slice(0, len - 1) + "…";

	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [copied, setCopied] = useState(false);
	const [saved, setSaved] = useState(false);
	const [wordCount, setWordCount] = useState(0);
	const [loginModalOpen, setLoginModalOpen] = useState(false);
	const [deleteConfirm, setDeleteConfirm] = useState(null);
	const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
	const [copiedTheme, setCopiedTheme] = useState(null); // { key, format: 'html' | 'react' | 'markdown' | 'text' | 'publicUrl' }
	const [previewTheme, setPreviewTheme] = useState("ink");
	const [translationLang, setTranslationLang] = useState("en");
	const [translating, setTranslating] = useState(false);
	const [translatedHTML, setTranslatedHTML] = useState("");
	const [themeExportOpen, setThemeExportOpen] = useState(false);
	const themeExportRef = useRef(null);
	const [infographicsOpen, setInfographicsOpen] = useState(false);
	const [chatOpen, setChatOpen] = useState(false);
	const [blockMenuOpen, setBlockMenuOpen] = useState(false);
	const [imageDropdownOpen, setImageDropdownOpen] = useState(false);
	const [imageUrlInput, setImageUrlInput] = useState("");
	const [imageUploading, setImageUploading] = useState(false);
	const [selectionDropdown, setSelectionDropdown] = useState(null);
	const [selectionSubtool, setSelectionSubtool] = useState(null);
	const [selectionLinkUrl, setSelectionLinkUrl] = useState("");
	const selectionSavedRangeRef = useRef(null);
	const selectionLinkInputRef = useRef(null);
	const [selectionContext, setSelectionContext] = useState("");
	const [slashCommand, setSlashCommand] = useState(null);
	const slashCommandRef = useRef(null);
	slashCommandRef.current = slashCommand;
	const [slashListIndex, setSlashListIndex] = useState(0);
	const slashListIndexRef = useRef(0);
	slashListIndexRef.current = slashListIndex;
	const [draftImageModalOpen, setDraftImageModalOpen] = useState(false);
	const [draftImageModalUrl, setDraftImageModalUrl] = useState("");
	const [audioModalOpen, setAudioModalOpen] = useState(false);
	const [audioUploading, setAudioUploading] = useState(false);
	const audioFileInputRef = useRef(null);
	const [embedModalOpen, setEmbedModalOpen] = useState(false);
	const [embedUrlInput, setEmbedUrlInput] = useState("");
	const [embedResolved, setEmbedResolved] = useState(null); // resolved embed object
	const embedRangeRef = useRef(null); // saved cursor range before modal opened
	const [recordingOpen, setRecordingOpen] = useState(false);
	const [recordingState, setRecordingState] = useState("idle"); // idle | requesting | recording | uploading
	const [recordingSeconds, setRecordingSeconds] = useState(0);
	const [recordingMode, setRecordingMode] = useState("audio"); // "audio" | "text"
	const [transcriptFinal, setTranscriptFinal] = useState("");
	const [transcriptInterim, setTranscriptInterim] = useState("");
	const mediaRecorderRef = useRef(null);
	const recordingChunksRef = useRef([]);
	const recordingStreamRef = useRef(null);
	const recordingTimerRef = useRef(null);
	const recognitionRef = useRef(null);
	const [draftSlashDatePickerPos, setDraftSlashDatePickerPos] = useState(null);
	const [datePickerInitial, setDatePickerInitial] = useState(new Date());
	const dateEditTargetRef = useRef(null);
	// ── Details drawer + export dropdown ──
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [exportDropOpen, setExportDropOpen] = useState(false);
	const exportDropRef = useRef(null);
	// ── Navbar block-menu ──
	const [blocksMenuOpen, setBlocksMenuOpen] = useState(false);
	const blocksMenuRef = useRef(null);
	const [detailFontOpen, setDetailFontOpen] = useState(false);
	const [detailStyleOpen, setDetailStyleOpen] = useState(false);
	// ── Publish settings ──
	const [isPublic, setIsPublic] = useState(false);
	const [slugInput, setSlugInput] = useState("");
	const [publishDropOpen, setPublishDropOpen] = useState(false);
	const [publishSaving, setPublishSaving] = useState(false);
	const [publishCopied, setPublishCopied] = useState(false);
	const [publishShareTheme, setPublishShareTheme] = useState("ink");
	const [publishThemedCopied, setPublishThemedCopied] = useState(false);
	const [copiedPubThemeRow, setCopiedPubThemeRow] = useState(null);
	const publishDropRef = useRef(null);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [translationModalOpen, setTranslationModalOpen] = useState(false);
	const [translationCopyOpen, setTranslationCopyOpen] = useState(false);
	const translationCopyRef = useRef(null);
	const [previewCopied, setPreviewCopied] = useState(null);
	const [previewExportOpen, setPreviewExportOpen] = useState(false);
	const previewExportRef = useRef(null);
	const [previewData, setPreviewData] = useState({
		title: "",
		htmlDoc: "",
		markdown: "",
		reactSnippet: "",
	});
	const [editorFont, setEditorFont] = useState("Comic");
	useEffect(() => {
		setEditorFont((f) => (f === "Inter" ? "Comic" : f));
	}, []);
	const [editorFontSize, setEditorFontSize] = useState(15);
	const [editorVariant, setEditorVariant] = useState("default"); // "default" | "paper" | "typewriter" | "terminal" | "minimal"
	const [localTableData, setLocalTableData] = useState(null);
	const [iconSelector, setIconSelector] = useState(null); // { x, y, target: DOM element }
	const iconSelectorRef = useRef(null);
	const [dragHandle, setDragHandle] = useState(null); // { top, handleLeft, block }
	const [dropIndicator, setDropIndicator] = useState(null); // { top, left, width }
	const dragSrcRef = useRef(null);
	const dragOverRef = useRef(null); // { block, before }
	const editorRef = useRef(null);
	const titleRef = useRef(null);
	const imageFileInputRef = useRef(null);
	const handleSlashCommandRef = useRef(() => {});
	const editorContainerRef = useRef(null);

	useEffect(() => {
		if (!iconSelector) return;
		const onDown = (e) => {
			if (!iconSelectorRef.current?.contains(e.target)) setIconSelector(null);
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [iconSelector]);

	useEffect(() => {
		if (!previewExportOpen) return;
		const onDown = (e) => {
			if (!previewExportRef.current?.contains(e.target)) {
				setPreviewExportOpen(false);
			}
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [previewExportOpen]);

	useEffect(() => {
		if (!previewOpen) setPreviewExportOpen(false);
	}, [previewOpen]);

	useEffect(() => {
		if (!themeExportOpen) return;
		const onDown = (e) => {
			if (!themeExportRef.current?.contains(e.target)) {
				setThemeExportOpen(false);
			}
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [themeExportOpen]);

	useEffect(() => {
		if (!themeDrawerOpen) setThemeExportOpen(false);
	}, [themeDrawerOpen]);

	useEffect(() => {
		if (!translationCopyOpen) return;
		const onDown = (e) => {
			if (!translationCopyRef.current?.contains(e.target)) {
				setTranslationCopyOpen(false);
			}
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [translationCopyOpen]);

	useEffect(() => {
		if (!translationModalOpen) setTranslationCopyOpen(false);
	}, [translationModalOpen]);

	/* All assets (drafts + tables) — from users/uid/assets or fallback to drafts+tables */
	const { data: items = [] } = useQuery({
		queryKey: ["assets", reduxUser?.uid],
		queryFn: () => listAssets(reduxUser.uid),
		enabled: !!reduxUser,
		staleTime: 2 * 60 * 1000,
	});

	const drafts = useMemo(
		() => items.filter((i) => i.type === "draft"),
		[items],
	);
	const tables = useMemo(
		() => items.filter((i) => i.type === "table"),
		[items],
	);
	const infographics = useMemo(
		() => items.filter((i) => i.type === "infographics"),
		[items],
	);
	const landingPages = useMemo(
		() => items.filter((i) => i.type === "landing_page"),
		[items],
	);
	const imageGalleries = useMemo(
		() => items.filter((i) => i.type === "image_gallery"),
		[items],
	);

	/* Single doc by ID — assets first, then drafts, then tables */
	const { data: docData, isLoading: loadingDraft } = useQuery({
		queryKey: ["doc", draftId, reduxUser?.uid],
		queryFn: async () => {
			const result = await getAsset(reduxUser.uid, draftId);
			if (result) return result;
			router.replace("/app");
			return null;
		},
		enabled: !!router.isReady && !!draftId && !!reduxUser,
		staleTime: 5 * 60 * 1000,
		retry: false,
	});

	/* Resolve doc by type; fallback: infer from structure when type missing/wrong */
	const doc = docData?.doc;
	const docType = docData?.type;
	const draft =
		(docType === "draft" || docType === "blog")
			? doc
			: (!docType && doc?.body != null)
				? doc
				: null;
	const tableDoc =
		docType === "table"
			? doc
			: !docType && Array.isArray(doc?.columns)
				? doc
				: null;
	const infographicsDoc =
		docType === "infographics"
			? doc
			: !docType && Array.isArray(doc?.infographics) && doc.infographics.length > 0
				? doc
				: null;
	const landingPageDoc =
		docType === "landing_page"
			? doc
			: !docType && (doc?.html || doc?.url)
				? doc
				: null;
	const imageGalleryDoc =
		docType === "image_gallery"
			? doc
			: !docType && Array.isArray(doc?.images) && doc.images.length > 0
				? doc
				: null;

	useEffect(() => {
		if (tableDoc) {
			setLocalTableData({
				title: tableDoc.title,
				description: tableDoc.description,
				columns: tableDoc.columns || [],
				rows: tableDoc.rows || [],
				sourceUrls: tableDoc.sourceUrls || [],
				prompt: tableDoc.prompt || "",
			});
		} else {
			setLocalTableData(null);
		}
	}, [draftId, tableDoc?.id]);

	/* Derive table data synchronously so content shows on first render (no useEffect delay) */
	const tableDataForView = tableDoc
		? localTableData ?? {
				title: tableDoc.title,
				description: tableDoc.description,
				columns: tableDoc.columns || [],
				rows: tableDoc.rows || [],
				sourceUrls: tableDoc.sourceUrls || [],
				prompt: tableDoc.prompt || "",
			}
		: null;

	/* Dynamic usage for navbar pill (drafts limit — kept for sidebar logic) */
	const used = drafts.filter((d) => isThisMonth(d.createdAt)).length;

	/* Credits for free users (10/month) */
	const [credits, setCredits] = useState(null);
	useEffect(() => {
		if (!reduxUser) {
			setCredits(null);
			return;
		}
		getUserCredits(reduxUser.uid)
			.then(setCredits)
			.catch((e) => console.error("Failed to load credits", e));
	}, [reduxUser]);
	const creditRemaining = credits
		? credits.plan === "pro"
			? Infinity
			: Math.max(0, credits.remaining ?? FREE_CREDIT_LIMIT)
		: FREE_CREDIT_LIMIT;

	/* Format markdown body → editor HTML, handling rich blocks */
	const formatBody = (body = "") => {
		if (body.trim().startsWith("<")) return body;

		/* 1. Extract multi-line blocks into tokens so line-splitting is safe */
		const tokens = [];
		let text = body;

		// Code fences  ```lang\ncode\n```
		text = text.replace(/```(\w*)\r?\n([\s\S]*?)```/g, (_, lang, code) => {
			const language = lang.trim() || "text";
			const escaped = code
				.trim()
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;");
			const tok = `\x01BLK${tokens.length}\x01`;
			tokens.push(makeCodeBlockHtml(language, escaped));
			return tok;
		});

		// Callout blocks  :::type\ntext\n:::
		text = text.replace(/:::(\w+)\r?\n([\s\S]*?):::/g, (_, type, content) => {
			const innerHtml = content.trim().replace(/\n/g, "<br>");
			const tok = `\x01BLK${tokens.length}\x01`;
			tokens.push(makeCalloutHtml(type, innerHtml));
			return tok;
		});

		/* 2. Line grouping: lists, blockquotes, headings, paragraphs (+ inline MD) */
		const restore = (s) => s.replace(/\x01BLK(\d+)\x01/g, (_, i) => tokens[+i]);

		const rawLines = text.split("\n");
		const parts = [];
		let i = 0;

		const h1Style =
			"font-family:'Comic',sans-serif;font-size:26px;color:#1A1A1A;margin:24px 0 10px;line-height:1.2;font-weight:700";
		const h2Style =
			"font-family:'Comic',sans-serif;font-size:20px;color:#1A1A1A;margin:20px 0 8px;line-height:1.3;font-weight:650";
		const h3Style =
			"font-family:'Comic',sans-serif;font-size:17px;color:#1A1A1A;margin:16px 0 7px;font-weight:600";
		const pStyle =
			"font-size:15px;line-height:1.75;color:#37352F;margin:0 0 6px;min-height:1.4em";
		const bqStyle =
			"border-left:3px solid #E8E7E4;padding:4px 0 4px 14px;color:#6F6A64;margin:12px 0;font-size:15px;line-height:1.75";

		while (i < rawLines.length) {
			let line = rawLines[i];
			if (/\x01BLK\d+\x01/.test(line)) {
				parts.push(restore(line));
				i++;
				continue;
			}
			if (line.trim() === "") {
				parts.push("<br/>");
				i++;
				continue;
			}

			if (line.startsWith("### ")) {
				parts.push(
					`<h3 style="${h3Style}">${parseInlineMarkdown(line.slice(4))}</h3>`,
				);
				i++;
				continue;
			}
			if (line.startsWith("## ")) {
				parts.push(
					`<h2 style="${h2Style}">${parseInlineMarkdown(line.slice(3))}</h2>`,
				);
				i++;
				continue;
			}
			if (line.startsWith("# ")) {
				parts.push(
					`<h1 style="${h1Style}">${parseInlineMarkdown(line.slice(2))}</h1>`,
				);
				i++;
				continue;
			}

			if (/^(\*{3}|-{3}|_{3})\s*$/.test(line.trim())) {
				parts.push(
					'<hr style="border:none;border-top:1px solid #E8E7E4;margin:22px 0"/>',
				);
				i++;
				continue;
			}

			if (line.startsWith("> ")) {
				const bqLines = [];
				while (i < rawLines.length && rawLines[i].startsWith("> ")) {
					bqLines.push(rawLines[i].slice(2));
					i++;
				}
				parts.push(
					`<blockquote style="${bqStyle}">${parseInlineMarkdown(bqLines.join("<br/>"))}</blockquote>`,
				);
				continue;
			}

			const taskRe = /^(\s*)[-*]\s+\[([ xX])\]\s+(.*)$/;
			if (taskRe.test(line)) {
				const lis = [];
				while (i < rawLines.length) {
					const m = rawLines[i].match(taskRe);
					if (!m) break;
					const checked = m[2].toLowerCase() === "x";
					const content = parseInlineMarkdown(m[3]);
					const chk = checked ? " checked" : "";
					lis.push(
						`<li class="todo-item" style="list-style:none;margin:4px 0;display:flex;align-items:flex-start;gap:10px;line-height:1.75"><input type="checkbox"${chk} class="todo-cb" style="margin-top:4px;flex-shrink:0;width:1em;height:1em;accent-color:#37352F"/><span class="todo-label" style="flex:1;min-width:0">${content}</span></li>`,
					);
					i++;
				}
				parts.push(
					`<ul data-todo="true" style="list-style:none;padding-left:0;margin:8px 0">${lis.join("")}</ul>`,
				);
				continue;
			}

			const ordRe = /^(\s*)\d+\.\s+(.*)$/;
			if (ordRe.test(line)) {
				const lis = [];
				while (i < rawLines.length) {
					const m = rawLines[i].match(/^(\s*)\d+\.\s+(.*)$/);
					if (!m) break;
					lis.push(
						`<li style="margin:3px 0;line-height:1.75">${parseInlineMarkdown(m[2])}</li>`,
					);
					i++;
				}
				parts.push(
					`<ol style="padding-left:28px;margin:8px 0;list-style:decimal">${lis.join("")}</ol>`,
				);
				continue;
			}

			const bulletRe = /^(\s*)[-*]\s+(?!\[[ xX]\])(.+)$/;
			const bm = line.match(bulletRe);
			if (bm) {
				const lis = [];
				while (i < rawLines.length) {
					const m = rawLines[i].match(bulletRe);
					if (!m) break;
					lis.push(
						`<li style="margin:3px 0;line-height:1.75">${parseInlineMarkdown(m[2])}</li>`,
					);
					i++;
				}
				parts.push(
					`<ul style="padding-left:28px;margin:8px 0;list-style:disc">${lis.join("")}</ul>`,
				);
				continue;
			}

			parts.push(`<p style="${pStyle}">${parseInlineMarkdown(line)}</p>`);
			i++;
		}

		return parts.join("");
	};

	/* Sync tabs to URL when we have draftId but no tabs query (e.g. direct link) */
	useEffect(() => {
		if (!draftId || !router.isReady) return;
		const fromQuery =
			typeof tabsQuery === "string" ? tabsQuery.split(",").filter(Boolean) : [];
		if (fromQuery.length === 0 && openTabs.length > 0) {
			router.replace(`/app/${draftId}?tabs=${openTabs.join(",")}`, undefined, {
				shallow: true,
			});
		}
	}, [draftId, router.isReady, tabsQuery]);

	/* Set editor content when draft loads */
	useEffect(() => {
		if (editorRef.current && draft) {
			editorRef.current.innerHTML = formatBody(draft.body || "");
			normalizeTodoLists(editorRef.current);
			countWords();
		}
	}, [draft]);

	/* Sync publish state from Firestore doc */
	useEffect(() => {
		if (draft) {
			setIsPublic(draft.isPublic ?? false);
			setSlugInput(draft.slug ?? "");
		}
	}, [draft?.isPublic, draft?.slug]);

	/* Close publish dropdown on outside click */
	useEffect(() => {
		const handler = (e) => {
			if (publishDropRef.current && !publishDropRef.current.contains(e.target)) {
				setPublishDropOpen(false);
			}
		};
		if (publishDropOpen) document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [publishDropOpen]);

	/* Close export dropdown on outside click */
	useEffect(() => {
		const handler = (e) => {
			if (exportDropRef.current && !exportDropRef.current.contains(e.target)) {
				setExportDropOpen(false);
			}
		};
		if (exportDropOpen) document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [exportDropOpen]);

	/* Close blocks menu on outside click */
	useEffect(() => {
		const handler = (e) => {
			if (blocksMenuRef.current && !blocksMenuRef.current.contains(e.target)) {
				setBlocksMenuOpen(false);
			}
		};
		if (blocksMenuOpen) document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [blocksMenuOpen]);

	const countWords = () => {
		const text = editorRef.current?.innerText || "";
		setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
	};

	const onEditorInput = () => {
		normalizeTodoLists(editorRef.current);
		syncDraftSlashQueryHighlight(editorRef.current);
		countWords();
		const updateSlashMenu = () => {
			const sel = window.getSelection();
			if (!editorRef.current || !sel?.rangeCount) {
				setSlashCommand(null);
				return;
			}
			const range = sel.getRangeAt(0);
			const block = getDraftBlockFromSelection(editorRef.current, range);
			if (!block) {
				setSlashCommand(null);
				return;
			}
			if (
				block.closest?.(
					"pre, code, [contenteditable='false']",
				)
			) {
				setSlashCommand(null);
				return;
			}
			const inSummary = block.closest?.("summary");
			if (
				inSummary &&
				!block.matches?.("span[contenteditable='true']")
			) {
				setSlashCommand(null);
				return;
			}
			const text = getTextFromBlockStartToCaret(block, range);
			const slash = matchDraftSlashQuery(text);
			if (!slash) {
				setSlashCommand(null);
				return;
			}
			const pos = measureDraftSlashMenuPosition(
				block,
				range,
				editorRef.current,
				editorFontSize,
			);
			if (!pos) {
				setSlashCommand(null);
				return;
			}
			setSlashCommand({ x: pos.x, y: pos.y, query: slash.query });
		};
		queueMicrotask(updateSlashMenu);
	};

	const restoreEditorSelection = () => {
		const r = selectionSavedRangeRef.current;
		if (!r) return false;
		try {
			editorRef.current?.focus();
			const s = window.getSelection();
			s.removeAllRanges();
			s.addRange(r.cloneRange());
			return true;
		} catch {
			return false;
		}
	};

	const handleCopy = () => {
		const text = editorRef.current?.innerText || draft?.body || "";
		navigator.clipboard.writeText(text).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleSave = async () => {
		if (!draftId || !reduxUser?.uid) return;
		try {
			if (editorRef.current) unwrapAllDraftSlashQuerySpans(editorRef.current);
			let html = editorRef.current?.innerHTML || "";
			html = await uploadInlineImagesToUploadThing(html);
			if (editorRef.current) editorRef.current.innerHTML = html;
			await updateAsset(
				reduxUser.uid,
				draftId,
				{ body: html },
				docData?.source || "drafts",
			);
		} catch (e) {
			console.error("Save failed", e);
		}
		setSaved(true);
		setTimeout(() => setSaved(false), 2000);
	};

	/* ── Publish helpers ── */
	const toSlug = (str) =>
		(str || "")
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-")
			.slice(0, 80) || draftId;

	const getEffectiveSlug = () =>
		toSlug(slugInput) || toSlug(titleRef.current?.innerText?.trim() || draft?.title || "") || draftId;

	const getPublicUrl = (slug, themeId) => {
		if (typeof window === "undefined") return "";
		const pathSlug = slug || getEffectiveSlug();
		let url = `${window.location.origin}/p/${pathSlug}`;
		const tid =
			themeId !== undefined && themeId !== null && String(themeId).trim() !== ""
				? resolvePublicThemeId(String(themeId))
				: null;
		if (tid) url += `?theme=${encodeURIComponent(tid)}`;
		return url;
	};

	const savePublishSettings = async (nextPublic, nextSlug) => {
		if (!draftId || !reduxUser?.uid) return;
		setPublishSaving(true);
		const slug = toSlug(nextSlug ?? slugInput) || toSlug(titleRef.current?.innerText?.trim() || draft?.title || "") || draftId;
		try {
			// 1. Update asset doc with publish fields
			await updateAsset(
				reduxUser.uid,
				draftId,
				{ isPublic: nextPublic, slug },
				docData?.source || "assets",
			);
			// 2. Mirror to / remove from published_blogs top-level collection
			const { doc: fsDoc, setDoc: fsSetDoc, deleteDoc: fsDeleteDoc } = await import("firebase/firestore");
			const { db: fsDb } = await import("../../lib/config/firebase");
			const oldSlug = draft?.slug;
			if (nextPublic) {
				const rawHtml =
					editorRef.current?.innerHTML || draft?.body || "";
				const html = normalizeYoutubeEmbedsInHtml(rawHtml);
				const title = titleRef.current?.innerText?.trim() || draft?.title || "Untitled";
				await fsSetDoc(fsDoc(fsDb, "published_blogs", slug), {
					userId: reduxUser.uid,
					assetId: draftId,
					slug,
					title,
					description: draft?.description || "",
					body: html,
					publishedAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				});
				// Clean up old slug doc if slug changed
				if (oldSlug && oldSlug !== slug) {
					try { await fsDeleteDoc(fsDoc(fsDb, "published_blogs", oldSlug)); } catch (_) {}
				}
			} else {
				// Unpublishing: remove from published_blogs
				const slugToRemove = oldSlug || slug;
				try { await fsDeleteDoc(fsDoc(fsDb, "published_blogs", slugToRemove)); } catch (_) {}
			}
			setIsPublic(nextPublic);
			setSlugInput(slug);
		} catch (e) {
			console.error("Publish settings save failed", e);
		} finally {
			setPublishSaving(false);
		}
	};

	/* ── Insert image or video at cursor ── */
	const insertImageOrVideo = (url, isVideo = false) => {
		if (!url?.trim()) return;
		editorRef.current?.focus();
		if (isVideo) {
			const html = `<p style="margin:16px 0"><video src="${escapeAttr(url)}" controls style="max-width:100%;border-radius:8px;display:block"></video></p>`;
			document.execCommand("insertHTML", false, html);
		} else {
			document.execCommand(
				"insertHTML",
				false,
				makeDraftImageFigureHtml(url),
			);
		}
		countWords();
		setImageUrlInput("");
		setImageDropdownOpen(false);
	};

	const handleImageFileSelect = (e) => {
		const file = e.target?.files?.[0];
		if (!file) return;
		const isVideo = file.type.startsWith("video/");
		const isImage = file.type.startsWith("image/");
		if (!isImage && !isVideo) {
			alert("Please select an image or video file.");
			return;
		}

		/* Images: keep as data URL until save (UploadThing via uploadInlineImagesToUploadThing) */
		if (isImage) {
			const reader = new FileReader();
			reader.onload = () => {
				const dataUrl = reader.result;
				insertImageOrVideo(dataUrl, false);
				setDraftImageModalOpen(false);
			};
			reader.readAsDataURL(file);
		} else {
			/* Videos: upload first (too large for base64), then insert */
			if (!reduxUser?.uid) {
				alert("Please sign in to upload videos.");
				return;
			}
			setImageUploading(true);
			const ext = file.name.split(".").pop() || "mp4";
			const path = `users/${reduxUser.uid}/drafts/${draftId || "new"}/media/${Date.now()}.${ext}`;
			uploadFile(file, path)
				.then((downloadUrl) => {
					insertImageOrVideo(downloadUrl, true);
					setDraftImageModalOpen(false);
				})
				.catch((err) => {
					console.error("Upload failed:", err);
					alert("Upload failed. Please try again.");
				})
				.finally(() => {
					setImageUploading(false);
					e.target.value = "";
				});
		}
		e.target.value = "";
	};

	/* ── Insert audio block at cursor ── */
	const insertAudioBlock = (src, name = "Audio track") => {
		if (!editorRef.current) return;
		editorRef.current.focus();
		const html = makeAudioBlockHtml(src, name, "");
		document.execCommand("insertHTML", false, html);
		countWords();
		setAudioModalOpen(false);
		setRecordingOpen(false);
		requestAnimationFrame(() => editorRef.current?.focus());
	};

	/* ── Recording: start microphone capture ── */
	const startRecording = async () => {
		try {
			setRecordingState("requesting");
			setTranscriptFinal("");
			setTranscriptInterim("");
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			recordingStreamRef.current = stream;
			const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
			const mr = new MediaRecorder(stream, { mimeType });
			recordingChunksRef.current = [];
			mr.ondataavailable = (e) => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
			mr.start(100);
			mediaRecorderRef.current = mr;
			setRecordingSeconds(0);
			setRecordingState("recording");
			recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
			// start speech recognition in text mode
			const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
			if (SpeechRecognition) {
				const rec = new SpeechRecognition();
				rec.continuous = true;
				rec.interimResults = true;
				rec.lang = "en-US";
				rec.onresult = (ev) => {
					let finalChunk = "";
					let interimChunk = "";
					for (let i = ev.resultIndex; i < ev.results.length; i++) {
						if (ev.results[i].isFinal) finalChunk += ev.results[i][0].transcript + " ";
						else interimChunk += ev.results[i][0].transcript;
					}
					if (finalChunk) setTranscriptFinal((p) => p + finalChunk);
					setTranscriptInterim(interimChunk);
				};
				rec.onerror = () => {};
				rec.start();
				recognitionRef.current = rec;
			}
		} catch {
			setRecordingState("idle");
			alert("Microphone access was denied. Please allow microphone in your browser settings.");
		}
	};

	const stopRecordingStream = () => {
		clearInterval(recordingTimerRef.current);
		try {
			if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
		} catch (_) {}
		try { recognitionRef.current?.stop(); } catch (_) {}
		recognitionRef.current = null;
		recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
		recordingStreamRef.current = null;
	};

	const handleRecordingDone = async () => {
		if (recordingState !== "recording") return;
		clearInterval(recordingTimerRef.current);
		try { recognitionRef.current?.stop(); } catch (_) {}
		recognitionRef.current = null;

		// ── Text mode: just insert transcript as paragraph ──
		if (recordingMode === "text") {
			const text = (transcriptFinal + transcriptInterim).trim();
			recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
			recordingStreamRef.current = null;
			try { mediaRecorderRef.current?.stop(); } catch (_) {}
			if (text && editorRef.current) {
				editorRef.current.focus();
				document.execCommand("insertHTML", false, `<p>${text.replace(/\n/g, "<br>")}</p>`);
				countWords();
			}
			setRecordingOpen(false);
			setRecordingState("idle");
			setRecordingSeconds(0);
			setTranscriptFinal("");
			setTranscriptInterim("");
			setRecordingMode("audio");
			return;
		}

		// ── Audio mode: upload and insert block ──
		setRecordingState("uploading");
		const mr = mediaRecorderRef.current;
		if (!mr) return;
		await new Promise((res) => { mr.onstop = res; try { mr.stop(); } catch (_) { res(); } });
		recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
		recordingStreamRef.current = null;
		const mimeType = recordingChunksRef.current[0]?.type || "audio/webm";
		const blob = new Blob(recordingChunksRef.current, { type: mimeType });
		const label = `Voice note ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
		const reader = new FileReader();
		reader.onload = async () => {
			try {
				const res = await fetch("/api/uploadAudio", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ dataUrl: reader.result, name: label, type: mimeType }),
				});
				const json = await res.json();
				if (!res.ok || json.error) throw new Error(json.error || "Upload failed");
				insertAudioBlock(json.url, label);
			} catch (err) {
				alert(`Recording upload failed: ${err.message}`);
			} finally {
				setRecordingState("idle");
				setRecordingSeconds(0);
			}
		};
		reader.readAsDataURL(blob);
	};

	const handleRecordingCancel = () => {
		stopRecordingStream();
		setRecordingOpen(false);
		setRecordingState("idle");
		setRecordingSeconds(0);
		setTranscriptFinal("");
		setTranscriptInterim("");
		setRecordingMode("audio");
	};

	const handleAudioFileSelect = (e) => {
		const file = e.target?.files?.[0];
		if (!file) return;
		const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name);
		if (!isAudio) { alert("Please select an audio file (MP3, WAV, OGG, M4A…)"); return; }

		const name = file.name.replace(/\.[^.]+$/, "");
		e.target.value = "";

		setAudioUploading(true);

		const reader = new FileReader();
		reader.onload = async () => {
			try {
				const dataUrl = reader.result;
				const res = await fetch("/api/uploadAudio", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ dataUrl, name, type: file.type }),
				});
				const json = await res.json();
				if (!res.ok || json.error) throw new Error(json.error ?? "Upload failed");
				insertAudioBlock(json.url, name);
			} catch (err) {
				console.error("Audio upload failed:", err);
				alert(`Audio upload failed: ${err.message}`);
			} finally {
				setAudioUploading(false);
			}
		};
		reader.onerror = () => {
			setAudioUploading(false);
			alert("Could not read audio file.");
		};
		reader.readAsDataURL(file);
	};

	const isVideoUrl = (url) => {
		try {
			const u = new URL(url);
			const path = u.pathname.toLowerCase();
			return /\.(mp4|webm|ogg|mov)(\?|$)/.test(path) || path.includes("video");
		} catch {
			return false;
		}
	};

	const confirmDraftImageFromUrl = () => {
		const raw = draftImageModalUrl.trim();
		if (!raw) return;
		try {
			const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
			if (!/^https?:$/i.test(u.protocol)) {
				alert("Only http(s) URLs are allowed.");
				return;
			}
			const href = u.href;
			insertImageOrVideo(href, isVideoUrl(href));
		} catch {
			alert("Invalid URL.");
			return;
		}
		setDraftImageModalOpen(false);
		setDraftImageModalUrl("");
	};

	/* ── Insert a rich block at the cursor ── */
	const insertBlock = (type) => {
		editorRef.current?.focus();
		let html = "";
		if (type === "code")
			html = makeCodeBlockHtml("javascript", "// Your code here");
		else if (type === "button") html = makeButtonBlockHtml();
		else
			html = makeCalloutHtml(
				type,
				`${CALLOUT_CONFIGS[type]?.label || "Callout"} — edit this text.`,
			);
		if (html) {
			document.execCommand("insertHTML", false, html + "<p><br></p>");
			countWords();
		}
		setBlockMenuOpen(false);
	};

	/* ── Event delegation on the editor for code-block interactions ── */
	useEffect(() => {
		const el = editorRef.current;
		if (!el) return;

		const handleClick = (e) => {
			const raw = e.target;
			const el =
				raw && raw.nodeType === 1
					? raw
					: raw?.parentElement;
			const copyBtn = el?.closest?.('[data-action="copy-code"]');
			if (copyBtn) {
				e.preventDefault();
				const block = copyBtn.closest('[data-block="code"]');
				const code = block?.querySelector("code");
				if (code) {
					navigator.clipboard.writeText(code.innerText).catch(() => {});
					const btn = copyBtn;
					const prev = btn.textContent;
					btn.textContent = "Copied!";
					btn.style.color = "#10B981";
					btn.style.borderColor = "#10B981";
					setTimeout(() => {
						btn.textContent = prev;
						btn.style.color = "";
						btn.style.borderColor = "";
					}, 1800);
				}
				return;
			}
			const fitBtn = el?.closest?.("[data-draft-img-fit]");
			if (fitBtn) {
				e.preventDefault();
				e.stopPropagation();
				const fig = fitBtn.closest("[data-draft-image-wrap]");
				const img = fig?.querySelector("img[data-draft-img]");
				const v = fitBtn.getAttribute("data-draft-img-fit");
				if (img && v) {
					img.style.objectFit = v;
					if (v === "cover" || v === "fill")
						img.style.minHeight = "260px";
					else img.style.minHeight = "";
				}
				fitBtn.closest("details")?.removeAttribute("open");
				return;
			}
			const sizeBtn = el?.closest?.("[data-draft-img-size]");
			if (sizeBtn) {
				e.preventDefault();
				e.stopPropagation();
				const fig = sizeBtn.closest("[data-draft-image-wrap]");
				const frame = fig?.querySelector("[data-draft-image-frame]");
				const v = sizeBtn.getAttribute("data-draft-img-size");
				if (frame && v) {
					frame.style.width = `${v}%`;
					frame.style.maxWidth = "100%";
					frame.style.marginLeft = "auto";
					frame.style.marginRight = "auto";
				}
				sizeBtn.closest("details")?.removeAttribute("open");
				return;
			}
			const draftTabBtn = el?.closest?.('[data-action="draft-tab"]');
			if (draftTabBtn) {
				e.preventDefault();
				const wrap = draftTabBtn.closest('[data-block="tabs"]');
				if (!wrap) return;
				const idx = draftTabBtn.getAttribute("data-tab-idx");
				wrap.querySelectorAll("[data-draft-panel]").forEach((p) => {
					p.style.display =
						p.getAttribute("data-draft-panel") === idx ? "block" : "none";
				});
				wrap.querySelectorAll("[data-action='draft-tab']").forEach((b) => {
					const on = b.getAttribute("data-tab-idx") === idx;
					b.style.background = on ? "#fff" : "transparent";
					b.style.boxShadow = on ? "0 1px 2px rgba(0,0,0,0.06)" : "none";
					b.style.fontWeight = on ? "600" : "500";
					b.style.color = on ? "#37352F" : "#7A7570";
				});
				return;
			}
			const cgTabBtn = el?.closest?.('[data-action="cg-tab"]');
			if (cgTabBtn) {
				e.preventDefault();
				const wrap = cgTabBtn.closest('[data-block="code-group"]');
				if (!wrap) return;
				const idx = cgTabBtn.getAttribute("data-cg-idx");
				wrap.querySelectorAll("[data-cg-panel]").forEach((p) => {
					p.style.display =
						p.getAttribute("data-cg-panel") === idx ? "block" : "none";
				});
				wrap.querySelectorAll("[data-action='cg-tab']").forEach((b) => {
					const on = b.getAttribute("data-cg-idx") === idx;
					b.style.background = on ? "#fff" : "transparent";
					b.style.fontWeight = on ? "700" : "600";
					b.style.color = on ? "#37352F" : "#6B6560";
				});
			}
			/* ── Date chip — click to reopen calendar ── */
			const dateChip = el?.closest?.("[data-ink-date]");
			if (dateChip) {
				e.preventDefault();
				e.stopPropagation();
				const iso = dateChip.getAttribute("data-ink-date");
				const parsed = iso ? new Date(iso) : new Date();
				const rect = dateChip.getBoundingClientRect();
				dateEditTargetRef.current = dateChip;
				setDatePickerInitial(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
				setDraftSlashDatePickerPos({
					left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
					top: rect.bottom + 6,
				});
				return;
			}
			/* ── Icon selector trigger ── */
			const iconEl = el?.closest?.("[data-icon-selector]") || (el?.getAttribute?.("data-icon-selector") != null ? el : null);
			if (iconEl) {
				e.preventDefault();
				e.stopPropagation();
				const rect = iconEl.getBoundingClientRect();
				setIconSelector({ x: rect.left, y: rect.bottom + 6, target: iconEl });
				return;
			}
		};

		const handleChange = (e) => {
			if (e.target.dataset?.action === "change-lang") {
				// nothing extra needed — the native <select> already stores its value
			}
		};

		const onDocMouseDown = (ev) => {
			if (ev.target.closest?.("details[data-draft-img-popover]")) return;
			el.querySelectorAll("details[data-draft-img-popover][open]").forEach((d) => {
				d.removeAttribute("open");
			});
		};
		const handleMouseMove = (e) => {
			if (dragSrcRef.current) return; // don't reposition while dragging
			const editorEl = editorRef.current;
			const containerEl = editorContainerRef.current;
			if (!editorEl || !containerEl) return;
			let node = e.target;
			if (node.nodeType === 3) node = node.parentElement;
			while (node && node.parentElement !== editorEl) node = node.parentElement;
			if (!node || !editorEl.contains(node)) { setDragHandle(null); return; }
			const tag = node.nodeName.toLowerCase();
			if (["br", "span", "a", "strong", "em", "code", "input"].includes(tag)) {
				setDragHandle(null);
				return;
			}
			const containerRect = containerEl.getBoundingClientRect();
			const editorRect = editorEl.getBoundingClientRect();
			const nodeRect = node.getBoundingClientRect();
			/* top relative to scrollable container */
			const top = nodeRect.top - containerRect.top + containerEl.scrollTop;
			/* place handle in the left gutter of the editor content area */
			const handleLeft = editorRect.left - containerRect.left - 28;
			setDragHandle({ top, handleLeft: Math.max(2, handleLeft), block: node, height: nodeRect.height });
		};
		const handleMouseLeave = () => { if (!dragSrcRef.current) setDragHandle(null); };

		document.addEventListener("mousedown", onDocMouseDown);
		el.addEventListener("click", handleClick);
		el.addEventListener("change", handleChange);
		el.addEventListener("mousemove", handleMouseMove);
		el.addEventListener("mouseleave", handleMouseLeave);
		return () => {
			document.removeEventListener("mousedown", onDocMouseDown);
			el.removeEventListener("click", handleClick);
			el.removeEventListener("change", handleChange);
			el.removeEventListener("mousemove", handleMouseMove);
			el.removeEventListener("mouseleave", handleMouseLeave);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	/* ── Close block-insert menu when clicking outside ── */
	useEffect(() => {
		if (!blockMenuOpen) return;
		const close = (e) => {
			if (!e.target.closest("[data-block-menu]")) setBlockMenuOpen(false);
		};
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, [blockMenuOpen]);

	/* ── Close image dropdown when clicking outside ── */
	useEffect(() => {
		if (!imageDropdownOpen) return;
		const close = (e) => {
			if (!e.target.closest("[data-image-dropdown]"))
				setImageDropdownOpen(false);
		};
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, [imageDropdownOpen]);

	/* ── Text selection dropdown: show on mouseup when selection in editor ── */
	const isNodeInEditor = (node, editor) => {
		if (!node || !editor) return false;
		let n = node;
		while (n) {
			if (n === editor) return true;
			n = n.parentNode;
		}
		return false;
	};

	useEffect(() => {
		const handleMouseUp = () => {
			const el = editorRef.current;
			if (!el) return;
			const sel = window.getSelection();
			if (!sel || sel.rangeCount === 0) {
				setSelectionDropdown(null);
				return;
			}
			const { href: linkHref, anchor: linkAnchor, collapsed } =
				getSelectionLinkContext(sel);
			const textTrim = sel.toString().trim();
			const collapsedInLink = collapsed && linkAnchor;
			if (!textTrim && !collapsedInLink) {
				setSelectionDropdown(null);
				return;
			}
			const inEditor =
				isNodeInEditor(sel.anchorNode, el) || isNodeInEditor(sel.focusNode, el);
			if (!inEditor) {
				setSelectionDropdown(null);
				return;
			}
			try {
				const range = sel.getRangeAt(0);
				const rect = range.getBoundingClientRect();
				if (rect.width === 0 && rect.height === 0 && !collapsedInLink) return;
				selectionSavedRangeRef.current = range.cloneRange();
				setSelectionSubtool(null);
				setSelectionLinkUrl(linkHref);
				const toolbarText =
					textTrim ||
					(linkAnchor ? (linkAnchor.textContent || "").trim() : "");
				setSelectionDropdown({
					text: toolbarText,
					x: Math.max(
						8,
						Math.min(rect.left + rect.width / 2 - 200, window.innerWidth - 420),
					),
					top: rect.top - 48,
				});
			} catch {
				setSelectionDropdown(null);
			}
		};
		document.addEventListener("mouseup", handleMouseUp);
		return () => document.removeEventListener("mouseup", handleMouseUp);
	}, []);

	/* ── Close selection dropdown when clicking outside (defer to avoid same-stroke close) ── */
	useEffect(() => {
		if (!selectionDropdown) return;
		const close = (e) => {
			if (!e.target.closest("[data-selection-dropdown]"))
				setSelectionDropdown(null);
		};
		const t = setTimeout(
			() => document.addEventListener("mousedown", close),
			50,
		);
		return () => {
			clearTimeout(t);
			document.removeEventListener("mousedown", close);
		};
	}, [selectionDropdown]);

	useEffect(() => {
		if (!selectionDropdown) {
			selectionSavedRangeRef.current = null;
			setSelectionSubtool(null);
			setSelectionLinkUrl("");
		}
	}, [selectionDropdown]);

	useEffect(() => {
		if (selectionSubtool !== "link") return;
		const id = requestAnimationFrame(() => {
			selectionLinkInputRef.current?.focus();
		});
		return () => cancelAnimationFrame(id);
	}, [selectionSubtool]);

	useEffect(() => {
		if (!slashCommand) return;
		slashListIndexRef.current = 0;
		setSlashListIndex(0);
	}, [slashCommand?.query]);

	useLayoutEffect(() => {
		if (!slashCommand) return;
		const el = document.querySelector("[data-slash-active='true']");
		el?.scrollIntoView({ block: "nearest" });
	}, [slashCommand, slashListIndex]);

	/* ── Slash command: Escape / arrows / Enter, click outside ── */
	useEffect(() => {
		if (!slashCommand) return;
		const onKey = (e) => {
			const cmd = slashCommandRef.current;
			if (!cmd) return;
			if (e.key === "Escape") {
				setSlashCommand(null);
				return;
			}
			const rows = getDraftSlashFlatRows(cmd.query);
			if (rows.length === 0) return;
			if (e.key === "ArrowDown") {
				e.preventDefault();
				e.stopPropagation();
				setSlashListIndex((prev) => {
					const next = Math.min(rows.length - 1, prev + 1);
					slashListIndexRef.current = next;
					return next;
				});
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				e.stopPropagation();
				setSlashListIndex((prev) => {
					const next = Math.max(0, prev - 1);
					slashListIndexRef.current = next;
					return next;
				});
			} else if (e.key === "Enter" && !e.isComposing) {
				e.preventDefault();
				e.stopPropagation();
				const idx = Math.min(
					slashListIndexRef.current,
					rows.length - 1,
				);
				const id = rows[idx]?.id;
				if (id) handleSlashCommandRef.current(id);
			}
		};
		const close = (e) => {
			if (!e.target.closest("[data-slash-command]")) setSlashCommand(null);
		};
		document.addEventListener("keydown", onKey, true);
		const t = setTimeout(
			() => document.addEventListener("mousedown", close),
			50,
		);
		return () => {
			document.removeEventListener("keydown", onKey, true);
			clearTimeout(t);
			document.removeEventListener("mousedown", close);
		};
	}, [slashCommand]);

	/* Draft date picker (slash / date): calendar portal, not window.prompt */
	useEffect(() => {
		if (!draftSlashDatePickerPos) return;
		const onKey = (e) => {
			if (e.key === "Escape") setDraftSlashDatePickerPos(null);
		};
		const onDown = (e) => {
			if (e.target.closest?.("[data-draft-date-picker]")) return;
			setDraftSlashDatePickerPos(null);
		};
		document.addEventListener("keydown", onKey);
		const t = setTimeout(
			() => document.addEventListener("mousedown", onDown),
			80,
		);
		return () => {
			document.removeEventListener("keydown", onKey);
			clearTimeout(t);
			document.removeEventListener("mousedown", onDown);
		};
	}, [draftSlashDatePickerPos]);

	/* Draft image modal (/ image): Escape to close */
	useEffect(() => {
		if (!draftImageModalOpen) return;
		const onKey = (e) => {
			if (e.key === "Escape") {
				setDraftImageModalOpen(false);
				setDraftImageModalUrl("");
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [draftImageModalOpen]);

	const makeDateChipHtml = (d) => {
		const label = formatInkDateLong(d);
		if (!label) return "";
		const iso = d.toISOString();
		const safe = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		return `<span data-ink-date="${iso}" contenteditable="false" title="Click to change date" style="display:inline-flex;align-items:center;gap:5px;background:#FEF3E2;border:1px solid #F6D9A8;border-radius:6px;padding:2px 9px 2px 7px;color:#92400E;font-weight:600;font-size:0.92em;cursor:pointer;user-select:none;white-space:nowrap;vertical-align:middle;line-height:1.7"><svg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#C17B2F' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' style='flex-shrink:0'><rect x='3' y='4' width='18' height='18' rx='2' ry='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/></svg>${safe}</span>`;
	};

	const insertDraftDateAtCursor = (d) => {
		if (!editorRef.current) return;

		/* If we're editing an existing chip, update it in-place */
		if (dateEditTargetRef.current) {
			const chip = dateEditTargetRef.current;
			const label = formatInkDateLong(d);
			if (label) {
				chip.setAttribute("data-ink-date", d.toISOString());
				const safe = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
				chip.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#C17B2F' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' style='flex-shrink:0'><rect x='3' y='4' width='18' height='18' rx='2' ry='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/></svg>${safe}`;
			}
			dateEditTargetRef.current = null;
			setDraftSlashDatePickerPos(null);
			return;
		}

		editorRef.current.focus();
		const sel = window.getSelection();
		if (sel?.rangeCount) {
			const range = sel.getRangeAt(0);
			const block = getDraftBlockFromSelection(editorRef.current, range);
			if (block) {
				const text = getTextFromBlockStartToCaret(block, range);
				const slash = matchDraftSlashQuery(text);
				if (slash) deleteDraftSlashToken(block, range, slash.slashToken.length);
			}
		}

		const html = makeDateChipHtml(d);
		if (!html) { setDraftSlashDatePickerPos(null); return; }
		document.execCommand("insertHTML", false, html);
		countWords();
		setDraftSlashDatePickerPos(null);
		requestAnimationFrame(() => editorRef.current?.focus());
	};

	const handleSlashCommand = (action) => {
		const sel =
			typeof window !== "undefined" ? window.getSelection() : null;
		if (action === "continue-writing" || action === "ask-ai") {
			const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
			let ctx = "";
			if (range) {
				const el = range.commonAncestorContainer;
				const block = el?.nodeType === 3 ? el.parentElement : el;
				if (block?.closest) {
					const p = block.closest("p, h1, h2, h3, li");
					ctx = p?.innerText?.trim?.() || "";
				}
			}
			setSelectionContext(ctx);
			setChatOpen(true);
		} else if (action === "text") {
			deleteDraftSlashFromCaret(editorRef.current);
			document.execCommand("formatBlock", false, "p");
		} else if (action === "h1") {
			deleteDraftSlashFromCaret(editorRef.current);
			document.execCommand("formatBlock", false, "h1");
		} else if (action === "h2") {
			deleteDraftSlashFromCaret(editorRef.current);
			document.execCommand("formatBlock", false, "h2");
		} else if (action === "h3") {
			deleteDraftSlashFromCaret(editorRef.current);
			document.execCommand("formatBlock", false, "h3");
		} else if (action === "bullet") {
			deleteDraftSlashFromCaret(editorRef.current);
			document.execCommand("insertUnorderedList");
		} else if (action === "numbered") {
			deleteDraftSlashFromCaret(editorRef.current);
			document.execCommand("insertOrderedList");
		} else if (action === "todo") {
			insertDraftRichBlock(
				editorRef.current,
				`<ul data-todo="true" style="${TODO_UL_STYLE}"><li class="todo-item" style="${TODO_LI_STYLE}"><input type="checkbox" class="todo-cb" style="${TODO_CHECKBOX_STYLE}"/><span class="todo-label" style="flex:1;min-width:0"> </span></li></ul><p><br></p>`,
			);
		} else if (action === "quote") {
			insertDraftRichBlock(editorRef.current, makeDraftQuoteHtml());
		} else if (action === "divider") {
			insertDraftRichBlock(
				editorRef.current,
				makeDraftDividerHtml("solid").replace(/<p><br><\/p>\s*$/, ""),
			);
		} else if (action === "divider-dashed") {
			insertDraftRichBlock(
				editorRef.current,
				makeDraftDividerHtml("dashed").replace(/<p><br><\/p>\s*$/, ""),
			);
		} else if (action === "divider-dotted") {
			insertDraftRichBlock(
				editorRef.current,
				makeDraftDividerHtml("dotted").replace(/<p><br><\/p>\s*$/, ""),
			);
		} else if (action === "toggle-group") {
			insertDraftRichBlock(editorRef.current, makeToggleGroupHtml());
		} else if (action === "card") {
			insertDraftRichBlock(editorRef.current, makeCardBlockHtml());
		} else if (action === "icon-block") {
			insertDraftRichBlock(editorRef.current, makeIconBlockHtml("✨", "emoji") + "<p><br></p>");
		} else if (action === "audio") {
			deleteDraftSlashFromCaret(editorRef.current);
			setAudioModalOpen(true);
		} else if (action === "record") {
			deleteDraftSlashFromCaret(editorRef.current);
			setRecordingOpen(true);
			setTimeout(() => startRecording(), 300);
		} else if (action === "code") {
			insertDraftRichBlock(
				editorRef.current,
				makeCodeBlockHtml("text", "// Your code here") + "<p><br></p>",
			);
		} else if (action === "codeGroup") {
			insertDraftRichBlock(editorRef.current, makeDraftCodeGroupHtml());
		} else if (action === "tabs") {
			insertDraftRichBlock(editorRef.current, makeDraftTabsHtml());
		} else if (action === "toggle") {
			insertDraftRichBlock(editorRef.current, makeDraftToggleHtml());
		} else if (
			action === "callout-info" ||
			action === "callout-warning" ||
			action === "callout-success" ||
			action === "callout-danger"
		) {
			const type = action.replace(/^callout-/, "");
			const cfg = CALLOUT_CONFIGS[type];
			if (cfg) {
				insertDraftRichBlock(
					editorRef.current,
					makeCalloutHtml(
						type,
						`${cfg.label} — edit this text.`,
					) + "<p><br></p>",
				);
			}
		} else if (action === "date") {
			const pos = slashCommand
				? {
						left: Math.max(
							8,
							Math.min(slashCommand.x, window.innerWidth - 300),
						),
						top: slashCommand.y + 4,
					}
				: { left: 80, top: 120 };
			setDraftSlashDatePickerPos(pos);
		} else if (action === "image") {
			deleteDraftSlashFromCaret(editorRef.current);
			setDraftImageModalOpen(true);
		} else if (action === "table") {
			insertDraftRichBlock(editorRef.current, makeSimpleTableHtml());
		} else if (action === "embed") {
			deleteDraftSlashFromCaret(editorRef.current);
			// Save cursor position BEFORE modal steals focus
			const sel = window.getSelection();
			if (sel && sel.rangeCount > 0) {
				embedRangeRef.current = sel.getRangeAt(0).cloneRange();
			}
			setEmbedUrlInput("");
			setEmbedResolved(null);
			setEmbedModalOpen(true);
		}
		countWords();
		setSlashCommand(null);
	};

	handleSlashCommandRef.current = handleSlashCommand;

	const handleDelete = (id) => setDeleteConfirm(id);

	const confirmDelete = async () => {
		try {
			const item = items.find((i) => i.id === deleteConfirm);
			const isAsset =
				["infographics", "landing_page", "image_gallery"].includes(
					item?.type,
				) || tables.some((t) => t.id === deleteConfirm);
			const source =
				item?.source ||
				(isAsset ? "assets" : item?.type === "table" ? "tables" : "drafts");
			await deleteAsset(reduxUser.uid, deleteConfirm, source);
			queryClient.invalidateQueries({ queryKey: ["assets", reduxUser?.uid] });
			queryClient.invalidateQueries({ queryKey: ["doc"] });
			if (deleteConfirm === draftId) {
				router.push("/app");
			}
		} catch (e) {
			console.error("Delete failed", e);
		}
		setDeleteConfirm(null);
	};

	const handleCopyThemeHTML = (themeKey) => {
		const theme = THEMES[themeKey];
		if (!theme) return;
		const html = stripDraftSlashQueryFromHtmlString(
			editorRef.current?.innerHTML || draft?.body || "",
		);
		const title = draft?.title || "";
		const output = buildThemedHTML(html, theme, title);
		navigator.clipboard.writeText(output).catch(() => {});
		setCopiedTheme({ key: themeKey, format: "html" });
		setTimeout(() => setCopiedTheme(null), 2200);
	};

	const handleCopyThemeReact = (themeKey) => {
		if (!THEMES[themeKey]) return;
		const html = stripDraftSlashQueryFromHtmlString(
			editorRef.current?.innerHTML || draft?.body || "",
		);
		const title = draft?.title || "";
		const snippet = buildThemedReactSnippet(html, themeKey, title);
		if (!snippet) return;
		navigator.clipboard.writeText(snippet).catch(() => {});
		setCopiedTheme({ key: themeKey, format: "react" });
		setTimeout(() => setCopiedTheme(null), 2200);
	};

	const handleTranslate = async (lang) => {
		setTranslationLang(lang);
		if (lang === "en") {
			setTranslatedHTML("");
			return;
		}
		const raw = stripDraftSlashQueryFromHtmlString(
			editorRef.current?.innerHTML || draft?.body || "",
		);
		setTranslating(true);
		try {
			const result = await translateHTMLContent(raw, lang);
			setTranslatedHTML(result);
		} catch {
			setTranslatedHTML("");
		} finally {
			setTranslating(false);
		}
	};

	const filtered = items.filter((i) => {
		const q = search.toLowerCase().trim();
		if (!q) return true;
		const title = (i.title || "").toLowerCase();
		const preview = (i.preview || i.description || "").toLowerCase();
		const type = (i.type || "").toLowerCase();
		const tag = (ASSET_TYPE_LABELS[i.type] || i.tag || "Draft").toLowerCase();
		const format = (i.format || "").toLowerCase();
		const prompt = (i.prompt || "").toLowerCase();
		return (
			title.includes(q) ||
			preview.includes(q) ||
			type.includes(q) ||
			tag.includes(q) ||
			format.includes(q) ||
			prompt.includes(q)
		);
	});

	const asset =
		draft ||
		(docData?.type === "table" ? docData.doc : null) ||
		(docData?.type === "infographics" ? docData.doc : null) ||
		(docData?.type === "landing_page" ? docData.doc : null) ||
		(docData?.type === "image_gallery" ? docData.doc : null) ||
		/* Fallback: doc exists but type unknown — treat as draft if has body */
		(docData?.doc?.body != null ? docData.doc : null);
	const sourceUrl = Array.isArray(asset?.urls)
		? asset.urls[0] || ""
		: Array.isArray(asset?.sourceUrls)
			? asset.sourceUrls[0] || ""
			: asset?.url || "";
	const assetPrompt = asset?.prompt || "";

	return (
		<div
			style={{
				height: "100vh",
				display: "flex",
				flexDirection: "column",
				background: T.base,
				fontFamily: "'Comic', sans-serif",
				overflow: "hidden",
			}}
		>
			<FontLink />

			{/* ── TOP BAR ── */}
			<div
				style={{
					background: T.surface,
					borderBottom: `1px solid ${T.border}`,
					display: "flex",
					alignItems: "center",
					gap: 12,
					flexShrink: 0,
					paddingLeft: 20,
					paddingRight: 20,
					paddingTop: 4,
					paddingBottom: 6,
					minHeight: 46,
					zIndex: 50,
				}}
			>
				{/* Logo */}
				<a
					href="/"
					style={{
						fontFamily: "",
						fontSize: 20,
						color: T.accent,
						textDecoration: "none",
						display: "flex",
						alignItems: "center",
						gap: 7,
						flexShrink: 0,
						marginRight: 8,
					}}
				>
					<motion.span
						whileHover={{ scale: 1.3 }}
						style={{
							width: 8,
							height: 8,
							borderRadius: "50%",
							background: T.warm,
							display: "inline-block",
						}}
					/>
					inkgest
				</a>

				{/* Sidebar toggle — only when logged in */}
				{reduxUser && (
					<motion.button
						whileHover={{ background: "#F0ECE5" }}
						whileTap={{ scale: 0.93 }}
						onClick={() => setSidebarOpen((s) => !s)}
						style={{
							background: "transparent",
							border: "none",
							borderRadius: 8,
							padding: "6px 8px",
							cursor: "pointer",
						}}
					>
						<Icon d={sidebarOpen ? Icons.chevronL : Icons.chevronR} size={16} />
					</motion.button>
				)}

				<div style={{ width: 1, height: 20, background: T.border }} />

				{/* Tabs — inline in navbar */}
				{draftId && openTabs.length > 0 && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 2,
							flex: 1,
							minWidth: 0,
							overflowX: "auto",
							paddingRight: 8,
							marginLeft: 10,
						}}
					>
						{openTabs.map((tabId) => {
							const isActive = tabId === draftId;
							return (
								<motion.div
									key={tabId}
									layout
									initial={{ opacity: 0, scale: 0.95 }}
									animate={{ opacity: 1, scale: 1 }}
									onClick={() =>
										tabId !== draftId && navigateWithTabs(tabId, openTabs)
									}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 6,
										padding: "6px 10px 6px 12px",
										borderRadius: 8,
										background: isActive ? T.warmBg : "transparent",
										border: `1px solid ${isActive ? T.border : "transparent"}`,
										cursor: isActive ? "default" : "pointer",
										flexShrink: 0,
										maxWidth: 160,
										boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.05)" : "none",
										transition: "background 0.15s, border-color 0.15s",
									}}
									whileHover={!isActive ? { background: "#F7F5F0" } : {}}
								>
									<span
										style={{
											fontSize: 12,
											fontWeight: isActive ? 600 : 500,
											color: isActive ? T.accent : T.muted,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
											flex: 1,
											minWidth: 0,
										}}
										title={getTabTitle(tabId)}
									>
										{truncate(getTabTitle(tabId), 18)}
									</span>
									<motion.button
										onClick={(e) => closeTab(tabId, e)}
										whileHover={{ background: "rgba(0,0,0,0.06)" }}
										whileTap={{ scale: 0.9 }}
										style={{
											background: "none",
											border: "none",
											borderRadius: 4,
											padding: 2,
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											color: T.muted,
										}}
										title="Close tab"
									>
										<Icon
											d={Icons.close}
											size={12}
											stroke={T.muted}
											strokeWidth={2}
										/>
									</motion.button>
								</motion.div>
							);
						})}
					</div>
				)}


				{draft && (() => {
					const insertBlock = (id) => {
						editorRef.current?.focus();
						const sel = window.getSelection();
						if (!sel || sel.rangeCount === 0) {
							const range = document.createRange();
							const el = editorRef.current;
							if (el) { range.selectNodeContents(el); range.collapse(false); sel?.removeAllRanges(); sel?.addRange(range); }
						}
						handleSlashCommand(id);
						setBlocksMenuOpen(false);
					};
					const getContent = () => {
						const raw = stripDraftSlashQueryFromHtmlString(editorRef.current?.innerHTML || draft?.body || "");
						return raw.trim().startsWith("<") ? raw : formatBody(raw);
					};
					const getTitle = () => titleRef.current?.innerText?.trim() || draft?.title || "Untitled draft";
					const gIconBtn = (onClick, title, children, active = false) => (
						<motion.button type="button" onClick={onClick} title={title} whileHover={{ background: "#F0F0F0" }} whileTap={{ scale: 0.93 }}
							style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, border: `1px solid ${active ? "#111" : "transparent"}`, background: active ? "#111" : "transparent", cursor: "pointer", color: active ? "#fff" : T.muted, transition: "all 0.15s", flexShrink: 0 }}>
							{children}
						</motion.button>
					);
					const ADV_CATEGORIES = [
						{ key: "media",      label: "Media",      ids: ["image","embed","audio","record"] },
						{ key: "components", label: "Components", ids: ["card","toggle-group","toggle","tabs","icon-block"] },
						{ key: "callouts",   label: "Callouts",   ids: ["callout-info","callout-warning","callout-success","callout-danger"] },
						{ key: "data",       label: "Data",       ids: ["table","date"] },
						{ key: "dividers",   label: "Dividers",   ids: ["divider","divider-dashed","divider-dotted"] },
						{ key: "code",       label: "Code",       ids: ["code","codeGroup"] },
					];
					const QUICK_BLOCKS = [
						{ id: "h1", tip: "Heading 1",
						  svgEl: <svg width="22" height="18" viewBox="0 0 22 18"><text x="1" y="14" style={{fontSize:13,fontWeight:800,fill:"currentColor",fontFamily:"system-ui,sans-serif"}}>H<tspan fontSize="9" dy="3">1</tspan></text></svg> },
						{ id: "h2", tip: "Heading 2",
						  svgEl: <svg width="22" height="18" viewBox="0 0 22 18"><text x="1" y="14" style={{fontSize:13,fontWeight:800,fill:"currentColor",fontFamily:"system-ui,sans-serif"}}>H<tspan fontSize="9" dy="3">2</tspan></text></svg> },
						null,
						{ id: "text", tip: "Paragraph",
						  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg> },
						{ id: "quote", tip: "Blockquote",
						  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg> },
						null,
						{ id: "bullet", tip: "Bullet list",
						  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg> },
						{ id: "numbered", tip: "Numbered list",
						  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 10h2" stroke="currentColor" strokeWidth="1.8"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" stroke="currentColor" strokeWidth="1.8"/></svg> },
						{ id: "todo", tip: "To-do list",
						  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="5" width="6" height="6" rx="1"/><polyline points="4 14 6 16 9 13" strokeWidth="2"/><line x1="13" y1="8" x2="21" y2="8"/><line x1="13" y1="15" x2="21" y2="15"/></svg> },
						null,
						{ id: "code", tip: "Code block",
						  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
						{ id: "table", tip: "Table",
						  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg> },
						{ id: "image", tip: "Image",
						  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
					];
					const sep = () => <div style={{ width: 1, height: 20, background: "#E2E2E2", margin: "0 4px", flexShrink: 0 }} />;
					return (
						<>
							<div ref={blocksMenuRef} style={{ display: "flex", alignItems: "center", gap: 0, background: "#eee", border: "1px solid #E2E2E2", borderRadius: 12, padding: "0 6px", height: 38, flexShrink: 0 }}>
								{QUICK_BLOCKS.map((item, i) =>
									item === null ? <React.Fragment key={`sep-${i}`}>{sep()}</React.Fragment> : (
										<motion.button key={item.id} type="button" title={item.tip} onClick={() => insertBlock(item.id)} whileHover={{ background: "#F0F0F0" }} whileTap={{ scale: 0.93 }}
											style={{ height: 30, minWidth: 30, padding: "0 5px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, border: "none", background: "transparent", color: "#555", cursor: "pointer", flexShrink: 0 }}>
											{item.svgEl}
										</motion.button>
									)
								)}
								<div style={{ width: 1, height: 20, background: "#E2E2E2", margin: "0 6px", flexShrink: 0 }} />
								{ADV_CATEGORIES.map(cat => {
									const isOpen = blocksMenuOpen === cat.key;
									const catItems = DRAFT_SLASH_BASE_ITEMS.filter(i => cat.ids.includes(i.id));
									return (
										<div key={cat.key} style={{ position: "relative" }}>
											<motion.button type="button" onClick={() => setBlocksMenuOpen(v => v === cat.key ? false : cat.key)} whileHover={{ background: "#F0F0F0" }} whileTap={{ scale: 0.93 }}
												style={{ height: 30, padding: "0 9px", display: "flex", alignItems: "center", gap: 4, borderRadius: 7, border: "none", background: isOpen ? "#111" : "transparent", color: isOpen ? "#fff" : "#555", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.13s", flexShrink: 0 }}>
												{cat.label}
												<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
											</motion.button>
											<AnimatePresence>
											{isOpen && (
												<motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.13 }}
													style={{ position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", minWidth: 180, background: "#fff", border: "1px solid #E2E2E2", borderRadius: 10, boxShadow: "0 12px 32px rgba(0,0,0,0.1)", zIndex: 300, padding: "6px" }}>
													{catItems.map(item => (
														<motion.button key={item.id} type="button" onClick={() => insertBlock(item.id)} whileHover={{ background: "#F0F0F0" }} whileTap={{ scale: 0.97 }}
															style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", borderRadius: 7, border: "none", background: "transparent", color: "#111", fontSize: 13, cursor: "pointer", textAlign: "left", whiteSpace: "nowrap" }}>
															<span style={{ fontSize: 14, minWidth: 20, textAlign: "center", color: "#888" }}>{item.icon}</span>
															{item.label}
														</motion.button>
													))}
												</motion.div>
											)}
											</AnimatePresence>
						</div>
									);
								})}
								<div style={{ width: 1, height: 20, background: "#E2E2E2", margin: "0 4px", flexShrink: 0 }} />
								<motion.button type="button" onClick={() => insertBlock("ask-ai")} whileHover={{ background: "#F0F0F0" }} whileTap={{ scale: 0.93 }}
									style={{ height: 30, padding: "0 10px", display: "flex", alignItems: "center", gap: 5, borderRadius: 7, border: "none", background: "transparent", color: "#111", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
									✦ AI
								</motion.button>
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: "auto" }}>
								{gIconBtn(() => setDetailsOpen(v => !v), "Document details",
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
									detailsOpen
								)}
								{gIconBtn(() => setThemeDrawerOpen(true), "Themes — preview, download & copy",
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>,
									themeDrawerOpen
								)}
								{gIconBtn(() => {
									const content = getContent(); const title = getTitle();
									setPreviewData({ title, htmlDoc: buildThemedHTML(content, THEMES.ink, title), markdown: htmlToMarkdown(content) || "", reactSnippet: buildThemedReactSnippet(content, "ink", title) });
									setPreviewOpen(true);
								}, "Preview",
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
								)}
								{gIconBtn(() => setTranslationModalOpen(true), "Theme preview — pick a theme",
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="11" rx="1"/><path d="M7 19h10"/><path d="M12 16v3"/><circle cx="12" cy="10.5" r="2"/></svg>,
									translationModalOpen
								)}
								<motion.button type="button" onClick={handleSave} whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }} whileTap={{ scale: 0.96 }}
									style={{ height: 30, display: "flex", alignItems: "center", gap: 5, background: saved ? "#EFF6EE" : T.accent, border: "none", borderRadius: 8, padding: "0 12px", fontSize: 12, fontWeight: 700, color: saved ? "#3D7A35" : "white", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
									<Icon d={Icons.save} size={12} stroke={saved ? "#3D7A35" : "white"} />
									{saved ? "Saved!" : "Save"}
						</motion.button>
								<div style={{ position: "relative" }} ref={exportDropRef}>
									{gIconBtn(() => setExportDropOpen(v => !v), "Export",
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
										exportDropOpen
									)}
									<AnimatePresence>
									{exportDropOpen && (
										<motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.13 }}
											style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 200, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: "0 10px 28px rgba(0,0,0,0.12)", zIndex: 400, padding: "6px" }}>
											{[
												{ icon: "📋", label: "Copy as text", action: () => { handleCopy(); setExportDropOpen(false); } },
												{ icon: "🌐", label: "Copy HTML", action: () => { navigator.clipboard.writeText(buildThemedHTML(getContent(), THEMES.ink, getTitle())); setExportDropOpen(false); } },
												{ icon: "⚛️", label: "Copy React", action: () => { navigator.clipboard.writeText(buildThemedReactSnippet(getContent(), "ink", getTitle())); setExportDropOpen(false); } },
												{ icon: "📝", label: "Copy Markdown", action: () => { navigator.clipboard.writeText(htmlToMarkdown(getContent()) || ""); setExportDropOpen(false); } },
											].map(item => (
												<button key={item.label} type="button" onClick={item.action}
													style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: "transparent", fontSize: 12, color: T.accent, cursor: "pointer" }}
													onMouseEnter={e => { e.currentTarget.style.background = "#F0F0F0"; }}
													onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
													<span>{item.icon}</span>{item.label}
												</button>
											))}
										</motion.div>
									)}
									</AnimatePresence>
								</div>
								<div style={{ position: "relative" }} ref={publishDropRef}>
									<motion.button type="button" onClick={() => setPublishDropOpen(v => !v)} whileHover={{ background: isPublic ? "#EFF6EE" : "#F0F0F0" }} whileTap={{ scale: 0.93 }}
										style={{ display: "flex", alignItems: "center", gap: 5, height: 30, padding: "0 9px", borderRadius: 8, border: `1px solid ${isPublic ? "#8BC57E" : T.border}`, background: isPublic ? "#EFF6EE" : "transparent", color: isPublic ? "#3D7A35" : T.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
										<span style={{ width: 6, height: 6, borderRadius: "50%", background: isPublic ? "#3D7A35" : T.border, flexShrink: 0, display: "inline-block" }} />
										{isPublic ? "Published" : "Private"}
										<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
					</motion.button>
									<AnimatePresence>
									{publishDropOpen && (
										<motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.13 }}
											style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 320, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.14)", zIndex: 300, padding: "16px 16px 14px" }}>
											<p style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>Visibility</p>
											<div className="flex gap-2 mb-4 bg-zinc-50 rounded-xl p-1">
												{[{ val: false, label: "Private", icon: "🔒" }, { val: true, label: "Public", icon: "🌐" }].map(opt => (
													<button key={String(opt.val)} type="button" onClick={() => setIsPublic(opt.val)}
													className={`flex-1 flex items-center justify-center gap-2 p-1.5 rounded-xl text-sm font-medium ${isPublic === opt.val ? (opt.val ? "bg-amber-50 text-amber-700" : "bg-zinc-50 text-zinc-900") : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
														{opt.icon} {opt.label}
													</button>
												))}
							</div>
											<p style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>Page URL</p>
											<div style={{ display: "flex", alignItems: "center", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
												<span style={{ padding: "7px 8px 7px 10px", fontSize: 11, color: T.muted, whiteSpace: "nowrap", flexShrink: 0 }}>/p/</span>
												<input value={slugInput} onChange={e => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-"))} placeholder={toSlug(titleRef.current?.innerText?.trim() || draft?.title || "") || draftId}
													style={{ flex: 1, border: "none", background: "transparent", fontSize: 12, fontWeight: 500, color: T.accent, padding: "7px 4px", outline: "none", minWidth: 0 }} />
												<button type="button" onClick={() => { navigator.clipboard.writeText(getPublicUrl(toSlug(slugInput)||undefined)); setPublishCopied(true); setTimeout(()=>setPublishCopied(false),2000); }}
													style={{ padding: "7px 10px", background: "transparent", border: "none", borderLeft: `1px solid ${T.border}`, cursor: "pointer", color: publishCopied ? "#3D7A35" : T.muted, display: "flex", alignItems: "center" }}>
													{publishCopied ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
												</button>
											</div>
											<p style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>Published view theme (share link)</p>
											<div style={{ display: "flex", gap: 8, alignItems: "stretch", marginBottom: publishThemedCopied ? 8 : (!isPublic ? 10 : 6) }}>
												<select
													value={publishShareTheme}
													onChange={(e) => setPublishShareTheme(e.target.value)}
													disabled={!isPublic}
													style={{
														flex: 1,
														minWidth: 0,
														padding: "7px 8px",
														borderRadius: 8,
														border: `1px solid ${T.border}`,
														fontSize: 11,
														fontWeight: 500,
														background: isPublic ? T.surface : T.bg,
														color: isPublic ? T.accent : T.muted,
														cursor: isPublic ? "pointer" : "not-allowed",
														opacity: isPublic ? 1 : 0.65,
													}}
												>
													{Object.entries(THEMES).map(([k, t]) => (
														<option key={k} value={k}>
															{t.name}
														</option>
													))}
												</select>
												<button
													type="button"
													disabled={!isPublic}
													onClick={() => {
														if (!isPublic) return;
														navigator.clipboard.writeText(getPublicUrl(toSlug(slugInput) || undefined, publishShareTheme));
														setPublishThemedCopied(true);
														setTimeout(() => setPublishThemedCopied(false), 2000);
													}}
													style={{
														flexShrink: 0,
														padding: "7px 12px",
														borderRadius: 8,
														border: `1px solid ${isPublic ? T.border : T.border}`,
														background: publishThemedCopied ? "#EFF6EE" : T.surface,
														color: publishThemedCopied ? "#3D7A35" : T.accent,
														fontWeight: 600,
														fontSize: 11,
														cursor: isPublic ? "pointer" : "not-allowed",
														whiteSpace: "nowrap",
														opacity: isPublic ? 1 : 0.55,
													}}
												>
													{publishThemedCopied ? "Copied" : "Copy themed link"}
												</button>
											</div>
											{!isPublic && (
												<p style={{ fontSize: 10, color: T.muted, marginTop: -4, marginBottom: 10 }}>
													Publish the post first to generate a shareable theme URL.
												</p>
											)}
											{isPublic && (
												<div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
													<a
														href={getPublicUrl(draft?.slug || undefined, publishShareTheme)}
														target="_blank"
														rel="noopener noreferrer"
														style={{ display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:"#555",textDecoration:"none" }}
													>
														<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
														Open themed page
													</a>
													<a
														href={getPublicUrl(draft?.slug || undefined)}
														target="_blank"
														rel="noopener noreferrer"
														style={{ display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:"#A8A29E",textDecoration:"underline" }}
													>
														Open default layout
													</a>
												</div>
											)}
											<div style={{ display: "flex", justifyContent: "flex-end" }}>
												<button type="button" disabled={publishSaving} onClick={() => savePublishSettings(isPublic, slugInput)}
													style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: isPublic ? "#3D7A35" : T.accent, color: "white", fontWeight: 700, fontSize: 12, cursor: publishSaving ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: publishSaving ? 0.7 : 1 }}>
													{publishSaving && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation:"recSpin 0.7s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
													{publishSaving ? "Saving…" : isPublic ? "Publish" : "Save as Private"}
												</button>
											</div>
										</motion.div>
									)}
									</AnimatePresence>
								</div>
							</div>
						</>
					);
				})()}

			</div>

					<LoginModal
						isOpen={loginModalOpen}
						onClose={() => setLoginModalOpen(false)}
					/>

			{/* ── MAIN BODY ── */}
			<div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
				{/* ── LEFT SIDEBAR — only for logged-in users ── */}
				<AnimatePresence initial={false}>
					{reduxUser && sidebarOpen && (
						<motion.aside
							initial={{ width: 0, opacity: 0 }}
							animate={{ width: 280, opacity: 1 }}
							exit={{ width: 0, opacity: 0 }}
							transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
							style={{
								background: T.sidebar,
								borderRight: `1px solid ${T.border}`,
								display: "flex",
								flexDirection: "column",
								overflow: "hidden",
								flexShrink: 0,
							}}
						>
							<div
								style={{
									padding: "16px 14px 12px",
									borderBottom: `1px solid ${T.border}`,
									flexShrink: 0,
								}}
							>
								{/* Search + new draft */}
								<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
									<div style={{ position: "relative", flex: 1, minWidth: 0 }}>
									<div
										style={{
											position: "absolute",
											left: 10,
											top: "50%",
											transform: "translateY(-50%)",
											pointerEvents: "none",
										}}
									>
										<Icon d={Icons.search} size={13} stroke={T.muted} />
									</div>
									<input
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										placeholder="Search drafts, tables, blog, scrape…"
										style={{
											width: "100%",
											background: T.surface,
											border: `1px solid ${T.border}`,
											borderRadius: 9,
											padding: "7px 10px 7px 30px",
											fontSize: 13,
											color: T.accent,
											outline: "none",
											transition: "border-color 0.2s",
										}}
										onFocus={(e) => (e.target.style.borderColor = T.warm)}
										onBlur={(e) => (e.target.style.borderColor = T.border)}
									/>
									</div>
									<motion.button
										type="button"
										title="New draft"
										whileHover={{ opacity: 0.92 }}
										whileTap={{ scale: 0.96 }}
										onClick={() => router.push("/app")}
										style={{
											flexShrink: 0,
											width: 34,
											height: 34,
											borderRadius: 9,
											border: `1px solid ${T.border}`,
											background: T.accent,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											cursor: "pointer",
										}}
									>
										<Icon d={Icons.plus} size={17} stroke="#fff" strokeWidth={2} />
									</motion.button>
								</div>
							</div>

							{/* Draft list */}
							<div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
								<AnimatePresence>
									{filtered.length === 0 ? (
										<motion.div
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											style={{
												textAlign: "center",
												padding: "40px 16px",
												color: T.muted,
											}}
										>
											<p style={{ fontSize: 32, marginBottom: 10 }}>📭</p>
											<p style={{ fontSize: 13, marginBottom: 12 }}>
												No inkgest found
											</p>
											<motion.button
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
												onClick={() => router.push("/app")}
												style={{
													fontSize: 12,
													fontWeight: 600,
											color: "#111",
													background: "transparent",
													border: `1px solid ${T.border}`,
													borderRadius: 8,
													padding: "8px 14px",
													cursor: "pointer",
												}}
											>
												Create New →
											</motion.button>
										</motion.div>
									) : (
										filtered.map((d) => (
											<ItemCard
												key={d.id}
												item={d}
												active={d.id === draftId}
												onClick={() => openDraftInTab(d.id)}
												onDelete={handleDelete}
											/>
										))
									)}
								</AnimatePresence>
							</div>

						{/* Sidebar footer — credits + upgrade */}
						{reduxUser && (
							<div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
								{/* Credit bar */}
								<div style={{ marginBottom: 8 }}>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
										<span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
											{credits?.plan === "pro" ? "Pro plan" : "Free credits"}
										</span>
										<span style={{ fontSize: 11, fontWeight: 700, color: creditRemaining === 0 ? "#EF4444" : T.accent }}>
											{credits?.plan === "pro" ? "∞" : `${credits ? credits.creditsUsed.toFixed(1) : "0"}/${credits?.creditsLimit ?? FREE_CREDIT_LIMIT}`}
										</span>
									</div>
									{credits?.plan !== "pro" && (
										<div style={{ height: 4, background: T.border, borderRadius: 4, overflow: "hidden" }}>
											<div style={{
												height: "100%",
												borderRadius: 4,
												background: creditRemaining === 0 ? "#EF4444" : T.warm,
												width: `${Math.min(100, ((credits?.creditsUsed ?? 0) / (credits?.creditsLimit ?? FREE_CREDIT_LIMIT)) * 100)}%`,
												transition: "width 0.3s",
											}} />
										</div>
									)}
								</div>
								{/* Account — opens same LoginModal account panel as /app */}
								<motion.button
									type="button"
									whileHover={{ opacity: 0.9 }}
									whileTap={{ scale: 0.99 }}
									onClick={() => setLoginModalOpen(true)}
								style={{
										width: "100%",
										display: "flex",
										alignItems: "center",
										gap: 10,
										padding: "8px 10px",
										marginBottom: 8,
										borderRadius: 8,
										border: `1px solid ${T.border}`,
										background: T.surface,
										cursor: "pointer",
										textAlign: "left",
									}}
								>
									{reduxUser.photoURL ? (
										<img
											src={reduxUser.photoURL}
											alt={reduxUser.displayName || "User"}
											style={{
												width: 30,
												height: 30,
												borderRadius: "50%",
												objectFit: "cover",
												flexShrink: 0,
											}}
										/>
									) : (
										<div
											style={{
												width: 30,
												height: 30,
												borderRadius: "50%",
												background: T.border,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												flexShrink: 0,
											}}
										>
											<Icon d={Icons.settings} size={14} stroke={T.muted} />
										</div>
									)}
									<div style={{ flex: 1, minWidth: 0 }}>
										<p
											style={{
												fontSize: 12,
												fontWeight: 600,
												color: T.accent,
												lineHeight: 1.3,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
												margin: 0,
											}}
										>
											{reduxUser.displayName || reduxUser.email?.split("@")[0] || "Account"}
										</p>
										<p
											style={{
												fontSize: 11,
												color: T.muted,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
												margin: 0,
											}}
										>
											{reduxUser.email}
										</p>
									</div>
								</motion.button>
								{/* Upgrade button */}
								<motion.button
									type="button"
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.97 }}
									onClick={() => router.push("/pricing")}
									style={{ width: "100%", padding: "7px 0", borderRadius: 8, border: "none", background: credits?.plan === "pro" ? T.base : T.accent, color: credits?.plan === "pro" ? T.muted : "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
								>
									{credits?.plan === "pro" ? "Manage plan" : "Upgrade to Pro"}
								</motion.button>
							</div>
						)}
						</motion.aside>
					)}
				</AnimatePresence>

				{/* ── CENTER PANEL — Editor ── */}
				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
						minWidth: 0,
					}}
				>
					{((!router.isReady || loadingDraft) &&
						!draft &&
						draftId) && (
							<div
								style={{
									flex: 1,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									background: T.surface,
								}}
							>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center",
										gap: 14,
									}}
								>
									<div
										style={{
											width: 32,
											height: 32,
											borderRadius: "50%",
											border: `3px solid ${T.muted}33`,
											borderTop: `3px solid ${T.accent}`,
											animation: "spin 0.8s linear infinite",
											marginBottom: 2,
										}}
									/>
									<div style={{ fontSize: 13, color: T.muted }}>
									Loading…
									</div>
								</div>
		
							</div>
						)}
					{draft && (
						<motion.div
							key={`editor-${draftId}`}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.2 }}
							style={{
								flex: 1,
								display: "flex",
								flexDirection: "column",
								overflow: "hidden",
							}}
						>
						{/* ── Details side drawer ── */}
						<AnimatePresence>
						{detailsOpen && (
							<motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 32 }}
								style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 280, background: T.surface, borderLeft: `1px solid ${T.border}`, zIndex: 50, display: "flex", flexDirection: "column", boxShadow: "-8px 0 24px rgba(0,0,0,0.06)", overflowY: "auto" }}>
								{/* Drawer header */}
								<div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
									<span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>Document Details</span>
									<button type="button" onClick={() => setDetailsOpen(false)} style={{ width: 26, height: 26, borderRadius: "50%", border: `1px solid ${T.border}`, background: "transparent", color: T.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✕</button>
								</div>

								{/* Stats */}
								<div style={{ padding: "14px 16px" }}>
									<p style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Stats</p>
									<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
										{[
											{ label: "Words", value: wordCount },
											{ label: "Read time", value: `~${Math.max(1, Math.round(wordCount / 200))} min` },
											{ label: "Characters", value: (editorRef.current?.innerText || "").replace(/\s/g, "").length },
											{ label: "Paragraphs", value: (editorRef.current?.querySelectorAll("p") || []).length },
										].map((s) => (
											<div key={s.label} style={{ background: T.bg, borderRadius: 8, padding: "8px 10px", border: `1px solid ${T.border}` }}>
												<p style={{ fontSize: 18, fontWeight: 700, color: T.accent, lineHeight: 1, marginBottom: 2 }}>{s.value}</p>
												<p style={{ fontSize: 10, color: T.muted }}>{s.label}</p>
											</div>
										))}
								</div>

									{/* Meta */}
									<p style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Meta</p>
									<div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
										{draft?.date && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, color: T.muted }}>Created</span><span style={{ fontSize: 11, fontWeight: 600, color: T.accent }}>{draft.date}</span></div>}
										{draft?.tag && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, color: T.muted }}>Tag</span><span style={{ fontSize: 11, fontWeight: 600, color: T.accent }}>{draft.tag}</span></div>}
										{draft?.style && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, color: T.muted }}>Style</span><span style={{ fontSize: 11, fontWeight: 600, color: T.accent, textTransform: "capitalize" }}>{draft.style}</span></div>}
										{sourceUrl && <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>Source</span><a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: T.warm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none" }}>{sourceUrl.replace(/^https?:\/\/(www\.)?/, "").slice(0, 30)}</a></div>}
									</div>

									{/* Prompt */}
								{assetPrompt && (<>
									<p style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>AI Prompt</p>
									<div style={{ background: "#F5F5F5", border: `1px solid #E2E2E2`, borderRadius: 8, padding: "8px 10px", marginBottom: 16 }}>
										<p style={{ fontSize: 11, color: "#444", lineHeight: 1.6 }}>{assetPrompt}</p>
									</div>
								</>)}

									{/* Editor appearance */}
									<p style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Appearance</p>
									<div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
										{/* Font family — AnimatedDropdown */}
										<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
											<span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>Font</span>
											<div style={{ flex: 1, maxWidth: 140 }}>
												<AnimatedDropdown
													isOpen={detailFontOpen}
													onToggle={() => setDetailFontOpen(v => !v)}
													onSelect={(val) => { setEditorFont(val); setDetailFontOpen(false); }}
													value={editorFont}
													options={[
														{ value: "Comic", label: "Comic" },
														{ value: "Georgia", label: "Georgia" },
														{ value: "system-ui", label: "System" },
													]}
													buttonClassName="!py-1 !px-2 !rounded-xl !text-xs"
													dropdownClassName="!rounded-xl !shadow-md"
													optionClassName="!py-1 !px-2 !text-xs !rounded-md"
												/>
											</div>
										</div>
										{/* Font size */}
										<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
											<span style={{ fontSize: 11, color: T.muted }}>Font size</span>
											<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
												<button type="button" onClick={() => setEditorFontSize((s) => Math.max(12, s - 2))} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, fontSize: 11, fontWeight: 700, color: T.accent, cursor: "pointer" }}>−</button>
												<span style={{ fontSize: 12, fontWeight: 600, color: T.accent, minWidth: 26, textAlign: "center" }}>{editorFontSize}px</span>
												<button type="button" onClick={() => setEditorFontSize((s) => Math.min(24, s + 2))} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, fontSize: 11, fontWeight: 700, color: T.accent, cursor: "pointer" }}>+</button>
											</div>
										</div>
										{/* Editor style / variant — AnimatedDropdown */}
										<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
											<span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>Style</span>
											<div style={{ flex: 1, maxWidth: 140 }}>
												<AnimatedDropdown
													isOpen={detailStyleOpen}
													onToggle={() => setDetailStyleOpen(v => !v)}
													onSelect={(val) => { setEditorVariant(val); setDetailStyleOpen(false); }}
													value={editorVariant}
													options={[
														{ value: "default",    label: "Default" },
														{ value: "paper",      label: "Paper Lines" },
														{ value: "typewriter", label: "Typewriter" },
														{ value: "terminal",   label: "Dark" },
														{ value: "minimal",    label: "Minimal" },
													]}
													buttonClassName="!py-1 !px-2 !rounded-xl !text-xs"
													dropdownClassName="!rounded-xl !shadow-md"
													optionClassName="!py-1 !px-2 !text-xs !rounded-md"
												/>
											</div>
								</div>
							</div>

								{/* AI chat shortcut */}
								<button type="button" onClick={() => { setChatOpen(true); setDetailsOpen(false); }}
									style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid #222`, background: "#111", cursor: "pointer", marginBottom: 8 }}>
									<span style={{ fontSize: 16, color: "#fff" }}>✦</span>
									<div style={{ textAlign: "left" }}>
										<p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: 0 }}>Open AI Chat</p>
										<p style={{ fontSize: 10, color: "#aaa", margin: 0 }}>Ask AI to help with this draft</p>
									</div>
								</button>
								</div>
							</motion.div>
						)}
						</AnimatePresence>

						<div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
					{/* Draft title — inherits variant background so it blends seamlessly */}
					{(() => {
						const variantBg =
							editorVariant === "terminal"   ? "#0D1117" :
							editorVariant === "typewriter" ? "#EDE3CC" :
							editorVariant === "paper"      ? "#FEFDF4" :
							editorVariant === "minimal"    ? "#FAFAF8" :
							T.surface;
						const variantColor =
							editorVariant === "terminal" ? "#A8FF78" : T.accent;
						const variantFont =
							editorVariant === "typewriter" ? "'Courier New', Courier, monospace" :
							editorVariant === "minimal"    ? "Georgia, 'Times New Roman', serif" :
							editorFont === "Georgia"       ? "Georgia, serif" :
							editorFont === "system-ui"     ? "system-ui, sans-serif" :
							"'Comic', sans-serif";
						const dividerColor =
							editorVariant === "terminal"   ? "rgba(168,255,120,0.2)" :
							editorVariant === "typewriter" ? "rgba(100,80,50,0.25)" :
							editorVariant === "paper"      ? "rgba(180,150,100,0.3)" :
							T.border;
						return (
							<div
								style={{ padding: "36px 0 18px", background: variantBg, display: "flex", flexDirection: "column", alignItems: "center" }}
								onClick={(e) => { if (e.target === e.currentTarget) editorRef.current?.focus(); }}
							>
								<div style={{ width: "100%", maxWidth: 720, padding: "0 48px" }}>
									<div ref={titleRef} contentEditable suppressContentEditableWarning data-placeholder="Untitled draft"
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												editorRef.current?.focus();
												const sel = window.getSelection();
												const el = editorRef.current;
												if (sel && el) {
													const range = document.createRange();
													range.setStart(el, 0);
													range.collapse(true);
													sel.removeAllRanges();
													sel.addRange(range);
												}
											}
										}}
										style={{ fontSize: "clamp(24px, 3.5vw, 34px)", color: variantColor, lineHeight: 1.2, letterSpacing: "-0.6px", outline: "none", fontWeight: 700, fontFamily: variantFont }}
										dangerouslySetInnerHTML={{ __html: draft?.title || "" }}
									/>

											</div>
										</div>
						);
					})()}

					{/* Editor body — no independent scroll; parent container scrolls */}
								<div
									ref={editorContainerRef}
									data-editor-root
					data-editor-variant={editorVariant}
									style={{
										flex: 1,
										position: "relative",
							backgroundColor:
								editorVariant === "terminal"   ? "#0D1117" :
								editorVariant === "typewriter" ? "#EDE3CC" :
								editorVariant === "paper"      ? "#FEFDF4" :
								editorVariant === "minimal"    ? "#FAFAF8" :
								T.surface,
							// Terminal: faint scanlines via CSS gradient on the container
							backgroundImage:
								editorVariant === "terminal"
									? "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.015) 2px, rgba(0,255,0,0.015) 4px)"
									: editorVariant === "typewriter"
										? "none"
										: "none",
									}}
								>
									<style>{`
										[data-editor-root] [contenteditable="true"] { font-size: ${editorFontSize}px; }
										[data-editor-root] [contenteditable="true"] p,
										[data-editor-root] [contenteditable="true"] li { font-size: ${editorFontSize}px !important; }
										[data-editor-root] [contenteditable="true"] h1 { font-size: ${Math.round(editorFontSize * 1.73)}px !important; }
										[data-editor-root] [contenteditable="true"] h2 { font-size: ${Math.round(editorFontSize * 1.33)}px !important; }
										[data-editor-root] [contenteditable="true"] h3 { font-size: ${Math.round(editorFontSize * 1.13)}px !important; }

							/* ══ Paper Lines ══
								background-image applied here — does NOT conflict with
								inline backgroundColor:transparent on the element       */
							[data-editor-root][data-editor-variant="paper"] [contenteditable="true"] {
								background-image:
									linear-gradient(90deg, #E05555 0px, #E05555 1px, transparent 1px),
									repeating-linear-gradient(
										transparent,
										transparent ${Math.round(editorFontSize * 1.75) - 1}px,
										#C9C3B8 ${Math.round(editorFontSize * 1.75) - 1}px,
										#C9C3B8 ${Math.round(editorFontSize * 1.75)}px
									);
								background-size: 100% 100%, 100% ${Math.round(editorFontSize * 1.75)}px;
								background-attachment: local;
								background-position: 52px 0, 0 0;
								padding-left: 72px !important;
								line-height: ${Math.round(editorFontSize * 1.75)}px !important;
								caret-color: #8B4513;
							}
							[data-editor-root][data-editor-variant="paper"] [contenteditable="true"] p,
							[data-editor-root][data-editor-variant="paper"] [contenteditable="true"] li,
							[data-editor-root][data-editor-variant="paper"] [contenteditable="true"] h1,
							[data-editor-root][data-editor-variant="paper"] [contenteditable="true"] h2,
							[data-editor-root][data-editor-variant="paper"] [contenteditable="true"] h3 {
								line-height: ${Math.round(editorFontSize * 1.75)}px !important;
								margin: 0 !important;
								padding: 0 !important;
							}

							/* ══ Typewriter ══ */
							[data-editor-root][data-editor-variant="typewriter"] [contenteditable="true"] {
								caret-color: #5C3D1E;
								letter-spacing: 0.04em;
							}
							[data-editor-root][data-editor-variant="typewriter"] [contenteditable="true"] h1,
							[data-editor-root][data-editor-variant="typewriter"] [contenteditable="true"] h2,
							[data-editor-root][data-editor-variant="typewriter"] [contenteditable="true"] h3 {
								border-bottom: 2px solid #8B6914;
								padding-bottom: 4px;
								margin-bottom: 12px;
							}
							[data-editor-root][data-editor-variant="typewriter"] [contenteditable="true"] blockquote {
								border-left: 4px double #8B6914 !important;
								background: #EDE3CC !important;
								color: #5C3D1E !important;
							}

							/* ══ Terminal / Dark ══ */
							[data-editor-root][data-editor-variant="terminal"] [contenteditable="true"] {
								caret-color: #57FF57;
							}
							[data-editor-root][data-editor-variant="terminal"] [contenteditable="true"]:empty:before {
								color: #2A4A2A !important;
							}
							[data-editor-root][data-editor-variant="terminal"] [contenteditable="true"] h1,
							[data-editor-root][data-editor-variant="terminal"] [contenteditable="true"] h2,
							[data-editor-root][data-editor-variant="terminal"] [contenteditable="true"] h3 {
								color: #79C0FF !important;
								border-bottom: 1px solid #1E3A1E;
								padding-bottom: 6px;
							}
							[data-editor-root][data-editor-variant="terminal"] [contenteditable="true"] blockquote {
								border-left: 3px solid #238636 !important;
								background: #0D2818 !important;
								color: #8B949E !important;
							}
							[data-editor-root][data-editor-variant="terminal"] [contenteditable="true"] code {
								background: #161B22 !important;
								color: #F78166 !important;
								border: 1px solid #30363D !important;
							}

							/* ══ Minimal / Serif ══ */
							[data-editor-root][data-editor-variant="minimal"] [contenteditable="true"] {
								caret-color: #C17B2F;
							}
							[data-editor-root][data-editor-variant="minimal"] [contenteditable="true"] h1,
							[data-editor-root][data-editor-variant="minimal"] [contenteditable="true"] h2,
							[data-editor-root][data-editor-variant="minimal"] [contenteditable="true"] h3 {
								font-weight: 400 !important;
								letter-spacing: -0.02em;
								border-bottom: 1px solid #E0D8CC;
								padding-bottom: 6px;
								margin-bottom: 14px;
							}
							[data-editor-root][data-editor-variant="minimal"] [contenteditable="true"] blockquote {
								border-left: 2px solid #C17B2F !important;
								background: transparent !important;
								font-style: italic;
								color: #8B7355 !important;
								padding: 2px 16px !important;
							}
							[data-editor-root][data-editor-variant="minimal"] [contenteditable="true"] p {
								line-height: 2 !important;
								margin-bottom: 18px !important;
							}
						
										[data-editor-root] [contenteditable="true"] blockquote,
										[data-editor-root] [contenteditable="true"] blockquote *,
										[data-editor-root] [contenteditable="true"] [data-block],
										[data-editor-root] [contenteditable="true"] [data-block] * { font-size: inherit !important; }
										[data-editor-root] [contenteditable="true"] a {
											color: #0078D4;
											text-decoration: underline;
											text-underline-offset: 2px;
											cursor: pointer;
										}
										[data-editor-root] [contenteditable="true"] img {
											max-width: 100%;
											height: auto;
											border-radius: 6px;
											margin: 12px 0;
											display: block;
										}
										[data-editor-root] [contenteditable="true"] figure[data-draft-image-wrap] img {
											margin: 0 !important;
											max-width: 100%;
										}
										[data-editor-root] [contenteditable="true"] figure[data-draft-image-wrap] details[data-draft-img-popover] > summary {
											list-style: none;
										}
										[data-editor-root] [contenteditable="true"] figure[data-draft-image-wrap] details[data-draft-img-popover] > summary::-webkit-details-marker {
											display: none;
										}
										[data-editor-root] [contenteditable="true"] figure[data-draft-image-wrap] [data-draft-img-menu] button:hover {
											background: #F3EFE8 !important;
										}
										[data-editor-root] [contenteditable="true"] [data-draft-caption]:empty:before {
											content: attr(data-placeholder);
											color: #B0AAA3;
											pointer-events: none;
										}
										[data-editor-root] [contenteditable="true"] [data-draft-caption]:focus:before {
											content: none !important;
										}
										[data-editor-root] [contenteditable="true"] ul:not([data-todo="true"]) {
											list-style-type: disc !important;
											list-style-position: outside !important;
											padding-left: 1.5em !important;
											margin: 0.5em 0 !important;
										}
										[data-editor-root] [contenteditable="true"] ol {
											list-style-type: decimal !important;
											list-style-position: outside !important;
											padding-left: 1.5em !important;
											margin: 0.5em 0 !important;
										}
										[data-editor-root] [contenteditable="true"] ul:not([data-todo="true"]) > li,
										[data-editor-root] [contenteditable="true"] ol > li {
											display: list-item !important;
											margin: 0.2em 0 !important;
										}
										[data-editor-root] [contenteditable="true"] ul[data-todo="true"] {
											list-style: none;
											padding-left: 0;
										}
										[data-editor-root] [contenteditable="true"] ul[data-todo="true"] li {
											list-style: none;
										}
										[data-editor-root] [contenteditable="true"] ul[data-todo="true"] li.todo-item span.todo-label {
											flex: 1;
											min-width: 0;
										}
										[data-editor-root] [contenteditable="true"] span[data-draft-inline] {
											box-decoration-break: clone;
											-webkit-box-decoration-break: clone;
										}
										[data-editor-root] [contenteditable="true"] [data-block="code-group"] [data-cg-panel] pre {
											font-family: 'Fira Code', 'Cascadia Code', 'Courier New', monospace !important;
											font-size: 13px !important;
											line-height: 1.75 !important;
											color: #E8D5B0 !important;
											background: #1A1A1A !important;
											min-height: 72px !important;
											display: block !important;
											white-space: pre-wrap !important;
											box-sizing: border-box !important;
											width: 100% !important;
											margin: 0 !important;
										}
									[data-editor-root] [contenteditable="true"] [data-card-icon]:empty:before,
									[data-editor-root] [contenteditable="true"] [data-card-heading]:empty:before,
									[data-editor-root] [contenteditable="true"] [data-card-desc]:empty:before {
										content: attr(data-placeholder);
										color: #B0AAA3;
										pointer-events: none;
									}
									[data-editor-root] [contenteditable="true"] [data-placeholder]:empty:before {
										content: attr(data-placeholder);
										color: #B0AAA3;
										pointer-events: none;
									}
									[data-editor-root] [contenteditable="true"] [data-icon-selector]:hover {
										background: rgba(193,123,47,0.08);
										border-radius: 4px;
									}
									[data-editor-root] [contenteditable="true"] [data-block="toggle-group"] details > summary::-webkit-details-marker { display: none; }
									[data-editor-root] [contenteditable="true"] [data-block="toggle-group"] details > summary { list-style: none; }
									[data-editor-root] [contenteditable="true"] > *:hover ~ [data-drag-handle] { opacity: 1 !important; }
									[data-editor-root] [contenteditable="true"] [data-audio-name]:empty:before,
									[data-editor-root] [contenteditable="true"] [data-audio-caption]:empty:before {
										content: attr(data-placeholder);
										color: #C8C4BC;
										pointer-events: none;
									}
									[data-editor-root] [contenteditable="true"] [data-audio-name]:focus:before,
									[data-editor-root] [contenteditable="true"] [data-audio-caption]:focus:before {
										content: none !important;
									}
									@keyframes spin { to { transform: rotate(360deg); } }
									[data-editor-root] [contenteditable="true"] [data-block="audio-block"] audio::-webkit-media-controls-panel {
										background: #F7F5F0;
									}
									[data-editor-root] [contenteditable="true"] [data-toggle-group-label]:empty:before {
										content: attr(data-placeholder);
										color: #C8C4BC;
										pointer-events: none;
									}
									[data-editor-root] [contenteditable="true"] [data-toggle-group-label]:focus:before {
										content: none !important;
										}
									`}</style>
									<div
										ref={editorRef}
										contentEditable
										suppressContentEditableWarning
										onInput={onEditorInput}
										onCompositionEnd={onEditorInput}
										onKeyDown={(e) => {
											if ((e.key === " " || e.code === "Space") && !e.defaultPrevented) {
												const root = editorRef.current;
												const sel = window.getSelection();
												if (root && sel?.rangeCount) {
													const range = sel.getRangeAt(0);
													let node = range.commonAncestorContainer;
													if (node.nodeType === 3) node = node.parentElement;
													const callout = node?.closest?.(
														"[data-block^='callout-']",
													);
													if (callout && root.contains(callout)) {
														const flex = callout.querySelector(
															':scope > div[style*="flex:1"]',
														);
														const bodyDiv =
															flex?.querySelector(":scope > p + div") ||
															flex?.querySelector(":scope > div:last-of-type");
														const bodyText = (
															bodyDiv?.innerText ||
															bodyDiv?.textContent ||
															""
														)
															.replace(/\u00a0/g, " ")
															.trim();
														if (!bodyText) {
															e.preventDefault();
															const p = document.createElement("p");
															p.appendChild(document.createElement("br"));
															callout.replaceWith(p);
															const r = document.createRange();
															r.setStart(p, 0);
															r.collapse(true);
															sel.removeAllRanges();
															sel.addRange(r);
															countWords();
															onEditorInput();
															return;
														}
													}
												}
											}
											if (e.key === "Enter" && !e.shiftKey) {
												const sel = window.getSelection();
												if (sel?.rangeCount && editorRef.current) {
													const range = sel.getRangeAt(0);
													const li =
														range.commonAncestorContainer.nodeType === 3
															? range.commonAncestorContainer.parentElement?.closest(
																	"li",
																)
															: range.commonAncestorContainer.closest?.("li");
													const ul = li?.closest?.('ul[data-todo="true"]');
													if (li && ul && editorRef.current.contains(li)) {
														e.preventDefault();
														const span =
															li.querySelector("span.todo-label") ||
															li.querySelector(":scope > span");
														if (!span) {
															const newLi = document.createElement("li");
															newLi.className = "todo-item";
															newLi.setAttribute(
																"style",
																TODO_LI_STYLE,
															);
															newLi.innerHTML = `<input type="checkbox" class="todo-cb" style="${TODO_CHECKBOX_STYLE}"/><span class="todo-label" style="flex:1;min-width:0"> </span>`;
															ul.insertBefore(newLi, li.nextSibling);
															const ns = newLi.querySelector("span");
															const r = document.createRange();
															const tn = ns?.firstChild;
															if (tn && tn.nodeType === 3) {
																r.setStart(tn, 1);
																r.collapse(true);
															} else {
																r.selectNodeContents(ns);
																r.collapse(true);
															}
															sel.removeAllRanges();
															sel.addRange(r);
														} else {
															const pre = document.createRange();
															pre.selectNodeContents(span);
															pre.setEnd(
																range.startContainer,
																range.startOffset,
															);
															const beforeText = pre.toString();
															const post = document.createRange();
															post.selectNodeContents(span);
															post.setStart(
																range.startContainer,
																range.startOffset,
															);
															const afterText = post.toString();
															span.textContent = beforeText;

															const newLi = document.createElement("li");
															newLi.className = "todo-item";
															newLi.setAttribute(
																"style",
																li.getAttribute("style") || TODO_LI_STYLE,
															);
															const cb = document.createElement("input");
															cb.className = "todo-cb";
															cb.setAttribute("type", "checkbox");
															cb.setAttribute("style", TODO_CHECKBOX_STYLE);
															const newSpan = document.createElement("span");
															newSpan.className = "todo-label";
															newSpan.setAttribute("style", "flex:1;min-width:0");
															const nextText =
																afterText.length > 0 ? afterText : " ";
															newSpan.textContent = nextText;
															newLi.appendChild(cb);
															newLi.appendChild(newSpan);
															ul.insertBefore(newLi, li.nextSibling);

															const r = document.createRange();
															const nc = newSpan.firstChild;
															if (nc && nc.nodeType === 3) {
																const off = afterText.length > 0 ? 0 : 1;
																r.setStart(nc, off);
																r.collapse(true);
															} else {
																r.selectNodeContents(newSpan);
																r.collapse(true);
															}
															sel.removeAllRanges();
															sel.addRange(r);
														}
														countWords();
														return;
													}
												}
											}
									}}
								onDragOver={(e) => {
									if (!dragSrcRef.current) return;
									e.preventDefault();
									e.dataTransfer.dropEffect = "move";
									const editor = editorRef.current;
									const container = editorContainerRef.current;
									if (!editor || !container) return;
									let target = e.target;
									if (target.nodeType === 3) target = target.parentElement;
									while (target && target.parentElement !== editor) target = target.parentElement;
									if (!target || target === dragSrcRef.current) { setDropIndicator(null); return; }
									const tgtRect = target.getBoundingClientRect();
									const containerRect = container.getBoundingClientRect();
									const before = e.clientY < tgtRect.top + tgtRect.height / 2;
									const editorRect = editor.getBoundingClientRect();
									dragOverRef.current = { block: target, before };
									setDropIndicator({
										top: (before ? tgtRect.top : tgtRect.bottom) - containerRect.top + container.scrollTop,
										left: editorRect.left - containerRect.left,
										width: editorRect.width,
									});
								}}
								onDragLeave={(e) => {
									if (!editorRef.current?.contains(e.relatedTarget)) {
										setDropIndicator(null);
										dragOverRef.current = null;
									}
								}}
								onDrop={(e) => {
									const src = dragSrcRef.current;
									if (!src) return;
									e.preventDefault();
									const editor = editorRef.current;
									if (!editor) return;
									const over = dragOverRef.current;
									if (over?.block && over.block !== src) {
										if (over.before) editor.insertBefore(src, over.block);
										else editor.insertBefore(src, over.block.nextSibling);
									}
									src.style.opacity = "";
									src.style.outline = "";
									dragSrcRef.current = null;
									dragOverRef.current = null;
									setDragHandle(null);
									setDropIndicator(null);
									countWords();
										}}
										data-placeholder="Write, or type / for commands…"
										style={{
							maxWidth:
								editorVariant === "minimal" ? 620 :
								editorVariant === "paper"   ? 760 : 720,
											margin: "0 auto",
							padding:
								editorVariant === "minimal"    ? "48px 72px 120px" :
								editorVariant === "paper"      ? "0 48px 100px 0" :
								editorVariant === "typewriter" ? "36px 56px 100px" :
								"36px 48px 100px",
											minHeight: "100%",
											outline: "none",
											fontSize: `${editorFontSize}px`,
							lineHeight:
								editorVariant === "paper"   ? `${Math.round(editorFontSize * 1.75)}px` :
								editorVariant === "minimal" ? 2 : 1.75,
							color:
								editorVariant === "terminal"   ? "#57FF57" :
								editorVariant === "typewriter" ? "#2C1A0E" :
								editorVariant === "paper"      ? "#2A2018" :
								editorVariant === "minimal"    ? "#3D3530" :
								"#37352F",
											fontFamily:
								editorVariant === "typewriter" ? "'Courier New', Courier, monospace" :
								editorVariant === "terminal"   ? "'Fira Code', 'Cascadia Code', 'Courier New', monospace" :
								editorVariant === "minimal"    ? "Georgia, 'Times New Roman', serif" :
								editorFont === "Georgia"       ? "Georgia, serif" :
								editorFont === "system-ui"     ? "system-ui, sans-serif" :
								"'Comic', sans-serif",
							letterSpacing:
								editorVariant === "typewriter" ? "0.06em" :
								editorVariant === "terminal"   ? "0.03em" :
								editorVariant === "minimal"    ? "0.01em" : "normal",
							// backgroundColor (not background shorthand) so CSS background-image for paper lines is NOT overridden
							backgroundColor: "transparent",
										}}
									/>
									<input
										ref={imageFileInputRef}
										type="file"
										accept="image/*,video/*"
										style={{ display: "none" }}
										onChange={handleImageFileSelect}
									/>
							<input
								ref={audioFileInputRef}
								type="file"
								accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
								style={{ display: "none" }}
								onChange={handleAudioFileSelect}
									/>
									{/* Slash command dropdown */}
									<AnimatePresence>
										{slashCommand && (
											<motion.div
												data-slash-command
												initial={{ opacity: 0, y: 6, scale: 0.98 }}
												animate={{ opacity: 1, y: 0, scale: 1 }}
												exit={{ opacity: 0, y: 6, scale: 0.98 }}
												transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
												style={{
													position: "fixed",
													left: slashCommand.x,
													top: slashCommand.y,
													zIndex: 100,
													background: T.surface,
													border: `1px solid ${T.border}`,
													borderRadius: 12,
													boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
													padding: 8,
													minWidth: 240,
													maxHeight: 420,
													overflowY: "auto",
												}}
											>
												{(() => {
													const q = (slashCommand.query ?? "")
														.trim()
														.toLowerCase();
													const aiHit = draftSlashItemMatchesQuery(
														{
															id: "ask-ai",
															label: "Ask AI",
															keywords: DRAFT_SLASH_AI_KEYWORDS,
														},
														q,
													);
											const allMatching = DRAFT_SLASH_BASE_ITEMS.filter(
												(it) => draftSlashItemMatchesQuery(it, q),
											);
											const flatRows = getDraftSlashFlatRows(slashCommand.query);
											const activeIdx = flatRows.length > 0 ? Math.min(slashListIndex, flatRows.length - 1) : 0;
											const aiRowOffset = aiHit ? 1 : 0;
											// Build ordered sub-section groups
											const SUB_ORDER = ["Typography", "Lists", "Media", "Data", "Components", "Callouts", "Code", "Dividers"];
											const grouped = {};
											allMatching.forEach((it) => {
												const s = it.subSection || it.section;
												if (!grouped[s]) grouped[s] = [];
												grouped[s].push(it);
											});
											const orderedGroups = SUB_ORDER.filter((s) => grouped[s]?.length > 0).map((s) => ({ label: s, items: grouped[s] }));

											if (!aiHit && allMatching.length === 0) {
														return (
													<div style={{ padding: "10px 12px", fontSize: 13, color: T.muted }}>
																No matching commands
															</div>
														);
													}
													const sectionTitleStyle = {
												fontSize: 9.5,
														fontWeight: 700,
												color: "#C4BDB5",
												letterSpacing: "0.08em",
												textTransform: "uppercase",
												margin: "8px 0 4px 6px",
													};
													const rowBtnStyle = {
														width: "100%",
														display: "flex",
														alignItems: "center",
														gap: 10,
												padding: "7px 10px",
														border: "none",
												borderRadius: 7,
														background: "none",
												fontSize: 13,
														fontWeight: 500,
														color: T.accent,
														cursor: "pointer",
														textAlign: "left",
													};
													const renderIcon = (item) => {
														const ic = item.icon;
												if (ic === "list") return <Icon d={Icons.list} size={15} stroke={T.muted} />;
												if (ic === "image") return <Icon d={Icons.image} size={15} stroke={T.muted} />;
												if (ic === "table") return <Icon d={Icons.table} size={15} stroke={T.muted} />;
												if (ic === "embed") return <Icon d={Icons.video} size={15} stroke={T.muted} />;
												if (typeof ic === "string" && !ic.startsWith("M")) {
													return <span style={{ fontSize: 13, fontWeight: 600, width: 18, textAlign: "center", flexShrink: 0 }}>{ic}</span>;
												}
												return <Icon d={ic} size={15} stroke={T.muted} />;
											};
											// Build flat index for keyboard nav (ai first, then items in group order)
											let navIdx = aiHit ? 1 : 0;
													return (
														<>
															{aiHit && (
																<>
																	<p style={sectionTitleStyle}>AI</p>
																	<motion.button
																		whileHover={{ background: "#F0ECE5" }}
																		whileTap={{ scale: 0.98 }}
																onClick={() => handleSlashCommand("ask-ai")}
																data-slash-active={activeIdx === 0 ? "true" : undefined}
																style={{ ...rowBtnStyle, ...(activeIdx === 0 ? { background: "#EDE8E0" } : {}) }}
															>
																<Icon d="M12 3l1.8 5.4L19.2 9l-5.4 1.8L12 16.2l-1.8-5.4L4.8 9l5.4-1.8L12 3z" size={13} stroke="#C17B2F" />
																		Ask AI
																	</motion.button>
																</>
															)}
													{orderedGroups.map((group, gi) => {
														return (
															<div key={group.label}>
																{(gi > 0 || aiHit) && <div style={{ height: 1, background: T.border, margin: "6px 0" }} />}
																<p style={sectionTitleStyle}>{group.label}</p>
																{group.items.map((item) => {
																	const myIdx = aiRowOffset + flatRows.slice(aiHit ? 1 : 0).findIndex((r) => r.id === item.id);
																	const isActive = activeIdx === (aiHit ? 1 : 0) + allMatching.findIndex((x) => x.id === item.id);
																		return (
																		<motion.button
																			key={item.id}
																			whileHover={{ background: "#F0ECE5" }}
																			whileTap={{ scale: 0.98 }}
																			onClick={() => handleSlashCommand(item.id)}
																			data-slash-active={isActive ? "true" : undefined}
																			style={{ ...rowBtnStyle, ...(isActive ? { background: "#EDE8E0" } : {}) }}
																		>
																			{renderIcon(item)}
																			{item.label}
																		</motion.button>
																	);
																})}
															</div>
																	);
																	})}
																</>
											);
											})()}
										</motion.div>
									)}
								</AnimatePresence>

								{/* ── Drag handle ── */}
								{dragHandle && dragHandle.block && (
									<div
										contentEditable={false}
										draggable
										onDragStart={(e) => {
											dragSrcRef.current = dragHandle.block;
											e.dataTransfer.effectAllowed = "move";
											/* Ghost image: small translucent clone */
											try {
												const ghost = dragHandle.block.cloneNode(true);
												ghost.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0.7;pointer-events:none;max-width:400px;background:#fff;border-radius:8px;padding:6px 10px;box-shadow:0 4px 16px rgba(0,0,0,0.12)";
												document.body.appendChild(ghost);
												e.dataTransfer.setDragImage(ghost, 20, 20);
												setTimeout(() => document.body.removeChild(ghost), 0);
											} catch (_) {}
											dragHandle.block.style.opacity = "0.35";
											dragHandle.block.style.outline = `2px dashed ${T.border}`;
											dragHandle.block.style.borderRadius = "6px";
										}}
										onDragEnd={() => {
											if (dragSrcRef.current) {
												dragSrcRef.current.style.opacity = "";
												dragSrcRef.current.style.outline = "";
												dragSrcRef.current.style.borderRadius = "";
											}
											dragSrcRef.current = null;
											dragOverRef.current = null;
											setDropIndicator(null);
										}}
																			style={{
											position: "absolute",
											left: dragHandle.handleLeft,
											top: dragHandle.top + (dragHandle.height / 2) - 11,
											width: 22,
											height: 22,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											cursor: "grab",
											opacity: 0,
											borderRadius: 5,
											background: "transparent",
											transition: "opacity 0.12s, background 0.12s",
											userSelect: "none",
											zIndex: 20,
											color: "#B0AAA3",
										}}
										title="Drag to reorder"
										onMouseEnter={(e) => {
											e.currentTarget.style.opacity = "1";
											e.currentTarget.style.background = "#F0ECE5";
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.opacity = "0";
											e.currentTarget.style.background = "transparent";
										}}
										/* make it visible when parent block is hovered */
										ref={(el) => {
											if (el && dragHandle.block) {
												const show = () => { el.style.opacity = "1"; };
												const hide = () => { if (!dragSrcRef.current) el.style.opacity = "0"; };
												dragHandle.block.addEventListener("mouseenter", show);
												dragHandle.block.addEventListener("mouseleave", hide);
											}
										}}
									>
										{/* 6-dot grip */}
										<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
											<circle cx="4.5" cy="3.5" r="1.2" fill="#9A9490"/>
											<circle cx="4.5" cy="7" r="1.2" fill="#9A9490"/>
											<circle cx="4.5" cy="10.5" r="1.2" fill="#9A9490"/>
											<circle cx="9.5" cy="3.5" r="1.2" fill="#9A9490"/>
											<circle cx="9.5" cy="7" r="1.2" fill="#9A9490"/>
											<circle cx="9.5" cy="10.5" r="1.2" fill="#9A9490"/>
										</svg>
									</div>
								)}

								{/* ── Drop indicator line ── */}
								{dropIndicator && (
									<div
										contentEditable={false}
										style={{
											position: "absolute",
											top: dropIndicator.top - 1,
											left: dropIndicator.left,
											width: dropIndicator.width,
											height: 2,
											background: T.warm,
											borderRadius: 2,
											zIndex: 30,
											pointerEvents: "none",
											boxShadow: `0 0 0 3px ${T.warm}22`,
										}}
									/>
								)}

								{/* ── Icon selector popup ── */}
								{iconSelector && createPortal(
									<div
										ref={iconSelectorRef}
										style={{
											position: "fixed",
											left: Math.min(iconSelector.x, window.innerWidth - 310),
											top: Math.min(iconSelector.y, window.innerHeight - 390),
											zIndex: 200,
										}}
									>
										<IconSelectorDropdown
											onSelect={({ type, value, icon }) => {
												const target = iconSelector.target;
												if (!target) return;
												if (type === "emoji") {
													target.setAttribute("data-icon-type", "emoji");
													target.innerHTML = `<span style="font-size:28px;line-height:1">${value}</span>`;
												} else if (type === "lucide" && icon) {
													target.setAttribute("data-icon-type", "lucide");
													target.innerHTML = lucideToSvgString(icon, 26, "#37352F");
												}
											}}
											onClose={() => setIconSelector(null)}
										/>
									</div>,
									document.body
								)}

									{draftSlashDatePickerPos &&
										createPortal(
											<div
												data-draft-date-picker
												style={{
													position: "fixed",
													left: draftSlashDatePickerPos.left,
													top: draftSlashDatePickerPos.top,
													zIndex: 120,
												}}
											>
												<TiptapSlashDatePicker
											key={datePickerInitial.toISOString()}
											initialDate={datePickerInitial}
													onSelect={insertDraftDateAtCursor}
											onClose={() => {
												dateEditTargetRef.current = null;
												setDraftSlashDatePickerPos(null);
											}}
												/>
											</div>,
											document.body,
										)}
									{draftImageModalOpen &&
										createPortal(
											<div
												role="presentation"
												style={{
													position: "fixed",
													inset: 0,
													zIndex: 130,
													background: "rgba(55, 53, 47, 0.35)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													padding: 16,
												}}
												onMouseDown={(e) => {
													if (e.target === e.currentTarget) {
														setDraftImageModalOpen(false);
														setDraftImageModalUrl("");
													}
												}}
											>
												<div
													role="dialog"
													aria-modal="true"
													aria-label="Insert image or video"
													onMouseDown={(e) => e.stopPropagation()}
													style={{
														background: T.surface,
														borderRadius: 12,
														padding: 20,
														minWidth: 300,
														maxWidth: 420,
														width: "100%",
														boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
														border: `1px solid ${T.border}`,
													}}
												>
													<p
														style={{
															fontSize: 16,
															fontWeight: 600,
															color: T.accent,
															marginBottom: 12,
														}}
													>
														Insert image or video
													</p>
													<p
														style={{
															fontSize: 13,
															color: T.muted,
															marginBottom: 14,
															lineHeight: 1.5,
														}}
													>
														Upload a file from your computer, or paste an
														https image or video URL.
													</p>
													<button
														type="button"
														onClick={() => imageFileInputRef.current?.click()}
														disabled={imageUploading}
														style={{
															width: "100%",
															padding: "10px 14px",
															borderRadius: 8,
															border: `1px solid ${T.border}`,
															background: "#F7F5F0",
															fontWeight: 600,
															fontSize: 14,
															color: T.accent,
															cursor: imageUploading ? "wait" : "pointer",
															marginBottom: 14,
														}}
													>
														{imageUploading
															? "Uploading…"
															: "Choose file from computer"}
													</button>
													<label
														style={{
															display: "block",
															fontSize: 12,
															fontWeight: 600,
															color: T.muted,
															marginBottom: 6,
														}}
													>
														Image or video URL
													</label>
													<input
														type="url"
														value={draftImageModalUrl}
														onChange={(e) => setDraftImageModalUrl(e.target.value)}
														placeholder="https://…"
														style={{
															width: "100%",
															padding: "10px 12px",
															borderRadius: 8,
															border: `1px solid ${T.border}`,
															fontSize: 14,
															marginBottom: 12,
															boxSizing: "border-box",
														}}
														onKeyDown={(e) => {
															if (e.key === "Enter") {
																e.preventDefault();
																confirmDraftImageFromUrl();
															}
														}}
													/>
													<div
														style={{
															display: "flex",
															justifyContent: "flex-end",
															gap: 8,
															marginTop: 8,
														}}
													>
														<button
															type="button"
															onClick={() => {
																setDraftImageModalOpen(false);
																setDraftImageModalUrl("");
															}}
															style={{
																padding: "8px 14px",
																borderRadius: 8,
																border: "none",
																background: "transparent",
																color: T.muted,
																fontWeight: 500,
																cursor: "pointer",
															}}
														>
															Cancel
														</button>
														<button
															type="button"
															onClick={confirmDraftImageFromUrl}
															style={{
																padding: "8px 16px",
																borderRadius: 8,
																border: "none",
																background: "#C17B2F",
																color: "#fff",
																fontWeight: 600,
																cursor: "pointer",
															}}
														>
															Insert from URL
														</button>
													</div>
												</div>
											</div>,
											document.body,
										)}
							{/* ── Audio upload modal ── */}
							{audioModalOpen && createPortal(
								<div
									role="presentation"
									style={{ position: "fixed", inset: 0, zIndex: 130, background: "rgba(55,53,47,0.40)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
									onMouseDown={(e) => { if (e.target === e.currentTarget) setAudioModalOpen(false); }}
								>
									<div
										role="dialog"
										aria-modal="true"
										aria-label="Insert audio"
										onMouseDown={(e) => e.stopPropagation()}
										style={{ background: T.surface, borderRadius: 14, padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 16px 48px rgba(0,0,0,0.18)", border: `1px solid ${T.border}` }}
									>
										{/* Header */}
										<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
											<div style={{ width: 36, height: 36, borderRadius: 9, background: "#FEF3E2", border: "1px solid #F6D9A8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
												<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C17B2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
											</div>
											<div>
												<p style={{ fontSize: 15, fontWeight: 700, color: T.accent, lineHeight: 1.2 }}>Insert Audio</p>
												<p style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>MP3, WAV, OGG, M4A supported</p>
											</div>
										</div>

										{/* Upload button */}
										<button
											type="button"
											onClick={() => audioFileInputRef.current?.click()}
											disabled={audioUploading}
											style={{ width: "100%", padding: "12px 14px", borderRadius: 9, border: `1.5px dashed ${T.border}`, background: "#F7F5F0", fontWeight: 600, fontSize: 14, color: T.accent, cursor: audioUploading ? "wait" : "pointer", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
										>
											{audioUploading ? (
												<>
													<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
													Uploading…
												</>
											) : (
												<>
													<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
													Choose audio file from computer
												</>
											)}
										</button>
										<p style={{ fontSize: 11, color: T.muted, textAlign: "center", marginBottom: 16 }}>
											File will be uploaded and an audio player inserted into your draft.
										</p>

										<div style={{ display: "flex", justifyContent: "flex-end" }}>
											<button
												type="button"
												onClick={() => setAudioModalOpen(false)}
												style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "transparent", color: T.muted, fontWeight: 500, cursor: "pointer", fontSize: 13 }}
											>
												Cancel
											</button>
										</div>
									</div>
								</div>,
								document.body
							)}

					{/* ── Recording modal ── */}
						{recordingOpen && createPortal(
							<div
								role="presentation"
								style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(30,28,26,0.55)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
							>
								<style>{`
									@keyframes recBar { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
									@keyframes recPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
									@keyframes recSpin { to{transform:rotate(360deg)} }
								`}</style>
								<motion.div
									initial={{ opacity: 0, scale: 0.92, y: 16 }}
									animate={{ opacity: 1, scale: 1, y: 0 }}
									exit={{ opacity: 0, scale: 0.92, y: 16 }}
									transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
									style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: "28px 28px 22px", width: "100%", maxWidth: 460, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", gap: 0 }}
								>
									{/* Mode toggle */}
									<div style={{ display: "flex", gap: 0, background: T.bg, borderRadius: 10, padding: 3, marginBottom: 22, alignSelf: "center", border: `1px solid ${T.border}` }}>
										{[{ id: "audio", label: "Audio Player", icon: "♪" }, { id: "text", label: "Transcript to Text", icon: "T" }].map((m) => (
											<button
												key={m.id}
												type="button"
												onClick={() => { if (recordingState !== "uploading") setRecordingMode(m.id); }}
												style={{ padding: "6px 16px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 12, cursor: recordingState === "uploading" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s", background: recordingMode === m.id ? T.surface : "transparent", color: recordingMode === m.id ? T.accent : T.muted, boxShadow: recordingMode === m.id ? `0 1px 4px rgba(0,0,0,0.1)` : "none" }}
											>
												<span style={{ fontSize: 11 }}>{m.icon}</span>{m.label}
											</button>
										))}
									</div>

									{/* Animated waveform bars */}
									<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, height: 52, marginBottom: 16 }}>
										{[0.4,0.7,1,0.8,0.6,0.9,1,0.7,0.5,0.8,0.6,1,0.4,0.75,0.9,0.55,0.85].map((h, i) => (
											<div
												key={i}
												style={{
													width: recordingState === "recording" ? 4 : 3,
													borderRadius: 3,
													background: recordingState === "uploading" ? T.border : recordingState === "recording" ? (recordingMode === "text" ? "#6366F1" : T.warm) : T.border,
													height: `${Math.round(h * 42)}px`,
													transformOrigin: "center",
													animation: recordingState === "recording"
														? `recBar ${0.55 + (i % 5) * 0.12}s ${(i * 0.06).toFixed(2)}s ease-in-out infinite alternate`
														: "none",
													opacity: recordingState === "uploading" ? 0.35 : 1,
													transition: "background 0.3s, opacity 0.3s",
												}}
											/>
										))}
									</div>

									{/* Status row: dot + label + timer */}
									<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
										{recordingState === "recording" && (
											<div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", flexShrink: 0, animation: "recPulse 1.2s ease-in-out infinite" }} />
										)}
										{recordingState === "uploading" && (
											<div style={{ width: 13, height: 13, border: `2px solid ${T.warm}`, borderTopColor: "transparent", borderRadius: "50%", flexShrink: 0, animation: "recSpin 0.7s linear infinite" }} />
										)}
										<span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>
											{recordingState === "idle" || recordingState === "requesting"
												? "Starting microphone…"
												: recordingState === "recording"
													? `Recording${recordingMode === "text" ? " & Transcribing" : ""}`
													: recordingMode === "text" ? "Inserting text…" : "Uploading audio…"}
										</span>
										{recordingState === "recording" && (
											<span style={{ fontSize: 13, fontWeight: 700, color: recordingMode === "text" ? "#6366F1" : T.warm, fontVariantNumeric: "tabular-nums", marginLeft: 4 }}>
												{String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}
											</span>
										)}
									</div>

									{/* Caption */}
									<p style={{ fontSize: 11, color: T.muted, textAlign: "center", lineHeight: 1.6, marginBottom: recordingMode === "text" ? 14 : 22 }}>
										{recordingState === "recording"
											? recordingMode === "text"
												? "Speak clearly — your words are being transcribed live below."
												: "Speak clearly into your microphone. Click Done when finished."
											: recordingState === "uploading"
												? recordingMode === "text" ? "Inserting your transcript into the editor…" : "Processing and uploading your recording…"
												: "Requesting microphone access…"}
									</p>

									{/* Live transcript textarea — text mode only */}
									{recordingMode === "text" && (
										<div style={{ width: "100%", marginBottom: 20 }}>
											<div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
												<span style={{ width: 6, height: 6, borderRadius: "50%", background: recordingState === "recording" ? "#6366F1" : T.border, display: "inline-block", animation: recordingState === "recording" ? "recPulse 1.5s ease-in-out infinite" : "none" }} />
												Live transcript
											</div>
											<textarea
												readOnly
												value={(transcriptFinal + transcriptInterim)}
												placeholder="Your speech will appear here as you speak…"
												style={{ width: "100%", minHeight: 110, maxHeight: 200, resize: "vertical", borderRadius: 10, border: `1px solid ${T.border}`, background: T.bg, color: T.accent, fontSize: 13, lineHeight: 1.65, padding: "10px 12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", overflowY: "auto" }}
											/>
											<p style={{ fontSize: 10, color: T.muted, marginTop: 5 }}>
												You can edit the transcript above after clicking Done — it will be inserted as editable text in the editor.
											</p>
										</div>
									)}

									{/* Action buttons */}
									<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
										<button
											type="button"
											onClick={handleRecordingCancel}
											disabled={recordingState === "uploading"}
											style={{ padding: "8px 18px", borderRadius: 9, border: `1px solid ${T.border}`, background: "transparent", color: T.muted, fontWeight: 500, fontSize: 13, cursor: recordingState === "uploading" ? "wait" : "pointer" }}
										>
											Cancel
										</button>
										<button
											type="button"
											onClick={handleRecordingDone}
											disabled={recordingState !== "recording"}
											style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: recordingState === "recording" ? (recordingMode === "text" ? "#6366F1" : T.warm) : T.border, color: recordingState === "recording" ? "white" : T.muted, fontWeight: 700, fontSize: 13, cursor: recordingState === "recording" ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }}
										>
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
											{recordingMode === "text" ? "Insert Text" : "Done"}
										</button>
									</div>
								</motion.div>
							</div>,
							document.body
						)}

						{/* ── Embed modal ── */}
					{embedModalOpen && createPortal(
						<div
							role="dialog"
							aria-modal="true"
							style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(28,26,24,0.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
							onClick={(e) => { if (e.target === e.currentTarget) { setEmbedModalOpen(false); setEmbedResolved(null); setEmbedUrlInput(""); } }}
						>
							<motion.div
								initial={{ opacity: 0, scale: 0.93, y: 18 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.93, y: 18 }}
								transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
								style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: "24px 24px 20px", width: "100%", maxWidth: 560, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", gap: 0 }}
							>
								{(() => {
									const doInsert = () => {
										const html = makeEmbedHtml(embedResolved);
										if (!html || !editorRef.current) return;
										editorRef.current.focus();
										// Restore saved cursor position so content lands in the right spot
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
										? (embedResolved.color === "#000000" || embedResolved.color === "#010101" ? "#1A1A1A" : embedResolved.color)
										: T.border;
									return (
										<>
											{/* Header */}
											<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
												<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
													<div style={{ width: 34, height: 34, borderRadius: 9, background: embedResolved ? eColor + "18" : "#F0ECE5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, transition: "background 0.2s", flexShrink: 0 }}>
														{(embedResolved && EMBED_ICONS[embedResolved.platform]) || "🔗"}
													</div>
													<div>
														<p style={{ fontSize: 14, fontWeight: 700, color: T.accent, lineHeight: 1.2 }}>
															{embedResolved ? `${embedResolved.label} Embed` : "Embed Content"}
														</p>
														<p style={{ fontSize: 11, color: T.muted }}>YouTube · X · Instagram · Reddit · TikTok · Spotify · Vimeo · Loom · Figma</p>
													</div>
												</div>
												<button type="button" onClick={() => { setEmbedModalOpen(false); setEmbedResolved(null); setEmbedUrlInput(""); }} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${T.border}`, background: "transparent", color: T.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>✕</button>
											</div>

											{/* URL input */}
											<p style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Paste a link</p>
											<input
												autoFocus
												value={embedUrlInput}
												onChange={(e) => {
													const val = e.target.value;
													setEmbedUrlInput(val);
													setEmbedResolved(val.trim() ? resolveEmbed(val.trim()) : null);
												}}
												onKeyDown={(e) => { if (e.key === "Enter" && embedResolved) doInsert(); }}
												placeholder="https://youtube.com/watch?v=... or any social link"
												style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${embedResolved ? eColor : T.border}`, background: T.bg, color: T.accent, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 14, transition: "border-color 0.2s" }}
											/>

											{/* Platform chips — shown when no URL yet */}
											{!embedResolved && (
												<div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
													{[
														{ label: "YouTube", color: "#FF0000" }, { label: "X / Twitter", color: "#000" },
														{ label: "Instagram", color: "#E1306C" }, { label: "Reddit", color: "#FF4500" },
														{ label: "TikTok", color: "#010101" }, { label: "Spotify", color: "#1DB954" },
														{ label: "Vimeo", color: "#1AB7EA" }, { label: "Loom", color: "#625DF5" },
														{ label: "Figma", color: "#F24E1E" }, { label: "CodeSandbox", color: "#333" },
													].map((p) => (
														<span key={p.label} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 100, background: p.color + "12", color: ["#000", "#010101"].includes(p.color) ? "#333" : p.color, border: `1px solid ${p.color}20` }}>{p.label}</span>
													))}
												</div>
											)}

											{/* Preview */}
											{embedResolved && (
												<div style={{ marginBottom: 18 }}>
													<p style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Preview</p>
													{embedResolved.cardEmbed ? (
														/* Non-iframeable: show exact card that will be inserted */
														<div style={{ border: `1.5px solid #E8E4DC`, borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "#FAFAF8" }}>
															<span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{EMBED_ICONS[embedResolved.platform] || "🔗"}</span>
															<div style={{ flex: 1, minWidth: 0 }}>
																<p style={{ fontSize: 13, fontWeight: 700, color: "#37352F", margin: "0 0 2px" }}>{embedResolved.label}</p>
																<p style={{ fontSize: 11, color: "#C17B2F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{embedUrlInput.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}</p>
															</div>
															<span style={{ fontSize: 11, color: "#9A9490", whiteSpace: "nowrap", padding: "5px 10px", border: "1px solid #E8E4DC", borderRadius: 6, background: "#fff" }}>Open ↗</span>
														</div>
													) : (
														<div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}`, background: "#F7F5F0", position: "relative" }}>
															<iframe
																key={embedResolved.iframeSrc}
																src={embedResolved.iframeSrc}
																style={{ width: "100%", aspectRatio: embedResolved.aspectRatio?.includes("px") ? undefined : (embedResolved.aspectRatio || "16/9"), height: embedResolved.aspectRatio?.includes("px") ? embedResolved.aspectRatio : undefined, minHeight: embedResolved.aspectRatio?.includes("px") ? undefined : 200, border: "none", display: "block" }}
																loading="lazy"
																allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
																allowFullScreen
															/>
														</div>
													)}
													<p style={{ fontSize: 10, color: T.muted, marginTop: 5 }}>
														<span style={{ color: eColor, fontWeight: 700 }}>{embedResolved.label}</span>
														{embedResolved.cardEmbed ? " · inserted as a link card" : " · live embed"}
													</p>
												</div>
											)}

											{/* Actions */}
											<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
												<button type="button" onClick={() => { setEmbedModalOpen(false); setEmbedResolved(null); setEmbedUrlInput(""); }} style={{ padding: "8px 18px", borderRadius: 9, border: `1px solid ${T.border}`, background: "transparent", color: T.muted, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>Cancel</button>
											<button
													type="button"
													disabled={!embedResolved}
													onClick={doInsert}
													style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: embedResolved ? btnBg : T.border, color: embedResolved ? "white" : T.muted, fontWeight: 700, fontSize: 13, cursor: embedResolved ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }}
												>
													<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
													Add to Editor
												</button>
											</div>
										</>
									);
								})()}
							</motion.div>
						</div>,
						document.body
					)}

									{/* Text selection dropdown (Notion-style) */}
									<AnimatePresence>
										{selectionDropdown && (
											<motion.div
												data-selection-dropdown
												initial={{ opacity: 0, y: 4, scale: 0.96 }}
												animate={{ opacity: 1, y: 0, scale: 1 }}
												exit={{ opacity: 0, y: 4, scale: 0.96 }}
												style={{
													position: "fixed",
													left: selectionDropdown.x,
													top: selectionDropdown.top,
													zIndex: 100,
													background: T.surface,
													border: `1px solid ${T.border}`,
													borderRadius: 10,
													boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
													padding: 8,
													display: "flex",
													flexDirection: "column",
													alignItems: "stretch",
													gap: 0,
													maxWidth: 700,
													minWidth: selectionSubtool ? 280 : 200,
												}}
											>
												<div
													style={{
														display: "flex",
														flexWrap: "wrap",
														alignItems: "center",
														gap: 4,
													}}
												>
												<motion.button
													whileHover={{ background: "#F0ECE5" }}
													whileTap={{ scale: 0.96 }}
													onClick={() => {
														setSelectionContext(selectionDropdown.text);
														setChatOpen(true);
														setSelectionDropdown(null);
													}}
													style={{
														display: "flex",
														alignItems: "center",
														gap: 5,
														padding: "6px 10px",
														border: "none",
														borderRadius: 6,
														background: "#C17B2F15",
														fontSize: 12,
														fontWeight: 700,
														color: "#92400E",
														cursor: "pointer",
													}}
												>
													<Icon
														d="M12 3l1.8 5.4L19.2 9l-5.4 1.8L12 16.2l-1.8-5.4L4.8 9l5.4-1.8L12 3z"
														size={12}
														stroke="#C17B2F"
													/>
													Add to AI chat
												</motion.button>
												<motion.button
													whileHover={{ background: "#F0ECE5" }}
													whileTap={{ scale: 0.96 }}
													onMouseDown={(e) => e.preventDefault()}
													onClick={() => {
														document.execCommand("bold");
														setSelectionDropdown(null);
													}}
													className="inline-flex items-center justify-center w-6 h-6 p-0 border-none rounded bg-none text-sm font-medium text-zinc-600 cursor-pointer"
												>
													B
												</motion.button>
												<motion.button
													whileHover={{ background: "#F0ECE5" }}
													whileTap={{ scale: 0.96 }}
													onMouseDown={(e) => e.preventDefault()}
													onClick={() => {
														document.execCommand("italic");
														setSelectionDropdown(null);
													}}
													className="inline-flex items-center justify-center w-6 h-6 p-0 border-none rounded bg-none text-sm font-medium text-zinc-600 cursor-pointer"
												>
													I
												</motion.button>
												<div
													className="w-px h-4 bg-zinc-200"
												/>
												{[
													{ cmd: "p", label: "Text" },
													{ cmd: "h1", label: "H1" },
													{ cmd: "h2", label: "H2" },
													{ cmd: "ul", label: "• List" },
												].map(({ cmd, label }) => (
													<motion.button
														key={cmd}
														whileHover={{ background: "#F0ECE5" }}
														whileTap={{ scale: 0.96 }}
														onMouseDown={(e) => e.preventDefault()}
														onClick={() => {
															if (cmd === "ul")
																document.execCommand("insertUnorderedList");
															else if (cmd === "ol")
																document.execCommand("insertOrderedList");
															else
																document.execCommand("formatBlock", false, cmd);
															setSelectionDropdown(null);
															countWords();
														}}
														style={{
															display: "flex",
															alignItems: "center",
															padding: "6px 8px",
															border: "none",
															borderRadius: 6,
															background: "none",
															fontSize: 12,
															fontWeight: 600,
															color: T.accent,
															cursor: "pointer",
														}}
													>
														{label}
													</motion.button>
												))}
												<div
													style={{
														width: 1,
														height: 20,
														background: T.border,
														margin: "0 2px",
													}}
												/>
												<motion.button
													whileHover={{ background: "#F0ECE5" }}
													whileTap={{ scale: 0.96 }}
													title="Add link"
													onMouseDown={(e) => e.preventDefault()}
													onClick={() => {
														setSelectionSubtool((s) => {
															if (s === "link") {
																setSelectionLinkUrl("");
																return null;
															}
															const { href: h } = getSelectionLinkContext(
																window.getSelection(),
															);
															setSelectionLinkUrl(h);
															return "link";
														});
													}}
													className={`inline-flex items-center justify-center w-6 h-6 p-0 border-none rounded bg-none text-sm font-medium text-accent cursor-pointer ${selectionSubtool === "link" ? "bg-zinc-100" : "bg-none"}`}
												>
													<Icon
														d={Icons.link2}
														size={14}
														stroke={T.accent}
													/>
												</motion.button>
												<motion.button
													whileHover={{ background: "#F0ECE5" }}
													whileTap={{ scale: 0.96 }}
													title="Text color (Tailwind palette)"
													onMouseDown={(e) => e.preventDefault()}
													onClick={() =>
														setSelectionSubtool((s) =>
															s === "textColor" ? null : "textColor",
														)
													}
													className={`inline-flex items-center justify-center w-6 h-6 p-0 border-none rounded bg-none text-sm font-medium text-zinc-500 cursor-pointer ${selectionSubtool === "textColor" ? "bg-zinc-100" : "bg-none"}`}
												>
													A
												</motion.button>
												<motion.button
													whileHover={{ background: "#F0ECE5" }}
													whileTap={{ scale: 0.96 }}
													title="Highlight / background color"
													onMouseDown={(e) => e.preventDefault()}
													onClick={() =>
														setSelectionSubtool((s) =>
															s === "bgColor" ? null : "bgColor",
														)
													}
													className={`inline-flex items-center justify-center w-6 h-6 p-0 border-none rounded bg-none text-sm font-medium text-zinc-500 cursor-pointer ${selectionSubtool === "bgColor" ? "bg-zinc-100" : "bg-none"}`}
												>
													ab
												</motion.button>
												</div>

												<AnimatePresence initial={false}>
													{selectionSubtool === "link" && (
														<motion.div
															key="selection-link-panel"
															data-selection-dropdown
															initial={{ opacity: 0, y: -8 }}
															animate={{ opacity: 1, y: 0 }}
															exit={{ opacity: 0, y: -8 }}
															transition={{
																duration: 0.18,
																ease: [0.16, 1, 0.3, 1],
															}}
															style={{
																marginTop: 8,
																paddingTop: 10,
																borderTop: `1px solid ${T.border}`,
																display: "flex",
																flexDirection: "column",
																gap: 8,
																overflow: "hidden",
															}}
														>
															<p
																style={{
																	fontSize: 11,
																	fontWeight: 700,
																	color: "#B0AAA3",
																	textTransform: "uppercase",
																	letterSpacing: "0.06em",
																	margin: 0,
																}}
															>
																Link URL
															</p>
															<input
																ref={selectionLinkInputRef}
																type="text"
																value={selectionLinkUrl}
																onChange={(e) =>
																	setSelectionLinkUrl(e.target.value)
																}
																onKeyDown={(e) => {
																	if (e.key === "Enter") {
																		e.preventDefault();
																		let url = selectionLinkUrl.trim();
																		if (!url) return;
																		if (
																			!/^https?:\/\//i.test(url) &&
																			!url.startsWith("mailto:")
																		) {
																			url = `https://${url}`;
																		}
																		if (!restoreEditorSelection()) return;
																		document.execCommand(
																			"createLink",
																			false,
																			url,
																		);
																		countWords();
																		setSelectionDropdown(null);
																		setSelectionSubtool(null);
																		setSelectionLinkUrl("");
																	}
																}}
																placeholder="https:// or mailto:…"
																style={{
																	width: "100%",
																	padding: "8px 10px",
																	borderRadius: 8,
																	border: `1px solid ${T.border}`,
																	fontSize: 13,
																	background: T.base,
																	color: T.accent,
																}}
																className="outline-none"
															/>
															<div
																style={{
																	display: "flex",
																	justifyContent: "flex-end",
																	gap: 8,
																}}
															>
																<button
																	type="button"
																	onMouseDown={(e) => e.preventDefault()}
																	onClick={() => {
																		setSelectionSubtool(null);
																		setSelectionLinkUrl("");
																	}}
																	style={{
																		padding: "6px 12px",
																		borderRadius: 8,
																		border: `1px solid ${T.border}`,
																		background: T.base,
																		fontSize: 12,
																		fontWeight: 600,
																		color: T.muted,
																		cursor: "pointer",
																	}}
																>
																	Cancel
																</button>
																<button
																	type="button"
																	onMouseDown={(e) => e.preventDefault()}
																	onClick={() => {
																		let url = selectionLinkUrl.trim();
																		if (!url) return;
																		if (
																			!/^https?:\/\//i.test(url) &&
																			!url.startsWith("mailto:")
																		) {
																			url = `https://${url}`;
																		}
																		if (!restoreEditorSelection()) return;
																		document.execCommand(
																			"createLink",
																			false,
																			url,
																		);
																		countWords();
																		setSelectionDropdown(null);
																		setSelectionSubtool(null);
																		setSelectionLinkUrl("");
																	}}
																	style={{
																		padding: "6px 14px",
																		borderRadius: 8,
																		border: "none",
																		background: T.accent,
																		fontSize: 12,
																		fontWeight: 700,
																		color: "white",
																		cursor: "pointer",
																	}}
																>
																	Apply link
																</button>
															</div>
														</motion.div>
													)}
												</AnimatePresence>

												{selectionSubtool === "textColor" && (
													<div
														data-selection-dropdown
														style={{
															marginTop: 8,
															paddingTop: 10,
															borderTop: `1px solid ${T.border}`,
														}}
													>
														<p
															style={{
																fontSize: 11,
																fontWeight: 700,
																color: "#B0AAA3",
																textTransform: "uppercase",
																letterSpacing: "0.06em",
																marginBottom: 8,
															}}
														>
															Text color
														</p>
														<div
															style={{
																display: "grid",
																gridTemplateColumns:
																	"repeat(12, 1fr)",
																gap: 4,
															}}
														>
															{SELECTION_TEXT_COLORS.map(({ label, hex }) => (
																<button
																	key={label}
																	type="button"
																	title={label}
																	onMouseDown={(e) => e.preventDefault()}
																	onClick={() => {
																		if (!restoreEditorSelection()) return;
																		const patch = {
																			color: hex || null,
																		};
																		const ok = applyDraftBubbleInlineStyle(
																			editorRef.current,
																			patch,
																		);
																		if (!ok) {
																			if (!hex)
																				execDraftForeColor("#37352F");
																			else execDraftForeColor(hex);
																		}
																		countWords();
																		setSelectionDropdown(null);
																		setSelectionSubtool(null);
																	}}
																	style={{
																		width: "100%",
																		aspectRatio: "1",
																		borderRadius: 6,
																		border: `1px solid ${T.border}`,
																		background: hex || "#FFFFFF",
																		cursor: "pointer",
																		boxSizing: "border-box",
																		display: "flex",
																		alignItems: "center",
																		justifyContent: "center",
																		fontSize: 8,
																		fontWeight: 700,
																		color: hex ? "#fff" : T.muted,
																		textDecoration: !hex
																			? "line-through"
																			: "none",
																	}}
																>
																	{!hex ? "×" : ""}
																</button>
															))}
														</div>
													</div>
												)}

												{selectionSubtool === "bgColor" && (
													<div
														data-selection-dropdown
														style={{
															marginTop: 8,
															paddingTop: 10,
															borderTop: `1px solid ${T.border}`,
														}}
													>
														<p
															style={{
																fontSize: 11,
																fontWeight: 700,
																color: "#B0AAA3",
																textTransform: "uppercase",
																letterSpacing: "0.06em",
																marginBottom: 8,
															}}
														>
															Background
														</p>
														<div
															style={{
																display: "grid",
																gridTemplateColumns:
																	"repeat(12, 1fr)",
																gap: 4,
															}}
														>
															{SELECTION_BG_COLORS.map(({ label, hex }) => (
																<button
																	key={label}
																	type="button"
																	title={label}
																	onMouseDown={(e) => e.preventDefault()}
																	onClick={() => {
																		if (!restoreEditorSelection()) return;
																		const clearBg = "#F7F5F0";
																		const patch =
																			hex === "clear"
																				? { backgroundColor: null }
																				: { backgroundColor: hex };
																		const ok = applyDraftBubbleInlineStyle(
																			editorRef.current,
																			patch,
																		);
																		if (!ok) {
																			if (hex === "clear")
																				execDraftHiliteColor(clearBg);
																			else execDraftHiliteColor(hex);
																		}
																		countWords();
																		setSelectionDropdown(null);
																		setSelectionSubtool(null);
																	}}
																	style={{
																		width: "100%",
																		aspectRatio: "1",
																		borderRadius: 6,
																		border: `1px solid ${T.border}`,
																		background:
																			hex === "clear" ? T.base : hex,
																		cursor: "pointer",
																		boxSizing: "border-box",
																		display: "flex",
																		alignItems: "center",
																		justifyContent: "center",
																		fontSize: 7,
																		fontWeight: 700,
																		color: T.muted,
																	}}
																>
																	{hex === "clear" ? "∅" : ""}
																</button>
															))}
														</div>
													</div>
												)}
											</motion.div>
										)}
									</AnimatePresence>
								</div>
							</div>

						</motion.div>
					)}
					
				</div>

				{/* ── RIGHT PANEL — AI Chat (inline, not overlay) ── */}
				<AIChatSidebar
					open={chatOpen}
					onClose={() => {
						setChatOpen(false);
						setSelectionContext("");
					}}
					onClearSelectionContext={() => setSelectionContext("")}
					editorRef={editorRef}
					draftContent={stripDraftSlashQueryFromHtmlString(
						editorRef.current?.innerHTML || draft?.body || "",
					)}
					draftTitle={draft?.title || "Draft"}
					userId={reduxUser?.uid || ""}
					onAgentDraftCreated={(newDraftId) =>
						router.push(`/app/${newDraftId}`)
					}
					selectionContext={selectionContext}
					asPanel
				/>
			</div>

			{typeof document !== "undefined" &&
				createPortal(
					<>
			{/* ── THEMES MODAL ── full-screen two-panel preview */}
			<AnimatePresence>
				{themeDrawerOpen &&
					(() => {
						const activeTheme = THEMES[previewTheme] || THEMES.ink;
						const currentHTML = stripDraftSlashQueryFromHtmlString(
							editorRef.current?.innerHTML || draft?.body || "",
						);
					const htmlForPreview = translatedHTML || currentHTML;
						const previewDocTitle =
							titleRef.current?.innerText?.trim() || draft?.title || "";
						const themedDoc =
							activeTheme && htmlForPreview.trim()
								? buildThemedHTML(htmlForPreview, activeTheme, previewDocTitle)
							: "";
						const isCopiedHtml =
							copiedTheme?.key === previewTheme &&
							copiedTheme?.format === "html";
						const isCopiedReact =
							copiedTheme?.key === previewTheme &&
							copiedTheme?.format === "react";
						const isCopiedMd =
							copiedTheme?.key === previewTheme &&
							copiedTheme?.format === "markdown";
						const isCopiedTxt =
							copiedTheme?.key === previewTheme &&
							copiedTheme?.format === "text";
						const isCopiedPublicUrl =
							copiedTheme?.key === previewTheme &&
							copiedTheme?.format === "publicUrl";
						const markdownExport = htmlForPreview.trim()
							? htmlToMarkdown(htmlForPreview) || ""
							: "";
						const plainTextExport = (() => {
							if (!htmlForPreview.trim()) return "";
							try {
								const d = document.createElement("div");
								d.innerHTML = htmlForPreview;
								return (d.innerText || "").trim();
							} catch {
								return "";
							}
						})();
						const slugBase = (draft?.title || "draft")
							.replace(/[^a-z0-9]/gi, "-")
							.toLowerCase();
						return (
							<>
								{/* Backdrop */}
								<motion.div
									key="theme-backdrop"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
								onClick={() => {
									setThemeDrawerOpen(false);
									setTranslatedHTML("");
									setTranslationLang("en");
								}}
									style={{
										position: "fixed",
										inset: 0,
										background: "rgba(0,0,0,0.5)",
										zIndex: 300,
										backdropFilter: "blur(4px)",
									}}
								/>

								{/* Centering shell — flexbox positions the modal, pointer-events:none lets backdrop work */}
								<motion.div
									key="theme-modal"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.22 }}
									style={{
										position: "fixed",
										inset: 0,
										zIndex: 301,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										pointerEvents: "none",
									}}
								>
									{/* Actual modal panel */}
									<motion.div
										initial={{ scale: 0.95, y: 24 }}
										animate={{ scale: 1, y: 0 }}
										exit={{ scale: 0.95, y: 24 }}
										transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
										style={{
											width: "92vw",
											maxWidth: 1280,
											height: "90vh",
											background: T.surface,
											borderRadius: 16,
											border: `1px solid ${T.border}`,
											display: "flex",
											flexDirection: "column",
											boxShadow: "0 32px 80px rgba(0,0,0,0.28)",
											overflow: "hidden",
											pointerEvents: "all",
										}}
									>
										{/* ─ Top bar ─ */}
										<div
											style={{
												height: 56,
												borderBottom: `1px solid ${T.border}`,
												display: "flex",
												alignItems: "center",
												padding: "0 20px",
												gap: 12,
												flexShrink: 0,
												background: T.surface,
											}}
										>
											<p
												style={{
													fontSize: 15,
													fontWeight: 700,
													color: T.accent,
													fontFamily: "",
												}}
											>
												Export themes
											</p>
											<p style={{ fontSize: 12, color: T.muted }}>
												Choose a theme; preview updates live. Export HTML, React, Markdown, text, or copy a public themed link when published.
											</p>
											<div style={{ flex: 1 }} />

										{/* Export dropdown */}
										<div
											ref={themeExportRef}
											style={{ position: "relative" }}
										>
											<motion.button
												type="button"
												whileHover={{ background: "#F0ECE5" }}
												whileTap={{ scale: 0.95 }}
												onClick={() => setThemeExportOpen((o) => !o)}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 6,
													background: T.base,
													border: `1px solid ${T.border}`,
													borderRadius: 9,
													padding: "8px 14px",
													fontSize: 13,
													fontWeight: 600,
													color: T.accent,
													cursor: "pointer",
												}}
											>
												<Icon d={Icons.copy} size={13} stroke={T.accent} />
												Export — {activeTheme?.name}
												<span
													style={{
														display: "inline-flex",
														transform: themeExportOpen
															? "rotate(180deg)"
															: "none",
														transition: "transform 0.18s ease",
													}}
												>
													<Icon
														d={Icons.chevronD}
														size={14}
														stroke={T.accent}
													/>
												</span>
											</motion.button>

											<AnimatePresence>
												{themeExportOpen && (
													<motion.div
														initial={{ opacity: 0, y: -6 }}
														animate={{ opacity: 1, y: 0 }}
														exit={{ opacity: 0, y: -6 }}
														transition={{
															duration: 0.14,
															ease: [0.16, 1, 0.3, 1],
														}}
														style={{
															position: "absolute",
															top: "100%",
															right: 0,
															marginTop: 6,
															minWidth: 260,
															background: T.surface,
															border: `1px solid ${T.border}`,
															borderRadius: 10,
															boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
															padding: 6,
															zIndex: 400,
														}}
													>
														{/* Download HTML */}
														<button
															type="button"
												onClick={() => {
													if (!themedDoc) return;
													const blob = new Blob([themedDoc], {
														type: "text/html;charset=utf-8",
													});
													const a = document.createElement("a");
													a.href = URL.createObjectURL(blob);
													a.download = `${slugBase}-${(activeTheme?.name || "theme").toLowerCase().replace(/\s+/g, "-")}.html`;
													a.click();
													URL.revokeObjectURL(a.href);
																setThemeExportOpen(false);
												}}
												style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: "transparent",
													fontSize: 13,
													fontWeight: 600,
																color: T.accent,
													cursor: "pointer",
																display: "flex",
																alignItems: "center",
																gap: 9,
												}}
											>
												<svg
													width={13}
													height={13}
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth={2}
													strokeLinecap="round"
													strokeLinejoin="round"
												>
													<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
													<polyline points="7 10 12 15 17 10" />
													<line x1="12" y1="15" x2="12" y2="3" />
												</svg>
												Download .html
														</button>

														{/* Copy HTML */}
														<button
															type="button"
															onClick={() => {
																handleCopyThemeHTML(previewTheme);
																setThemeExportOpen(false);
															}}
												style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: isCopiedHtml
																	? "rgba(45,106,79,0.1)"
																	: "transparent",
																fontSize: 13,
																fontWeight: 600,
																color: isCopiedHtml ? "#2D6A4F" : T.accent,
																cursor: "pointer",
													display: "flex",
													alignItems: "center",
																gap: 9,
															}}
														>
															<Icon
																d={Icons.copy}
																size={13}
																stroke={
																	isCopiedHtml ? "#2D6A4F" : T.accent
																}
															/>
															{isCopiedHtml
																? "HTML copied!"
																: `Copy HTML — ${activeTheme?.name}`}
														</button>

														{/* Copy public themed URL */}
														<button
															type="button"
															disabled={!isPublic}
															title={
																isPublic
																	? "Full URL viewers can open to see this post with the selected export theme"
																	: "Publish first to enable a shareable live URL"
															}
															onClick={() => {
																if (!isPublic) return;
																const u = getPublicUrl(
																	draft?.slug ||
																		toSlug(slugInput) ||
																		undefined,
																	previewTheme,
																);
																navigator.clipboard.writeText(u).catch(() => {});
																setCopiedTheme({
																	key: previewTheme,
																	format: "publicUrl",
																});
																setThemeExportOpen(false);
																setTimeout(() => setCopiedTheme(null), 2200);
															}}
															style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: isCopiedPublicUrl
																	? "rgba(45,106,79,0.1)"
																	: "transparent",
																fontSize: 13,
																fontWeight: 600,
																color: isCopiedPublicUrl
																	? "#2D6A4F"
																	: isPublic
																		? T.accent
																		: T.muted,
																cursor: isPublic ? "pointer" : "not-allowed",
																opacity: isPublic ? 1 : 0.5,
																display: "flex",
																alignItems: "center",
																gap: 9,
															}}
														>
															<svg
																width={13}
																height={13}
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth={2}
																strokeLinecap="round"
															>
																<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
																<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
															</svg>
															{isCopiedPublicUrl
																? "Link copied!"
																: "Copy public URL (this theme)"}
														</button>

														{/* Copy React */}
														<button
															type="button"
															title="Copies a React component (iframe embed) you can paste into a Next.js or Vite app"
															onClick={() => {
																handleCopyThemeReact(previewTheme);
																setThemeExportOpen(false);
															}}
															style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
													border: "none",
																borderRadius: 8,
																background: isCopiedReact
																	? "rgba(30,58,95,0.1)"
																	: "transparent",
													fontSize: 13,
													fontWeight: 600,
																color: isCopiedReact
																	? "#1E3A5F"
																	: T.accent,
													cursor: "pointer",
																display: "flex",
																alignItems: "center",
																gap: 9,
												}}
											>
														<svg
															width={13}
															height={13}
															viewBox="0 0 24 24"
															fill="none"
																stroke="currentColor"
															strokeWidth={2}
															strokeLinecap="round"
															strokeLinejoin="round"
														>
																<polyline points="16 18 22 12 16 6" />
																<polyline points="8 6 2 12 8 18" />
														</svg>
															{isCopiedReact
																? "React copied!"
																: `Copy React — ${activeTheme?.name}`}
														</button>

														{/* Download Markdown */}
														<button
															type="button"
															onClick={() => {
																if (!markdownExport.trim()) return;
																const blob = new Blob([markdownExport], {
																	type: "text/markdown;charset=utf-8",
																});
																const a = document.createElement("a");
																a.href = URL.createObjectURL(blob);
																a.download = `${slugBase}.md`;
																a.click();
																URL.revokeObjectURL(a.href);
																setThemeExportOpen(false);
															}}
												style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: "transparent",
																fontSize: 13,
																fontWeight: 600,
																color: T.accent,
																cursor: markdownExport.trim() ? "pointer" : "not-allowed",
																opacity: markdownExport.trim() ? 1 : 0.45,
													display: "flex",
													alignItems: "center",
																gap: 9,
															}}
														>
															<Icon d={Icons.fileText} size={13} stroke={T.accent} />
															Download .md
														</button>

														{/* Download plain text */}
														<button
															type="button"
															onClick={() => {
																if (!plainTextExport.trim()) return;
																const blob = new Blob([plainTextExport], {
																	type: "text/plain;charset=utf-8",
																});
																const a = document.createElement("a");
																a.href = URL.createObjectURL(blob);
																a.download = `${slugBase}.txt`;
																a.click();
																URL.revokeObjectURL(a.href);
																setThemeExportOpen(false);
															}}
															style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: "transparent",
													fontSize: 13,
													fontWeight: 600,
																color: T.accent,
																cursor: plainTextExport.trim() ? "pointer" : "not-allowed",
																opacity: plainTextExport.trim() ? 1 : 0.45,
																display: "flex",
																alignItems: "center",
																gap: 9,
															}}
														>
															<Icon d={Icons.fileText} size={13} stroke={T.accent} />
															Download .txt
														</button>

														{/* Copy Markdown */}
														<button
															type="button"
															onClick={() => {
																if (!markdownExport.trim()) return;
																navigator.clipboard.writeText(markdownExport).catch(() => {});
																setCopiedTheme({ key: previewTheme, format: "markdown" });
																setThemeExportOpen(false);
																setTimeout(() => setCopiedTheme(null), 2200);
															}}
															style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: isCopiedMd
																	? "rgba(45,106,79,0.1)"
																	: "transparent",
																fontSize: 13,
																fontWeight: 600,
																color: isCopiedMd ? "#2D6A4F" : T.accent,
																cursor: markdownExport.trim() ? "pointer" : "not-allowed",
																opacity: markdownExport.trim() ? 1 : 0.45,
																display: "flex",
																alignItems: "center",
																gap: 9,
															}}
														>
															<Icon
																d={Icons.copy}
																size={13}
																stroke={isCopiedMd ? "#2D6A4F" : T.accent}
															/>
															{isCopiedMd ? "Markdown copied!" : "Copy Markdown"}
														</button>

														{/* Copy plain text */}
														<button
															type="button"
															onClick={() => {
																if (!plainTextExport.trim()) return;
																navigator.clipboard.writeText(plainTextExport).catch(() => {});
																setCopiedTheme({ key: previewTheme, format: "text" });
																setThemeExportOpen(false);
																setTimeout(() => setCopiedTheme(null), 2200);
															}}
															style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: isCopiedTxt
																	? "rgba(45,106,79,0.1)"
																	: "transparent",
																fontSize: 13,
																fontWeight: 600,
																color: isCopiedTxt ? "#2D6A4F" : T.accent,
																cursor: plainTextExport.trim() ? "pointer" : "not-allowed",
																opacity: plainTextExport.trim() ? 1 : 0.45,
																display: "flex",
																alignItems: "center",
																gap: 9,
															}}
														>
															<Icon
																d={Icons.copy}
																size={13}
																stroke={isCopiedTxt ? "#2D6A4F" : T.accent}
															/>
															{isCopiedTxt ? "Text copied!" : "Copy plain text"}
														</button>
													</motion.div>
												)}
											</AnimatePresence>
										</div>

											{/* Close */}
											<motion.button
												whileHover={{ background: "#F0ECE5" }}
												whileTap={{ scale: 0.93 }}
											onClick={() => {
												setThemeDrawerOpen(false);
												setTranslatedHTML("");
												setTranslationLang("en");
											}}
												style={{
													background: "transparent",
													border: `1px solid ${T.border}`,
													borderRadius: 8,
													width: 34,
													height: 34,
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													cursor: "pointer",
													flexShrink: 0,
												}}
											>
												<svg
													width={14}
													height={14}
													viewBox="0 0 24 24"
													fill="none"
													stroke={T.muted}
													strokeWidth={2}
													strokeLinecap="round"
												>
													<path d="M18 6L6 18M6 6l12 12" />
												</svg>
											</motion.button>
										</div>

										{/* ─ Body: sidebar + preview ─ */}
										<div
											style={{ flex: 1, display: "flex", overflow: "hidden" }}
										>
											{/* Left: theme list */}
											<div
												style={{
													width: 210,
													borderRight: `1px solid ${T.border}`,
													overflowY: "auto",
													flexShrink: 0,
													background: T.base,
													padding: "12px 10px",
													display: "flex",
													flexDirection: "column",
													gap: 3,
												}}
											>
												<p
													style={{
														fontSize: 10,
														fontWeight: 700,
														color: T.muted,
														textTransform: "uppercase",
														letterSpacing: "0.08em",
														marginBottom: 8,
														paddingLeft: 4,
													}}
												>
													Themes
												</p>
												{Object.entries(THEMES).map(([key, theme]) => {
													const isActive = previewTheme === key;
													const hColor =
														parseCSSProp(theme.h1, "color") || theme.text;
													return (
														<motion.div
															key={key}
															role="button"
															tabIndex={0}
															whileTap={{ scale: 0.97 }}
															onClick={() => setPreviewTheme(key)}
															onKeyDown={(e) => {
																if (e.key === "Enter" || e.key === " ") {
																	e.preventDefault();
																	setPreviewTheme(key);
																}
															}}
															style={{
																background: isActive
																	? T.surface
																	: "transparent",
																border: `1.5px solid ${isActive ? T.border : "transparent"}`,
																borderRadius: 10,
																padding: "10px 8px 10px 12px",
																cursor: "pointer",
																display: "flex",
																alignItems: "center",
																gap: 10,
																textAlign: "left",
																boxShadow: isActive
																	? "0 1px 6px rgba(0,0,0,0.07)"
																	: "none",
																outline: "none",
															}}
														>
															{/* Color swatch strip */}
															<div
																style={{
																	width: 28,
																	height: 28,
																	borderRadius: 7,
																	background: theme.bg,
																	border: "1px solid rgba(0,0,0,0.1)",
																	flexShrink: 0,
																	display: "flex",
																	alignItems: "center",
																	justifyContent: "center",
																	overflow: "hidden",
																}}
															>
																<div
																	style={{
																		width: 10,
																		height: 10,
																		borderRadius: "50%",
																		background: hColor,
																	}}
																/>
															</div>
															<div style={{ minWidth: 0, flex: 1 }}>
																<p
																	style={{
																		fontSize: 12,
																		fontWeight: isActive ? 700 : 500,
																		color: isActive ? T.accent : "#555",
																		lineHeight: 1.3,
																	}}
																>
																	{theme.name}
																</p>
																<p
																	style={{
																		fontSize: 10,
																		color: T.muted,
																		overflow: "hidden",
																		whiteSpace: "nowrap",
																		textOverflow: "ellipsis",
																		marginTop: 1,
																	}}
																>
																	{theme.label}
																</p>
															</div>
															<div
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: 6,
																	flexShrink: 0,
																	marginLeft: "auto",
																}}
															>
																{isPublic ? (
																	<button
																		type="button"
																		title="Copy public URL with this theme"
																		onClick={(e) => {
																			e.stopPropagation();
																			navigator.clipboard
																				.writeText(
																					getPublicUrl(
																						draft?.slug ||
																							toSlug(slugInput) ||
																							undefined,
																						key,
																					),
																				)
																				.catch(() => {});
																			setCopiedPubThemeRow(key);
																			setTimeout(
																				() => setCopiedPubThemeRow(null),
																				1600,
																			);
																		}}
																		style={{
																			width: 28,
																			height: 28,
																			borderRadius: 7,
																			border: `1px solid ${T.border}`,
																			background:
																				copiedPubThemeRow === key
																					? "#EFF6EE"
																					: T.surface,
																			cursor: "pointer",
																			display: "flex",
																			alignItems: "center",
																			justifyContent: "center",
																			padding: 0,
																			flexShrink: 0,
																		}}
																	>
																		{copiedPubThemeRow === key ? (
																			<svg
																				width={12}
																				height={12}
																				viewBox="0 0 24 24"
																				fill="none"
																				stroke="#3D7A35"
																				strokeWidth={2.5}
																				strokeLinecap="round"
																			>
																				<polyline points="20 6 9 17 4 12" />
																			</svg>
																		) : (
																			<svg
																				width={12}
																				height={12}
																				viewBox="0 0 24 24"
																				fill="none"
																				stroke={T.muted}
																				strokeWidth={2}
																				strokeLinecap="round"
																			>
																				<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
																				<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
																			</svg>
																		)}
																	</button>
																) : null}
																{isActive && (
																	<div
																		style={{
																			width: 6,
																			height: 6,
																			borderRadius: "50%",
																			background: T.warm,
																			flexShrink: 0,
																		}}
																	/>
																)}
															</div>
														</motion.div>
													);
												})}

											{/* ─ Language translation section ─ */}
											<div
												style={{
													marginTop: 8,
													borderTop: `1px solid ${T.border}`,
													paddingTop: 12,
												}}
											>
												<p
													style={{
														fontSize: 10,
														fontWeight: 700,
														color: T.muted,
														textTransform: "uppercase",
														letterSpacing: "0.08em",
														marginBottom: 8,
														paddingLeft: 4,
													}}
												>
													Translate
												</p>
												<select
													value={translationLang}
													onChange={(e) => setTranslationLang(e.target.value)}
													style={{
														width: "100%",
														background: T.surface,
														border: `1px solid ${T.border}`,
														borderRadius: 8,
														padding: "7px 10px",
														fontSize: 12,
														color: T.accent,
														cursor: "pointer",
														outline: "none",
														marginBottom: 8,
													}}
												>
													{TRANSLATION_LANGUAGES.map((l) => (
														<option key={l.code} value={l.code}>
															{l.flag} {l.label}
														</option>
													))}
												</select>
												<motion.button
													whileTap={{ scale: 0.97 }}
													onClick={() => handleTranslate(translationLang)}
													disabled={translating}
													style={{
														width: "100%",
														background: translating
															? T.border
															: translationLang === "en"
																? T.base
																: T.accent,
														color: translating
															? T.muted
															: translationLang === "en"
																? T.muted
																: "white",
														border: `1px solid ${T.border}`,
														borderRadius: 8,
														padding: "8px 0",
														fontSize: 12,
														fontWeight: 600,
														cursor: translating ? "wait" : "pointer",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														gap: 6,
														transition: "background 0.2s, color 0.2s",
													}}
												>
													{translating ? (
														<>
															<svg
																width={12}
																height={12}
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth={2.5}
																strokeLinecap="round"
																style={{
																	animation: "spin 1s linear infinite",
																}}
															>
																<path d="M21 12a9 9 0 1 1-6.219-8.56" />
															</svg>
															Translating…
														</>
													) : translatedHTML ? (
														<>
															<svg
																width={12}
																height={12}
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth={2.5}
																strokeLinecap="round"
																strokeLinejoin="round"
															>
																<polyline points="20 6 9 17 4 12" />
															</svg>
															Translated
														</>
													) : (
														<>
															<svg
																width={12}
																height={12}
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth={2}
																strokeLinecap="round"
																strokeLinejoin="round"
															>
																<path d="M5 8l6 6" />
																<path d="M4 14l6-6 2-3" />
																<path d="M2 5h12" />
																<path d="M7 2h1" />
																<path d="M22 22l-5-10-5 10" />
																<path d="M14 18h6" />
															</svg>
															Translate
														</>
													)}
												</motion.button>
												{translatedHTML && (
													<motion.button
														whileTap={{ scale: 0.97 }}
														initial={{ opacity: 0, y: 4 }}
														animate={{ opacity: 1, y: 0 }}
														onClick={() => {
															setTranslatedHTML("");
															setTranslationLang("en");
														}}
														style={{
															width: "100%",
															marginTop: 6,
															background: "transparent",
															border: `1px solid ${T.border}`,
															borderRadius: 8,
															padding: "6px 0",
															fontSize: 11,
															color: T.muted,
															cursor: "pointer",
														}}
													>
														Reset to original
													</motion.button>
												)}
											</div>
											</div>

											{/* Right: iframe live preview */}
											<div
												style={{
													flex: 1,
													position: "relative",
													background: "#e5e7eb",
												}}
											>
												{themedDoc ? (
													<iframe
													key={`${previewTheme}-${translationLang}-${translatedHTML ? "t" : "o"}`}
														srcDoc={themedDoc}
														title={`Preview — ${activeTheme?.name}`}
														sandbox="allow-same-origin"
														style={{
															width: "100%",
															height: "100%",
															border: "none",
															display: "block",
														}}
													/>
												) : (
													<div
														style={{
															height: "100%",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
															color: T.muted,
															fontSize: 14,
														}}
													>
														No content yet — write something in the editor
														first.
													</div>
												)}
											</div>
										</div>
									</motion.div>
									{/* end centering shell */}
								</motion.div>
							</>
						);
					})()}
			</AnimatePresence>

			{/* ── THEME PREVIEW MODAL (projector) — theme list + themed iframe (translate UI hidden) ── */}
			<AnimatePresence>
				{translationModalOpen &&
					(() => {
						const rawHtml = stripDraftSlashQueryFromHtmlString(
							editorRef.current?.innerHTML || draft?.body || "",
						);
						const htmlSrc = translatedHTML || rawHtml;
						const titleText =
							titleRef.current?.innerText?.trim() || draft?.title || "Untitled";
						const themeObj = THEMES[previewTheme] || THEMES.ink;
						const themedDoc = htmlSrc
							? buildThemedHTML(htmlSrc, themeObj, titleText)
							: "";
						const markdownExport = htmlSrc.trim()
							? htmlToMarkdown(htmlSrc) || ""
							: "";
						const reactSnippet = htmlSrc.trim()
							? buildThemedReactSnippet(
									htmlSrc,
									previewTheme,
									titleText,
								)
							: "";
						const isCopiedHtmlMini =
							copiedTheme?.key === previewTheme &&
							copiedTheme?.format === "html";
						const isCopiedMdMini =
							copiedTheme?.key === previewTheme &&
							copiedTheme?.format === "markdown";
						const isCopiedReactMini =
							copiedTheme?.key === previewTheme &&
							copiedTheme?.format === "react";
						return (
							<>
								<motion.div
									key="trans-backdrop"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									onClick={() => setTranslationModalOpen(false)}
									style={{
										position: "fixed",
										inset: 0,
										background: "rgba(0,0,0,0.5)",
										zIndex: 302,
										backdropFilter: "blur(4px)",
									}}
								/>
								<motion.div
									key="trans-shell"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.2 }}
									style={{
										position: "fixed",
										inset: 0,
										zIndex: 303,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										pointerEvents: "none",
									}}
								>
									<motion.div
										initial={{ scale: 0.96, y: 16 }}
										animate={{ scale: 1, y: 0 }}
										exit={{ scale: 0.96, y: 16 }}
										transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
										onClick={(e) => e.stopPropagation()}
										style={{
											width: "min(94vw, 1000px)",
											height: "min(86vh, 720px)",
											background: T.surface,
											borderRadius: 16,
											border: `1px solid ${T.border}`,
											boxShadow: "0 28px 72px rgba(0,0,0,0.22)",
											display: "flex",
											flexDirection: "column",
											overflow: "hidden",
											pointerEvents: "auto",
										}}
									>
										<div
											style={{
												minHeight: 52,
												borderBottom: `1px solid ${T.border}`,
												display: "flex",
												alignItems: "center",
												padding: "10px 16px",
												gap: 10,
												flexShrink: 0,
											}}
										>
											<div style={{ flex: 1, minWidth: 0 }}>
												<span
													style={{
														fontSize: 14,
														fontWeight: 700,
														color: T.accent,
														display: "block",
													}}
												>
													Export themes
												</span>
											</div>
											<div
												ref={translationCopyRef}
												style={{
													position: "relative",
													flexShrink: 0,
												}}
											>
												<motion.button
													type="button"
													whileHover={{ background: "#F0F0F0" }}
													whileTap={{ scale: 0.97 }}
													disabled={
														!themedDoc &&
														!markdownExport.trim() &&
														!reactSnippet
													}
													onClick={() =>
														setTranslationCopyOpen((o) => !o)
													}
													title="Copy as HTML, Markdown, or React"
													style={{
														display: "flex",
														alignItems: "center",
														gap: 6,
														padding: "6px 10px",
														borderRadius: 8,
														border: `1px solid ${T.border}`,
														background: T.base,
														cursor:
															themedDoc ||
															markdownExport.trim() ||
															reactSnippet
																? "pointer"
																: "not-allowed",
														opacity:
															themedDoc ||
															markdownExport.trim() ||
															reactSnippet
																? 1
																: 0.45,
														fontSize: 12,
														fontWeight: 700,
														color: T.accent,
														whiteSpace: "nowrap",
													}}
												>
													<Icon
														d={Icons.copy}
														size={13}
														stroke={T.accent}
													/>
													Copy as…
													<span
														style={{
															display: "inline-flex",
															transform: translationCopyOpen
																? "rotate(180deg)"
																: "none",
															transition: "transform 0.18s ease",
														}}
													>
														<Icon
															d={Icons.chevronD}
															size={14}
															stroke={T.accent}
														/>
													</span>
												</motion.button>
												<AnimatePresence>
													{translationCopyOpen && (
														<motion.div
															initial={{ opacity: 0, y: -6 }}
															animate={{ opacity: 1, y: 0 }}
															exit={{ opacity: 0, y: -6 }}
															transition={{
																duration: 0.14,
																ease: [0.16, 1, 0.3, 1],
															}}
															style={{
																position: "absolute",
																top: "100%",
																right: 0,
																marginTop: 6,
																minWidth: 268,
																background: T.surface,
																border: `1px solid ${T.border}`,
																borderRadius: 10,
																boxShadow:
																	"0 12px 32px rgba(0,0,0,0.12)",
																padding: 6,
																zIndex: 420,
															}}
														>
															<button
																type="button"
																disabled={!themedDoc}
																onClick={() => {
																	if (!themedDoc) return;
																	void copyTextToClipboard(
																		themedDoc,
																	).then((ok) => {
																		if (!ok) return;
																		setCopiedTheme({
																			key: previewTheme,
																			format: "html",
																		});
																		setTimeout(
																			() =>
																				setCopiedTheme(null),
																			2200,
																		);
																		setTranslationCopyOpen(
																			false,
																		);
																	});
																}}
																title="Copy full themed HTML document"
																style={{
																	width: "100%",
																	textAlign: "left",
																	padding: "10px 12px",
																	border: "none",
																	borderRadius: 8,
																	background: isCopiedHtmlMini
																		? "rgba(45,106,79,0.1)"
																		: "transparent",
																	cursor: themedDoc
																		? "pointer"
																		: "not-allowed",
																	opacity: themedDoc ? 1 : 0.45,
																	display: "flex",
																	alignItems: "center",
																	gap: 10,
																}}
															>
																<div
																	style={{
																		width: 36,
																		height: 36,
																		borderRadius: 9,
																		background: T.base,
																		border: `1px solid ${T.border}`,
																		display: "flex",
																		alignItems: "center",
																		justifyContent: "center",
																		flexShrink: 0,
																	}}
																>
																	<Icon
																		d={Icons.copy}
																		size={15}
																		stroke={
																			isCopiedHtmlMini
																				? "#2D6A4F"
																				: T.accent
																		}
																	/>
																</div>
																<div style={{ minWidth: 0, flex: 1 }}>
																	<div
																		style={{
																			fontSize: 13,
																			fontWeight: 700,
																			color: isCopiedHtmlMini
																				? "#2D6A4F"
																				: T.accent,
																		}}
																	>
																		{isCopiedHtmlMini
																			? "HTML copied"
																			: "HTML"}
																	</div>
																	<div
																		style={{
																			fontSize: 11,
																			color: T.muted,
																			marginTop: 2,
																			lineHeight: 1.35,
																		}}
																	>
																		Full themed document
																	</div>
																</div>
															</button>
															<button
																type="button"
																disabled={!markdownExport.trim()}
																onClick={() => {
																	if (!markdownExport.trim())
																		return;
																	void copyTextToClipboard(
																		markdownExport,
																	).then((ok) => {
																		if (!ok) return;
																		setCopiedTheme({
																			key: previewTheme,
																			format: "markdown",
																		});
																		setTimeout(
																			() =>
																				setCopiedTheme(null),
																			2200,
																		);
																		setTranslationCopyOpen(
																			false,
																		);
																	});
																}}
																title="Copy Markdown (editor body, not full HTML wrapper)"
																style={{
																	width: "100%",
																	textAlign: "left",
																	padding: "10px 12px",
																	border: "none",
																	borderRadius: 8,
																	background: isCopiedMdMini
																		? "rgba(45,106,79,0.1)"
																		: "transparent",
																	cursor: markdownExport.trim()
																		? "pointer"
																		: "not-allowed",
																	opacity: markdownExport.trim()
																		? 1
																		: 0.45,
																	display: "flex",
																	alignItems: "center",
																	gap: 10,
																}}
															>
																<div
																	style={{
																		width: 36,
																		height: 36,
																		borderRadius: 9,
																		background: T.base,
																		border: `1px solid ${T.border}`,
																		display: "flex",
																		alignItems: "center",
																		justifyContent: "center",
																		flexShrink: 0,
																	}}
																>
																	<Icon
																		d={Icons.fileText}
																		size={15}
																		stroke={
																			isCopiedMdMini
																				? "#2D6A4F"
																				: T.accent
																		}
																	/>
																</div>
																<div style={{ minWidth: 0, flex: 1 }}>
																	<div
																		style={{
																			fontSize: 13,
																			fontWeight: 700,
																			color: isCopiedMdMini
																				? "#2D6A4F"
																				: T.accent,
																		}}
																	>
																		{isCopiedMdMini
																			? "Markdown copied"
																			: "Markdown"}
																	</div>
																	<div
																		style={{
																			fontSize: 11,
																			color: T.muted,
																			marginTop: 2,
																			lineHeight: 1.35,
																		}}
																	>
																		Editor body, no HTML wrapper
																	</div>
																</div>
															</button>
															<button
																type="button"
																disabled={!reactSnippet}
																onClick={() => {
																	if (!reactSnippet) return;
																	void copyTextToClipboard(
																		reactSnippet,
																	).then((ok) => {
																		if (!ok) return;
																		setCopiedTheme({
																			key: previewTheme,
																			format: "react",
																		});
																		setTimeout(
																			() =>
																				setCopiedTheme(null),
																			2200,
																		);
																		setTranslationCopyOpen(
																			false,
																		);
																	});
																}}
																title="Copy React iframe embed snippet"
																style={{
																	width: "100%",
																	textAlign: "left",
																	padding: "10px 12px",
																	border: "none",
																	borderRadius: 8,
																	background: isCopiedReactMini
																		? "rgba(30,58,95,0.1)"
																		: "transparent",
																	cursor: reactSnippet
																		? "pointer"
																		: "not-allowed",
																	opacity: reactSnippet ? 1 : 0.45,
																	display: "flex",
																	alignItems: "center",
																	gap: 10,
																}}
															>
																<div
																	style={{
																		width: 36,
																		height: 36,
																		borderRadius: 9,
																		background: T.base,
																		border: `1px solid ${T.border}`,
																		display: "flex",
																		alignItems: "center",
																		justifyContent: "center",
																		flexShrink: 0,
																	}}
																>
																	<Icon
																		d={Icons.link2}
																		size={15}
																		stroke={
																			isCopiedReactMini
																				? "#1E3A5F"
																				: T.accent
																		}
																	/>
																</div>
																<div style={{ minWidth: 0, flex: 1 }}>
																	<div
																		style={{
																			fontSize: 13,
																			fontWeight: 700,
																			color: isCopiedReactMini
																				? "#1E3A5F"
																				: T.accent,
																		}}
																	>
																		{isCopiedReactMini
																			? "React copied"
																			: "React"}
																	</div>
																	<div
																		style={{
																			fontSize: 11,
																			color: T.muted,
																			marginTop: 2,
																			lineHeight: 1.35,
																		}}
																	>
																		Iframe embed snippet
																	</div>
																</div>
															</button>
														</motion.div>
													)}
												</AnimatePresence>
											</div>
											<motion.button
												type="button"
												whileHover={{ background: "#F0F0F0" }}
												whileTap={{ scale: 0.93 }}
												onClick={() => setTranslationModalOpen(false)}
												style={{
													width: 32,
													height: 32,
													borderRadius: 8,
													border: `1px solid ${T.border}`,
													background: "transparent",
													cursor: "pointer",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													color: T.muted,
													flexShrink: 0,
													alignSelf: "flex-start",
												}}
												title="Close"
											>
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
											</motion.button>
										</div>
										<div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
											<div
												style={{
													width: 210,
													borderRight: `1px solid ${T.border}`,
													overflowY: "auto",
													flexShrink: 0,
													background: T.base,
													padding: "12px 10px",
													display: "flex",
													flexDirection: "column",
													gap: 3,
												}}
											>
												<p
													style={{
														fontSize: 10,
														fontWeight: 700,
														color: T.muted,
														textTransform: "uppercase",
														letterSpacing: "0.08em",
														marginBottom: 8,
														paddingLeft: 4,
													}}
												>
													Themes
												</p>
												{Object.entries(THEMES).map(([key, theme]) => {
													const isActive = previewTheme === key;
													const hColor =
														parseCSSProp(theme.h1, "color") || theme.text;
													return (
														<motion.button
															key={key}
															whileTap={{ scale: 0.97 }}
															onClick={() => setPreviewTheme(key)}
															style={{
																background: isActive
																	? T.surface
																	: "transparent",
																border: `1.5px solid ${isActive ? T.border : "transparent"}`,
																borderRadius: 10,
																padding: "10px 12px",
																cursor: "pointer",
																display: "flex",
																alignItems: "center",
																gap: 10,
																textAlign: "left",
																boxShadow: isActive
																	? "0 1px 6px rgba(0,0,0,0.07)"
																	: "none",
															}}
														>
															<div
																style={{
																	width: 28,
																	height: 28,
																	borderRadius: 7,
																	background: theme.bg,
																	border: "1px solid rgba(0,0,0,0.1)",
																	flexShrink: 0,
																	display: "flex",
																	alignItems: "center",
																	justifyContent: "center",
																	overflow: "hidden",
																}}
															>
																<div
																	style={{
																		width: 10,
																		height: 10,
																		borderRadius: "50%",
																		background: hColor,
																	}}
																/>
															</div>
															<div style={{ minWidth: 0 }}>
																<p
																	style={{
																		fontSize: 12,
																		fontWeight: isActive ? 700 : 500,
																		color: isActive ? T.accent : "#555",
																		lineHeight: 1.3,
																	}}
																>
																	{theme.name}
																</p>
																<p
																	style={{
																		fontSize: 10,
																		color: T.muted,
																		overflow: "hidden",
																		whiteSpace: "nowrap",
																		textOverflow: "ellipsis",
																		marginTop: 1,
																	}}
																>
																	{theme.label}
																</p>
															</div>
															{isActive && (
																<div
																	style={{
																		marginLeft: "auto",
																		width: 6,
																		height: 6,
																		borderRadius: "50%",
																		background: T.warm,
																		flexShrink: 0,
																	}}
																/>
															)}
														</motion.button>
													);
												})}
											</div>
											<div style={{ flex: 1, position: "relative", background: "#e5e7eb" }}>
												{themedDoc ? (
													<iframe
														key={`theme-prev-${previewTheme}-${translatedHTML ? "t" : "o"}`}
														srcDoc={themedDoc}
														title="Theme preview"
														sandbox="allow-same-origin"
														style={{
															width: "100%",
															height: "100%",
															border: "none",
															display: "block",
														}}
													/>
												) : (
													<div
														style={{
															height: "100%",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
															color: T.muted,
															fontSize: 14,
															padding: 24,
															textAlign: "center",
														}}
													>
														No content to preview — write in the editor first.
													</div>
												)}
											</div>
										</div>
									</motion.div>
								</motion.div>
							</>
						);
					})()}
			</AnimatePresence>

					</>,
					document.body,
				)}

			{/* ── PREVIEW MODAL (centered overlay) ── */}
			<AnimatePresence>
				{previewOpen && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setPreviewOpen(false)}
							style={{
								position: "fixed",
								inset: 0,
								background: "rgba(0,0,0,0.5)",
								zIndex: 200,
								backdropFilter: "blur(4px)",
							}}
						/>
						<motion.div
							initial={{ opacity: 0, scale: 0.96 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.96 }}
							transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
							style={{
								position: "fixed",
								inset: 0,
								zIndex: 201,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								pointerEvents: "none",
							}}
						>
							<div
								onClick={(e) => e.stopPropagation()}
								style={{
									pointerEvents: "auto",
									width: "min(92vw, 900px)",
									height: "min(88vh, 700px)",
									background: T.surface,
									border: `1px solid ${T.border}`,
									borderRadius: 16,
									boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
									display: "flex",
									flexDirection: "column",
									overflow: "hidden",
								}}
							>
								<div
									style={{
										padding: "14px 20px",
										borderBottom: `1px solid ${T.border}`,
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: 12,
										flexWrap: "wrap",
										flexShrink: 0,
									}}
								>
									<span
										style={{ fontSize: 14, fontWeight: 700, color: T.accent }}
									>
										Preview — {previewData.title || "Untitled"}
									</span>
									<div
										ref={previewExportRef}
										style={{
											position: "relative",
											display: "flex",
											alignItems: "center",
											gap: 8,
										}}
									>
										<motion.button
											type="button"
											whileHover={{ background: "#F0ECE5" }}
											whileTap={{ scale: 0.95 }}
											onClick={() =>
												setPreviewExportOpen((open) => !open)
											}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 6,
												background: T.base,
												border: `1px solid ${T.border}`,
												borderRadius: 8,
												padding: "6px 12px",
												fontSize: 12,
												fontWeight: 600,
												color: T.muted,
												cursor: "pointer",
											}}
										>
											<Icon d={Icons.copy} size={13} stroke={T.muted} />
											Export
											<span
												style={{
													display: "inline-flex",
													transform: previewExportOpen
														? "rotate(180deg)"
														: "none",
													transition: "transform 0.18s ease",
												}}
											>
												<Icon
													d={Icons.chevronD}
													size={14}
													stroke={T.muted}
												/>
											</span>
										</motion.button>
										<AnimatePresence>
											{previewExportOpen && (
												<motion.div
													initial={{ opacity: 0, y: -6 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: -6 }}
													transition={{
														duration: 0.14,
														ease: [0.16, 1, 0.3, 1],
													}}
													style={{
														position: "absolute",
														top: "100%",
														right: 0,
														marginTop: 6,
														minWidth: 210,
														background: T.surface,
														border: `1px solid ${T.border}`,
														borderRadius: 10,
														boxShadow:
															"0 12px 32px rgba(0,0,0,0.12)",
														padding: 6,
														zIndex: 20,
													}}
												>
													<button
														type="button"
														onClick={() => {
															if (!previewData.markdown?.trim())
																return;
															navigator.clipboard
																.writeText(previewData.markdown)
																.catch(() => {});
															setPreviewCopied("md");
															setPreviewExportOpen(false);
															setTimeout(
																() => setPreviewCopied(null),
																2000,
															);
														}}
														style={{
															width: "100%",
															textAlign: "left",
															padding: "8px 10px",
															border: "none",
															borderRadius: 8,
															background:
																previewCopied === "md"
																	? "rgba(61,122,53,0.12)"
																	: "transparent",
															fontSize: 13,
															fontWeight: 600,
															color:
																previewCopied === "md"
																	? "#3D7A35"
																	: T.accent,
															cursor: "pointer",
														}}
													>
														{previewCopied === "md"
															? "Markdown copied"
															: "Copy Markdown"}
													</button>
													<button
														type="button"
														onClick={() => {
															if (!previewData.htmlDoc) return;
															navigator.clipboard
																.writeText(previewData.htmlDoc)
																.catch(() => {});
															setPreviewCopied("html");
															setPreviewExportOpen(false);
															setTimeout(
																() => setPreviewCopied(null),
																2000,
															);
														}}
														style={{
															width: "100%",
															textAlign: "left",
															padding: "8px 10px",
															border: "none",
															borderRadius: 8,
															background:
																previewCopied === "html"
																	? "rgba(61,122,53,0.12)"
																	: "transparent",
															fontSize: 13,
															fontWeight: 600,
															color:
																previewCopied === "html"
																	? "#3D7A35"
																	: T.accent,
															cursor: "pointer",
														}}
													>
														{previewCopied === "html"
															? "HTML copied"
															: "Copy HTML"}
													</button>
													<button
														type="button"
														onClick={() => {
															if (!previewData.reactSnippet?.trim())
																return;
															navigator.clipboard
																.writeText(previewData.reactSnippet)
																.catch(() => {});
															setPreviewCopied("react");
															setPreviewExportOpen(false);
															setTimeout(
																() => setPreviewCopied(null),
																2000,
															);
														}}
														style={{
															width: "100%",
															textAlign: "left",
															padding: "8px 10px",
															border: "none",
															borderRadius: 8,
															background:
																previewCopied === "react"
																	? "rgba(61,122,53,0.12)"
																	: "transparent",
															fontSize: 13,
															fontWeight: 600,
															color:
																previewCopied === "react"
																	? "#3D7A35"
																	: T.accent,
															cursor: "pointer",
														}}
													>
														{previewCopied === "react"
															? "React copied"
															: "Copy React"}
													</button>
												</motion.div>
											)}
										</AnimatePresence>
										<motion.button
											whileHover={{ background: "#F0ECE5" }}
											whileTap={{ scale: 0.95 }}
											onClick={() => setPreviewOpen(false)}
											style={{
												background: "none",
												border: "none",
												borderRadius: 8,
												width: 32,
												height: 32,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												cursor: "pointer",
												fontSize: 18,
												color: T.muted,
											}}
										>
											✕
										</motion.button>
									</div>
								</div>
								<div
									style={{
										flex: 1,
										minHeight: 0,
										background: "#e5e7eb",
									}}
								>
									{previewData.htmlDoc ? (
										<iframe
											srcDoc={previewData.htmlDoc}
											title={`Preview — ${previewData.title}`}
											sandbox="allow-scripts allow-same-origin"
											style={{
												width: "100%",
												height: "100%",
												border: "none",
												display: "block",
											}}
										/>
									) : (
										<div
											style={{
												height: "100%",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												color: T.muted,
												fontSize: 14,
											}}
										>
											No content to preview
										</div>
									)}
								</div>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>

			{/* ── DELETE CONFIRM MODAL ── */}
			<AnimatePresence>
				{deleteConfirm && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setDeleteConfirm(null)}
							style={{
								position: "fixed",
								inset: 0,
								background: "rgba(0,0,0,0.35)",
								zIndex: 200,
								backdropFilter: "blur(3px)",
							}}
						/>
						<motion.div
							initial={{ opacity: 0, scale: 0.92, y: 12 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.92, y: 12 }}
							transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
							style={{
								position: "fixed",
								top: "50%",
								left: "50%",
								transform: "translate(-40%,-40%)",
								background: T.surface,
								border: `1px solid ${T.border}`,
								borderRadius: 16,
								padding: "28px 28px",
								width: 360,
								zIndex: 201,
								boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
							}}
						>
							<p
								style={{
									fontSize: 18,
									fontWeight: 700,
									color: T.accent,
									marginBottom: 8,
								}}
							>
								Delete this draft?
							</p>
							<p
								style={{
									fontSize: 14,
									color: T.muted,
									lineHeight: 1.6,
									marginBottom: 22,
								}}
							>
								This action can&apos;t be undone. The draft will be permanently
								deleted from your account.
							</p>
							<div style={{ display: "flex", gap: 10 }}>
								<motion.button
									whileHover={{ background: "#F0ECE5" }}
									whileTap={{ scale: 0.97 }}
									onClick={() => setDeleteConfirm(null)}
									style={{
										flex: 1,
										background: T.base,
										border: `1.5px solid ${T.border}`,
										borderRadius: 9,
										padding: "10px",
										fontSize: 14,
										fontWeight: 600,
										color: T.accent,
										cursor: "pointer",
									}}
								>
									Cancel
								</motion.button>
								<motion.button
									whileHover={{ background: "#DC2626" }}
									whileTap={{ scale: 0.97 }}
									onClick={confirmDelete}
									style={{
										flex: 1,
										background: "#EF4444",
										border: "none",
										borderRadius: 9,
										padding: "10px",
										fontSize: 14,
										fontWeight: 700,
										color: "white",
										cursor: "pointer",
									}}
								>
									Delete draft
								</motion.button>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>

		</div>
	);
}
