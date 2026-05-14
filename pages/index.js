import { useState, useRef, useEffect } from "react";
import {
	motion,
	useInView,
	useScroll,
	useTransform,
	AnimatePresence,
} from "framer-motion";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import LoginModal from "../lib/ui/LoginModal";
import { getUserCredits, FREE_CREDIT_LIMIT } from "../lib/utils/credits";
import { getTheme } from "../lib/utils/theme";
import { CreditCardIcon, SparkleIcon, XCircleIcon, LinkIcon, FileTextIcon, CodeIcon, MessageSquareIcon, ZapIcon } from "lucide-react";
import Footer from "../app/components/Footer";
/* ── Google Fonts injected once ── */
const FontLink = () => (
	<style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: #F7F5F0; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #F7F5F0; }
    ::-webkit-scrollbar-thumb { background: #C17B2F; border-radius: 10px; }
  `}</style>
);

const T = getTheme();

/* ── Prefill presets (URLs + prompt) ── */
const PRESETS = [
	{
		label: "Y Combinator",
		urls: ["https://www.ycombinator.com/blog"],
		prompt:
			"Write a newsletter summarizing key insights for founders. Practical and direct tone. Under 400 words.",
	},
	{
		label: "Hacker News",
		urls: ["https://news.ycombinator.com"],
		prompt:
			"Turn this into a digest for tech enthusiasts. Highlight the most interesting discussions and trends.",
	},
	{
		label: "TechCrunch",
		urls: ["https://techcrunch.com"],
		prompt:
			"Summarize the main points and add actionable takeaways for startup founders.",
	},
	{
		label: "X / Twitter",
		urls: ["https://x.com"],
		prompt:
			"Create a newsletter from trending tech discussions. Concise and engaging. Under 350 words.",
	},
];

/* ── Export format showcase data ── */
const EXPORT_FORMATS = [
	{
		label: "Markdown",
		icon: "📄",
		color: "#4A90D9",
		description: "Clean .md output — paste directly into Ghost, Notion, or any CMS.",
		sample: `# Why Founders Ship Slow\n\nResearch shows that 78% of early-stage...\n\n## The Fix\n\n- Cut scoping meetings by half\n- Ship a "bad" v1 this week`,
	},
	{
		label: "HTML",
		icon: "🌐",
		color: "#E67E22",
		description: "Production-ready HTML with semantic tags, ready to drop into any email or page.",
		sample: `<article>\n  <h1>Why Founders Ship Slow</h1>\n  <p>Research shows that 78%...</p>\n  <h2>The Fix</h2>\n  <ul>\n    <li>Cut scoping meetings</li>\n  </ul>\n</article>`,
	},
	{
		label: "React",
		icon: "⚛️",
		color: "#61DAFB",
		description: "A ready-to-use JSX component — drop it straight into your Next.js or React app.",
		sample: `export default function Article() {\n  return (\n    <article>\n      <h1>Why Founders Ship Slow</h1>\n      <p>Research shows that 78%...</p>\n    </article>\n  );\n}`,
	},
];

/* ── InkAgent prompt suggestions — URL + short prompt per row (GenerateAssetPanel) ── */
const AGENT_PROMPT_SUGGESTIONS = [
	{
		urls: ["https://news.ycombinator.com"],
		prompt: "Top 5 front-page stories as a dev newsletter.",
	},
	{
		urls: ["https://news.ycombinator.com/newest"],
		prompt: "Newest posts — quick bullets, no fluff.",
	},
	{
		urls: ["https://blog.ycombinator.com"],
		prompt: "YC blog themes this week; casual digest.",
	},
	{
		urls: ["https://www.ycombinator.com/companies"],
		prompt: "Portfolio snapshot; one tight paragraph.",
	},
	{
		urls: ["https://blog.x.com"],
		prompt: "Engineering blog — concise takeaways for builders.",
	},
	{
		urls: ["https://www.thehindu.com/sci-tech/technology/"],
		prompt: "India tech headlines; neutral newsletter tone.",
	},
	{
		urls: ["https://indianexpress.com/section/technology/"],
		prompt: "Short digest with Indian policy + startup angle.",
	},
	{
		urls: [
			"https://economictimes.indiatimes.com/tech",
			"https://www.moneycontrol.com/news/technology/",
		],
		prompt: "India business + tech roundup; table OK.",
	},
	{
		urls: ["https://www.livemint.com/technology"],
		prompt: "Mint tech picks; professional LinkedIn style.",
	},
	{
		urls: ["https://www.ndtv.com/topic/tech-news"],
		prompt: "National tech news summary; general audience.",
	},
];

const LANDING_AI_FEATURES = [
	{
		title: "Web Scraping Agent",
		description:
			"Paste one or many URLs — Inkgest reads the full page, extracts the signal, and feeds it directly into your draft. No copy-pasting.",
		icon: "🔗",
		tag: "AI Agent",
	},
	{
		title: "Advanced Writing Editor",
		description:
			"A rich Tiptap-powered editor with slash commands, code blocks, tables, image embeds, and real-time formatting — designed for serious writers.",
		icon: "✍️",
		tag: "Editor",
	},
	{
		title: "AI Chatbot Sidebar",
		description:
			"Chat with your draft live. Ask the AI to rewrite, expand, shorten, change tone, or add research — without leaving the editor.",
		icon: "💬",
		tag: "AI Chat",
	},
	{
		title: "AI Automations",
		description:
			"Chain scrape → draft → format → export into a single automated workflow. Set it once, run it on any URL.",
		icon: "⚡",
		tag: "Automation",
	},
	{
		title: "Export to React / HTML / Markdown",
		description:
			"One-click export to clean Markdown for your CMS, production HTML for email, or a JSX component for your React app.",
		icon: "📤",
		tag: "Export",
	},
	{
		title: "AI Infographics & Tables",
		description:
			"Convert long-form sources into scannable infographic summaries and comparison tables — perfect for LinkedIn or newsletters.",
		icon: "📊",
		tag: "Visuals",
	},
];

