/**
 * AIChatSidebar
 *
 * Right-side sliding panel with an AI writing assistant.
 * Light theme — matches the Inkgest app palette exactly.
 *
 * Props:
 *   open            bool   — whether the panel is visible
 *   onClose         fn     — called when the user closes the panel
 *   editorRef       ref    — contentEditable ref from the parent editor
 *   draftContent    string — current editor innerHTML (passed to AI as context)
 *   draftTitle      string — draft title (context)
 *   userId          string — Firebase UID for agent tools / cache (falls back to auth)
 *   onAgentDraftCreated  fn?(draftId: string) — after agent approves creating a draft
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "../config/firebase";
import { fetchInfographicsFromAgent } from "../api/infographicsAgentClient";
import { fetchMermaidFromAgent } from "../api/mermaidAgentClient";
import { resolveInfographicCreativeFormatId } from "../config/infographicCreativeFormats";
import ChatInfographicsPanel from "./ChatInfographicsPanel";
import ChatMermaidPanel from "./ChatMermaidPanel";
import { getUserCredits } from "../utils/credits";
import { deductCredits } from "../api/deductCredits";
import { fetchTranslate } from "../api/inkgestScrapeClient";
import { useInkgestScrape } from "../hooks/useInkgestScrape";
import {
	creditsForTranslationWords,
	countWordsInText,
} from "../utils/translationCredits";
import {
	languageCodeToApiLabel,
	resolveTranslationLanguageLabel,
} from "../utils/translateLanguage";
import {
	listAssets,
	createDraft,
	getAsset,
} from "../api/userAssets";
import {
	AIChatSidebarAgentBar,
	CHAT_MODE_ASK,
	CHAT_MODE_AGENT,
} from "./AIChatSidebarAgentBar";
import { searchAssetsWithFuse } from "../agent/searchUserAssetsWithFuse";
import { buildAgentDraftRecord } from "../agent/buildAgentDraftRecord";
import router from "next/router";
import { SparklesIcon } from "lucide-react";

/* ─── Inline CSS for chat prose and cursor animation ─── */
const ChatStyles = () => (
	<style>{`
    .ai-chat-prose p   { font-size:13px;line-height:1.8;color:#5A5550;margin:0 0 7px; }
    .ai-chat-prose p:last-child { margin-bottom:0; }
    .ai-chat-prose strong { color:#1A1A1A;font-weight:600; }
    .ai-chat-prose em { color:#C17B2F; }
    .ai-chat-prose ul { padding-left:16px;margin:4px 0 8px; }
    .ai-chat-prose li { font-size:13px;line-height:1.75;color:#5A5550;margin-bottom:3px; }
    .ai-chat-prose h1,.ai-chat-prose h2 { color:#1A1A1A;margin:10px 0 5px; }
    .ai-chat-prose h1 { font-size:16px; }
    .ai-chat-prose h2 { font-size:15px; }
    .ai-chat-prose h3 { font-size:13.5px;font-weight:600;color:#1A1A1A;margin:8px 0 3px; }
    .ai-chat-prose code { background:#F0ECE5;border:1px solid #E8E4DC;border-radius:4px;padding:1px 5px;font-size:11.5px;color:#C17B2F;font-family:monospace; }
    .ai-chat-prose blockquote { border-left:2px solid #C17B2F;padding:2px 0 2px 12px;margin:8px 0; }
    .ai-chat-prose blockquote p { color:#7A7570;font-style:italic; }
    .ai-chat-prose a.ai-chat-src-link { color:#C17B2F;font-weight:600;text-decoration:none;border-bottom:1px solid #E8CFB0;padding-bottom:1px;}
    .ai-chat-prose a.ai-chat-src-link:hover { opacity: 0.9; border-bottom-color: #C17B2F; }
    .ai-chat-prose pre { overflow:auto;max-height:220px;background:#FAF9F7;border-radius:10px;font-size:12px;padding:12px;line-height:1.55;border:1px solid #EDE9E2;color:#433F3C;white-space:pre-wrap;word-break:break-word;margin:10px 0; }
    @keyframes ai-blink { 0%,100%{opacity:1} 50%{opacity:0} }
    .ai-stream-cursor { display:inline-block;width:2px;height:12px;background:#C17B2F;border-radius:1px;margin-left:2px;vertical-align:middle;animation:ai-blink 0.85s ease-in-out infinite; }
    ::-webkit-scrollbar { width:4px; }
    ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:#E8E4DC;border-radius:10px; }
    ::-webkit-scrollbar-thumb:hover { background:#C17B2F; }
  `}</style>
);

const RAW_URL_SPLIT_RE = /(https?:\/\/[^\s]+)/g;
/** Loose URL scan for attachments (paste / typed body). */
const ATTACH_URL_RE = /\bhttps?:\/\/[^\s<>"')]+/gi;

const MAX_CHAT_URL_ATTACHMENTS = 15;
const MAX_CHAT_IMAGE_ATTACHMENTS = 6;

function normalizeHttpUrl(raw) {
	const trimmed = String(raw || "")
		.trim()
		.replace(/[)\].,;:]+$/g, "");
	try {
		const u = new URL(trimmed);
		if (u.protocol !== "http:" && u.protocol !== "https:") return null;
		return u.href;
	} catch {
		return null;
	}
}

function extractHttpUrls(text) {
	const m = String(text || "").match(ATTACH_URL_RE) || [];
	const out = [];
	const seen = new Set();
	for (const cand of m) {
		const n = normalizeHttpUrl(cand);
		if (n && !seen.has(n)) {
			seen.add(n);
			out.push(n);
		}
	}
	return out;
}

function uniqUrls(urls, cap = MAX_CHAT_URL_ATTACHMENTS) {
	const seen = new Set();
	const out = [];
	for (const u of urls) {
		if (!u || seen.has(u)) continue;
		seen.add(u);
		out.push(u);
		if (out.length >= cap) break;
	}
	return out;
}

function buildChatAttachmentPrefix(urls, images) {
	const lines = [];
	if (urls.length) {
		lines.push(
			"[Attached URLs — fetch page content with scrape_url or scrape_urls as appropriate]",
			...urls,
		);
	}
	if (images.length) {
		lines.push(
			`[Attached images (${images.length}) — multimodal / vision API coming soon; filenames shown for reference]`,
			...images.map((im) => `• ${im.name}`),
		);
	}
	return lines.length ? `${lines.join("\n")}\n\n` : "";
}

function shortenUrlChip(url) {
	try {
		const u = new URL(url);
		const path =
			u.pathname === "/"
				? ""
				: u.pathname.slice(0, 28) +
					(u.pathname.length > 28 ? "…" : "");
		const host = u.hostname.replace(/^www\./, "");
		const s = `${host}${path}`;
		return s.length > 52 ? `${s.slice(0, 24)}…${s.slice(-18)}` : s;
	} catch {
		return url.slice(0, 48) + (url.length > 48 ? "…" : "");
	}
}

function extractHost(u) {
	try {
		return new URL(u).hostname;
	} catch {
		return u || "";
	}
}

/** Link bare https URLs only (avoids breaking existing HTML from prior transforms). */
function linkifyBareUrls(s) {
	if (/<a\s/i.test(s)) return s;
	return s.replace(
		/\b(https?:\/\/[^\s<]+)/g,
		(u) =>
			`<a href="${u}" target="_blank" rel="noopener noreferrer" class="ai-chat-src-link">${u}</a>`,
	);
}

/** Link `/app/{draftOrTableId}` so users can open library items from assistant text. */
function linkifyInternalAppPaths(s) {
	if (!s || /<a\s/i.test(s)) return s;
	return s.replace(
		/\B(\/app\/[a-zA-Z0-9_-]+)\b/g,
		(path) =>
			`<a href="${path}" class="ai-chat-src-link" title="Open in Inkgest">${path}</a>`,
	);
}

function formatChatInline(s) {
	return linkifyInternalAppPaths(linkifyBareUrls(s));
}

/** Dedupe by id — accumulates assets surfaced via search_user_assets. */
function mergeAssetLinks(prev = [], rows = []) {
	const seen = new Set(prev.map((r) => r.id).filter(Boolean));
	const out = [...prev];
	for (const r of rows) {
		const id = r?.id;
		if (!id || seen.has(id)) continue;
		seen.add(id);
		out.push({
			id,
			title: r.title || "(untitled)",
			type: r.type || "draft",
		});
	}
	return out;
}

/* ─── Markdown → display HTML (for chat bubbles) ─── */
function md(text = "") {
	const lines = text.split("\n");
	const out = [];
	let ul = false;
	for (const raw of lines) {
		let l = raw
			.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.+?)\*/g, "<em>$1</em>")
			.replace(/`(.+?)`/g, "<code>$1</code>");
		if (/^### /.test(raw)) {
			if (ul) { out.push("</ul>"); ul = false; }
			out.push(`<h3>${l.replace(/^### /, "")}</h3>`);
		} else if (/^## /.test(raw)) {
			if (ul) { out.push("</ul>"); ul = false; }
			out.push(`<h2>${l.replace(/^## /, "")}</h2>`);
		} else if (/^# /.test(raw)) {
			if (ul) { out.push("</ul>"); ul = false; }
			out.push(`<h1>${l.replace(/^# /, "")}</h1>`);
		} else if (/^> /.test(raw)) {
			if (ul) { out.push("</ul>"); ul = false; }
			out.push(`<blockquote><p>${formatChatInline(l.slice(2))}</p></blockquote>`);
		} else if (/^- /.test(raw)) {
			if (!ul) { out.push("<ul>"); ul = true; }
			out.push(`<li>${formatChatInline(l.slice(2))}</li>`);
		} else if (!raw.trim()) {
			if (ul) { out.push("</ul>"); ul = false; }
		} else {
			if (ul) { out.push("</ul>"); ul = false; }
			out.push(`<p>${formatChatInline(l)}</p>`);
		}
	}
	if (ul) out.push("</ul>");
	return out.join("");
}

function UserMessageWithLinks({ text }) {
	const parts = String(text || "").split(RAW_URL_SPLIT_RE);
	return (
		 <>
			{parts.map((part, i) =>
				/^https?:\/\//.test(part) ? (
					<a
						key={i}
						href={part}
						target="_blank"
						rel="noopener noreferrer"
						className="ai-chat-src-link"
						style={{ wordBreak: "break-all" }}
					>
						{part}
					</a>
				) : (
					<span key={i}>{part}</span>
				),
			)}
		</>
	);
}

const SCRAPE_PREVIEW_LEN = 4500;
/** Content body scroll zone for scraped markdown (scrollbar hidden via globals). */
const SCRAPED_BODY_MAX_HEIGHT_PX = 300;

/** Overlay sidebar: drag handle can widen panel by up to this many px (max = default + this). */
const AI_CHAT_OVERLAY_W_DEFAULT = 390;
const AI_CHAT_OVERLAY_DRAG_MAX_EXTRA_PX = 300;
const AI_CHAT_OVERLAY_W_MIN = 280;
const AI_CHAT_OVERLAY_W_MAX =
	AI_CHAT_OVERLAY_W_DEFAULT + AI_CHAT_OVERLAY_DRAG_MAX_EXTRA_PX;
/** Resize grip height — matches Tailwind h-24 (6rem → 96px). */
const AI_CHAT_RESIZE_HANDLE_H = 96;

