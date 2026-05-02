import { useState, useEffect, useRef, useMemo } from "react";
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
import { validateUrl } from "../../lib/utils/urlAllowlist";
import { getTheme } from "../../lib/utils/theme";
import SimpleBuilderTab from "../../lib/ui/SimpleBuilderTab";
import GenerateAssetPanel from "../../lib/ui/GenerateAssetPanel";
import { persistGenerateResponse } from "../../lib/utils/persistGenerateResponse";
import { requestGenerate } from "../../lib/api/generateClient";
import { listCanvasProjects } from "../../lib/api/canvasProjects";
import AppInkgestTopBar from "../../lib/ui/AppInkgestTopBar";

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

/* ─── Prompt suggestions for generate panel (URL + short prompt) ─── */
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
function groupSidebarByProject(items, projects) {
	if (!projects?.length)
		return [{ id: "_all", name: "All assets", items }];
	const out = [];
	const seen = new Set();
	for (const p of projects) {
		const ids = new Set(p.assetIds || []);
		const projItems = items.filter((i) => ids.has(i.id));
		projItems.forEach((i) => seen.add(i.id));
		if (projItems.length > 0)
			out.push({
				id: p.id,
				name: p.name || "Project",
				items: projItems,
			});
	}
	const loose = items.filter((i) => !seen.has(i.id));
	if (loose.length > 0)
		out.push({ id: "_unassigned", name: "Unassigned", items: loose });
	return out.length > 0
		? out
		: [{ id: "_all", name: "All assets", items }];
}

function SidebarItemCard({
	item,
	active,
	onClick,
	onDelete,
}) {
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
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 2,
								flexShrink: 0,
							}}
						>
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
						</div>
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
	const [draftMode, setDraftMode] = useState("agent"); // "simple" | "agent" | "ai" | "scrape" | "blank"
	const [scrapeUrl, setScrapeUrl] = useState("");
	const [scraping, setScraping] = useState(false);
	const [blankTitle, setBlankTitle] = useState("");
	const [credits, setCredits] = useState(null); // { plan, creditsUsed, creditsLimit, remaining }


	/* Derived helpers — single unified credit pool */
	const creditRemaining = credits
		? credits.plan === "pro"
			? Infinity
			: Math.max(0, credits.remaining ?? FREE_CREDIT_LIMIT)
		: FREE_CREDIT_LIMIT;
	// Legacy aliases kept so all existing checks below compile unchanged
	const llmRemaining = creditRemaining;
	const scrapeRemaining = creditRemaining;

	/* Load drafts, tables, and other assets via React Query (shared with draftId page) */
	const { data: items = [], isLoading: assetsLoading } = useQuery({
		queryKey: ["assets", reduxUser?.uid],
		queryFn: () => listAssets(reduxUser.uid),
		enabled: !!reduxUser,
		staleTime: 2 * 60 * 1000,
	});

	const { data: canvasProjects = [] } = useQuery({
		queryKey: ["canvasProjects", reduxUser?.uid],
		queryFn: () => listCanvasProjects(reduxUser.uid),
		enabled: !!reduxUser,
		staleTime: 60 * 1000,
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

	const sidebarGrouped = useMemo(
		() => groupSidebarByProject(filtered, canvasProjects),
		[filtered, canvasProjects],
	);

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

	const handleDraftGenerate = async () => {
		const cleanUrls = urls
			.map((u) => u.trim())
			.filter((u) => /^https?:\/\//i.test(u));
		if (!prompt.trim() && cleanUrls.length === 0) return;
		if (!reduxUser) {
			setLoginModalOpen(true);
			return;
		}
		if (creditRemaining <= 0) {
			router.push("/pricing");
			return;
		}
		setGenerating(true);
		setGenerateError(null);
		try {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Session expired. Please sign in again.");
			const { data } = await requestGenerate({
				type: "newsletter",
				idToken,
				urls: cleanUrls,
				prompt: prompt.trim(),
				format,
				style,
			});
			const tasks = await persistGenerateResponse({
				uid: reduxUser.uid,
				generateType: "newsletter",
				data,
				prompt: prompt.trim(),
				urlList: cleanUrls,
				format,
				queryClient,
			});
			if (tasks.length > 0) {
				queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
				if (tasks[0]?.path) router.push(tasks[0].path);
			}
			if (reduxUser)
				getUserCredits(reduxUser.uid).then(setCredits).catch(() => {});
		} catch (e) {
			setGenerateError(e?.message || "Something went wrong");
		} finally {
			setGenerating(false);
		}
	};

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

			<AppInkgestTopBar
				T={T}
				reduxUser={reduxUser}
				credits={credits}
				creditRemaining={creditRemaining}
				FREE_CREDIT_LIMIT={FREE_CREDIT_LIMIT}
				formatRenewalDate={formatRenewalDate}
				router={router}
				sidebarOpen={sidebarOpen}
				onSidebarToggle={() => setSidebarOpen((s) => !s)}
				showSidebarToggle={!!reduxUser}
				showFormCanvasNav={draftMode === "agent"}
				formCanvasActive="form"
				onLogin={() => setLoginModalOpen(true)}
			/>
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
										sidebarGrouped.map((section) => (
											<div key={section.id} style={{ marginBottom: 14 }}>
												{sidebarGrouped.length > 1 && (
													<p
														style={{
															fontSize: 10,
															fontWeight: 700,
															color: T.muted,
															textTransform: "",
															letterSpacing: "0.1em",
															margin: "0 4px 8px",
														}}
													>
														{section.name}
													</p>
												)}
												{section.items.map((item) => (
													<SidebarItemCard
														key={item.id}
														item={item}
														active={false}
														onClick={() =>
															router.push(`/app/${item.id}`)
														}
														onDelete={handleDelete}
													/>
												))}
											</div>
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

				{/* ── MAIN — Generator (pushes right when drafts sidebar open) ── */}
				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
						minWidth: 0,
						marginLeft: reduxUser && sidebarOpen ? 280 : 0,
						transition: "margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
					}}
				>
					<motion.div
						key="generator"
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
						style={{
							flex: 1,
							display: "flex",
							flexDirection: "column",
							minHeight: 0,
							overflow: "auto",
							padding: "32px clamp(24px, 4vw, 48px)",
							maxWidth: 980,
							width: "100%",
							margin: "0 auto",
						}}
					>
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

						{draftMode === "simple" && (
							<SimpleBuilderTab
								userId={reduxUser?.uid}
								theme={T}
								onLoginRequired={() => setLoginModalOpen(true)}
							/>
						)}

						{/* ── Generate asset (form) — canvas lives at /app/canvas ── */}
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
								<GenerateAssetPanel
									variant="app"
									theme={T}
									reduxUser={reduxUser}
									creditRemaining={creditRemaining}
									queryClient={queryClient}
									router={router}
									onLogin={() => setLoginModalOpen(true)}
									presets={PRESETS}
									promptSuggestions={AGENT_PROMPT_SUGGESTIONS}
									showFormatControls
									format={format}
									setFormat={setFormat}
									style={style}
									setStyle={setStyle}
									FORMATS={FORMATS}
									STYLES={STYLES}
								/>
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
												textTransform: "",
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
												textTransform: "",
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
								{/* Add URL input */}
								<div style={{ marginBottom: 12 }}>
									<label
										style={{
											display: "block",
											fontSize: 12,
											fontWeight: 700,
											textTransform: "",
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
											textTransform: "",
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
											textTransform: "",
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
											textTransform: "",
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
										onClick={handleDraftGenerate}
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
												textTransform: "",
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