/* ── Reusable fade-up on scroll ── */
function FadeUp({ children, delay = 0, className = "" }) {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, margin: "-60px" });
	return (
		<motion.div
			ref={ref}
			initial={{ opacity: 0, y: 28 }}
			animate={inView ? { opacity: 1, y: 0 } : {}}
			transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/* ── Nav ── */
function Nav() {
	const { scrollY } = useScroll();

	const shadow = useTransform(
		scrollY,
		[0, 60],
		["0 0 0 rgba(0,0,0,0)", "0 2px 24px rgba(0,0,0,0.08)"],
	);

	return (
		<motion.nav
			style={{ boxShadow: shadow, fontFamily: "'Comic', sans-serif" }}
			className="fixed top-0 left-0 right-0 z-50 "
			initial={{ y: -60, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
			css={{ borderColor: T.border }}
		>
			<div
				style={{
					background: "rgba(247,245,240,0.88)",
					backdropFilter: "blur(18px)",
				}}
			>
				<div
					className="max-w-7xl mx-auto px-6 flex items-center justify-between"
					style={{ height: 60 }}
				>
					{/* Logo */}
					<a
						href="#"
						className="flex items-center gap-2 no-underline"
						style={{
							fontFamily: "'Comic', sans-serif",
							fontSize: 22,
							color: T.accent,
						}}
					>
						<motion.span
							whileHover={{ scale: 1.3 }}
							style={{
								width: 9,
								height: 9,
								borderRadius: "50%",
								background: T.warm,
								display: "inline-block",
							}}
						/>
						inkgest
					</a>

					{/* Links */}
					<div className="hidden md:flex items-center gap-8">
						{["Features", "Export", "How it works", "Pricing", "FAQ"].map((l) => (
							<a
								key={l}
								href={
									l.toLowerCase().replace(/ /g, "-") === "blog"
										? "/blog"
										: `#${l.toLowerCase().replace(/ /g, "-")}`
								}
								className="no-underline text-sm font-medium transition-colors"
								style={{ color: T.muted, fontFamily: "'Comic', sans-serif" }}
								onMouseEnter={(e) => (e.target.style.color = T.accent)}
								onMouseLeave={(e) => (e.target.style.color = T.muted)}
							>
								{l}
							</a>
						))}
					</div>

					{/* CTAs */}
					<div className="flex items-center gap-3">
						<motion.a
							href="/login"
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.97 }}
							className="hidden md:inline-flex text-sm font-semibold no-underline px-4 py-2 rounded-xl border transition-all"
							style={{
								fontFamily: "'Comic', sans-serif",
								color: T.accent,
								borderColor: T.border,
								background: "transparent",
							}}
						>
							Log in
						</motion.a>
						<motion.a
							href="/app"
							whileHover={{
								scale: 1.04,
								y: -1,
								boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
							}}
							whileTap={{ scale: 0.96 }}
							className="inline-flex text-sm font-semibold no-underline px-5 py-2.5 rounded-xl text-white"
							style={{
								fontFamily: "'Comic', sans-serif",
								background: T.accent,
							}}
						>
							Try free →
						</motion.a>
					</div>
				</div>
			</div>
		</motion.nav>
	);
}

/* ── Hero with AI draft form ── */
function Hero() {
	const router = useRouter();
	const reduxUser = useSelector((state) => state.user?.user ?? null);
	const heroRef = useRef(null);
	const { scrollYProgress } = useScroll({
		target: heroRef,
		offset: ["start start", "end start"],
	});
	const y = useTransform(scrollYProgress, [0, 1], [0, 80]);

	const [loginModalOpen, setLoginModalOpen] = useState(false);

	const texts = [
		{ icon: "🔗", text: "Scrape any URL → newsletter in 60 seconds" },
		{ icon: "📝", text: "Turn 5 links into a publish-ready SEO blog" },
		{ icon: "📦", text: "Export your draft as React, HTML, or Markdown" },
		{ icon: "💬", text: "Chat with your draft, rewrite in one click" },
		{ icon: "⚡", text: "AI automations for your entire content workflow" },
		{ icon: "🖼️", text: "Generate images & assets directly in your draft" },
		{ icon: "🔍", text: "SEO analysis and keyword suggestions built-in" },
		{ icon: "📤", text: "One-click publish to your blog or CMS" },
	];

	function AnimatedText() {
		const doubled = [...texts, ...texts];

		return (
			<div style={{ overflow: "hidden", width: "100%", margin: "16px 0" }}>
				<motion.div
					animate={{ x: ["0%", "-50%"] }}
					transition={{ duration: 20, ease: "linear", repeat: Infinity }}
					style={{ display: "flex", gap: 24, width: "max-content" }}
					className="bg-amber-50/20 py-10 w-full"
				>
					{doubled.map((item, i) => (
						<div
							key={i}
							className="text-sm py-1 px-2 bg-amber-50"
							style={{ display: "flex", alignItems: "center", gap: 8 }}
						>
							<span>{item.icon}</span>
							<span>{item.text}</span>
						</div>
					))}
				</motion.div>
			</div>
		);
	}

	return (
		<section
			ref={heroRef}
			className="relative overflow-hidden"
			style={{ paddingTop: 140, paddingBottom: 80, background: T.base }}
		>
			{/* Ambient orb */}
			<motion.div
				animate={{ scale: [1, 1.08, 1], opacity: [0.18, 0.28, 0.18] }}
				transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
				style={{
					position: "absolute",
					top: "10%",
					left: "50%",
					transform: "translateX(-50%)",
					width: 600,
					height: 600,
					borderRadius: "50%",
					background: `radial-gradient(circle, ${T.warm}30 0%, transparent 70%)`,
					pointerEvents: "none",
				}}
			/>

			<motion.div
				style={{ y }}
				className="relative max-w-5xl mx-auto px-6 text-left"
			>
				<a
					className="bg-amber-50/50 hover:bg-amber-50 text-xs w-fit mx-auto p-2 mb-4 border border-amber-200 rounded-full flex gap-2 items-center"
					href="https://www.producthunt.com/products/inkgest-link-to-gest"
					target="_blank"
					rel="noopener noreferrer"
				>
					<SparkleIcon className="w-3 h-3" />
					We are live on Product Hunt
				</a>
		<motion.div className="max-w-5xl mx-auto my-10">
			{/* Headline — design-tool annotation style */}
			<motion.div
				initial={{ opacity: 0, y: 24 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
				style={{ textAlign: "center", marginBottom: 16, position: "relative" }}
			>
				{/* Line 1 — plain large heading */}
				<div style={{ fontSize: "clamp(36px,5.5vw,68px)", fontWeight: 800, color: T.accent, lineHeight: 1.05, letterSpacing: "-2px", marginBottom: 6 }}>
					Futuristic Agentic editor
				</div>

				{/* Line 2 — "for content creators" with bounding-box treatment */}
				<div style={{ position: "relative", display: "inline-block", marginBottom: 4 }}>
					{/* Annotation label top-left — font style */}
					<motion.div
						initial={{ opacity: 0, x: -8 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.7, duration: 0.5 }}
						style={{
							position: "absolute",
							top: -8,
							left: -4,
							background: T.surface,
							border: `1px solid ${T.border}`,
							borderRadius: 5,
							padding: "2px 8px",
							fontSize: 10.5,
							fontWeight: 600,
							color: T.muted,
							whiteSpace: "nowrap",
							fontFamily: "monospace",
							boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
						}}
					>
						AI chatbot
					</motion.div>

					{/* Annotation label top-right — color */}
					<motion.div
						initial={{ opacity: 0, x: 8 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.85, duration: 0.5 }}
						style={{
							position: "absolute",
							top: -8,
							right: -4,
							background: T.surface,
							border: `1px solid ${T.border}`,
							borderRadius: 5,
							padding: "2px 8px",
							fontSize: 10.5,
							fontWeight: 600,
							color: T.warm,
							whiteSpace: "nowrap",
							fontFamily: "monospace",
							display: "flex",
							alignItems: "center",
							gap: 5,
							boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
						}}
					>
						<span style={{ width: 8, height: 8, borderRadius: "50%", background: T.warm, display: "inline-block", flexShrink: 0 }} />
						{T.warm}
					</motion.div>
					<br />
					{/* The text with selection border */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.55, duration: 0.5 }}
						style={{
							position: "relative",
							display: "inline-block",
							border: `1.5px solid ${T.warm}`,
							padding: "4px 18px 4px 12px",
						}}
						className="bg-gradient-to-r from-amber-50 to-amber-50/20"
					>
						{/* Corner handles */}
						{[["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]].map(([v, h]) => (
							<div key={`${v}-${h}`} style={{ position: "absolute", [v]: -2, [h]: -2, width: 7, height: 7, borderRadius: 2, background: "white", border: `1.5px solid ${T.warm}` }} />
						))}
						
						<span style={{ fontStyle: "italic", fontSize: "clamp(36px,5.5vw,68px)", fontWeight: 400, color: T.warm, lineHeight: 1.05, letterSpacing: "-2px" }} className="text-amber-500">
							for content creators
						</span>
					</motion.div>

					{/* Annotation label bottom — letter-spacing */}
					<motion.div
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 1, duration: 0.5 }}
						style={{
							position: "absolute",
							bottom: -26,
							left: "50%",
							transform: "translateX(-50%)",
							background: T.surface,
							border: `1px solid ${T.border}`,
							borderRadius: 5,
							padding: "2px 8px",
							fontSize: 10.5,
							fontWeight: 600,
							color: T.muted,
							whiteSpace: "nowrap",
							fontFamily: "monospace",
							boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
						}}
					>
						Advance Editor
					</motion.div>
				</div>
				<br />
				<br />
			</motion.div>
				{/* ── DEMO EDITOR UI ── */}
				<motion.div
					initial={{ opacity: 0, y: 32 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.55, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
					style={{
						border: `1px solid ${T.border}`,
						borderRadius: 16,
						overflow: "hidden",
						boxShadow: "0 24px 80px rgba(0,0,0,0.10)",
						background: T.surface,
						display: "flex",
						flexDirection: "column",
						height: 560,
					}}
					className="max-w-5xl mx-auto ring hover:ring-4 ring-amber-50 transition-all duration-100 ease-in"
				>
					{/* Top bar */}
					<div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", flexShrink: 0 }}>
						<div style={{ display: "flex", gap: 6 }}>
							<div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57" }} />
							<div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FEBC2E" }} />
							<div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28C840" }} />
						</div>
						<div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
							<span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>inkgest</span>
							<span style={{ fontSize: 11, color: T.muted }}>— AI Content Editor</span>
						</div>
						<div style={{ display: "flex", gap: 6 }}>
							{["Preview", "Theme", "Export"].map((label) => (
								<div key={label} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: `1px solid ${T.border}`, color: T.accent, background: T.base, cursor: "default" }}>{label}</div>
							))}
						</div>
					</div>

					{/* Body: 3 columns */}
					<div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

						{/* Left sidebar */}
						<div style={{ width: 220, borderRight: `1px solid ${T.border}`, background: T.base, display: "flex", flexDirection: "column", flexShrink: 0 }}>
							<div style={{ padding: "12px 10px 8px", borderBottom: `1px solid ${T.border}` }}>
								<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
									<span style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>My Drafts</span>
									<div style={{ width: 22, height: 22, borderRadius: 6, background: T.warm, display: "flex", alignItems: "center", justifyContent: "center", cursor: "default" }}>
										<span style={{ color: "white", fontSize: 14, lineHeight: 1, marginTop: -1 }}>+</span>
									</div>
								</div>
								<div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 8px", fontSize: 11, color: T.muted }}>🔍 Search drafts…</div>
							</div>
							<div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
								{[
									{ title: "YC Newsletter · June 2026", tag: "Newsletter", active: true },
									{ title: "SEO Blog: AI Writing Tools", tag: "Blog" },
									{ title: "TechCrunch Digest", tag: "Newsletter" },
									{ title: "Product Launch Copy", tag: "Landing" },
									{ title: "Hacker News Roundup", tag: "Digest" },
								].map((d) => (
									<div key={d.title} style={{ padding: "8px 8px", borderRadius: 8, marginBottom: 2, background: d.active ? T.surface : "transparent", border: `1px solid ${d.active ? T.border : "transparent"}`, cursor: "default" }}>
										<p style={{ fontSize: 12, fontWeight: d.active ? 700 : 500, color: d.active ? T.accent : T.muted, lineHeight: 1.4, marginBottom: 3 }}>{d.title}</p>
										<span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: d.active ? "#FEF3E2" : "transparent", color: T.warm }}>{d.tag}</span>
									</div>
								))}
							</div>
						</div>

						{/* Center editor */}
						<div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: T.surface }}>
							{/* Editor toolbar */}
							<div style={{ padding: "8px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
								<span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#FEF3E2", color: T.warm }}>Newsletter</span>
								<div style={{ flex: 1 }} />
								{["B", "I", "H1", "H2", "·—", "{ }"].map((btn) => (
									<div key={btn} style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 5, border: `1px solid ${T.border}`, color: T.muted, cursor: "default" }}>{btn}</div>
								))}
								<div style={{ width: 1, height: 16, background: T.border }} />
								<div style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, background: T.accent, color: "white", fontWeight: 600, cursor: "default" }}>Save</div>
							</div>
							{/* Editor content */}
							<div style={{ flex: 1, overflowY: "auto", padding: "28px 40px" }}>
								<div style={{ maxWidth: 620, margin: "0 auto" }}>
									<div style={{ fontSize: 22, fontWeight: 800, color: T.accent, marginBottom: 8, lineHeight: 1.3 }}>YC Newsletter · June 2026</div>
									<div style={{ fontSize: 11, color: T.muted, marginBottom: 20, display: "flex", gap: 10 }}>
										<span>✍️ 420 words</span><span>·</span><span>📅 May 13, 2026</span><span>·</span><span>🔗 ycombinator.com</span>
									</div>
									{[
										"Y Combinator's latest batch is here — and the trends are clear. Founders are building smaller, leaner, and faster than ever before.",
										"Three themes dominated Demo Day this season: **AI-native infrastructure**, **vertical SaaS for emerging markets**, and **developer tools** that slash time-to-production.",
										"One standout: a two-person team that replaced an entire 20-person ops department using a single AI agent. Their ARR? $1.2M in 8 months.",
									].map((para, i) => (
										<p key={i} style={{ fontSize: 14, lineHeight: 1.8, color: "#37352F", marginBottom: 16 }}>{para}</p>
									))}
									<div style={{ height: 2, background: `linear-gradient(to right, ${T.warm}40, transparent)`, borderRadius: 2, marginBottom: 16 }} />
									<p style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, fontStyle: "italic" }}>Type <span style={{ background: T.base, padding: "1px 5px", borderRadius: 4, fontStyle: "normal", fontWeight: 600, fontSize: 12 }}>/</span> for AI commands, headings, images, tables and more…</p>
								</div>
							</div>
						</div>

						{/* Right AI chat sidebar */}
						<div style={{ width: 260, borderLeft: `1px solid ${T.border}`, background: T.base, display: "flex", flexDirection: "column", flexShrink: 0 }}>
							<div style={{ padding: "12px 12px 10px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
								<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
									<div style={{ width: 8, height: 8, borderRadius: "50%", background: T.warm }} />
									<span style={{ fontSize: 12, fontWeight: 700, color: T.accent }}>AI Assistant</span>
								</div>
							</div>
							<div style={{ flex: 1, overflowY: "auto", padding: "10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
								{[
									{ role: "ai", text: "I've drafted your YC newsletter. Want me to add a CTA or make the tone more conversational?" },
									{ role: "user", text: "Make it punchier and add 3 key takeaways at the end." },
									{ role: "ai", text: "Done! Added a bold takeaways section. I also tightened the opening paragraph to hook readers faster." },
								].map((msg, i) => (
									<div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
										<div style={{ maxWidth: "85%", padding: "8px 10px", borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: msg.role === "user" ? T.accent : T.surface, color: msg.role === "user" ? "white" : T.accent, fontSize: 11.5, lineHeight: 1.6, border: msg.role === "ai" ? `1px solid ${T.border}` : "none" }}>
											{msg.text}
										</div>
									</div>
								))}
							</div>
							<div style={{ padding: "8px 10px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
								<div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 10px", display: "flex", alignItems: "center", gap: 6 }}>
									<span style={{ fontSize: 11, color: T.muted, flex: 1 }}>Ask AI anything…</span>
									<div style={{ width: 22, height: 22, borderRadius: 6, background: T.warm, display: "flex", alignItems: "center", justifyContent: "center", cursor: "default" }}>
										<span style={{ color: "white", fontSize: 12 }}>↑</span>
									</div>
								</div>
							</div>
						</div>

					</div>
				</motion.div>
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.55 }}
					style={{
						fontSize: 13,
						color: T.muted,
						fontFamily: "'Comic', sans-serif",
						marginTop: 16,
						marginBottom: 32,
					}}
					className="flex items-center justify-center gap-2"
				>
					<strong style={{ color: T.accent }} className="flex items-center gap-2">
						<SparkleIcon className="w-4 h-4" /> {FREE_CREDIT_LIMIT} free credits
					</strong>{" "}
					· <div className="flex items-center gap-2"><CreditCardIcon className="w-4 h-4" /> No credit card </div>· <div className="flex items-center gap-2"><XCircleIcon className="w-4 h-4" /> Cancel anytime</div>
				</motion.p>
			</motion.div>
			</motion.div>
			<br />
			<AnimatedText />

			<LoginModal
				isOpen={loginModalOpen}
				onClose={() => setLoginModalOpen(false)}
			/>
		</section>
	);
}

function AIFeaturesSection() {
	return (
		<section
			id="features"
			style={{
				padding: "96px 24px",
				background: T.base,
				borderTop: `1px solid ${T.border}`,
				borderBottom: `1px solid ${T.border}`,
			}}
		>
			<div className="max-w-7xl mx-auto">
				<FadeUp>
				<p
					style={{
						fontSize: 12,
						fontWeight: 700,
						textTransform: "uppercase",
						letterSpacing: "0.1em",
						color: T.warm,
						marginBottom: 10,
						fontFamily: "'Comic', sans-serif",
					}}
				>
					Platform Features
				</p>
					<h2
						style={{
							fontFamily: "'Comic', sans-serif",
							fontSize: "clamp(34px,4vw,50px)",
							color: T.accent,
							lineHeight: 1.12,
							marginBottom: 14,
							letterSpacing: "-0.4px",
						}}
					>
						Everything a content writer needs.
					</h2>
					<p
						style={{
							fontSize: 17,
							color: T.muted,
							lineHeight: 1.65,
							maxWidth: 680,
							fontFamily: "'Comic', sans-serif",
						}}
					>
						From AI web scraping to an advanced editor, chatbot, automations, and multi-format export — the full stack for professional content creation.
					</p>
				</FadeUp>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
						gap: 16,
						marginTop: 40,
					}}
					
				>
				{LANDING_AI_FEATURES.map((f, i) => (
					<FadeUp key={f.title} delay={i * 0.06}>
						<motion.div
							whileHover={{ y: -4, boxShadow: "0 14px 34px rgba(0,0,0,0.09)" }}
							style={{
								background: T.surface,
								border: `1px solid ${T.border}`,
								borderRadius: 14,
								padding: "22px 20px 20px",
								height: "100%",
								display: "flex",
								flexDirection: "column",
								gap: 10,
							}}
						>
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
								<div style={{ fontSize: 22, lineHeight: 1 }}>{f.icon}</div>
								<span
									style={{
										fontSize: 10,
										fontWeight: 700,
										letterSpacing: "0.07em",
										textTransform: "uppercase",
										color: T.warm,
										background: `${T.warm}18`,
										padding: "3px 8px",
										borderRadius: 20,
										fontFamily: "'Comic', sans-serif",
									}}
								>
									{f.tag}
								</span>
							</div>
							<h3
								style={{
									fontSize: 16,
									fontWeight: 700,
									color: T.accent,
									fontFamily: "'Comic', sans-serif",
									lineHeight: 1.3,
								}}
							>
								{f.title}
							</h3>
							<p
								style={{
									fontSize: 13.5,
									lineHeight: 1.65,
									color: T.muted,
									fontFamily: "'Comic', sans-serif",
								}}
							>
								{f.description}
							</p>
						</motion.div>
					</FadeUp>
				))}
				</div>
			</div>
		</section>
	);
}

