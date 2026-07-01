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
import { useQueryClient } from "@tanstack/react-query";
import LoginModal from "../lib/ui/LoginModal";
import GenerateAssetPanel from "../lib/ui/GenerateAssetPanel";
import { FREE_CREDIT_LIMIT, getUserCredits } from "../lib/utils/credits";
import { getTheme } from "../lib/utils/theme";
import { ArrowRightIcon, CreditCardIcon, SparkleIcon, XCircleIcon } from "lucide-react";
import Footer from "../app/components/Footer";
/* ── Google Fonts injected once ── */
const FontLink = () => (
	<style>{`
    @import url('https://fonts.googleapis.com/css2?family=Comic+Sans:wght@300;400;500;600;700&display=swap');
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

const LANDING_FORM_FORMATS = [
	{ id: "substack", label: "Newsletter", icon: "✉️" },
	{ id: "linkedin", label: "LinkedIn", icon: "💼" },
	{ id: "twitter_thread", label: "Thread", icon: "🐦" },
	{ id: "blog_post", label: "Blog Post", icon: "📝" },
	{ id: "email_digest", label: "Digest", icon: "📰" },
];

const LANDING_FORM_STYLES = [
	{ id: "casual", label: "Casual" },
	{ id: "professional", label: "Professional" },
	{ id: "educational", label: "Educational" },
	{ id: "persuasive", label: "Persuasive" },
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
		title: "AI Draft from Tasks",
		description:
			"Add an idea to your Kanban board and hit Generate — the agent scrapes sources and creates a full draft, linked back to the task automatically.",
		icon: "✨",
		tag: "New",
	},
	{
		title: "Writing Tasks Board",
		description:
			"Organize ideas in Backlog, In Progress, and Done. Group by project, set priorities, link drafts, and track your entire content pipeline.",
		icon: "📋",
		tag: "Tasks",
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
		title: "Global Translation",
		description:
			"Translate any draft to Spanish, French, German, and more. Each language is saved separately — switch versions without losing the original.",
		icon: "🌍",
		tag: "Translate",
	},
	{
		title: "Claude MCP Server",
		description:
			"Connect Claude Desktop to your Inkgest library. Search, read, create, and update drafts, manage tasks, and save translations — all from chat.",
		icon: "🔌",
		tag: "MCP",
	},
	{
		title: "One-Click Publish",
		description:
			"Publish drafts to a public Inkgest blog with a custom slug and theme. Share a live link instantly — no CMS setup required.",
		icon: "📤",
		tag: "Publish",
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
		<header
			className="fixed top-0 left-0 right-0 z-50"
			style={{ fontFamily: "'Comic', sans-serif" }}
		>
			<motion.nav
				aria-label="Primary"
				
				className=""
				initial={{ y: -60, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
				css={{ borderColor: T.border }}
			>
			<div
				style={{
				
					backdropFilter: "blur(18px)",
				}}
			>
				<div
					className="max-w-7xl mx-auto px-6 flex items-center justify-between min-h-[60px]"
				>
					{/* Logo */}
					<a
						href="/"
						className="flex items-center gap-2 no-underline min-h-12 min-w-12 px-2 -ml-2 rounded-xl justify-center sm:justify-start"
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
					<div className="hidden md:flex items-center gap-2 lg:gap-4">
						{["Features", "Export", "How it works", "Pricing", "FAQ"].map((l) => (
							<a
								key={l}
								href={
									l.toLowerCase().replace(/ /g, "-") === "blog"
										? "/blog"
										: `#${l.toLowerCase().replace(/ /g, "-")}`
								}
								className="no-underline text-sm font-medium transition-colors inline-flex items-center justify-center min-h-12 min-w-12 px-3 rounded-xl"
								style={{ color: T.muted, fontFamily: "'Comic', sans-serif" }}
								onMouseEnter={(e) => (e.target.style.color = T.accent)}
								onMouseLeave={(e) => (e.target.style.color = T.muted)}
							>
								{l}
							</a>
						))}
					</div>

					{/* CTAs */}
					<div className="flex items-center gap-2 sm:gap-3">
						<motion.a
							href="/login"
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.97 }}
							className="hidden md:inline-flex text-sm font-semibold no-underline min-h-12 px-5 rounded-xl border transition-all items-center justify-center"
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
							className="inline-flex text-sm font-semibold no-underline min-h-12 px-6 rounded-xl text-white items-center justify-center"
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
		</header>
	);
}

