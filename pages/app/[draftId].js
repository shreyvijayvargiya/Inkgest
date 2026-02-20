import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LoginModal from "../../lib/ui/LoginModal";
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
	return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
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

/* ─── Draft Page ─── */
export default function DraftPage() {
	const router = useRouter();
	const { draftId } = router.query;
	const reduxUser = useSelector((state) => state.user?.user ?? null);

	const [draft, setDraft] = useState(null);
	const [drafts, setDrafts] = useState([]);
	const [loadingDraft, setLoadingDraft] = useState(true);
	const [search, setSearch] = useState("");
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [copied, setCopied] = useState(false);
	const [saved, setSaved] = useState(false);
	const [wordCount, setWordCount] = useState(0);
	const [loginModalOpen, setLoginModalOpen] = useState(false);
	const [deleteConfirm, setDeleteConfirm] = useState(null);
	const editorRef = useRef(null);

	/* Dynamic usage for navbar pill */
	const used = drafts.filter((d) => isThisMonth(d.createdAt)).length;
	const remaining = Math.max(0, FREE_LIMIT - used);

	/* Load all drafts for sidebar — per user */
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

	/* Load specific draft by ID */
	useEffect(() => {
		if (!draftId) return;
		const loadDraft = async () => {
			setLoadingDraft(true);
			try {
				const snap = await getDoc(doc(db, "drafts", draftId));
				if (snap.exists()) {
					setDraft({ id: snap.id, ...snap.data() });
				} else {
					router.replace("/app");
				}
			} catch (e) {
				console.error("Failed to load draft", e);
				router.replace("/app");
			} finally {
				setLoadingDraft(false);
			}
		};
		loadDraft();
	}, [draftId, router]);

	/* Format markdown body to displayable HTML */
	const formatBody = (body = "") => {
		if (body.trim().startsWith("<")) return body;
		return body
			.split("\n")
			.map((line) => {
				if (line.startsWith("## "))
					return `<h2 style="font-family:'Instrument Serif',serif;font-size:20px;color:#1A1A1A;margin:20px 0 8px;line-height:1.3">${line.slice(3)}</h2>`;
				if (line.startsWith("# "))
					return `<h1 style="font-family:'Instrument Serif',serif;font-size:26px;color:#1A1A1A;margin:24px 0 10px;line-height:1.2">${line.slice(2)}</h1>`;
				if (line === "") return `<br/>`;
				return `<p style="font-size:15px;line-height:1.8;color:#3A3530;margin-bottom:4px">${line}</p>`;
			})
			.join("");
	};

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

	const handleDelete = (id) => setDeleteConfirm(id);

	const confirmDelete = async () => {
		try {
			await deleteDoc(doc(db, "drafts", deleteConfirm));
			setDrafts((prev) => prev.filter((d) => d.id !== deleteConfirm));
			if (deleteConfirm === draftId) {
				router.push("/app");
			}
		} catch (e) {
			console.error("Delete failed", e);
		}
		setDeleteConfirm(null);
	};

	const filtered = drafts.filter(
		(d) =>
			d.title?.toLowerCase().includes(search.toLowerCase()) ||
			d.preview?.toLowerCase().includes(search.toLowerCase()),
	);

	const sourceUrl = Array.isArray(draft?.urls)
		? draft.urls[0] || ""
		: draft?.url || "";

	if (loadingDraft && !draft) {
		return (
			<div
				style={{
					height: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: T.base,
					fontFamily: "'Outfit', sans-serif",
				}}
			>
				<FontLink />
				<motion.div
					animate={{ opacity: [0.4, 1, 0.4] }}
					transition={{ duration: 1.5, repeat: Infinity }}
					style={{ fontSize: 15, color: T.muted }}
				>
					Loading draft…
				</motion.div>
			</div>
		);
	}

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
							animate={{ width: `${((FREE_LIMIT - remaining) / FREE_LIMIT) * 100}%` }}
							transition={{ duration: 0.6 }}
							style={{ height: "100%", background: T.warm, borderRadius: 100 }}
						/>
					</div>
					<span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>
						{remaining}/{FREE_LIMIT} left
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
							<Icon d={Icons.settings} size={16} stroke={T.muted} />
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
							<div
								style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}
							>
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
										filtered.map((d) => (
											<DraftCard
												key={d.id}
												draft={d}
												active={d.id === draftId}
												onClick={() => router.push(`/app/${d.id}`)}
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

				{/* ── RIGHT PANEL — Editor ── */}
				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
					}}
				>
					{draft && (
						<motion.div
							key={`editor-${draftId}`}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.25 }}
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
									onClick={() =>
										document.execCommand("insertUnorderedList")
									}
								/>
								<TBtn
									icon={Icons.link2}
									label="Link"
									onClick={() => {
										const url = window.prompt("URL:");
										if (url)
											document.execCommand("createLink", false, url);
									}}
								/>
								<div
									style={{
										width: 1,
										height: 18,
										background: T.border,
										margin: "0 4px",
									}}
								/>
								{/* Source info */}
								{sourceUrl && (
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: 6,
											background: T.base,
											border: `1px solid ${T.border}`,
											borderRadius: 7,
											padding: "4px 10px",
											maxWidth: 240,
											overflow: "hidden",
										}}
									>
										<Icon d={Icons.link2} size={12} stroke={T.muted} />
										<span
											style={{
												fontSize: 12,
												color: T.muted,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{sourceUrl}
										</span>
									</div>
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

							{/* Draft title */}
							<div
								style={{
									padding: "24px 40px 0",
									background: T.surface,
									borderBottom: `1px solid ${T.border}`,
									flexShrink: 0,
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 10,
										marginBottom: 12,
									}}
								>
									<span
										style={{
											fontSize: 11,
											fontWeight: 700,
											background: "#F0ECE5",
											color: T.muted,
											padding: "2px 9px",
											borderRadius: 100,
										}}
									>
										{draft.tag}
									</span>
									<span style={{ fontSize: 12, color: T.muted }}>
										{draft.date}
									</span>
								</div>
							<div
								contentEditable
								suppressContentEditableWarning
								data-placeholder="Untitled draft"
								style={{
									fontFamily: "'Instrument Serif',serif",
									fontSize: "clamp(22px, 3vw, 30px)",
									color: T.accent,
									lineHeight: 1.2,
									letterSpacing: "-0.5px",
									outline: "none",
									marginBottom: 12,
									minHeight: 36,
								}}
								dangerouslySetInnerHTML={{ __html: draft.title }}
							/>
							{/* Source links */}
							{(() => {
								const allUrls = Array.isArray(draft?.urls)
									? draft.urls.filter(Boolean)
									: draft?.url
									? [draft.url]
									: [];
								if (allUrls.length === 0) return null;
								return (
									<div
										style={{
											display: "flex",
											flexWrap: "wrap",
											gap: 6,
											marginBottom: 16,
										}}
									>
										{allUrls.map((url, i) => (
											<a
												key={i}
												href={url}
												target="_blank"
												rel="noopener noreferrer"
												style={{
													display: "inline-flex",
													alignItems: "center",
													gap: 5,
													fontSize: 12,
													color: T.warm,
													background: "#FEF3E2",
													border: `1px solid #F5C97A`,
													borderRadius: 7,
													padding: "3px 10px",
													textDecoration: "none",
													maxWidth: 320,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
													transition: "opacity 0.15s",
												}}
												onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
												onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
											>
												<Icon d={Icons.link2} size={11} stroke={T.warm} />
												{url}
											</a>
										))}
									</div>
								);
							})()}
						</div>

							{/* Editor body */}
							<div
								style={{
									flex: 1,
									overflowY: "auto",
									background: T.surface,
								}}
							>
								<div
									ref={editorRef}
									contentEditable
									suppressContentEditableWarning
									onInput={countWords}
									data-placeholder="Start writing…"
									style={{
										maxWidth: 680,
										margin: "0 auto",
										padding: "28px 40px 80px",
										minHeight: "100%",
										outline: "none",
										fontSize: 15,
										lineHeight: 1.8,
										color: "#3A3530",
									}}
								/>
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
								<div
									style={{ display: "flex", alignItems: "center", gap: 6 }}
								>
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
									<Icon d={Icons.refresh} size={12} stroke={T.muted} />{" "}
									New draft
								</motion.button>
							</div>
						</motion.div>
					)}
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
