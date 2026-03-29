import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LoginModal from "../../lib/ui/LoginModal";
import { db, auth } from "../../lib/config/firebase";
import {
	listAssets,
	createDraft,
	createTable,
	createInfographicsAsset,
	createLandingPageAsset,
	createImageGalleryAsset,
	deleteAsset,
} from "../../lib/api/userAssets";
import {
	getUserCredits,
	FREE_CREDIT_LIMIT,
	formatRenewalDate,
} from "../../lib/utils/credits";
import { validateUrl, validateUrls } from "../../lib/utils/urlAllowlist";
import { getTheme } from "../../lib/utils/theme";
import { inferFormatFromPrompt } from "../../lib/prompts/newsletter";
import {
	INKGEST_AGENT_URL,
	inkgestAgentRequestHeaders,
} from "../../lib/config/agent";
import { deductCredits } from "../../lib/api/deductCredits";
import { extractAgentTotalTokens } from "../../lib/utils/agentTokens";
import {
	getAgentTaskArticleBody,
	isArticleLikeAgentTask,
	displayTypeForArticleTask,
} from "../../lib/utils/agentArticleTask";

/* ─── Fonts ─── */
const FontLink = () => (
	<style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
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
	login:
		"M18 8a6 6 0 0 0-6 6 6 6 0 0 0 6 6 6 6 0 0 0 6-6 6 6 0 0 0-6-6zM3 18a9 9 0 1 1 18 0 9 9 0 0 1-18 0z",
	plus: "M12 5v14M5 12h14",
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
	settings:
		"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
	send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
	stop: "M6 6h12v12H6z",
};

/* ─── Prefill presets (URLs + prompt) ─── */
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

/* ─── InkAgent loader messages (rotate while loading) ─── */
const AGENT_LOADING_MSGS = [
	"InkAgent thinking…",
	"InkAgent analysing your request…",
	"InkAgent browsing & finding content…",
	"InkAgent creating newsletter…",
	"InkAgent building table…",
	"InkAgent preparing content…",
];

/* ─── InkAgent prompt suggestions — browser work: find, browse, summarize, create content ─── */
const AGENT_PROMPT_SUGGESTIONS = [
	"Find Hacker News latest news and create a summary of the top stories.",
	"Create a summary from the top news articles from India — give me options for blog, newsletter, or table format.",
	"Find https://news.ycombinator.com latest and turn the top 5 into a newsletter for developers.",
	"Browse https://www.producthunt.com and create a table comparing today's top launches — name, tagline, category.",
	"Find the top tech news from India and give me format options: blog post, newsletter, or comparison table.",
	"Get the latest from Hacker News — summarize and suggest: blog, newsletter, or table for sharing.",
	"Find https://techcrunch.com latest startup news and create a digest. Give options for blog, newsletter, or table.",
	"Browse https://www.producthunt.com and turn top launches into a LinkedIn post. Practical takeaways, under 300 words.",
	"Find top news from India and create a realistic table — headlines, source, key points.",
	"Get Hacker News front page, summarize top 5, and offer blog, newsletter, or table output.",
];

/* ─── Format / Style config (mirrors API) ─── */
const FORMATS = [
	{ id: "substack", label: "Newsletter", icon: "✉️" },
	{ id: "linkedin", label: "LinkedIn", icon: "💼" },
	{ id: "twitter_thread", label: "Thread", icon: "🐦" },
	{ id: "blog_post", label: "Blog Post", icon: "📝" },
	{ id: "email_digest", label: "Digest", icon: "📰" },
];

const STYLES = [
	{ id: "casual", label: "Casual" },
	{ id: "professional", label: "Professional" },
	{ id: "educational", label: "Educational" },
	{ id: "persuasive", label: "Persuasive" },
];

/* ─── Upgrade Banner ─── */
function UpgradeBanner({ credits, onUpgrade }) {
	if (!credits) return null;
	const { plan, creditsUsed, creditsLimit } = credits;
	if (plan === "pro") return null;
	const out = creditsUsed >= creditsLimit;
	// Only show when within 2 credits of the limit
	if (creditsUsed < creditsLimit - 2) return null;

	const heading = out
		? "You've used all your free credits this month"
		: "Almost out of free credits";
	const sub = out
		? `Upgrade to Pro for unlimited access — $9/mo`
		: `${(creditsLimit - creditsUsed).toFixed(2)} credits left. Upgrade to Pro before you run out.`;

	return (
		<motion.div
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			style={{
				background: out ? T.accent : "#FEF3E2",
				border: `1px solid ${out ? T.accent : "#F5C97A"}`,
				borderRadius: 10,
				padding: "12px 16px",
				marginBottom: 16,
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 12,
				}}
			>
				<div>
					<p
						style={{
							fontSize: 13,
							fontWeight: 700,
							color: out ? "white" : "#92400E",
							marginBottom: 2,
						}}
					>
						{heading}
					</p>
					<p
						style={{
							fontSize: 12,
							color: out ? "rgba(255,255,255,0.65)" : "#B45309",
						}}
					>
						{sub}
					</p>
				</div>
				<motion.button
					whileHover={{ scale: 1.04 }}
					whileTap={{ scale: 0.97 }}
					onClick={onUpgrade}
					style={{
						background: out ? T.warm : T.accent,
						color: "white",
						border: "none",
						padding: "8px 16px",
						borderRadius: 8,
						fontSize: 13,
						fontWeight: 700,
						cursor: "pointer",
						whiteSpace: "nowrap",
					}}
				>
					Upgrade $9/mo →
				</motion.button>
			</div>
		</motion.div>
	);
}

/* ─── Asset type labels ─── */
const SIDEBAR_ASSET_LABELS = {
	table: "Table",
	draft: "Draft",
	infographics: "Infographics",
	landing_page: "Landing Page",
	image_gallery: "Gallery",
};