function LibraryAssetLinksPanel({ links }) {
	if (!links?.length) return null;
	return (
		<div
			style={{
				marginBottom: 10,
				borderRadius: 10,
				border: "1px solid #D4E4DC",
				background: "linear-gradient(180deg, #F8FDF9 0%,rgb(251, 251, 251) 100%)",
				overflow: "hidden",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "8px 10px",
					borderBottom: "1px solid #E0EBE3",
					background: "#FFFFFF95",
				}}
			>
				<span style={{ fontSize: 11, fontWeight: 700, color: "#1E4630" }}>
					Your library
				</span>
				<span style={{ fontSize: 10.5, color: "#5C8A6E" }}>
					{links.length} match{links.length === 1 ? "" : "es"}
				</span>
			</div>
			<div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
				{links.map((a) => (
					<div
						key={a.id}
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 8,
							flexWrap: "wrap",
						}}
					>
						<span
							style={{
								fontSize: 12,
								fontWeight: 600,
								color: "#3D3A36",
								lineHeight: 1.35,
								flex: "1 1 120px",
								minWidth: 0,
								wordBreak: "break-word",
							}}
						>
							{a.title}
							<span
								style={{
									marginLeft: 6,
									fontSize: 10,
									fontWeight: 600,
									color: "#7A9685",
									textTransform: "uppercase",
									letterSpacing: "0.04em",
								}}
							>
								{a.type}
							</span>
						</span>
						<button
							onClick={() => router.push(`/app/${a.id}`,undefined ,{ shallow: false})}
							className="ai-chat-src-link"
							style={{
								fontSize: 11,
								fontWeight: 700,
								flexShrink: 0,
								padding: "4px 10px",
								borderRadius: 8,
								border: "1px solid #C9E0CF",
								background: "#FFFFFF",
								textDecoration: "none",
								color: "#C17B2F",
							}}
						>
							Open
						</button>
					</div>
				))}
			</div>
		</div>
	);
}

function ScrapedSourcesPanel({ sources }) {
	const [tab, setTab] = useState(0);
	if (!sources?.length) return null;
	const safeTab = Math.min(tab, sources.length - 1);
	const cur = sources[safeTab];
	const title = cur.title || cur.url || "Source";
	const body = cur.error
		? `Scrape failed: ${cur.error}`
		: (cur.markdown || "").slice(0, SCRAPE_PREVIEW_LEN) +
			((cur.markdown || "").length > SCRAPE_PREVIEW_LEN ? "\n\n…" : "");

	return (
		<div
			className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden text-zinc-900"
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "8px 10px",
					borderBottom: "1px solid #EDE4D6",
					background: "#FFFFFF95",
				}}
			>
				<span style={{ fontSize: 11, fontWeight: 700, color: "#5e5e5e" }}>
					Scraped content
				</span>
				<span style={{ fontSize: 10.5, color: "#B08B5F" }}>
					Inkgest API · {sources.length} page{sources.length === 1 ? "" : "s"}
				</span>
			</div>

			{sources.length > 1 && (
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: 5,
						padding: "8px 10px",
						borderBottom: "1px solid #EDE4D6",
					}}
				>
					{sources.map((s, i) => {
						const label = s.title?.trim?.() ? s.title.slice(0, 36) + (s.title.length > 36 ? "…" : "") : extractHost(s.url || "");
						const active = safeTab === i;
						return (
							<button
								type="button"
								key={`${s.url}-${i}`}
								onClick={() => setTab(i)}
								style={{
									border: `1px solid ${active ? "#C17B2F" : "#E8E4DC"}`,
									background: active ? "#C17B2F15" : "#FFFFFF",
									color: active ? "#92400E" : "#5A5550",
									borderRadius: 8,
									padding: "4px 9px",
									fontSize: 11,
									fontWeight: 600,
									cursor: "pointer",
									maxWidth: "100%",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
							>
								{label || `Page ${i + 1}`}
							</button>
						);
					})}
				</div>
			)}

			<div style={{ padding: "10px 12px" }}>
				{cur.url && (
					<a
						href={cur.url}
						target="_blank"
						rel="noopener noreferrer"
						className="ai-chat-src-link"
						style={{
							fontSize: 11.5,
							fontWeight: 600,
							display: "inline-block",
							marginBottom: 8,
							wordBreak: "break-all",
						}}
					>
						{cur.url}
					</a>
				)}
				<p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#1A1A1A" }}>
					{title}
				</p>
				<pre
					className="hidescrollbar"
					style={{
						margin: 0,
						maxHeight: SCRAPED_BODY_MAX_HEIGHT_PX,
						overflowY: "auto",
						whiteSpace: "pre-wrap",
						wordBreak: "break-word",
						lineHeight: 1.55,
						fontFamily: "'SF Mono','Monaco','Inconsolata','Fira Mono', monospace",
						fontSize: 12,
						color: "#433F3C",
					}}
				>{body}</pre>
			</div>
		</div>
	);
}

function ChatTranslationsPanel({ items, copiedId, onCopy }) {
	const [tab, setTab] = useState(0);
	if (!items?.length) return null;
	const safeTab = Math.min(tab, items.length - 1);
	const cur = items[safeTab];
	const label = cur.languageLabel || resolveTranslationLanguageLabel(cur.language);

	return (
		<div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden text-zinc-900">
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "8px 10px",
					borderBottom: "1px solid #EDE4D6",
					background: "#FFFFFF95",
				}}
			>
				<span style={{ fontSize: 11, fontWeight: 700, color: "#5e5e5e" }}>
					Translation
				</span>
				<span style={{ fontSize: 10.5, color: "#B08B5F" }}>
					{label}
					{items.length > 1 ? ` · ${safeTab + 1}/${items.length}` : ""}
				</span>
			</div>

			{items.length > 1 && (
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: 5,
						padding: "8px 10px",
						borderBottom: "1px solid #EDE4D6",
					}}
				>
					{items.map((t, i) => {
						const tabLabel =
							t.languageLabel ||
							resolveTranslationLanguageLabel(t.language);
						const active = safeTab === i;
						return (
							<button
								type="button"
								key={t.id || `${t.language}-${i}`}
								onClick={() => setTab(i)}
								style={{
									border: `1px solid ${active ? "#C17B2F" : "#E8E4DC"}`,
									background: active ? "#C17B2F15" : "#FFFFFF",
									color: active ? "#92400E" : "#5A5550",
									borderRadius: 8,
									padding: "4px 9px",
									fontSize: 11,
									fontWeight: 600,
									cursor: "pointer",
								}}
							>
								{tabLabel}
							</button>
						);
					})}
				</div>
			)}

			<div style={{ padding: "10px 12px" }}>
				{cur.error ? (
					<p style={{ margin: 0, fontSize: 12, color: "#7A7570", lineHeight: 1.55 }}>
						{cur.error}
					</p>
				) : (
					<div
						className="ai-chat-prose"
						dangerouslySetInnerHTML={{ __html: md(cur.markdown || "") }}
					/>
				)}
				{!cur.error && cur.markdown ? (
					<div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
						<ActionBtn
							icon={copiedId === cur.id ? PATHS.check : PATHS.copy}
							label={copiedId === cur.id ? "Copied" : "Copy"}
							active={copiedId === cur.id}
							onClick={() => onCopy(cur.id, cur.markdown)}
						/>
					</div>
				) : null}
			</div>
		</div>
	);
}

/* ─── Markdown → editor-safe HTML with light-theme inline styles ─── */
function mdEditor(text = "") {
	const lines = text.split("\n");
	const out = [];
	let ul = false;
	for (const raw of lines) {
		let l = raw
			.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.+?)\*/g, "<em>$1</em>")
			.replace(
				/`(.+?)`/g,
				'<code style="background:#F0ECE5;border:1px solid #E8E4DC;border-radius:4px;padding:1px 5px;font-size:13px;font-family:monospace;color:#C17B2F">$1</code>',
			);
		if (/^# /.test(raw)) {
			if (ul) { out.push("</ul>"); ul = false; }
			out.push(`<h1 style="font-size:28px;color:#1A1A1A;line-height:1.25;margin:0 0 14px;font-weight:400">${l.slice(2)}</h1>`);
		} else if (/^## /.test(raw)) {
			if (ul) { out.push("</ul>"); ul = false; }
			out.push(`<h2 style="font-size:22px;color:#1A1A1A;line-height:1.3;margin:20px 0 10px;font-weight:400">${l.slice(3)}</h2>`);
		} else if (/^### /.test(raw)) {
			if (ul) { out.push("</ul>"); ul = false; }
			out.push(`<h3 style="font-size:18px;color:#1A1A1A;margin:16px 0 8px;font-weight:600">${l.slice(4)}</h3>`);
		} else if (/^> /.test(raw)) {
			if (ul) { out.push("</ul>"); ul = false; }
			out.push(`<blockquote style="border-left:2px solid #C17B2F;padding:4px 0 4px 16px;margin:14px 0"><p style="color:#7A7570;font-style:italic;margin:0">${l.slice(2)}</p></blockquote>`);
		} else if (/^- /.test(raw)) {
			if (!ul) { out.push('<ul style="padding-left:22px;margin:0 0 14px">'); ul = true; }
			out.push(`<li style="font-size:15px;line-height:1.8;color:#3A3530;margin-bottom:5px">${l.slice(2)}</li>`);
		} else if (!raw.trim()) {
			if (ul) { out.push("</ul>"); ul = false; }
			out.push("<p><br></p>");
		} else {
			if (ul) { out.push("</ul>"); ul = false; }
			out.push(`<p style="font-size:15px;line-height:1.85;color:#3A3530;margin:0 0 14px">${l}</p>`);
		}
	}
	if (ul) out.push("</ul>");
	return out.join("");
}

/* ─── Available models ─── */
const MODELS = [
	{
		id:    "openai/gpt-4o",
		label: "GPT-4o",
		sub:   "OpenAI · Fast & capable",
		dot:   "#10A37F",
	},
	{
		id:    "google/gemini-2.0-flash-001",
		label: "Gemini 2.0 Flash",
		sub:   "Google · Speed-optimised",
		dot:   "#4285F4",
	},
	{
		id:    "anthropic/claude-3-5-sonnet",
		label: "Claude 3.5 Sonnet",
		sub:   "Anthropic · Writing-first",
		dot:   "#D97757",
	},
];

/* ─── Starter prompts ─── */
const STARTERS = [
	{ e: "✍️", l: "Write a hook",     q: "Write a compelling opening hook for this content — one punchy sentence that makes readers need to keep reading." },
	{ e: "💡", l: "Improve intro",    q: "Improve the introduction of my current draft — make it more engaging and hook the reader immediately." },
	{ e: "📝", l: "Write a CTA",      q: "Write 3 variations of a compelling CTA for this newsletter: one urgency-based, one curiosity-based, one benefit-led." },
	{ e: "⚡", l: "Make it punchier", q: "Review the draft and suggest 3 specific edits to make it punchier and more direct — cut the fluff." },
	{ e: "🔄", l: "Suggest structure",q: "Based on the draft content, suggest an improved article structure with section headings and a one-line description for each." },
	{ e: "📋", l: "Add examples",     q: "Suggest 2-3 concrete real-world examples or case studies I can add to make this draft more compelling and credible." },
];

const FOLLOWUPS = ["Make shorter", "Make punchier", "More formal", "Add a CTA", "Add examples", "Expand further", "Add a subheading"];

/* ─── SVG icon helper ─── */
const Ic = ({ d, size = 13, col = "#7A7570", fill = "none", sw = 1.75 }) => (
	<svg
		width={size} height={size} viewBox="0 0 24 24"
		fill={fill} stroke={col} strokeWidth={sw}
		strokeLinecap="round" strokeLinejoin="round"
		style={{ flexShrink: 0 }}
	>
		<path d={d} />
	</svg>
);

