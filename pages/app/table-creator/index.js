import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { useMutation } from "@tanstack/react-query";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
} from "@tanstack/react-table";
import {
	collection,
	addDoc,
	getDocs,
	doc,
	query,
	where,
	serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../../lib/config/firebase";

/* ─── Fonts & global styles ────────────────────────────────────────────────── */
const FontLink = () => (
	<style>{`
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: 'Outfit', sans-serif; background: #F7F5F0; -webkit-font-smoothing: antialiased; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #E8E4DC; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #C17B2F; }
    input, textarea, button, select { font-family: 'Outfit', sans-serif; }
    input:focus, textarea:focus, select:focus { outline: none; }
  `}</style>
);

const T = {
	base: "#F7F5F0",
	surface: "#FFFFFF",
	accent: "#1A1A1A",
	warm: "#C17B2F",
	muted: "#7A7570",
	border: "#E8E4DC",
	sidebar: "#FDFCF9",
	green: "#166534",
	greenBg: "#DCFCE7",
	red: "#991B1B",
	redBg: "#FEE2E2",
};

const Ic = ({ d, d2, size = 16, stroke = T.muted, sw = 1.75 }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
		<path d={d} />
		{d2 && <path d={d2} />}
	</svg>
);

const ICONS = {
	arrowLeft: "M19 12H5M5 12l7 7M5 12l7-7",
	table: "M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18",
	link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
	link2: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
	sortAsc: "M3 6h14M3 12h9M3 18h4M16 18V6M13 9l3-3 3 3",
	sortDesc: "M3 6h14M3 12h9M3 18h4M16 6v12M13 15l3 3 3-3",
	sortNone: "M3 6h18M3 12h18M3 18h18",
	search: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
	copy: "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-4-4H8z M14 2v6h6",
	download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
	zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
	info: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8h.01M12 12v4",
	spinner: "M12 2a10 10 0 0 1 10 10",
	externalLink: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3",
	plus: "M12 5v14M5 12h14",
	trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
	save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8",
	chevronL: "M15 18l-6-6 6-6",
	chevronR: "M9 18l6-6-6-6",
};

function tableToMarkdown(columns, rows) {
	const header = "| " + columns.map((c) => c.label).join(" | ") + " |";
	const divider = "| " + columns.map(() => "---").join(" | ") + " |";
	const dataRows = rows.map(
		(row) => "| " + columns.map((c) => String(row[c.key] ?? "")).join(" | ") + " |"
	);
	return [header, divider, ...dataRows].join("\n");
}

function SortIcon({ sorted }) {
	if (sorted === "asc") return <Ic d={ICONS.sortAsc} size={13} stroke={T.warm} sw={2} />;
	if (sorted === "desc") return <Ic d={ICONS.sortDesc} size={13} stroke={T.warm} sw={2} />;
	return <Ic d={ICONS.sortNone} size={13} stroke={T.border} sw={1.5} />;
}

function CellValue({ value, type }) {
	if (value === null || value === undefined || value === "") {
		return <span style={{ color: T.border }}>—</span>;
	}
	if (type === "url") {
		return (
			<a
				href={value}
				target="_blank"
				rel="noopener noreferrer"
				style={{
					color: T.warm,
					textDecoration: "none",
					display: "inline-flex",
					alignItems: "center",
					gap: 4,
					maxWidth: 200,
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
				}}
			>
				<span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
					{String(value).replace(/^https?:\/\//, "").slice(0, 40)}
				</span>
				<Ic d={ICONS.externalLink} size={11} stroke={T.warm} />
			</a>
		);
	}
	if (type === "number" || type === "percentage") {
		return (
			<span style={{ fontVariantNumeric: "tabular-nums", color: T.accent }}>
				{value}
			</span>
		);
	}
	return <span>{String(value)}</span>;
}

const actionBtnStyle = {
	display: "flex", alignItems: "center", gap: 5,
	background: T.surface,
	border: `1.5px solid ${T.border}`,
	borderRadius: 8,
	padding: "6px 12px",
	fontSize: 12, fontWeight: 600,
	color: T.accent,
	cursor: "pointer",
	whiteSpace: "nowrap",
};

const indexThStyle = {
	padding: "10px 14px",
	textAlign: "center",
	borderRight: `1px solid ${T.border}`,
	fontSize: 11,
	color: T.muted,
	fontWeight: 600,
	width: 36,
};

const indexTdStyle = {
	padding: "9px 14px",
	textAlign: "center",
	borderRight: `1px solid ${T.border}`,
	fontSize: 11,
	color: T.muted,
	fontVariantNumeric: "tabular-nums",
};

function TableSkeleton() {
	return (
		<div style={{ padding: "0 0 16px" }}>
			<style>{`@keyframes shimmer { 0%{opacity:1} 50%{opacity:0.35} 100%{opacity:1} }`}</style>
			<div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${T.border}`, background: T.base, padding: "12px 16px" }}>
				{[80, 140, 120, 100, 90, 110].map((w, i) => (
					<div key={i} style={{ width: w, height: 12, borderRadius: 4, background: T.border, marginRight: 32, animation: "shimmer 1.4s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
				))}
			</div>
			{[...Array(7)].map((_, ri) => (
				<div key={ri} style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.border}`, background: ri % 2 === 0 ? T.surface : T.base, padding: "11px 16px" }}>
					{[80, 140, 120, 100, 90, 110].map((w, ci) => (
						<div key={ci} style={{ width: w * (0.7 + Math.random() * 0.5), height: 11, borderRadius: 4, background: T.border, marginRight: 32, animation: "shimmer 1.4s ease-in-out infinite", animationDelay: `${(ri * 6 + ci) * 0.07}s` }} />
					))}
				</div>
			))}
		</div>
	);
}