/* ── Features bento grid ── */
const FEATURES = [
	{
		title: "Scrape any URL — blog, news, research, Substack — and draft instantly",
		word: "Scrape & Generate",
		image: "/features/feature-1.png",
		emoji: "⚡",
	},
	{
		title: "AI chatbot sidebar — rewrite, expand, or change tone without leaving the editor",
		word: "AI Chat",
		image: "/features/feature-2.png",
		emoji: "💬",
	},
	{
		title: "Preview your content in beautiful themes before exporting",
		word: "Theme Preview",
		image: "/features/feature-3.png",
		emoji: "🎨",
	},
	{
		title: "AI-generated infographics and tables from any source URL",
		word: "Visualize",
		image: "/features/feature-4.png",
		emoji: "📊",
	},
	{
		title: "Advanced rich-text editor with slash commands, code blocks, and autosave",
		word: "Advanced Editor",
		image: "/features/feature-5.png",
		emoji: "✏️",
	},
];

function Features() {
	return (
		<section
			id="product-showcase"
			style={{
				padding: "96px 24px",
				background: "white",
				borderTop: `1px solid ${T.border}`,
				borderBottom: `1px solid ${T.border}`,
			}}
		>
			<div className="max-w-7xl mx-auto">
				<FadeUp>
					<p
					style={{
						fontSize: 12,
						fontWeight: 700,
						textTransform: "uppercase",
						letterSpacing: "0.1em",
						color: T.warm,
						marginBottom: 10,
						fontFamily: "'Comic', sans-serif",
					}}
				>
					Product showcase
				</p>
					<h2
						style={{
							fontFamily: "'Comic', sans-serif",
							fontSize: "clamp(36px,4vw,54px)",
							color: T.accent,
							lineHeight: 1.1,
							marginBottom: 14,
							letterSpacing: "-0.5px",
						}}
					>
						Scrape. Edit. Chat.
						<br />
						Export. Done.
					</h2>
					<p
						style={{
							fontSize: 17,
							color: T.muted,
							lineHeight: 1.65,
							maxWidth: 480,
							fontFamily: "'Comic', sans-serif",
						}}
					>
						Every screen in Inkgest is designed to cut time from idea to published content — no tab switching, no copy-pasting.
					</p>
				</FadeUp>

				{/* Bento grid: 2 cards row 1, 3 cards row 2 ── */}
				<div
					className="features-bento"
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(6, 1fr)",
						gap: 20,
						marginTop: 48,
					}}
				>
					<style>{`
						@media (max-width: 768px) {
							.features-bento { grid-template-columns: 1fr !important; }
							.features-bento a { grid-column: span 1 !important; }
						}
					`}</style>
					{FEATURES.map((f, i) => (
						<FadeUp key={f.title} delay={i * 0.08}>
							<motion.a
								href="/app"
								whileHover={{
									y: -4,
									boxShadow: "0 20px 48px rgba(0,0,0,0.12)",
								}}
								transition={{ duration: 0.25 }}
								style={{
									gridColumn: i < 2 ? "span 3" : "span 2",
									display: "block",
									textDecoration: "none",
									background: T.base,
									border: `1px solid ${T.border}`,
									borderRadius: 16,
									overflow: "hidden",
									cursor: "pointer",
								}}
							>
								<div
									style={{
										aspectRatio: i < 2 ? "16/10" : "16/9",
										background: T.border,
										position: "relative",
										overflow: "hidden",
									}}
								>
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={f.image}
										alt={f.title}
										style={{
											width: "100%",
											height: "100%",
											objectFit: "cover",
										}}
										onError={(e) => {
											e.target.style.display = "none";
											const fb =
												e.target.parentElement?.querySelector(
													"[data-fallback]",
												);
											if (fb) fb.style.display = "flex";
										}}
									/>
									<div
										data-fallback
										style={{
											display: "none",
											position: "absolute",
											inset: 0,
											alignItems: "center",
											justifyContent: "center",
											background: "#F0ECE5",
											fontSize: 48,
											color: T.muted,
										}}
									>
									{f.emoji}
									</div>
								</div>
								<div style={{ padding: "20px 22px" }}>
									<span
										style={{
											fontSize: 11,
											fontWeight: 700,
											textTransform: "",
											letterSpacing: "0.08em",
											color: T.warm,
											fontFamily: "'Comic', sans-serif",
										}}
									>
										{f.word}
									</span>
									<h3
										style={{
											fontFamily: "'Comic', sans-serif",
											fontWeight: 700,
											fontSize: 16,
											color: T.accent,
											marginTop: 6,
											lineHeight: 1.35,
										}}
									>
										{f.title}
									</h3>
								</div>
							</motion.a>
						</FadeUp>
					))}
				</div>
			</div>
		</section>
	);
}