const PATHS = {
	send:    "M22 2L11 13M22 2 15 22l-4-9-9-4 20-7z",
	copy:    "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-4-4H8zM14 2v6h6M8 13h8M8 17h5",
	check:   "M20 6 9 17l-5-5",
	trash:   "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
	close:   "M18 6L6 18M6 6l12 12",
	spark:   "M12 3l1.8 5.4L19.2 9l-5.4 1.8L12 16.2l-1.8-5.4L4.8 9l5.4-1.8L12 3z",
	paperclip:
		"M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48",
	ins:     "M12 5v14M5 12h14",
	app:     "M12 19V5M5 12l7 7 7-7",
	rep:     "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15",
	chevron: "M6 9l6 6 6-6",
	mic: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8",
};

/* ─── Action button sub-component ─── */
function ActionBtn({ icon, label, onClick, highlight = false, active = false }) {
	return (
		<motion.button
			whileHover={{
				scale: 1.04,
				background: highlight ? "#C17B2F" : "#F0ECE5",
				color: highlight ? "white" : "#1A1A1A",
			}}
			whileTap={{ scale: 0.93 }}
			onClick={onClick}
			style={{
				display: "flex", alignItems: "center", gap: 4,
				background: active ? "#C17B2F15" : highlight ? "#C17B2F10" : "#F7F5F0",
				border: `1px solid ${active ? "#C17B2F50" : highlight ? "#C17B2F35" : "#E8E4DC"}`,
				borderRadius: 7, padding: "4px 9px",
				fontSize: 11, fontWeight: 600,
				color: active ? "#C17B2F" : highlight ? "#C17B2F" : "#7A7570",
				cursor: "pointer", transition: "all 0.14s",
			}}
		>
			<Ic d={icon} size={11} col={active || highlight ? "#C17B2F" : "#7A7570"} />
			{label}
		</motion.button>
	);
}

