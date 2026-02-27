import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import {
	collection,
	getDocs,
	getDoc,
	doc,
	query,
	where,
} from "firebase/firestore";
import { db } from "../../../lib/config/firebase";
import TableView from "../../../lib/ui/TableView";

const T = {
	base: "#F7F5F0",
	surface: "#FFFFFF",
	accent: "#1A1A1A",
	warm: "#C17B2F",
	muted: "#7A7570",
	border: "#E8E4DC",
	sidebar: "#FDFCF9",
};

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
	chevronL: "M15 18l-6-6 6-6",
	chevronR: "M9 18l6-6-6-6",
	plus: "M12 5v14M5 12h14",
};

export default function TableCreatorView() {
	const router = useRouter();
	const { id } = router.query;
	const reduxUser = useSelector((s) => s.user?.user);

	const [tableData, setTableData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [savedTables, setSavedTables] = useState([]);
	const [sidebarOpen, setSidebarOpen] = useState(true);

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

	const handleOpenTable = useCallback((tableId) => {
		router.push(`/app/${tableId}`);
	}, [router]);

	/* Redirect old /app/table-creator/[id] URLs to /app/[id] */
	useEffect(() => {
		if (id) router.replace(`/app/${id}`);
	}, [id, router]);

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
					<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
						<TableView
							tableId={id}
							tableData={tableData}
							setTableData={setTableData}
							reduxUser={reduxUser}
						/>
					</motion.div>
				</div>
			</div>
		</div>
	);
}