/* ── Export Formats ── */
function ExportFormats() {
	const [active, setActive] = useState(0);
	const fmt = EXPORT_FORMATS[active];

	return (
		<section
			id="export"
			style={{
				padding: "96px 24px",
				background: T.accent,
				borderTop: `1px solid ${T.border}`,
			}}
		>
			<div className="max-w-7xl mx-auto">
				<FadeUp>
					<p
						style={{
							fontSize: 12,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.1em",
							color: T.warm,
							marginBottom: 10,
							fontFamily: "'Comic', sans-serif",
						}}
					>
						Export Formats
					</p>
					<h2
						style={{
							fontFamily: "'Comic', sans-serif",
							fontSize: "clamp(34px,4vw,52px)",
							color: "white",
							lineHeight: 1.1,
							marginBottom: 14,
							letterSpacing: "-0.5px",
						}}
					>
						Write once.
						<br />
						<span style={{ color: T.warm }}>Export anywhere.</span>
					</h2>
					<p
						style={{
							fontSize: 17,
							color: "rgba(255,255,255,0.6)",
							lineHeight: 1.65,
							maxWidth: 540,
							fontFamily: "'Comic', sans-serif",
							marginBottom: 40,
						}}
					>
						Your draft, your format. Export to clean Markdown for your CMS, semantic HTML for email campaigns, or a JSX React component for your codebase — in one click.
					</p>
				</FadeUp>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1.4fr",
						gap: 40,
						alignItems: "start",
					}}
					className="export-grid"
				>
					<style>{`
						@media (max-width: 768px) {
							.export-grid { grid-template-columns: 1fr !important; }
						}
					`}</style>
					{/* Selector */}
					<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
						{EXPORT_FORMATS.map((f, i) => (
							<motion.button
								key={f.label}
								onClick={() => setActive(i)}
								whileHover={{ x: 4 }}
								style={{
									background: active === i ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
									border: active === i ? "1.5px solid rgba(255,255,255,0.3)" : "1.5px solid rgba(255,255,255,0.1)",
									borderRadius: 12,
									padding: "18px 20px",
									textAlign: "left",
									cursor: "pointer",
									transition: "all 0.2s",
									display: "flex",
									alignItems: "flex-start",
									gap: 14,
								}}
							>
								<span style={{ fontSize: 24, lineHeight: 1, marginTop: 2 }}>{f.icon}</span>
								<div>
									<p
										style={{
											fontSize: 15,
											fontWeight: 700,
											color: "white",
											fontFamily: "'Comic', sans-serif",
											marginBottom: 4,
										}}
									>
										{f.label}
									</p>
									<p
										style={{
											fontSize: 13,
											color: "rgba(255,255,255,0.55)",
											fontFamily: "'Comic', sans-serif",
											lineHeight: 1.5,
										}}
									>
										{f.description}
									</p>
								</div>
							</motion.button>
						))}
					</div>

					{/* Code preview */}
					<FadeUp>
						<AnimatePresence mode="wait">
							<motion.div
								key={active}
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -12 }}
								transition={{ duration: 0.3 }}
								style={{
									background: "#0D1117",
									borderRadius: 16,
									overflow: "hidden",
									border: "1px solid rgba(255,255,255,0.1)",
								}}
							>
								{/* Window chrome */}
								<div
									style={{
										padding: "12px 16px",
										borderBottom: "1px solid rgba(255,255,255,0.08)",
										display: "flex",
										alignItems: "center",
										gap: 8,
									}}
								>
									<span style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57", display: "inline-block" }} />
									<span style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E", display: "inline-block" }} />
									<span style={{ width: 12, height: 12, borderRadius: "50%", background: "#28CA41", display: "inline-block" }} />
									<span
										style={{
											marginLeft: 8,
											fontSize: 12,
											color: "rgba(255,255,255,0.35)",
											fontFamily: "monospace",
										}}
									>
										{fmt.label === "Markdown" ? "draft.md" : fmt.label === "HTML" ? "draft.html" : "Article.jsx"}
									</span>
								</div>
								<pre
									style={{
										margin: 0,
										padding: "24px 20px",
										fontSize: 13,
										lineHeight: 1.75,
										color: "#E6EDF3",
										fontFamily: "monospace",
										overflowX: "auto",
										whiteSpace: "pre-wrap",
									}}
								>
									{fmt.sample}
								</pre>
							</motion.div>
						</AnimatePresence>
					</FadeUp>
				</div>
			</div>
		</section>
	);
}

