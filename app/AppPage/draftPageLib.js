import React from "react";
import { getTheme } from "../../lib/utils/theme";
import { formatInkDateLong } from "../../lib/ui/TiptapSlashDatePicker.jsx";
import { lucideToSvgString } from "../../lib/ui/IconSelectorDropdown.jsx";
import SidebarAssetCard from "../../lib/ui/SidebarAssetCard.jsx";
import {
	THEMES,	
	buildThemedHTML,
	parseInlineMarkdown,
	resolvePublicThemeId,
} from "../../lib/blogExportThemes";
import { Annoyed, AudioLinesIcon, BetweenHorizonalStart, Calendar1Icon, CheckIcon, Code2, CodeSquare, IdCard, IdCardIcon, ImageIcon, ListCheck, ListIcon, Music2Icon, Table2Icon, ToggleLeft, ToggleRightIcon, YoutubeIcon } from "lucide-react";

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
	barChart:
		"M18 20V10M12 20V4M6 20v-4M3 18h18",
	workflow:
		"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
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
	{ label: "zinc 600", hex: "#d97706" },
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
	{ label: "zinc 100", hex: "#fef3c7" },
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

/* ─── Asset type labels ─── */
const ASSET_TYPE_LABELS = {
	table: "Table",
	draft: "Draft",
	infographics: "Infographics",
	landing_page: "Landing Page",
	image_gallery: "Gallery",
};