/* ── Hero with AI draft form ── */
function Hero() {
	const heroRef = useRef(null);
	const router = useRouter();
	const queryClient = useQueryClient();
	const reduxUser = useSelector((state) => state.user?.user ?? null);

	const { scrollYProgress } = useScroll({
		target: heroRef,
		offset: ["start start", "end start"],
	});
	const y = useTransform(scrollYProgress, [0, 1], [0, 80]);

	const [loginModalOpen, setLoginModalOpen] = useState(false);
	const [format, setFormat] = useState("substack");
	const [style, setStyle] = useState("casual");
	const [credits, setCredits] = useState(null);

	useEffect(() => {
		if (!reduxUser) {
			setCredits(null);
			return;
		}
		getUserCredits(reduxUser.uid)
			.then(setCredits)
			.catch((e) => console.error("[landing] credits load failed:", e));
	}, [reduxUser]);

	const creditRemaining = credits
		? credits.plan === "pro"
			? Infinity
			: Math.max(0, credits.remaining ?? FREE_CREDIT_LIMIT)
		: FREE_CREDIT_LIMIT;

	const texts = [
		{ icon: "🤖", text: "Agentic AI turns links into publish-ready drafts" },
		{ icon: "💬", text: "AI chatbot sidebar — rewrite without leaving the editor" },
		{ icon: "📤", text: "One-click publish to your Inkgest blog" },
		{ icon: "🌍", text: "Translate drafts to any language instantly" },
		{ icon: "🔌", text: "Connect Claude to your library via MCP" },
		{ icon: "📦", text: "Export as Markdown, HTML, or React" },
		{ icon: "🖼️", text: "AI infographics & tables from any source" },
		{ icon: "📋", text: "Kanban board to track your writing pipeline" },
	];

	function AnimatedText() {
		const doubled = [...texts, ...texts];

		return (
			<div style={{ overflow: "hidden", width: "100%", margin: "16px 0" }}>
				<motion.div
					animate={{ x: ["0%", "-50%"] }}
					transition={{ duration: 20, ease: "linear", repeat: Infinity }}
					style={{ display: "flex", gap: 24, width: "max-content" }}
					className="bg-zinc-50/20 py-10 w-full"
				>
					{doubled.map((item, i) => (
						<div
							key={i}
							className="text-sm py-1 px-2 bg-zinc-50"
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
			style={{ paddingTop: 140, paddingBottom: 80, background: "white" }}
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
				className="relative max-w-7xl mx-auto px-6 text-left"
			>
				<div className="flex flex-wrap items-center justify-center gap-2 mb-4">
				<a
					className="bg-zinc-50/50 hover:bg-zinc-50 text-xs border border-zinc-200 rounded-full flex gap-2 items-center py-1 px-2"
					href="https://www.producthunt.com/products/inkgest-link-to-gest"
					target="_blank"
					rel="noopener noreferrer"
				>
					<SparkleIcon className="w-3 h-3 shrink-0" aria-hidden />
					We are live on Product Hunt
				</a>
				<a
					className="bg-violet-50/80 hover:bg-violet-50 text-xs border border-violet-200 rounded-full flex gap-2 items-center py-1 px-2"
					href="/blog/inkgest-mcp-server-claude-desktop"
				>
					<span aria-hidden>🔌</span>
					New — Claude MCP server + tasks board + translation
				</a>
				</div>
		<motion.div className="max-w-7xl mx-auto my-10 w-full">
			{/* Headline — design-tool annotation style */}
			<motion.div
				initial={{ opacity: 0, y: 24 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
				style={{ textAlign: "center", marginBottom: 16, position: "relative" }}
			>
				<div className="flex items-center justify-center gap-2">
				<h1
					style={{
						fontSize: "clamp(34px,5.2vw,58px)",
						color: T.warm,
						lineHeight: 1.08,
						letterSpacing: "-2px",
						textAlign: "center",
					}}
				>
					Writing Editor for 
				</h1>

				{/* Tagline — decorative bounding-box treatment */}
				<div className="flex items-center justify-center relative">
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
							zIndex: 100,
							fontSize: 10.5,
							fontWeight: 600,
							color: T.muted,
							whiteSpace: "nowrap",
							fontFamily: "monospace",
							boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
						}}
					>
						<span className="w-2 h-2 mx-1 inline-block rounded-full bg-zinc-100 z-10" />
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
							zIndex: 100,
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
						<span style={{ width: 8, height: 8, borderRadius: "50%", background: T.warm, display: "inline-block", flexShrink: 0, zIndex: 100, }} />
						Translate + MCP
					</motion.div>
					<br />
					{/* The text with selection border */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.55, duration: 0.5 }}
						style={{
							position: "relative",
							zIndex: 10,
							display: "inline-block",
							border: `1.5px solid ${T.warm}`,
							padding: "4px 18px 4px 12px",
						}}
						className="bg-gradient-to-r from-zinc-50 to-zinc-50/20"
					>
						{/* Corner handles */}
						{[["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]].map(([v, h]) => (
							<div key={`${v}-${h}`} style={{ position: "absolute", [v]: -2, [h]: -2, width: 7, height: 7, borderRadius: 2, background: "white", border: `1.5px solid ${T.warm}` }} />
						))}
						
						<span style={{ fontStyle: "italic", fontSize: "24px", fontWeight: 400, color: T.warm, lineHeight: 1.05, letterSpacing: "-2px", zIndex: 10, }} className="text-zinc-500 text-4xl">
							content creators
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
						<span className="w-2 h-2 mx-1 inline-block rounded-full bg-green-100" />
						Tasks + Publish
					</motion.div>
				</div>
				</div>
				<br />
				<div className="flex justify-center items">
					<button className="bg-zinc-800 text-zinc-200 group flex items-center gap-2 px-4 py-2 hover:bg-black hover:text-white rounded-xl transition-all duration-100 ease-in" onClick={() => router.push("/login")}>
						<ArrowRightIcon className="w-4 h-4 group-hover:rotate-90 transition-all duration-100 ease-in" />
						Get Started
					</button>		
				</div>
				<br />
			</motion.div>

				{/* ── Agentic create form + demo editor ── */}
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
					style={{ marginTop: 8, marginBottom: 12 }}
					className="w-full max-w-7xl mx-auto"
				>
					<div
						className="flex flex-col xl:flex-row gap-10 xl:items-stretch"
						style={{ width: "100%", alignItems: "stretch" }}
					>
						{/* ── DEMO EDITOR UI ── */}
					<motion.div
							initial={{ opacity: 0, y: 28 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.58, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
							style={{
								border: `1px solid ${T.border}`,
								borderRadius: 16,
								overflow: "hidden",
								boxShadow: "0 24px 80px rgba(0,0,0,0.10)",
								background: T.surface,
								display: "flex",
								flexDirection: "column",
								flex: 1,
								minWidth: 0,
							}}
							className="max-w-5xl p-1 hover:shadow-lg mx-auto w-full ring-2 hover:ring-4 ring-zinc-50 transition-all duration-100 ease-in"
						>
							<img src="/inkgest-editor-page.png" alt="Inkgest editor page screenshot" className="w-full h-full object-cover" />
					</motion.div>
					</div>
				</motion.div>
				<motion.div
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
					className="flex flex-wrap items-center justify-center gap-2"
				>
					<span className="flex items-center gap-2">
						<SparkleIcon className="w-4 h-4" /> {FREE_CREDIT_LIMIT} free credits
					</span>
					<span aria-hidden>·</span>
					<span className="flex items-center gap-2">
						<CreditCardIcon className="w-4 h-4" /> No credit card
					</span>
					<span aria-hidden>·</span>
					<span className="flex items-center gap-2">
						<XCircleIcon className="w-4 h-4" /> Cancel anytime
					</span>
				</motion.div>
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
			className="bg-white"
		>
			<div className="max-w-7xl mx-auto p-4">
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
					Inkgest features
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
						From AI scraping to a tasks board, in-editor chat, global translation, one-click publish, and a Claude MCP server — the full stack for modern content creators.
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
		emoji: "⚡",
	},
	{
		title: "Writing tasks board — backlog to done, grouped by project, with AI draft generation",
		word: "Tasks Board",
		emoji: "📋",
	},
	{
		title: "AI chatbot sidebar — rewrite, expand, or change tone without leaving the editor",
		word: "AI Chat",
		emoji: "💬",
	},
	{
		title: "Generate a full draft from any task in one click — agent scrapes and links it back",
		word: "AI Draft",
		emoji: "✨",
	},
	{
		title: "Translate drafts to any language — saved per locale, switch without losing the original",
		word: "Translate",
		emoji: "🌍",
	},
	{
		title: "Connect Claude Desktop to your library via MCP — search, edit, and manage tasks from chat",
		word: "Claude MCP",
		emoji: "🔌",
	},
];

function Features() {
	return (
		<section
			id="product-showcase"
			className="bg-white py-10"
		>
			<div className="max-w-7xl mx-auto p-4">
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
						Scrape. Plan. Edit.
						<br />
						Translate. Publish.
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
						Every screen in Inkgest is designed to cut time from idea to published content — tasks board, AI drafts, translation, MCP, and one-click publish included.
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
									gridColumn: "span 2",
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
									className="bg-zinc-50 rounded-xl p-2 flex flex-col justify-center items-center h-32"
								>
									
									<div
										data-fallback
										className="text-zinc-400 text-4xl flex items-center justify-center"
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
						<span className="text-warm">Export anywhere.</span>
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
			title: "Scrape or generate",
			body: "Paste URLs or describe your angle — newsletter, blog, table, or infographic. The agentic AI reads sources and builds a structured first draft in under 60 seconds.",
			icon: "🔗",
		},
		{
			n: "02",
			title: "Track on your tasks board",
			body: "Capture ideas in Backlog, move them In Progress, and group by project. Hit Generate on any task to create an AI draft linked back to the card.",
			icon: "📋",
		},
		{
			n: "03",
			title: "Edit with AI chat",
			body: "Open the rich editor. Use the AI sidebar to rewrite sections, adjust tone, expand ideas, or add infographics — all inline, with autosave.",
			icon: "✍️",
		},
		{
			n: "04",
			title: "Translate & publish",
			body: "Save translations in any language alongside the original. Publish to your public Inkgest blog with a custom slug, or export Markdown, HTML, or React.",
			icon: "🌍",
		},
		{
			n: "05",
			title: "Connect Claude via MCP",
			body: "Link Claude Desktop to your library with an API key. Search drafts, update posts, manage tasks, and save translations — without leaving the chat.",
			icon: "🔌",
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
						Five steps.
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
						No prompt engineering. No tab switching. Scrape → plan on your board → edit → translate → publish — or manage it all from Claude via MCP.
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
		{ num: "60", suffix: "s", label: "Source to publish-ready draft" },
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
		{ icon: "📰", title: "Newsletter writers", body: "Go from 5 URLs to a structured issue in under 60 seconds. Track each edition on the tasks board and never miss a publish day." },
		{ icon: "✍️", title: "Blog content creators", body: "Research, draft, translate, and publish SEO-ready posts from multiple sources — one workspace, no tab juggling." },
		{ icon: "🔌", title: "Claude & AI power users", body: "Connect Inkgest to Claude Desktop via MCP. Search your library, create drafts, move tasks, and save translations from chat." },
		{ icon: "🏢", title: "Content teams", body: "Kanban board with projects, AI draft generation from tasks, and shared publish links — consistent quality at scale." },
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
		"Full editor + AI chat",
		"Writing tasks board",
		"Translation + publish",
		"Claude MCP integration",
		"Save up to 3 drafts",
		"Google login",
	];
	const starter = [
		"50 credits every month",
		"All content formats",
		"Tasks board + AI draft from task",
		"Translation + one-click publish",
		"Claude MCP server access",
		"Multiple URL sources per draft",
		"AI Chat with all models",
		"Priority support",
	];
	const pro = [
		"100 credits every month",
		"All content formats",
		"Tasks board + AI draft from task",
		"Translation + one-click publish",
		"Claude MCP server access",
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
								type="button"
								whileHover={{ scale: 1.02, background: "#f5f0e8" }}
								whileTap={{ scale: 0.97 }}
								onClick={() => router.push("/pricing")}
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									width: "100%",
									minHeight: 48,
									background: "white",
									color: T.accent,
									padding: "14px 16px",
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
			className="bg-white"
		>
			<div className="max-w-7xl mx-auto p-4">
				<FadeUp>
					<div
						className="flex flex-wrap gap-4 items-center"
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
										justifyContent: "center",
										gap: 9,
										minHeight: 48,
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
										justifyContent: "center",
										gap: 8,
										minHeight: 48,
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
			q: "What is the Inkgest MCP server?",
			a: "MCP (Model Context Protocol) lets Claude Desktop connect to your Inkgest account. Create an API key in Settings → Integrations, install the local MCP server, and Claude can search, read, create, and update your drafts, manage tasks, and save translations — all from chat.",
		},
		{
			q: "How does the writing tasks board work?",
			a: "The tasks board is a Kanban workspace with Backlog, In Progress, and Done columns. Group tasks by project, set priorities, link drafts, and hit Generate on any card to create an AI draft from the task description and URLs.",
		},
		{
			q: "Can I translate my drafts?",
			a: "Yes. Open any draft and save translations in multiple languages — Spanish, French, German, and more. Each language is stored separately so you can switch versions without overwriting the original.",
		},
		{
			q: "What URLs does it support?",
			a: "Most publicly accessible web pages — blog posts, news articles, research papers, Medium, Substack, LinkedIn articles. Paywalled content won't work. We use Firecrawl so JavaScript-rendered pages are handled correctly.",
		},
		{
			q: "What export formats are supported?",
			a: "Inkgest exports to three formats: clean Markdown (.md) for Ghost, Notion, or any CMS; semantic HTML for emails or landing pages; and a JSX React component ready to drop into your Next.js or React app. You can also publish directly to a public Inkgest blog.",
		},
		{
			q: "How does the AI chatbot work in the editor?",
			a: "Once your draft is open in the editor, a collapsible AI sidebar lets you chat with the document. Ask it to rewrite a section, adjust the tone, expand a paragraph, add bullet points, or summarize — it knows the full context of your draft.",
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
		<section id="faq" className="bg-white py-10">
			<div
				className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap p-4"
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
							className="inline-flex items-center min-h-12 py-2 rounded-xl underline underline-offset-4"
							style={{ color: T.accent }}
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
		<div style={{ fontFamily: "'Comic', sans-serif" }}>
			<FontLink />
			<Nav />
			<main id="main-content" className="bg-white">
				<Hero />
				<AIFeaturesSection />
				<Features />
				<Pricing />
				<OpenSource />
				<br />
				<br />
				<FAQ />
			</main>
			<Footer />
		</div>
	);
}