/* ── How it works ── */
function HowItWorks() {
	const steps = [
		{
			n: "01",
			title: "Scrape any URL",
			body: "Paste one or multiple URLs — blog posts, news, research, Substack. The AI agent reads the full page, no copy-pasting required.",
			icon: "🔗",
		},
		{
			n: "02",
			title: "Generate your draft",
			body: "Describe your angle and content format — newsletter, blog, table, infographic. A structured draft is ready in under 60 seconds.",
			icon: "⚡",
		},
		{
			n: "03",
			title: "Edit with AI assistance",
			body: "Open the advanced editor. Use the AI chatbot to rewrite sections, adjust tone, expand ideas, or run automations — all inline.",
			icon: "✍️",
		},
		{
			n: "04",
			title: "Export to your format",
			body: "One click to export clean Markdown, semantic HTML, or a ready-to-use React component. Ship to any platform instantly.",
			icon: "📤",
		},
	];

	return (
		<section
			id="how-it-works"
			style={{
				padding: "96px 24px",
				background: "white",
				borderTop: `1px solid ${T.border}`,
				borderBottom: `1px solid ${T.border}`,
			}}
		>
			<div className="max-w-7xl mx-auto">
				<FadeUp>
					<p
						style={{
							fontSize: 12,
							fontWeight: 700,
							textTransform: "",
							letterSpacing: "0.1em",
							color: T.warm,
							marginBottom: 10,
							fontFamily: "'Comic', sans-serif",
						}}
					>
						How it works
					</p>
					<h2
						style={{
							fontFamily: "'Comic', sans-serif",
							fontSize: "clamp(36px,4vw,54px)",
							color: T.accent,
							lineHeight: 1.1,
							marginBottom: 14,
							letterSpacing: "-0.5px",
						}}
					>
						Four steps.
						<br />
						Full content workflow.
					</h2>
					<p
						style={{
							fontSize: 17,
							color: T.muted,
							lineHeight: 1.65,
							maxWidth: 480,
							fontFamily: "'Comic', sans-serif",
						}}
					>
						No prompt engineering. No tab switching. No copy-pasting from five different places. Scrape → draft → edit → export.
					</p>
				</FadeUp>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
						gap: 24,
						marginTop: 52,
					}}
				>
					{steps.map((s, i) => (
						<FadeUp key={s.n} delay={i * 0.1}>
							<motion.div
								whileHover={{
									y: -6,
									boxShadow: "0 16px 48px rgba(0,0,0,0.11)",
								}}
								transition={{ duration: 0.25 }}
								style={{
									background: T.base,
									border: `1px solid ${T.border}`,
									borderRadius: 14,
									padding: "28px 24px",
									height: "100%",
									cursor: "default",
									position: "relative",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
									<div
										style={{
											width: 36,
											height: 36,
											borderRadius: "50%",
											background: T.warm,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontSize: 16,
											flexShrink: 0,
										}}
									>
										{s.icon}
									</div>
									<span
										style={{
											fontFamily: "'Comic', sans-serif",
											fontSize: 13,
											fontWeight: 700,
											color: T.warm,
											opacity: 0.7,
										}}
									>
										Step {s.n}
									</span>
								</div>
								<h3
									style={{
										fontFamily: "'Comic', sans-serif",
										fontWeight: 700,
										fontSize: 17,
										color: T.accent,
										marginBottom: 10,
										lineHeight: 1.3,
									}}
								>
									{s.title}
								</h3>
								<p
									style={{
										fontFamily: "'Comic', sans-serif",
										fontSize: 14,
										color: T.muted,
										lineHeight: 1.7,
									}}
								>
									{s.body}
								</p>
							</motion.div>
						</FadeUp>
					))}
				</div>
			</div>
		</section>
	);
}

