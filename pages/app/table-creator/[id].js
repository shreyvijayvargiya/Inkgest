import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
} from "@tanstack/react-table";
import {
	collection,
	getDocs,
	getDoc,
	doc,
	query,
	where,
	updateDoc,
	serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../lib/config/firebase";
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from "../../../lib/ui/Table";
import { getTheme } from "../../../lib/utils/theme";

const T = getTheme();

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

const Ic = ({ d, d2, size = 16, stroke = T.muted, sw = 1.75 }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
		<path d={d} />
		{d2 && <path d={d2} />}
	</svg>
);

const ICONS = {
	arrowLeft: "M19 12H5M5 12l7 7M5 12l7-7",
	table: "M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18",
	sortAsc: "M3 6h14M3 12h9M3 18h4M16 18V6M13 9l3-3 3 3",
	sortDesc: "M3 6h14M3 12h9M3 18h4M16 6v12M13 15l3 3 3-3",
	sortNone: "M3 6h18M3 12h18M3 18h18",
	search: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
	copy: "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-4-4H8z M14 2v6h6",
	download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
	externalLink: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3",
	chevronL: "M15 18l-6-6 6-6",
	chevronR: "M9 18l6-6-6-6",
	save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8",
	plus: "M12 5v14M5 12h14",
	trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
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

/* ─── Editable cell ───────────────────────────────────────────────────────── */
function EditableCell({
	value,
	type,
	rowIdx,
	colKey,
	onSave,
}) {
	const [editing, setEditing] = useState(false);
	const [editVal, setEditVal] = useState(String(value ?? ""));

	useEffect(() => {
		setEditVal(String(value ?? ""));
	}, [value]);

	const handleSave = useCallback(() => {
		setEditing(false);
		const trimmed = editVal.trim();
		if (String(value ?? "") !== trimmed) {
			onSave(rowIdx, colKey, trimmed);
		}
	}, [editVal, value, rowIdx, colKey, onSave]);

	if (editing) {
		return (
			<input
				autoFocus
				value={editVal}
				onChange={(e) => setEditVal(e.target.value)}
				onBlur={handleSave}
				onKeyDown={(e) => {
					if (e.key === "Enter") handleSave();
					if (e.key === "Escape") {
						setEditVal(String(value ?? ""));
						setEditing(false);
					}
				}}
				style={{
					width: "100%",
					minWidth: 60,
					border: `1.5px solid ${T.warm}`,
					borderRadius: 6,
					padding: "4px 8px",
					fontSize: 13,
					color: T.accent,
					background: T.surface,
				}}
			/>
		);
	}

	if (value === null || value === undefined || value === "") {
		return (
			<span
				onClick={() => setEditing(true)}
				style={{
					color: T.border,
					cursor: "pointer",
					minHeight: 24,
					display: "inline-block",
					padding: "2px 0",
				}}
				title="Click to edit"
			>
				—
			</span>
		);
	}

	if (type === "url") {
		return (
			<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
				<a
					href={value}
					target="_blank"
					rel="noopener noreferrer"
					onClick={(e) => e.stopPropagation()}
					style={{
						color: T.warm,
						textDecoration: "none",
						maxWidth: 180,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{String(value).replace(/^https?:\/\//, "").slice(0, 40)}
				</a>
				<Ic d={ICONS.externalLink} size={11} stroke={T.warm} />
				<span
					onClick={() => setEditing(true)}
					style={{ cursor: "pointer", marginLeft: 4, fontSize: 10, color: T.muted }}
					title="Edit"
				>
					✎
				</span>
			</div>
		);
	}

	return (
		<span
			onClick={() => setEditing(true)}
			style={{
				cursor: "pointer",
				display: "block",
				minHeight: 24,
				padding: "2px 0",
			}}
			title="Click to edit"
		>
			{type === "number" || type === "percentage" ? (
				<span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
			) : (
				String(value)
			)}
		</span>
	);
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

export default function TableCreatorView() {
	const router = useRouter();
	const { id } = router.query;
	const reduxUser = useSelector((s) => s.user?.user);

	const [tableData, setTableData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [globalFilter, setGlobalFilter] = useState("");
	const [sorting, setSorting] = useState([]);
	const [copied, setCopied] = useState(false);
	const [savedTables, setSavedTables] = useState([]);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [savingCell, setSavingCell] = useState(false);
	const [savingTable, setSavingTable] = useState(false);
	const [editingTitle, setEditingTitle] = useState(false);
	const [editingDesc, setEditingDesc] = useState(false);
	const [addColumnOpen, setAddColumnOpen] = useState(false);
	const [newColKey, setNewColKey] = useState("");
	const [newColLabel, setNewColLabel] = useState("");
	const [newColType, setNewColType] = useState("text");

	useEffect(() => {
		if (!id || !reduxUser) return;
		const load = async () => {
			setLoading(true);
			setError(null);
			try {
				const d = await getDoc(doc(db, "tables", id));
				if (!d.exists()) {
					setError("Table not found");
					setTableData(null);
					return;
				}
				const data = d.data();
				if (data.userId !== reduxUser.uid) {
					setError("Access denied");
					setTableData(null);
					return;
				}
				setTableData({
					title: data.title,
					description: data.description,
					columns: data.columns || [],
					rows: data.rows || [],
					sourceUrls: data.sourceUrls || [],
				});
			} catch (e) {
				console.error("Failed to load table", e);
				setError("Failed to load table");
				setTableData(null);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [id, reduxUser]);

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

	const handleSaveCell = useCallback(async (rowIdx, colKey, newVal) => {
		if (!tableData || savingCell) return;
		setSavingCell(true);
		const newRows = [...tableData.rows];
		if (!newRows[rowIdx]) return;
		newRows[rowIdx] = { ...newRows[rowIdx], [colKey]: newVal };
		setTableData((prev) => ({ ...prev, rows: newRows }));
		try {
			await updateDoc(doc(db, "tables", id), { rows: newRows, updatedAt: serverTimestamp() });
		} catch (e) {
			console.error("Failed to save cell", e);
			setTableData((prev) => ({ ...prev, rows: tableData.rows }));
		} finally {
			setSavingCell(false);
		}
	}, [tableData, id, savingCell]);

	const handleSaveTable = useCallback(async () => {
		if (!tableData || savingTable) return;
		setSavingTable(true);
		try {
			await updateDoc(doc(db, "tables", id), {
				title: tableData.title || "Untitled Table",
				description: tableData.description || "",
				columns: tableData.columns || [],
				rows: tableData.rows || [],
				updatedAt: serverTimestamp(),
			});
			setSavedTables((prev) => prev.map((t) => (t.id === id ? { ...t, title: tableData.title } : t)));
		} catch (e) {
			console.error("Failed to save table", e);
		} finally {
			setSavingTable(false);
		}
	}, [tableData, id, savingTable]);

	const handleAddRow = useCallback(() => {
		if (!tableData?.columns?.length) return;
		const newRow = {};
		tableData.columns.forEach((c) => { newRow[c.key] = ""; });
		const newRows = [...(tableData.rows || []), newRow];
		setTableData((prev) => ({ ...prev, rows: newRows }));
		updateDoc(doc(db, "tables", id), { rows: newRows, updatedAt: serverTimestamp() }).catch(console.error);
	}, [tableData, id]);

	const handleAddColumn = useCallback(() => {
		let key = (newColKey || newColLabel || "col").trim().toLowerCase().replace(/\s+/g, "_") || "col";
		const label = (newColLabel || newColKey || "New Column").trim() || "New Column";
		const existing = tableData?.columns || [];
		let suffix = 0;
		while (existing.some((c) => c.key === key)) {
			const base = key.replace(/_?\d+$/, "") || "col";
			key = `${base}_${++suffix}`;
		}
		const newCol = { key, label, type: newColType };
		const newColumns = [...existing, newCol];
		const newRows = (tableData.rows || []).map((row) => ({ ...row, [key]: "" }));
		setTableData((prev) => ({ ...prev, columns: newColumns, rows: newRows }));
		setAddColumnOpen(false);
		setNewColKey("");
		setNewColLabel("");
		setNewColType("text");
		updateDoc(doc(db, "tables", id), { columns: newColumns, rows: newRows, updatedAt: serverTimestamp() }).catch(console.error);
	}, [tableData, id, newColKey, newColLabel, newColType]);

	const handleDeleteRow = useCallback((rowIdx) => {
		if (!tableData?.rows?.length) return;
		const newRows = tableData.rows.filter((_, i) => i !== rowIdx);
		setTableData((prev) => ({ ...prev, rows: newRows }));
		updateDoc(doc(db, "tables", id), { rows: newRows, updatedAt: serverTimestamp() }).catch(console.error);
	}, [tableData, id]);

	const handleDeleteColumn = useCallback((colKey) => {
		if (!tableData?.columns?.length || tableData.columns.length <= 1) return;
		const newColumns = tableData.columns.filter((c) => c.key !== colKey);
		const newRows = tableData.rows.map((row) => {
			const { [colKey]: _, ...rest } = row;
			return rest;
		});
		setTableData((prev) => ({ ...prev, columns: newColumns, rows: newRows }));
		updateDoc(doc(db, "tables", id), { columns: newColumns, rows: newRows, updatedAt: serverTimestamp() }).catch(console.error);
	}, [tableData, id]);

	const tableColumns = useMemo(() => {
		if (!tableData?.columns?.length) return [];
		const canDeleteCol = tableData.columns.length > 1;
		return tableData.columns.map((col) => ({
			id: col.key,
			accessorKey: col.key,
			header: ({ column }) => (
				<div style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
					<div
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none", flex: 1 }}
					>
						<span style={{ fontWeight: 700, fontSize: 12, color: T.accent }}>{col.label}</span>
						<SortIcon sorted={column.getIsSorted()} />
					</div>
					{canDeleteCol && (
						<motion.button
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
							onClick={(e) => { e.stopPropagation(); handleDeleteColumn(col.key); }}
							title="Delete column"
							style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}
						>
							<Ic d={ICONS.trash} size={12} stroke="#EF4444" />
						</motion.button>
					)}
				</div>
			),
			cell: ({ getValue, row, column }) => (
				<EditableCell
					value={getValue()}
					type={col.type}
					rowIdx={row.index}
					colKey={col.key}
					onSave={handleSaveCell}
				/>
			),
			sortingFn: col.type === "number" || col.type === "percentage" ? "basic" : col.type === "date" ? "datetime" : "alphanumeric",
			enableSorting: true,
			enableGlobalFilter: col.type === "text" || col.type === "url" || col.type === "date",
		}));
	}, [tableData?.columns, handleSaveCell, handleDeleteColumn]);

	const tableRows = useMemo(() => tableData?.rows || [], [tableData?.rows]);

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

	const handleCopyMarkdown = useCallback(async () => {
		if (!tableData) return;
		const md = tableToMarkdown(tableData.columns, table.getFilteredRowModel().rows.map((r) => r.original));
		await navigator.clipboard.writeText(md);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [tableData, table]);

	const handleExportCsv = useCallback(() => {
		if (!tableData) return;
		const name = (tableData.title || "table").replace(/[^a-z0-9]/gi, "-").toLowerCase();
		const headers = tableData.columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");
		const lines = table.getFilteredRowModel().rows.map((row) =>
			tableData.columns.map((c) => {
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
	}, [tableData, table]);

	const handleOpenTable = useCallback((tableId) => {
		router.push(`/app/table-creator/${tableId}`);
	}, [router]);

	const visibleRowCount = table.getFilteredRowModel().rows.length;
	const totalRowCount = tableRows.length;

	if (loading) {
		return (
			<div style={{ minHeight: "100vh", background: T.base, display: "flex", alignItems: "center", justifyContent: "center" }}>
				<FontLink />
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
					<motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
						<Ic d="M12 2a10 10 0 0 1 10 10" size={32} stroke={T.warm} sw={2} />
					</motion.span>
					<span style={{ fontSize: 14, color: T.muted }}>Loading table…</span>
				</div>
			</div>
		);
	}

	if (error || !tableData) {
		return (
			<div style={{ minHeight: "100vh", background: T.base, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
				<FontLink />
				<p style={{ fontSize: 16, color: T.accent, marginBottom: 12 }}>{error || "Table not found"}</p>
				<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => router.push("/app/table-creator")} style={{ background: T.accent, color: "white", border: "none", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
					Back to Table Creator
				</motion.button>
			</div>
		);
	}

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
					<span style={{ fontSize: 14, fontWeight: 700, color: T.accent }}>{tableData.title || "Untitled"}</span>
				</div>
				<div style={{ flex: 1 }} />
				<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => router.push("/app/table-creator")} style={{ display: "flex", alignItems: "center", gap: 6, background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: T.accent, cursor: "pointer" }}>
					<Ic d={ICONS.plus} size={13} stroke={T.warm} />
					New table
				</motion.button>
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
													background: id === t.id ? T.surface : "transparent",
													boxShadow: id === t.id ? "0 1px 8px rgba(0,0,0,0.06)" : "none",
													borderLeft: id === t.id ? `3px solid ${T.warm}` : "3px solid transparent",
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
					<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 12px rgba(0,0,0,0.05)" }}>
						<div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 14 }}>
							{/* Editable title & description */}
							<div style={{ flex: 1, minWidth: 200 }}>
								{editingTitle ? (
									<input
										autoFocus
										value={tableData.title || ""}
										onChange={(e) => setTableData((p) => ({ ...p, title: e.target.value }))}
										onBlur={() => setEditingTitle(false)}
										onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
										placeholder="Table name"
										style={{
											fontSize: 15, fontWeight: 700, color: T.accent, marginBottom: 4,
											border: `1.5px solid ${T.warm}`, borderRadius: 8, padding: "6px 10px",
											width: "100%", maxWidth: 400, background: T.surface,
										}}
									/>
								) : (
									<p style={{ fontSize: 15, fontWeight: 700, color: T.accent, marginBottom: 2, cursor: "pointer" }} onClick={() => setEditingTitle(true)} title="Click to edit">
										{tableData.title || "Untitled Table"}
									</p>
								)}
								{editingDesc ? (
									<textarea
										autoFocus
										value={tableData.description || ""}
										onChange={(e) => setTableData((p) => ({ ...p, description: e.target.value }))}
										onBlur={() => setEditingDesc(false)}
										placeholder="Description (optional)"
										rows={2}
										style={{
											fontSize: 12, color: T.muted,
											border: `1.5px solid ${T.warm}`, borderRadius: 8, padding: "6px 10px",
											width: "100%", maxWidth: 400, background: T.surface, resize: "vertical",
										}}
									/>
								) : (
									<p style={{ fontSize: 12, color: T.muted, cursor: "pointer", minHeight: 18 }} onClick={() => setEditingDesc(true)} title="Click to edit">
										{tableData.description || "Add description…"}
									</p>
								)}
							</div>
							{/* Actions row */}
							<div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
								<span style={{ fontSize: 12, fontWeight: 600, color: T.muted, background: T.base, borderRadius: 20, padding: "4px 10px", whiteSpace: "nowrap" }}>
									{visibleRowCount === totalRowCount ? `${totalRowCount} rows` : `${visibleRowCount} / ${totalRowCount} rows`}
									{" · "}{tableData.columns.length} cols
									{savingCell && " · Saving…"}
								</span>
								<div style={{ display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", background: T.base }}>
									<Ic d={ICONS.search} size={13} stroke={T.muted} />
									<input value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Filter rows…" style={{ border: "none", background: "transparent", fontSize: 12, color: T.accent, width: 130 }} />
								</div>
								<motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleSaveTable} disabled={savingTable} style={{ ...actionBtnStyle, background: "#DCFCE7", color: "#166534" }}>
									<Ic d={ICONS.save} size={13} stroke="#166534" />
									{savingTable ? "Saving…" : "Save"}
								</motion.button>
								<motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleAddRow} style={{ ...actionBtnStyle }}>
									<Ic d={ICONS.plus} size={13} stroke="currentColor" />
									Add row
								</motion.button>
								<motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setAddColumnOpen(true)} style={{ ...actionBtnStyle }}>
									<Ic d={ICONS.plus} size={13} stroke="currentColor" />
									Add column
								</motion.button>
								<motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleCopyMarkdown} style={actionBtnStyle}>
									<Ic d={ICONS.copy} size={13} stroke="currentColor" />
									{copied ? "Copied!" : "Copy MD"}
								</motion.button>
								<motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleExportCsv} style={{ ...actionBtnStyle, background: T.accent, color: "white" }}>
									<Ic d={ICONS.download} size={13} stroke="currentColor" />
									Download CSV
								</motion.button>
							</div>
						</div>

						{/* Add column modal */}
						<AnimatePresence>
							{addColumnOpen && (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									style={{
										position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50,
										display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
									}}
									onClick={() => setAddColumnOpen(false)}
								>
									<motion.div
										initial={{ scale: 0.95, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
										exit={{ scale: 0.95, opacity: 0 }}
										onClick={(e) => e.stopPropagation()}
										style={{
											background: T.surface, borderRadius: 14, padding: 24, minWidth: 320,
											boxShadow: "0 1px 12px rgba(0,0,0,0.05)", border: `1px solid ${T.border}`,
										}}
									>
										<p style={{ fontSize: 15, fontWeight: 700, color: T.accent, marginBottom: 16 }}>Add column</p>
										<div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
											<div>
												<label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 4 }}>Column label</label>
												<input value={newColLabel} onChange={(e) => setNewColLabel(e.target.value)} placeholder="e.g. Price" style={{ width: "100%", border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: T.accent }} />
											</div>
											<div>
												<label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 4 }}>Key (auto-generated if empty)</label>
												<input value={newColKey} onChange={(e) => setNewColKey(e.target.value)} placeholder="e.g. price" style={{ width: "100%", border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: T.accent }} />
											</div>
											<div>
												<label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 4 }}>Type</label>
												<select value={newColType} onChange={(e) => setNewColType(e.target.value)} style={{ width: "100%", border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: T.accent, background: T.surface }}>
													<option value="text">Text</option>
													<option value="number">Number</option>
													<option value="url">URL</option>
													<option value="date">Date</option>
													<option value="percentage">Percentage</option>
												</select>
											</div>
										</div>
										<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
											<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setAddColumnOpen(false)} style={{ ...actionBtnStyle }}>
												Cancel
											</motion.button>
											<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAddColumn} style={{ ...actionBtnStyle, background: T.accent, color: "white" }}>
												Add column
											</motion.button>
										</div>
									</motion.div>
								</motion.div>
							)}
						</AnimatePresence>

						<Table variant="inkgest">
							<TableHeader variant="inkgest">
								{table.getHeaderGroups().map((hg) => (
									<TableRow key={hg.id} variant="inkgest" hover={true}>
										<TableHead variant="inkgest" style={{ width: 36, textAlign: "center" }}>#</TableHead>
										{hg.headers.map((header) => (
											<TableHead
												key={header.id}
												variant="inkgest"
												onClick={header.column.getToggleSortingHandler()}
												sortable={header.column.getCanSort()}
											>
												{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
											</TableHead>
										))}
										<TableHead variant="inkgest" style={{ width: 44, textAlign: "center" }} />
									</TableRow>
								))}
							</TableHeader>
							<TableBody variant="inkgest">
								{table.getRowModel().rows.length === 0 ? (
									<TableRow variant="inkgest">
										<TableCell variant="inkgest" colSpan={tableColumns.length + 2} style={{ padding: "40px 20px", textAlign: "center", color: T.muted }}>
											No rows match your filter.
										</TableCell>
									</TableRow>
								) : (
									table.getRowModel().rows.map((row, rowIdx) => (
										<TableRow key={row.id} variant="inkgest" hover={true}>
											<TableCell variant="inkgest" style={{ textAlign: "center", fontSize: 11, color: T.muted, fontVariantNumeric: "tabular-nums", width: 36 }}>
												{rowIdx + 1}
											</TableCell>
											{row.getVisibleCells().map((cell) => (
												<TableCell key={cell.id} variant="inkgest" style={{ maxWidth: 280 }}>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</TableCell>
											))}
											<TableCell variant="inkgest" style={{ width: 44, textAlign: "center", padding: "4px 8px" }}>
												<motion.button
													whileHover={{ scale: 1.1, backgroundColor: "#FEE2E2" }}
													whileTap={{ scale: 0.9 }}
													onClick={() => handleDeleteRow(row.index)}
													title="Delete row"
													style={{
														background: "none", border: "none", cursor: "pointer", padding: 4,
														display: "flex", alignItems: "center", justifyContent: "center",
														borderRadius: 6,
													}}
												>
													<Ic d={ICONS.trash} size={14} stroke="#EF4444" />
												</motion.button>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>

						{tableData.sourceUrls?.length > 0 && (
							<div style={{ padding: "10px 20px", borderTop: `1px solid ${T.border}`, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 16px" }}>
								<Ic d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" size={12} stroke={T.muted} />
								<span style={{ fontSize: 11, color: T.muted }}>Source{tableData.sourceUrls?.length > 1 ? "s" : ""}:</span>
								{tableData.sourceUrls.map((u) => (
									<a key={u} href={u} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: T.warm, textDecoration: "none" }}>
										{u.replace(/^https?:\/\//, "").slice(0, 50)}
										{(u.replace(/^https?:\/\//, "").length > 50 ? "…" : "")}
									</a>
								))}
							</div>
						)}
					</motion.div>
				</div>
			</div>
		</div>
	);
}
