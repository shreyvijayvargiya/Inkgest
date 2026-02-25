import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── IndexedDB helpers ──────────────────────────────────────────────────────────
const DB_NAME = "projectmgr";
const DB_VERSION = 1;

function openDB() {
	return new Promise((res, rej) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = (e) => {
			const db = e.target.result;
			if (!db.objectStoreNames.contains("projects"))
				db.createObjectStore("projects", { keyPath: "id" });
			if (!db.objectStoreNames.contains("tasks")) {
				const ts = db.createObjectStore("tasks", { keyPath: "id" });
				ts.createIndex("projectId", "projectId");
			}
		};
		req.onsuccess = (e) => res(e.target.result);
		req.onerror = (e) => rej(e.target.error);
	});
}

async function dbGetAll(store) {
	const db = await openDB();
	return new Promise((res, rej) => {
		const tx = db.transaction(store, "readonly");
		const req = tx.objectStore(store).getAll();
		req.onsuccess = () => res(req.result);
		req.onerror = () => rej(req.error);
	});
}

async function dbPut(store, item) {
	const db = await openDB();
	return new Promise((res, rej) => {
		const tx = db.transaction(store, "readwrite");
		tx.objectStore(store).put(item);
		tx.oncomplete = () => res();
		tx.onerror = () => rej(tx.error);
	});
}

async function dbDelete(store, id) {
	const db = await openDB();
	return new Promise((res, rej) => {
		const tx = db.transaction(store, "readwrite");
		tx.objectStore(store).delete(id);
		tx.oncomplete = () => res();
		tx.onerror = () => rej(tx.error);
	});
}

// ── Design tokens (matches app theme) ────────────────────────────────────────
const T = {
	base: "#F7F5F0",
	surface: "#FFFFFF",
	accent: "#1A1A1A",
	warm: "#C17B2F",
	muted: "#7A7570",
	border: "#E8E4DC",
	sidebar: "#FDFCF9",
};

// ── Columns ───────────────────────────────────────────────────────────────────
const COLUMNS = [
	{ id: "backlog",    label: "Backlog",     dot: "#B0AAA3" },
	{ id: "todo",       label: "To Do",       dot: "#4A7C59" },
	{ id: "inprogress", label: "In Progress", dot: "#C17B2F" },
	{ id: "done",       label: "Done",        dot: "#2C5F8A" },
];

const PRIORITIES = ["Low", "Medium", "High"];

const PRIORITY_STYLES = {
	Low:    { color: "#4A7C59", bg: "#DCFCE7" },
	Medium: { color: "#C17B2F", bg: "#FEF3E2" },
	High:   { color: "#991B1B", bg: "#FEE2E2" },
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ── Global CSS ────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.base}; font-family: 'Outfit', sans-serif; color: ${T.accent}; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: ${T.warm}; }
  input, textarea, select, button { font-family: 'Outfit', sans-serif; }
  input:focus, textarea:focus, select:focus { outline: none; }
