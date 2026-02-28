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
 *   userId          string — Firebase UID (not used directly, auth via idToken)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../config/firebase";
import { getUserCredits, FREE_CREDIT_LIMIT } from "../utils/credits";

/* ─── Inline CSS for chat prose and cursor animation ─── */
const ChatStyles = () => (
	<style>{`
    .ai-chat-prose p   { font-size:13px;line-height:1.8;color:#5A5550;margin:0 0 7px; }
    .ai-chat-prose p:last-child { margin-bottom:0; }
    .ai-chat-prose strong { color:#1A1A1A;font-weight:600; }
    .ai-chat-prose em { color:#C17B2F; }
    .ai-chat-prose ul { padding-left:16px;margin:4px 0 8px; }
    .ai-chat-prose li { font-size:13px;line-height:1.75;color:#5A5550;margin-bottom:3px; }
    .ai-chat-prose h1,.ai-chat-prose h2 { font-family:'Instrument Serif',serif;color:#1A1A1A;margin:10px 0 5px; }
    .ai-chat-prose h1 { font-size:16px; }
    .ai-chat-prose h2 { font-size:15px; }
    .ai-chat-prose h3 { font-family:'Instrument Serif',serif;font-size:13.5px;font-weight:600;color:#1A1A1A;margin:8px 0 3px; }
    .ai-chat-prose code { background:#F0ECE5;border:1px solid #E8E4DC;border-radius:4px;padding:1px 5px;font-size:11.5px;color:#C17B2F;font-family:monospace; }
    .ai-chat-prose blockquote { border-left:2px solid #C17B2F;padding:2px 0 2px 12px;margin:8px 0; }
    .ai-chat-prose blockquote p { color:#7A7570;font-style:italic; }
    @keyframes ai-blink { 0%,100%{opacity:1} 50%{opacity:0} }
    .ai-stream-cursor { display:inline-block;width:2px;height:12px;background:#C17B2F;border-radius:1px;margin-left:2px;vertical-align:middle;animation:ai-blink 0.85s ease-in-out infinite; }
    ::-webkit-scrollbar { width:4px; }
    ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:#E8E4DC;border-radius:10px; }
    ::-webkit-scrollbar-thumb:hover { background:#C17B2F; }
  `}</style>
);

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
			out.push(`<blockquote><p>${l.slice(2)}</p></blockquote>`);
		} else if (/^- /.test(raw)) {
			if (!ul) { out.push("<ul>"); ul = true; }
			out.push(`<li>${l.slice(2)}</li>`);
		} else if (!raw.trim()) {
			if (ul) { out.push("</ul>"); ul = false; }
		} else {
			if (ul) { out.push("</ul>"); ul = false; }
			out.push(`<p>${l}</p>`);
		}
	}
	if (ul) out.push("</ul>");
	return out.join("");
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
			out.push(`<h1 style="font-family:'Instrument Serif',serif;font-size:28px;color:#1A1A1A;line-height:1.25;margin:0 0 14px;font-weight:400">${l.slice(2)}</h1>`);
		} else if (/^## /.test(raw)) {
			if (ul) { out.push("</ul>"); ul = false; }
			out.push(`<h2 style="font-family:'Instrument Serif',serif;font-size:22px;color:#1A1A1A;line-height:1.3;margin:20px 0 10px;font-weight:400">${l.slice(3)}</h2>`);
		} else if (/^### /.test(raw)) {
			if (ul) { out.push("</ul>"); ul = false; }
			out.push(`<h3 style="font-family:'Instrument Serif',serif;font-size:18px;color:#1A1A1A;margin:16px 0 8px;font-weight:600">${l.slice(4)}</h3>`);
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
	ins:     "M12 5v14M5 12h14",
	app:     "M12 19V5M5 12l7 7 7-7",
	rep:     "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15",
	chevron: "M6 9l6 6 6-6",
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
}) {
	const [messages, setMessages] = useState([{
		id: "w0", role: "assistant", done: true,
		content: "I'm your **AI writing assistant**.\n\nAsk me to write hooks, headlines, full sections, rewrites, CTAs or outlines. When you like a response hit **Insert**, **Append**, or **Replace** to push it straight into your editor.",
	}]);
	const [input, setInput]         = useState("");
	const [streaming, setStreaming]   = useState(false);
	const [copiedId, setCopiedId]    = useState(null);
	const [toast, setToast]          = useState("");
	const [model, setModel]          = useState(MODELS[0]);
	const [modelOpen, setModelOpen]  = useState(false);
	const [credits, setCredits]      = useState(null);
	const bottomRef = useRef(null);
	const taRef     = useRef(null);
	const abortRef  = useRef(null);

	/* Load / refresh credits */
	const refreshCredits = useCallback(() => {
		const uid = auth.currentUser?.uid;
		if (uid) getUserCredits(uid).then(setCredits).catch(() => {});
	}, []);

	useEffect(() => {
		if (open) refreshCredits();
	}, [open, refreshCredits]);

	/* Scroll to latest message */
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	/* Focus textarea when opened */
	useEffect(() => {
		if (open) setTimeout(() => taRef.current?.focus(), 320);
	}, [open]);

	const showToast = (msg) => {
		setToast(msg);
		setTimeout(() => setToast(""), 2200);
	};

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

	/* ── Send a message (streaming SSE) ── */
	const send = useCallback(async (override) => {
		const text = (override ?? input).trim();
		if (!text || streaming) return;

		const uid = `u${Date.now()}`;
		const aid = `a${Date.now()}`;

		setMessages(prev => [
			...prev,
			{ id: uid, role: "user",      done: true,  content: text },
			{ id: aid, role: "assistant", done: false, content: "" },
		]);
		setInput("");
		setStreaming(true);

		/* Build history — inject draft + selection context */
		const recentHistory = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
		const plainContext = draftContent
			? draftContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500)
			: "";
		const selectionPlain = selectionContext
			? selectionContext.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800)
			: "";
		let contextPrefix = "";
		if (plainContext) contextPrefix += `[Editor context — current draft: "${plainContext}"]\n\n`;
		if (selectionPlain) contextPrefix += `[User-selected text for focus: "${selectionPlain}"]\n\n`;

		const history = [
			...recentHistory,
			{ role: "user", content: contextPrefix + text },
		];

		abortRef.current = new AbortController();

		try {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Session expired. Please sign in again.");

			const res = await fetch("/api/chat/message", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: history, idToken, model: model.id }),
				signal: abortRef.current.signal,
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.error || `Error ${res.status}`);
			}

			/* Parse SSE stream */
			const reader  = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			let accumulated = "";

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
					if (payload === "[DONE]") break;

					try {
						const parsed = JSON.parse(payload);
						if (parsed.error) throw new Error(parsed.error);
						const delta = parsed.delta || "";
						accumulated += delta;
						const snap = accumulated;
						setMessages(prev =>
							prev.map(m => m.id === aid ? { ...m, content: snap } : m),
						);
					} catch (parseErr) {
						if (parseErr.message !== "Unexpected end of JSON input") throw parseErr;
					}
				}
			}

			setMessages(prev =>
				prev.map(m => m.id === aid ? { ...m, done: true } : m),
			);
		} catch (err) {
			if (err.name === "AbortError") {
				setMessages(prev =>
					prev.map(m => m.id === aid
						? { ...m, done: true, content: m.content || "_Stopped._" }
						: m),
				);
			} else {
				setMessages(prev =>
					prev.map(m => m.id === aid
						? { ...m, done: true, content: `_Error: ${err.message}_` }
						: m),
				);
			}
	} finally {
		setStreaming(false);
		refreshCredits();
	}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [input, streaming, messages, draftContent]);

	const stop  = () => abortRef.current?.abort();
	const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

	const panelStyle = asPanel
		? {
				width: 380,
				flexShrink: 0,
				background: "#FFFFFF",
				borderLeft: "1px solid #E8E4DC",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				fontFamily: "'Outfit', sans-serif",
			}
		: {
				position: "fixed",
				right: 0,
				top: 0,
				bottom: 0,
				width: 390,
				background: "#FFFFFF",
				borderLeft: "1px solid #E8E4DC",
				display: "flex",
				flexDirection: "column",
				zIndex: 150,
				overflow: "hidden",
				boxShadow: "-8px 0 40px rgba(0,0,0,0.08)",
				fontFamily: "'Outfit', sans-serif",
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
							onClick={() => modelOpen && setModelOpen(false)}
							style={{
								...panelStyle,
								...(asPanel ? { minWidth: 0, overflow: "hidden" } : {}),
							}}
						>
							{/* ── Header ── */}
							<div style={{
								padding: "13px 15px",
								borderBottom: "1px solid #E8E4DC",
								background: "#FDFCF9",
								display: "flex", alignItems: "center", gap: 10,
								flexShrink: 0,
							}}>
								<div style={{
									width: 34, height: 34, borderRadius: 11,
									background: "#C17B2F15",
									border: "1px solid #C17B2F30",
									display: "flex", alignItems: "center", justifyContent: "center",
								}}>
									<Ic d={PATHS.spark} size={16} col="#C17B2F" />
								</div>
								<div style={{ flex: 1 }}>
									<p style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.2, margin: 0 }}>
										AI Writing Assistant
									</p>
									<p style={{ fontSize: 11, color: "#7A7570", margin: 0 }}>
										Powered by {process.env.NEXT_PUBLIC_OPENROUTER_MODEL_LABEL || "GPT-4o mini"} via OpenRouter
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

								{/* Starter prompts — shown only on welcome screen */}
								{messages.length === 1 && (
									<motion.div
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.18 }}
										style={{ marginBottom: 18 }}
									>
										<p style={{
											fontSize: 10.5, fontWeight: 700,
											textTransform: "uppercase", letterSpacing: "0.1em",
											color: "#B0AAA3", marginBottom: 8,
										}}>
											Try asking…
										</p>
										<div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
											{STARTERS.map((s, i) => (
												<motion.button
													key={i}
													initial={{ opacity: 0, x: -8 }}
													animate={{ opacity: 1, x: 0 }}
													transition={{ delay: i * 0.05 + 0.22 }}
													whileHover={{ background: "#F5F2EC", x: 2 }}
													onClick={() => send(s.q)}
													style={{
														background: "#FDFCF9",
														border: "1px solid #E8E4DC",
														borderRadius: 9, padding: "8px 11px",
														fontSize: 12, cursor: "pointer",
														textAlign: "left", display: "flex",
														alignItems: "center", gap: 8,
														transition: "all 0.14s",
													}}
												>
													<span style={{ fontSize: 14, flexShrink: 0 }}>{s.e}</span>
													<span style={{ fontWeight: 600, color: "#5A5550", flexShrink: 0 }}>{s.l}</span>
													<span style={{
														color: "#A8A29C", fontSize: 11, flex: 1,
														overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
													}}>
														{s.q.length > 52 ? s.q.slice(0, 52) + "…" : s.q}
													</span>
												</motion.button>
											))}
										</div>
									</motion.div>
								)}

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
														background: "#C17B2F0E",
														border: "1px solid #C17B2F28",
														borderRadius: "12px 12px 3px 12px",
														padding: "9px 12px",
													}}>
														<p style={{
															fontSize: 13, color: "#3A3530",
															lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0,
														}}>
															{msg.content}
														</p>
													</div>
												</div>
											) : (
												/* ── Assistant message ── */
												<div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
													{/* Avatar */}
													<div style={{
														width: 26, height: 26, borderRadius: 8,
														background: "#C17B2F15",
														border: "1px solid #C17B2F30",
														display: "flex", alignItems: "center", justifyContent: "center",
														flexShrink: 0, marginTop: 2,
													}}>
														<Ic d={PATHS.spark} size={12} col="#C17B2F" />
													</div>

													<div style={{ flex: 1, minWidth: 0 }}>
														{/* Bubble */}
														<div style={{
															background: "#FDFCF9",
															border: "1px solid #E8E4DC",
															borderRadius: "3px 12px 12px 12px",
															padding: "10px 12px",
															marginBottom: msg.done && !["w0", "w1"].includes(msg.id) ? 7 : 0,
														}}>
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

														{/* Follow-up suggestion chips */}
														{msg.done && !["w0", "w1"].includes(msg.id) && (
															<div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
																{FOLLOWUPS.map(f => (
																	<motion.button
																		key={f}
																		whileHover={{ borderColor: "#C17B2F55", color: "#C17B2F" }}
																		whileTap={{ scale: 0.93 }}
																		onClick={() => send(f)}
																		style={{
																			background: "none",
																			border: "1px dashed #DDD9D3",
																			borderRadius: 6, padding: "3px 8px",
																			fontSize: 11, color: "#A8A29C",
																			cursor: "pointer", transition: "all 0.14s",
																		}}
																	>
																		{f}
																	</motion.button>
																))}
															</div>
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
							<div style={{
								padding: "10px 12px",
								borderTop: "1px solid #E8E4DC",
								background: "#FDFCF9",
								flexShrink: 0,
							}}>
								{/* Selection context chip — visible when user added text from editor */}
								{selectionContext && (
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: 8,
											marginBottom: 10,
											padding: "10px 14px",
											background: "#F5EDE0",
											border: "1.5px solid #C17B2F60",
											borderRadius: 10,
										}}
									>
										<span style={{ fontSize: 11, fontWeight: 700, color: "#78350F", flexShrink: 0 }}>
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
								>
									<textarea
										ref={taRef}
										value={input}
										onChange={e => setInput(e.target.value)}
										onKeyDown={onKey}
										placeholder="Write, rewrite, expand, brainstorm… (Enter to send)"
										rows={2}
										style={{
											width: "100%", background: "none",
											border: "none", outline: "none",
											resize: "none", fontSize: 13,
											color: "#1A1A1A", lineHeight: 1.65,
											caretColor: "#C17B2F",
											fontFamily: "'Outfit', sans-serif",
										}}
									/>
									<div style={{
										display: "flex", alignItems: "center",
										justifyContent: "space-between", marginTop: 6,
										position: "relative",
									}}>
										<p style={{ fontSize: 11, color: "#A8A29C", margin: 0 }}>
											{streaming ? (
												<motion.span
													animate={{ opacity: [0.5, 1, 0.5] }}
													transition={{ duration: 1.2, repeat: Infinity }}
												>
													⚙ Generating…
												</motion.span>
											) : (
												"↵ Send · Shift+↵ new line"
											)}
										</p>

										<div style={{ display: "flex", gap: 5, alignItems: "center" }}>

											{/* ── Model selector ── */}
											<div style={{ position: "relative" }}>
												<motion.button
													onClick={() => setModelOpen(v => !v)}
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
												disabled={!input.trim() || streaming}
												whileHover={input.trim() && !streaming ? { scale: 1.1 } : {}}
												whileTap={input.trim() && !streaming ? { scale: 0.9 } : {}}
												style={{
													width: 32, height: 32, borderRadius: 9,
													background: input.trim() && !streaming
														? "linear-gradient(135deg,#C17B2F,#CF8B38)"
														: "#E8E4DC",
													border: "none",
													display: "flex", alignItems: "center", justifyContent: "center",
													cursor: input.trim() && !streaming ? "pointer" : "not-allowed",
													transition: "all 0.2s",
												}}
											>
												<Ic
													d={PATHS.send}
													size={13}
													col={input.trim() && !streaming ? "white" : "#A8A29C"}
												/>
											</motion.button>
										</div>
									</div>
								</div>
							</div>

							{/* ── Credit usage bar ── */}
							{credits && (
								<div style={{ padding: "7px 2px 0" }}>
									{credits.plan === "pro" ? (
										<p style={{ fontSize: 11, color: "#A8A29C", textAlign: "center" }}>
											∞ Pro — unlimited credits
										</p>
									) : (
										<>
											{/* Bar */}
											<div style={{ height: 3, background: "#E8E4DC", borderRadius: 100, overflow: "hidden", marginBottom: 5 }}>
												<motion.div
													initial={{ width: 0 }}
													animate={{
														width: `${Math.min(100, (credits.creditsUsed / credits.creditsLimit) * 100)}%`
													}}
													transition={{ duration: 0.5, ease: "easeOut" }}
													style={{
														height: "100%",
														borderRadius: 100,
														background:
															credits.creditsUsed >= credits.creditsLimit
																? "#EF4444"
																: credits.creditsUsed >= credits.creditsLimit * 0.8
																? "#C17B2F"
																: "#4A7C59",
													}}
												/>
											</div>
											{/* Label row */}
											<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
												<span style={{ fontSize: 10.5, color: "#A8A29C" }}>
													¼ credit / message
												</span>
												<span style={{
													fontSize: 10.5, fontWeight: 700,
													color: credits.creditsUsed >= credits.creditsLimit ? "#EF4444" : "#7A7570",
												}}>
													{+credits.creditsUsed.toFixed(2)} / {credits.creditsLimit} credits
												</span>
											</div>
											{credits.creditsUsed >= credits.creditsLimit && (
												<p style={{ fontSize: 10.5, color: "#EF4444", marginTop: 4, textAlign: "center" }}>
													Out of credits —{" "}
													<a href="/pricing" style={{ color: "#C17B2F", fontWeight: 700, textDecoration: "none" }}>
														upgrade to Pro
													</a>
												</p>
											)}
										</>
									)}
								</div>
							)}
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