export default function TableCreatorIndex() {
	const router = useRouter();
	const reduxUser = useSelector((s) => s.user?.user);

	const [urls, setUrls] = useState([""]);
	const [prompt, setPrompt] = useState("");
	const [globalFilter, setGlobalFilter] = useState("");
	const [sorting, setSorting] = useState([]);
	const [copied, setCopied] = useState(false);
	const [savedTables, setSavedTables] = useState([]);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [saving, setSaving] = useState(false);
	const [tableData, setTableData] = useState(null);

	useEffect(() => {
		if (!reduxUser) {
			setSavedTables([]);
			return;
		}
		const load = async () => {
			try {
				const q = query(
					collection(db, "tables"),
					where("userId", "==", reduxUser.uid),
				);
				const snap = await getDocs(q);
				const tables = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
				tables.sort((a, b) => {
					const aT = a.createdAt?.toMillis?.() ?? a.createdAt?.getTime?.() ?? 0;
					const bT = b.createdAt?.toMillis?.() ?? b.createdAt?.getTime?.() ?? 0;
					return bT - aT;
				});
				setSavedTables(tables);
			} catch (e) {
				console.error("Failed to load tables", e);
			}
		};
		load();
	}, [reduxUser]);

	const mutation = useMutation({
		mutationFn: async ({ urls: urlList, prompt: p }) => {
			if (!auth.currentUser) throw new Error("Please sign in to use this feature.");
			const idToken = await auth.currentUser.getIdToken();
			const validUrls = urlList.map((u) => u.trim()).filter(Boolean);
			const res = await fetch("/api/automations/table-generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ urls: validUrls, prompt: p, idToken }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Table generation failed.");
			return data;
		},
		onSuccess: (data) => {
			setTableData(data);
		},
	});

	const displayTableData = tableData ?? mutation.data;

	const tableColumns = useMemo(() => {
		if (!displayTableData?.columns?.length) return [];
		return displayTableData.columns.map((col) => ({
			id: col.key,
			accessorKey: col.key,
			header: ({ column }) => (
				<div
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
				>
					<span style={{ fontWeight: 700, fontSize: 12, color: T.accent }}>{col.label}</span>
					<SortIcon sorted={column.getIsSorted()} />
				</div>
			),
			cell: ({ getValue }) => <CellValue value={getValue()} type={col.type} />,
			sortingFn: col.type === "number" || col.type === "percentage" ? "basic" : col.type === "date" ? "datetime" : "alphanumeric",
			enableSorting: true,
			enableGlobalFilter: col.type === "text" || col.type === "url" || col.type === "date",
		}));
	}, [displayTableData?.columns]);

	const tableRows = useMemo(() => displayTableData?.rows || [], [displayTableData?.rows]);

	const table = useReactTable({
		data: tableRows,
		columns: tableColumns,
		state: { sorting, globalFilter },
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
	});

	const addUrl = () => setUrls((p) => [...p, ""]);
	const updateUrl = (i, v) => setUrls((p) => {
		const n = [...p];
		n[i] = v;
		return n;
	});
	const removeUrl = (i) => setUrls((p) => p.filter((_, idx) => idx !== i));

	const handleGenerate = useCallback(() => {
		const validUrls = urls.map((u) => u.trim()).filter(Boolean);
		if (validUrls.length === 0 || !prompt.trim() || mutation.isPending) return;
		setSorting([]);
		setGlobalFilter("");
		setTableData(null);
		mutation.mutate({ urls: validUrls, prompt: prompt.trim() });
	}, [urls, prompt, mutation]);

	const handleCopyMarkdown = useCallback(async () => {
		if (!displayTableData) return;
		const md = tableToMarkdown(displayTableData.columns, table.getFilteredRowModel().rows.map((r) => r.original));
		await navigator.clipboard.writeText(md);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [displayTableData, table]);

	const handleExportCsv = useCallback(() => {
		if (!displayTableData) return;
		const name = (displayTableData.title || "table").replace(/[^a-z0-9]/gi, "-").toLowerCase();
		const headers = displayTableData.columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");
		const lines = table.getFilteredRowModel().rows.map((row) =>
			displayTableData.columns.map((c) => {
				const v = row.original[c.key] ?? "";
				return `"${String(v).replace(/"/g, '""')}"`;
			}).join(",")
		);
		const csv = [headers, ...lines].join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${name}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}, [displayTableData, table]);

	const handleSave = useCallback(async () => {
		if (!displayTableData || !reduxUser || saving) return;
		setSaving(true);
		try {
			const docRef = await addDoc(collection(db, "tables"), {
				userId: reduxUser.uid,
				title: displayTableData.title || "Untitled Table",
				description: displayTableData.description || "",
				columns: displayTableData.columns || [],
				rows: displayTableData.rows || [],
				sourceUrls: displayTableData.sourceUrls || [displayTableData.sourceUrl].filter(Boolean),
				createdAt: serverTimestamp(),
			});
			setSavedTables((prev) => [
				{ id: docRef.id, title: displayTableData.title, createdAt: new Date() },
				...prev,
			]);
			router.push(`/app/table-creator/${docRef.id}`);
		} catch (e) {
			console.error("Save failed", e);
		} finally {
			setSaving(false);
		}
	}, [displayTableData, reduxUser, saving, router]);

	const handleOpenTable = useCallback((id) => {
		router.push(`/app/table-creator/${id}`);
	}, [router]);

	const visibleRowCount = table.getFilteredRowModel().rows.length;
	const totalRowCount = tableRows.length;

	return (
		<div style={{ minHeight: "100vh", background: T.base, display: "flex", flexDirection: "column" }}>
			<FontLink />
			<div style={{ height: 56, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 12, position: "sticky", top: 0, zIndex: 40 }}>
				<motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }} onClick={() => router.push("/app")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 13, padding: "4px 8px", borderRadius: 6 }}>
					<Ic d={ICONS.arrowLeft} size={14} stroke={T.muted} />
					Back
				</motion.button>
				<motion.button whileHover={{ background: "#F0ECE5" }} whileTap={{ scale: 0.95 }} onClick={() => setSidebarOpen((s) => !s)} style={{ display: "flex", alignItems: "center", padding: "6px 8px", background: "none", border: "none", borderRadius: 8, cursor: "pointer" }}>
					<Ic d={sidebarOpen ? ICONS.chevronL : ICONS.chevronR} size={16} stroke={T.muted} />
				</motion.button>
				<div style={{ width: 1, height: 20, background: T.border }} />
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<Ic d={ICONS.table} size={16} stroke={T.warm} />
					<span style={{ fontSize: 14, fontWeight: 700, color: T.accent }}>Table Creator</span>
					<span style={{ fontSize: 11, fontWeight: 600, background: "#FEF3E2", color: T.warm, border: "1px solid #F5C97A", borderRadius: 20, padding: "2px 8px" }}>AI + Scrape</span>
				</div>
				<div style={{ flex: 1 }} />
				{reduxUser && <span style={{ fontSize: 12, color: T.muted }}>{reduxUser.email}</span>}
			</div>

			<div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
				<AnimatePresence initial={false}>
					{reduxUser && sidebarOpen && (
						<motion.aside
							initial={{ width: 0, opacity: 0 }}
							animate={{ width: 260, opacity: 1 }}
							exit={{ width: 0, opacity: 0 }}
							transition={{ duration: 0.25 }}
							style={{ background: T.sidebar, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}
						>
							<div style={{ padding: "16px 14px", borderBottom: `1px solid ${T.border}` }}>
								<p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, marginBottom: 10 }}>Saved tables</p>
								{savedTables.length === 0 ? (
									<p style={{ fontSize: 12, color: T.muted }}>No saved tables yet</p>
								) : (
									<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
										{savedTables.map((t) => (
											<motion.button
												key={t.id}
												whileHover={{ x: 2 }}
												whileTap={{ scale: 0.98 }}
												onClick={() => handleOpenTable(t.id)}
												style={{
													textAlign: "left",
													padding: "10px 12px",
													borderRadius: 8,
													border: "none",
													background: "transparent",
													cursor: "pointer",
													fontSize: 13,
													fontWeight: 600,
													color: T.accent,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
												}}
											>
												{t.title || "Untitled"}
											</motion.button>
										))}
									</div>
								)}
							</div>
						</motion.aside>
					)}
				</AnimatePresence>

				<div style={{ flex: 1, overflowY: "auto", maxWidth: 1100, margin: "0 auto", width: "100%", padding: "28px 20px" }}>
					<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, marginBottom: 24, boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}>
						<p style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 4 }}>Scrape URLs and generate a structured table</p>
						<p style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>Paste one or more URLs — the AI will scrape content and build a sortable table. Uses 2 credits.</p>
						<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
							<div>
								<label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>URLs to scrape</label>
								{urls.map((urlVal, idx) => (
									<div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
										<div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "0 12px", background: T.base }}>
											<Ic d={ICONS.link} d2={ICONS.link2} size={14} stroke={T.muted} />
											<input value={urlVal} onChange={(e) => updateUrl(idx, e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleGenerate()} placeholder={`https://example.com/page${idx > 0 ? `-${idx + 1}` : ""}`} style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: T.accent, padding: "11px 0" }} />
										</div>
										{urls.length > 1 && (
											<motion.button whileHover={{ background: "#FEE2E2" }} whileTap={{ scale: 0.95 }} onClick={() => removeUrl(idx)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
												<Ic d={ICONS.trash} size={14} stroke="#EF4444" />
											</motion.button>
										)}
									</div>
								))}
								<motion.button whileHover={{ background: "#F0ECE5" }} whileTap={{ scale: 0.97 }} onClick={addUrl} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px dashed ${T.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: T.muted, cursor: "pointer" }}>
									<Ic d={ICONS.plus} size={13} stroke={T.muted} />
									Add another URL
								</motion.button>
							</div>
							<div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
								<div style={{ flex: "2 1 320px", minWidth: 200 }}>
									<label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>What table to create?</label>
									<div style={{ display: "flex", alignItems: "center", gap: 10, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "0 12px", background: T.base }}>
										<Ic d={ICONS.zap} size={14} stroke={T.muted} />
										<input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleGenerate()} placeholder="e.g. Compare pricing plans with features and prices" style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: T.accent, padding: "11px 0" }} />
									</div>
								</div>
								<motion.button
									whileHover={{ scale: 1.03 }}
									whileTap={{ scale: 0.97 }}
									onClick={handleGenerate}
									disabled={urls.every((u) => !u.trim()) || !prompt.trim() || mutation.isPending}
									style={{
										background: (urls.every((u) => !u.trim()) || !prompt.trim() || mutation.isPending) ? "#E8E4DC" : T.accent,
										color: (urls.every((u) => !u.trim()) || !prompt.trim() || mutation.isPending) ? T.muted : "white",
										border: "none",
										padding: "11px 22px",
										borderRadius: 10,
										fontSize: 13,
										fontWeight: 700,
										cursor: (urls.every((u) => !u.trim()) || !prompt.trim() || mutation.isPending) ? "not-allowed" : "pointer",
										display: "flex",
										alignItems: "center",
										gap: 8,
										whiteSpace: "nowrap",
										transition: "all 0.15s",
									}}
								>
									{mutation.isPending ? (
										<>
											<motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "inline-flex" }}>
												<Ic d={ICONS.spinner} size={14} stroke="currentColor" />
											</motion.span>
											Generating…
										</>
									) : (
										<><Ic d={ICONS.zap} size={14} stroke="currentColor" />Generate Table</>
									)}
								</motion.button>
							</div>
						</div>
						{mutation.isPending && (
							<p style={{ fontSize: 12, color: T.muted, marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
								<Ic d={ICONS.info} size={13} stroke={T.muted} />
								Fetching content from {urls.filter((u) => u.trim()).length} URL(s) and building table — this may take a moment for large pages.
							</p>
						)}
						<AnimatePresence>
							{mutation.isError && (
								<motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginTop: 14, background: T.redBg, border: `1px solid #FCA5A5`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
									<Ic d={ICONS.info} size={14} stroke={T.red} />
									<span style={{ fontSize: 13, color: T.red }}>{mutation.error?.message}</span>
								</motion.div>
							)}
						</AnimatePresence>
					</motion.div>

					<AnimatePresence>
						{(mutation.isPending || displayTableData) && (
							<motion.div key="table-output" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}>
								<div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
									<div style={{ flex: 1, minWidth: 200 }}>
										{mutation.isPending ? (
											<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
												<div style={{ width: 200, height: 14, background: T.border, borderRadius: 6, animation: "pulse 1.5s ease-in-out infinite" }} />
												<div style={{ width: 140, height: 11, background: T.base, borderRadius: 6, animation: "pulse 1.5s ease-in-out infinite" }} />
												<style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
											</div>
										) : (
											<>
												<p style={{ fontSize: 15, fontWeight: 700, color: T.accent, marginBottom: 2 }}>{displayTableData?.title}</p>
												{displayTableData?.description && <p style={{ fontSize: 12, color: T.muted }}>{displayTableData.description}</p>}
											</>
										)}
									</div>
									{displayTableData && (
										<>
											<span style={{ fontSize: 12, fontWeight: 600, color: T.muted, background: T.base, borderRadius: 20, padding: "4px 10px", whiteSpace: "nowrap" }}>
												{visibleRowCount === totalRowCount ? `${totalRowCount} rows` : `${visibleRowCount} / ${totalRowCount} rows`}
												{" · "}{displayTableData.columns.length} cols
											</span>
											<div style={{ display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", background: T.base }}>
												<Ic d={ICONS.search} size={13} stroke={T.muted} />
												<input value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Filter rows…" style={{ border: "none", background: "transparent", fontSize: 12, color: T.accent, width: 130 }} />
											</div>
											{reduxUser && (
												<motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleSave} disabled={saving} style={{ ...actionBtnStyle, background: T.greenBg, color: T.green }}>
													<Ic d={ICONS.save} size={13} stroke={T.green} />
													{saving ? "Saving…" : "Save"}
												</motion.button>
											)}
											<motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleCopyMarkdown} style={actionBtnStyle}>
												<Ic d={ICONS.copy} size={13} stroke="currentColor" />
												{copied ? "Copied!" : "Copy MD"}
											</motion.button>
											<motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleExportCsv} style={{ ...actionBtnStyle, background: T.accent, color: "white" }}>
												<Ic d={ICONS.download} size={13} stroke="currentColor" />
												Download CSV
											</motion.button>
										</>
									)}
								</div>
								{mutation.isPending ? (
									<TableSkeleton />
								) : displayTableData ? (
									<div style={{ overflowX: "auto" }}>
										<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: T.accent }}>
											<thead>
												{table.getHeaderGroups().map((hg) => (
													<tr key={hg.id} style={{ background: T.base, borderBottom: `2px solid ${T.border}` }}>
														<th style={indexThStyle}>#</th>
														{hg.headers.map((header) => (
															<th
																key={header.id}
																style={{ padding: "10px 14px", textAlign: "left", borderRight: `1px solid ${T.border}`, whiteSpace: "nowrap", cursor: header.column.getCanSort() ? "pointer" : "default", userSelect: "none" }}
																onClick={header.column.getToggleSortingHandler()}
															>
																{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
															</th>
														))}
													</tr>
												))}
											</thead>
											<tbody>
												{table.getRowModel().rows.length === 0 ? (
													<tr>
														<td colSpan={tableColumns.length + 1} style={{ padding: "40px 20px", textAlign: "center", color: T.muted, fontSize: 13 }}>No rows match your filter.</td>
													</tr>
												) : (
													table.getRowModel().rows.map((row, rowIdx) => (
														<tr
															key={row.id}
															style={{ background: rowIdx % 2 === 0 ? T.surface : T.base, borderBottom: `1px solid ${T.border}`, transition: "background 0.1s" }}
															onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF3E2")}
															onMouseLeave={(e) => (e.currentTarget.style.background = rowIdx % 2 === 0 ? T.surface : T.base)}
														>
															<td style={indexTdStyle}>{rowIdx + 1}</td>
															{row.getVisibleCells().map((cell) => (
																<td key={cell.id} style={{ padding: "9px 14px", borderRight: `1px solid ${T.border}`, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle" }}>
																	{flexRender(cell.column.columnDef.cell, cell.getContext())}
																</td>
															))}
														</tr>
													))
												)}
											</tbody>
										</table>
									</div>
								) : null}
								{(displayTableData?.sourceUrls?.length > 0 || displayTableData?.sourceUrl) && (
									<div style={{ padding: "10px 20px", borderTop: `1px solid ${T.border}`, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 16px" }}>
										<Ic d={ICONS.link} size={12} stroke={T.muted} />
										<span style={{ fontSize: 11, color: T.muted }}>Source{displayTableData.sourceUrls?.length > 1 ? "s" : ""}:</span>
										{(displayTableData.sourceUrls || [displayTableData.sourceUrl]).filter(Boolean).map((u) => (
											<a key={u} href={u} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: T.warm, textDecoration: "none" }}>
												{u.replace(/^https?:\/\//, "").slice(0, 50)}
												{(u.replace(/^https?:\/\//, "").length > 50 ? "…" : "")}
											</a>
										))}
									</div>
								)}
							</motion.div>
						)}
					</AnimatePresence>

					{!mutation.isPending && !displayTableData && !mutation.isError && (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ border: `2px dashed ${T.border}`, borderRadius: 14, padding: "60px 24px", textAlign: "center" }}>
							<div style={{ width: 48, height: 48, borderRadius: 12, background: T.base, border: `1.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
								<Ic d={ICONS.table} size={22} stroke={T.muted} />
							</div>
							<p style={{ fontSize: 15, fontWeight: 700, color: T.accent, marginBottom: 6 }}>No table yet</p>
							<p style={{ fontSize: 13, color: T.muted, maxWidth: 360, margin: "0 auto" }}>
								Enter one or more URLs and describe the table you want. The AI will scrape the pages and extract structured data with sortable columns. Save tables to access them later.
							</p>
						</motion.div>
					)}
				</div>
			</div>
		</div>
	);
}