/* ─── Item card in sidebar (drafts + tables + assets) ─── */
function SidebarItemCard({ item, active, onClick, onDelete }) {
	const [hovering, setHovering] = useState(false);
	const isAssetWithDesc = [
		"table",
		"infographics",
		"landing_page",
		"image_gallery",
	].includes(item.type);
	const tag = SIDEBAR_ASSET_LABELS[item.type] || item.tag || "Draft";
	const preview = isAssetWithDesc ? item.description || "" : item.preview || "";
	const meta = isAssetWithDesc ? "" : `${item.words ?? 0}w`;
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

/* ─── Main App ─── */
export default function inkgestApp() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const reduxUser = useSelector((state) => state.user?.user ?? null);
	const pendingGenerateRef = useRef(false);

	const [search, setSearch] = useState("");
	const [urls, setUrls] = useState([""]);
	const [newUrlInput, setNewUrlInput] = useState("");
	const [prompt, setPrompt] = useState("");
	const [format, setFormat] = useState("substack");
	const [style, setStyle] = useState("casual");
	const [generating, setGenerating] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [loginModalOpen, setLoginModalOpen] = useState(false);
	const [deleteConfirm, setDeleteConfirm] = useState(null);
	const [generateError, setGenerateError] = useState(null);
	const [loadingMsg, setLoadingMsg] = useState("Reading URL content…");
	const [draftMode, setDraftMode] = useState("agent"); // "ai" | "scrape" | "blank" | "agent"
	const [scrapeUrl, setScrapeUrl] = useState("");
	const [scraping, setScraping] = useState(false);
	const [blankTitle, setBlankTitle] = useState("");
	const [credits, setCredits] = useState(null); // { plan, creditsUsed, creditsLimit, remaining }

	// InkAgent state
	const [agentPrompt, setAgentPrompt] = useState("");
	const [agentRunSteps, setAgentRunSteps] = useState([]); // [{ label, status: 'loading'|'done'|'error' }]
	const [agentCompletedTasks, setAgentCompletedTasks] = useState([]);
	const [agentLoading, setAgentLoading] = useState(false);
	const [agentLoadingMsg, setAgentLoadingMsg] = useState("InkAgent thinking…");
	const [agentError, setAgentError] = useState(null);
	const [agentThinking, setAgentThinking] = useState(""); // Streaming "thinking" text from SSE
	const [agentRunPrompt, setAgentRunPrompt] = useState("");
	const [agentTotalTokens, setAgentTotalTokens] = useState(null);
	const agentOutputRef = useRef(null);
	const agentAbortRef = useRef(null);

	/* Derived helpers — single unified credit pool */
	const creditRemaining = credits
		? credits.plan === "pro"
			? Infinity
			: Math.max(0, credits.remaining ?? FREE_CREDIT_LIMIT)
		: FREE_CREDIT_LIMIT;
	// Legacy aliases kept so all existing checks below compile unchanged
	const llmRemaining = creditRemaining;
	const scrapeRemaining = creditRemaining;

	/* Cycle InkAgent loading messages — only when we have a single placeholder step */
	useEffect(() => {
		if (!agentLoading) return;
		setAgentLoadingMsg(AGENT_LOADING_MSGS[0]);
		let idx = 0;
		const iv = setInterval(() => {
			idx = (idx + 1) % AGENT_LOADING_MSGS.length;
			const msg = AGENT_LOADING_MSGS[idx];
			setAgentLoadingMsg(msg);
			setAgentRunSteps((prev) => {
				// Don't overwrite when we have multiple steps (from suggestedTasks)
				if (prev.length !== 1 || prev[0]?.status !== "loading") return prev;
				return [{ label: msg, status: "loading" }];
			});
		}, 2500);
		return () => clearInterval(iv);
	}, [agentLoading]);

	/* Scroll InkAgent output into view when thinking/steps appear */
	useEffect(() => {
		if ((agentThinking || agentRunSteps.length > 0) && agentOutputRef.current) {
			agentOutputRef.current.scrollIntoView({
				behavior: "smooth",
				block: "nearest",
			});
		}
	}, [agentThinking, agentRunSteps.length]);

	/* Load drafts, tables, and other assets via React Query (shared with draftId page) */
	const { data: items = [] } = useQuery({
		queryKey: ["assets", reduxUser?.uid],
		queryFn: () => listAssets(reduxUser.uid),
		enabled: !!reduxUser,
		staleTime: 2 * 60 * 1000,
	});

	const drafts = items.filter((i) => i.type === "draft");
	const tables = items.filter((i) => i.type === "table");
	const otherAssets = items.filter((i) =>
		["infographics", "landing_page", "image_gallery"].includes(i.type),
	);

	const sidebarItems = [...drafts, ...tables, ...otherAssets].sort((a, b) => {
		const aT = a.createdAt?.toMillis?.() ?? a.createdAt?.getTime?.() ?? 0;
		const bT = b.createdAt?.toMillis?.() ?? b.createdAt?.getTime?.() ?? 0;
		return bT - aT;
	});

	/* Load real credit state from Firestore */
	useEffect(() => {
		if (!reduxUser) {
			setCredits(null);
			return;
		}
		getUserCredits(reduxUser.uid)
			.then(setCredits)
			.catch((e) => console.error("Failed to load credits", e));
	}, [reduxUser]);

	/* Confirm when leaving during API load (back, close, navigate) */
	const isLoading = generating || scraping;
	useEffect(() => {
		if (!isLoading) return;
		const onBeforeUnload = (e) => {
			e.preventDefault();
			e.returnValue = "";
		};
		const onRouteChange = () => {
			if (!window.confirm("Generation in progress. Leave anyway?")) {
				router.events.emit("routeChangeError");
				throw "Route change aborted.";
			}
		};
		window.addEventListener("beforeunload", onBeforeUnload);
		router.events.on("routeChangeStart", onRouteChange);
		return () => {
			window.removeEventListener("beforeunload", onBeforeUnload);
			router.events.off("routeChangeStart", onRouteChange);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoading]);

	const filtered = sidebarItems.filter((item) => {
		const q = search.toLowerCase().trim();
		if (!q) return true;
		const title = (item.title || "").toLowerCase();
		const preview = (item.preview || item.description || "").toLowerCase();
		const type = (item.type || "").toLowerCase();
		const tag = (
			SIDEBAR_ASSET_LABELS[item.type] ||
			item.tag ||
			"Draft"
		).toLowerCase();
		const format = (item.format || "").toLowerCase();
		return (
			title.includes(q) ||
			preview.includes(q) ||
			type.includes(q) ||
			tag.includes(q) ||
			format.includes(q)
		);
	});

	const applyPreset = (p) => {
		setUrls(p.urls.length ? p.urls : [""]);
		setPrompt(p.prompt);
	};

	const handleDelete = (id) => {
		setDeleteConfirm(id);
	};

	const confirmDelete = async () => {
		if (!deleteConfirm || !reduxUser) return;
		const item = sidebarItems.find((i) => i.id === deleteConfirm);
		const isAssetType = [
			"table",
			"infographics",
			"landing_page",
			"image_gallery",
		].includes(item?.type);
		const source = item?.source || (isAssetType ? "assets" : "drafts");
		try {
			await deleteAsset(reduxUser.uid, deleteConfirm, source);
			queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
			queryClient.invalidateQueries({ queryKey: ["doc"] });
		} catch (e) {
			console.error("Delete failed", e);
		}
		setDeleteConfirm(null);
	};

	const removeUrl = (idx) => {
		setUrls((prev) => prev.filter((_, i) => i !== idx));
	};

	/* Scrape a URL and open raw content in the editor */
	const handleScrape = async () => {
		if (!scrapeUrl.trim() || scraping) return;
		if (!reduxUser) {
			setLoginModalOpen(true);
			return;
		}
		if (scrapeRemaining <= 0) {
			router.push("/pricing");
			return;
		}
		const urlCheck = validateUrl(scrapeUrl.trim());
		if (!urlCheck.valid) {
			setGenerateError(
				urlCheck.error || "Invalid URL. Use full URLs with https://",
			);
			return;
		}
		setScraping(true);
		setGenerateError(null);
		const scrapeMsgs = [
			"Reading URL content…",
			"Extracting text…",
			"Preparing draft…",
		];
		let sIdx = 0;
		const scrapeIv = setInterval(() => {
			sIdx = (sIdx + 1) % scrapeMsgs.length;
			setLoadingMsg(scrapeMsgs[sIdx]);
		}, 2500);
		setLoadingMsg(scrapeMsgs[0]);
		try {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) {
				clearInterval(scrapeIv);
				setGenerateError("Session expired. Please sign in again.");
				setScraping(false);
				return;
			}
			const res = await fetch("/api/scrape/url", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url: scrapeUrl.trim(), idToken }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Scrape failed");

			const title = data.title || scrapeUrl.trim();
			const words = (data.content || "").trim().split(/\s+/).length;
			const now = new Date();
			const date = now.toLocaleDateString("en-US", {
				weekday: "short",
				month: "short",
				day: "numeric",
			});
			const preview = (data.content || "").slice(0, 180);

			const draft = {
				title,
				preview,
				body: data.content || "",
				urls: [scrapeUrl.trim()],
				images: data.images || [],
				words,
				date,
				tag: "Scraped",
			};
			const { id } = await createDraft(reduxUser.uid, draft);
			queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
			setScrapeUrl("");
			// Refresh credits counter
			if (reduxUser)
				getUserCredits(reduxUser.uid)
					.then(setCredits)
					.catch(() => {});
			router.push(`/app/${id}`);
		} catch (e) {
			setGenerateError(e?.message || "Scrape failed");
		} finally {
			clearInterval(scrapeIv);
			setScraping(false);
		}
	};

	/* Get step label from executed task */
	const TRUNCATE_WORDS = 12;
	const formatTaskOutputDisplay = (step) => {
		const output = step.output;
		const task = step.fullTask || {};
		let urls = task.urls || task.sourceUrls || task.params?.urls || [];
		const content = typeof output === "string" ? output : "";
		// Parse "--- Source N: URL ---" from combined scrape content
		if (urls.length === 0 && content.includes("--- Source")) {
			urls = [...content.matchAll(/--- Source \d+: (https?:\/\/[^\s]+) ---/g)].map((m) => m[1]);
		}
		const isScrape = task.type === "scrape" || urls.length > 0 || content.length > 500;
		const truncate = (str, words = TRUNCATE_WORDS) => {
			const w = (str || "").trim().split(/\s+/).slice(0, words).join(" ");
			return w + (str && str.trim().split(/\s+/).length > words ? "…" : "");
		};
		if (isScrape && (content || urls.length > 0)) {
			if (urls.length > 1) {
				return (
					<>
						{urls.map((url) => (
							<div key={url} style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
								<span style={{ color: "#16A34A", flexShrink: 0 }}>✓</span>
								<span style={{ fontSize: 11, color: T.muted, wordBreak: "break-all" }}>{url}</span>
							</div>
						))}
						{content && <div style={{ marginTop: 6, marginLeft: 18, color: T.accent }}>{truncate(content)}</div>}
					</>
				);
			}
			if (urls.length === 1) {
				return (
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
							<span style={{ color: "#16A34A" }}>✓</span>
							<span style={{ fontSize: 11, color: T.muted, wordBreak: "break-all" }}>{urls[0]}</span>
						</div>
						{content && <span style={{ marginLeft: 18, color: T.accent }}>{truncate(content)}</span>}
					</div>
				);
			}
			return <><span style={{ color: "#16A34A" }}>✓</span> {truncate(content)}</>;
		}
		if (content.length > 200) return <><span style={{ color: "#16A34A" }}>✓</span> {truncate(content)}</>;
		return typeof output === "string" ? output : JSON.stringify(output).slice(0, 300) + (JSON.stringify(output).length > 300 ? "…" : "");
	};

	const getAgentStepLabel = (task) => {
		if (task.type === "scrape") {
			const url = task.urls?.[0] || task.sourceUrls?.[0];
			const host = url
				? (() => {
						try {
							return new URL(url).hostname;
						} catch {
							return url.slice(0, 30);
						}
					})()
				: "";
			return host ? `Browsing ${host}…` : task.label || "Browsing…";
		}
		if (task.type === "newsletter")
			return task.label || "Writing newsletter draft…";
		if (task.type === "linkedin") return task.label || "Writing LinkedIn post…";
		if (task.type === "blog_post") return task.label || "Writing blog post…";
		if (task.type === "twitter_thread") return task.label || "Creating thread…";
		if (task.type === "email_digest") return task.label || "Creating digest…";
		if (task.type === "table") return task.label || "Creating table…";
		if (
			task.type === "infographics" ||
			task.type === "infographics-svg-generator"
		)
			return task.label || "Creating infographics…";
		if (
			task.type === "landing_page" ||
			task.type === "landing-page" ||
			task.type === "landing-page-generator"
		)
			return task.label || "Creating landing page…";
		if (
			task.type === "image_gallery" ||
			task.type === "image-gallery" ||
			task.type === "image-gallery-generator" ||
			task.type === "image-gallery-creator"
		)
			return task.label || "Creating image gallery…";
		return task.label || "Processing…";
	};

	/* InkAgent: stream SSE from API, show real-time task progress */
	const handleAgentSend = async () => {
		const promptText = agentPrompt.trim();
		if (!promptText || agentLoading) return;
		if (!reduxUser) {
			setLoginModalOpen(true);
			return;
		}
		if (creditRemaining <= 0) {
			router.push("/pricing");
			return;
		}
		setAgentLoading(true);
		setAgentError(null);
		setAgentCompletedTasks([]);
		setAgentThinking("");
		setAgentRunSteps([{ label: agentLoadingMsg, status: "loading" }]);
		setAgentRunPrompt(promptText);
		setAgentTotalTokens(null);
		const abortController = new AbortController();
		agentAbortRef.current = abortController;
		try {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Session expired. Please sign in again.");
			const res = await fetch(INKGEST_AGENT_URL, {
				method: "POST",
				headers: inkgestAgentRequestHeaders(reduxUser?.uid),
				body: JSON.stringify({ prompt: promptText, idToken }),
				signal: abortController.signal,
			});
			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.error || "Agent failed");
			}
			const contentType = res.headers.get("content-type") || "";
			if (!contentType.includes("text/event-stream")) {
				const data = await res.json();
				if (data.executed?.length > 0) {
					setAgentRunSteps(
						data.executed.map((t) => ({
							label: getAgentStepLabel(t),
							status: "done",
						})),
					);
					await processAgentExecuted(data.executed, promptText);
					const creditsUsed =
						typeof data.creditsUsed === "number" && data.creditsUsed > 0
							? data.creditsUsed
							: 1;
					deductCredits(idToken, creditsUsed);
				} else {
					setAgentRunSteps([
						{ label: data.message || "Done.", status: "done" },
					]);
				}
				const tok = extractAgentTotalTokens(data);
				if (tok != null) setAgentTotalTokens(tok);
				if (reduxUser)
					getUserCredits(reduxUser.uid)
						.then(setCredits)
						.catch(() => {});
				return;
			}
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const parts = buffer.split("\n\n");
				buffer = parts.pop() || "";
				for (const part of parts) {
					const line = part.trim();
					if (!line.startsWith("data: ")) continue;
					const jsonStr = line.slice(6);
					if (!jsonStr) continue;
					let data;
					try {
						data = JSON.parse(jsonStr);
					} catch {
						continue;
					}
					if (data.type === "thinking") {
						const text =
							data.thinking ??
							data.reasoning ??
							data.content ??
							data.text ??
							data.output ??
							"";
						if (text)
							setAgentThinking((prev) =>
								prev
									? prev + "\n\n" + String(text).trim()
									: String(text).trim(),
							);
					} else if (data.type === "start") {
						const thinkingText =
							data.thinking ??
							data.reasoning ??
							data.thought ??
							data.agent_thought ??
							data.content ??
							data.message ??
							data.text ??
							data.output ??
							"";
						setAgentThinking(
							thinkingText
								? String(thinkingText).trim()
								: (data.message || "Processing your request…").trim(),
						);
						const tasks = data.suggestedTasks || [];
						setAgentRunSteps(
							tasks.length > 0
								? tasks.map((t) => ({
										label: t.label || t.taskLabel || "Task",
										status: "loading",
									}))
								: [
										{
											label: data.message || "Running tasks…",
											status: "loading",
										},
									],
						);
					} else if (data.type === "task") {
						const idx = data.index ?? 0;
						const label = data.taskLabel || data.label || `Task ${idx + 1}`;
						const status = data.success ? "done" : "error";
						const output =
							data.content ??
							data.output ??
							(typeof data.result === "string"
								? data.result
								: data.error ??
									(data.result && typeof data.result === "object"
										? data.result.content ??
											(data.result.columns && data.result.rows
												? `Table: ${data.result.rows.length} rows`
												: data.result.infographics
													? `${data.result.infographics.length} infographics`
													: null)
										: data.columns && data.rows
											? `Table: ${data.rows.length} rows`
											: Array.isArray(data.infographics)
												? `${data.infographics.length} infographics`
												: null));
						setAgentRunSteps((prev) => {
							const next = [...prev];
							while (next.length <= idx)
								next.push({
									label: `Task ${next.length + 1}`,
									status: "loading",
								});
							next[idx] = { label, status, output, fullTask: data };
							return next;
						});
					} else if (data.type === "end") {
						setAgentThinking("");
						const executed = data.executed || [];
						if (executed.length > 0) {
							await processAgentExecuted(executed, promptText);
							// Merge executed task outputs into steps (in case backend only sends end)
							setAgentRunSteps((prev) => {
								const next = [...prev];
								executed.forEach((t, i) => {
									const output =
										t.content ??
										t.output ??
										(typeof t.result === "string"
											? t.result
											: t.error ??
												(t.result && typeof t.result === "object"
													? t.result.content ??
														(t.result.columns && t.result.rows
															? `Table: ${t.result.rows.length} rows`
															: t.result.infographics
																? `${t.result.infographics.length} infographics`
																: null)
													: t.columns && t.rows
														? `Table: ${t.rows.length} rows`
														: Array.isArray(t.infographics)
															? `${t.infographics.length} infographics`
															: null)
												);
									if (next[i]) {
										next[i] = {
											...next[i],
											output: next[i].output ?? output,
											status: next[i].status === "loading" ? "done" : next[i].status,
										};
									} else {
										next.push({
											label: t.label || t.taskLabel || `Task ${i + 1}`,
											status: "done",
											output,
											fullTask: t,
										});
									}
								});
								return next.map((s) => ({
									...s,
									status: s.status === "loading" ? "done" : s.status,
								}));
							});
						} else {
							setAgentRunSteps((prev) =>
								prev.map((s) => ({
									...s,
									status: s.status === "loading" ? "done" : s.status,
								})),
							);
						}
						const creditsUsed =
							typeof data.creditsUsed === "number" && data.creditsUsed > 0
								? data.creditsUsed
								: executed.length > 0
									? 1
									: 0;
						if (creditsUsed > 0 && idToken) deductCredits(idToken, creditsUsed);
						const tok = extractAgentTotalTokens(data);
						if (tok != null) setAgentTotalTokens(tok);
						if (reduxUser)
							getUserCredits(reduxUser.uid)
								.then(setCredits)
								.catch(() => {});
					}
				}
			}
			if (buffer.trim()) {
				const line = buffer.trim();
				if (line.startsWith("data: ")) {
					try {
						const data = JSON.parse(line.slice(6));
						if (data.type === "end") {
							if ((data.executed || []).length > 0)
								await processAgentExecuted(data.executed, promptText);
							const creditsUsed =
								typeof data.creditsUsed === "number" && data.creditsUsed > 0
									? data.creditsUsed
									: (data.executed || []).length > 0
										? 1
										: 0;
							if (creditsUsed > 0 && idToken) deductCredits(idToken, creditsUsed);
							const tok = extractAgentTotalTokens(data);
							if (tok != null) setAgentTotalTokens(tok);
						}
						if (reduxUser)
							getUserCredits(reduxUser.uid)
								.then(setCredits)
								.catch(() => {});
					} catch {
						// ignore
					}
				}
			}
		} catch (e) {
			const isAborted =
				e?.name === "AbortError" ||
				e?.code === "ABORT_ERR" ||
				e?.reason === "user_cancelled" ||
				/abort/i.test(e?.message || "");
			if (isAborted) {
				setAgentError(null);
				setAgentRunSteps([]);
				setAgentTotalTokens(null);
				return;
			}
			const errMsg = e?.message || "Agent failed";
			setAgentError(errMsg);
			setAgentRunSteps([{ label: errMsg, status: "error" }]);
		} finally {
			agentAbortRef.current = null;
			setAgentLoading(false);
		}
	};

	const handleAgentCancel = () => {
		agentAbortRef.current?.abort("user_cancelled");
	};

	const processAgentExecuted = async (executed, userPrompt = "") => {
		const newTasks = [];
		const inferred = inferFormatFromPrompt(userPrompt);
		for (const task of executed) {
			const articleBody = getAgentTaskArticleBody(task);
			const isContentDraft =
				isArticleLikeAgentTask(task.type) && articleBody.length > 0;
			if (isContentDraft) {
				const lines = articleBody.split("\n");
				const titleLine = lines.find(
					(l) => l.startsWith("# ") || l.startsWith("## "),
				);
				const title = titleLine
					? titleLine.replace(/^#+\s*/, "").trim()
					: task.label || "Draft";
				const bodyText = lines
					.filter((l) => !l.match(/^#{1,6}\s/))
					.join(" ")
					.replace(/[*_`]/g, "")
					.replace(/\s+/g, " ")
					.trim();
				const tag = task.formatLabel || inferred.label;
				const format = task.params?.format || inferred.format;
				const draft = {
					title,
					preview: bodyText.slice(0, 180) + (bodyText.length > 180 ? "…" : ""),
					body: articleBody,
					urls: task.params?.urls || task.urls || task.sourceUrls || [],
					prompt: userPrompt || "",
					words: articleBody.trim().split(/\s+/).filter(Boolean).length,
					date: new Date().toLocaleDateString("en-US", {
						weekday: "short",
						month: "short",
						day: "numeric",
					}),
					tag,
					format,
				};
				const { id } = await createDraft(reduxUser.uid, draft);
				queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
				newTasks.push({
					type: displayTypeForArticleTask(task.type),
					label: task.label || task.taskLabel,
					id,
					path: `/app/${id}`,
				});
			} else if (task.type === "scrape" && task.content) {
				const draft = {
					title: task.title || "Scraped",
					preview: (task.content || "").slice(0, 180),
					body: task.content || "",
					urls: task.urls || [],
					prompt: userPrompt || "",
					images: task.images || [],
					words: (task.content || "").trim().split(/\s+/).length,
					date: new Date().toLocaleDateString("en-US", {
						weekday: "short",
						month: "short",
						day: "numeric",
					}),
					tag: "Scraped",
				};
				const { id } = await createDraft(reduxUser.uid, draft);
				queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
				newTasks.push({
					type: "scrape",
					label: task.label,
					id,
					path: `/app/${id}`,
				});
			} else if (
				(task.type === "table" ||
					task.type === "table-creator" ||
					task.type === "table-generator") &&
				(task.columns || task.result?.columns)
			) {
				const columns = task.columns ?? task.result?.columns ?? [];
				const rows = task.rows ?? task.result?.rows ?? [];
				const sourceUrls =
					task.sourceUrls ?? task.result?.sourceUrls ?? [];
				if (Array.isArray(columns) && columns.length > 0) {
					const { id } = await createTable(reduxUser.uid, {
						title: task.title ?? task.result?.title ?? "Generated Table",
						description:
							task.description ?? task.result?.description ?? "",
						columns,
						rows,
						sourceUrls,
						prompt: userPrompt || "",
					});
				queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
					newTasks.push({
						type: "table",
						label: task.label,
						id,
						path: `/app/${id}`,
					});
				}
			} else if (
				task.type === "infographics" ||
				task.type === "infographics-svg-generator"
			) {
				let infographics = task.infographics ?? task.result?.infographics ?? [];
				if (!Array.isArray(infographics) && typeof task.content === "string") {
					try {
						infographics = JSON.parse(task.content);
					} catch {
						infographics = [];
					}
				}
				if (!Array.isArray(infographics) || infographics.length === 0) continue;
				const { id } = await createInfographicsAsset(reduxUser.uid, {
					title: task.title || "Infographics",
					description: task.description || "",
					prompt: userPrompt || "",
					infographics,
				});
				queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
				newTasks.push({
					type: "infographics",
					label: task.label || "Infographics",
					id,
					path: `/app/${id}`,
				});
			} else if (
				(task.type === "landing_page" ||
					task.type === "landing-page" ||
					task.type === "landing-page-generator") &&
				(task.html ||
					task.result?.html ||
					task.result?.result?.html ||
					task.url ||
					task.result?.url ||
					(typeof task.content === "string" &&
						task.content.trim().startsWith("<")))
			) {
				const html =
					task.html ??
					task.result?.html ??
					task.result?.result?.html ??
					(typeof task.content === "string" &&
					task.content.trim().startsWith("<")
						? task.content
						: "") ??
					"";
				const url =
					task.url ?? task.result?.url ?? task.result?.result?.url ?? "";
				if (!html && !url) continue;
				const { id } = await createLandingPageAsset(reduxUser.uid, {
					title: task.title || "Landing Page",
					description: task.description || "",
					html,
					url,
				});
				queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
				newTasks.push({
					type: "landing_page",
					label: task.label || "Landing Page",
					id,
					path: `/app/${id}`,
				});
			} else if (
				task.type === "image_gallery" ||
				task.type === "image-gallery" ||
				task.type === "image-gallery-generator" ||
				task.type === "image-gallery-creator"
			) {
				let images =
					task.images ??
					task.result?.images ??
					task.result?.data ??
					task.result?.result?.images ??
					[];
				if (!Array.isArray(images) && typeof task.content === "string") {
					try {
						const parsed = JSON.parse(task.content);
						images = Array.isArray(parsed) ? parsed : (parsed?.images ?? []);
					} catch {
						images = [];
					}
				}
				if (
					!Array.isArray(images) &&
					typeof task.result?.content === "string"
				) {
					try {
						const parsed = JSON.parse(task.result.content);
						images = Array.isArray(parsed) ? parsed : (parsed?.images ?? []);
					} catch {
						// keep existing images
					}
				}
				// Normalize: allow { url }, { src }, or plain string URLs
				images = Array.isArray(images)
					? images
							.map((img) => (typeof img === "string" ? { url: img } : img))
							.filter((img) => img?.url || img?.src)
					: [];
				if (images.length === 0) continue;
				const { id } = await createImageGalleryAsset(reduxUser.uid, {
					title: task.title || "Image Gallery",
					description: task.description || "",
					images,
				});
				queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
				newTasks.push({
					type: "image_gallery",
					label: task.label || "Gallery",
					id,
					path: `/app/${id}`,
				});
			}
		}
		setAgentCompletedTasks((prev) => [...newTasks, ...prev]);
		if (newTasks.length > 0 && reduxUser?.uid) {
			queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
			queryClient.invalidateQueries({ queryKey: ["doc"] });
		}
	};

	/* Create a blank draft and open it */
	const handleBlank = async () => {
		if (!reduxUser) {
			setLoginModalOpen(true);
			return;
		}
		const title = blankTitle.trim() || "Untitled draft";
		const now = new Date();
		const date = now.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		});
		const draft = {
			title,
			preview: "",
			body: "",
			urls: [],
			words: 0,
			date,
			tag: "Draft",
		};
		const { id } = await createDraft(reduxUser.uid, draft);
		queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
		setBlankTitle("");
		router.push(`/app/${id}`);
	};

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
					height: 56,
					background: T.surface,
					borderBottom: `1px solid ${T.border}`,
					display: "flex",
					alignItems: "center",
					padding: "0 20px",
					gap: 12,
					flexShrink: 0,
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

				{/* Credits pill */}
				{reduxUser && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							marginLeft: 4,
							background: T.base,
							border: `1px solid ${creditRemaining === 0 ? "#F5C97A" : T.border}`,
							borderRadius: 100,
							padding: "4px 14px",
						}}
					>
						{credits?.plan === "pro" ? (
							<span style={{ fontSize: 12, color: T.warm, fontWeight: 700 }}>
								∞ Pro
							</span>
						) : (
							<>
								<span style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>
									Credits{" "}
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
								{credits?.renewsAt && (
									<span
										style={{
											fontSize: 11,
											color: T.muted,
											fontWeight: 500,
											whiteSpace: "nowrap",
										}}
									>
										Renew at {formatRenewalDate(credits.renewsAt)}
									</span>
								)}
							</>
						)}
						<motion.button
							whileHover={{ scale: 1.04 }}
							whileTap={{ scale: 0.97 }}
							onClick={() => router.push("/pricing")}
							style={{
								background: T.accent,
								color: "white",
								border: "none",
								padding: "3px 10px",
								borderRadius: 100,
								fontSize: 11,
								fontWeight: 700,
								cursor: "pointer",
							}}
						>
							{credits?.plan === "pro" ? "Manage" : "Upgrade"}
						</motion.button>
					</div>
				)}
				{!reduxUser && (
					<div
						className="sm:hidden md:flex"
						style={{
							alignItems: "center",
							gap: 8,
							marginLeft: 4,
							background: T.base,
							border: `1px solid ${T.border}`,
							borderRadius: 100,
							padding: "4px 12px",
						}}
					>
						<span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>
							{FREE_CREDIT_LIMIT} Credits
						</span>
					</div>
				)}

				<div style={{ flex: 1 }} />

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
						padding: "7px 16px",
						borderRadius: 9,
						fontSize: 13,
						fontWeight: 600,
						cursor: "pointer",
					}}
				>
					<Icon d={Icons.plus} size={14} stroke="white" />{" "}
					<span className="md:block hidden">New draft</span>
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
							<Icon d={Icons.login} size={16} stroke={T.muted} />
						</div>
					)}
				</motion.button>
				<LoginModal
					isOpen={loginModalOpen}
					onClose={() => setLoginModalOpen(false)}
				/>
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
							className="fixed top-12 left-0 bottom-0"
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
												No drafts or tables found
											</p>
											<p style={{ fontSize: 12, color: T.muted }}>
												Use InkAgent above to create your first draft
											</p>
										</motion.div>
									) : (
										filtered.map((item) => (
											<SidebarItemCard
												key={item.id}
												item={item}
												active={false}
												onClick={() => router.push(`/app/${item.id}`)}
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

				{/* ── RIGHT PANEL — Generator only ── */}
				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
					}}
				>
					<motion.div
						key="generator"
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
						style={{
							flex: 1,
							overflowY: "auto",
							padding: "32px 40px",
							maxWidth: 720,
							width: "100%",
							margin: "0 auto",
						}}
					>
						{/* ── Page heading ── */}
						<div style={{ marginBottom: 24 }}>
							<h1
								style={{
									fontFamily: "",
									fontSize: 32,
									color: T.accent,
									letterSpacing: "-0.5px",
								}}
							>
								New draft
							</h1>
						</div>

						{/* Not logged in info banner */}
						{!reduxUser && (
							<motion.div
								initial={{ opacity: 0, y: -8 }}
								animate={{ opacity: 1, y: 0 }}
								style={{
									background: "#FEF3E2",
									border: "1px solid #F5C97A",
									borderRadius: 10,
									padding: "12px 16px",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: 12,
								}}
							>
								<div>
									<p
										style={{
											fontSize: 13,
											fontWeight: 700,
											color: "#92400E",
											marginBottom: 2,
										}}
									>
										{FREE_CREDIT_LIMIT} free credits/month · AI, scrape & chat
									</p>
									<p style={{ fontSize: 12, color: "#B45309" }}>
										Sign in to start — no card required
									</p>
								</div>
								<motion.button
									whileHover={{ scale: 1.04 }}
									whileTap={{ scale: 0.97 }}
									onClick={() => setLoginModalOpen(true)}
									style={{
										background: T.accent,
										color: "white",
										border: "none",
										padding: "8px 16px",
										borderRadius: 8,
										fontSize: 13,
										fontWeight: 700,
										cursor: "pointer",
										whiteSpace: "nowrap",
									}}
								>
									Sign in →
								</motion.button>
							</motion.div>
						)}
						<UpgradeBanner
							credits={credits}
							onUpgrade={() => router.push("/pricing")}
						/>

						{/* ── INKAGENT MODE ── */}
						{draftMode === "agent" && (
							<motion.div
								key="agent-form"
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								style={{
									display: "flex",
									flexDirection: "column",
									gap: 24,
									marginBottom: 24,
									width: "100%",
								}}
							>
								{/* Input section — URL chips + textarea attached */}
								<div className="flex flex-col gap-0 border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50">
									{/* URL chips parsed from prompt — above textarea */}
									{(() => {
										const fullUrlRegex = /https?:\/\/[^\s]+/g;
										const bareDomainRegex =
											/\b(?:[\w-]+\.)+(?:com|dev|org|io|net|co|app|blog|to|me|info|edu|gov)\b/gi;
										const fullUrls = (agentPrompt.match(fullUrlRegex) || [])
											.map((u) => u.replace(/[.,;:!?)\]]+$/, "").trim())
											.filter(Boolean);
										const bareDomains = (
											agentPrompt.match(bareDomainRegex) || []
										)
											.map((u) => u.replace(/[.,;:!?)\]]+$/, "").trim())
											.filter(Boolean);
										const unique = [
											...new Set([
												...fullUrls,
												...bareDomains.filter(
													(b) =>
														!fullUrls.some(
															(f) =>
																f.includes(b) || f.includes(`https://${b}`),
														),
												),
											]),
										].filter(Boolean);
										if (unique.length === 0) return null;
										return (
											<div
												style={{
													display: "flex",
													flexWrap: "wrap",
													gap: 8,
													padding: "12px 16px",
													borderBottom: `1px solid ${T.border}`,
													background: T.base,
												}}
											>
												{unique.map((url, i) => (
													<motion.div
														key={`${url}-${i}`}
														initial={{ opacity: 0, scale: 0.9 }}
														animate={{ opacity: 1, scale: 1 }}
														style={{
															display: "flex",
															alignItems: "center",
															gap: 6,
															padding: "6px 10px",
															background: T.surface,
															border: `1px solid ${T.border}`,
															borderRadius: 8,
															fontSize: 12,
															color: T.accent,
															maxWidth: 220,
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap",
														}}
													>
														<span
															style={{
																flex: 1,
																overflow: "hidden",
																textOverflow: "ellipsis",
															}}
														>
															{url}
														</span>
														<motion.button
															whileHover={{ scale: 1.1 }}
															whileTap={{ scale: 0.9 }}
															onClick={() => {
																setAgentPrompt((p) =>
																	p
																		.replace(
																			new RegExp(
																				url.replace(
																					/[.*+?^${}()|[\]\\]/g,
																					"\\$&",
																				),
																				"g",
																			),
																			"",
																		)
																		.replace(/\s+/g, " ")
																		.trim(),
																);
															}}
															style={{
																background: "none",
																border: "none",
																cursor: "pointer",
																padding: 0,
																display: "flex",
																color: T.muted,
																flexShrink: 0,
															}}
														>
															<svg
																width={12}
																height={12}
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth={2}
															>
																<path d="M18 6L6 18M6 6l12 12" />
															</svg>
														</motion.button>
													</motion.div>
												))}
											</div>
										);
									})()}
									<textarea
										value={agentPrompt}
										onChange={(e) => setAgentPrompt(e.target.value)}
										onKeyDown={(e) =>
											e.key === "Enter" &&
											!e.shiftKey &&
											(e.preventDefault(), handleAgentSend())
										}
										placeholder="e.g. Scrape https://example.com and turn it into a newsletter for founders. Or: Create a table from this product comparison page https://..."
										rows={4}
										disabled={!reduxUser || agentLoading}
										className="w-full bg-zinc-50 border border-zinc-200 rounded-xl bg-transparent px-2 py-1 text-sm text-zinc-700 resize-vertical outline-none leading-relaxed"
									/>
									<div className="flex gap-2 items-center justify-between px-2 py-1 bg-amber-50/20">
										<div className="text-xs text-zinc-700">
											Create tables, newsletter, infographics and models
										</div>
										<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
											{/* Circular credits progress */}
											{(() => {
												const limit =
													credits?.creditsLimit ?? FREE_CREDIT_LIMIT;
												const remaining =
													credits?.plan === "pro"
														? limit
														: Math.max(0, credits?.remaining ?? limit);
												const pct = limit > 0 ? remaining / limit : 0;
												const r = 14;
												const circ = 2 * Math.PI * r;
												const dash = pct * circ;
												const strokeCol =
													pct > 0.3
														? T.warm
														: pct > 0.1
															? "#D97706"
															: "#DC2626";
												return (
													<div
														style={{
															display: "flex",
															alignItems: "center",
															gap: 4,
														}}
													>
														<svg
															width={24}
															height={24}
															viewBox="0 0 36 36"
															style={{ transform: "rotate(-90deg)" }}
														>
															<circle
																cx={18}
																cy={18}
																r={r}
																fill="none"
																stroke={T.border}
																strokeWidth={4}
															/>
															<circle
																cx={18}
																cy={18}
																r={r}
																fill="none"
																stroke={strokeCol}
																strokeWidth={4}
																strokeDasharray={`${dash} ${circ}`}
																strokeLinecap="round"
																style={{
																	transition: "stroke-dasharray 0.3s ease",
																}}
															/>
														</svg>
														<span
															style={{
																fontSize: 12,
																fontWeight: 600,
																color: T.muted,
															}}
														>
															{credits?.plan === "pro"
																? "Pro"
																: `${remaining.toFixed(1)}/${limit}`}
														</span>
													</div>
												);
											})()}
											{/* Small send / stop button */}
											<motion.button
												onClick={
													agentLoading
														? handleAgentCancel
														: handleAgentSend
												}
												disabled={!reduxUser || (!agentLoading && !agentPrompt.trim())}
												whileHover={
													(agentLoading || (agentPrompt.trim() && reduxUser))
														? { scale: 1.05 }
														: {}
												}
												whileTap={{ scale: 0.95 }}
												title={agentLoading ? "Stop" : "Send"}
												style={{
													width: 32,
													height: 32,
													borderRadius: 8,
													background:
														agentLoading
															? "#FEE2E2"
															: agentPrompt.trim() && reduxUser
																? T.accent
																: T.border,
													color: agentLoading
														? "#DC2626"
														: agentPrompt.trim() && reduxUser
															? "white"
															: T.muted,
													border: "none",
													cursor:
														!reduxUser || (!agentLoading && !agentPrompt.trim())
															? "not-allowed"
															: "pointer",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													flexShrink: 0,
												}}
											>
												{agentLoading ? (
													<Icon d={Icons.stop} size={14} stroke="currentColor" fill="currentColor" />
												) : (
													<Icon
														d={Icons.send}
														size={14}
														stroke="currentColor"
														fill="none"
													/>
												)}
											</motion.button>
										</div>
									</div>
								</div>

								{agentError && (
									<motion.div
										initial={{ opacity: 0, y: 4 }}
										animate={{ opacity: 1, y: 0 }}
										style={{
											padding: "12px 16px",
											background: "#FEF2F2",
											border: "1px solid #FECACA",
											borderRadius: 10,
											fontSize: 13,
											color: "#DC2626",
										}}
									>
										{agentError}
									</motion.div>
								)}

								{/* InkAgent output card — below Send button */}
								{(agentRunSteps.length > 0 ||
									agentCompletedTasks.length > 0 ||
									agentThinking ||
									agentLoading) && (
									<motion.div
										ref={agentOutputRef}
										initial={{ opacity: 0, y: -8 }}
										animate={{ opacity: 1, y: 0 }}
										style={{
											background: T.surface,
											border: `1px solid ${T.border}`,
											borderRadius: 14,
											padding: 20,
											boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
										}}
									>
										<p
											style={{
												fontSize: 15,
												fontWeight: 700,
												color: T.accent,
												marginBottom: 16,
												display: "flex",
												alignItems: "center",
												gap: 8,
											}}
										>
											<span style={{ color: T.warm }}>✦</span> InkAgent
										</p>
										{agentRunPrompt && (
											<div
												style={{
													marginBottom: 14,
													padding: "10px 12px",
													background: T.base,
													border: `1px solid ${T.border}`,
													borderRadius: 10,
												}}
											>
												<p
													style={{
														fontSize: 10,
														fontWeight: 700,
														textTransform: "uppercase",
														letterSpacing: "0.06em",
														color: T.muted,
														marginBottom: 6,
													}}
												>
													Your prompt
												</p>
												<p
													style={{
														fontSize: 13,
														lineHeight: 1.5,
														color: T.accent,
														maxHeight: 80,
														overflowY: "auto",
														whiteSpace: "pre-wrap",
														wordBreak: "break-word",
													}}
												>
													{agentRunPrompt}
												</p>
												
											</div>
										)}
										{agentThinking && (
											<div
												style={{
													background: T.base,
													border: `1px solid ${T.border}`,
													borderRadius: 10,
													padding: "14px 16px",
													marginBottom: 16,
													fontSize: 13,
													lineHeight: 1.6,
													color: T.muted,
													maxHeight: 120,
													overflowY: "auto",
												}}
											>
												{agentThinking}
											</div>
										)}
										{agentRunSteps.length > 0 && (
											<div
												style={{
													display: "flex",
													flexDirection: "column",
													gap: 12,
													marginBottom: agentCompletedTasks.length > 0 ? 16 : 0,
												}}
											>
												{agentRunSteps.map((step, i) => (
													<div key={i}>
														<div
															style={{
																display: "flex",
																alignItems: "center",
																justifyContent: "space-between",
																gap: 12,
															}}
														>
															<span
																style={{
																	fontSize: 13,
																	color: T.accent,
																	fontWeight: 500,
																}}
															>
																{step.label}
															</span>
															{step.status === "loading" && (
																<motion.span
																	animate={{ rotate: 360 }}
																	transition={{
																		duration: 0.9,
																		repeat: Infinity,
																		ease: "linear",
																	}}
																>
																	<Icon
																		d={Icons.refresh}
																		size={14}
																		stroke={T.warm}
																	/>
																</motion.span>
															)}
															{step.status === "done" && (
																<span
																	style={{
																		fontSize: 14,
																		color: "#16A34A",
																		fontWeight: 700,
																	}}
																>
																	✓
																</span>
															)}
															{step.status === "error" && (
																<span
																	style={{
																		fontSize: 14,
																		color: "#DC2626",
																		fontWeight: 700,
																	}}
																>
																	✗
																</span>
															)}
														</div>
														{step.output && step.status !== "loading" && (
															<div
																style={{
																	marginTop: 8,
																	padding: "12px 14px",
																	background: T.base,
																	border: `1px solid ${T.border}`,
																	borderRadius: 10,
																	fontSize: 12,
																	lineHeight: 1.6,
																	color: T.accent,
																	whiteSpace: "pre-wrap",
																	wordBreak: "break-word",
																}}
															>
																{formatTaskOutputDisplay(step)}
															</div>
														)}
													</div>
												))}
											</div>
										)}
										{agentCompletedTasks.length > 0 && (
											<>
												<p
													style={{
														fontSize: 12,
														color: T.muted,
														marginBottom: 12,
														fontWeight: 600,
													}}
												>
													Created {agentCompletedTasks.length} asset
													{agentCompletedTasks.length !== 1 ? "s" : ""}
												</p>
												<div
													style={{
														display: "flex",
														flexDirection: "column",
														gap: 8,
													}}
												>
													{agentCompletedTasks.map((t, i) => (
														<motion.a
															key={i}
															href={t.path}
															onClick={(e) => {
																e.preventDefault();
																router.push(t.path);
															}}
															whileHover={{ x: 2, scale: 1.01 }}
															whileTap={{ scale: 0.99 }}
															style={{
																display: "flex",
																alignItems: "center",
																justifyContent: "space-between",
																padding: "12px 14px",
																background: T.base,
																border: `1px solid ${T.border}`,
																borderRadius: 10,
																textDecoration: "none",
																color: T.accent,
																fontSize: 13,
																fontWeight: 600,
															}}
														>
															<span
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: 8,
																}}
															>
																<span style={{ fontSize: 14 }}>
																	{t.type === "newsletter"
																		? "📧"
																		: t.type === "linkedin"
																			? "💼"
																				: t.type === "blog_post"
																				? "📝"
																				: t.type === "twitter_thread"
																					? "🐦"
																					: t.type === "email_digest"
																						? "📬"
																						: t.type === "table"
																							? "📊"
																							: t.type === "infographics"
																								? "📊"
																								: t.type === "landing_page"
																									? "🌐"
																									: t.type === "image_gallery"
																										? "🖼️"
																										: "📄"}
																</span>
																<span>
																	{t.type === "newsletter"
																		? "Newsletter"
																		: t.type === "linkedin"
																			? "LinkedIn"
																			: t.type === "blog_post"
																				? "Article"
																				: t.type === "twitter_thread"
																					? "Thread"
																					: t.type === "email_digest"
																						? "Digest"
																						: t.type === "table"
																							? "Table"
																							: t.type === "infographics"
																								? "Infographics"
																								: t.type === "landing_page"
																									? "Landing Page"
																									: t.type === "image_gallery"
																										? "Gallery"
																										: "Scrape"}
																	{t.label ? ` · ${t.label}` : ""}
																</span>
															</span>
															<span
																style={{
																	fontSize: 12,
																	color: T.warm,
																	fontWeight: 700,
																}}
															>
																Open →
															</span>
														</motion.a>
													))}
												</div>
											</>
										)}
									</motion.div>
								)}

								{/* Try a suggestion — hidden when loading or assets generated */}
								{!agentLoading && agentCompletedTasks.length === 0 && (
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: 12,
											width: "100%",
										}}
									>
										<label
											style={{
												fontSize: 12,
												fontWeight: 700,
												textTransform: "uppercase",
												letterSpacing: "0.08em",
												color: T.muted,
											}}
										>
											Try a suggestion
										</label>
										<div
											style={{
												display: "flex",
												flexDirection: "column",
												gap: 8,
											}}
										>
											{AGENT_PROMPT_SUGGESTIONS.map((s, i) => (
												<motion.button
													key={i}
													whileHover={{ scale: 1.005, x: 4 }}
													whileTap={{ scale: 0.995 }}
													onClick={() => setAgentPrompt(s)}
													style={{
														width: "100%",
														padding: "12px 16px",
														borderRadius: 10,
														fontSize: 13,
														fontWeight: 500,
														cursor: "pointer",
														border: `1.5px solid ${T.border}`,
														background: T.surface,
														color: T.accent,
														textAlign: "left",
														lineHeight: 1.5,
													}}
												>
													{s}
												</motion.button>
											))}
										</div>
									</div>
								)}
							</motion.div>
						)}

						{/* ── SCRAPE MODE ── */}
						<AnimatePresence mode="wait">
							{draftMode === "scrape" && (
								<motion.div
									key="scrape-form"
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 8 }}
									transition={{ duration: 0.18 }}
								>
									<div style={{ marginBottom: 20 }}>
										<label
											style={{
												display: "block",
												fontSize: 12,
												fontWeight: 700,
												textTransform: "uppercase",
												letterSpacing: "0.08em",
												color: T.muted,
												marginBottom: 8,
											}}
										>
											URL to scrape
										</label>
										<input
											type="url"
											value={scrapeUrl}
											onChange={(e) => setScrapeUrl(e.target.value)}
											onKeyDown={(e) => e.key === "Enter" && handleScrape()}
											placeholder="https://example.com/article"
											style={{
												width: "100%",
												background: T.surface,
												border: `1.5px solid ${T.border}`,
												borderRadius: 11,
												padding: "13px 16px",
												fontSize: 14,
												color: T.accent,
												outline: "none",
												transition: "border-color 0.2s",
											}}
											onFocus={(e) => (e.target.style.borderColor = T.warm)}
											onBlur={(e) => (e.target.style.borderColor = T.border)}
										/>
										<p style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>
											Works with blog posts, news articles, Medium, Substack,
											docs
										</p>
									</div>
									<motion.button
										onClick={handleScrape}
										disabled={scraping || !scrapeUrl.trim()}
										whileHover={
											!scraping && scrapeUrl.trim()
												? {
														scale: 1.02,
														y: -1,
														boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
													}
												: {}
										}
										whileTap={!scraping ? { scale: 0.97 } : {}}
										style={{
											width: "100%",
											background:
												scraping || !scrapeUrl.trim() ? "#E8E4DC" : T.accent,
											color: scraping || !scrapeUrl.trim() ? T.muted : "white",
											border: "none",
											padding: "15px",
											borderRadius: 12,
											fontSize: 16,
											fontWeight: 700,
											cursor:
												scraping || !scrapeUrl.trim()
													? "not-allowed"
													: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: 10,
										}}
									>
										{scraping ? (
											<>
												<motion.span
													animate={{ rotate: 360 }}
													transition={{
														duration: 0.9,
														repeat: Infinity,
														ease: "linear",
													}}
													style={{ display: "inline-flex" }}
												>
													<Icon d={Icons.refresh} size={18} stroke={T.muted} />
												</motion.span>
												{loadingMsg}
											</>
										) : (
											<>
												<svg
													width={18}
													height={18}
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth={2}
													strokeLinecap="round"
													strokeLinejoin="round"
												>
													<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
													<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
												</svg>
												Scrape &amp; open in editor →
											</>
										)}
									</motion.button>
								</motion.div>
							)}

							{/* ── BLANK MODE ── */}
							{draftMode === "blank" && (
								<motion.div
									key="blank-form"
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 8 }}
									transition={{ duration: 0.18 }}
								>
									<div style={{ marginBottom: 20 }}>
										<label
											style={{
												display: "block",
												fontSize: 12,
												fontWeight: 700,
												textTransform: "uppercase",
												letterSpacing: "0.08em",
												color: T.muted,
												marginBottom: 8,
											}}
										>
											Draft title (optional)
										</label>
										<input
											type="text"
											value={blankTitle}
											onChange={(e) => setBlankTitle(e.target.value)}
											onKeyDown={(e) => e.key === "Enter" && handleBlank()}
											placeholder="Untitled draft"
											style={{
												width: "100%",
												background: T.surface,
												border: `1.5px solid ${T.border}`,
												borderRadius: 11,
												padding: "13px 16px",
												fontSize: 14,
												color: T.accent,
												outline: "none",
												transition: "border-color 0.2s",
											}}
											onFocus={(e) => (e.target.style.borderColor = T.warm)}
											onBlur={(e) => (e.target.style.borderColor = T.border)}
										/>
									</div>
									<motion.button
										onClick={handleBlank}
										whileHover={{
											scale: 1.02,
											y: -1,
											boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
										}}
										whileTap={{ scale: 0.97 }}
										style={{
											width: "100%",
											background: T.accent,
											color: "white",
											border: "none",
											padding: "15px",
											borderRadius: 12,
											fontSize: 16,
											fontWeight: 700,
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: 10,
										}}
									>
										<svg
											width={18}
											height={18}
											viewBox="0 0 24 24"
											fill="none"
											stroke="white"
											strokeWidth={2}
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
											<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
										</svg>
										Open blank editor →
									</motion.button>
								</motion.div>
							)}
						</AnimatePresence>

						{/* ── AI MODE — existing form ── */}
						{draftMode === "ai" && (
							<>
								{/* Preset chips */}
								<div style={{ marginBottom: 16 }}>
									<label
										style={{
											display: "block",
											fontSize: 12,
											fontWeight: 700,
											textTransform: "uppercase",
											letterSpacing: "0.08em",
											color: T.muted,
											marginBottom: 8,
										}}
									>
										Try with
									</label>
									<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
										{PRESETS.map((p) => (
											<motion.button
												key={p.label}
												whileHover={{ scale: 1.03 }}
												whileTap={{ scale: 0.97 }}
												onClick={() => applyPreset(p)}
												style={{
													padding: "6px 12px",
													borderRadius: 9,
													fontSize: 12,
													fontWeight: 600,
													cursor: "pointer",
													border: `1.5px solid ${T.border}`,
													background: T.surface,
													color: T.accent,
													transition: "all 0.15s",
												}}
											>
												{p.label}
											</motion.button>
										))}
									</div>
								</div>

								{/* Add URL input */}
								<div style={{ marginBottom: 12 }}>
									<label
										style={{
											display: "block",
											fontSize: 12,
											fontWeight: 700,
											textTransform: "uppercase",
											letterSpacing: "0.08em",
											color: T.muted,
											marginBottom: 8,
										}}
									>
										Source URLs (optional)
									</label>
									<div style={{ display: "flex", gap: 8 }}>
										<input
											type="url"
											value={newUrlInput}
											onChange={(e) => setNewUrlInput(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													const val = newUrlInput.trim();
													if (val) {
														setUrls((prev) =>
															prev[0] === "" ? [val] : [...prev, val],
														);
														setNewUrlInput("");
													}
												}
											}}
											placeholder="Paste URL and press Enter"
											style={{
												flex: 1,
												background: T.surface,
												border: `1.5px solid ${T.border}`,
												borderRadius: 11,
												padding: "13px 16px",
												fontSize: 14,
												color: T.accent,
												outline: "none",
												transition: "border-color 0.2s",
											}}
											onFocus={(e) => (e.target.style.borderColor = T.warm)}
											onBlur={(e) => (e.target.style.borderColor = T.border)}
										/>
										<motion.button
											whileHover={{ background: "#F0ECE5" }}
											whileTap={{ scale: 0.97 }}
											onClick={() => {
												const val = newUrlInput.trim();
												if (val) {
													setUrls((prev) =>
														prev[0] === "" ? [val] : [...prev, val],
													);
													setNewUrlInput("");
												}
											}}
											style={{
												padding: "12px 16px",
												background: T.base,
												border: `1.5px solid ${T.border}`,
												borderRadius: 11,
												fontSize: 13,
												fontWeight: 600,
												color: T.accent,
												cursor: "pointer",
												whiteSpace: "nowrap",
											}}
										>
											<Icon d={Icons.plus} size={14} stroke={T.muted} /> Add
										</motion.button>
									</div>
								</div>
								{/* URL chips + prompt — attached in one container */}
								<div style={{ marginBottom: 12 }}>
									<label
										style={{
											display: "block",
											fontSize: 12,
											fontWeight: 700,
											textTransform: "uppercase",
											letterSpacing: "0.08em",
											color: T.muted,
											marginBottom: 8,
										}}
									>
										Your angle / prompt *
									</label>
									<div className="flex flex-col gap-0 bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
										{/* URL chips above prompt */}
										{urls.filter(Boolean).length > 0 && (
											<div className="flex flex-wrap gap-2 px-2 py-1 ">
												{urls.map((urlVal, idx) =>
													urlVal.trim() ? (
														<motion.div
															key={`${urlVal}-${idx}`}
															initial={{ opacity: 0, scale: 0.9 }}
															animate={{ opacity: 1, scale: 1 }}
															style={{
																display: "flex",
																alignItems: "center",
																gap: 6,
																padding: "6px 10px",
																background: T.surface,
																border: `1px solid ${T.border}`,
																borderRadius: 8,
																fontSize: 12,
																color: T.accent,
																maxWidth: 220,
																overflow: "hidden",
																textOverflow: "ellipsis",
																whiteSpace: "nowrap",
															}}
														>
															<span
																style={{
																	flex: 1,
																	overflow: "hidden",
																	textOverflow: "ellipsis",
																}}
															>
																{urlVal.trim()}
															</span>
															<motion.button
																whileHover={{ scale: 1.1 }}
																whileTap={{ scale: 0.9 }}
																onClick={() => removeUrl(idx)}
																style={{
																	background: "none",
																	border: "none",
																	cursor: "pointer",
																	padding: 0,
																	display: "flex",
																	color: T.muted,
																	flexShrink: 0,
																}}
															>
																<svg
																	width={12}
																	height={12}
																	viewBox="0 0 24 24"
																	fill="none"
																	stroke="currentColor"
																	strokeWidth={2}
																>
																	<path d="M18 6L6 18M6 6l12 12" />
																</svg>
															</motion.button>
														</motion.div>
													) : null,
												)}
											</div>
										)}
										<textarea
											value={prompt}
											onChange={(e) => setPrompt(e.target.value)}
											placeholder="e.g. Write a Sunday newsletter for indie founders. Practical and direct tone. Under 400 words. Focus on the actionable takeaways."
											rows={4}
											className="w-full bg-transparent border-none px-2 py-1 text-sm text-zinc-700 resize-vertical outline-none leading-relaxed"
										/>
									</div>
								</div>

								{/* Format selector */}
								<div style={{ marginBottom: 16 }}>
									<label
										style={{
											display: "block",
											fontSize: 12,
											fontWeight: 700,
											textTransform: "uppercase",
											letterSpacing: "0.08em",
											color: T.muted,
											marginBottom: 8,
										}}
									>
										Format
									</label>
									<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
										{FORMATS.map((f) => (
											<motion.button
												key={f.id}
												whileTap={{ scale: 0.96 }}
												onClick={() => setFormat(f.id)}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 5,
													padding: "7px 13px",
													borderRadius: 9,
													fontSize: 13,
													fontWeight: 600,
													cursor: "pointer",
													border: `1.5px solid ${format === f.id ? T.accent : T.border}`,
													background: format === f.id ? T.accent : T.surface,
													color: format === f.id ? "white" : T.muted,
													transition: "all 0.15s",
												}}
											>
												<span>{f.icon}</span>
												{f.label}
											</motion.button>
										))}
									</div>
								</div>

								{/* Style selector */}
								<div style={{ marginBottom: 24 }}>
									<label
										style={{
											display: "block",
											fontSize: 12,
											fontWeight: 700,
											textTransform: "uppercase",
											letterSpacing: "0.08em",
											color: T.muted,
											marginBottom: 8,
										}}
									>
										Tone
									</label>
									<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
										{STYLES.map((s) => (
											<motion.button
												key={s.id}
												whileTap={{ scale: 0.96 }}
												onClick={() => setStyle(s.id)}
												style={{
													padding: "6px 12px",
													borderRadius: 9,
													fontSize: 13,
													fontWeight: 600,
													cursor: "pointer",
													border: `1.5px solid ${style === s.id ? T.warm : T.border}`,
													background: style === s.id ? "#FEF3E2" : T.surface,
													color: style === s.id ? T.warm : T.muted,
													transition: "all 0.15s",
												}}
											>
												{s.label}
											</motion.button>
										))}
									</div>
								</div>

								{/* Generate button */}
								{reduxUser && llmRemaining === 0 ? (
									<motion.button
										onClick={() => router.push("/pricing")}
										whileHover={{
											scale: 1.02,
											y: -1,
											boxShadow: "0 8px 24px rgba(193,123,47,0.25)",
										}}
										whileTap={{ scale: 0.97 }}
										style={{
											width: "100%",
											background: T.warm,
											color: "white",
											border: "none",
											padding: "15px",
											borderRadius: 12,
											fontSize: 16,
											fontWeight: 700,
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: 10,
											transition: "all 0.2s",
										}}
									>
										<Icon d={Icons.zap} size={18} stroke="white" fill="white" />
										Upgrade to generate more drafts →
									</motion.button>
								) : (
									<motion.button
										onClick={handleAgentSend}
										disabled={generating}
										whileHover={
											!generating
												? {
														scale: 1.02,
														y: -1,
														boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
													}
												: {}
										}
										whileTap={!generating ? { scale: 0.97 } : {}}
										style={{
											width: "100%",
											background: generating ? "#E8E4DC" : T.accent,
											color: generating ? T.muted : "white",
											border: "none",
											padding: "15px",
											borderRadius: 12,
											fontSize: 16,
											fontWeight: 700,
											cursor: generating ? "not-allowed" : "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: 10,
											transition: "all 0.2s",
										}}
									>
										{generating ? (
											<>
												<motion.span
													animate={{ rotate: 360 }}
													transition={{
														duration: 0.9,
														repeat: Infinity,
														ease: "linear",
													}}
													style={{ display: "inline-flex" }}
												>
													<Icon d={Icons.refresh} size={18} stroke={T.muted} />
												</motion.span>
												{loadingMsg}
											</>
										) : !reduxUser ? (
											<>
												<Icon
													d={Icons.zap}
													size={18}
													stroke="white"
													fill="white"
												/>
												Sign in &amp; generate draft
											</>
										) : (
											<>
												<Icon
													d={Icons.zap}
													size={18}
													stroke="white"
													fill="white"
												/>
												Generate draft
											</>
										)}
									</motion.button>
								)}
								{/* Circular credits progress — justify-end below generate */}
								<div style={{ display: "flex", justifyContent: "flex-end" }}>
									{(() => {
										const limit = credits?.creditsLimit ?? FREE_CREDIT_LIMIT;
										const remaining =
											credits?.plan === "pro"
												? limit
												: Math.max(0, credits?.remaining ?? limit);
										const pct = limit > 0 ? remaining / limit : 0;
										const r = 14;
										const circ = 2 * Math.PI * r;
										const dash = pct * circ;
										const strokeCol =
											pct > 0.3 ? T.warm : pct > 0.1 ? "#D97706" : "#DC2626";
										return (
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 8,
												}}
											>
												<svg
													width={24}
													height={24}
													viewBox="0 0 36 36"
													style={{ transform: "rotate(-90deg)" }}
												>
													<circle
														cx={18}
														cy={18}
														r={r}
														fill="none"
														stroke={T.border}
														strokeWidth={4}
													/>
													<circle
														cx={18}
														cy={18}
														r={r}
														fill="none"
														stroke={strokeCol}
														strokeWidth={4}
														strokeDasharray={`${dash} ${circ}`}
														strokeLinecap="round"
														style={{ transition: "stroke-dasharray 0.3s ease" }}
													/>
												</svg>
												<span
													style={{
														fontSize: 12,
														fontWeight: 600,
														color: T.muted,
													}}
												>
													{credits?.plan === "pro"
														? "Pro"
														: `${remaining.toFixed(1)}/${limit}`}
												</span>
											</div>
										);
									})()}
								</div>

								{/* Error message */}
								{generateError && (
									<motion.div
										initial={{ opacity: 0, y: 4 }}
										animate={{ opacity: 1, y: 0 }}
										style={{
											marginTop: 12,
											padding: "12px 16px",
											background: "#FEF2F2",
											border: "1px solid #FECACA",
											borderRadius: 10,
											fontSize: 13,
											color: "#DC2626",
										}}
									>
										{generateError}
									</motion.div>
								)}

								{generating && (
									<motion.div
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										style={{ marginTop: 24 }}
									>
										<p
											style={{
												fontSize: 13,
												color: T.muted,
												marginBottom: 14,
												textAlign: "center",
											}}
										>
											Inkgestis reading the page, then drafting your content…
										</p>
										<div
											style={{
												background: T.surface,
												border: `1px solid ${T.border}`,
												borderRadius: 12,
												padding: 20,
											}}
										>
											{[75, 55, 90, 45, 65, 80, 38].map((w, i) => (
												<motion.div
													key={i}
													animate={{ opacity: [0.25, 0.65, 0.25] }}
													transition={{
														duration: 1.4,
														delay: i * 0.12,
														repeat: Infinity,
													}}
													style={{
														height: 11,
														width: `${w}%`,
														background: T.border,
														borderRadius: 6,
														marginBottom: 10,
													}}
												/>
											))}
										</div>
									</motion.div>
								)}

								{/* Tips */}
								{!generating && (
									<div
										style={{
											marginTop: 28,
											background: T.surface,
											border: `1px solid ${T.border}`,
											borderRadius: 12,
											padding: "18px 20px",
										}}
									>
										<p
											style={{
												fontSize: 12,
												fontWeight: 700,
												textTransform: "uppercase",
												letterSpacing: "0.08em",
												color: T.warm,
												marginBottom: 12,
											}}
										>
											Tips for better drafts
										</p>
										{[
											'Be specific about your audience — "indie founders" beats "entrepreneurs"',
											"Mention tone: conversational, professional, direct, warm, opinionated",
											'Add a word count target: "under 400 words" keeps it tight',
											"Describe the action you want readers to take at the end",
										].map((tip) => (
											<div
												key={tip}
												style={{
													display: "flex",
													gap: 10,
													marginBottom: 8,
													alignItems: "flex-start",
												}}
											>
												<span
													style={{
														color: T.warm,
														fontSize: 14,
														lineHeight: 1.5,
														flexShrink: 0,
													}}
												>
													✦
												</span>
												<p
													style={{
														fontSize: 13,
														color: T.muted,
														lineHeight: 1.6,
													}}
												>
													{tip}
												</p>
											</div>
										))}
									</div>
								)}

								{/* close AI mode block */}
							</>
						)}
					</motion.div>
				</div>
			</div>

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
