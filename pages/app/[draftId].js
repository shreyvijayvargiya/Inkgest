import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LoginModal from "../../lib/ui/LoginModal";
import InfographicsModal from "../../lib/ui/InfographicsModal";
import AIChatSidebar from "../../lib/ui/AIChatSidebar";
import TableView from "../../lib/ui/TableView";
import { db } from "../../lib/config/firebase";
import {
	collection,
	getDocs,
	deleteDoc,
	doc,
	getDoc,
	query,
	orderBy,
	where,
	updateDoc,
} from "firebase/firestore";
import { uploadFile } from "../../lib/api/upload";
import {
	getUserCredits,
	FREE_CREDIT_LIMIT,
	formatRenewalDate,
} from "../../lib/utils/credits";
import { getTheme } from "../../lib/utils/theme";

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
  `}</style>
);

const T = getTheme();

const FREE_LIMIT = 40;

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
	settings:
		"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
};

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
		bodyFont: "'Outfit', sans-serif",
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
		h3: "font-family:'Inter',sans-serif;font-size:14px;color:#888888;margin:22px 0 8px;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;",
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
		h3: "font-family:'IBM Plex Sans',sans-serif;font-size:12px;color:#1A1F2E;margin:22px 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;",
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
		h3: "font-family:'Figtree',sans-serif;font-size:12px;color:#8899AA;margin:24px 0 8px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;",
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
		h3: "font-family:'Roboto',sans-serif;font-size:12px;color:#111111;margin:22px 0 8px;font-weight:500;text-transform:uppercase;letter-spacing:0.1em;",
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
			if (tag === "blockquote")
				return `<blockquote style="${theme.blockquote}">${inner}</blockquote>\n`;
			if (tag === "ul" || tag === "ol") {
				const items = Array.from(node.children)
					.filter((n) => n.nodeName?.toLowerCase() === "li")
					.map(
						(li) =>
							`<li style="${theme.li}">${parseInlineMarkdown(li.innerHTML || "")}</li>`,
					)
					.join("\n");
				return `<${tag} style="padding-left:24px;margin:0 0 14px;">${items}</${tag}>\n`;
			}
			if (tag === "pre")
				return `<pre style="background:rgba(0,0,0,0.06);padding:16px 20px;border-radius:6px;overflow:auto;margin:0 0 16px;font-family:monospace;font-size:13px;line-height:1.6;">${node.textContent || ""}</pre>\n`;
			if (tag === "hr") return `<hr style="${theme.hr}"/>\n`;
			if (tag === "img")
				return `<img src="${node.getAttribute("src") || ""}" alt="${node.getAttribute("alt") || ""}" style="max-width:100%;height:auto;border-radius:6px;margin:12px 0;display:block;"/>\n`;
			if (tag === "video") {
				const src = node.getAttribute("src") || "";
				return `<p style="margin:16px 0"><video src="${src}" controls style="max-width:100%;border-radius:8px;display:block;"></video></p>\n`;
			}
			if (tag === "br" || !text) return `<br/>\n`;
			/* p, div, section, article → paragraph (preserve inner HTML including img/video) */
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
  </style>
</head>
<body>
  <div style="${theme.container}">
    ${title ? `<h1 style="${theme.h1}">${title}</h1>` : ""}
    ${body}
  </div>
</body>
</html>`;
}

/* ─── Item card in sidebar (drafts + tables) ─── */
function ItemCard({ item, active, onClick, onDelete }) {
	const [hovering, setHovering] = useState(false);
	const isTable = item.type === "table";
	const tag = isTable ? "Table" : item.tag || "Draft";
	const preview = isTable ? item.description || "" : item.preview || "";
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
		label: "Warning",
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
	return `<div data-block="callout-${type}" style="border-left:4px solid ${c.border};background:${c.bg};border-radius:0 8px 8px 0;padding:13px 16px;margin:14px 0;display:flex;gap:12px;align-items:flex-start"><span style="font-size:17px;flex-shrink:0;line-height:1.6;margin-top:2px">${c.emoji}</span><div style="flex:1"><p style="font-weight:700;color:${c.textColor};font-size:10.5px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 5px;font-family:'Outfit',sans-serif">${c.label}</p><div style="color:${c.textColor};font-size:14px;line-height:1.65;font-family:'Outfit',sans-serif">${text}</div></div></div>`;
}