/* ── Stats strip ── */
function StatsStrip() {
	const stats = [
		{ num: "60", suffix: "s", label: "URL to publish-ready draft" },
		{ num: "3", suffix: "hrs", label: "Saved per content piece on average" },
		{ num: "3", suffix: "formats", label: "Export to React, HTML, or Markdown" },
		{ num: "∞", suffix: "", label: "URLs you can scrape per draft on Pro" },
	];
	return (
		<div style={{ background: T.accent, padding: "56px 24px" }}>
			<div
				className="max-w-7xl mx-auto"
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
				}}
			>
				{stats.map((s, i) => (
					<FadeUp key={s.label} delay={i * 0.1}>
						<div
							style={{
								textAlign: "center",
								padding: "0 32px",
								borderRight:
									i < stats.length - 1
										? "1px solid rgba(255,255,255,0.1)"
										: "none",
							}}
						>
							<div
								style={{
									fontFamily: "'Comic', sans-serif",
									fontSize: 54,
									color: "white",
									lineHeight: 1,
								}}
							>
								{s.num}
								<span style={{ color: T.warm }}>{s.suffix}</span>
							</div>
							<div
								style={{
									fontSize: 14,
									color: "rgba(255,255,255,0.5)",
									marginTop: 6,
									fontFamily: "'Comic', sans-serif",
								}}
							>
								{s.label}
							</div>
						</div>
					</FadeUp>
				))}
			</div>
		</div>
	);
}

/* ── Use Cases strip ── */
function UseCasesStrip() {
	const cases = [
		{ icon: "📰", title: "Newsletter writers", body: "Go from 5 URLs to a structured issue in under 60 seconds. Never miss a publish day." },
		{ icon: "✍️", title: "Blog content creators", body: "Research, draft, and format SEO-ready blog posts from multiple sources — no tab juggling." },
		{ icon: "📱", title: "Social media managers", body: "Turn long-form articles into Twitter threads, LinkedIn posts, or short-form content instantly." },
		{ icon: "🏢", title: "Content teams", body: "Run AI automations for recurring formats. Consistent quality at scale without growing headcount." },
	];
	return (
		<section
			style={{
				padding: "80px 24px",
				background: T.surface,
				borderTop: `1px solid ${T.border}`,
				borderBottom: `1px solid ${T.border}`,
			}}
		>
			<div className="max-w-7xl mx-auto">
				<FadeUp>
					<p
						style={{
							fontSize: 12,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.1em",
							color: T.warm,
							marginBottom: 10,
							textAlign: "center",
							fontFamily: "'Comic', sans-serif",
						}}
					>
						Built for
					</p>
					<h2
						style={{
							fontFamily: "'Comic', sans-serif",
							fontSize: "clamp(32px,3.5vw,48px)",
							color: T.accent,
							lineHeight: 1.1,
							marginBottom: 40,
							letterSpacing: "-0.4px",
							textAlign: "center",
						}}
					>
						Every type of content creator.
					</h2>
				</FadeUp>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
						gap: 18,
					}}
				>
					{cases.map((c, i) => (
						<FadeUp key={c.title} delay={i * 0.08}>
							<motion.div
								whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.08)" }}
								style={{
									background: "white",
									border: `1px solid ${T.border}`,
									borderRadius: 14,
									padding: "24px 22px",
								}}
							>
								<div style={{ fontSize: 28, marginBottom: 12 }}>{c.icon}</div>
								<h3
									style={{
										fontSize: 15,
										fontWeight: 700,
										color: T.accent,
										marginBottom: 8,
										fontFamily: "'Comic', sans-serif",
									}}
								>
									{c.title}
								</h3>
								<p
									style={{
										fontSize: 13.5,
										color: T.muted,
										lineHeight: 1.65,
										fontFamily: "'Comic', sans-serif",
									}}
								>
									{c.body}
								</p>
							</motion.div>
						</FadeUp>
					))}
				</div>
			</div>
		</section>
	);
}