`;

// ── Inline SVG icon ───────────────────────────────────────────────────────────
function Ic({ d, d2, size = 16, stroke = T.muted, sw = 1.75 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
			<path d={d} />
			{d2 && <path d={d2} />}
		</svg>
	);
}

const ICONS = {
	plus:      "M12 5v14M5 12h14",
	chevronL:  "M15 18l-6-6 6-6",
	chevronR:  "M9 18l6-6-6-6",
	trash:     "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
	edit:      "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z",
	grip:      "M9 5h2M9 12h2M9 19h2M13 5h2M13 12h2M13 19h2",
	sidebar:   "M3 3h18v18H3z M9 3v18",
	link:      "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
	folder:    "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
};

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onAddProject, sidebarOpen, onToggleSidebar }) {
	return (
		<header style={{
			height: 56,
			background: T.surface,
			borderBottom: `1px solid ${T.border}`,
			display: "flex",
			alignItems: "center",
			padding: "0 20px",
			gap: 12,
			flexShrink: 0,
			position: "sticky",
			top: 0,
			zIndex: 40,
		}}>
			{/* Sidebar toggle */}
			<motion.button
				whileTap={{ scale: 0.92 }}
				onClick={onToggleSidebar}
				title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
				style={{
					width: 32, height: 32,
					display: "flex", alignItems: "center", justifyContent: "center",
					background: sidebarOpen ? T.base : "transparent",
					border: `1px solid ${sidebarOpen ? T.border : "transparent"}`,
					borderRadius: 8,
					cursor: "pointer",
					flexShrink: 0,
					transition: "all 0.15s",
				}}
			>
				<Ic d={ICONS.sidebar} size={15} stroke={T.muted} />
			</motion.button>

			<div style={{ width: 1, height: 20, background: T.border }} />

			{/* Brand */}
			<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
				<Ic d={ICONS.folder} size={16} stroke={T.warm} />
				<span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 17, fontWeight: 600, color: T.accent, letterSpacing: "0.01em" }}>
					ProjectDesk
				</span>
			</div>

			<div style={{ flex: 1 }} />

			<motion.button
				whileHover={{ scale: 1.03 }}
				whileTap={{ scale: 0.97 }}
				onClick={onAddProject}
				style={{
					display: "flex", alignItems: "center", gap: 6,
					background: T.accent, color: "white",
					border: "none", padding: "7px 14px",
					borderRadius: 8, fontSize: 13, fontWeight: 600,
					cursor: "pointer",
				}}
			>
				<Ic d={ICONS.plus} size={13} stroke="white" sw={2.5} />
				New Project
			</motion.button>
		</header>
	);
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ projects, selectedId, onSelect, onDelete, open }) {
	return (
		<motion.aside
			initial={false}
			animate={{ width: open ? 220 : 0, opacity: open ? 1 : 0 }}
			transition={{ duration: 0.22, ease: "easeInOut" }}
			style={{
				flexShrink: 0,
				borderRight: open ? `1px solid ${T.border}` : "none",
				background: T.sidebar,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}
		>
			{/* Header */}
			<div style={{
				padding: "12px 16px 10px",
				borderBottom: `1px solid ${T.border}`,
				display: "flex",
				alignItems: "center",
				gap: 6,
				flexShrink: 0,
			}}>
				<Ic d={ICONS.folder} size={13} stroke={T.warm} />
				<span style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
					Projects ({projects.length})
				</span>
			</div>

			{/* List */}
			<div style={{ overflowY: "auto", flex: 1, padding: "6px 0" }}>
				<AnimatePresence>
					{projects.map((p) => {
						const active = selectedId === p.id;
						return (
							<motion.div
								key={p.id}
								initial={{ opacity: 0, x: -8 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -8 }}
								onClick={() => onSelect(p.id)}
								style={{
									padding: "10px 16px",
									cursor: "pointer",
									borderLeft: `3px solid ${active ? T.warm : "transparent"}`,
									background: active ? T.base : "transparent",
									transition: "all 0.13s",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: 6,
									marginBottom: 1,
								}}
								onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = T.base; }}
								onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
							>
								<div style={{ flex: 1, minWidth: 0 }}>
									<p style={{
										fontSize: 13, fontWeight: active ? 700 : 500,
										color: active ? T.accent : T.muted,
										whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
									}}>
										{p.name}
									</p>
									{p.url && (
										<p style={{
											fontSize: 10.5, color: T.muted, marginTop: 2,
											whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
										}}>
											{p.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
										</p>
									)}
								</div>
								<button
									onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
									style={{
										background: "none", border: "none",
										color: T.border, fontSize: 15,
										padding: "2px 4px", cursor: "pointer",
										flexShrink: 0, lineHeight: 1,
										transition: "color 0.12s",
									}}
									onMouseEnter={(e) => (e.target.style.color = "#991B1B")}
									onMouseLeave={(e) => (e.target.style.color = T.border)}
									title="Delete project"
								>
									×
								</button>
							</motion.div>
						);
					})}
				</AnimatePresence>
				{projects.length === 0 && (
					<div style={{ padding: "20px 16px", fontSize: 12, color: T.muted, fontStyle: "italic", textAlign: "center", lineHeight: 1.6 }}>
						No projects yet.
						<br />Add one above ↑
					</div>
				)}
			</div>
		</motion.aside>
	);
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onEdit, onDelete, onMoveLeft, onMoveRight, colIndex, onDragStart, onDragEnd, isDragging }) {
	const p = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium;

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: isDragging ? 0.45 : 1, y: 0, scale: isDragging ? 0.97 : 1 }}
			exit={{ opacity: 0, scale: 0.95 }}
			draggable
			onDragStart={(e) => {
				e.dataTransfer.effectAllowed = "move";
				e.dataTransfer.setData("taskId", task.id);
				onDragStart(task.id);
			}}
			onDragEnd={onDragEnd}
			style={{
				background: T.surface,
				border: `1px solid ${T.border}`,
				borderRadius: 10,
				padding: "10px 12px",
				marginBottom: 8,
				boxShadow: isDragging ? "none" : "0 1px 6px rgba(0,0,0,0.06)",
				cursor: "grab",
				userSelect: "none",
				transition: "box-shadow 0.15s",
			}}
		>
			{/* Title row */}
			<div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
				{/* Drag handle */}
				<div style={{ paddingTop: 2, opacity: 0.35, flexShrink: 0 }}>
					<Ic d={ICONS.grip} size={13} stroke={T.muted} />
				</div>
				<span style={{ fontSize: 13, fontWeight: 600, color: T.accent, flex: 1, lineHeight: 1.35 }}>
					{task.title}
				</span>
				{/* Actions */}
				<div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
					<button
						onClick={() => onEdit(task)}
						style={{ background: "none", border: "none", padding: "2px 4px", cursor: "pointer", color: T.muted, lineHeight: 1 }}
						onMouseEnter={(e) => (e.target.style.color = T.accent)}
						onMouseLeave={(e) => (e.target.style.color = T.muted)}
						title="Edit"
					>
						<Ic d={ICONS.edit} size={13} stroke="currentColor" />
					</button>
					<button
						onClick={() => onDelete(task.id)}
						style={{ background: "none", border: "none", padding: "2px 4px", cursor: "pointer", color: T.muted, lineHeight: 1 }}
						onMouseEnter={(e) => (e.target.style.color = "#991B1B")}
						onMouseLeave={(e) => (e.target.style.color = T.muted)}
						title="Delete"
					>
						<Ic d={ICONS.trash} size={13} stroke="currentColor" />
					</button>
				</div>
			</div>

			{task.description && (
				<p style={{ fontSize: 11.5, color: T.muted, marginBottom: 8, lineHeight: 1.5, paddingLeft: 21 }}>
					{task.description}
				</p>
			)}

			{/* Footer */}
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 21 }}>
				<span style={{
					fontSize: 10.5, fontWeight: 700,
					color: p.color, background: p.bg,
					borderRadius: 20, padding: "2px 8px",
					letterSpacing: "0.04em",
				}}>
					{task.priority}
				</span>
				{/* Column move arrows */}
				<div style={{ display: "flex", gap: 3 }}>
					{colIndex > 0 && (
						<button
							onClick={() => onMoveLeft(task)}
							style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 5, padding: "1px 5px", cursor: "pointer", color: T.muted }}
							onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.warm)}
							onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.border)}
							title="Move left"
						>
							<Ic d={ICONS.chevronL} size={11} stroke="currentColor" />
						</button>
					)}
					{colIndex < COLUMNS.length - 1 && (
						<button
							onClick={() => onMoveRight(task)}
							style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 5, padding: "1px 5px", cursor: "pointer", color: T.muted }}
							onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.warm)}
							onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.border)}
							title="Move right"
						>
							<Ic d={ICONS.chevronR} size={11} stroke="currentColor" />
						</button>
					)}
				</div>
			</div>
		</motion.div>
	);
}

// ── Kanban Board ──────────────────────────────────────────────────────────────
function KanbanBoard({ project, tasks, onAddTask, onEditTask, onDeleteTask, onMoveTask }) {
	const [draggingId, setDraggingId] = useState(null);
	const [dragOverCol, setDragOverCol] = useState(null);

	const colTasks = (colId) => tasks.filter((t) => t.status === colId);

	const handleDrop = (e, colId) => {
		e.preventDefault();
		const taskId = e.dataTransfer.getData("taskId");
		if (!taskId) return;
		const task = tasks.find((t) => t.id === taskId);
		if (task && task.status !== colId) {
			onMoveTask(task, colId);
		}
		setDraggingId(null);
		setDragOverCol(null);
	};

	return (
		<div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
			{/* Project header */}
			<div style={{ marginBottom: 20, display: "flex", alignItems: "baseline", gap: 12 }}>
				<h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, fontWeight: 600, color: T.accent }}>
					{project.name}
				</h2>
				{project.url && (
					<a href={project.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.warm, textDecoration: "none" }}>
						<Ic d={ICONS.link} size={12} stroke={T.warm} />
					</a>
				)}
				{/* Task count badges */}
				<div style={{ display: "flex", gap: 6, marginLeft: 4 }}>
					{COLUMNS.map((col) => {
						const count = colTasks(col.id).length;
						return count > 0 ? (
							<span key={col.id} style={{
								fontSize: 10.5, fontWeight: 700,
								color: col.dot, background: `${col.dot}18`,
								borderRadius: 20, padding: "2px 8px",
							}}>
								{col.label} {count}
							</span>
						) : null;
					})}
				</div>
			</div>
			{project.description && (
				<p style={{ fontSize: 12.5, color: T.muted, marginBottom: 20, fontStyle: "italic", borderLeft: `3px solid ${T.border}`, paddingLeft: 10 }}>
					{project.description}
				</p>
			)}

			{/* Columns */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, minWidth: 700 }}>
				{COLUMNS.map((col, colIndex) => {
					const isOver = dragOverCol === col.id;
					return (
						<div
							key={col.id}
							onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
							onDragLeave={(e) => {
								// Only clear if leaving the column entirely
								if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null);
							}}
							onDrop={(e) => handleDrop(e, col.id)}
							style={{
								background: isOver ? `${col.dot}12` : T.base,
								border: `1.5px solid ${isOver ? col.dot : T.border}`,
								borderRadius: 12,
								display: "flex",
								flexDirection: "column",
								maxHeight: "calc(100vh - 230px)",
								transition: "border-color 0.15s, background 0.15s",
							}}
						>
							{/* Column header */}
							<div style={{
								padding: "10px 14px",
								borderBottom: `1px solid ${T.border}`,
								display: "flex",
								alignItems: "center",
								gap: 8,
								flexShrink: 0,
							}}>
								<span style={{ width: 8, height: 8, borderRadius: "50%", background: col.dot, flexShrink: 0 }} />
								<span style={{ fontSize: 12, fontWeight: 700, color: T.accent, flex: 1 }}>
									{col.label}
								</span>
								<span style={{
									fontSize: 11, fontWeight: 700,
									color: T.muted,
									background: T.surface,
									border: `1px solid ${T.border}`,
									borderRadius: 20, padding: "0px 7px",
								}}>
									{colTasks(col.id).length}
								</span>
							</div>

							{/* Tasks */}
							<div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 4px" }}>
								<AnimatePresence>
									{colTasks(col.id).map((task) => (
										<TaskCard
											key={task.id}
											task={task}
											colIndex={colIndex}
											isDragging={draggingId === task.id}
											onEdit={onEditTask}
											onDelete={onDeleteTask}
											onMoveLeft={(t) => onMoveTask(t, COLUMNS[colIndex - 1].id)}
											onMoveRight={(t) => onMoveTask(t, COLUMNS[colIndex + 1].id)}
											onDragStart={setDraggingId}
											onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
										/>
									))}
								</AnimatePresence>
								{/* Drop hint when dragging over empty col */}
								{isOver && draggingId && colTasks(col.id).length === 0 && (
									<div style={{
										border: `2px dashed ${col.dot}`,
										borderRadius: 8, padding: "20px 10px",
										textAlign: "center", fontSize: 11, color: col.dot,
									}}>
										Drop here
									</div>
								)}
							</div>

							{/* Add task button */}
							<button
								onClick={() => onAddTask(col.id)}
								style={{
									margin: "6px 10px 10px",
									border: `1.5px dashed ${T.border}`,
									background: "none", color: T.muted,
									padding: "7px", borderRadius: 8,
									fontSize: 12, fontWeight: 500,
									cursor: "pointer", transition: "all 0.12s",
									display: "flex", alignItems: "center",
									justifyContent: "center", gap: 5,
								}}
								onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.warm; e.currentTarget.style.color = T.warm; }}
								onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
							>
								<Ic d={ICONS.plus} size={12} stroke="currentColor" sw={2.5} />
								Add task
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			style={{
				position: "fixed", inset: 0,
				background: "rgba(26,26,26,0.35)",
				display: "flex", alignItems: "center", justifyContent: "center",
				zIndex: 1000, padding: 16,
				backdropFilter: "blur(2px)",
			}}
			onClick={onClose}
		>
			<motion.div
				initial={{ y: -16, opacity: 0, scale: 0.97 }}
				animate={{ y: 0, opacity: 1, scale: 1 }}
				exit={{ y: 16, opacity: 0, scale: 0.97 }}
				transition={{ duration: 0.2 }}
				onClick={(e) => e.stopPropagation()}
				style={{
					background: T.surface,
					border: `1px solid ${T.border}`,
					borderRadius: 14,
					boxShadow: "0 8px 40px rgba(0,0,0,0.14)",
					padding: "24px",
					width: "100%", maxWidth: 440,
				}}
			>
				{/* Header */}
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
					<h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, fontWeight: 600, color: T.accent }}>
						{title}
					</h3>
					<button
						onClick={onClose}
						style={{ background: "none", border: "none", fontSize: 20, color: T.muted, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}
						onMouseEnter={(e) => (e.target.style.color = T.accent)}
						onMouseLeave={(e) => (e.target.style.color = T.muted)}
					>
						×
					</button>
				</div>
				{children}
			</motion.div>
		</motion.div>
	);
}

// ── Form primitives ───────────────────────────────────────────────────────────
const inputStyle = {
	width: "100%",
	padding: "9px 12px",
	border: `1.5px solid ${T.border}`,
	borderRadius: 8,
	background: T.base,
	fontSize: 13,
	color: T.accent,
	marginBottom: 14,
	transition: "border-color 0.15s",
};

const labelStyle = {
	display: "block",
	fontSize: 11,
	fontWeight: 700,
	letterSpacing: "0.07em",
	textTransform: "uppercase",
	color: T.muted,
	marginBottom: 5,
};

const submitBtnStyle = {
	width: "100%",
	padding: "10px",
	background: T.accent,
	color: "white",
	border: "none",
	borderRadius: 9,
	fontSize: 13,
	fontWeight: 700,
	cursor: "pointer",
	marginTop: 4,
	transition: "background 0.15s",
};

// ── Main app ──────────────────────────────────────────────────────────────────
export default function App() {
	const [projects, setProjects] = useState([]);
	const [tasks, setTasks] = useState([]);
	const [selectedProjectId, setSelectedProjectId] = useState(null);
	const [sidebarOpen, setSidebarOpen] = useState(true);

	const [showProjectModal, setShowProjectModal] = useState(false);
	const [taskModal, setTaskModal] = useState(null);
	const [editingProject, setEditingProject] = useState(null);

	const [pForm, setPForm] = useState({ name: "", url: "", description: "" });
	const [tForm, setTForm] = useState({ title: "", description: "", priority: "Medium", status: "backlog" });

	// Load from IndexedDB
	useEffect(() => {
		(async () => {
			const [ps, ts] = await Promise.all([dbGetAll("projects"), dbGetAll("tasks")]);
			setProjects(ps);
			setTasks(ts);
			if (ps.length) setSelectedProjectId(ps[0].id);
		})();
	}, []);

	// Inject global CSS
	useEffect(() => {
		const tag = document.createElement("style");
		tag.textContent = GLOBAL_CSS;
		document.head.appendChild(tag);
		return () => document.head.removeChild(tag);
	}, []);

	const selectedProject = projects.find((p) => p.id === selectedProjectId);
	const projectTasks = tasks.filter((t) => t.projectId === selectedProjectId);

	// ── Project CRUD ────────────────────────────────────────────────────────────
	const openAddProject = () => {
		setEditingProject(null);
		setPForm({ name: "", url: "", description: "" });
		setShowProjectModal(true);
	};

	const saveProject = async () => {
		if (!pForm.name.trim()) return;
		const project = editingProject
			? { ...editingProject, ...pForm }
			: { id: uid(), ...pForm, createdAt: Date.now() };
		await dbPut("projects", project);
		setProjects((prev) =>
			editingProject
				? prev.map((p) => (p.id === project.id ? project : p))
				: [...prev, project],
		);
		if (!editingProject) setSelectedProjectId(project.id);
		setShowProjectModal(false);
	};

	const deleteProject = async (id) => {
		if (!confirm("Delete this project and all its tasks?")) return;
		await dbDelete("projects", id);
		const toDelete = tasks.filter((t) => t.projectId === id);
		await Promise.all(toDelete.map((t) => dbDelete("tasks", t.id)));
		setProjects((prev) => prev.filter((p) => p.id !== id));
		setTasks((prev) => prev.filter((t) => t.projectId !== id));
		if (selectedProjectId === id)
			setSelectedProjectId(projects.find((p) => p.id !== id)?.id || null);
	};

	// ── Task CRUD ───────────────────────────────────────────────────────────────
	const openAddTask = (colId) => {
		setTForm({ title: "", description: "", priority: "Medium", status: colId });
		setTaskModal({ mode: "add", colId });
	};

	const openEditTask = (task) => {
		setTForm({ title: task.title, description: task.description || "", priority: task.priority, status: task.status });
		setTaskModal({ mode: "edit", task });
	};

	const saveTask = async () => {
		if (!tForm.title.trim()) return;
		const task =
			taskModal.mode === "edit"
				? { ...taskModal.task, ...tForm }
				: { id: uid(), projectId: selectedProjectId, ...tForm, createdAt: Date.now() };
		await dbPut("tasks", task);
		setTasks((prev) =>
			taskModal.mode === "edit"
				? prev.map((t) => (t.id === task.id ? task : t))
				: [...prev, task],
		);
		setTaskModal(null);
	};

	const deleteTask = async (id) => {
		await dbDelete("tasks", id);
		setTasks((prev) => prev.filter((t) => t.id !== id));
	};

	const moveTask = async (task, newStatus) => {
		const updated = { ...task, status: newStatus };
		await dbPut("tasks", updated);
		setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
	};

	return (
		<>
			<div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
				<Navbar
					onAddProject={openAddProject}
					sidebarOpen={sidebarOpen}
					onToggleSidebar={() => setSidebarOpen((v) => !v)}
				/>
				<div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
					<Sidebar
						projects={projects}
						selectedId={selectedProjectId}
						onSelect={setSelectedProjectId}
						onDelete={deleteProject}
						open={sidebarOpen}
					/>
					<main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
						{selectedProject ? (
							<KanbanBoard
								project={selectedProject}
								tasks={projectTasks}
								onAddTask={openAddTask}
								onEditTask={openEditTask}
								onDeleteTask={deleteTask}
								onMoveTask={moveTask}
							/>
						) : (
							<div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.muted }}>
								<div style={{ fontSize: 36, marginBottom: 14, opacity: 0.3 }}>◫</div>
								<p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: T.accent, marginBottom: 6 }}>
									No project selected
								</p>
								<p style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
									Create a project or select one from the sidebar
								</p>
								<motion.button
									whileHover={{ scale: 1.03 }}
									whileTap={{ scale: 0.97 }}
									onClick={openAddProject}
									style={{ ...submitBtnStyle, width: "auto", padding: "10px 28px" }}
								>
									+ New Project
								</motion.button>
							</div>
						)}
					</main>
				</div>
			</div>

			{/* Project modal */}
			<AnimatePresence>
				{showProjectModal && (
					<Modal title={editingProject ? "Edit Project" : "New Project"} onClose={() => setShowProjectModal(false)}>
						<label style={labelStyle}>Project Name *</label>
						<input
							style={inputStyle}
							placeholder="My Web App"
							value={pForm.name}
							onChange={(e) => setPForm((p) => ({ ...p, name: e.target.value }))}
							onFocus={(e) => (e.target.style.borderColor = T.warm)}
							onBlur={(e) => (e.target.style.borderColor = T.border)}
							autoFocus
						/>
						<label style={labelStyle}>URL</label>
						<input
							style={inputStyle}
							placeholder="https://myapp.com"
							value={pForm.url}
							onChange={(e) => setPForm((p) => ({ ...p, url: e.target.value }))}
							onFocus={(e) => (e.target.style.borderColor = T.warm)}
							onBlur={(e) => (e.target.style.borderColor = T.border)}
						/>
						<label style={labelStyle}>Description</label>
						<textarea
							style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
							placeholder="Brief description…"
							value={pForm.description}
							onChange={(e) => setPForm((p) => ({ ...p, description: e.target.value }))}
							onFocus={(e) => (e.target.style.borderColor = T.warm)}
							onBlur={(e) => (e.target.style.borderColor = T.border)}
						/>
						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.97 }}
							style={submitBtnStyle}
							onClick={saveProject}
						>
							{editingProject ? "Save Changes" : "Create Project"}
						</motion.button>
					</Modal>
				)}
			</AnimatePresence>

			{/* Task modal */}
			<AnimatePresence>
				{taskModal && (
					<Modal title={taskModal.mode === "edit" ? "Edit Task" : "New Task"} onClose={() => setTaskModal(null)}>
						<label style={labelStyle}>Task Title *</label>
						<input
							style={inputStyle}
							placeholder="Task name"
							value={tForm.title}
							onChange={(e) => setTForm((f) => ({ ...f, title: e.target.value }))}
							onFocus={(e) => (e.target.style.borderColor = T.warm)}
							onBlur={(e) => (e.target.style.borderColor = T.border)}
							onKeyDown={(e) => e.key === "Enter" && saveTask()}
							autoFocus
						/>
						<label style={labelStyle}>Description</label>
						<textarea
							style={{ ...inputStyle, resize: "vertical", minHeight: 64 }}
							placeholder="Optional details…"
							value={tForm.description}
							onChange={(e) => setTForm((f) => ({ ...f, description: e.target.value }))}
							onFocus={(e) => (e.target.style.borderColor = T.warm)}
							onBlur={(e) => (e.target.style.borderColor = T.border)}
						/>
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
							<div>
								<label style={labelStyle}>Priority</label>
								<select
									style={{ ...inputStyle, marginBottom: 0 }}
									value={tForm.priority}
									onChange={(e) => setTForm((f) => ({ ...f, priority: e.target.value }))}
								>
									{PRIORITIES.map((p) => <option key={p}>{p}</option>)}
								</select>
							</div>
							<div>
								<label style={labelStyle}>Column</label>
								<select
									style={{ ...inputStyle, marginBottom: 0 }}
									value={tForm.status}
									onChange={(e) => setTForm((f) => ({ ...f, status: e.target.value }))}
								>
									{COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
								</select>
							</div>
						</div>
						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.97 }}
							style={submitBtnStyle}
							onClick={saveTask}
						>
							{taskModal.mode === "edit" ? "Save Task" : "Add Task"}
						</motion.button>
					</Modal>
				)}
			</AnimatePresence>
		</>
	);
}