function makeCodeBlockHtml(
	language = "javascript",
	code = "// Your code here",
) {
	const lang = language.toLowerCase().trim() || "text";
	const opts = LANG_OPTIONS.map(
		(l) =>
			`<option value="${l}" ${l === lang ? "selected" : ""}>${l.charAt(0).toUpperCase() + l.slice(1)}</option>`,
	).join("");
	return `<div data-block="code" style="margin:16px 0;border-radius:10px;overflow:hidden;border:1px solid #E8E4DC"><div contenteditable="false" style="background:#F0ECE5;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #E8E4DC;user-select:none"><select data-action="change-lang" style="background:none;border:none;font-size:11px;font-weight:700;color:#5A5550;text-transform:uppercase;letter-spacing:0.06em;cursor:pointer;outline:none;font-family:'Outfit',sans-serif">${opts}</select><button data-action="copy-code" style="background:#FFFFFF;border:1px solid #E8E4DC;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600;color:#7A7570;cursor:pointer;font-family:'Outfit',sans-serif;transition:all 0.15s">Copy</button></div><pre style="background:#1A1A1A;margin:0;padding:18px 20px;overflow-x:auto"><code style="color:#E8D5B0;font-family:'Fira Code','Cascadia Code','Courier New',monospace;font-size:13px;line-height:1.75;white-space:pre;display:block">${code}</code></pre></div>`;
}

function makeButtonBlockHtml(text = "Click here →", href = "#") {
	return `<p style="margin:16px 0"><a href="${href}" style="display:inline-block;background:#C17B2F;color:#FFFFFF;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;font-family:'Outfit',sans-serif;letter-spacing:0.01em">${text}</a></p>`;
}