/* ── Pricing ── */
function Pricing() {
	const free = [
		"50 credits every month",
		"Full editor access",
		"Copy to clipboard",
		"Save up to 3 drafts",
		"Google login",
	];
	const starter = [
		"50 credits every month",
		"All content formats",
		"Multiple URL sources per draft",
		"AI Chat with all models",
		"Priority support",
	];
	const pro = [
		"100 credits every month",
		"All content formats",
		"Multiple URL sources per draft",
		"AI Chat with all models",
		"Priority support",
	];

	const router = useRouter();
	return (
		<section
			id="pricing"
			style={{
				padding: "96px 24px",
				background: "white",
				borderTop: `1px solid ${T.border}`,
			}}
		>
			<div className="max-w-7xl mx-auto">
				<FadeUp>
					<p
						style={{
							fontSize: 12,
							fontWeight: 700,
							textTransform: "",
							letterSpacing: "0.1em",
							color: T.warm,
							textAlign: "center",
							marginBottom: 10,
							fontFamily: "'Comic', sans-serif",
						}}
					>
						Pricing
					</p>
					<h2
						style={{
							fontFamily: "'Comic', sans-serif",
							fontSize: "clamp(36px,4vw,54px)",
							textAlign: "center",
							color: T.accent,
							lineHeight: 1.1,
							marginBottom: 14,
							letterSpacing: "-0.5px",
						}}
					>
						Simple. One decision.
					</h2>
					<p
						style={{
							textAlign: "center",
							fontSize: 17,
							color: T.muted,
							lineHeight: 1.6,
							fontFamily: "'Comic', sans-serif",
						}}
					>
						Try it free. Upgrade when it saves you more time than it costs.
					</p>
				</FadeUp>

				<div
					className="lg:grid-cols-3 grid-cols-1 grid items-center justify-center gap-4 my-10"
				>
					{/* Free */}
					<FadeUp delay={0.1}>
						<motion.div
							whileHover={{ y: -4, boxShadow: "0 16px 48px rgba(0,0,0,0.10)" }}
							style={{
								background: T.base,
								border: `1.5px solid ${T.border}`,
								borderRadius: 16,
								padding: "34px 30px",
								height: "100%",
								display: "flex",
								flexDirection: "column",
							}}
						>
							<p
								style={{
									fontSize: 12,
									fontWeight: 700,
									textTransform: "",
									letterSpacing: "0.08em",
									color: T.muted,
									marginBottom: 10,
									fontFamily: "'Comic', sans-serif",
								}}
							>
								Free
							</p>
							<div
								style={{
									fontFamily: "'Comic', sans-serif",
									fontSize: 52,
									color: T.accent,
									lineHeight: 1,
								}}
							>
								$0
							</div>
							<p
								style={{
									fontSize: 14,
									color: T.muted,
									margin: "10px 0 24px",
									lineHeight: 1.6,
									fontFamily: "'Comic', sans-serif",
								}}
							>
								Enough to know if it works for you. No card, no expiry.
							</p>
							<ul style={{ listStyle: "none", marginBottom: 28, flex: 1 }}>
								{free.map((f) => (
									<li
										key={f}
										style={{
											fontSize: 13.5,
											color: T.muted,
											padding: "8px 0",
											borderBottom: `1px solid ${T.border}`,
											display: "flex",
											alignItems: "center",
											gap: 9,
											fontFamily: "'Comic', sans-serif",
										}}
									>
										<span style={{ color: T.warm, fontWeight: 700 }}>✓</span>{" "}
										{f}
									</li>
								))}
							</ul>
							<motion.a
								href="/login"
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.97 }}
								style={{
									display: "block",
									textAlign: "center",
									background: T.accent,
									color: "white",
									padding: "13px",
									borderRadius: 10,
									fontSize: 14,
									fontWeight: 600,
									textDecoration: "none",
									fontFamily: "'Comic', sans-serif",
								}}
							>
								Start for free →
							</motion.a>
						</motion.div>
					</FadeUp>

					{/* Starter */}
					<FadeUp delay={0.2}>
						<motion.div
							whileHover={{ y: -4, boxShadow: "0 16px 48px rgba(0,0,0,0.10)" }}
							style={{
								background: T.base,
								border: `1.5px solid ${T.border}`,
								borderRadius: 16,
								padding: "34px 30px",
								height: "100%",
								display: "flex",
								flexDirection: "column",
							}}
						>
							<p
								style={{
									fontSize: 12,
									fontWeight: 700,
									textTransform: "",
									letterSpacing: "0.08em",
									color: T.muted,
									marginBottom: 10,
									fontFamily: "'Comic', sans-serif",
								}}
							>
								Starter
							</p>
							<div
								style={{
									fontFamily: "'Comic', sans-serif",
									fontSize: 52,
									color: T.accent,
									lineHeight: 1,
								}}
							>
								$20
							</div>
							<p
								style={{
									fontSize: 14,
									color: T.muted,
									margin: "10px 0 24px",
									lineHeight: 1.6,
									fontFamily: "'Comic', sans-serif",
								}}
							>
								Unlimited credits for serious creators
							</p>
							<ul style={{ listStyle: "none", marginBottom: 28, flex: 1 }}>
								{starter.map((f) => (
									<li key={f} style={{ fontSize: 13.5, color: T.muted, padding: "8px 0", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 9, fontFamily: "'Comic', sans-serif" }}>
										<span style={{ color: T.warm, fontWeight: 700 }}>✓</span> {f}
									</li>
								))}
							</ul>
							<motion.a
								href="/login"
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.97 }}
								style={{ display: "block", textAlign: "center", background: T.accent, color: "white", padding: "13px", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none", fontFamily: "'Comic', sans-serif" }}
							>
								Start for free →
							</motion.a>
						</motion.div>
					</FadeUp>
					{/* Pro */}
					<FadeUp delay={0.2}>
						<motion.div
							whileHover={{
								y: -4,
								boxShadow: "0 16px 60px rgba(26,26,26,0.28)",
							}}
							style={{
								background: T.accent,
								border: `1.5px solid ${T.accent}`,
								borderRadius: 16,
								padding: "34px 30px",
								height: "100%",
								display: "flex",
								flexDirection: "column",
							}}
						>
							<p
								style={{
									fontSize: 12,
									fontWeight: 700,
									textTransform: "",
									letterSpacing: "0.08em",
									color: "rgba(255,255,255,0.5)",
									marginBottom: 10,
									fontFamily: "'Comic', sans-serif",
								}}
							>
								Pro
							</p>
							<div
								style={{
									fontFamily: "'Comic', sans-serif",
									fontSize: 52,
									color: "white",
									lineHeight: 1,
								}}
							>
								$40
								<span
									style={{
										fontSize: 18,
										color: "rgba(255,255,255,0.45)",
										fontFamily: "'Comic', sans-serif",
										fontWeight: 400,
									}}
								>
									/mo
								</span>
							</div>
							<p
								style={{
									fontSize: 14,
									color: "rgba(255,255,255,0.6)",
									margin: "10px 0 24px",
									lineHeight: 1.6,
									fontFamily: "'Comic', sans-serif",
								}}
							>
								For writers who publish on a schedule and can't afford a bad
								week.
							</p>
							<ul style={{ listStyle: "none", marginBottom: 28, flex: 1 }}>
								{pro.map((f) => (
									<li
										key={f}
										style={{
											fontSize: 13.5,
											color: "rgba(255,255,255,0.72)",
											padding: "8px 0",
											borderBottom: "1px solid rgba(255,255,255,0.1)",
											display: "flex",
											alignItems: "center",
											gap: 9,
											fontFamily: "'Comic', sans-serif",
										}}
									>
										<span style={{ color: "#F0C070", fontWeight: 700 }}>✓</span>{" "}
										{f}
									</li>
								))}
							</ul>
							<motion.button
								whileHover={{ scale: 1.02, background: "#f5f0e8" }}
								whileTap={{ scale: 0.97 }}
								onClick={() => router.push("/pricing")}
								style={{
									display: "block",
									width: "100%",
									background: "white",
									color: T.accent,
									padding: "13px",
									borderRadius: 10,
									fontSize: 14,
									fontWeight: 700,
									border: "none",
									cursor: "pointer",
									fontFamily: "'Comic', sans-serif",
								}}
							>
								Upgrade to Pro →
							</motion.button>
						</motion.div>
					</FadeUp>
				</div>
			</div>
		</section>
	);
}

