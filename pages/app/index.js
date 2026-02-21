import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import LoginModal from "../../lib/ui/LoginModal";
import { db } from "../../lib/config/firebase";
import {
	collection,
	addDoc,
	getDocs,
	deleteDoc,
	doc,
	query,
	orderBy,
	where,
	serverTimestamp,
} from "firebase/firestore";

/* ─── Fonts ─── */
const FontLink = () => (
	<style>{`
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap');
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

/* ─── Tokens ─── */
const T = {
	base: "#F7F5F0",
	surface: "#FFFFFF",
	accent: "#1A1A1A",
	warm: "#C17B2F",
	muted: "#7A7570",
	border: "#E8E4DC",
	sidebar: "#FDFCF9",
};

const FREE_LIMIT = 3;

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
};

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
function UpgradeBanner({ used, limit, onUpgrade }) {
	const pct = (used / limit) * 100;
	const remaining = limit - used;
	if (used < limit - 1) return null;
	return (
		<motion.div
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			style={{
				background: remaining === 0 ? T.accent : "#FEF3E2",
				border: `1px solid ${remaining === 0 ? T.accent : "#F5C97A"}`,
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
							color: remaining === 0 ? "white" : "#92400E",
							marginBottom: 2,
						}}
					>
						{remaining === 0
							? "You've used all 3 free drafts"
							: "1 free draft remaining"}
					</p>
					<p
						style={{
							fontSize: 12,
							color: remaining === 0 ? "rgba(255,255,255,0.65)" : "#B45309",
						}}
					>
						{remaining === 0
							? "Upgrade to Pro for unlimited drafts — $5/mo"
							: "Upgrade to Pro before you run out"}
					</p>
				</div>
				<motion.button
					whileHover={{ scale: 1.04 }}
					whileTap={{ scale: 0.97 }}
					onClick={onUpgrade}
					style={{
						background: remaining === 0 ? T.warm : T.accent,
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
					Upgrade $5/mo →
				</motion.button>
			</div>
			{remaining > 0 && (
				<div
					style={{
						marginTop: 10,
						height: 3,
						background: "#F5C97A",
						borderRadius: 100,
						overflow: "hidden",
					}}
				>
					<div
						style={{
							height: "100%",
							width: `${pct}%`,
							background: T.warm,
							borderRadius: 100,
						}}
					/>
				</div>
			)}
		</motion.div>
	);
}

/* ─── Draft card in sidebar ─── */
function DraftCard({ draft, active, onClick, onDelete }) {
	const [hovering, setHovering] = useState(false);
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
						{draft.title}
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
						{draft.preview}
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
							{draft.tag}
						</span>
						<span style={{ fontSize: 10.5, color: T.muted }}>
							{draft.words}w
						</span>
						<span style={{ fontSize: 10.5, color: T.muted }}>·</span>
						<span style={{ fontSize: 10.5, color: T.muted }}>{draft.date}</span>
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
								onDelete(draft.id);
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
	const reduxUser = useSelector((state) => state.user?.user ?? null);
	const pendingGenerateRef = useRef(false);

	const [drafts, setDrafts] = useState([]);
	const [search, setSearch] = useState("");
	const [urls, setUrls] = useState([""]);
	const [prompt, setPrompt] = useState("");
	const [format, setFormat] = useState("substack");
	const [style, setStyle] = useState("casual");
	const [generating, setGenerating] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [loginModalOpen, setLoginModalOpen] = useState(false);
	const [deleteConfirm, setDeleteConfirm] = useState(null);
	const [generateError, setGenerateError] = useState(null);

	/* Dynamic usage — count this month's drafts for the logged-in user */
	const used = drafts.filter((d) => isThisMonth(d.createdAt)).length;
	const remaining = Math.max(0, FREE_LIMIT - used);

	/* Load drafts per user from Firestore */
	useEffect(() => {
		if (!reduxUser) {
			setDrafts([]);
			return;
		}
		const loadDrafts = async () => {
			try {
				const q = query(
					collection(db, "drafts"),
					where("userId", "==", reduxUser.uid),
					orderBy("createdAt", "desc"),
				);
				const snap = await getDocs(q);
				setDrafts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
			} catch (e) {
				console.error("Failed to load drafts", e);
			}
		};
		loadDrafts();
	}, [reduxUser]);

	/* Auto-generate after login if there was a pending request */
	useEffect(() => {
		if (reduxUser && pendingGenerateRef.current && prompt.trim()) {
			pendingGenerateRef.current = false;
			handleGenerate();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [reduxUser]);

	const filtered = drafts.filter(
		(d) =>
			d.title?.toLowerCase().includes(search.toLowerCase()) ||
			d.preview?.toLowerCase().includes(search.toLowerCase()),
	);

	const handleGenerate = async () => {
		if (!prompt.trim() || generating) return;
		if (remaining <= 0) {
			router.push("/pricing");
			return;
		}
		setGenerating(true);
		setGenerateError(null);
		try {
			const validUrls = urls.map((u) => u.trim()).filter(Boolean);
			const res = await fetch("/api/automations/newsletter-generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					urls: validUrls,
					prompt: prompt.trim(),
					format,
					style,
					userId: reduxUser.uid,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Generation failed");

			const lines = (data.content || "").split("\n");
			const titleLine = lines.find(
				(l) => l.startsWith("# ") || l.startsWith("## "),
			);
			const title = titleLine
				? titleLine.replace(/^#+\s*/, "").trim()
				: prompt.slice(0, 60) || "Untitled draft";

			const bodyText = lines
				.filter((l) => !l.match(/^#{1,6}\s/))
				.join(" ")
				.replace(/[*_`]/g, "")
				.replace(/\s+/g, " ")
				.trim();
			const preview =
				bodyText.slice(0, 180) + (bodyText.length > 180 ? "…" : "");

			const words = data.content.trim().split(/\s+/).length;
			const now = new Date();
			const date = now.toLocaleDateString("en-US", {
				weekday: "short",
				month: "short",
				day: "numeric",
			});

			// Collect all images from all sources
			const allImages = (data.sources || [])
				.flatMap((s) => s.images || [])
				.filter(Boolean)
				.filter((v, i, a) => a.indexOf(v) === i) // dedupe
				.slice(0, 20);

			const draft = {
				userId: reduxUser.uid,
				title,
				preview,
				body: data.content,
				urls: validUrls,
				images: allImages,
				words,
				date,
				tag: data.formatLabel || "Newsletter",
				format: data.format || format,
				style: data.style || style,
				createdAt: serverTimestamp(),
			};

			const docRef = await addDoc(collection(db, "drafts"), draft);
			setDrafts((prev) => [
				{ id: docRef.id, ...draft, createdAt: new Date() },
				...prev,
			]);
			setUrls([""]);
			setPrompt("");
			router.push(`/app/${docRef.id}`);
		} catch (e) {
			setGenerateError(e?.message || "Failed to generate");
		} finally {
			setGenerating(false);
		}
	};

	/* Click handler for the generate button — gates on login */
	const handleGenerateClick = () => {
		if (!reduxUser) {
			pendingGenerateRef.current = true;
			setLoginModalOpen(true);
			return;
		}
		handleGenerate();
	};

	const handleDelete = (id) => {
		setDeleteConfirm(id);
	};

	const confirmDelete = async () => {
		try {
			await deleteDoc(doc(db, "drafts", deleteConfirm));
			setDrafts((prev) => prev.filter((d) => d.id !== deleteConfirm));
		} catch (e) {
			console.error("Delete failed", e);
		}
		setDeleteConfirm(null);
	};

	const addUrl = () => setUrls((prev) => [...prev, ""]);

	const updateUrl = (idx, val) => {
		setUrls((prev) => {
			const next = [...prev];
			next[idx] = val;
			return next;
		});
	};

	const removeUrl = (idx) => {
		setUrls((prev) => prev.filter((_, i) => i !== idx));
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
						fontFamily: "'Instrument Serif',serif",
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

				{/* Usage pill */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 8,
						marginLeft: 4,
						background: remaining === 0 ? "#FEF3E2" : T.base,
						border: `1px solid ${remaining === 0 ? "#F5C97A" : T.border}`,
						borderRadius: 100,
						padding: "4px 12px",
					}}
				>
					<div
						style={{
							width: 52,
							height: 3,
							background: T.border,
							borderRadius: 100,
							overflow: "hidden",
						}}
					>
						<motion.div
							animate={{
								width: `${((FREE_LIMIT - remaining) / FREE_LIMIT) * 100}%`,
							}}
							transition={{ duration: 0.6 }}
							style={{ height: "100%", background: T.warm, borderRadius: 100 }}
						/>
					</div>
					<span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>
						{reduxUser
							? `${remaining}/${FREE_LIMIT} left`
							: `${FREE_LIMIT} free`}
					</span>
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
						Upgrade
					</motion.button>
				</div>

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
								<p
									style={{
										fontSize: 11,
										fontWeight: 700,
										textTransform: "uppercase",
										letterSpacing: "0.08em",
										color: T.muted,
										marginBottom: 10,
									}}
								>
									My Drafts
								</p>
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
										placeholder="Search drafts…"
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
											<p style={{ fontSize: 13 }}>No drafts found</p>
										</motion.div>
									) : (
										filtered.map((draft) => (
											<DraftCard
												key={draft.id}
												draft={draft}
												active={false}
												onClick={() => router.push(`/app/${draft.id}`)}
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
						<div style={{ marginBottom: 28 }}>
							<h1
								style={{
									fontFamily: "'Instrument Serif',serif",
									fontSize: 32,
									color: T.accent,
									marginBottom: 6,
									letterSpacing: "-0.5px",
								}}
							>
								Generate a new draft
							</h1>
							<p style={{ fontSize: 15, color: T.muted, lineHeight: 1.6 }}>
								Paste one or more URLs and describe your angle. We&apos;ll read
								the pages and write a structured draft.
							</p>
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
									marginBottom: 16,
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
										{FREE_LIMIT} free drafts per month
									</p>
									<p style={{ fontSize: 12, color: "#B45309" }}>
										Sign in to start generating — no card required
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
							used={used}
							limit={FREE_LIMIT}
							onUpgrade={() => router.push("/pricing")}
						/>

						{/* Multiple URLs input */}
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
								Source URLs (optional)
							</label>
							{urls.map((urlVal, idx) => (
								<div
									key={idx}
									style={{
										display: "flex",
										gap: 8,
										marginBottom: 8,
										alignItems: "center",
									}}
								>
									<input
										value={urlVal}
										onChange={(e) => updateUrl(idx, e.target.value)}
										placeholder={`https://example.com/article${idx > 0 ? `-${idx + 1}` : ""}`}
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
									{urls.length > 1 && (
										<motion.button
											whileHover={{ background: "#FEE2E2" }}
											whileTap={{ scale: 0.95 }}
											onClick={() => removeUrl(idx)}
											style={{
												background: T.surface,
												border: `1.5px solid ${T.border}`,
												borderRadius: 9,
												width: 42,
												height: 42,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												cursor: "pointer",
												flexShrink: 0,
												transition: "background 0.15s",
											}}
										>
											<Icon d={Icons.trash} size={14} stroke="#EF4444" />
										</motion.button>
									)}
								</div>
							))}
							<motion.button
								whileHover={{ background: "#F0ECE5" }}
								whileTap={{ scale: 0.97 }}
								onClick={addUrl}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 6,
									background: "transparent",
									border: `1.5px dashed ${T.border}`,
									borderRadius: 9,
									padding: "8px 14px",
									fontSize: 13,
									fontWeight: 600,
									color: T.muted,
									cursor: "pointer",
									transition: "background 0.15s",
									marginTop: 4,
								}}
							>
								<Icon d={Icons.plus} size={13} stroke={T.muted} />
								Add another URL
							</motion.button>
							<p style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>
								Works with blog posts, news articles, Medium, Substack, research
								papers
							</p>
						</div>

						{/* Prompt input */}
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
								Your angle / prompt *
							</label>
							<textarea
								value={prompt}
								onChange={(e) => setPrompt(e.target.value)}
								placeholder="e.g. Write a Sunday newsletter for indie founders. Practical and direct tone. Under 400 words. Focus on the actionable takeaways."
								rows={4}
								style={{
									width: "100%",
									background: T.surface,
									border: `1.5px solid ${T.border}`,
									borderRadius: 11,
									padding: "13px 16px",
									fontSize: 14,
									color: T.accent,
									resize: "vertical",
									outline: "none",
									lineHeight: 1.6,
									transition: "border-color 0.2s",
								}}
								onFocus={(e) => (e.target.style.borderColor = T.warm)}
								onBlur={(e) => (e.target.style.borderColor = T.border)}
							/>
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
						{reduxUser && remaining === 0 ? (
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
								onClick={handleGenerateClick}
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
										Reading URLs and writing draft…
									</>
								) : !reduxUser ? (
									<>
										<Icon d={Icons.zap} size={18} stroke="white" fill="white" />
										Sign in &amp; generate draft
									</>
								) : (
									<>
										<Icon d={Icons.zap} size={18} stroke="white" fill="white" />
										Generate draft
									</>
								)}
							</motion.button>
						)}

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
									fontFamily: "'Instrument Serif',serif",
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
