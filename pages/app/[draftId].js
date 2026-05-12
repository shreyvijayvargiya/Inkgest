import {
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

/* ─── Fonts ─── */
const FontLink = () => (
	<style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; }
    body { font-family: 'Outfit', sans-serif; background: #F7F5F0; -webkit-font-smoothing: antialiased; }
    textarea, input, button { font-family: 'Outfit', sans-serif; }
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

/* ─── 12 predefined themes — each is a map of CSS strings ─── */
const THEMES = {
	ink: {
		name: "Ink",
		label: "Warm editorial · Sans",
		palette: ["#F7F5F0", "#1A1A1A", "#C17B2F", "#7A7570"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap",
		bodyFont: "'Comic', sans-serif",
		bg: "#F7F5F0",
		text: "#3A3530",
		container:
			"max-width:720px;margin:0 auto;padding:48px 56px;background:#F7F5F0;font-family:'Outfit',sans-serif;",
		h1: "font-family:'Outfit',sans-serif;font-size:34px;color:#1A1A1A;line-height:1.2;margin:0 0 16px;font-weight:400;",
		h2: "font-family:'Outfit',sans-serif;font-size:24px;color:#1A1A1A;line-height:1.3;margin:32px 0 12px;font-weight:400;",
		h3: "font-family:'Outfit',sans-serif;font-size:19px;color:#3A3530;margin:22px 0 8px;font-weight:400;",
		p: "font-size:16px;line-height:1.85;color:#3A3530;margin:0 0 14px;",
		blockquote:
			"border-left:3px solid #C17B2F;padding:4px 0 4px 20px;color:#7A7570;font-style:italic;margin:20px 0;",
		code: "background:#EDE9E2;border-radius:4px;padding:2px 6px;font-family:monospace;font-size:13px;",
		strong: "color:#1A1A1A;font-weight:700;",
		a: "color:#C17B2F;",
		li: "font-size:16px;line-height:1.8;color:#3A3530;margin:4px 0;",
		hr: "border:none;border-top:1px solid #E8E4DC;margin:32px 0;",
	},
	midnight: {
		name: "Midnight",
		label: "Dark minimal · Sans",
		palette: ["#0D0D0D", "#E8E8E8", "#7C7CFF", "#444444"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
		bodyFont: "'Inter', sans-serif",
		bg: "#0D0D0D",
		text: "#A8A8A8",
		container:
			"max-width:720px;margin:0 auto;padding:48px 56px;background:#0D0D0D;font-family:'Inter',sans-serif;",
		h1: "font-family:'Inter',sans-serif;font-size:30px;color:#FFFFFF;line-height:1.2;margin:0 0 16px;font-weight:600;",
		h2: "font-family:'Inter',sans-serif;font-size:20px;color:#D4D4D4;line-height:1.3;margin:32px 0 12px;font-weight:500;border-bottom:1px solid #222222;padding-bottom:8px;",
		h3: "font-family:'Inter',sans-serif;font-size:14px;color:#888888;margin:22px 0 8px;font-weight:500;text-transform:;letter-spacing:0.06em;",
		p: "font-size:15px;line-height:1.9;color:#A8A8A8;margin:0 0 14px;",
		blockquote:
			"border-left:3px solid #7C7CFF;padding:4px 0 4px 20px;color:#666666;font-style:italic;margin:20px 0;",
		code: "background:#1E1E1E;color:#7FDBCA;border-radius:4px;padding:2px 8px;font-family:'Courier New',monospace;font-size:13px;",
		strong: "color:#FFFFFF;font-weight:600;",
		a: "color:#7C7CFF;",
		li: "font-size:15px;line-height:1.8;color:#A8A8A8;margin:4px 0;",
		hr: "border:none;border-top:1px solid #222222;margin:32px 0;",
	},
	paper: {
		name: "Paper",
		label: "Classic editorial · Lora",
		palette: ["#FFFEF9", "#1A1A2E", "#2A5298", "#888888"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Source+Sans+3:wght@300;400;600&display=swap",
		bodyFont: "'Source Sans 3', sans-serif",
		bg: "#FFFEF9",
		text: "#3C3C3C",
		container:
			"max-width:680px;margin:0 auto;padding:52px 48px;background:#FFFEF9;font-family:'Source Sans 3',sans-serif;",
		h1: "font-family:'Lora',serif;font-size:36px;color:#1A1A2E;line-height:1.15;margin:0 0 20px;font-weight:600;",
		h2: "font-family:'Lora',serif;font-size:24px;color:#1A1A2E;line-height:1.3;margin:36px 0 14px;font-weight:400;",
		h3: "font-family:'Lora',serif;font-size:19px;color:#1A1A2E;margin:24px 0 10px;font-weight:400;",
		p: "font-size:17px;line-height:1.8;color:#3C3C3C;margin:0 0 16px;",
		blockquote:
			"border-left:4px solid #2A5298;padding:8px 0 8px 24px;color:#666666;font-style:italic;margin:24px 0;font-family:'Lora',serif;font-size:18px;",
		code: "background:#F0F0F0;border-radius:3px;padding:2px 6px;font-family:monospace;font-size:13px;",
		strong: "color:#1A1A2E;font-weight:600;",
		a: "color:#2A5298;",
		li: "font-size:17px;line-height:1.8;color:#3C3C3C;margin:5px 0;",
		hr: "border:none;border-top:2px solid #E0DDD5;margin:36px 0;",
	},
	forest: {
		name: "Forest",
		label: "Earthy & natural · Merriweather",
		palette: ["#F0F4F0", "#1B2E1B", "#2D6A4F", "#6B8F6B"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap",
		bodyFont: "'DM Sans', sans-serif",
		bg: "#F0F4F0",
		text: "#2C3E2C",
		container:
			"max-width:720px;margin:0 auto;padding:48px 52px;background:#F0F4F0;font-family:'DM Sans',sans-serif;",
		h1: "font-family:'Merriweather',serif;font-size:32px;color:#1B2E1B;line-height:1.2;margin:0 0 16px;font-weight:700;",
		h2: "font-family:'Merriweather',serif;font-size:21px;color:#2D6A4F;line-height:1.35;margin:32px 0 12px;font-weight:700;",
		h3: "font-family:'Merriweather',serif;font-size:17px;color:#1B2E1B;margin:22px 0 8px;font-weight:400;",
		p: "font-size:16px;line-height:1.85;color:#2C3E2C;margin:0 0 14px;",
		blockquote:
			"border-left:4px solid #2D6A4F;background:#E8F0E8;padding:12px 20px;color:#4A6A4A;font-style:italic;margin:24px 0;border-radius:0 8px 8px 0;",
		code: "background:#D8E8D8;border-radius:4px;padding:2px 6px;font-family:monospace;font-size:13px;color:#1B2E1B;",
		strong: "color:#1B2E1B;font-weight:700;",
		a: "color:#2D6A4F;",
		li: "font-size:16px;line-height:1.8;color:#2C3E2C;margin:5px 0;",
		hr: "border:none;border-top:2px solid #C8D8C8;margin:32px 0;",
	},
	rose: {
		name: "Rose",
		label: "Soft feminine · Cormorant",
		palette: ["#FDF0F3", "#3D1A24", "#D4617A", "#B08090"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Nunito:wght@300;400;500;600&display=swap",
		bodyFont: "'Nunito', sans-serif",
		bg: "#FDF0F3",
		text: "#4A2530",
		container:
			"max-width:700px;margin:0 auto;padding:48px 52px;background:#FDF0F3;font-family:'Nunito',sans-serif;",
		h1: "font-family:'Cormorant Garamond',serif;font-size:40px;color:#3D1A24;line-height:1.15;margin:0 0 18px;font-weight:600;font-style:italic;",
		h2: "font-family:'Cormorant Garamond',serif;font-size:26px;color:#D4617A;line-height:1.3;margin:32px 0 12px;font-weight:600;",
		h3: "font-family:'Cormorant Garamond',serif;font-size:20px;color:#3D1A24;margin:22px 0 8px;font-weight:400;",
		p: "font-size:16px;line-height:1.9;color:#4A2530;margin:0 0 14px;",
		blockquote:
			"border-left:3px solid #D4617A;padding:4px 0 4px 20px;color:#B08090;font-style:italic;margin:20px 0;font-family:'Cormorant Garamond',serif;font-size:18px;",
		code: "background:#F5E0E5;border-radius:4px;padding:2px 6px;font-family:monospace;font-size:13px;",
		strong: "color:#3D1A24;font-weight:700;",
		a: "color:#D4617A;",
		li: "font-size:16px;line-height:1.8;color:#4A2530;margin:4px 0;",
		hr: "border:none;border-top:1px solid #F0C8D0;margin:32px 0;",
	},
	slate: {
		name: "Slate",
		label: "Corporate clean · IBM Plex",
		palette: ["#F8F9FA", "#1A1F2E", "#3B82F6", "#6B7280"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap",
		bodyFont: "'IBM Plex Sans', sans-serif",
		bg: "#F8F9FA",
		text: "#374151",
		container:
			"max-width:740px;margin:0 auto;padding:48px 56px;background:#F8F9FA;font-family:'IBM Plex Sans',sans-serif;",
		h1: "font-family:'IBM Plex Serif',serif;font-size:32px;color:#1A1F2E;line-height:1.2;margin:0 0 16px;font-weight:600;",
		h2: "font-family:'IBM Plex Serif',serif;font-size:21px;color:#1A1F2E;line-height:1.35;margin:32px 0 12px;font-weight:600;border-bottom:2px solid #E5E7EB;padding-bottom:8px;",
		h3: "font-family:'IBM Plex Sans',sans-serif;font-size:12px;color:#1A1F2E;margin:22px 0 8px;font-weight:600;text-transform:;letter-spacing:0.05em;",
		p: "font-size:16px;line-height:1.8;color:#374151;margin:0 0 14px;",
		blockquote:
			"border-left:4px solid #3B82F6;background:#EFF6FF;padding:12px 20px;color:#1D4ED8;margin:24px 0;font-style:italic;",
		code: "background:#F3F4F6;border:1px solid #E5E7EB;border-radius:4px;padding:2px 6px;font-family:'IBM Plex Mono',monospace;font-size:13px;color:#1A1F2E;",
		strong: "color:#1A1F2E;font-weight:600;",
		a: "color:#3B82F6;",
		li: "font-size:16px;line-height:1.8;color:#374151;margin:4px 0;",
		hr: "border:none;border-top:1px solid #E5E7EB;margin:32px 0;",
	},
	obsidian: {
		name: "Obsidian",
		label: "Terminal · JetBrains Mono",
		palette: ["#0F0F0F", "#00FF88", "#CCCCCC", "#444444"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap",
		bodyFont: "'JetBrains Mono', monospace",
		bg: "#0F0F0F",
		text: "#CCCCCC",
		container:
			"max-width:740px;margin:0 auto;padding:48px 52px;background:#0F0F0F;font-family:'JetBrains Mono',monospace;",
		h1: "font-family:'JetBrains Mono',monospace;font-size:24px;color:#00FF88;line-height:1.2;margin:0 0 16px;font-weight:500;",
		h2: "font-family:'JetBrains Mono',monospace;font-size:18px;color:#00FF88;line-height:1.3;margin:32px 0 12px;font-weight:400;",
		h3: "font-family:'JetBrains Mono',monospace;font-size:14px;color:#AAAAAA;margin:22px 0 8px;font-weight:400;",
		p: "font-size:14px;line-height:1.9;color:#CCCCCC;margin:0 0 14px;",
		blockquote:
			"border-left:3px solid #00FF88;padding:4px 0 4px 16px;color:#888888;font-style:italic;margin:20px 0;",
		code: "background:#1A1A1A;border:1px solid #333333;color:#00FF88;border-radius:3px;padding:2px 6px;font-family:'JetBrains Mono',monospace;font-size:13px;",
		strong: "color:#FFFFFF;font-weight:500;",
		a: "color:#00FF88;",
		li: "font-size:14px;line-height:1.8;color:#CCCCCC;margin:4px 0;",
		hr: "border:none;border-top:1px solid #222222;margin:32px 0;",
	},
	cream: {
		name: "Cream",
		label: "Newsletter · Georgia",
		palette: ["#FFF8EE", "#1A1A1A", "#EA580C", "#888888"],
		fontUrl: "",
		bodyFont: "Georgia, 'Times New Roman', serif",
		bg: "#FFF8EE",
		text: "#3A3A3A",
		container:
			"max-width:620px;margin:0 auto;padding:52px 48px;background:#FFF8EE;font-family:Georgia,'Times New Roman',serif;",
		h1: "font-family:Georgia,'Times New Roman',serif;font-size:34px;color:#1A1A1A;line-height:1.2;margin:0 0 18px;font-weight:normal;",
		h2: "font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1A1A1A;line-height:1.3;margin:32px 0 12px;font-weight:normal;",
		h3: "font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#1A1A1A;margin:22px 0 8px;",
		p: "font-size:17px;line-height:1.8;color:#3A3A3A;margin:0 0 16px;",
		blockquote:
			"border-left:4px solid #EA580C;padding:8px 0 8px 20px;color:#888888;font-style:italic;margin:24px 0;",
		code: "background:#F5EDD8;border-radius:3px;padding:2px 6px;font-family:monospace;font-size:13px;",
		strong: "color:#1A1A1A;",
		a: "color:#EA580C;",
		li: "font-size:17px;line-height:1.8;color:#3A3A3A;margin:5px 0;",
		hr: "border:none;border-top:2px solid #E8D8C0;margin:36px 0;",
	},
	nordic: {
		name: "Nordic",
		label: "Minimal white · Playfair",
		palette: ["#FFFFFF", "#1D3461", "#1D3461", "#8899AA"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Figtree:wght@300;400;500;600&display=swap",
		bodyFont: "'Figtree', sans-serif",
		bg: "#FFFFFF",
		text: "#444B58",
		container:
			"max-width:720px;margin:0 auto;padding:56px 60px;background:#FFFFFF;font-family:'Figtree',sans-serif;",
		h1: "font-family:'Playfair Display',serif;font-size:38px;color:#1D3461;line-height:1.15;margin:0 0 18px;font-weight:700;",
		h2: "font-family:'Playfair Display',serif;font-size:24px;color:#1D3461;line-height:1.3;margin:36px 0 14px;font-weight:400;",
		h3: "font-family:'Figtree',sans-serif;font-size:12px;color:#8899AA;margin:24px 0 8px;font-weight:600;letter-spacing:0.08em;text-transform:;",
		p: "font-size:16px;line-height:1.9;color:#444B58;margin:0 0 16px;",
		blockquote:
			"border-left:4px solid #1D3461;padding:8px 0 8px 24px;color:#8899AA;font-family:'Playfair Display',serif;font-style:italic;font-size:18px;margin:28px 0;",
		code: "background:#F4F5F8;border-radius:4px;padding:2px 8px;font-family:monospace;font-size:13px;color:#1D3461;",
		strong: "color:#1D3461;font-weight:600;",
		a: "color:#1D3461;border-bottom:1px solid #1D3461;text-decoration:none;",
		li: "font-size:16px;line-height:1.8;color:#444B58;margin:5px 0;",
		hr: "border:none;border-top:1px solid #E8ECF0;margin:40px 0;",
	},
	dusk: {
		name: "Dusk",
		label: "Dark purple · DM Serif",
		palette: ["#1E1B2E", "#F0EEFF", "#C084FC", "#7C6FA0"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap",
		bodyFont: "'DM Sans', sans-serif",
		bg: "#1E1B2E",
		text: "#C5BEDC",
		container:
			"max-width:720px;margin:0 auto;padding:48px 56px;background:#1E1B2E;font-family:'DM Sans',sans-serif;",
		h1: "font-family:'DM Serif Display',serif;font-size:36px;color:#F0EEFF;line-height:1.2;margin:0 0 16px;font-weight:400;",
		h2: "font-family:'DM Serif Display',serif;font-size:24px;color:#C084FC;line-height:1.3;margin:32px 0 12px;font-weight:400;",
		h3: "font-family:'DM Sans',sans-serif;font-size:14px;color:#9B8DC0;margin:22px 0 8px;font-weight:500;",
		p: "font-size:16px;line-height:1.9;color:#C5BEDC;margin:0 0 14px;",
		blockquote:
			"border-left:3px solid #C084FC;padding:4px 0 4px 20px;color:#7C6FA0;font-style:italic;margin:20px 0;",
		code: "background:#2A2540;color:#C084FC;border-radius:4px;padding:2px 8px;font-family:monospace;font-size:13px;",
		strong: "color:#F0EEFF;font-weight:500;",
		a: "color:#C084FC;",
		li: "font-size:16px;line-height:1.8;color:#C5BEDC;margin:4px 0;",
		hr: "border:none;border-top:1px solid #2E2A42;margin:32px 0;",
	},
	sand: {
		name: "Sand",
		label: "Notion-like · Jakarta Sans",
		palette: ["#FAF9F7", "#37352F", "#0078D4", "#9B9B9B"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap",
		bodyFont: "'Plus Jakarta Sans', sans-serif",
		bg: "#FAF9F7",
		text: "#37352F",
		container:
			"max-width:740px;margin:0 auto;padding:44px 48px;background:#FAF9F7;font-family:'Plus Jakarta Sans',sans-serif;",
		h1: "font-family:'Plus Jakarta Sans',sans-serif;font-size:30px;color:#37352F;line-height:1.2;margin:0 0 16px;font-weight:700;",
		h2: "font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;color:#37352F;line-height:1.35;margin:28px 0 10px;font-weight:600;",
		h3: "font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;color:#37352F;margin:20px 0 8px;font-weight:600;",
		p: "font-size:16px;line-height:1.75;color:#37352F;margin:0 0 8px;",
		blockquote:
			"border-left:3px solid #BDBDBD;padding:4px 0 4px 14px;color:#9B9B9B;margin:16px 0;",
		code: "background:#F1F0EE;border-radius:4px;padding:2px 6px;font-family:monospace;font-size:13px;color:#EB5757;",
		strong: "color:#37352F;font-weight:700;",
		a: "color:#0078D4;text-decoration:underline;",
		li: "font-size:16px;line-height:1.75;color:#37352F;margin:2px 0;",
		hr: "background:#E8E7E4;border:none;height:1px;margin:28px 0;",
	},
	bold: {
		name: "Bold",
		label: "Magazine editorial · Bebas",
		palette: ["#F5F5F5", "#111111", "#DC2626", "#666666"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto:ital,wght@0,400;0,500;1,400&display=swap",
		bodyFont: "'Roboto', sans-serif",
		bg: "#F5F5F5",
		text: "#333333",
		container:
			"max-width:740px;margin:0 auto;padding:48px 56px;background:#F5F5F5;font-family:'Roboto',sans-serif;",
		h1: "font-family:'Bebas Neue',sans-serif;font-size:56px;color:#111111;line-height:1.0;margin:0 0 20px;letter-spacing:0.03em;",
		h2: "font-family:'Bebas Neue',sans-serif;font-size:30px;color:#DC2626;line-height:1.1;margin:32px 0 14px;letter-spacing:0.05em;",
		h3: "font-family:'Roboto',sans-serif;font-size:12px;color:#111111;margin:22px 0 8px;font-weight:500;text-transform:;letter-spacing:0.1em;",
		p: "font-size:16px;line-height:1.8;color:#333333;margin:0 0 14px;",
		blockquote:
			"border-left:6px solid #DC2626;padding:12px 24px;background:#FFFFFF;color:#666666;font-size:20px;font-style:italic;margin:24px 0;",
		code: "background:#EBEBEB;border-radius:3px;padding:2px 6px;font-family:monospace;font-size:13px;",
		strong: "color:#111111;font-weight:700;",
		a: "color:#DC2626;",
		li: "font-size:16px;line-height:1.8;color:#333333;margin:4px 0;",
		hr: "border:none;border-top:3px solid #111111;margin:32px 0;",
	},
};

/* ─── Inline markdown → HTML (links, images, bold, italic, code) ─── */
const parseInlineMarkdown = (text = "") =>
	text
		/* images before links so ![...](...) doesn't match as a link */
		.replace(
			/!\[([^\]]*)\]\(([^)\s>]+)\)/g,
			(_, alt, src) =>
				`<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;border-radius:6px;margin:10px 0;display:block;"/>`,
		)
		/* links */
		.replace(
			/\[([^\]]+)\]\(([^)\s>]+)\)/g,
			(_, linkText, href) =>
				`<a href="${href}" target="_blank" rel="noopener">${linkText}</a>`,
		)
		/* bold **…** and __…__ */
		.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
		.replace(/__([^_\n]+)__/g, "<strong>$1</strong>")
		/* italic *…* (single asterisk only — skip _…_ to avoid false-positives in URLs/CSS) */
		.replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
		/* inline code */
		.replace(/`([^`\n]+)`/g, "<code>$1</code>")
		/* strikethrough ~~…~~ */
		.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");

/** Strip editor-only attributes; keep markup for preview iframe. */
function cloneBlockHtmlForPreview(node) {
	if (!node?.cloneNode) return "";
	const el = node.cloneNode(true);
	el.querySelectorAll("[contenteditable]").forEach((n) =>
		n.removeAttribute("contenteditable"),
	);
	return el.outerHTML;
}

const PREVIEW_INTERACTION_SCRIPT = `(function(){
document.addEventListener("click",function(e){
  var raw=e.target;
  if(!raw)return;
  var t=raw.nodeType===1?raw:raw.parentElement;
  if(!t||!t.closest)return;
  var copyBtn=t.closest("[data-action=\\"copy-code\\"]");
  if(copyBtn){
    e.preventDefault();
    var block=copyBtn.closest('[data-block="code"]');
    var code=block&&block.querySelector("code");
    if(code){
      var txt=code.innerText||"";
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(txt).catch(function(){});
      }
      var prev=copyBtn.textContent;
      copyBtn.textContent="Copied!";
      copyBtn.style.color="#10B981";
      copyBtn.style.borderColor="#10B981";
      setTimeout(function(){
        copyBtn.textContent=prev;
        copyBtn.style.color="";
        copyBtn.style.borderColor="";
      },1800);
    }
    return;
  }
  var draftTab=t.closest("[data-action=\\"draft-tab\\"]");
  if(draftTab){
    e.preventDefault();
    var w=draftTab.closest('[data-block="tabs"]');
    if(!w)return;
    var idx=draftTab.getAttribute("data-tab-idx");
    w.querySelectorAll("[data-draft-panel]").forEach(function(p){
      p.style.display=p.getAttribute("data-draft-panel")===idx?"block":"none";
    });
    w.querySelectorAll("[data-action=\\"draft-tab\\"]").forEach(function(b){
      var on=b.getAttribute("data-tab-idx")===idx;
      b.style.background=on?"#fff":"transparent";
      b.style.boxShadow=on?"0 1px 2px rgba(0,0,0,0.06)":"none";
      b.style.fontWeight=on?"600":"500";
      b.style.color=on?"#37352F":"#7A7570";
    });
    return;
  }
  var cgTab=t.closest("[data-action=\\"cg-tab\\"]");
  if(cgTab){
    e.preventDefault();
    var cg=cgTab.closest('[data-block="code-group"]');
    if(!cg)return;
    var ci=cgTab.getAttribute("data-cg-idx");
    cg.querySelectorAll("[data-cg-panel]").forEach(function(p){
      p.style.display=p.getAttribute("data-cg-panel")===ci?"block":"none";
    });
    cg.querySelectorAll("[data-action=\\"cg-tab\\"]").forEach(function(b){
      var on=b.getAttribute("data-cg-idx")===ci;
      b.style.background=on?"#fff":"transparent";
      b.style.fontWeight=on?"700":"600";
      b.style.color=on?"#37352F":"#6B6560";
    });
  }
});
})();`;

const PREVIEW_TOGGLE_CSS = `
    details[data-block="draft-toggle"] summary::-webkit-details-marker { display: none; }
    details[data-block="draft-toggle"] summary { list-style: none; }
    details[data-block="draft-toggle"] summary::marker { display: none; }
    details[data-block="draft-toggle"] [data-toggle-chevron] {
      flex-shrink: 0; width: 22px; height: 22px; border-radius: 5px;
      background: rgba(193,123,47,0.12); display: inline-flex;
      align-items: center; justify-content: center;
      transform: rotate(0deg); transition: transform 0.18s ease;
    }
    details[data-block="draft-toggle"] [data-toggle-chevron]::before {
      content: ""; display: block; width: 0; height: 0;
      border-style: solid; border-width: 5px 0 5px 7px;
      border-color: transparent transparent transparent #6B6560;
      margin-left: 2px;
    }
    details[data-block="draft-toggle"][open] [data-toggle-chevron] { transform: rotate(90deg); }
    details[data-block="draft-toggle"] [data-toggle-grip] {
      flex-shrink: 0; min-width: 22px; height: 22px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    details[data-block="draft-toggle"] [data-toggle-grip]::before {
      content: "\\2026"; font-weight: 700; color: #A8A29E;
      font-size: 15px; line-height: 1; letter-spacing: 0.02em;
    }`;

/* ─── Build a complete standalone HTML document with theme applied ─── */
function buildThemedHTML(currentHTML = "", theme, title = "") {
	if (!currentHTML.trim()) return "";

	/* Get inner content of a node and run inline markdown on it */
	const getInner = (node) =>
		parseInlineMarkdown(node.innerHTML || node.textContent || "");

	let body = "";
	try {
		const tmp = document.createElement("div");
		tmp.innerHTML = currentHTML;

		const processNode = (node) => {
			const tag = node.nodeName?.toLowerCase();
			if (!tag || tag === "#text") {
				const t = (node.textContent || "").trim();
				return t ? parseInlineMarkdown(t) : "";
			}
			const inner = getInner(node);
			const text = (node.textContent || "").trim();

			if (tag === "h1") return `<h1 style="${theme.h1}">${inner}</h1>\n`;
			if (tag === "h2") return `<h2 style="${theme.h2}">${inner}</h2>\n`;
			if (tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6")
				return `<h3 style="${theme.h3}">${inner}</h3>\n`;
			if (tag === "blockquote") {
				if (node.getAttribute("data-block") === "quote")
					return `${cloneBlockHtmlForPreview(node)}\n`;
				return `<blockquote style="${theme.blockquote}">${inner}</blockquote>\n`;
			}
			if (tag === "ul" || tag === "ol") {
				const isTask =
					node.getAttribute("data-todo") === "true" ||
					node.getAttribute("data-type") === "taskList";
				const items = Array.from(node.children)
					.filter((n) => n.nodeName?.toLowerCase() === "li")
					.map((li) => {
						if (isTask) {
							const cb = li.querySelector('input[type="checkbox"]');
							const checked = cb?.hasAttribute("checked") || cb?.checked;
							const clone = li.cloneNode(true);
							const rm = clone.querySelectorAll("input");
							rm.forEach((n) => n.remove());
							const innerLi = parseInlineMarkdown(clone.innerHTML || "");
							const box = checked
								? `<input type="checkbox" checked disabled style="margin:4px 8px 0 0;flex-shrink:0"/>`
								: `<input type="checkbox" disabled style="margin:4px 8px 0 0;flex-shrink:0"/>`;
							return `<li style="${theme.li};list-style:none;display:flex;align-items:flex-start;padding-left:0">${box}<span style="flex:1">${innerLi}</span></li>`;
						}
						return `<li style="${theme.li}">${parseInlineMarkdown(li.innerHTML || "")}</li>`;
					})
					.join("\n");
				const listStyle = isTask
					? "list-style:none;padding-left:0;margin:0 0 14px;"
					: "padding-left:24px;margin:0 0 14px;";
				return `<${tag} style="${listStyle}">${items}</${tag}>\n`;
			}
			if (tag === "pre")
				return `<pre style="background:rgba(0,0,0,0.06);padding:16px 20px;border-radius:6px;overflow:auto;margin:0 0 16px;font-family:monospace;font-size:13px;line-height:1.6;">${node.textContent || ""}</pre>\n`;
			if (tag === "hr") return `<hr style="${theme.hr}"/>\n`;
			if (
				tag === "figure" &&
				node.getAttribute("data-draft-image-wrap") != null
			) {
				const img =
					node.querySelector("img[data-draft-img]") ||
					node.querySelector("img");
				if (!img) return "";
				const src = img.getAttribute("src") || "";
				const alt = img.getAttribute("alt") || "";
				const capEl = node.querySelector("[data-draft-caption]");
				const captionHtml = capEl?.innerHTML?.trim()
					? parseInlineMarkdown(capEl.innerHTML.trim())
					: "";
				const allowedFit = new Set([
					"contain",
					"cover",
					"fill",
					"scale-down",
				]);
				const fitRaw = (img.style.objectFit || "contain")
					.trim()
					.toLowerCase();
				const fit = allowedFit.has(fitRaw) ? fitRaw : "contain";
				const frame = node.querySelector("[data-draft-image-frame]");
				let wPart = "width:100%;max-width:100%";
				if (frame?.style?.width) {
					wPart = `width:${frame.style.width};max-width:100%`;
				}
				let imgStyle = `width:100%;height:auto;display:block;border-radius:8px;object-fit:${fit};object-position:center`;
				const minH = (img.style.minHeight || "").trim();
				if (minH) imgStyle += `;min-height:${minH}`;
				else if (fit === "cover") imgStyle += ";min-height:240px";
				const capBlock = captionHtml
					? `<figcaption style="margin-top:10px;font-size:12px;line-height:1.5;color:#7A7570;text-align:center;max-width:520px;margin-left:auto;margin-right:auto">${captionHtml}</figcaption>`
					: "";
				return `<figure style="margin:20px auto;text-align:center;max-width:100%"><div style="${wPart};margin-left:auto;margin-right:auto;border-radius:8px;overflow:hidden;line-height:0"><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" style="${imgStyle}"/></div>${capBlock}</figure>\n`;
			}
			if (tag === "figure") {
				return Array.from(node.childNodes).map(processNode).join("");
			}
			if (tag === "img")
				return `<img src="${node.getAttribute("src") || ""}" alt="${node.getAttribute("alt") || ""}" style="max-width:100%;height:auto;border-radius:6px;margin:12px 0;display:block;"/>\n`;
			if (tag === "video") {
				const src = node.getAttribute("src") || "";
				return `<p style="margin:16px 0"><video src="${src}" controls style="max-width:100%;border-radius:8px;display:block;"></video></p>\n`;
			}
			if (tag === "iframe") {
				const src = node.getAttribute("src") || "";
				return `<p style="${theme.p}"><iframe src="${src}" title="Embedded content" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen="" style="max-width:100%;aspect-ratio:16/9;height:auto;min-height:200px;border:0;border-radius:8px;width:100%"></iframe></p>\n`;
			}
			if (tag === "table") return `${node.outerHTML}\n`;
			if (tag === "div" && node.getAttribute("data-block"))
				return `${cloneBlockHtmlForPreview(node)}\n`;
			if (tag === "details" && node.getAttribute("data-block") === "draft-toggle")
				return `${cloneBlockHtmlForPreview(node)}\n`;
			if (tag === "p") {
				const rawInner = node.innerHTML || "";
				if (/<iframe\b/i.test(rawInner) || /<video\b/i.test(rawInner))
					return `<p style="${theme.p}">${rawInner}</p>\n`;
				return `<p style="${theme.p}">${inner}</p>\n`;
			}
			if (tag === "div") {
				const frag = Array.from(node.childNodes).map(processNode).join("");
				if (frag.trim()) return frag;
				if (!text) return "";
				return `<p style="${theme.p}">${inner}</p>\n`;
			}
			if (tag === "section" || tag === "article") {
				return Array.from(node.childNodes).map(processNode).join("");
			}
			if (tag === "br") return `<br/>\n`;
			if (!text) return "";
			return `<p style="${theme.p}">${inner}</p>\n`;
		};

		tmp.childNodes.forEach((node) => {
			body += processNode(node);
		});
	} catch {
		body = `<p style="${theme.p}">${parseInlineMarkdown(currentHTML.replace(/<[^>]+>/g, ""))}</p>`;
	}

	const fontLink = theme.fontUrl
		? `<link href="${theme.fontUrl}" rel="stylesheet"/>`
		: "";

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title || "Draft"}</title>
  ${fontLink}
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:${theme.bg};color:${theme.text};font-family:${theme.bodyFont};-webkit-font-smoothing:antialiased;}
    a{${theme.a}}
    strong,b{${theme.strong}}
    em,i{font-style:italic;}
    code{${theme.code}}
    img,video{max-width:100%;height:auto;border-radius:6px;}
    ul,ol{padding-left:24px;margin:0 0 14px;}
    li{${theme.li}}
    hr{${theme.hr}}
    blockquote{${theme.blockquote}}
    pre{background:rgba(0,0,0,0.06);padding:16px 20px;border-radius:6px;overflow:auto;margin:0 0 16px;font-family:monospace;font-size:13px;line-height:1.6;}
    iframe{display:block;max-width:100%;border:0;border-radius:8px;}
    table{border-collapse:collapse;width:100%;margin:16px 0;}
    ${PREVIEW_TOGGLE_CSS}
  </style>
</head>
<body>
  <div style="${theme.container}">
    ${title ? `<h1 style="${theme.h1}">${title}</h1>` : ""}
    ${body}
  </div>
  <script>${PREVIEW_INTERACTION_SCRIPT}</script>
</body>
</html>`;
}

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
	return `<div data-block="callout-${type}" style="border-left:4px solid ${c.border};background:${c.bg};border-radius:0 8px 8px 0;padding:13px 16px;margin:14px 0;display:flex;gap:12px;align-items:flex-start"><span style="font-size:17px;flex-shrink:0;line-height:1.6;margin-top:2px">${c.emoji}</span><div style="flex:1"><p style="font-weight:700;color:${c.textColor};font-size:10.5px;text-transform:;letter-spacing:0.1em;margin:0 0 5px;font-family:'Outfit',sans-serif">${c.label}</p><div style="color:${c.textColor};font-size:14px;line-height:1.65;font-family:'Outfit',sans-serif">${text}</div></div></div>`;
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
	return `<div data-block="code" style="margin:16px 0;border-radius:10px;overflow:hidden;border:1px solid #E8E4DC"><div contenteditable="false" style="background:#F0ECE5;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #E8E4DC;user-select:none"><select data-action="change-lang" style="background:none;border:none;font-size:11px;font-weight:700;color:#5A5550;text-transform:;letter-spacing:0.06em;cursor:pointer;outline:none;font-family:'Outfit',sans-serif">${opts}</select><button data-action="copy-code" style="background:#FFFFFF;border:1px solid #E8E4DC;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600;color:#7A7570;cursor:pointer;font-family:'Outfit',sans-serif;transition:all 0.15s">Copy</button></div><pre style="background:#1A1A1A;margin:0;padding:18px 20px;overflow-x:auto"><code style="color:#E8D5B0;font-family:'Fira Code','Cascadia Code','Courier New',monospace;font-size:13px;line-height:1.75;white-space:pre;display:block">${code}</code></pre></div>`;
}

function makeButtonBlockHtml(text = "Click here →", href = "#") {
	return `<p style="margin:16px 0"><a href="${href}" style="display:inline-block;background:#C17B2F;color:#FFFFFF;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;font-family:'Outfit',sans-serif;letter-spacing:0.01em">${text}</a></p>`;
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

function getDraftBlockFromSelection(editorRoot, range) {
	if (!editorRoot || !range) return null;
	let n = range.commonAncestorContainer;
	if (n.nodeType === 3) n = n.parentElement;
	const block = n?.closest?.("p,h1,h2,h3,h4,li,blockquote,div[data-block]");
	if (!block || !editorRoot.contains(block)) return null;
	return block;
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
			"pre, code, summary, [contenteditable='false']",
		)
	) {
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

function youtubeIdFromUrl(raw) {
	try {
		const u = String(raw || "").trim();
		if (!u) return null;
		const tryUrl = new URL(u.includes("://") ? u : `https://${u}`);
		const host = tryUrl.hostname.replace(/^www\./, "");
		if (host === "youtu.be") {
			const id = tryUrl.pathname.replace(/^\//, "").split("/")[0];
			return id || null;
		}
		if (host.includes("youtube.com")) {
			const v = tryUrl.searchParams.get("v");
			if (v) return v;
			const embed = tryUrl.pathname.match(/\/embed\/([^/]+)/);
			if (embed) return embed[1];
			const shorts = tryUrl.pathname.match(/\/shorts\/([^/]+)/);
			if (shorts) return shorts[1];
		}
	} catch {
		/* ignore */
	}
	return null;
}

function makeEmbedIframeHtml(videoId) {
	if (!videoId) return "";
	const src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
	return `<p style="margin:16px 0"><iframe src="${src}" width="560" height="315" style="max-width:100%;aspect-ratio:16/9;height:auto;min-height:200px;border:0;border-radius:8px" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></p>`;
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

function makeDraftDividerHtml() {
	return `<hr style="border:none;border-top:1px solid #E8E4DC;margin:20px 0" /><p><br></p>`;
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
const DRAFT_SLASH_BASE_ITEMS = [
	{
		id: "text",
		label: "Text",
		icon: "T",
		section: "style",
		keywords: ["text", "paragraph", "p", "plain", "body"],
	},
	{
		id: "h1",
		label: "Heading 1",
		icon: "H₁",
		section: "style",
		keywords: ["h1", "heading", "title", "one", "1"],
	},
	{
		id: "h2",
		label: "Heading 2",
		icon: "H₂",
		section: "style",
		keywords: ["h2", "heading", "two", "subtitle", "2"],
	},
	{
		id: "h3",
		label: "Heading 3",
		icon: "H₃",
		section: "style",
		keywords: ["h3", "heading", "three", "3"],
	},
	{
		id: "bullet",
		label: "Bullet List",
		icon: "list",
		section: "style",
		keywords: ["bullet", "ul", "unordered", "list"],
	},
	{
		id: "numbered",
		label: "Numbered List",
		icon: "list",
		section: "style",
		keywords: ["numbered", "ordered", "ol", "list"],
	},
	{
		id: "todo",
		label: "To-do list",
		icon: "☐",
		section: "style",
		keywords: [
			"todo",
			"task",
			"check",
			"list",
			"checkout",
			"checkbox",
			"checklist",
		],
	},
	{
		id: "quote",
		label: "Quote",
		icon: "❝",
		section: "style",
		keywords: ["quote", "blockquote", "pull", "bq"],
	},
	{
		id: "image",
		label: "Image",
		icon: "image",
		section: "blocks",
		keywords: ["image", "img", "photo", "picture", "upload"],
	},
	{
		id: "table",
		label: "Table",
		icon: "table",
		section: "blocks",
		keywords: ["table", "grid", "rows", "sheet", "csv"],
	},
	{
		id: "embed",
		label: "Embed (YouTube)",
		icon: "embed",
		section: "blocks",
		keywords: ["embed", "youtube", "video", "iframe", "movie"],
	},
	{
		id: "divider",
		label: "Divider",
		icon: "—",
		section: "blocks",
		keywords: ["divider", "horizontal", "hr", "rule", "separator", "---"],
	},
	{
		id: "code",
		label: "Code block",
		icon: "{ }",
		section: "blocks",
		keywords: ["code", "codeblock", "snippet", "pre", "program"],
	},
	{
		id: "codeGroup",
		label: "Code group",
		icon: "▤",
		section: "blocks",
		keywords: ["codegroup", "code group", "snippets", "multi", "gist"],
	},
	{
		id: "tabs",
		label: "Tabs",
		icon: "▦",
		section: "blocks",
		keywords: ["tabs", "tab", "panels", "tabgroup"],
	},
	{
		id: "toggle",
		label: "Toggle",
		icon: "▸",
		section: "blocks",
		keywords: ["toggle", "details", "collapse", "accordion", "disclosure"],
	},
	{
		id: "callout-info",
		label: "Info callout",
		icon: "ℹ️",
		section: "blocks",
		keywords: ["info", "information", "note", "blue", "tip"],
	},
	{
		id: "callout-warning",
		label: "Callout",
		icon: "⚠️",
		section: "blocks",
		keywords: ["callout", "warning", "caution", "yellow", "attention"],
	},
	{
		id: "callout-success",
		label: "Success callout",
		icon: "✅",
		section: "blocks",
		keywords: ["success", "done", "green", "check", "positive"],
	},
	{
		id: "callout-danger",
		label: "Danger callout",
		icon: "🚨",
		section: "blocks",
		keywords: ["danger", "error", "red", "alert", "critical", "block"],
	},
	{
		id: "date",
		label: "Date",
		icon: "📅",
		section: "blocks",
		keywords: ["date", "today", "calendar", "time"],
	},
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
		if (it.section === "style" && draftSlashItemMatchesQuery(it, q)) {
			rows.push({ id: it.id });
		}
	}
	for (const it of DRAFT_SLASH_BASE_ITEMS) {
		if (it.section === "blocks" && draftSlashItemMatchesQuery(it, q)) {
			rows.push({ id: it.id });
		}
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
	const [copiedTheme, setCopiedTheme] = useState(null); // { key, format: 'html' | 'react' }
	const [previewTheme, setPreviewTheme] = useState("ink");
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
	const [draftSlashDatePickerPos, setDraftSlashDatePickerPos] = useState(null);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewCopied, setPreviewCopied] = useState(null);
	const [previewExportOpen, setPreviewExportOpen] = useState(false);
	const previewExportRef = useRef(null);
	const [previewData, setPreviewData] = useState({
		title: "",
		htmlDoc: "",
		markdown: "",
		reactSnippet: "",
	});
	const [editorFont, setEditorFont] = useState("Outfit");
	const [editorFontSize, setEditorFontSize] = useState(15);
	const [localTableData, setLocalTableData] = useState(null);
	const editorRef = useRef(null);
	const titleRef = useRef(null);
	const imageFileInputRef = useRef(null);
	const handleSlashCommandRef = useRef(() => {});
	const editorContainerRef = useRef(null);

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
			"font-family:'Outfit',sans-serif;font-size:26px;color:#1A1A1A;margin:24px 0 10px;line-height:1.2;font-weight:700";
		const h2Style =
			"font-family:'Outfit',sans-serif;font-size:20px;color:#1A1A1A;margin:20px 0 8px;line-height:1.3;font-weight:650";
		const h3Style =
			"font-family:'Outfit',sans-serif;font-size:17px;color:#1A1A1A;margin:16px 0 7px;font-weight:600";
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

	const countWords = () => {
		const text = editorRef.current?.innerText || "";
		setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
	};

	const onEditorInput = () => {
		normalizeTodoLists(editorRef.current);
		syncDraftSlashQueryHighlight(editorRef.current);
		countWords();
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
		document.addEventListener("mousedown", onDocMouseDown);
		el.addEventListener("click", handleClick);
		el.addEventListener("change", handleChange);
		return () => {
			document.removeEventListener("mousedown", onDocMouseDown);
			el.removeEventListener("click", handleClick);
			el.removeEventListener("change", handleChange);
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

	const insertDraftDateAtCursor = (d) => {
		if (!editorRef.current) return;
		editorRef.current.focus();

		const sel = window.getSelection();
		if (sel?.rangeCount) {
			const range = sel.getRangeAt(0);
			const block = getDraftBlockFromSelection(editorRef.current, range);
			if (block) {
				const text = getTextFromBlockStartToCaret(block, range);
				const slash = matchDraftSlashQuery(text);
				if (slash) {
					deleteDraftSlashToken(block, range, slash.slashToken.length);
				}
			}
		}

		const label = formatInkDateLong(d);
		if (!label) {
			setDraftSlashDatePickerPos(null);
			return;
		}
		const safe = label
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
		document.execCommand(
			"insertHTML",
			false,
			`<span data-ink-date style="color:#C17B2F;font-weight:600">${safe}</span>`,
		);
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
				makeDraftDividerHtml().replace(/<p><br><\/p>\s*$/, ""),
			);
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
			const raw =
				typeof window !== "undefined"
					? window.prompt("Paste a YouTube link")
					: "";
			const id = youtubeIdFromUrl(raw);
			if (id) {
				document.execCommand("insertHTML", false, makeEmbedIframeHtml(id));
			}
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
							marginLeft: 120,
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
										borderTopLeftRadius: 8,
										borderTopRightRadius: 8,
										borderBottomRightRadius: 0,
										borderBottomLeftRadius: 0,
										background: isActive ? T.warmBg : "transparent",
										borderTop: `1px solid ${isActive ? T.border : "transparent"}`,
										borderLeft: `1px solid ${isActive ? T.border : "transparent"}`,
										borderRight: `1px solid ${isActive ? T.border : "transparent"}`,
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

				{/* Right side: Credits | Upgrade | New draft | User */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 10,
						flexShrink: 0,
					}}
				>
					{reduxUser && (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								background: creditRemaining === 0 ? "#FEF3E2" : T.base,
								border: `1px solid ${creditRemaining === 0 ? "#F5C97A" : T.border}`,
								borderRadius: 100,
								padding: "4px 12px",
							}}
						>
							{credits?.plan === "pro" ? (
								<span style={{ fontSize: 12, color: T.warm, fontWeight: 700 }}>
									∞ Pro
								</span>
							) : (
								<span style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>
									<span
										style={{
											fontWeight: 700,
											color: creditRemaining === 0 ? "#EF4444" : T.accent,
										}}
									>
										{credits
											? `${credits.creditsUsed.toFixed(2).replace(/\.?0+$/, "")}/${credits.creditsLimit}`
											: `0/${FREE_CREDIT_LIMIT}`}
									</span>
								</span>
							)}
						</div>
					)}
					{reduxUser && (
						<motion.button
							whileHover={{ scale: 1.04 }}
							whileTap={{ scale: 0.97 }}
							onClick={() => router.push("/pricing")}
							style={{
								background: T.accent,
								color: "white",
								border: "none",
								padding: "6px 12px",
								borderRadius: 8,
								fontSize: 12,
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							{credits?.plan === "pro" ? "Manage" : "Upgrade"}
						</motion.button>
					)}
					{/* New draft button */}
					<motion.button
						whileHover={{
							scale: 1.03,
							y: -1,
							boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
						}}
						whileTap={{ scale: 0.97 }}
						onClick={() => router.push("/app")}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							background: T.accent,
							color: "white",
							border: "none",
							padding: "6px 12px",
							borderRadius: 9,
							fontSize: 12,
							fontWeight: 600,
							cursor: "pointer",
						}}
					>
						<Icon d={Icons.plus} size={14} stroke="white" /> New draft
					</motion.button>

					{/* User avatar / login */}
					<motion.button
						whileHover={{ scale: 1.08 }}
						whileTap={{ scale: 0.95 }}
						onClick={() => setLoginModalOpen(true)}
						style={{
							background: "none",
							border: "none",
							padding: 0,
							cursor: "pointer",
							borderRadius: "50%",
						}}
					>
						{reduxUser?.photoURL ? (
							<img
								src={reduxUser.photoURL}
								alt={reduxUser.displayName || "User"}
								style={{
									width: 34,
									height: 34,
									borderRadius: "50%",
									objectFit: "cover",
									border: `2px solid ${T.border}`,
									display: "block",
								}}
							/>
						) : (
							<div
								style={{
									width: 34,
									height: 34,
									borderRadius: "50%",
									background: T.border,
									border: `2px solid ${T.border}`,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<Icon d={Icons.settings} size={16} stroke={T.muted} />
							</div>
						)}
					</motion.button>
					<LoginModal
						isOpen={loginModalOpen}
						onClose={() => setLoginModalOpen(false)}
					/>
				</div>
			</div>

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
								{/* Search */}
								<div style={{ position: "relative" }}>
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
													color: T.warm,
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

							{/* Sidebar footer */}
							<div
								style={{
									padding: "12px 14px",
									borderTop: `1px solid ${T.border}`,
									flexShrink: 0,
								}}
							>
								<motion.div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 8,
										cursor: "pointer",
									}}
									onClick={() => setLoginModalOpen(true)}
									whileHover={{ opacity: 0.8 }}
								>
									{reduxUser?.photoURL ? (
										<img
											src={reduxUser.photoURL}
											alt={reduxUser.displayName || "User"}
											style={{
												width: 28,
												height: 28,
												borderRadius: "50%",
												objectFit: "cover",
												flexShrink: 0,
											}}
										/>
									) : (
										<div
											style={{
												width: 28,
												height: 28,
												borderRadius: "50%",
												background: T.border,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												flexShrink: 0,
											}}
										>
											<Icon d={Icons.settings} size={13} stroke={T.muted} />
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
											}}
										>
											{reduxUser?.displayName || "Sign in"}
										</p>
										<p
											style={{
												fontSize: 11,
												color: T.muted,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{reduxUser?.email || "Click to log in"}
										</p>
									</div>
									{reduxUser && (
										<span
											style={{
												fontSize: 10.5,
												fontWeight: 700,
												background: "#FEF3E2",
												color: "#92400E",
												padding: "2px 8px",
												borderRadius: 100,
												flexShrink: 0,
											}}
										>
											FREE
										</span>
									)}
								</motion.div>
							</div>
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
						!tableDoc &&
						!infographicsDoc &&
						!landingPageDoc &&
						!imageGalleryDoc &&
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
								<motion.div
									animate={{ opacity: [0.4, 1, 0.4] }}
									transition={{ duration: 1.2, repeat: Infinity }}
									style={{ fontSize: 13, color: T.muted }}
								>
									Loading…
								</motion.div>
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
							{/* Editor top bar */}
							<div
								style={{
									padding: "12px 24px",
									borderBottom: `1px solid ${T.border}`,
									background: T.surface,
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									gap: 8,
									flexShrink: 0,
								}}
							>

								<div className="flex items-center gap-2">
									{/* ── Inline draft meta ── */}
								{draft?.tag && (
									<span
										style={{
											fontSize: 11,
											fontWeight: 700,
											background: "#F0ECE5",
											color: T.muted,
											padding: "2px 8px",
											borderRadius: 100,
											whiteSpace: "nowrap",
										}}
									>
										{draft.tag}
									</span>
								)}
								{draft?.style && (
									<span
										style={{
											fontSize: 11,
											fontWeight: 600,
											background: "#FEF3E2",
											color: T.warm,
											padding: "2px 8px",
											borderRadius: 100,
											textTransform: "capitalize",
											whiteSpace: "nowrap",
										}}
									>
										{draft.style}
									</span>
								)}
								{draft?.date && (
									<span
										style={{
											fontSize: 11,
											color: T.muted,
											whiteSpace: "nowrap",
										}}
									>
										{draft.date}
									</span>
								)}
								{sourceUrl && (
									<>
										<div
											style={{ width: 1, height: 14, background: T.border }}
										/>
										<a
											href={sourceUrl}
											target="_blank"
											rel="noopener noreferrer"
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: 4,
												fontSize: 11,
												color: T.warm,
												textDecoration: "none",
												whiteSpace: "nowrap",
												maxWidth: 160,
												overflow: "hidden",
												textOverflow: "ellipsis",
											}}
											title={sourceUrl}
										>
											<Icon d={Icons.link2} size={11} stroke={T.warm} />
											{(() => {
												try {
													return new URL(sourceUrl).hostname.replace(
														/^www\./,
														"",
													);
												} catch {
													return sourceUrl.slice(0, 30);
												}
											})()}
										</a>
									</>
								)}
								{assetPrompt && (
									<>
										<div
											style={{ width: 1, height: 14, background: T.border }}
										/>
										<span
											style={{
												fontSize: 11,
												color: T.muted,
												maxWidth: 200,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
											title={assetPrompt}
										>
											{assetPrompt.length > 40
												? assetPrompt.slice(0, 37) + "…"
												: assetPrompt}
										</span>
									</>
								)}
								</div>

								
								<div className="flex items-center gap-2">
									{/* Actions */}
								<motion.button
									whileHover={{ background: "#F0ECE5" }}
									whileTap={{ scale: 0.96 }}
									onClick={handleCopy}
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
										color: copied ? "#3D7A35" : T.muted,
										cursor: "pointer",
										transition: "all 0.18s",
									}}
								>
									<Icon
										d={Icons.copy}
										size={13}
										stroke={copied ? "#3D7A35" : T.muted}
									/>
									{copied ? "Copied!" : "Copy"}
								</motion.button>
								<motion.button
									whileHover={{ background: "#F0ECE5" }}
									whileTap={{ scale: 0.96 }}
									onClick={() => {
										const raw = stripDraftSlashQueryFromHtmlString(
											editorRef.current?.innerHTML || draft?.body || "",
										);
										const content = raw.trim().startsWith("<")
											? raw
											: formatBody(raw);
										const title =
											titleRef.current?.innerText?.trim() ||
											draft?.title ||
											"Untitled draft";
										const htmlDoc = buildThemedHTML(content, THEMES.ink, title);
										const markdown = htmlToMarkdown(content) || "";
										const reactSnippet = buildThemedReactSnippet(
											content,
											"ink",
											title,
										);
										setPreviewData({
											title,
											htmlDoc,
											markdown,
											reactSnippet,
										});
										setPreviewOpen(true);
									}}
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
										transition: "all 0.18s",
									}}
								>
									<Icon d={Icons.eye} size={13} stroke={T.muted} />
									Preview
								</motion.button>
								<motion.button
									whileHover={{
										scale: 1.03,
										y: -1,
										boxShadow: "0 4px 12px rgba(0,0,0,0.14)",
									}}
									whileTap={{ scale: 0.96 }}
									onClick={handleSave}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 6,
										background: saved ? "#EFF6EE" : T.accent,
										border: "none",
										borderRadius: 8,
										padding: "6px 14px",
										fontSize: 12,
										fontWeight: 700,
										color: saved ? "#3D7A35" : "white",
										cursor: "pointer",
										transition: "all 0.2s",
									}}
								>
									<Icon
										d={Icons.save}
										size={13}
										stroke={saved ? "#3D7A35" : "white"}
									/>
									{saved ? "Saved!" : "Save draft"}
								</motion.button>
								</div>
							</div>

							<div className="overflow-y-auto flex flex-col h-full">
								{/* Draft title */}
								<div
									style={{
										padding: "16px 40px 14px",
										background: T.surface,
										borderBottom: `1px solid ${T.border}`,
										flexShrink: 0,
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											gap: 12,
											flexWrap: "wrap",
										}}
									>
										<div
											ref={titleRef}
											contentEditable
											suppressContentEditableWarning
											data-placeholder="Untitled draft"
											style={{
												flex: 1,
												minWidth: 120,
												fontSize: "clamp(22px, 3vw, 30px)",
												color: T.accent,
												lineHeight: 1.2,
												letterSpacing: "-0.5px",
												outline: "none",
												marginBottom: 8,
												minHeight: 36,
												fontFamily:
													editorFont === "Inter"
														? "'Inter', sans-serif"
														: editorFont === "Georgia"
															? "Georgia, serif"
															: editorFont === "system-ui"
																? "system-ui, sans-serif"
																: "'Comic', sans-serif",
											}}
											dangerouslySetInnerHTML={{ __html: draft?.title || "" }}
										/>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: 6,
												marginBottom: 8,
											}}
										>
											{/* Font family */}
											<select
												value={editorFont}
												onChange={(e) => setEditorFont(e.target.value)}
												style={{
													padding: "4px 8px",
													border: `1px solid ${T.border}`,
													borderRadius: 6,
													fontSize: 11,
													fontWeight: 600,
													background: T.base,
													color: T.accent,
													cursor: "pointer",
													fontFamily: "inherit",
												}}
											>
												<option value="Outfit">Outfit</option>
												<option value="Inter">Inter</option>
												<option value="Georgia">Georgia</option>
												<option value="system-ui">System</option>
											</select>
											{/* Font size */}
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 2,
												}}
											>
												<motion.button
													whileHover={{ background: "#F0ECE5" }}
													whileTap={{ scale: 0.95 }}
													onClick={() =>
														setEditorFontSize((s) => Math.max(12, s - 2))
													}
													style={{
														width: 26,
														height: 26,
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														border: `1px solid ${T.border}`,
														borderRadius: 6,
														background: T.base,
														fontSize: 12,
														fontWeight: 700,
														color: T.accent,
														cursor: "pointer",
													}}
												>
													A-
												</motion.button>
												<motion.button
													whileHover={{ background: "#F0ECE5" }}
													whileTap={{ scale: 0.95 }}
													onClick={() =>
														setEditorFontSize((s) => Math.min(24, s + 2))
													}
													style={{
														width: 26,
														height: 26,
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														border: `1px solid ${T.border}`,
														borderRadius: 6,
														background: T.base,
														fontSize: 12,
														fontWeight: 700,
														color: T.accent,
														cursor: "pointer",
													}}
												>
													A+
												</motion.button>
											</div>
										</div>
									</div>
								</div>

								{/* Editor body */}
								<div
									ref={editorContainerRef}
									data-editor-root
									style={{
										flex: 1,
										overflowY: "auto",
										background: T.surface,
										position: "relative",
									}}
								>
									<style>{`
										[data-editor-root] [contenteditable="true"] { font-size: ${editorFontSize}px; }
										[data-editor-root] [contenteditable="true"] p,
										[data-editor-root] [contenteditable="true"] li { font-size: ${editorFontSize}px !important; }
										[data-editor-root] [contenteditable="true"] h1 { font-size: ${Math.round(editorFontSize * 1.73)}px !important; }
										[data-editor-root] [contenteditable="true"] h2 { font-size: ${Math.round(editorFontSize * 1.33)}px !important; }
										[data-editor-root] [contenteditable="true"] h3 { font-size: ${Math.round(editorFontSize * 1.13)}px !important; }
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
									`}</style>
									<div
										ref={editorRef}
										contentEditable
										suppressContentEditableWarning
										onInput={onEditorInput}
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
										data-placeholder="Write, or type / for commands…"
										style={{
											maxWidth: 720,
											margin: "0 auto",
											padding: "36px 48px 100px",
											minHeight: "100%",
											outline: "none",
											fontSize: `${editorFontSize}px`,
											lineHeight: 1.75,
											color: "#37352F",
											fontFamily:
												editorFont === "Inter"
													? "'Inter', sans-serif"
													: editorFont === "Georgia"
														? "Georgia, serif"
														: editorFont === "system-ui"
															? "system-ui, sans-serif"
															: "'Comic', sans-serif",
										}}
									/>
									<input
										ref={imageFileInputRef}
										type="file"
										accept="image/*,video/*"
										style={{ display: "none" }}
										onChange={handleImageFileSelect}
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
													const styleItems = DRAFT_SLASH_BASE_ITEMS.filter(
														(it) =>
															it.section === "style" &&
															draftSlashItemMatchesQuery(it, q),
													);
													const blockItems = DRAFT_SLASH_BASE_ITEMS.filter(
														(it) =>
															it.section === "blocks" &&
															draftSlashItemMatchesQuery(it, q),
													);
													const flatRows = getDraftSlashFlatRows(
														slashCommand.query,
													);
													const activeIdx =
														flatRows.length > 0
															? Math.min(
																	slashListIndex,
																	flatRows.length - 1,
																)
															: 0;
													const styleRowOffset = aiHit ? 1 : 0;
													const blockRowOffset =
														styleRowOffset + styleItems.length;
													if (
														!aiHit &&
														styleItems.length === 0 &&
														blockItems.length === 0
													) {
														return (
															<div
																style={{
																	padding: "10px 12px",
																	fontSize: 13,
																	color: T.muted,
																}}
															>
																No matching commands
															</div>
														);
													}
													const sectionTitleStyle = {
														fontSize: 10,
														fontWeight: 700,
														color: "#B0AAA3",
														textTransform: "",
														letterSpacing: "0.1em",
														margin: "0 0 6px 4px",
													};
													const rowBtnStyle = {
														width: "100%",
														display: "flex",
														alignItems: "center",
														gap: 10,
														padding: "8px 10px",
														border: "none",
														borderRadius: 8,
														background: "none",
														fontSize: 14,
														fontWeight: 500,
														color: T.accent,
														cursor: "pointer",
														textAlign: "left",
													};
													const divider = (
														<div
															style={{
																height: 1,
																background: T.border,
																margin: "8px 0",
															}}
														/>
													);
													const renderIcon = (item) => {
														const ic = item.icon;
														if (ic === "list")
															return (
																<Icon
																	d={Icons.list}
																	size={16}
																	stroke={T.muted}
																/>
															);
														if (ic === "image")
															return (
																<Icon
																	d={Icons.image}
																	size={16}
																	stroke={T.muted}
																/>
															);
														if (ic === "table")
															return (
																<Icon
																	d={Icons.table}
																	size={16}
																	stroke={T.muted}
																/>
															);
														if (ic === "embed")
															return (
																<Icon
																	d={Icons.video}
																	size={16}
																	stroke={T.muted}
																/>
															);
														if (
															typeof ic === "string" &&
															!ic.startsWith("M")
														) {
															return (
																<span
																	style={{
																		fontSize: 14,
																		fontWeight: 600,
																		width: 20,
																		textAlign: "center",
																	}}
																>
																	{ic}
																</span>
															);
														}
														return (
															<Icon d={ic} size={16} stroke={T.muted} />
														);
													};
													return (
														<>
															{aiHit && (
																<>
																	<p style={sectionTitleStyle}>AI</p>
																	<motion.button
																		whileHover={{ background: "#F0ECE5" }}
																		whileTap={{ scale: 0.98 }}
																		onClick={() =>
																			handleSlashCommand("ask-ai")
																		}
																		data-slash-active={
																			activeIdx === 0
																				? "true"
																				: undefined
																		}
																		style={{
																			...rowBtnStyle,
																			...(activeIdx === 0
																				? { background: "#EDE8E0" }
																				: {}),
																		}}
																	>
																		<Icon
																			d="M12 3l1.8 5.4L19.2 9l-5.4 1.8L12 16.2l-1.8-5.4L4.8 9l5.4-1.8L12 3z"
																			size={14}
																			stroke="#C17B2F"
																		/>
																		Ask AI
																	</motion.button>
																</>
															)}
															{aiHit &&
																(styleItems.length > 0 ||
																	blockItems.length > 0) &&
																divider}
															{styleItems.length > 0 && (
																<>
																	<p style={sectionTitleStyle}>Style</p>
																	{styleItems.map((item, i) => {
																		const isActive =
																			activeIdx === styleRowOffset + i;
																		return (
																		<motion.button
																			key={item.id}
																			whileHover={{
																				background: "#F0ECE5",
																			}}
																			whileTap={{ scale: 0.98 }}
																			onClick={() =>
																				handleSlashCommand(item.id)
																			}
																			data-slash-active={
																				isActive ? "true" : undefined
																			}
																			style={{
																				...rowBtnStyle,
																				...(isActive
																					? { background: "#EDE8E0" }
																					: {}),
																			}}
																		>
																			{renderIcon(item)}
																			{item.label}
																		</motion.button>
																	);
																	})}
																</>
															)}
															{styleItems.length > 0 &&
																blockItems.length > 0 &&
																divider}
															{blockItems.length > 0 && (
																<>
																	<p style={sectionTitleStyle}>
																		Blocks
																	</p>
																	{blockItems.map((item, i) => {
																		const isActive =
																			activeIdx === blockRowOffset + i;
																		return (
																		<motion.button
																			key={item.id}
																			whileHover={{
																				background: "#F0ECE5",
																			}}
																			whileTap={{ scale: 0.98 }}
																			onClick={() =>
																				handleSlashCommand(item.id)
																			}
																			data-slash-active={
																				isActive ? "true" : undefined
																			}
																			style={{
																				...rowBtnStyle,
																				...(isActive
																					? { background: "#EDE8E0" }
																					: {}),
																			}}
																		>
																			{renderIcon(item)}
																			{item.label}
																		</motion.button>
																	);
																	})}
																</>
															)}
														</>
													);
												})()}
											</motion.div>
										)}
									</AnimatePresence>
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
													initialDate={new Date()}
													onSelect={insertDraftDateAtCursor}
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

							{/* Bottom status bar */}
							<div
								style={{
									padding: "8px 24px",
									borderTop: `1px solid ${T.border}`,
									background: T.surface,
									display: "flex",
									alignItems: "center",
									gap: 16,
									flexShrink: 0,
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
									<motion.div
										animate={{ scale: [1, 1.2, 1] }}
										transition={{ duration: 2, repeat: Infinity }}
										style={{
											width: 6,
											height: 6,
											borderRadius: "50%",
											background: "#3D7A35",
										}}
									/>
									<span style={{ fontSize: 12, color: T.muted }}>
										Auto-saved
									</span>
								</div>
								<span style={{ fontSize: 12, color: T.muted }}>·</span>
								<span style={{ fontSize: 12, color: T.muted }}>
									{wordCount} words · ~{Math.ceil(wordCount / 200)} min read
								</span>
								<div style={{ flex: 1 }} />

								{/* Themes button */}
								<motion.button
									whileHover={{ background: "#F0ECE5" }}
									whileTap={{ scale: 0.97 }}
									onClick={() => setThemeDrawerOpen(true)}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 5,
										background: T.base,
										border: `1px solid ${T.border}`,
										borderRadius: 8,
										padding: "5px 12px",
										fontSize: 12,
										fontWeight: 600,
										color: T.accent,
										cursor: "pointer",
									}}
								>
									{/* Palette icon */}
									<svg
										width={12}
										height={12}
										viewBox="0 0 24 24"
										fill="none"
										stroke={T.accent}
										strokeWidth={2}
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<circle cx="13.5" cy="6.5" r=".5" fill={T.accent} />
										<circle cx="17.5" cy="10.5" r=".5" fill={T.accent} />
										<circle cx="8.5" cy="7.5" r=".5" fill={T.accent} />
										<circle cx="6.5" cy="12.5" r=".5" fill={T.accent} />
										<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
									</svg>
									Themes
								</motion.button>

								

								{/* AI Chat button */}
								<motion.button
									whileHover={{ background: chatOpen ? "#C17B2F" : "#F0ECE5" }}
									whileTap={{ scale: 0.97 }}
									onClick={() => setChatOpen((v) => !v)}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 5,
										background: chatOpen ? T.warm : T.base,
										border: `1px solid ${chatOpen ? T.warm : T.border}`,
										borderRadius: 8,
										padding: "5px 12px",
										fontSize: 12,
										fontWeight: 600,
										color: chatOpen ? "#FFFFFF" : T.accent,
										cursor: "pointer",
										transition: "all 0.18s",
									}}
								>
									{/* Chat bubble icon */}
									<svg
										width={12}
										height={12}
										viewBox="0 0 24 24"
										fill="none"
										stroke={chatOpen ? "#FFFFFF" : T.accent}
										strokeWidth={2}
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
									</svg>
									AI Chat
								</motion.button>

								<motion.button
									whileHover={{ scale: 1.03 }}
									whileTap={{ scale: 0.97 }}
									onClick={() => router.push("/app")}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 6,
										background: T.base,
										border: `1px solid ${T.border}`,
										borderRadius: 8,
										padding: "5px 12px",
										fontSize: 12,
										fontWeight: 600,
										color: T.muted,
										cursor: "pointer",
									}}
								>
									<Icon d={Icons.refresh} size={12} stroke={T.muted} /> New
									draft
								</motion.button>
							</div>
						</motion.div>
					)}
					{tableDoc && tableDataForView && (
						<motion.div
							key={`table-${draftId}`}
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
							<div
								style={{
									flex: 1,
									overflowY: "auto",
									maxWidth: 1100,
									margin: "0 auto",
									width: "100%",
									padding: "28px 20px",
								}}
							>
								<TableView
									tableId={draftId}
									tableData={tableDataForView}
									setTableData={setLocalTableData}
									reduxUser={reduxUser}
									tableDocRef={
										docData?.source === "assets" && reduxUser?.uid
											? assetRef(reduxUser.uid, draftId)
											: null
									}
								/>
							</div>
						</motion.div>
					)}
					{infographicsDoc && (
						<motion.div
							key={`infographics-${draftId}`}
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
							<InfographicsAssetView
								doc={infographicsDoc}
								userId={reduxUser?.uid}
								assetId={draftId}
								docSource={docData?.source || "assets"}
								onUpdate={() =>
									queryClient.invalidateQueries({
										queryKey: ["doc", draftId, reduxUser?.uid],
									})
								}
							/>
						</motion.div>
					)}
					{landingPageDoc && (
						<motion.div
							key={`landing-${draftId}`}
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
							<LandingPageAssetView doc={landingPageDoc} />
						</motion.div>
					)}
					{imageGalleryDoc && (
						<motion.div
							key={`gallery-${draftId}`}
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
							<ImageGalleryAssetView doc={imageGalleryDoc} />
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

			{/* ── THEMES MODAL ── full-screen two-panel preview */}
			<AnimatePresence>
				{themeDrawerOpen &&
					(() => {
						const activeTheme = THEMES[previewTheme];
						const currentHTML = stripDraftSlashQueryFromHtmlString(
							editorRef.current?.innerHTML || draft?.body || "",
						);
						const themedDoc = activeTheme
							? buildThemedHTML(currentHTML, activeTheme, draft?.title || "")
							: "";
						const isCopiedHtml =
							copiedTheme?.key === previewTheme &&
							copiedTheme?.format === "html";
						const isCopiedReact =
							copiedTheme?.key === previewTheme &&
							copiedTheme?.format === "react";
						return (
							<>
								{/* Backdrop */}
								<motion.div
									key="theme-backdrop"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									onClick={() => setThemeDrawerOpen(false)}
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
												— pick a theme, then copy HTML or a React embed
											</p>
											<div style={{ flex: 1 }} />

											{/* Download HTML */}
											<motion.button
												whileHover={{ background: "#F0ECE5" }}
												whileTap={{ scale: 0.96 }}
												onClick={() => {
													if (!themedDoc) return;
													const blob = new Blob([themedDoc], {
														type: "text/html;charset=utf-8",
													});
													const a = document.createElement("a");
													a.href = URL.createObjectURL(blob);
													a.download = `${(draft?.title || "draft").replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${activeTheme?.name?.toLowerCase() || "theme"}.html`;
													a.click();
													URL.revokeObjectURL(a.href);
												}}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 7,
													background: T.base,
													color: T.accent,
													border: `1px solid ${T.border}`,
													borderRadius: 9,
													padding: "8px 16px",
													fontSize: 13,
													fontWeight: 600,
													cursor: "pointer",
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
											</motion.button>

											{/* Copy HTML — primary CTA */}
											<motion.button
												whileHover={{
													background: isCopiedHtml ? "#2D6A4F" : "#333",
												}}
												whileTap={{ scale: 0.96 }}
												onClick={() => handleCopyThemeHTML(previewTheme)}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 7,
													background: isCopiedHtml ? "#2D6A4F" : T.accent,
													color: "white",
													border: "none",
													borderRadius: 9,
													padding: "8px 18px",
													fontSize: 13,
													fontWeight: 600,
													cursor: "pointer",
													transition: "background 0.2s",
												}}
											>
												{isCopiedHtml ? (
													<>
														<svg
															width={13}
															height={13}
															viewBox="0 0 24 24"
															fill="none"
															stroke="white"
															strokeWidth={2.5}
															strokeLinecap="round"
															strokeLinejoin="round"
														>
															<polyline points="20 6 9 17 4 12" />
														</svg>
														HTML copied!
													</>
												) : (
													<>
														<svg
															width={13}
															height={13}
															viewBox="0 0 24 24"
															fill="none"
															stroke="white"
															strokeWidth={2}
															strokeLinecap="round"
															strokeLinejoin="round"
														>
															<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
															<rect
																x="8"
																y="2"
																width="8"
																height="4"
																rx="1"
																ry="1"
															/>
														</svg>
														Copy HTML — {activeTheme?.name}
													</>
												)}
											</motion.button>

											<motion.button
												whileHover={{
													background: isCopiedReact ? "#1E3A5F" : T.base,
												}}
												whileTap={{ scale: 0.96 }}
												onClick={() => handleCopyThemeReact(previewTheme)}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 7,
													background: isCopiedReact ? "#1E3A5F" : T.base,
													color: isCopiedReact ? "white" : T.accent,
													border: `1px solid ${T.border}`,
													borderRadius: 9,
													padding: "8px 16px",
													fontSize: 13,
													fontWeight: 600,
													cursor: "pointer",
													transition: "background 0.2s, color 0.2s",
												}}
												title="Copies a React component (iframe embed) you can paste into a Next.js or Vite app"
											>
												{isCopiedReact ? (
													<>React copied!</>
												) : (
													<>Copy React — {activeTheme?.name}</>
												)}
											</motion.button>

											{/* Close */}
											<motion.button
												whileHover={{ background: "#F0ECE5" }}
												whileTap={{ scale: 0.93 }}
												onClick={() => setThemeDrawerOpen(false)}
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
														key={previewTheme}
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

			{/* ── INFOGRAPHICS MODAL ── */}
			<InfographicsModal
				open={infographicsOpen}
				onClose={() => setInfographicsOpen(false)}
				content={stripDraftSlashQueryFromHtmlString(
					editorRef.current?.innerHTML || draft?.body || "",
				)}
				title={draft?.title || "Draft"}
				userId={reduxUser?.uid || ""}
				draftId={draftId}
				docSource={docData?.source || "drafts"}
				savedInfographics={draft?.infographics || []}
				onInsertToEditor={(html) => {
					editorRef.current?.focus();
					document.execCommand("insertHTML", false, html + "<p><br></p>");
					countWords();
				}}
			/>
		</div>
	);
}