/* ── Open Source ── */
function OpenSource() {
	return (
		<section
			style={{
				padding: "96px 24px",
				background: T.base,
				borderTop: `1px solid ${T.border}`,
			}}
		>
			<div className="max-w-7xl mx-auto">
				<FadeUp>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: 64,
							alignItems: "center",
						}}
					>
						{/* Left */}
						<div>
							<p
								style={{
									fontSize: 12,
									fontWeight: 700,
									textTransform: "",
									letterSpacing: "0.1em",
									color: T.warm,
									marginBottom: 10,
									fontFamily: "'Comic', sans-serif",
								}}
							>
								Open Source
							</p>
						<h2
							style={{
								fontFamily: "'Comic', sans-serif",
								fontSize: "clamp(36px,4vw,54px)",
								color: T.accent,
								lineHeight: 1.1,
								marginBottom: 16,
								letterSpacing: "-0.5px",
							}}
						>
							Fully open.
							<br />
							<em style={{ color: T.warm }}>No black boxes.</em>
						</h2>
						<p
							style={{
								fontSize: 16,
								color: T.muted,
								lineHeight: 1.7,
								maxWidth: 440,
								fontFamily: "'Comic', sans-serif",
								marginBottom: 32,
							}}
						>
							Inkgest is completely open source — the scraping agent, the editor, the AI chat, the automations, and the export pipeline. Read the code, fork it, self-host it, or contribute back.
						</p>
							<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
								<motion.a
									href="https://github.com/shreyvijayvargiya/Inkgest"
									target="_blank"
									rel="noopener noreferrer"
									whileHover={{
										scale: 1.03,
										y: -1,
										boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
									}}
									whileTap={{ scale: 0.97 }}
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: 9,
										background: T.accent,
										color: "white",
										padding: "12px 24px",
										borderRadius: 11,
										fontSize: 14,
										fontWeight: 700,
										textDecoration: "none",
										fontFamily: "'Comic', sans-serif",
									}}
								>
									{/* GitHub icon */}
									<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
										<path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
									</svg>
									View on GitHub
								</motion.a>
								<motion.a
									href="https://github.com/shreyvijayvargiya/Inkgest/fork"
									target="_blank"
									rel="noopener noreferrer"
									whileHover={{ scale: 1.03, borderColor: T.accent }}
									whileTap={{ scale: 0.97 }}
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: 8,
										background: "transparent",
										color: T.accent,
										padding: "12px 24px",
										borderRadius: 11,
										fontSize: 14,
										fontWeight: 600,
										textDecoration: "none",
										fontFamily: "'Comic', sans-serif",
										border: `1.5px solid ${T.border}`,
										transition: "border-color 0.2s",
									}}
								>
									Fork &amp; self-host
								</motion.a>
							</div>
						</div>

						{/* Right — feature tiles */}
						<FadeUp delay={0.1}>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: 14,
								}}
							>
								{[
									{
										icon: "🔍",
										title: "Full source code",
										body: "Every line of the app is public on GitHub.",
									},
									{
										icon: "🍴",
										title: "Fork freely",
										body: "Clone and self-host your own instance in minutes.",
									},
									{
										icon: "🤝",
										title: "Contributions welcome",
										body: "Open PRs, file issues, suggest features.",
									},
									{
										icon: "🔒",
										title: "No hidden logic",
										body: "See exactly how drafts are generated end-to-end.",
									},
								].map((item) => (
									<motion.div
										key={item.title}
										whileHover={{
											y: -4,
											boxShadow: "0 12px 32px rgba(0,0,0,0.09)",
										}}
										transition={{ duration: 0.22 }}
										style={{
											background: T.surface,
											border: `1px solid ${T.border}`,
											borderRadius: 12,
											padding: "20px 18px",
										}}
									>
										<div style={{ fontSize: 22, marginBottom: 8 }}>
											{item.icon}
										</div>
										<p
											style={{
												fontSize: 13,
												fontWeight: 700,
												color: T.accent,
												marginBottom: 5,
												fontFamily: "'Comic', sans-serif",
											}}
										>
											{item.title}
										</p>
										<p
											style={{
												fontSize: 12.5,
												color: T.muted,
												lineHeight: 1.6,
												fontFamily: "'Comic', sans-serif",
											}}
										>
											{item.body}
										</p>
									</motion.div>
								))}
							</div>
						</FadeUp>
					</div>
				</FadeUp>
			</div>
		</section>
	);
}

/* ── FAQ ── */
function FAQ() {
	const [open, setOpen] = useState(null);
	const faqs = [
		{
			q: "What URLs does it support?",
			a: "Most publicly accessible web pages — blog posts, news articles, research papers, Medium, Substack, LinkedIn articles. Paywalled content won't work. We use Firecrawl so JavaScript-rendered pages are handled correctly.",
		},
		{
			q: "What export formats are supported?",
			a: "Inkgest exports to three formats: clean Markdown (.md) for Ghost, Notion, or any CMS; semantic HTML for emails or landing pages; and a JSX React component ready to drop into your Next.js or React app.",
		},
		{
			q: "How does the AI chatbot work in the editor?",
			a: "Once your draft is open in the editor, a collapsible AI sidebar lets you chat with the document. Ask it to rewrite a section, adjust the tone, expand a paragraph, add bullet points, or summarize — it knows the full context of your draft.",
		},
		{
			q: "What are AI automations?",
			a: "Automations let you chain scrape → draft → format into a repeatable workflow. Set up a sequence once and run it on any URL — useful for newsletters on a schedule or content teams with recurring formats.",
		},
		{
			q: "How good is the output, really?",
			a: "Better than starting from scratch. The draft gives you a structured starting point you then edit and make your own. Most users report needing to change 20–40% of the output. The more specific your prompt, the better the first draft.",
		},
		{
			q: "Can I use multiple source URLs for one draft?",
			a: "Yes — on paid plans you can add multiple URLs per draft. The AI synthesizes all sources into a single cohesive piece.",
		},
		{
			q: "Is my content private?",
			a: "Yes. Your drafts are stored in your private account and are never used to train any AI model. We don't share or sell your content.",
		},
		{
			q: "Can I cancel Pro anytime?",
			a: "Yes. Cancel from account settings in one click. No emails, no forms. Your Pro access continues until the end of the current billing period.",
		},
		{
			q: "Do you offer refunds?",
			a: "If you're not happy in your first 7 days on Pro, email us for a full refund — no questions asked.",
		},
	];

	return (
		<section id="faq" style={{ padding: "96px 24px", background: T.base }}>
			<div
				className="max-w-7xl mx-auto"
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1.6fr",
					gap: 64,
					alignItems: "start",
				}}
			>
				<FadeUp>
					<p
						style={{
							fontSize: 12,
							fontWeight: 700,
							textTransform: "",
							letterSpacing: "0.1em",
							color: T.warm,
							marginBottom: 10,
							fontFamily: "'Comic', sans-serif",
						}}
					>
						FAQ
					</p>
					<h2
						style={{
							fontFamily: "'Comic', sans-serif",
							fontSize: "clamp(36px,4vw,54px)",
							color: T.accent,
							lineHeight: 1.1,
							letterSpacing: "-0.5px",
						}}
					>
						Real questions.
						<br />
						<span style={{ color: T.warm }}>Real answers.</span>
					</h2>
					<p
						style={{
							fontSize: 15,
							color: T.muted,
							marginTop: 14,
							lineHeight: 1.65,
							fontFamily: "'Comic', sans-serif",
						}}
					>
						Still curious?{" "}
						<a
							href="mailto:shreyvijayvargiya26@gmail.com"
							style={{ color: T.accent, textDecoration: "underline" }}
						>
							Drop us an email.
						</a>
					</p>
				</FadeUp>

				<FadeUp delay={0.1}>
					<div>
						{faqs.map((f, i) => (
							<div key={f.q} style={{ borderBottom: `1px solid ${T.border}` }}>
								<button
									onClick={() => setOpen(open === i ? null : i)}
									style={{
										width: "100%",
										textAlign: "left",
										background: "none",
										border: "none",
										padding: "20px 0",
										fontSize: 15,
										fontWeight: 600,
										color: T.accent,
										cursor: "pointer",
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										gap: 16,
										fontFamily: "'Comic', sans-serif",
									}}
								>
									{f.q}
									<motion.span
										animate={{ rotate: open === i ? 45 : 0 }}
										transition={{ duration: 0.25 }}
										style={{
											fontSize: 20,
											color: T.muted,
											flexShrink: 0,
											lineHeight: 1,
										}}
									>
										+
									</motion.span>
								</button>
								<AnimatePresence>
									{open === i && (
										<motion.div
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: "auto", opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
											style={{ overflow: "hidden" }}
										>
											<p
												style={{
													fontSize: 14.5,
													color: T.muted,
													lineHeight: 1.7,
													paddingBottom: 20,
													fontFamily: "'Comic', sans-serif",
												}}
											>
												{f.a}
											</p>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						))}
					</div>
				</FadeUp>
			</div>
		</section>
	);
}

/* ── Root ── */
export default function inkgestLanding() {
	const { user } = useSelector((state) => state?.user);
	const router = useRouter();
	useEffect(() => {
		if (user) {
			router.replace("/app");
		}
	}, [user, router]);
	if (user) {
		return null;
	}
	return (
		<div style={{ fontFamily: "'Comic', sans-serif", background: T.base }}>
			<FontLink />
			<Nav />
			<Hero />
			<AIFeaturesSection />
			<Features />
			<ExportFormats />
			<HowItWorks />
			<StatsStrip />
			<UseCasesStrip />
			<Pricing />
			<OpenSource />
			<FAQ />
			<Footer />
		</div>
	);
}