/* ─── Item card in sidebar (drafts + tables + assets) ─── */
function ItemCard(props) {
	return (
		<SidebarAssetCard
			{...props}
			typeLabels={ASSET_TYPE_LABELS}
			Icon={Icon}
			Icons={Icons}
		/>
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

/** Removes a rich block and leaves an empty paragraph (draft editor onclick). Single-quoted JS only inside handler. */
const DRAFT_BLOCK_DELETE_CLICK = `(function(btn,e){var ev=e||window.event;if(ev){if(ev.preventDefault)ev.preventDefault();if(ev.stopPropagation)ev.stopPropagation();}var k=btn.getAttribute('data-draft-del');var el=null;if(k==='toggle-group')el=btn.closest('[data-block=toggle-group]');else if(k==='card')el=btn.closest('[data-block=card]');else if(k==='tabs')el=btn.closest('[data-block=tabs]');else if(k==='code-group')el=btn.closest('[data-block=code-group]');else if(k==='draft-toggle')el=btn.closest('details[data-block=draft-toggle]');else if(k==='callout')el=btn.closest('[data-block^=callout-]');else if(k==='code')el=btn.closest('[data-block=code]');if(!el||!el.parentNode)return;var p=document.createElement('p');p.innerHTML='<br>';el.parentNode.insertBefore(p,el.nextSibling||null);el.parentNode.removeChild(el);})(this,typeof event==='undefined'?null:event)`;

const DRAFT_BLOCK_DEL_BTN_STYLE =
	"width:22px;height:22px;border-radius:6px;border:1px solid #E8E4DC;background:#fff;color:#9A9490;font-size:12px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;flex-shrink:0";

/** Opens the draft icon picker (registered on window by DraftPage). */
const DRAFT_ICON_PICKER_CLICK = `(function(el,e){var ev=e||window.event;if(ev){if(ev.preventDefault)ev.preventDefault();if(ev.stopPropagation)ev.stopPropagation();}var chip=el.closest?el.closest("[data-icon-selector]"):el;if(!chip)return;var fn=window.__inkgestOpenIconPicker;if(typeof fn==="function")fn(chip);})(this,typeof event==="undefined"?null:event)`;

function makeCalloutHtml(type, text = "") {
	const c = CALLOUT_CONFIGS[type] || CALLOUT_CONFIGS.info;
	return `<div data-block="callout-${type}" style="border-left:4px solid ${c.border};background:${c.bg};border-radius:0 8px 8px 0;padding:11px 10px 11px 16px;margin:14px 0;display:flex;gap:10px;align-items:flex-start"><span data-callout-icon data-icon-selector data-icon-type="emoji" contenteditable="false" title="Click to change icon" style="font-size:17px;flex-shrink:0;line-height:1.6;margin-top:2px;cursor:pointer;user-select:none">${c.emoji}</span><div style="flex:1;min-width:0"><p style="font-weight:700;color:${c.textColor};font-size:10.5px;text-transform:;letter-spacing:0.1em;margin:0 0 5px;font-family:'Comic',sans-serif">${c.label}</p><div style="color:${c.textColor};font-size:14px;line-height:1.65;font-family:'Comic',sans-serif">${text}</div></div><button type="button" data-draft-del="callout" onclick="${DRAFT_BLOCK_DELETE_CLICK}" contenteditable="false" title="Remove callout" style="${DRAFT_BLOCK_DEL_BTN_STYLE}">✕</button></div>`;
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
	return `<div data-block="code" style="margin:16px 0;border-radius:10px;overflow:hidden;border:1px solid #E8E4DC"><div contenteditable="false" style="background:#F0ECE5;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #E8E4DC;user-select:none"><select data-action="change-lang" style="background:none;border:none;font-size:11px;font-weight:700;color:#5A5550;text-transform:;letter-spacing:0.06em;cursor:pointer;outline:none;font-family:'Comic',sans-serif">${opts}</select><div style="display:flex;align-items:center;gap:6px"><button data-action="copy-code" style="background:#FFFFFF;border:1px solid #E8E4DC;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600;color:#7A7570;cursor:pointer;font-family:'Comic',sans-serif;transition:all 0.15s">Copy</button><button type="button" data-draft-del="code" onclick="${DRAFT_BLOCK_DELETE_CLICK}" title="Remove code block" style="background:#FFFFFF;border:1px solid #E8E4DC;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:600;color:#9A9490;cursor:pointer;font-family:'Comic',sans-serif;line-height:1">✕</button></div></div><pre style="background:#1A1A1A;margin:0;padding:18px 20px;overflow-x:auto"><code style="color:#E8D5B0;font-family:'Fira Code','Cascadia Code','Courier New',monospace;font-size:13px;line-height:1.75;white-space:pre;display:block">${code}</code></pre></div>`;
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
		`<details data-block="draft-toggle" style="border-bottom:1px solid #E8E4DC"><summary style="display:flex;align-items:center;gap:8px;padding:12px 14px;cursor:pointer;list-style:none;user-select:none;font-size:14px;font-weight:600;color:#37352F"><span data-toggle-chevron></span><span data-toggle-grip></span><span contenteditable="true" style="flex:1;outline:none;min-width:0">${q}</span><button type="button" tabindex="-1" data-draft-del="draft-toggle" onclick="${DRAFT_BLOCK_DELETE_CLICK}" contenteditable="false" title="Remove this toggle" style="${DRAFT_BLOCK_DEL_BTN_STYLE}">✕</button></summary><div contenteditable="true" style="padding:10px 14px 14px 44px;font-size:14px;color:#6B6560;line-height:1.7;outline:none"><p>Answer goes here…</p></div></details>`;
	return `<div data-block="toggle-group" style="margin:18px 0;border:1px solid #E8E4DC;border-radius:12px;overflow:hidden;background:#FAFAF8"><div contenteditable="false" style="padding:8px 10px 8px 14px;border-bottom:1px solid #E8E4DC;background:#F3EFE8;display:flex;align-items:center;justify-content:space-between;gap:8px"><span contenteditable="true" data-toggle-group-label data-placeholder="Group heading…" style="flex:1;min-width:0;font-size:11px;font-weight:700;color:#9A9490;text-transform:uppercase;letter-spacing:0.07em;outline:none">FAQ</span><button type="button" tabindex="-1" data-draft-del="toggle-group" onclick="${DRAFT_BLOCK_DELETE_CLICK}" contenteditable="false" title="Remove toggle group" style="${DRAFT_BLOCK_DEL_BTN_STYLE}">✕</button></div>${toggleItem("What is Inkgest?")}${toggleItem("How does the AI editor work?")}${toggleItem("Can I export to React, HTML, or Markdown?")}</div><p><br></p>`;
}

function makeCardBlockHtml() {
	return `<div data-block="card" style="margin:16px 0;border:1.5px solid #E8E4DC;border-radius:14px;padding:38px 22px 20px;background:#FAFAF8;display:flex;gap:14px;align-items:flex-start;position:relative"><button type="button" tabindex="-1" data-draft-del="card" onclick="${DRAFT_BLOCK_DELETE_CLICK}" contenteditable="false" title="Remove card" style="position:absolute;top:10px;right:10px;${DRAFT_BLOCK_DEL_BTN_STYLE}">✕</button><div data-card-icon data-icon-selector data-icon-type="emoji" contenteditable="false" title="Click to change icon" style="font-size:28px;line-height:1;flex-shrink:0;min-width:36px;text-align:center;cursor:pointer;user-select:none"><span style="font-size:28px;line-height:1">🎯</span></div><div style="flex:1;min-width:0"><div contenteditable="true" data-card-heading data-placeholder="Card heading" style="font-size:16px;font-weight:700;color:#37352F;margin-bottom:6px;outline:none;line-height:1.3">Card heading</div><div contenteditable="true" data-card-desc data-placeholder="Write a short description…" style="font-size:14px;color:#6B6560;line-height:1.7;outline:none">Write a short description for this card.</div></div></div><p><br></p>`;
}

function makeIconBlockHtml(value = "✨", type = "emoji") {
	const inner =
		type === "lucide"
			? value /* already an SVG string */
			: `<span style="font-size:22px;line-height:1">${value}</span>`;
	return `<span data-icon-selector data-icon-type="${type}" contenteditable="false" title="Click to change icon" style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;padding:2px;border-radius:6px;vertical-align:middle;line-height:1">${inner}</span>`;
}

function iconSizesForTarget(target) {
	if (!target) return { emoji: 22, lucide: 22 };
	if (target.hasAttribute("data-callout-icon")) return { emoji: 17, lucide: 16 };
	if (target.hasAttribute("data-card-icon")) return { emoji: 28, lucide: 26 };
	if (target.closest?.('[data-block="audio-block"]')) return { emoji: 18, lucide: 16 };
	return { emoji: 22, lucide: 22 };
}

/** Update an existing [data-icon-selector] chip (card, callout, inline, audio, etc.). */
function applyIconToSelectorTarget(target, { type, value, icon }) {
	if (!target) return;
	const sizes = iconSizesForTarget(target);
	const calloutBlock = target.closest?.("[data-block^='callout-']");
	const calloutType = calloutBlock
		?.getAttribute("data-block")
		?.replace(/^callout-/, "");
	const stroke =
		(calloutType && CALLOUT_CONFIGS[calloutType]?.textColor) || "#37352F";
	if (type === "emoji") {
		target.setAttribute("data-icon-type", "emoji");
		if (target.hasAttribute("data-callout-icon")) {
			target.textContent = value;
		} else {
			target.innerHTML = `<span style="font-size:${sizes.emoji}px;line-height:1">${value}</span>`;
		}
	} else if (type === "lucide" && icon) {
		target.setAttribute("data-icon-type", "lucide");
		target.innerHTML = lucideToSvgString(icon, sizes.lucide, stroke);
	}
}

/** Legacy blocks: ensure icon chips are clickable and open the picker. */
function migrateCalloutIconSelectors(root) {
	if (!root?.querySelectorAll) return;
	root.querySelectorAll('[data-block^="callout-"]').forEach((block) => {
		const icon = block.querySelector(":scope > span");
		if (!icon) return;
		if (!icon.hasAttribute("data-icon-selector")) {
			icon.setAttribute("data-callout-icon", "");
			icon.setAttribute("data-icon-selector", "");
			icon.setAttribute("data-icon-type", "emoji");
			icon.setAttribute("contenteditable", "false");
			icon.title = "Click to change icon";
			icon.style.cursor = "pointer";
			icon.style.userSelect = "none";
		}
	});
	root.querySelectorAll("[data-icon-selector]").forEach((chip) => {
		chip.setAttribute("contenteditable", "false");
		if (!chip.title) chip.title = "Click to change icon";
	});
}

/** Insert an inline icon chip at the selection start; keeps selected text on the same line. */
function insertInlineIconAtSelection(editorEl, iconHtml, savedRange) {
	if (!editorEl || !savedRange) return false;
	const wrap = document.createElement("div");
	wrap.innerHTML = iconHtml.trim();
	const iconNode = wrap.firstElementChild;
	if (!iconNode) return false;
	const range = savedRange.cloneRange();
	if (!editorEl.contains(range.commonAncestorContainer)) return false;

	let tail = iconNode;
	if (!range.collapsed) {
		const extracted = range.extractContents();
		range.collapse(true);
		range.insertNode(iconNode);
		if (extracted.childNodes.length || extracted.textContent) {
			iconNode.after(extracted);
			tail = extracted.lastChild || iconNode;
		}
	} else {
		range.collapse(true);
		range.insertNode(iconNode);
	}

	if (iconNode.parentNode === editorEl) {
		const p = document.createElement("p");
		editorEl.insertBefore(p, iconNode);
		p.appendChild(iconNode);
	}

	try {
		const sel = window.getSelection();
		const after = document.createRange();
		after.setStartAfter(tail);
		after.collapse(true);
		sel.removeAllRanges();
		sel.addRange(after);
	} catch {
		/* ignore */
	}
	return true;
}

function makeAudioBlockHtml(src = "", name = "Audio track", caption = "") {
	const safeSrc = src.replace(/"/g, "&quot;");
	const safeName = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
	const safeCaption = caption.replace(/</g, "&lt;").replace(/>/g, "&gt;");
	const waveGray  = "repeating-linear-gradient(90deg,#9A9490 0,#9A9490 2px,transparent 2px,transparent 8px)";
	const wavezinc = "repeating-linear-gradient(90deg,#C17B2F 0,#C17B2F 2px,transparent 2px,transparent 8px)";
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
								`<div style="width:9999px;height:3px;background:${wavezinc};border-radius:2px"></div>` +
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
	return `<div data-block="tabs" style="margin:18px 0;border:1px solid #E8E4DC;border-radius:12px;background:#FAFAF8;overflow:hidden"><div contenteditable="false" style="display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #E8E4DC;background:#F3EFE8;user-select:none"><div style="display:flex;flex:1;min-width:0;flex-wrap:wrap;gap:4px"><button type="button" data-action="draft-tab" data-tab-idx="0" onclick="${DRAFT_TAB_BUTTON_ONCLICK}" style="padding:6px 12px;border:none;border-radius:8px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.06);font-size:12px;font-weight:600;color:#37352F;cursor:pointer">Tab 1</button><button type="button" data-action="draft-tab" data-tab-idx="1" onclick="${DRAFT_TAB_BUTTON_ONCLICK}" style="padding:6px 12px;border:none;border-radius:8px;background:transparent;font-size:12px;font-weight:500;color:#7A7570;cursor:pointer">Tab 2</button></div><button type="button" tabindex="-1" data-draft-del="tabs" onclick="${DRAFT_BLOCK_DELETE_CLICK}" title="Remove tab group" style="${DRAFT_BLOCK_DEL_BTN_STYLE}">✕</button></div><div data-draft-tab-panels><div data-draft-panel="0" style="padding:12px 14px;display:block;min-height:48px"><p><br></p></div><div data-draft-panel="1" style="padding:12px 14px;display:none;min-height:48px"><p><br></p></div></div></div><p><br></p>`;
}

function makeDraftCodeGroupHtml() {
	const preStyle =
		"background:#1A1A1A;margin:0;padding:16px 18px;overflow-x:auto;min-height:72px;font-family:'Fira Code','Cascadia Code','Courier New',monospace;font-size:13px;line-height:1.75;color:#E8D5B0;white-space:pre-wrap;outline:none;border:none;display:block;width:100%;box-sizing:border-box";
	return `<div data-block="code-group" style="margin:16px 0;border:1px solid #E8E4DC;border-radius:10px;overflow:hidden"><div contenteditable="false" style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#F0ECE5;border-bottom:1px solid #E8E4DC;user-select:none"><div style="display:flex;flex:1;min-width:0;flex-wrap:wrap;gap:4px"><button type="button" data-action="cg-tab" data-cg-idx="0" onclick="${DRAFT_CODEGROUP_TAB_ONCLICK}" style="padding:5px 10px;border:none;border-radius:6px;background:#fff;font-size:11px;font-weight:700;cursor:pointer;color:#37352F">Snippet 1</button><button type="button" data-action="cg-tab" data-cg-idx="1" onclick="${DRAFT_CODEGROUP_TAB_ONCLICK}" style="padding:5px 10px;border:none;border-radius:6px;background:transparent;font-size:11px;font-weight:600;cursor:pointer;color:#6B6560">Snippet 2</button></div><button type="button" tabindex="-1" data-draft-del="code-group" onclick="${DRAFT_BLOCK_DELETE_CLICK}" title="Remove code group" style="${DRAFT_BLOCK_DEL_BTN_STYLE}">✕</button></div><div data-cg-panel="0" style="display:block"><pre contenteditable="true" style="${preStyle}">// Snippet 1</pre></div><div data-cg-panel="1" style="display:none"><pre contenteditable="true" style="${preStyle}">// Snippet 2</pre></div></div><p><br></p>`;
}

function makeDraftToggleHtml() {
	return `<details data-block="draft-toggle" style="margin:16px 0;border:1px solid #E8E4DC;border-radius:10px;padding:0;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(55,53,47,0.06)"><summary style="display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;background:#F7F5F0;color:#37352F;list-style:none;outline:none;user-select:none;-webkit-user-select:none"><span contenteditable="false" data-toggle-chevron></span><span style="flex:1;font-weight:600;min-width:0">Toggle</span><button type="button" tabindex="-1" data-draft-del="draft-toggle" onclick="${DRAFT_BLOCK_DELETE_CLICK}" contenteditable="false" title="Remove toggle" style="${DRAFT_BLOCK_DEL_BTN_STYLE}">✕</button></summary><div style="padding:14px 18px 18px;border-top:1px solid #E8E4DC;background:#fff"><p style="margin:0"><br></p></div></details><p><br></p>`;
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
	{ id: "bullet",   label: "Bullet List",   icon: <ListCheck />, section: "style",  subSection: "Lists",       keywords: ["bullet", "ul", "unordered", "list"] },
	{ id: "numbered", label: "Numbered List", icon: <ListIcon />, section: "style",  subSection: "Lists",       keywords: ["numbered", "ordered", "ol", "list"] },
	{ id: "todo",     label: "To-do List",    icon: <CheckIcon />,    section: "style",  subSection: "Lists",       keywords: ["todo", "task", "check", "list", "checkbox", "checklist"] },
	/* ── Media ── */
	{ id: "image",    label: "Image",         icon: <ImageIcon />,  section: "blocks", subSection: "Media",     keywords: ["image", "img", "photo", "picture", "upload"] },
	{ id: "embed",    label: "Embed",           icon: <YoutubeIcon />, section: "blocks", subSection: "Media",    keywords: ["embed", "youtube", "twitter", "x", "instagram", "reddit", "tiktok", "spotify", "vimeo", "loom", "figma", "video", "social", "iframe"] },
	{ id: "audio",    label: "Audio File",    icon: <Music2Icon />,    section: "blocks", subSection: "Media",       keywords: ["audio", "music", "mp3", "sound", "track", "podcast"] },
	{ id: "record",   label: "Record Audio",  icon: <AudioLinesIcon />,    section: "blocks", subSection: "Media",       keywords: ["record", "recording", "microphone", "mic", "voice", "capture"] },
	/* ── Data ── */
	{ id: "table",    label: "Table",         icon: <Table2Icon />, section: "blocks", subSection: "Data",       keywords: ["table", "grid", "rows", "sheet", "csv"] },
	{ id: "date",     label: "Date",          icon: <Calendar1Icon />,    section: "blocks", subSection: "Data",        keywords: ["date", "today", "calendar", "time"] },
	/* ── Components ── */
	{ id: "card",         label: "Card",               icon: <IdCardIcon />, section: "blocks", subSection: "Components", keywords: ["card", "box", "panel", "feature", "icon card"] },
	{ id: "toggle-group", label: "Toggle Group (FAQ)", icon: <ToggleLeft />, section: "blocks", subSection: "Components", keywords: ["faq", "toggle group", "accordion", "collapse", "questions"] },
	{ id: "toggle",       label: "Toggle",             icon: <ToggleRightIcon />, section: "blocks", subSection: "Components", keywords: ["toggle", "details", "collapse", "accordion", "disclosure"] },
	{ id: "tabs",         label: "Tabs",               icon: <BetweenHorizonalStart />, section: "blocks", subSection: "Components", keywords: ["tabs", "tab", "panels", "tabgroup"] },
	{ id: "icon-block",   label: "Icon",               icon:<Annoyed />, section: "blocks", subSection: "Components", keywords: ["icon", "emoji", "symbol", "glyph", "svg"] },
	/* ── Callouts ── */
	{ id: "callout-info",    label: "Info Callout",    icon: "ℹ️",  section: "blocks", subSection: "Callouts", keywords: ["info", "information", "note", "blue", "tip"] },
	{ id: "callout-warning", label: "Warning Callout", icon: "⚠️",  section: "blocks", subSection: "Callouts", keywords: ["callout", "warning", "caution", "attention"] },
	{ id: "callout-success", label: "Success Callout", icon: "✅",  section: "blocks", subSection: "Callouts", keywords: ["success", "done", "green", "check", "positive"] },
	{ id: "callout-danger",  label: "Danger Callout",  icon: "🚨",  section: "blocks", subSection: "Callouts", keywords: ["danger", "error", "red", "alert", "critical"] },
	/* ── Code ── */
	{ id: "code",      label: "Code Block", icon: <Code2 />, section: "blocks", subSection: "Code", keywords: ["code", "codeblock", "snippet", "pre", "program"] },
	{ id: "codeGroup", label: "Code Group", icon: <CodeSquare />,   section: "blocks", subSection: "Code", keywords: ["codegroup", "code group", "snippets", "multi", "gist"] },
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




export {
  ASSET_TYPE_LABELS,
  AUDIO_DELETE_ONCLICK,
  AUDIO_PLAY_ONCLICK,
  AUDIO_SEEK_ONCLICK,
  CALLOUT_CONFIGS,
  DRAFT_BLOCK_DELETE_CLICK,
  DRAFT_BLOCK_DEL_BTN_STYLE,
  DRAFT_BUBBLE_INLINE,
  DRAFT_CODEGROUP_TAB_ONCLICK,
  DRAFT_ICON_PICKER_CLICK,
  DRAFT_SLASH_AI_KEYWORDS,
  DRAFT_SLASH_BASE_ITEMS,
  DRAFT_SLASH_BLOCK_SEL,
  DRAFT_TAB_BUTTON_ONCLICK,
  EMBED_ICONS,
  FontLink,
  Icon,
  Icons,
  ItemCard,
  LANG_OPTIONS,
  MAX_TABS,
  SELECTION_BG_COLORS,
  SELECTION_TEXT_COLORS,
  T,
  TBtn,
  TODO_CHECKBOX_STYLE,
  TODO_LI_STYLE,
  TODO_UL_STYLE,
  TRANSLATION_LANGUAGES,
  applyDraftBubbleInlineStyle,
  applyIconToSelectorTarget,
  buildThemedReactSnippet,
  THEMES,
  parseInlineMarkdown,
  resolvePublicThemeId,
  formatInkDateLong,
  deleteDraftSlashFromCaret,
  deleteDraftSlashToken,
  draftSelectionSpansMultipleBlocks,
  draftSlashItemMatchesQuery,
  escapeAttr,
  execDraftForeColor,
  execDraftHiliteColor,
  getCaretCharOffsetInBlock,
  getDateFromFirestore,
  getDraftBlockFromSelection,
  getDraftBubbleBlock,
  getDraftSlashFlatRows,
  getSelectionLinkContext,
  getTextFromBlockStartToCaret,
  insertDraftRichBlock,
  insertInlineIconAtSelection,
  isThisMonth,
  makeAudioBlockHtml,
  makeButtonBlockHtml,
  makeCalloutHtml,
  makeCardBlockHtml,
  makeCodeBlockHtml,
  makeDraftCodeGroupHtml,
  makeDraftDividerHtml,
  makeDraftImageFigureHtml,
  makeDraftQuoteHtml,
  makeDraftTabsHtml,
  makeDraftToggleHtml,
  makeEmbedHtml,
  makeIconBlockHtml,
  makeSimpleTableHtml,
  makeToggleGroupHtml,
  matchDraftSlashQuery,
  migrateCalloutIconSelectors,
  measureDraftSlashCoords,
  measureDraftSlashMenuPosition,
  normalizeTodoLists,
  parseCSSProp,
  copyTextToClipboard,
  resolveEmbed,
  setCaretCharOffsetInBlock,
  stripDraftSlashQueryFromHtmlString,
  stripTrailingEmptyParagraphSuffix,
  syncDraftSlashQueryHighlight,
  todoLiStructureOk,
  unwrapAllDraftSlashQuerySpans,
  unwrapDraftInlineSpan,
  unwrapDraftSlashQuerySpan,
};