const MAX_TABS = 5;

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

	/* Lookup draft title by id (from drafts list or current draft) */
	const getTabTitle = (id) => {
		if (draft?.id === id) return draft?.title || "Untitled";
		const d = drafts.find((x) => x.id === id);
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
	const [copiedTheme, setCopiedTheme] = useState(null);
	const [previewTheme, setPreviewTheme] = useState("ink");
	const [infographicsOpen, setInfographicsOpen] = useState(false);
	const [chatOpen, setChatOpen] = useState(false);
	const [blockMenuOpen, setBlockMenuOpen] = useState(false);
	const [imageDropdownOpen, setImageDropdownOpen] = useState(false);
	const [imageUrlInput, setImageUrlInput] = useState("");
	const [imageUploading, setImageUploading] = useState(false);
	const [selectionDropdown, setSelectionDropdown] = useState(null);
	const [selectionContext, setSelectionContext] = useState("");
	const [slashCommand, setSlashCommand] = useState(null);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewData, setPreviewData] = useState({ title: "", htmlDoc: "" });
	const [editorFont, setEditorFont] = useState("Outfit");
	const [editorFontSize, setEditorFontSize] = useState(15);
	const editorRef = useRef(null);
	const titleRef = useRef(null);
	const imageFileInputRef = useRef(null);
	const editorContainerRef = useRef(null);

	/* All drafts for sidebar */
	const { data: drafts = [] } = useQuery({
		queryKey: ["drafts", reduxUser?.uid],
		queryFn: async () => {
			const q = query(
				collection(db, "drafts"),
				where("userId", "==", reduxUser.uid),
				orderBy("createdAt", "desc"),
			);
			const snap = await getDocs(q);
			return snap.docs.map((d) => ({ id: d.id, type: "draft", ...d.data() }));
		},
		enabled: !!reduxUser,
		staleTime: 2 * 60 * 1000,
	});

	/* All tables for sidebar */
	const { data: tables = [] } = useQuery({
		queryKey: ["tables", reduxUser?.uid],
		queryFn: async () => {
			const q = query(
				collection(db, "tables"),
				where("userId", "==", reduxUser.uid),
			);
			const snap = await getDocs(q);
			return snap.docs.map((d) => {
				const data = d.data();
				const created = data.createdAt;
				const date =
					created?.toDate?.()?.toLocaleDateString?.("en-US", {
						weekday: "short",
						month: "short",
						day: "numeric",
					}) ?? "";
				return {
					id: d.id,
					type: "table",
					title: data.title,
					description: data.description,
					createdAt: created,
					date,
				};
			});
		},
		enabled: !!reduxUser,
		staleTime: 2 * 60 * 1000,
	});

	/* Merged items (drafts + tables) sorted by date */
	const items = useMemo(() => {
		const merged = [...drafts, ...tables];
		merged.sort((a, b) => {
			const aT = a.createdAt?.toMillis?.() ?? a.createdAt?.getTime?.() ?? 0;
			const bT = b.createdAt?.toMillis?.() ?? b.createdAt?.getTime?.() ?? 0;
			return bT - aT;
		});
		return merged;
	}, [drafts, tables]);

	/* Single doc by ID — try drafts first, then tables */
	const { data: docData, isLoading: loadingDraft } = useQuery({
		queryKey: ["doc", draftId],
		queryFn: async () => {
			const draftSnap = await getDoc(doc(db, "drafts", draftId));
			if (draftSnap.exists()) {
				return {
					type: "draft",
					doc: { id: draftSnap.id, ...draftSnap.data() },
				};
			}
			const tableSnap = await getDoc(doc(db, "tables", draftId));
			if (tableSnap.exists()) {
				const data = tableSnap.data();
				if (data.userId !== reduxUser?.uid) return null;
				return {
					type: "table",
					doc: {
						id: tableSnap.id,
						title: data.title,
						description: data.description,
						columns: data.columns || [],
						rows: data.rows || [],
						sourceUrls: data.sourceUrls || [],
						prompt: data.prompt || "",
					},
				};
			}
			router.replace("/app");
			return null;
		},
		enabled: !!draftId && !!reduxUser,
		staleTime: 5 * 60 * 1000,
		retry: false,
	});

	const draft = docData?.type === "draft" ? docData.doc : null;

	/* Dynamic usage for navbar pill (drafts limit — kept for sidebar logic) */
	const used = drafts.filter((d) => isThisMonth(d.createdAt)).length;
	const remaining = Math.max(0, FREE_LIMIT - used);

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

		/* 2. Process line by line */
		const restore = (s) => s.replace(/\x01BLK(\d+)\x01/g, (_, i) => tokens[+i]);

		return text
			.split("\n")
			.map((line) => {
				if (/\x01BLK\d+\x01/.test(line)) return restore(line);
				if (line.startsWith("### "))
					return `<h3 style="font-family:'Outfit',sans-serif;font-size:17px;color:#1A1A1A;margin:16px 0 7px">${line.slice(4)}</h3>`;
				if (line.startsWith("## "))
					return `<h2 style="font-family:'Outfit',sans-serif;font-size:20px;color:#1A1A1A;margin:20px 0 8px;line-height:1.3">${line.slice(3)}</h2>`;
				if (line.startsWith("# "))
					return `<h1 style="font-family:'Outfit',sans-serif;font-size:26px;color:#1A1A1A;margin:24px 0 10px;line-height:1.2">${line.slice(2)}</h1>`;
				if (line.trim() === "") return "<br/>";
				return `<p style="font-size:15px;line-height:1.8;color:#3A3530;margin-bottom:4px">${line}</p>`;
			})
			.join("");
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
			countWords();
		}
	}, [draft]);

	const countWords = () => {
		const text = editorRef.current?.innerText || "";
		setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
	};

	const handleCopy = () => {
		const text = editorRef.current?.innerText || draft?.body || "";
		navigator.clipboard.writeText(text).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleSave = async () => {
		if (!draftId) return;
		try {
			const html = editorRef.current?.innerHTML || "";
			await updateDoc(doc(db, "drafts", draftId), { body: html });
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
			const html = `<p style="margin:16px 0"><video src="${url}" controls style="max-width:100%;border-radius:8px;display:block"></video></p>`;
			document.execCommand("insertHTML", false, html);
		} else {
			document.execCommand("insertImage", false, url);
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

		/* Images: insert base64 immediately, then upload to Firebase in background */
		if (isImage) {
			const reader = new FileReader();
			reader.onload = () => {
				const dataUrl = reader.result;
				insertImageOrVideo(dataUrl, false);
				/* Upload in background and replace base64 with Firebase URL */
				if (reduxUser?.uid) {
					uploadFile(
						file,
						`users/${reduxUser.uid}/drafts/${draftId || "new"}/media/${Date.now()}.${file.name.split(".").pop() || "png"}`,
					)
						.then((firebaseUrl) => {
							const html = editorRef.current?.innerHTML || "";
							if (html.includes(dataUrl)) {
								editorRef.current.innerHTML = html
									.split(dataUrl)
									.join(firebaseUrl);
							}
						})
						.catch((err) => {
							console.error("Background upload failed:", err);
						});
				}
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
				.then((downloadUrl) => insertImageOrVideo(downloadUrl, true))
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
			if (e.target.dataset?.action === "copy-code") {
				e.preventDefault();
				const block = e.target.closest('[data-block="code"]');
				const code = block?.querySelector("code");
				if (code) {
					navigator.clipboard.writeText(code.innerText).catch(() => {});
					const btn = e.target;
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
			}
		};

		const handleChange = (e) => {
			if (e.target.dataset?.action === "change-lang") {
				// nothing extra needed — the native <select> already stores its value
			}
		};

		el.addEventListener("click", handleClick);
		el.addEventListener("change", handleChange);
		return () => {
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
			const text = sel?.toString?.()?.trim();
			if (!text || sel.rangeCount === 0) {
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
				if (rect.width === 0 && rect.height === 0) return;
				setSelectionDropdown({
					text,
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

	/* ── Slash command: close on Escape, click outside ── */
	useEffect(() => {
		if (!slashCommand) return;
		const onKey = (e) => {
			if (e.key === "Escape") setSlashCommand(null);
		};
		const close = (e) => {
			if (!e.target.closest("[data-slash-command]")) setSlashCommand(null);
		};
		document.addEventListener("keydown", onKey);
		const t = setTimeout(
			() => document.addEventListener("mousedown", close),
			50,
		);
		return () => {
			document.removeEventListener("keydown", onKey);
			clearTimeout(t);
			document.removeEventListener("mousedown", close);
		};
	}, [slashCommand]);

	const handleSlashCommand = (action) => {
		if (!editorRef.current) return;
		editorRef.current.focus();
		if (action === "continue-writing" || action === "ask-ai") {
			const sel = window.getSelection();
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
			document.execCommand("formatBlock", false, "p");
		} else if (action === "h1") {
			document.execCommand("formatBlock", false, "h1");
		} else if (action === "h2") {
			document.execCommand("formatBlock", false, "h2");
		} else if (action === "h3") {
			document.execCommand("formatBlock", false, "h3");
		} else if (action === "bullet") {
			document.execCommand("insertUnorderedList");
		} else if (action === "numbered") {
			document.execCommand("insertOrderedList");
		} else if (action === "todo") {
			document.execCommand(
				"insertHTML",
				false,
				'<ul data-todo="true" style="list-style:none;padding-left:0;"><li><input type="checkbox" style="margin-right:8px;vertical-align:middle"> </li></ul><p><br></p>',
			);
		}
		countWords();
		setSlashCommand(null);
	};

	const handleDelete = (id) => setDeleteConfirm(id);

	const confirmDelete = async () => {
		try {
			await deleteDoc(doc(db, "drafts", deleteConfirm));
			queryClient.setQueryData(["drafts", reduxUser?.uid], (old = []) =>
				old.filter((d) => d.id !== deleteConfirm),
			);
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
		const html = editorRef.current?.innerHTML || draft?.body || "";
		const title = draft?.title || "";
		const output = buildThemedHTML(html, theme, title);
		navigator.clipboard.writeText(output).catch(() => {});
		setCopiedTheme(themeKey);
		setTimeout(() => setCopiedTheme(null), 2200);
	};

	const filtered = items.filter((i) => {
		const q = search.toLowerCase().trim();
		if (!q) return true;
		const title = (i.title || "").toLowerCase();
		const preview = (i.preview || i.description || "").toLowerCase();
		const type = (i.type || "").toLowerCase();
		const tag = (i.tag || (i.type === "table" ? "Table" : "Draft")).toLowerCase();
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

	const asset = draft || (docData?.type === "table" ? docData.doc : null);
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
				fontFamily: "'Outfit', sans-serif",
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
											<p style={{ fontSize: 13 }}>No drafts or tables found</p>
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
					{loadingDraft && !draft && draftId && (
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
									alignItems: "center",
									gap: 8,
									flexShrink: 0,
								}}
							>
								{/* Format tools */}
								<TBtn
									icon={Icons.bold}
									label="Bold"
									onClick={() => document.execCommand("bold")}
								/>
								<TBtn
									icon={Icons.italic}
									label="Italic"
									onClick={() => document.execCommand("italic")}
								/>
								<TBtn
									icon={Icons.list}
									label="Bullet list"
									onClick={() => document.execCommand("insertUnorderedList")}
								/>
								<TBtn
									icon={Icons.link2}
									label="Link"
									onClick={() => {
										const url = window.prompt("URL:");
										if (url) document.execCommand("createLink", false, url);
									}}
								/>
								<div data-image-dropdown style={{ position: "relative" }}>
									<TBtn
										icon={Icons.image}
										label="Image / Video"
										onClick={() => setImageDropdownOpen((v) => !v)}
									/>
									<input
										ref={imageFileInputRef}
										type="file"
										accept="image/*,video/*"
										style={{ display: "none" }}
										onChange={handleImageFileSelect}
									/>
									<AnimatePresence>
										{imageDropdownOpen && (
											<motion.div
												initial={{ opacity: 0, y: 6, scale: 0.96 }}
												animate={{ opacity: 1, y: 0, scale: 1 }}
												exit={{ opacity: 0, y: 6, scale: 0.96 }}
												transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
												style={{
													position: "absolute",
													top: "calc(100% + 6px)",
													left: 0,
													background: "#FFFFFF",
													border: `1px solid ${T.border}`,
													borderRadius: 12,
													boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
													zIndex: 60,
													padding: 12,
													minWidth: 260,
												}}
											>
												<p
													style={{
														fontSize: 10,
														fontWeight: 700,
														color: "#B0AAA3",
														textTransform: "uppercase",
														letterSpacing: "0.1em",
														margin: "0 0 8px",
													}}
												>
													Upload from computer
												</p>
												<motion.button
													whileHover={{ background: "#F7F5F0" }}
													whileTap={{ scale: 0.98 }}
													onClick={() => imageFileInputRef.current?.click()}
													disabled={imageUploading || !reduxUser}
													style={{
														width: "100%",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														gap: 8,
														background: "#F7F5F0",
														border: `1px dashed ${T.border}`,
														borderRadius: 8,
														padding: "10px 14px",
														fontSize: 12,
														fontWeight: 600,
														color: T.accent,
														cursor:
															imageUploading || !reduxUser
																? "not-allowed"
																: "pointer",
														opacity: imageUploading || !reduxUser ? 0.6 : 1,
													}}
												>
													{imageUploading
														? "Uploading…"
														: "Choose image or video"}
												</motion.button>
												<p
													style={{
														fontSize: 10,
														fontWeight: 700,
														color: "#B0AAA3",
														textTransform: "uppercase",
														letterSpacing: "0.1em",
														margin: "12px 0 8px",
													}}
												>
													Or add from URL
												</p>
												<div style={{ display: "flex", gap: 6 }}>
													<input
														type="url"
														placeholder="https://…"
														value={imageUrlInput}
														onChange={(e) => setImageUrlInput(e.target.value)}
														onKeyDown={(e) => {
															if (e.key === "Enter")
																insertImageOrVideo(
																	imageUrlInput.trim(),
																	isVideoUrl(imageUrlInput.trim()),
																);
														}}
														style={{
															flex: 1,
															padding: "8px 12px",
															border: `1px solid ${T.border}`,
															borderRadius: 8,
															fontSize: 12,
															outline: "none",
															fontFamily: "inherit",
														}}
													/>
													<motion.button
														whileHover={{ background: T.warm }}
														whileTap={{ scale: 0.96 }}
														onClick={() =>
															insertImageOrVideo(
																imageUrlInput.trim(),
																isVideoUrl(imageUrlInput.trim()),
															)
														}
														style={{
															background: T.warm,
															color: "white",
															border: "none",
															borderRadius: 8,
															padding: "8px 14px",
															fontSize: 12,
															fontWeight: 600,
															cursor: "pointer",
														}}
													>
														Insert
													</motion.button>
												</div>
											</motion.div>
										)}
									</AnimatePresence>
								</div>

								{/* Divider */}
								<div
									style={{
										width: 1,
										height: 18,
										background: T.border,
										margin: "0 4px",
									}}
								/>

								{/* ── Insert block dropdown ── */}
								<div data-block-menu style={{ position: "relative" }}>
									<motion.button
										onClick={() => setBlockMenuOpen((v) => !v)}
										whileHover={{ background: "#F0ECE5" }}
										whileTap={{ scale: 0.95 }}
										style={{
											display: "flex",
											alignItems: "center",
											gap: 5,
											background: blockMenuOpen ? "#F0ECE5" : "transparent",
											border: "none",
											borderRadius: 7,
											padding: "5px 9px",
											fontSize: 12,
											fontWeight: 600,
											color: T.accent,
											cursor: "pointer",
											transition: "background 0.15s",
										}}
									>
										<Icon d="M12 5v14M5 12h14" size={13} stroke={T.accent} />
										Insert
										<Icon
											d="M6 9l6 6 6-6"
											size={11}
											stroke={T.muted}
											strokeWidth={2}
										/>
									</motion.button>

									<AnimatePresence>
										{blockMenuOpen && (
											<motion.div
												initial={{ opacity: 0, y: 6, scale: 0.96 }}
												animate={{ opacity: 1, y: 0, scale: 1 }}
												exit={{ opacity: 0, y: 6, scale: 0.96 }}
												transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
												style={{
													position: "absolute",
													top: "calc(100% + 6px)",
													left: 0,
													background: "#FFFFFF",
													border: `1px solid ${T.border}`,
													borderRadius: 12,
													boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
													zIndex: 60,
													overflow: "hidden",
													minWidth: 195,
													padding: 6,
												}}
											>
												{/* Callouts section */}
												<p
													style={{
														fontSize: 10,
														fontWeight: 700,
														color: "#B0AAA3",
														textTransform: "uppercase",
														letterSpacing: "0.1em",
														padding: "3px 8px 6px",
														margin: 0,
													}}
												>
													Callout
												</p>
												{["info", "warning", "success", "danger"].map(
													(type) => {
														const c = CALLOUT_CONFIGS[type];
														return (
															<motion.button
																key={type}
																onClick={() => insertBlock(type)}
																whileHover={{ background: "#F7F5F0" }}
																style={{
																	width: "100%",
																	display: "flex",
																	alignItems: "center",
																	gap: 8,
																	background: "none",
																	border: "none",
																	borderRadius: 8,
																	padding: "7px 10px",
																	cursor: "pointer",
																	textAlign: "left",
																	transition: "background 0.12s",
																}}
															>
																<span
																	style={{
																		fontSize: 15,
																		width: 22,
																		textAlign: "center",
																	}}
																>
																	{c.emoji}
																</span>
																<div>
																	<p
																		style={{
																			fontSize: 12,
																			fontWeight: 600,
																			color: c.textColor,
																			margin: 0,
																			lineHeight: 1.2,
																		}}
																	>
																		{c.label}
																	</p>
																	<p
																		style={{
																			fontSize: 10.5,
																			color: "#A8A29C",
																			margin: 0,
																		}}
																	>
																		Highlighted callout box
																	</p>
																</div>
																<div style={{ flex: 1 }} />
																<div
																	style={{
																		width: 10,
																		height: 10,
																		borderRadius: 2,
																		background: c.border,
																		opacity: 0.7,
																	}}
																/>
															</motion.button>
														);
													},
												)}

												{/* Divider */}
												<div
													style={{
														height: 1,
														background: T.border,
														margin: "5px 0",
													}}
												/>
												<p
													style={{
														fontSize: 10,
														fontWeight: 700,
														color: "#B0AAA3",
														textTransform: "uppercase",
														letterSpacing: "0.1em",
														padding: "3px 8px 6px",
														margin: 0,
													}}
												>
													More blocks
												</p>

												{/* Code block */}
												<motion.button
													onClick={() => insertBlock("code")}
													whileHover={{ background: "#F7F5F0" }}
													style={{
														width: "100%",
														display: "flex",
														alignItems: "center",
														gap: 8,
														background: "none",
														border: "none",
														borderRadius: 8,
														padding: "7px 10px",
														cursor: "pointer",
														textAlign: "left",
														transition: "background 0.12s",
													}}
												>
													<span
														style={{
															fontSize: 15,
															width: 22,
															textAlign: "center",
														}}
													>
														{"</>"}
													</span>
													<div>
														<p
															style={{
																fontSize: 12,
																fontWeight: 600,
																color: T.accent,
																margin: 0,
																lineHeight: 1.2,
															}}
														>
															Code block
														</p>
														<p
															style={{
																fontSize: 10.5,
																color: "#A8A29C",
																margin: 0,
															}}
														>
															Syntax-highlighted code
														</p>
													</div>
												</motion.button>

												{/* Button */}
												<motion.button
													onClick={() => insertBlock("button")}
													whileHover={{ background: "#F7F5F0" }}
													style={{
														width: "100%",
														display: "flex",
														alignItems: "center",
														gap: 8,
														background: "none",
														border: "none",
														borderRadius: 8,
														padding: "7px 10px",
														cursor: "pointer",
														textAlign: "left",
														transition: "background 0.12s",
													}}
												>
													<span
														style={{
															fontSize: 15,
															width: 22,
															textAlign: "center",
														}}
													>
														🔗
													</span>
													<div>
														<p
															style={{
																fontSize: 12,
																fontWeight: 600,
																color: T.accent,
																margin: 0,
																lineHeight: 1.2,
															}}
														>
															CTA Button
														</p>
														<p
															style={{
																fontSize: 10.5,
																color: "#A8A29C",
																margin: 0,
															}}
														>
															Styled call-to-action link
														</p>
													</div>
												</motion.button>
											</motion.div>
										)}
									</AnimatePresence>
								</div>

								<div
									style={{
										width: 1,
										height: 18,
										background: T.border,
										margin: "0 4px",
									}}
								/>

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

								<div style={{ flex: 1 }} />
								<span style={{ fontSize: 12, color: T.muted }}>
									{wordCount} words
								</span>
								<div
									style={{
										width: 1,
										height: 18,
										background: T.border,
										margin: "0 4px",
									}}
								/>
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
										const raw =
											editorRef.current?.innerHTML || draft?.body || "";
										const content = raw.trim().startsWith("<")
											? raw
											: formatBody(raw);
										const title =
											titleRef.current?.innerText?.trim() ||
											draft?.title ||
											"Untitled draft";
										const htmlDoc = buildThemedHTML(content, THEMES.ink, title);
										setPreviewData({ title, htmlDoc });
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
																: "'Outfit', sans-serif",
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
									`}</style>
									<div
										ref={editorRef}
										contentEditable
										suppressContentEditableWarning
										onInput={countWords}
										onKeyDown={(e) => {
											if (e.key === "/" && !slashCommand) {
												e.preventDefault();
												const sel = window.getSelection();
												if (!sel?.rangeCount) return;
												const range = sel.getRangeAt(0);
												const rect = range.getBoundingClientRect();
												if (rect.width === 0 && rect.height === 0) return;
												setSlashCommand({
													x: Math.max(
														12,
														Math.min(rect.left, window.innerWidth - 280),
													),
													y: rect.bottom + 4,
												});
											}
										}}
										data-placeholder="Start writing…"
										style={{
											maxWidth: 680,
											margin: "0 auto",
											padding: "28px 40px 80px",
											minHeight: "100%",
											outline: "none",
											fontSize: `${editorFontSize}px`,
											lineHeight: 1.8,
											color: "#3A3530",
											fontFamily:
												editorFont === "Inter"
													? "'Inter', sans-serif"
													: editorFont === "Georgia"
														? "Georgia, serif"
														: editorFont === "system-ui"
															? "system-ui, sans-serif"
															: "'Outfit', sans-serif",
										}}
									/>
									{/* Slash command dropdown */}
									<AnimatePresence>
										{slashCommand && (
											<motion.div
												data-slash-command
												initial={{ opacity: 0, y: -4, scale: 0.98 }}
												animate={{ opacity: 1, y: 0, scale: 1 }}
												exit={{ opacity: 0, y: -4, scale: 0.98 }}
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
													maxHeight: 320,
													overflowY: "auto",
												}}
											>
												<p
													style={{
														fontSize: 10,
														fontWeight: 700,
														color: "#B0AAA3",
														textTransform: "uppercase",
														letterSpacing: "0.1em",
														margin: "0 0 6px 4px",
													}}
												>
													AI
												</p>
												<motion.button
													whileHover={{ background: "#F0ECE5" }}
													whileTap={{ scale: 0.98 }}
													onClick={() => handleSlashCommand("continue-writing")}
													style={{
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
													}}
												>
													<Icon
														d="M12 3l1.8 5.4L19.2 9l-5.4 1.8L12 16.2l-1.8-5.4L4.8 9l5.4-1.8L12 3z"
														size={18}
														stroke="#C17B2F"
													/>
													Continue Writing
												</motion.button>
												<motion.button
													whileHover={{ background: "#F0ECE5" }}
													whileTap={{ scale: 0.98 }}
													onClick={() => handleSlashCommand("ask-ai")}
													style={{
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
													}}
												>
													<Icon
														d="M12 3l1.8 5.4L19.2 9l-5.4 1.8L12 16.2l-1.8-5.4L4.8 9l5.4-1.8L12 3z"
														size={14}
														stroke="#C17B2F"
													/>
													Ask AI
												</motion.button>
												<div
													style={{
														height: 1,
														background: T.border,
														margin: "8px 0",
													}}
												/>
												<p
													style={{
														fontSize: 10,
														fontWeight: 700,
														color: "#B0AAA3",
														textTransform: "uppercase",
														letterSpacing: "0.1em",
														margin: "0 0 6px 4px",
													}}
												>
													Style
												</p>
												{[
													{ id: "text", label: "Text", icon: "T" },
													{ id: "h1", label: "Heading 1", icon: "H₁" },
													{ id: "h2", label: "Heading 2", icon: "H₂" },
													{ id: "h3", label: "Heading 3", icon: "H₃" },
													{
														id: "bullet",
														label: "Bullet List",
														icon: Icons.list,
													},
													{
														id: "numbered",
														label: "Numbered List",
														icon: Icons.list,
													},
													{ id: "todo", label: "To-do list", icon: "☐" },
												].map(({ id, label, icon }) => (
													<motion.button
														key={id}
														whileHover={{ background: "#F0ECE5" }}
														whileTap={{ scale: 0.98 }}
														onClick={() => handleSlashCommand(id)}
														style={{
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
														}}
													>
														{typeof icon === "string" &&
														!icon.startsWith("M") ? (
															<span
																style={{
																	fontSize: 14,
																	fontWeight: 600,
																	width: 20,
																	textAlign: "center",
																}}
															>
																{icon}
															</span>
														) : (
															<Icon d={icon} size={16} stroke={T.muted} />
														)}
														{label}
													</motion.button>
												))}
											</motion.div>
										)}
									</AnimatePresence>
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
													padding: 6,
													display: "flex",
													alignItems: "center",
													gap: 4,
													flexWrap: "wrap",
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
													style={{
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														width: 28,
														height: 28,
														padding: 0,
														border: "none",
														borderRadius: 6,
														background: "none",
														fontSize: 13,
														fontWeight: 700,
														color: T.accent,
														cursor: "pointer",
													}}
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
													style={{
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														width: 28,
														height: 28,
														padding: 0,
														border: "none",
														borderRadius: 6,
														background: "none",
														fontSize: 13,
														fontStyle: "italic",
														fontWeight: 600,
														color: T.accent,
														cursor: "pointer",
													}}
												>
													I
												</motion.button>
												<div
													style={{
														width: 1,
														height: 20,
														background: T.border,
														margin: "0 2px",
													}}
												/>
												{[
													{ cmd: "p", label: "Text" },
													{ cmd: "h1", label: "H1" },
													{ cmd: "h2", label: "H2" },
													{ cmd: "h3", label: "H3" },
													{ cmd: "ul", label: "• List" },
													{ cmd: "ol", label: "1. List" },
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
													onClick={() => {
														navigator.clipboard.writeText(
															selectionDropdown.text,
														);
														setSelectionDropdown(null);
													}}
													style={{
														display: "flex",
														alignItems: "center",
														gap: 5,
														padding: "6px 10px",
														border: "none",
														borderRadius: 6,
														background: "none",
														fontSize: 12,
														fontWeight: 600,
														color: T.accent,
														cursor: "pointer",
													}}
												>
													<Icon d={Icons.copy} size={12} stroke={T.muted} />
													Copy
												</motion.button>
												<motion.button
													whileHover={{ background: "rgba(239,68,68,0.1)" }}
													whileTap={{ scale: 0.96 }}
													onClick={() => {
														document.execCommand("delete");
														setSelectionDropdown(null);
														countWords();
													}}
													style={{
														display: "flex",
														alignItems: "center",
														gap: 5,
														padding: "6px 10px",
														border: "none",
														borderRadius: 6,
														background: "none",
														fontSize: 12,
														fontWeight: 600,
														color: "#EF4444",
														cursor: "pointer",
													}}
												>
													<Icon d={Icons.trash} size={12} stroke="#EF4444" />
													Delete
												</motion.button>
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

								{/* Infographics button */}
								<motion.button
									whileHover={{ background: "#F0ECE5" }}
									whileTap={{ scale: 0.97 }}
									onClick={() => setInfographicsOpen(true)}
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
									{/* Bar chart icon */}
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
										<line x1="18" y1="20" x2="18" y2="10" />
										<line x1="12" y1="20" x2="12" y2="4" />
										<line x1="6" y1="20" x2="6" y2="14" />
									</svg>
									Infographics
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
					draftContent={editorRef.current?.innerHTML || draft?.body || ""}
					draftTitle={draft?.title || "Draft"}
					userId={reduxUser?.uid || ""}
					selectionContext={selectionContext}
					asPanel
				/>
			</div>

			{/* ── THEMES MODAL ── full-screen two-panel preview */}
			<AnimatePresence>
				{themeDrawerOpen &&
					(() => {
						const activeTheme = THEMES[previewTheme];
						const currentHTML =
							editorRef.current?.innerHTML || draft?.body || "";
						const themedDoc = activeTheme
							? buildThemedHTML(currentHTML, activeTheme, draft?.title || "")
							: "";
						const isCopied = copiedTheme === previewTheme;
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
												— pick a theme to preview your content, then copy the
												HTML
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
													background: isCopied ? "#2D6A4F" : "#333",
												}}
												whileTap={{ scale: 0.96 }}
												onClick={() => handleCopyThemeHTML(previewTheme)}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 7,
													background: isCopied ? "#2D6A4F" : T.accent,
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
												{isCopied ? (
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
														Copied!
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
										flexShrink: 0,
									}}
								>
									<span
										style={{ fontSize: 14, fontWeight: 700, color: T.accent }}
									>
										Preview — {previewData.title || "Untitled"}
									</span>
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
								transform: "translate(-50%,-50%)",
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
				content={editorRef.current?.innerHTML || draft?.body || ""}
				title={draft?.title || "Draft"}
				userId={reduxUser?.uid || ""}
				draftId={draftId}
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