/** Circular gauge: credits used vs limit beside the model selector. */
function ChatCreditsRing({ creditsUsed, creditsLimit }) {
	const used = Number(creditsUsed) || 0;
	const rawLimit = Number(creditsLimit);
	const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 1;
	const exhausted = used >= limit;
	const warn = !exhausted && used >= limit * 0.8;
	const frac = Math.min(1, used / limit);

	const strokeCol = exhausted ? "#EF4444" : warn ? "#C17B2F" : "#4A7C59";

	const size = 24;
	const stroke = 3.75;
	const r = (size - stroke) / 2 - 0.75;
	const cx = size / 2;
	const cy = size / 2;
	const circumference = 2 * Math.PI * r;
	const dashOffset = circumference * (1 - frac);

	return (
		<div
			className="select-none shrink-0"
			style={{ width: size, height: size, position: "relative" }}
			title={`${+used.toFixed(2)} / ${limit} credits · ~¼ per message`}
		>
			<svg width={size} height={size} aria-hidden style={{ transform: "rotate(-90deg)" }}>
				<circle
					cx={cx}
					cy={cy}
					r={r}
					fill="none"
					stroke="#EDE9E4"
					strokeWidth={stroke}
				/>
				<motion.circle
					cx={cx}
					cy={cy}
					r={r}
					fill="none"
					stroke={strokeCol}
					strokeWidth={stroke}
					strokeLinecap="round"
					strokeDasharray={circumference}
					initial={{ strokeDashoffset: circumference }}
					animate={{ strokeDashoffset: dashOffset }}
					transition={{ duration: 0.5, ease: "easeOut" }}
				/>
			</svg>
			<div
				style={{
					position: "absolute",
					inset: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					pointerEvents: "none",
				}}
			>
				
			</div>
		</div>
	);
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function AIChatSidebar({
	open,
	onClose,
	editorRef,
	draftContent = "",
	draftTitle = "",
	selectionContext = "",
	onClearSelectionContext,
	asPanel = false,
	/** When overlay mode (`!asPanel`), cap width so small viewports aren’t clipped. */
	clampOverlayToViewport = false,
	userId: userIdProp = "",
	onAgentDraftCreated,
}) {
	const [messages, setMessages] = useState([{
		id: "w0", role: "assistant", done: true,
		content:
			"I'm your **AI writing assistant**.\n\nAsk me to write hooks, headlines, full sections, rewrites, CTAs or outlines. **Paste a link** — it appears as a chip above the box and I'll scrape it with the Inkgest API. **Paste or attach images** (chips with preview); vision is coming soon, but filenames are included for context. Ask for **infographics**, **Mermaid diagrams**, or **translations** from your draft or scraped text",
		chatTranslations: [],
	}]);
	const [input, setInput]         = useState("");
	const [attachedUrls, setAttachedUrls] = useState([]);
	const [attachedImages, setAttachedImages] = useState([]);
	const [streaming, setStreaming]   = useState(false);
	const [copiedId, setCopiedId]    = useState(null);
	const [copiedTranslationId, setCopiedTranslationId] = useState(null);
	const [toast, setToast]          = useState("");
	const [model, setModel]          = useState(MODELS[0]);
	const [modelOpen, setModelOpen]  = useState(false);
	const [agentModeOpen, setAgentModeOpen] = useState(false);
	const [chatMode, setChatMode]     = useState(CHAT_MODE_ASK);
	const [followUpOpenFor, setFollowUpOpenFor] = useState(null);
	const [approvingForMsgId, setApprovingForMsgId] = useState(null);
	const [overlayWidth, setOverlayWidth] = useState(AI_CHAT_OVERLAY_W_DEFAULT);
	const [credits, setCredits]      = useState(null);
	const bottomRef = useRef(null);
	const taRef     = useRef(null);
	const speechRecRef = useRef(null);
	const dictationAnchorRef = useRef("");
	const dictationFinalRef = useRef("");
	const [dictationActive, setDictationActive] = useState(false);
	const chatImageInputRef = useRef(null);
	const attachedImagesLiveRef = useRef([]);
	const abortRef  = useRef(null);
	const { scrapeOne, scrapeMany, scrapeYoutube } = useInkgestScrape();
	const queryClient = useQueryClient();
	const effectiveUserId =
		userIdProp || auth.currentUser?.uid || "";

	const libraryToolsActive =
		open &&
		Boolean(effectiveUserId) &&
		(chatMode === CHAT_MODE_AGENT || chatMode === CHAT_MODE_ASK);

	const { data: agentAssets = [] } = useQuery({
		queryKey: ["assets", effectiveUserId],
		queryFn: () => listAssets(effectiveUserId),
		enabled: libraryToolsActive,
		staleTime: 45_000,
	});

	const createAgentDraftMutation = useMutation({
		mutationFn: async ({ uid, draft }) => {
			if (!uid) throw new Error("Sign in required.");
			const { id } = await createDraft(uid, draft);
			return id;
		},
		onSuccess: (_, vars) => {
			if (vars?.uid)
				queryClient.invalidateQueries({ queryKey: ["assets", vars.uid] });
		},
	});

	/* Load / refresh credits */
	const refreshCredits = useCallback(() => {
		const uid = auth.currentUser?.uid;
		if (uid) getUserCredits(uid).then(setCredits).catch(() => {});
	}, []);

	useEffect(() => {
		if (open) refreshCredits();
	}, [open, refreshCredits]);

	useEffect(() => {
		attachedImagesLiveRef.current = attachedImages;
	}, [attachedImages]);

	useEffect(() => {
		return () => {
			attachedImagesLiveRef.current.forEach((im) => {
				if (im?.previewUrl) URL.revokeObjectURL(im.previewUrl);
			});
		};
	}, []);

	useEffect(() => {
		return () => {
			try {
				speechRecRef.current?.stop();
			} catch {
				/* ignore */
			}
			speechRecRef.current = null;
		};
	}, []);

	const addChatImageFiles = useCallback((fileList) => {
		const files = Array.from(fileList || []).filter((f) =>
			String(f?.type || "").startsWith("image/"),
		);
		if (!files.length) return;
		setAttachedImages((prev) => {
			const next = [...prev];
			for (const file of files) {
				if (next.length >= MAX_CHAT_IMAGE_ATTACHMENTS) break;
				next.push({
					id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
					previewUrl: URL.createObjectURL(file),
					name: file.name?.trim() || "Image",
					file,
				});
			}
			return next;
		});
	}, []);

	const removeAttachedUrl = useCallback((url) => {
		setAttachedUrls((prev) => prev.filter((u) => u !== url));
	}, []);

	const removeAttachedImage = useCallback((id) => {
		setAttachedImages((prev) => {
			const row = prev.find((x) => x.id === id);
			if (row?.previewUrl) URL.revokeObjectURL(row.previewUrl);
			return prev.filter((x) => x.id !== id);
		});
	}, []);

	const handleChatPaste = useCallback(
		(e) => {
			const items = e.clipboardData?.items;
			if (items) {
				const imageFiles = [];
				for (let i = 0; i < items.length; i++) {
					const it = items[i];
					if (it.kind === "file" && it.type.startsWith("image/")) {
						const f = it.getAsFile();
						if (f) imageFiles.push(f);
					}
				}
				if (imageFiles.length) {
					e.preventDefault();
					addChatImageFiles(imageFiles);
					return;
				}
			}
			const pasted = e.clipboardData?.getData("text/plain") || "";
			const found = extractHttpUrls(pasted);
			if (!found.length) return;
			e.preventDefault();
			setAttachedUrls((prev) => uniqUrls([...prev, ...found]));
			let remainder = pasted;
			for (const u of found) remainder = remainder.split(u).join(" ");
			remainder = remainder.replace(/\s+/g, " ").trim();
			if (remainder)
				setInput((prev) =>
					(prev ? `${prev.trimEnd()} ` : "") + remainder,
				);
		},
		[addChatImageFiles],
	);

	const handleChatDrop = useCallback(
		(e) => {
			const dt = e.dataTransfer;
			if (!dt?.files?.length) return;
			const imgs = Array.from(dt.files).filter((f) =>
				f.type.startsWith("image/"),
			);
			if (!imgs.length) return;
			e.preventDefault();
			addChatImageFiles(imgs);
		},
		[addChatImageFiles],
	);

	/* Scroll to latest message */
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	/* Focus textarea when opened */
	useEffect(() => {
		if (open) setTimeout(() => taRef.current?.focus(), 320);
	}, [open]);

	const showToast = useCallback((msg) => {
		setToast(msg);
		setTimeout(() => setToast(""), 2200);
	}, []);

	const speechRecognitionSupported =
		typeof window !== "undefined" &&
		Boolean(
			window.SpeechRecognition ||
				window.webkitSpeechRecognition,
		);

	const toggleDictation = useCallback(() => {
		if (streaming) return;
		const SR =
			typeof window !== "undefined" &&
			(window.SpeechRecognition ||
				window.webkitSpeechRecognition);
		if (!SR) {
			showToast("Voice input works in Chrome, Edge & Safari");
			return;
		}

		if (dictationActive) {
			try {
				speechRecRef.current?.stop();
			} catch {
				/* ignore */
			}
			return;
		}

		dictationAnchorRef.current = input;
		dictationFinalRef.current = "";

		try {
			const recognition = new SR();
			recognition.lang =
				(typeof navigator !== "undefined" &&
					(navigator.language ||
						(Array.isArray(navigator.languages) &&
							navigator.languages[0]))) ||
				"en-US";
			recognition.continuous = true;
			recognition.interimResults = true;

			recognition.onresult = (event) => {
				let interim = "";
				for (let i = event.resultIndex; i < event.results.length; i++) {
					const res = event.results[i];
					const piece = res[0]?.transcript ?? "";
					if (res.isFinal)
						dictationFinalRef.current +=
							piece + (/\s$/.test(piece) ? "" : " ");
					else interim += piece;
				}
				setInput(
					dictationAnchorRef.current +
						dictationFinalRef.current +
						interim,
				);
			};

			recognition.onerror = (e) => {
				console.warn("[chat dictation]", e.error);
				speechRecRef.current = null;
				setDictationActive(false);
				if (e.error === "not-allowed")
					showToast("Microphone permission denied");
				else if (
					e.error !== "aborted" &&
					e.error !== "no-speech"
				) {
					if (e.error === "network")
						showToast("Voice input needs a connection");
					else showToast("Voice error — tap mic to try again");
				}
			};

			recognition.onend = () => {
				setDictationActive(false);
				speechRecRef.current = null;
			};

			speechRecRef.current = recognition;
			recognition.start();
			setDictationActive(true);
			queueMicrotask(() => taRef.current?.focus());
		} catch {
			showToast("Could not start voice input");
			setDictationActive(false);
		}
	}, [streaming, dictationActive, input, showToast]);

	/* ── Push content into the parent editor ── */
	const push = (content, mode) => {
		const el = editorRef?.current;
		if (!el) return;
		const html = mdEditor(content);
		if (mode === "replace") {
			el.innerHTML = html;
			showToast("✓ Replaced editor content");
		} else if (mode === "insert") {
			el.innerHTML = html + (el.innerHTML || "");
			showToast("✓ Inserted at top");
		} else {
			el.innerHTML = (el.innerHTML || "") + html;
			el.scrollTop = el.scrollHeight;
			showToast("✓ Appended to editor");
		}
		// Trigger input so parent word-count updates
		el.dispatchEvent(new Event("input", { bubbles: true }));
	};

	const copyMsg = (id, content) => {
		navigator.clipboard.writeText(content).catch(() => {});
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 2000);
	};

	const copyTranslation = (id, content) => {
		navigator.clipboard.writeText(content || "").catch(() => {});
		setCopiedTranslationId(id);
		setTimeout(() => setCopiedTranslationId(null), 2000);
	};

	/* ── Send a message (streaming SSE + optional scrape tool rounds via OpenRouter) ── */
	const send = useCallback(async (override) => {
		const rawText = (override ?? input).trim();
		const urlsInBody = extractHttpUrls(rawText);
		let remainder = rawText;
		for (const u of urlsInBody) remainder = remainder.split(u).join(" ");
		remainder = remainder.replace(/\s+/g, " ").trim();

		const mergedUrls = uniqUrls([...attachedUrls, ...urlsInBody]);
		const imagesSnap = attachedImages.map(
			({ id, previewUrl, name, file }) => ({
				id,
				previewUrl,
				name,
				file,
			}),
		);

		const prefix = buildChatAttachmentPrefix(mergedUrls, imagesSnap);
		const composed = prefix + remainder;

		if (!composed.trim() || streaming) return;

		try {
			speechRecRef.current?.stop();
		} catch {
			/* ignore */
		}
		speechRecRef.current = null;
		setDictationActive(false);

		const uid = `u${Date.now()}`;
		const aid = `a${Date.now()}`;

		setMessages(prev => [
			...prev,
			{ id: uid, role: "user", done: true, content: composed },
			{
				id: aid,
				role: "assistant",
				done: false,
				content: "",
				scrapeSources: [],
				chatTranslations: [],
				chatInfographics: [],
				chatMermaids: [],
				agentTrace: [],
				assetLinks: [],
			},
		]);
		setInput("");
		setAttachedUrls([]);
		for (const im of imagesSnap) {
			if (im.previewUrl) URL.revokeObjectURL(im.previewUrl);
		}
		setAttachedImages([]);
		setStreaming(true);

		const recentHistory = messages
			.slice(-10)
			.map(m => ({ role: m.role, content: m.content || "" }));
		const plainContext = draftContent
			? draftContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500)
			: "";
		const selectionPlain = selectionContext
			? selectionContext.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800)
			: "";
		let contextPrefix = "";
		if (chatMode === CHAT_MODE_AGENT) {
			contextPrefix +=
				"[Assistant mode: Agent — workspace search, read saved drafts/tables, scrape links, and propose new drafts for user approval.]\n\n";
		} else if (chatMode === CHAT_MODE_ASK) {
			contextPrefix +=
				"[Assistant mode: Ask — search the user's saved drafts/tables for 'find my…' / 'my blog about…'; use web scrape only for pasted https URLs.]\n\n";
		}
		if (plainContext) contextPrefix += `[Editor context — current draft: "${plainContext}"]\n\n`;
		if (selectionPlain) contextPrefix += `[User-selected text for focus: "${selectionPlain}"]\n\n`;

		let thread = [
			...recentHistory,
			{ role: "user", content: contextPrefix + composed },
		];

		const mergeSource = (prev, row) => {
			const u = row.url || "";
			const rest = prev.filter(s => (s.url || "") !== u);
			return [...rest, row];
		};

		let aggregatedSources = [];
		let aggregatedTranslations = [];
		let aggregatedInfographics = [];
		let aggregatedMermaids = [];

		abortRef.current = new AbortController();

		const consumeSseOnce = async (res, displayPrefix) => {
			const reader = res.body?.getReader();
			if (!reader) return { roundText: "", tool_calls: null };
			const decoder = new TextDecoder();
			let buffer = "";
			let roundText = "";
			let tool_calls = null;
			const joinPrefix = (suffix) => {
				if (displayPrefix && suffix) return `${displayPrefix}\n\n${suffix}`;
				return `${displayPrefix || ""}${suffix}`;
			};
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";
				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed.startsWith("data: ")) continue;
					const payload = trimmed.slice(6);
					if (payload === "[DONE]") continue;
					try {
						const parsed = JSON.parse(payload);
						if (parsed.error) throw new Error(parsed.error);
						if (parsed.delta) {
							roundText += parsed.delta;
							const snap = joinPrefix(roundText);
							setMessages(prev =>
								prev.map(m =>
									m.id === aid ? { ...m, content: snap } : m,
								),
							);
						}
						if (parsed.tool_calls)
							tool_calls = parsed.tool_calls;
					} catch (e) {
						if (
							e?.message === "Unexpected end of JSON input" ||
							String(e.message || e).includes("Unexpected end of JSON")
						)
							continue;
						throw e;
					}
				}
			}
			return { roundText, tool_calls };
		};

		let assistantCombined = "";

		try {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Session expired. Please sign in again.");

			const MAX_ROUNDS = 6;

			for (let round = 0; round < MAX_ROUNDS; round++) {
				const res = await fetch("/api/chat/message", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						messages: thread,
						idToken,
						model: model.id,
						chatMode,
					}),
					signal: abortRef.current.signal,
				});

				if (!res.ok) {
					const errData = await res.json().catch(() => ({}));
					throw new Error(errData.error || `Error ${res.status}`);
				}

				const { roundText, tool_calls } = await consumeSseOnce(res, assistantCombined);

				if (roundText.trim()) {
					assistantCombined = assistantCombined
						? `${assistantCombined}\n\n${roundText}`
						: roundText;
				}

				if (!tool_calls?.length) break;

				const normalised = tool_calls.map((tc, i) => ({
					id: tc.id || `call_${round}_${i}`,
					type: tc.type || "function",
					function: {
						name: tc.function?.name || "",
						arguments: tc.function?.arguments || "{}",
					},
				}));

				const toolRunOrder = (name) => {
					if (
						name === "scrape_url" ||
						name === "scrape_urls" ||
						name === "scrape_youtube"
					)
						return 0;
					if (name === "translate_text") return 1;
					if (name === "generate_infographics") return 2;
					if (name === "generate_mermaid") return 3;
					if (name === "search_user_assets") return 4;
					if (name === "read_user_asset") return 5;
					if (name === "propose_create_draft") return 6;
					return 7;
				};
				normalised.sort(
					(a, b) =>
						toolRunOrder(a.function.name) - toolRunOrder(b.function.name),
				);

				thread = [
					...thread,
					{
						role: "assistant",
						content: roundText || "",
						tool_calls: normalised,
					},
				];

				const traceBatch = [];
				let proposalThisRound = null;
				let haltAfterTools = false;
				let roundAssetLinks = [];

				const toolMsgs = [];
				for (let i = 0; i < normalised.length; i++) {
					const tc = normalised[i];
					const name = tc.function.name;
					let args = {};
					try {
						args = JSON.parse(tc.function.arguments || "{}");
					} catch {
						args = {};
					}
					let payload;
					try {
						if (name === "scrape_url") {
							const data = await scrapeOne.mutateAsync(args.url);
							const row = {
								url: data.url,
								title: data.title,
								markdown: data.markdown,
							};
							aggregatedSources = mergeSource(aggregatedSources, row);
							payload = JSON.stringify({
								ok: true,
								url: data.url,
								title: data.title,
								markdown: data.markdown.slice(0, 100_000),
							});
						} else if (name === "scrape_urls") {
							const urls = Array.isArray(args.urls)
								? args.urls.slice(0, 15)
								: [];
							const rows = await scrapeMany.mutateAsync(urls);
							for (const row of rows)
								aggregatedSources = mergeSource(aggregatedSources, row);
							payload = JSON.stringify({
								ok: true,
								results: rows.map(r => ({
									url: r.url,
									title: r.title,
									error: r.error,
									markdown: (r.markdown || "").slice(0, 80_000),
								})),
							});
						} else if (name === "scrape_youtube") {
							const data = await scrapeYoutube.mutateAsync(args.url);
							const row = {
								url: data.url,
								title: data.title || "YouTube transcript",
								markdown: data.markdown || "",
							};
							aggregatedSources = mergeSource(aggregatedSources, row);
							const segments = Array.isArray(data.transcript)
								? data.transcript
								: [];
							payload = JSON.stringify({
								ok: true,
								url: data.url,
								title: row.title,
								source: "youtube_transcript",
								segmentCount: segments.length,
								markdown: (data.markdown || "").slice(0, 100_000),
								transcript: segments.slice(0, 400),
							});
						} else if (name === "translate_text") {
							const text = String(args.text || "").trim();
							const langRaw = String(args.language || "").trim();
							if (!text || !langRaw) {
								payload = JSON.stringify({
									ok: false,
									error: "text and language are required",
								});
							} else {
								const words = countWordsInText(text);
								const creditsNeeded = creditsForTranslationWords(words);
								if (
									credits &&
									credits.plan !== "pro" &&
									credits.remaining < creditsNeeded
								) {
									throw new Error(
										`Not enough credits for translation (need ${creditsNeeded}, have ${Number(credits.remaining).toFixed(2)}).`,
									);
								}
								const apiLang = languageCodeToApiLabel(langRaw);
								const data = await fetchTranslate({
									idToken,
									markdown: text.slice(0, 120_000),
									language: apiLang,
								});
								deductCredits(idToken, creditsNeeded);
								const langLabel = resolveTranslationLanguageLabel(
									data.language || langRaw,
								);
								const row = {
									id: `tr-${Date.now()}-${i}`,
									language: data.language || apiLang,
									languageLabel: langLabel,
									markdown: data.markdown,
								};
								aggregatedTranslations = [
									...aggregatedTranslations,
									row,
								];
								traceBatch.push({
									title: "Translation",
									sub: langLabel,
									lines: [
										`${words} words · ${creditsNeeded} credit${creditsNeeded === 1 ? "" : "s"}`,
									],
								});
								payload = JSON.stringify({
									ok: true,
									language: langLabel,
									markdownLength: data.markdown.length,
									creditsUsed: creditsNeeded,
									truncatedInput: Boolean(data.truncatedInput),
								});
							}
						} else if (name === "generate_infographics") {
							if (!effectiveUserId) {
								payload = JSON.stringify({
									ok: false,
									error: "Sign in required to generate infographics.",
								});
							} else {
								const brief = String(args.brief || "").trim();
								const src = String(
									args.source_text || args.content || "",
								).trim();
								const vf = resolveInfographicCreativeFormatId(
									args.visual_format,
								);
								const anchorBody = [
									brief,
									src || plainContext.slice(0, 12000) || "",
								]
									.join("\n\n")
									.trim()
									.slice(0, 60_000);
								const title = String(
									args.title || draftTitle || "Infographics",
								)
									.trim()
									.slice(0, 240);
								if (!brief) {
									payload = JSON.stringify({
										ok: false,
										error: "brief is required",
									});
								} else {
									try {
										const { infographics: batch } =
											await fetchInfographicsFromAgent({
												userId: effectiveUserId,
												idToken,
												htmlOrTextContent: anchorBody,
												title,
												excludeTypes: aggregatedInfographics.map(
													(x) => x.type,
												),
												visualFormatId: vf,
											});
										aggregatedInfographics =
											aggregatedInfographics.concat(batch);
										payload = JSON.stringify({
											ok: true,
											count: batch.length,
											types: batch.map((b) => b.type),
										});
									} catch (igErr) {
										payload = JSON.stringify({
											ok: false,
											error:
												igErr?.message ||
												"Infographic generation failed",
										});
									}
								}
							}
						} else if (name === "generate_mermaid") {
							if (!effectiveUserId) {
								payload = JSON.stringify({
									ok: false,
									error: "Sign in required to generate Mermaid diagrams.",
								});
							} else {
								const brief = String(args.brief || "").trim();
								const src = String(
									args.source_text || args.content || "",
								).trim();
								const anchorBody = [
									brief,
									src || plainContext.slice(0, 12000) || "",
								]
									.join("\n\n")
									.trim()
									.slice(0, 60_000);
								const title = String(
									args.title || draftTitle || "Diagram",
								)
									.trim()
									.slice(0, 240);
								if (!brief) {
									payload = JSON.stringify({
										ok: false,
										error: "brief is required",
									});
								} else {
									try {
										const out = await fetchMermaidFromAgent({
											userId: effectiveUserId,
											idToken,
											prompt: brief,
											contextText: anchorBody,
											articleTitle: title,
										});
										const code = String(out.mermaid || "").trim();
										if (!code) {
											payload = JSON.stringify({
												ok: false,
												error: "Empty diagram from server",
											});
										} else {
											aggregatedMermaids.push({
												code,
												title:
													out.title ||
													title ||
													"Mermaid diagram",
											});
											payload = JSON.stringify({
												ok: true,
												title: out.title || title,
											});
										}
									} catch (mmErr) {
										payload = JSON.stringify({
											ok: false,
											error:
												mmErr?.message ||
												"Mermaid generation failed",
										});
									}
								}
							}
						} else if (name === "search_user_assets") {
							const hits = searchAssetsWithFuse(
								agentAssets || [],
								args.query ?? "",
								12,
							);
							roundAssetLinks = mergeAssetLinks(
								roundAssetLinks,
								hits.map((h) => ({
									id: h.id,
									title: h.title,
									type: h.type,
								})),
							);
							if (hits.length === 0) {
								traceBatch.push({
									title: `Workspace search`,
									sub: String(args.query ?? "").slice(0, 120),
									lines: ["No matching drafts or tables."],
								});
							}
							payload = JSON.stringify({
								ok: true,
								count: hits.length,
								results: hits,
							});
						} else if (name === "read_user_asset") {
							const assetId = args.asset_id;
							const got =
								assetId && effectiveUserId
									? await getAsset(effectiveUserId, assetId)
									: null;
							if (!got) {
								traceBatch.push({
									title: "Read asset",
									sub: assetId || "—",
									lines: ["Not found or inaccessible."],
								});
								payload = JSON.stringify({
									ok: false,
									error: "Asset not found",
								});
							} else if (got.type === "draft") {
								roundAssetLinks = mergeAssetLinks(roundAssetLinks, [
									{
										id: assetId,
										title: got.doc.title || "(untitled)",
										type: "draft",
									},
								]);
								const b = String(got.doc.body ?? "");
								traceBatch.push({
									title: `Read draft`,
									sub: got.doc.title || assetId,
									lines: [
										b.slice(0, 560) +
											(b.length > 560 ? "… (truncated in chat)" : ""),
									],
								});
								payload = JSON.stringify({
									ok: true,
									type: "draft",
									title: got.doc.title || "",
									body: b.slice(0, 24_000),
								});
							} else if (got.type === "table") {
								roundAssetLinks = mergeAssetLinks(roundAssetLinks, [
									{
										id: assetId,
										title: got.doc.title || "(untitled)",
										type: "table",
									},
								]);
								const cols = Array.isArray(got.doc.columns)
									? got.doc.columns.map(c =>
											typeof c === "object"
												? c.header ?? c.title ?? "?"
												: c,
										)
									: [];
								const n = (got.doc.rows ?? []).length;
								traceBatch.push({
									title: `Read table`,
									sub: got.doc.title || assetId,
									lines: [`${cols.slice(0, 24).join(" · ")} — ${n} rows`],
								});
								payload = JSON.stringify({
									ok: true,
									type: "table",
									title: got.doc.title || "",
									columns: cols,
									rowCount: n,
								});
							} else {
								traceBatch.push({
									title: `Read (${got.type})`,
									sub: got.doc?.title ?? assetId ?? "",
									lines: ["Metadata only — expand in app."],
								});
								payload = JSON.stringify({
									ok: true,
									type: got.type,
								});
							}
						} else if (
							chatMode === CHAT_MODE_AGENT &&
							name === "propose_create_draft"
						) {
							proposalThisRound = {
								title: String(args.title || "").trim() || "New draft",
								bodyMarkdown: String(args.bodyMarkdown || ""),
							};
							haltAfterTools = true;
							payload = JSON.stringify({
								ok: true,
								status: "awaiting_user_approval_in_ui",
							});
						} else {
							payload = JSON.stringify({
								ok: false,
								error: `Unknown tool: ${name}`,
							});
						}
					} catch (e) {
						if (name === "scrape_url" && args.url) {
							aggregatedSources = mergeSource(aggregatedSources, {
								url: String(args.url),
								title: "",
								markdown: "",
								error: e?.message || "Scrape failed",
							});
						}
						if (name === "scrape_youtube" && args.url) {
							aggregatedSources = mergeSource(aggregatedSources, {
								url: String(args.url),
								title: "",
								markdown: "",
								error: e?.message || "YouTube transcript failed",
							});
						}
						if (
							chatMode === CHAT_MODE_AGENT ||
							name === "search_user_assets" ||
							name === "read_user_asset"
						) {
							traceBatch.push({
								title: `Tool error: ${name}`,
								sub: "",
								lines: [String(e?.message || "Tool failed")],
							});
						}
						payload = JSON.stringify({
							ok: false,
							error: e?.message || "Tool failed",
						});
					}
					toolMsgs.push({
						role: "tool",
						tool_call_id: tc.id,
						content: payload,
					});
				}
				thread = [...thread, ...toolMsgs];

				setMessages(prev =>
					prev.map(m =>
								m.id === aid
							? {
									...m,
									scrapeSources: [...aggregatedSources],
									chatTranslations: [...aggregatedTranslations],
									chatInfographics: [...aggregatedInfographics],
									chatMermaids: [...aggregatedMermaids],
									...(roundAssetLinks.length > 0
										? {
												assetLinks: mergeAssetLinks(
													m.assetLinks || [],
													roundAssetLinks,
												),
											}
										: {}),
									...(traceBatch.length > 0
										? {
												agentTrace: [...(m.agentTrace || []), ...traceBatch],
											}
										: {}),
									...(proposalThisRound
										? {
												draftProposal: {
													...proposalThisRound,
													resolved: null,
												},
											}
										: {}),
							  }
							: m,
					),
				);

				if (haltAfterTools) break;
			}

			setMessages(prev =>
				prev.map(m =>
					m.id === aid
						? {
								...m,
								done: true,
								content:
									m.content ||
									assistantCombined ||
									"No response.",
								scrapeSources: [...aggregatedSources],
								chatTranslations: [...aggregatedTranslations],
								chatInfographics: [...aggregatedInfographics],
								chatMermaids: [...aggregatedMermaids],
						  }
						: m,
				),
			);
		} catch (err) {
			if (err.name === "AbortError") {
				setMessages(prev =>
					prev.map(m =>
						m.id === aid
							? {
									...m,
									done: true,
									content: m.content || "_Stopped._",
									scrapeSources: [...aggregatedSources],
									chatTranslations: [...aggregatedTranslations],
									chatInfographics: [...aggregatedInfographics],
									chatMermaids: [...aggregatedMermaids],
							  }
							: m,
					),
				);
			} else {
				setMessages(prev =>
					prev.map(m =>
						m.id === aid
							? {
									...m,
									done: true,
									content: `_Error: ${err.message}_`,
									scrapeSources: [...aggregatedSources],
									chatTranslations: [...aggregatedTranslations],
									chatInfographics: [...aggregatedInfographics],
									chatMermaids: [...aggregatedMermaids],
							  }
							: m,
					),
				);
			}
		} finally {
			setStreaming(false);
			refreshCredits();
		}
	}, [
		input,
		attachedUrls,
		attachedImages,
		streaming,
		messages,
		draftContent,
		model.id,
		selectionContext,
		scrapeOne,
		scrapeMany,
		scrapeYoutube,
		credits,
		refreshCredits,
		chatMode,
		effectiveUserId,
		agentAssets,
		draftTitle,
	]);

	const approveDraftProposal = useCallback(
		async (msg) => {
			const p = msg?.draftProposal;
			if (!p || p.resolved) return;
			const uid = effectiveUserId;
			if (!uid) {
				showToast("Sign in required to save a draft.");
				return;
			}
			setApprovingForMsgId(msg.id);
			try {
				const draft = buildAgentDraftRecord({
					title: p.title,
					bodyMarkdown: p.bodyMarkdown,
					prompt: "",
				});
				const newId = await createAgentDraftMutation.mutateAsync({
					uid,
					draft,
				});
				setMessages((prev) =>
					prev.map((m) =>
						m.id === msg.id && m.draftProposal
							? {
									...m,
									draftProposal: {
										...m.draftProposal,
										resolved: "approved",
										createdId: newId,
									},
							  }
							: m,
					),
				);
				showToast("✓ Draft saved to your library");
				onAgentDraftCreated?.(newId);
			} catch (e) {
				showToast(e?.message || "Could not create draft");
			} finally {
				setApprovingForMsgId(null);
			}
		},
		[
			effectiveUserId,
			createAgentDraftMutation,
			onAgentDraftCreated,
		],
	);

	const declineDraftProposal = useCallback((msgId) => {
		setMessages((prev) =>
			prev.map((m) =>
				m.id === msgId && m.draftProposal
					? {
							...m,
							draftProposal: {
								...m.draftProposal,
								resolved: "declined",
							},
					  }
					: m,
			),
		);
	}, []);

	const stop  = () => abortRef.current?.abort();
	const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

	const chatSendReady =
		!streaming &&
		(Boolean(input.trim()) ||
			attachedUrls.length > 0 ||
			attachedImages.length > 0 ||
			extractHttpUrls(input).length > 0);

	const onResizeOverlayPointerDown = useCallback((e) => {
		if (asPanel) return;
		e.preventDefault();
		e.stopPropagation();
		const el = e.currentTarget;
		try {
			el.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
		const startX = e.clientX;
		const startW = overlayWidth;
		const onMove = (ev) => {
			const next = Math.round(
				Math.min(
					AI_CHAT_OVERLAY_W_MAX,
					Math.max(AI_CHAT_OVERLAY_W_MIN, startW + (startX - ev.clientX)),
				),
			);
			setOverlayWidth(next);
		};
		const onUp = (ev) => {
			try {
				if (ev.pointerId != null) el.releasePointerCapture(ev.pointerId);
			} catch {
				/* ignore */
			}
			el.removeEventListener("pointermove", onMove);
			el.removeEventListener("pointerup", onUp);
			el.removeEventListener("pointercancel", onUp);
		};
		el.addEventListener("pointermove", onMove);
		el.addEventListener("pointerup", onUp);
		el.addEventListener("pointercancel", onUp);
	}, [asPanel, overlayWidth]);

	const panelStyle = asPanel
		? {
				width: 380,
				flexShrink: 0,
				background: "#FFFFFF",
				borderLeft: "1px solid #E8E4DC",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				fontFamily: "'Comic', sans-serif",
			}
		: clampOverlayToViewport
			? {
					position: "fixed",
					right: 0,
					top: 0,
					bottom: 0,
					width: `min(${overlayWidth}px, calc(100vw - 12px))`,
					maxWidth: "100vw",
					boxSizing: "border-box",
					background: "#FFFFFF",
					borderLeft: "1px solid #E8E4DC",
					display: "flex",
					flexDirection: "column",
					zIndex: 150,
					overflow: "visible",
					boxShadow: "-8px 0 40px rgba(0,0,0,0.08)",
					fontFamily: "'Comic', sans-serif",
				}
			: {
					position: "fixed",
					right: 0,
					top: 0,
					bottom: 0,
					width: overlayWidth,
					background: "#FFFFFF",
					borderLeft: "1px solid #E8E4DC",
					display: "flex",
					flexDirection: "column",
					zIndex: 150,
					overflow: "visible",
					boxShadow: "-8px 0 40px rgba(0,0,0,0.08)",
					fontFamily: "'Comic', sans-serif",
				};

	const sidebarContent = (
		<>
			<ChatStyles />
			<AnimatePresence initial={false}>
				{open && (
					<>
						{!asPanel && (
							<motion.div
								key="chat-backdrop"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								onClick={() => {
									setModelOpen(false);
									onClose();
								}}
								style={{
									position: "fixed",
									inset: 0,
									background: "rgba(0,0,0,0.10)",
									zIndex: 149,
								}}
							/>
						)}

						<motion.div
							key="chat-sidebar"
							initial={asPanel ? { width: 0, opacity: 0 } : { x: "100%" }}
							animate={asPanel ? { width: 380, opacity: 1 } : { x: 0 }}
							exit={asPanel ? { width: 0, opacity: 0 } : { x: "100%" }}
							transition={
								asPanel
									? { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
									: { type: "spring", damping: 28, stiffness: 300 }
							}
							onClick={() => {
								if (modelOpen) setModelOpen(false);
								if (followUpOpenFor) setFollowUpOpenFor(null);
								if (agentModeOpen) setAgentModeOpen(false);
							}}
							style={{
								...panelStyle,
								...(asPanel
									? { minWidth: 0, overflow: "hidden" }
									: { overflow: "visible" }),
							}}
						>
							{!asPanel && !clampOverlayToViewport && (
								<div
									role="separator"
									aria-orientation="vertical"
									aria-label="Resize AI chat sidebar"
									aria-valuenow={overlayWidth}
									aria-valuemin={AI_CHAT_OVERLAY_W_MIN}
									aria-valuemax={AI_CHAT_OVERLAY_W_MAX}
									onPointerDown={onResizeOverlayPointerDown}
									onClick={(e) => e.stopPropagation()}
									style={{
										position: "absolute",
										left: 0,
										top: "50%",
										transform: "translateY(-50%)",
										width: 14,
										height: AI_CHAT_RESIZE_HANDLE_H,
										borderRadius: "0 7px 7px 0",
										background:
											"linear-gradient(90deg, #DDD9D3 0%, #E8E4DC 40%, #EEEAE4 100%)",
										border: "1px solid #CEC8BF",
										borderLeft: "none",
										boxShadow:
											"inset 0 1px 0 rgba(255,255,255,0.55), 2px 0 6px rgba(0,0,0,0.06)",
										cursor: "ew-resize",
										zIndex: 200,
										touchAction: "none",
										boxSizing: "border-box",
									}}
								/>
							)}
							<div
								style={{
									flex: 1,
									display: "flex",
									flexDirection: "column",
									minHeight: 0,
									overflow: "hidden",
									width: "100%",
								}}
							>
							{/* ── Header ── */}
							<div className="p-3 flex items-center gap-2">
								<div style={{
									width: 24, height: 24, borderRadius: 11,
									display: "flex", alignItems: "center", justifyContent: "center",
								}} className="bg-zinc-50">
									<SparklesIcon className="w-4 h-4 text-zinc-900" />
								</div>
								<div style={{ flex: 1 }}>
									<p style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.2, margin: 0 }}>
										Inkgest Agent
									</p>
								</div>
								<div style={{ display: "flex", gap: 5 }}>
									{/* Clear chat */}
									<motion.button
										whileHover={{ background: "#F0ECE5" }}
										whileTap={{ scale: 0.9 }}
										onClick={() => setMessages([{
											id: `w${Date.now()}`, role: "assistant", done: true,
											content: "Chat cleared. Ready to help with your writing.",
										}])}
										title="Clear chat"
										style={{
											background: "none", border: "1px solid #E8E4DC",
											borderRadius: 8, width: 28, height: 28,
											display: "flex", alignItems: "center", justifyContent: "center",
											cursor: "pointer", transition: "all 0.15s",
										}}
									>
										<Ic d={PATHS.trash} size={12} col="#7A7570" />
									</motion.button>
									{/* Close */}
									<motion.button
										whileHover={{ background: "#F0ECE5" }}
										whileTap={{ scale: 0.9 }}
										onClick={onClose}
										title="Close"
										style={{
											background: "none", border: "1px solid #E8E4DC",
											borderRadius: 8, width: 28, height: 28,
											display: "flex", alignItems: "center", justifyContent: "center",
											cursor: "pointer", transition: "all 0.15s",
										}}
									>
										<Ic d={PATHS.close} size={12} col="#7A7570" />
									</motion.button>
								</div>
							</div>

							{/* ── Messages area ── */}
							<div style={{ flex: 1, overflowY: "auto", padding: "14px 12px 8px" }}>

								
								{/* Message list */}
								<AnimatePresence initial={false}>
									{messages.map(msg => (
										<motion.div
											key={msg.id}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0 }}
											transition={{ duration: 0.22 }}
											style={{ marginBottom: 14 }}
										>
											{/* ── User message ── */}
											{msg.role === "user" ? (
												<div style={{ display: "flex", justifyContent: "flex-end" }}>
													<div style={{
														maxWidth: "86%",
														background: "#F2F2F2",
														borderRadius: "12px 12px 3px 12px",
														padding: "9px 12px",
													}} className="ai-chat-prose">
														<p style={{
															fontSize: 13, color: "#3A3530",
															lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0,
														}}>
															<UserMessageWithLinks text={msg.content} />
														</p>
													</div>
												</div>
											) : (
												/* ── Assistant message ── */
												<div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
													{/* Avatar */}
													<div style={{
														width: 26, height: 26, borderRadius: 8,
														display: "flex", alignItems: "center", justifyContent: "center",
														flexShrink: 0, marginTop: 2,
													}}>
														<SparklesIcon className="w-3 h-3 text-zinc-900" />
													</div>

													<div style={{ flex: 1, minWidth: 0 }}>
														{/* Bubble */}
														<div style={{
															background: "#FFFFFF",
															border: "1px solid #E8E4DC",
															borderRadius: "3px 12px 12px 12px",
															padding: "10px 12px",
															marginBottom: msg.done && !["w0", "w1"].includes(msg.id) ? 7 : 0,
														}}>
															{msg.scrapeSources?.length > 0 && (
																<ScrapedSourcesPanel sources={msg.scrapeSources} />
															)}
															{msg.chatTranslations?.length > 0 && (
																<ChatTranslationsPanel
																	items={msg.chatTranslations}
																	copiedId={copiedTranslationId}
																	onCopy={copyTranslation}
																/>
															)}
															{msg.chatInfographics?.length > 0 && (
																<ChatInfographicsPanel
																	items={msg.chatInfographics}
																	editorRef={editorRef}
																/>
															)}
															{msg.chatMermaids?.length > 0 && (
																<ChatMermaidPanel
																	items={msg.chatMermaids}
																	editorRef={editorRef}
																/>
															)}
															{msg.assetLinks?.length > 0 && (
																<LibraryAssetLinksPanel links={msg.assetLinks} />
															)}
															{msg.agentTrace?.length > 0 && (
																<div style={{ marginBottom: 10 }}>
																	{msg.agentTrace.map((t, i) => (
																		<div
																			key={`${msg.id}-at-${i}`}
																			style={{
																				border: "1px solid #E8E4DC",
																				borderRadius: 9,
																				padding: "8px 10px",
																				marginBottom: 6,
																				background: "#FAFAF8",
																			}}
																		>
																			<p
																				style={{
																					fontSize: 10,
																					fontWeight: 700,
																					color: "#5e5e5e",
																					margin: "0 0 4px",
																					letterSpacing: "0.04em",
																					textTransform: "uppercase",
																				}}
																			>
																				{t.title}
																			</p>
																			{t.sub ? (
																				<p
																					style={{
																						fontSize: 11,
																						color: "#7A7570",
																						margin: "0 0 6px",
																					}}
																				>
																					{t.sub}
																				</p>
																			) : null}
																			{t.lines?.map((line, j) => (
																				<p
																					key={j}
																					style={{
																						fontSize: 11,
																						lineHeight: 1.55,
																						color: "#5A5550",
																						margin: "0 0 3px",
																						wordBreak: "break-word",
																					}}
																				>
																					{line}
																				</p>
																			))}
																		</div>
																	))}
																</div>
															)}
															{msg.content ? (
																<>
																	<div
																		className="ai-chat-prose"
																		dangerouslySetInnerHTML={{ __html: md(msg.content) }}
																	/>
																	{!msg.done && <span className="ai-stream-cursor" />}
																</>
															) : (
																/* Loading dots */
																<div style={{ display: "flex", gap: 5, alignItems: "center", padding: "3px 0" }}>
																	{[0, 0.18, 0.36].map(d => (
																		<motion.div
																			key={d}
																			animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.2, 0.8] }}
																			transition={{ duration: 0.9, delay: d, repeat: Infinity }}
																			style={{ width: 6, height: 6, borderRadius: "50%", background: "#C17B2F" }}
																		/>
																	))}
																</div>
															)}
															{msg.draftProposal?.resolved === "approved" && (
																<p style={{
																	fontSize: 11,
																	color: "#4A7C59",
																	margin: "10px 0 0",
																	fontWeight: 600,
																}}>
																	✓ Draft saved
																	{msg.draftProposal.createdId ? (
																		<>
																			{" · "}
																			<button
																				onClick={() => router.push(`/app/${msg.draftProposal.createdId}`,undefined ,{ shallow: false})}
																				style={{
																					color: "#C17B2F",
																					fontWeight: 700,
																					textDecoration: "none",
																				}}
																			>
																				Open in app
																			</button>
																		</>
																	) : null}
																</p>
															)}
															{msg.draftProposal && msg.draftProposal.resolved == null && msg.done && (
																<div
																	onClick={(e) => e.stopPropagation()}
																	style={{
																		marginTop: 10,
																		padding: "10px 11px",
																		border: "1px solid #E8CFB0",
																		borderRadius: 10,
																		background: "#FFFCF7",
																	}}
																>
																	<p style={{
																		fontSize: 11,
																		fontWeight: 700,
																		color: "#5e5e5e",
																		margin: "0 0 6px",
																	}}>
																		Save as new draft?
																	</p>
																	<p style={{
																		fontSize: 12,
																		fontWeight: 600,
																		color: "#1A1A1A",
																		margin: "0 0 10px",
																		lineHeight: 1.4,
																	}}>
																		{msg.draftProposal.title}
																	</p>
																	<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
																		<motion.button
																			type="button"
																			whileHover={{ scale: 1.03 }}
																			whileTap={{ scale: 0.97 }}
																			disabled={
																				approvingForMsgId === msg.id ||
																				createAgentDraftMutation.isPending
																			}
																			onClick={(e) => {
																				e.stopPropagation();
																				approveDraftProposal(msg);
																			}}
																			style={{
																				background: "linear-gradient(135deg,#C17B2F,#CF8B38)",
																				border: "none",
																				borderRadius: 8,
																				padding: "6px 14px",
																				fontSize: 12,
																				fontWeight: 700,
																				color: "white",
																				cursor:
																					approvingForMsgId === msg.id ||
																					createAgentDraftMutation.isPending
																						? "wait"
																						: "pointer",
																				opacity:
																					approvingForMsgId === msg.id ||
																					createAgentDraftMutation.isPending
																						? 0.7
																						: 1,
																			}}
																		>
																			{approvingForMsgId === msg.id ? "Saving…" : "Approve"}
																		</motion.button>
																		<motion.button
																			type="button"
																			whileHover={{ background: "#F0ECE5" }}
																			whileTap={{ scale: 0.97 }}
																			disabled={approvingForMsgId === msg.id}
																			onClick={(e) => {
																				e.stopPropagation();
																				declineDraftProposal(msg.id);
																			}}
																			style={{
																				background: "#FFFFFF",
																				border: "1px solid #E8E4DC",
																				borderRadius: 8,
																				padding: "6px 14px",
																				fontSize: 12,
																				fontWeight: 600,
																				color: "#5A5550",
																				cursor:
																					approvingForMsgId === msg.id
																						? "wait"
																						: "pointer",
																			}}
																		>
																			Decline
																		</motion.button>
																	</div>
																</div>
															)}
															{msg.draftProposal?.resolved === "declined" && (
																<p style={{
																	fontSize: 11,
																	color: "#A8A29C",
																	margin: "8px 0 0",
																}}>
																	Cancelled · draft not saved
																</p>
															)}
														</div>

														{/* Action buttons: Copy / Insert / Append / Replace */}
														{msg.done && !["w0", "w1"].includes(msg.id) && (
															<motion.div
																initial={{ opacity: 0, y: 4 }}
																animate={{ opacity: 1, y: 0 }}
																transition={{ delay: 0.06 }}
																style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}
															>
																<ActionBtn
																	icon={copiedId === msg.id ? PATHS.check : PATHS.copy}
																	label={copiedId === msg.id ? "Copied" : "Copy"}
																	active={copiedId === msg.id}
																	onClick={() => copyMsg(msg.id, msg.content)}
																/>
																<ActionBtn
																	icon={PATHS.ins}
																	label="Insert"
																	highlight
																	onClick={() => push(msg.content, "insert")}
																/>
																<ActionBtn
																	icon={PATHS.app}
																	label="Append"
																	onClick={() => push(msg.content, "append")}
																/>
																<ActionBtn
																	icon={PATHS.rep}
																	label="Replace"
																	onClick={() => push(msg.content, "replace")}
																/>
															</motion.div>
														)}

														{/* Follow-ups — dropdown (motion.div) */}
														{msg.done && !["w0", "w1"].includes(msg.id) && (
															<motion.div
																style={{
																	position: "relative",
																	marginTop: 2,
																	alignSelf: "flex-start",
																}}
																onClick={(e) => e.stopPropagation()}
															>
																<motion.button
																	type="button"
																	whileHover={{ background: "#F0ECE5", borderColor: "#C17B2F44" }}
																	whileTap={{ scale: 0.97 }}
																	onClick={(e) => {
																		e.stopPropagation();
																		setFollowUpOpenFor((v) => (v === msg.id ? null : msg.id));
																	}}
																	style={{
																		display: "inline-flex",
																		alignItems: "center",
																		gap: 5,
																		background: "#F7F5F0",
																		border: "1px dashed #DDD9D3",
																		borderRadius: 8,
																		padding: "5px 10px",
																		fontSize: 11,
																		fontWeight: 600,
																		color: "#7A7570",
																		cursor: "pointer",
																		transition: "all 0.14s",
																	}}
																>
																	Refine reply
																	<motion.span
																		animate={{ rotate: followUpOpenFor === msg.id ? 180 : 0 }}
																		transition={{ duration: 0.18 }}
																		style={{ display: "flex" }}
																	>
																		<Ic d={PATHS.chevron} size={11} col="#7A7570" sw={2} />
																	</motion.span>
																</motion.button>

																<AnimatePresence>
																	{followUpOpenFor === msg.id && (
																		<motion.div
																			initial={{ opacity: 0, y: 6, scale: 0.96 }}
																			animate={{ opacity: 1, y: 0, scale: 1 }}
																			exit={{ opacity: 0, y: 6, scale: 0.96 }}
																			transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
																			style={{
																				position: "absolute",
																				bottom: "calc(100% + 6px)",
																				top: "auto",
																				left: 0,
																				right: 0,
																				minWidth: 200,
																				zIndex: 30,
																				background: "#FFFFFF",
																				border: "1px solid #E8E4DC",
																				borderRadius: 11,
																				boxShadow:
																					"0 10px 30px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
																				overflow: "hidden",
																			}}
																		>
																			<p
																				style={{
																					margin: 0,
																					padding: "8px 11px",
																					fontSize: 10,
																					fontWeight: 700,
																					letterSpacing: "0.04em",
																					textTransform: "uppercase",
																					color: "#B0AAA3",
																					borderBottom: "1px solid #F0ECE5",
																				}}
																			>
																				Try asking
																			</p>
																			{FOLLOWUPS.map((f, i) => (
																				<motion.button
																					key={f}
																					type="button"
																					initial={{ opacity: 0, x: -4 }}
																					animate={{
																						opacity: 1,
																						x: 0,
																						transition: { delay: i * 0.02 },
																					}}
																					whileHover={{ background: "#F7F5F0", x: 1 }}
																					whileTap={{ scale: 0.99 }}
																					onClick={(e) => {
																						e.stopPropagation();
																						setFollowUpOpenFor(null);
																						send(f);
																					}}
																					style={{
																						display: "block",
																						width: "100%",
																						border: "none",
																						borderBottom:
																							i < FOLLOWUPS.length - 1
																								? "1px solid #F0ECE5"
																								: "none",
																						background: "#FFFFFF",
																						padding: "10px 12px",
																						fontSize: 12,
																						fontWeight: 500,
																						color: "#5A5550",
																						cursor: "pointer",
																						textAlign: "left",
																					}}
																				>
																					{f}
																				</motion.button>
																			))}
																		</motion.div>
																	)}
																</AnimatePresence>
															</motion.div>
														)}
													</div>
												</div>
											)}
										</motion.div>
									))}
								</AnimatePresence>

								<div ref={bottomRef} />
							</div>

							{/* ── Input area ── */}
							<div className="p-2">
								{/* Selection context chip — visible when user added text from editor */}
								{selectionContext && (
									<div
										className="flex items-center gap-2 bg-zinc-50 p-2 rounded-xl my-1"
									>
										<span style={{ fontSize: 11, fontWeight: 700, color: "#5e5e5e", flexShrink: 0 }}>
											Selection context:
										</span>
										<span
											style={{
												fontSize: 13,
												fontWeight: 500,
												color: "#1A1A1A",
												flex: 1,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
											title={selectionContext.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
										>
											{(() => {
												const plain = selectionContext.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
												return plain.length > 60 ? plain.slice(0, 60) + "…" : plain;
											})()}
										</span>
										{onClearSelectionContext && (
											<motion.button
												whileHover={{ background: "rgba(0,0,0,0.06)" }}
												whileTap={{ scale: 0.95 }}
												onClick={onClearSelectionContext}
												style={{
													background: "none",
													border: "none",
													borderRadius: 6,
													padding: "4px 8px",
													fontSize: 11,
													fontWeight: 600,
													color: "#92400E",
													cursor: "pointer",
												}}
											>
												Clear
											</motion.button>
										)}
									</div>
								)}
								<div
									style={{
										background: "#FFFFFF",
										border: "1.5px solid #E8E4DC",
										borderRadius: 12, padding: "9px 11px",
										transition: "border-color 0.18s",
									}}
									onFocusCapture={e => { e.currentTarget.style.borderColor = "#C17B2F"; }}
									onBlurCapture={e => { e.currentTarget.style.borderColor = "#E8E4DC"; }}
									onDragOver={(e) => {
										if (Array.from(e.dataTransfer?.types || []).includes("Files"))
											e.preventDefault();
									}}
									onDrop={handleChatDrop}
								>
									<input
										ref={chatImageInputRef}
										type="file"
										accept="image/*"
										multiple
										style={{ display: "none" }}
										onChange={(e) => {
											addChatImageFiles(e.target.files);
											e.target.value = "";
										}}
									/>
									{(attachedUrls.length > 0 ||
										attachedImages.length > 0) && (
										<div
											style={{
												display: "flex",
												flexWrap: "wrap",
												gap: 7,
												marginBottom: 9,
											}}
										>
											{attachedUrls.map((url) => (
												<div
													key={url}
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: 6,
														maxWidth: "100%",
														padding: "5px 8px 5px 10px",
														borderRadius: 999,
														background: "#ECFDF5",
														border: "1px solid #6EE7B7",
														fontSize: 11,
														color: "#065F46",
													}}
												>
													<span
														style={{
															fontWeight: 800,
															fontSize: 9,
															letterSpacing: "0.06em",
															textTransform: "uppercase",
															color: "#047857",
															flexShrink: 0,
														}}
													>
														Scrape
													</span>
													<span
														style={{
															fontWeight: 600,
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap",
															minWidth: 0,
														}}
														title={url}
													>
														{shortenUrlChip(url)}
													</span>
													<button
														type="button"
														onClick={() => removeAttachedUrl(url)}
														aria-label="Remove URL"
														style={{
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
															border: "none",
															borderRadius: "50%",
															width: 22,
															height: 22,
															padding: 0,
															cursor: "pointer",
															flexShrink: 0,
														}}
													>
														<Ic d={PATHS.close} size={11} col="#047857" sw={2} />
													</button>
												</div>
											))}
											{attachedImages.map((im) => (
												<div
													key={im.id}
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: 7,
														maxWidth: "100%",
														padding: "4px 8px 4px 4px",
														borderRadius: 10,
														fontSize: 11,
													}}
													className="bg-zinc-50"
												>
													<img
														src={im.previewUrl}
														alt=""
														style={{
															width: 34,
															height: 34,
															borderRadius: 6,
															objectFit: "cover",
															flexShrink: 0,
														}}
													/>
													<span
														style={{
															fontWeight: 600,
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap",
															minWidth: 0,
															maxWidth: 160,
														}}
														title={im.name}
													>
														{im.name}
													</span>
													<button
														type="button"
														onClick={() =>
															removeAttachedImage(im.id)
														}
														aria-label="Remove image"
														style={{
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
															background: "rgba(255,255,255,0.9)",
															border: "none",
															borderRadius: "50%",
															width: 22,
															height: 22,
															padding: 0,
															cursor: "pointer",
															flexShrink: 0,
														}}
													>
														<Ic d={PATHS.close} size={11} col="#6B21A8" sw={2} />
													</button>
												</div>
											))}
										</div>
									)}
									<textarea
										ref={taRef}
										value={input}
										onChange={e => setInput(e.target.value)}
										onPaste={handleChatPaste}
										onKeyDown={onKey}
										placeholder={
											chatMode === CHAT_MODE_AGENT
												? "Agent mode: find drafts, read notes, paste links… (Enter to send)"
												: "Write, rewrite, brainstorm… paste a link or image (Enter to send)"
										}
										rows={2}
										className="w-full bg-transparent border-none outline-none resize-none text-sm text-zinc-900 caret-zinc-900 font-sans"
									/>
									<div style={{
										display: "flex", alignItems: "center",
										justifyContent: "space-between", marginTop: 6,
										position: "relative",
									}}>
										<div className="w-full flex justify-between items-center gap-2">
											<div className="flex items-center gap-2">
											<motion.button
												type="button"
												title="Attach image"
												disabled={
													streaming ||
													attachedImages.length >=
														MAX_CHAT_IMAGE_ATTACHMENTS
												}
												onClick={() =>
													chatImageInputRef.current?.click()
												}
												whileHover={
													!streaming &&
													attachedImages.length <
														MAX_CHAT_IMAGE_ATTACHMENTS
														? { background: "#F0ECE5" }
														: {}
												}
												whileTap={{ scale: 0.95 }}
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													width: 30,
													height: 30,
													background: "#F7F5F0",
													border: "1px solid #E8E4DC",
													borderRadius: 7,
													cursor:
														streaming ||
														attachedImages.length >=
															MAX_CHAT_IMAGE_ATTACHMENTS
															? "not-allowed"
															: "pointer",
													opacity:
														streaming ||
														attachedImages.length >=
															MAX_CHAT_IMAGE_ATTACHMENTS
															? 0.45
															: 1,
												}}
											>
												<Ic
													d={PATHS.paperclip}
													size={13}
													col="#5A5550"
													sw={2}
												/>
											</motion.button>
											<AIChatSidebarAgentBar
												mode={chatMode}
												onModeChange={(m) => {
													setChatMode(m);
													setModelOpen(false);
												}}
												modeOpen={agentModeOpen}
												onModeOpenChange={(v) => {
													setAgentModeOpen(v);
													if (v) setModelOpen(false);
												}}
												disabled={streaming}
											/>
											
											</div>

											<div className="flex items-center gap-2">
											{credits?.plan === "pro" ? (
												<span
													title="Pro — unlimited credits"
													style={{
														flexShrink: 0,
														width: 42,
														height: 42,
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														fontSize: 22,
														fontWeight: 300,
														color: "#C17B2F",
														lineHeight: 1,
													}}
												>
													∞
												</span>
											) : credits ? (
												<ChatCreditsRing
													creditsUsed={credits.creditsUsed}
													creditsLimit={credits.creditsLimit}
												/>
											) : null}
											{/* ── Model selector ── */}
											<div style={{ position: "relative" }}>
												<motion.button
													onClick={() => {
														setModelOpen((v) => !v);
														setAgentModeOpen(false);
													}}
													whileHover={{ background: "#F0ECE5" }}
													whileTap={{ scale: 0.95 }}
													title="Select model"
													style={{
														display: "flex", alignItems: "center", gap: 4,
														background: modelOpen ? "#F0ECE5" : "#F7F5F0",
														border: "1px solid #E8E4DC",
														borderRadius: 7, padding: "4px 8px",
														fontSize: 11, fontWeight: 600,
														color: "#5A5550", cursor: "pointer",
														transition: "all 0.14s",
													}}
												>
													<span
														style={{
															width: 6, height: 6, borderRadius: "50%",
															background: model.dot, flexShrink: 0,
														}}
													/>
													{model.label}
													<motion.span
														animate={{ rotate: modelOpen ? 180 : 0 }}
														transition={{ duration: 0.18 }}
														style={{ display: "flex" }}
													>
														<Ic d={PATHS.chevron} size={11} col="#7A7570" sw={2} />
													</motion.span>
												</motion.button>

												{/* Dropdown menu — opens upward */}
												<AnimatePresence>
													{modelOpen && (
														<motion.div
															initial={{ opacity: 0, y: 6, scale: 0.95 }}
															animate={{ opacity: 1, y: 0, scale: 1 }}
															exit={{ opacity: 0, y: 6, scale: 0.95 }}
															transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
															style={{
																position: "absolute",
																bottom: "calc(100% + 6px)",
																right: 0,
																background: "#FFFFFF",
																border: "1px solid #E8E4DC",
																borderRadius: 12,
																boxShadow: "0 8px 28px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
																overflow: "hidden",
																minWidth: 210,
																zIndex: 20,
															}}
														>
															{MODELS.map((m, i) => (
																<motion.button
																	key={m.id}
																	onClick={() => { setModel(m); setModelOpen(false); }}
																	whileHover={{ background: "#F7F5F0" }}
																	style={{
																		width: "100%",
																		display: "flex", alignItems: "center", gap: 10,
																		background: model.id === m.id ? "#F7F5F0" : "#FFFFFF",
																		border: "none",
																		borderBottom: i < MODELS.length - 1 ? "1px solid #F0ECE5" : "none",
																		padding: "10px 13px",
																		cursor: "pointer", textAlign: "left",
																		transition: "background 0.12s",
																	}}
																>
																	<span style={{
																		width: 8, height: 8, borderRadius: "50%",
																		background: m.dot, flexShrink: 0,
																	}} />
																	<div style={{ flex: 1 }}>
																		<p style={{ fontSize: 12, fontWeight: 700, color: "#1A1A1A", margin: 0, lineHeight: 1.2 }}>
																			{m.label}
																		</p>
																		<p style={{ fontSize: 10.5, color: "#A8A29C", margin: 0 }}>
																			{m.sub}
																		</p>
																	</div>
																	{model.id === m.id && (
																		<Ic d={PATHS.check} size={12} col="#C17B2F" sw={2.5} />
																	)}
																</motion.button>
															))}
														</motion.div>
													)}
												</AnimatePresence>
											</div>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 6,
													flexShrink: 1,
													minWidth: 0,
													maxWidth: 168,
												}}
											>
												
												<motion.button
													type="button"
													disabled={
														streaming || !speechRecognitionSupported
													}
													title={
														streaming
															? "Wait for the assistant to finish…"
															: !speechRecognitionSupported
																? "Voice input needs Chrome, Edge, or Safari"
																: dictationActive
																	? "Stop dictation"
																	: "Dictate your prompt (live)"
													}
													onClick={(e) => {
														e.preventDefault();
														toggleDictation();
													}}
													whileHover={
														!streaming && speechRecognitionSupported
															? {
																	background: dictationActive
																		? "#FEE2E2"
																		: "#F0ECE5",
																}
															: {}
													}
													whileTap={{ scale: 0.93 }}
													style={{
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														width: 30,
														height: 30,
														flexShrink: 0,
														borderRadius: 7,
														border: dictationActive
															? "1.5px solid #F8717199"
															: "1px solid #E8E4DC",
														background: dictationActive ? "#FFF1F2" : "#F7F5F0",
														cursor:
															streaming || !speechRecognitionSupported
																? "not-allowed"
																: "pointer",
														opacity:
															streaming ||
															!speechRecognitionSupported
																? 0.45
																: 1,
														boxShadow: dictationActive
															? "0 0 0 2px rgba(248,113,113,0.2)"
															: "none",
													}}
												>
													<Ic
														d={PATHS.mic}
														size={14}
														col={
															streaming ||
															!speechRecognitionSupported
																? "#A8A29C"
																: dictationActive
																	? "#DC2626"
																	: "#5A5550"
														}
														sw={2}
													/>
												</motion.button>
											</div>
											{/* Stop button */}
											{streaming && (
												<motion.button
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													onClick={stop}
													style={{
														background: "none",
														border: "1px solid #E8E4DC",
														borderRadius: 7, padding: "4px 10px",
														fontSize: 11, color: "#7A7570",
														cursor: "pointer",
													}}
												>
													Stop
												</motion.button>
											)}

											{/* Send button */}
											<motion.button
												onClick={() => send()}
												disabled={!chatSendReady}
												whileHover={
													chatSendReady ? { scale: 1.1 } : {}
												}
												whileTap={
													chatSendReady ? { scale: 0.9 } : {}
												}
												style={{
													width: 32, height: 32, borderRadius: 9,
													background: chatSendReady
														? "linear-gradient(135deg,#C17B2F,#CF8B38)"
														: "#E8E4DC",
													border: "none",
													display: "flex", alignItems: "center", justifyContent: "center",
													cursor: chatSendReady ? "pointer" : "not-allowed",
													transition: "all 0.2s",
												}}
											>
												<Ic
													d={PATHS.send}
													size={13}
													col={chatSendReady ? "white" : "#A8A29C"}
												/>
											</motion.button>
											</div>
										</div>
									</div>
									{credits?.plan !== "pro" &&
										credits &&
										credits.creditsUsed >= credits.creditsLimit && (
											<p
												style={{
													fontSize: 10.5,
													color: "#EF4444",
													marginTop: 8,
													marginBottom: 0,
													textAlign: "center",
												}}
											>
												Out of credits —{" "}
												<a
													href="/pricing"
													style={{
														color: "#C17B2F",
														fontWeight: 700,
														textDecoration: "none",
													}}
												>
													upgrade to Pro
												</a>
											</p>
										)}
								</div>
							</div>

							</div>
						</motion.div>

						{/* ── Toast notification ── */}
						<AnimatePresence>
							{toast && (
								<motion.div
									key="chat-toast"
									initial={{ opacity: 0, y: 16, scale: 0.9 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									exit={{ opacity: 0, y: 16, scale: 0.9 }}
									transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
									style={{
										position: "fixed",
										bottom: 28, left: "50%",
										transform: "translateX(-50%)",
										background: "#FFFFFF",
										border: "1px solid #C17B2F55",
										borderRadius: 10, padding: "8px 18px",
										fontSize: 12, fontWeight: 600, color: "#C17B2F",
										boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
										zIndex: 300, whiteSpace: "nowrap", pointerEvents: "none",
									}}
								>
									{toast}
								</motion.div>
							)}
						</AnimatePresence>
					</>
				)}
			</AnimatePresence>
		</>
	);

	return sidebarContent;
}
