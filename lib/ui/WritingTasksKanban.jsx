import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import {
	Plus,
	Search,
	GripVertical,
	Paperclip,
	MessageCircle,
	X,
	LayoutGrid,
	List,
	ClipboardList,
	PlayCircle,
	CheckCircle2,
	ChevronDown,
	Sparkles,
	Loader2,
	ExternalLink,
} from "lucide-react";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragOverlay,
	useDroppable,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useWritingTasks } from "../hooks/useWritingTasks";
import { useWritingTaskAiDraft } from "../hooks/useWritingTaskAiDraft";
import { WRITING_TASK_COLUMNS } from "../utils/writingTasksStore";
import AnimatedDropdown from "./AnimatedDropdown";

const PRIORITIES = ["High", "Medium", "Low"];

const PRIORITY_OPTIONS = [
	{ value: "High", label: "High", color: "bg-zinc-900 text-white" },
	{ value: "Medium", label: "Medium", color: "bg-zinc-200 text-zinc-700" },
	{ value: "Low", label: "Low", color: "bg-zinc-100 text-zinc-600" },
];

const STATUS_OPTIONS = WRITING_TASK_COLUMNS.map((c) => {
	const colors = {
		backlog: "bg-zinc-100 text-zinc-700",
		"in-progress": "bg-blue-100 text-blue-700",
		done: "bg-green-100 text-green-700",
	};
	return {
		value: c.id,
		label: c.title,
		color: colors[c.id] || "bg-zinc-100 text-zinc-700",
	};
});

function TaskModalDropdownButton({ selectedOption, isOpen, placeholder, onClick }) {
	return (
		<motion.button
			type="button"
			whileHover={{ scale: 1.01 }}
			whileTap={{ scale: 0.99 }}
			onClick={onClick}
			className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm bg-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
		>
			<span className="text-zinc-900 font-medium truncate">
				{selectedOption?.label || placeholder}
			</span>
			<ChevronDown
				className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${
					isOpen ? "rotate-180" : ""
				}`}
			/>
		</motion.button>
	);
}

function getPriorityClass(priority) {
	switch (priority) {
		case "High":
			return "bg-zinc-900 text-white";
		case "Low":
			return "bg-zinc-100 text-zinc-600";
		default:
			return "bg-zinc-200 text-zinc-700";
	}
}

function getInitials(label) {
	if (!label) return "?";
	const parts = String(label).trim().split(/\s+/);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[1][0]).toUpperCase();
	}
	return label.slice(0, 2).toUpperCase();
}

function ProgressRing({ progress, done }) {
	if (done) {
		return (
			<div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
				<CheckCircle2 className="w-4 h-4 text-white" />
			</div>
		);
	}
	const pct = Math.min(100, Math.max(0, progress || 0));
	const dash = (pct / 100) * 62.83;
	const ringColor =
		pct >= 100 ? "text-emerald-500" : pct >= 40 ? "text-amber-400" : "text-zinc-300";

	return (
		<div className="flex items-center gap-1.5">
			<span className="text-xs text-zinc-600 tabular-nums">{pct}%</span>
			<div className="relative w-8 h-8">
				<svg className="w-8 h-8 -rotate-90" viewBox="0 0 24 24">
					<circle
						cx="12"
						cy="12"
						r="10"
						strokeWidth="2"
						fill="none"
						className="stroke-zinc-200"
					/>
					<circle
						cx="12"
						cy="12"
						r="10"
						strokeWidth="2"
						fill="none"
						strokeDasharray={`${dash} 62.83`}
						className={`stroke-current ${ringColor}`}
					/>
				</svg>
			</div>
		</div>
	);
}

function TaskCardContent({
	task,
	dragHandleProps,
	isGenerating,
	onGenerateAi,
	onOpenDraft,
}) {
	return (
		<>
			<div className="flex items-start justify-between gap-2 mb-2">
				<h4 className="font-semibold text-zinc-900 text-sm leading-snug flex-1">
					{task.title}
				</h4>
				{dragHandleProps && (
					<button
						type="button"
						{...dragHandleProps}
						className="p-0.5 text-zinc-400 hover:text-zinc-600 cursor-grab active:cursor-grabbing shrink-0"
					>
						<GripVertical className="w-3.5 h-3.5" />
					</button>
				)}
			</div>
			{task.description && (
				<p className="text-sm text-zinc-500 mb-3 line-clamp-2 leading-relaxed">
					{task.description}
				</p>
			)}
			{(isGenerating || task.draftPath) && (
				<div className="flex flex-wrap items-center gap-2 mb-3">
					{isGenerating && (
						<span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-amber-50 text-amber-800 text-xs font-medium">
							<Loader2 className="w-3 h-3 animate-spin" />
							InkAgent drafting…
						</span>
					)}
					{task.draftPath && !isGenerating && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onOpenDraft?.(task);
							}}
							className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors"
						>
							<ExternalLink className="w-3 h-3" />
							Open draft
						</button>
					)}
				</div>
			)}
			<div className="flex items-center justify-between mb-3">
				<div className="flex -space-x-1.5">
					{(task.assignees?.length ? task.assignees : ["You"]).slice(0, 3).map((a, i) => (
						<div
							key={i}
							className="w-6 h-6 rounded-full bg-zinc-200 border-2 border-white flex items-center justify-center text-[10px] font-semibold text-zinc-700"
						>
							{getInitials(a)}
						</div>
					))}
				</div>
				<ProgressRing progress={task.progress} done={task.status === "done"} />
			</div>
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
				<span
					className={`self-start px-2 py-0.5 rounded-xl text-xs font-medium ${getPriorityClass(task.priority)}`}
				>
					{task.priority}
				</span>
				<div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
					<motion.button
						type="button"
						whileHover={{ scale: 1.03 }}
						whileTap={{ scale: 0.97 }}
						disabled={isGenerating}
						onClick={(e) => {
							e.stopPropagation();
							onGenerateAi?.(task);
						}}
						className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-zinc-900 text-white text-[11px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{isGenerating ? (
							<Loader2 className="w-3 h-3 animate-spin" />
						) : (
							<Sparkles className="w-3 h-3" />
						)}
						{isGenerating ? "Drafting" : "AI draft"}
					</motion.button>
					<div className="flex items-center gap-3 text-zinc-400">
						<span className="flex items-center gap-1 text-xs">
							<Paperclip className="w-3 h-3" />
							{task.attachments || 0}
						</span>
						<span className="flex items-center gap-1 text-xs">
							<MessageCircle className="w-3 h-3" />
							{task.comments || 0}
						</span>
					</div>
				</div>
			</div>
		</>
	);
}

function SortableTaskCard({ task, onEdit, isGenerating, onGenerateAi, onOpenDraft }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id: task.id });

	return (
		<motion.div
			ref={setNodeRef}
			layout
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.95 }}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
			}}
			className="bg-white border border-zinc-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
			onClick={() => onEdit(task)}
		>
			<TaskCardContent
				task={task}
				isGenerating={isGenerating}
				onGenerateAi={onGenerateAi}
				onOpenDraft={onOpenDraft}
				dragHandleProps={{ ...attributes, ...listeners, onClick: (e) => e.stopPropagation() }}
			/>
		</motion.div>
	);
}

function DroppableColumn({ id, children }) {
	const { setNodeRef, isOver } = useDroppable({ id: `column-${id}` });

	return (
		<div
			ref={setNodeRef}
			className={`w-full md:flex-shrink-0 md:w-72 lg:w-80 bg-zinc-50 rounded-xl p-4 min-h-0 md:min-h-[420px] transition-shadow ${
				isOver ? "ring-2 ring-zinc-900 ring-offset-2" : ""
			}`}
		>
			{children}
		</div>
	);
}

function EmptyColumn({ columnId }) {
	const config = {
		backlog: {
			Icon: ClipboardList,
			title: "No ideas yet",
			sub: "Add blog topics or writing tasks here",
		},
		"in-progress": {
			Icon: PlayCircle,
			title: "Nothing in progress",
			sub: "Drag a task here when you start writing",
		},
		done: {
			Icon: CheckCircle2,
			title: "No completed items",
			sub: "Finished posts and tasks land here",
		},
	};
	const { Icon, title, sub } = config[columnId] || config.backlog;

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="flex flex-col items-center justify-center py-8 md:py-10 px-4 text-center"
		>
			<Icon className="w-10 h-10 text-zinc-300 mb-2" />
			<p className="text-sm text-zinc-500 font-medium">{title}</p>
			<p className="text-xs text-zinc-400 mt-1">{sub}</p>
		</motion.div>
	);
}

function TaskModal({
	open,
	task,
	defaultStatus,
	onClose,
	onSave,
	onDelete,
	isGenerating,
	onGenerateAi,
	onOpenDraft,
}) {
	const [form, setForm] = useState({
		title: "",
		description: "",
		priority: "Medium",
		status: "backlog",
		progress: 0,
	});
	const [openDropdown, setOpenDropdown] = useState(null);

	useEffect(() => {
		if (!open) return;
		setOpenDropdown(null);
		if (task) {
			setForm({
				title: task.title || "",
				description: task.description || "",
				priority: task.priority || "Medium",
				status: task.status || "backlog",
				progress: task.progress ?? 0,
			});
		} else {
			setForm({
				title: "",
				description: "",
				priority: "Medium",
				status: defaultStatus || "backlog",
				progress: 0,
			});
		}
	}, [open, task, defaultStatus]);

	if (!open) return null;

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!form.title.trim()) return;
		onSave(form);
	};

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
				onClick={onClose}
			>
				<motion.div
					initial={{ opacity: 0, scale: 0.96, y: 8 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.96, y: 8 }}
					className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="flex items-center justify-between mb-5">
						<h3 className="text-lg font-semibold text-zinc-900">
							{task ? "Edit task" : "New writing task"}
						</h3>
						<button
							type="button"
							onClick={onClose}
							className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-xs font-semibold text-zinc-500 mb-1.5">
								Title
							</label>
							<input
								autoFocus
								value={form.title}
								onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
								placeholder="Blog topic or task name"
								className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300"
							/>
						</div>
						<div>
							<label className="block text-xs font-semibold text-zinc-500 mb-1.5">
								Description
							</label>
							<textarea
								value={form.description}
								onChange={(e) =>
									setForm((f) => ({ ...f, description: e.target.value }))
								}
								placeholder="What do you want to write about?"
								rows={3}
								className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300"
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-semibold text-zinc-500 mb-1.5">
									Priority
								</label>
								<AnimatedDropdown
									isOpen={openDropdown === "priority"}
									onToggle={() =>
										setOpenDropdown((k) =>
											k === "priority" ? null : "priority",
										)
									}
									onSelect={(value) => {
										setForm((f) => ({ ...f, priority: value }));
										setOpenDropdown(null);
									}}
									options={PRIORITY_OPTIONS}
									value={form.priority}
									placeholder="Select priority"
									buttonClassName="px-3 py-2 border-zinc-200 text-sm"
									renderButton={(selectedOption, isOpen) => (
										<TaskModalDropdownButton
											selectedOption={selectedOption}
											isOpen={isOpen}
											placeholder="Select priority"
											onClick={() =>
												setOpenDropdown((k) =>
													k === "priority" ? null : "priority",
												)
											}
										/>
									)}
								/>
							</div>
							<div>
								<label className="block text-xs font-semibold text-zinc-500 mb-1.5">
									Status
								</label>
								<AnimatedDropdown
									isOpen={openDropdown === "status"}
									onToggle={() =>
										setOpenDropdown((k) => (k === "status" ? null : "status"))
									}
									onSelect={(value) => {
										setForm((f) => ({ ...f, status: value }));
										setOpenDropdown(null);
									}}
									options={STATUS_OPTIONS}
									value={form.status}
									placeholder="Select status"
									buttonClassName="px-3 py-2 border-zinc-200 text-sm"
									renderButton={(selectedOption, isOpen) => (
										<TaskModalDropdownButton
											selectedOption={selectedOption}
											isOpen={isOpen}
											placeholder="Select status"
											onClick={() =>
												setOpenDropdown((k) =>
													k === "status" ? null : "status",
												)
											}
										/>
									)}
								/>
							</div>
						</div>
						<div>
							<label className="block text-xs font-semibold text-zinc-500 mb-1.5">
								Progress — {form.progress}%
							</label>
							<input
								type="range"
								min={0}
								max={100}
								step={5}
								value={form.progress}
								onChange={(e) =>
									setForm((f) => ({ ...f, progress: Number(e.target.value) }))
								}
								className="w-full accent-zinc-900"
							/>
						</div>
						{task && (
							<div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-2">
								<p className="text-xs font-semibold text-zinc-600">
									InkAgent · 1 credit per draft
								</p>
								{isGenerating && (
									<p className="text-xs text-amber-700 flex items-center gap-1.5">
										<Loader2 className="w-3.5 h-3.5 animate-spin" />
										Writing your draft…
									</p>
								)}
								<div className="flex flex-wrap gap-2">
									<motion.button
										type="button"
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										disabled={isGenerating}
										onClick={() => onGenerateAi?.(task)}
										className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-xl disabled:opacity-60"
									>
										{isGenerating ? (
											<Loader2 className="w-3.5 h-3.5 animate-spin" />
										) : (
											<Sparkles className="w-3.5 h-3.5" />
										)}
										{task.draftPath ? "Regenerate draft" : "Write draft with AI"}
									</motion.button>
									{task.draftPath && (
										<motion.button
											type="button"
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											onClick={() => onOpenDraft?.(task)}
											className="inline-flex items-center gap-1.5 px-3 py-2 border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl"
										>
											<ExternalLink className="w-3.5 h-3.5" />
											Open draft to edit
										</motion.button>
									)}
								</div>
							</div>
						)}
						<div className="flex items-center gap-2 pt-2">
							<motion.button
								type="submit"
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className="flex-1 py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-xl"
							>
								{task ? "Save changes" : "Add task"}
							</motion.button>
							{task && onDelete && (
								<motion.button
									type="button"
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									onClick={() => onDelete(task.id)}
									className="px-4 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50"
								>
									Delete
								</motion.button>
							)}
						</div>
					</form>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}

export default function WritingTasksKanban({
	userId,
	reduxUser,
	creditRemaining = Infinity,
	onLogin,
	onCreditsUsed,
}) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { tasks, addTask, updateTask, deleteTask, moveTask } = useWritingTasks(userId);

	const { generateFromTask, generatingTaskId } = useWritingTaskAiDraft({
		reduxUser,
		queryClient,
		router,
		creditRemaining,
		onLogin,
		onCreditsUsed,
		updateTask,
	});

	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState("board");
	const [filterPriority, setFilterPriority] = useState(null);
	const [showFilter, setShowFilter] = useState(false);
	const [activeId, setActiveId] = useState(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingTask, setEditingTask] = useState(null);
	const [defaultStatus, setDefaultStatus] = useState("backlog");
	const filterRef = useRef(null);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	useEffect(() => {
		const handleClick = (e) => {
			if (filterRef.current && !filterRef.current.contains(e.target)) {
				setShowFilter(false);
			}
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const filteredTasks = useMemo(() => {
		let list = tasks;
		const q = searchQuery.trim().toLowerCase();
		if (q) {
			list = list.filter(
				(t) =>
					t.title?.toLowerCase().includes(q) ||
					t.description?.toLowerCase().includes(q),
			);
		}
		if (filterPriority) {
			list = list.filter((t) => t.priority === filterPriority);
		}
		return list;
	}, [tasks, searchQuery, filterPriority]);

	const getColumnTasks = (status) =>
		filteredTasks.filter((t) => t.status === status);

	const openAdd = (status = "backlog") => {
		setEditingTask(null);
		setDefaultStatus(status);
		setModalOpen(true);
	};

	const openEdit = (task) => {
		setEditingTask(task);
		setModalOpen(true);
	};

	const handleSave = (form) => {
		if (editingTask) {
			updateTask(editingTask.id, form);
		} else {
			addTask(form);
		}
		setModalOpen(false);
		setEditingTask(null);
	};

	const handleDragStart = (event) => setActiveId(event.active.id);

	const handleDragEnd = (event) => {
		const { active, over } = event;
		setActiveId(null);
		if (!over || !active) return;

		const taskId = active.id;
		const overId = String(over.id);

		if (overId.startsWith("column-")) {
			moveTask(taskId, overId.replace("column-", ""));
			return;
		}

		const overTask = tasks.find((t) => String(t.id) === overId);
		if (overTask) moveTask(taskId, overTask.status);
	};

	const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;
	const filterLabel = filterPriority ? `${filterPriority} priority` : "All Tasks";

	const handleGenerateAi = async (task) => {
		const draft = await generateFromTask(task);
		if (draft && editingTask?.id === task.id) {
			setEditingTask((prev) =>
				prev
					? {
							...prev,
							draftId: draft.id,
							draftPath: draft.path,
							status: prev.status === "done" ? "done" : "in-progress",
							progress: Math.max(prev.progress || 0, 75),
						}
					: prev,
			);
		}
	};

	const handleOpenDraft = (task) => {
		if (task?.draftPath) router.push(task.draftPath);
	};

	return (
		<div className="flex flex-col h-full min-h-0 bg-transparent font-sans">
			{/* Header */}
			<div className="flex-shrink-0 px-4 sm:px-6 pt-6 pb-4">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
					<div>
						<h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
							Task Kanban board
						</h1>
						<p className="text-sm text-zinc-500 mt-1">
							Turn concepts/ideas/thoughts into blog with InkAgent
						</p>
					</div>
					<div className="flex flex-col w-full sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-2">
						<div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[12rem] sm:max-w-xs">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search tasks..."
								className="pl-9 pr-3 py-2 w-full border border-zinc-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
							/>
						</div>
						<div className="flex items-center gap-2 w-full sm:w-auto">
						<div className="relative flex-1 sm:flex-none" ref={filterRef}>
							<motion.button
								type="button"
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => setShowFilter((s) => !s)}
								className="flex items-center justify-center gap-2 px-3 py-2 w-full sm:w-auto bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700"
							>
								{filterLabel}
								<ChevronDown className="w-4 h-4 text-zinc-400" />
							</motion.button>
							<AnimatePresence>
								{showFilter && (
									<motion.div
										initial={{ opacity: 0, y: -4 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -4 }}
										className="absolute right-0 top-full mt-1 w-44 bg-white border border-zinc-200 rounded-xl shadow-lg z-20 py-1"
									>
										<button
											type="button"
											onClick={() => {
												setFilterPriority(null);
												setShowFilter(false);
											}}
											className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 ${
												!filterPriority ? "font-semibold text-zinc-900" : "text-zinc-600"
											}`}
										>
											All Tasks
										</button>
										{PRIORITIES.map((p) => (
											<button
												key={p}
												type="button"
												onClick={() => {
													setFilterPriority(p);
													setShowFilter(false);
												}}
												className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 ${
													filterPriority === p
														? "font-semibold text-zinc-900"
														: "text-zinc-600"
												}`}
											>
												{p}
											</button>
										))}
									</motion.div>
								)}
							</AnimatePresence>
						</div>
						<motion.button
							type="button"
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							onClick={() => openAdd()}
							className="flex items-center justify-center gap-1.5 px-4 py-2 flex-1 sm:flex-none bg-zinc-900 text-white text-sm font-semibold rounded-xl"
						>
							<Plus className="w-4 h-4" />
							Add new
						</motion.button>
						</div>
					</div>
				</div>

				{/* View toggle */}
				<div className="flex items-center gap-1 rounded-xl p-1 bg-zinc-100 w-fit">
					<motion.button
						type="button"
						whileTap={{ scale: 0.98 }}
						onClick={() => setViewMode("board")}
						className={`px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5 ${
							viewMode === "board"
								? "bg-white border border-zinc-200 text-zinc-900 shadow-sm"
								: "text-zinc-600 hover:text-zinc-900"
						}`}
					>
						<LayoutGrid className="w-3.5 h-3.5" />
						Board
					</motion.button>
					<motion.button
						type="button"
						whileTap={{ scale: 0.98 }}
						onClick={() => setViewMode("list")}
						className={`px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5 ${
							viewMode === "list"
								? "bg-white border border-zinc-200 text-zinc-900 shadow-sm"
								: "text-zinc-600 hover:text-zinc-900"
						}`}
					>
						<List className="w-3.5 h-3.5" />
						List
					</motion.button>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 min-h-0 overflow-auto px-4 sm:px-6 pb-6">
				{viewMode === "board" ? (
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragStart={handleDragStart}
						onDragEnd={handleDragEnd}
					>
						<div className="flex flex-col md:flex-row md:overflow-x-auto gap-4 pb-2 min-h-full">
							{WRITING_TASK_COLUMNS.map((column) => {
								const columnTasks = getColumnTasks(column.id);
								const taskIds = columnTasks.map((t) => t.id);

								return (
									<DroppableColumn key={column.id} id={column.id}>
										<div className="flex items-center justify-between mb-4">
											<div className="flex items-center gap-2">
												<h3 className="font-semibold text-zinc-900 text-sm">
													{column.title}
												</h3>
												<span className="px-2 py-0.5 bg-zinc-200/80 text-zinc-600 rounded-full text-xs font-medium">
													{columnTasks.length}
												</span>
											</div>
											<div className="flex items-center gap-0.5">
												<button
													type="button"
													className="hidden md:block p-1.5 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-200/60"
												>
													<GripVertical className="w-4 h-4" />
												</button>
												<motion.button
													type="button"
													whileHover={{ scale: 1.05 }}
													whileTap={{ scale: 0.95 }}
													onClick={() => openAdd(column.id)}
													className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-xl hover:bg-zinc-200/60"
												>
													<Plus className="w-4 h-4" />
												</motion.button>
											</div>
										</div>
										<SortableContext
											items={taskIds}
											strategy={verticalListSortingStrategy}
										>
											<div className="space-y-3">
												{columnTasks.length > 0 ? (
													columnTasks.map((task) => (
														<SortableTaskCard
															key={task.id}
															task={task}
															onEdit={openEdit}
															isGenerating={generatingTaskId === task.id}
															onGenerateAi={handleGenerateAi}
															onOpenDraft={handleOpenDraft}
														/>
													))
												) : (
													<EmptyColumn columnId={column.id} />
												)}
											</div>
										</SortableContext>
									</DroppableColumn>
								);
							})}
						</div>
						<DragOverlay>
							{activeTask ? (
								<div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xl w-[calc(100vw-2rem)] max-w-sm md:w-72 opacity-95 rotate-2">
									<TaskCardContent task={activeTask} />
								</div>
							) : null}
						</DragOverlay>
					</DndContext>
				) : (
					<div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
						{filteredTasks.length === 0 ? (
							<div className="py-16 text-center text-zinc-500 text-sm">
								No tasks yet. Click &ldquo;Add new&rdquo; to capture a blog idea.
							</div>
						) : (
							<ul className="divide-y divide-zinc-100">
								{filteredTasks.map((task) => (
									<motion.li
										key={task.id}
										layout
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-zinc-50"
									>
										<button
											type="button"
											className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-left"
											onClick={() => openEdit(task)}
										>
											<span
												className={`shrink-0 px-2 py-0.5 rounded-xl text-xs font-medium ${getPriorityClass(task.priority)}`}
											>
												{task.priority}
											</span>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-semibold text-zinc-900 truncate">
													{task.title}
												</p>
												{task.description && (
													<p className="text-xs text-zinc-500 truncate">
														{task.description}
													</p>
												)}
											</div>
											<span className="shrink-0 text-xs text-zinc-500 capitalize hidden sm:inline">
												{WRITING_TASK_COLUMNS.find((c) => c.id === task.status)?.title ||
													task.status}
											</span>
											<span className="shrink-0 text-xs text-zinc-400 tabular-nums w-10 text-right">
												{task.progress || 0}%
											</span>
										</button>
										<div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
											{task.draftPath && (
												<button
													type="button"
													onClick={() => handleOpenDraft(task)}
													className="p-2 rounded-xl text-emerald-700 hover:bg-emerald-50"
													title="Open draft"
												>
													<ExternalLink className="w-4 h-4" />
												</button>
											)}
											<button
												type="button"
												disabled={generatingTaskId === task.id}
												onClick={() => handleGenerateAi(task)}
												className="p-2 rounded-xl text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
												title="AI draft (1 credit)"
											>
												{generatingTaskId === task.id ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													<Sparkles className="w-4 h-4" />
												)}
											</button>
										</div>
									</motion.li>
								))}
							</ul>
						)}
					</div>
				)}
			</div>

			<TaskModal
				open={modalOpen}
				task={editingTask}
				defaultStatus={defaultStatus}
				isGenerating={editingTask && generatingTaskId === editingTask.id}
				onGenerateAi={handleGenerateAi}
				onOpenDraft={handleOpenDraft}
				onClose={() => {
					setModalOpen(false);
					setEditingTask(null);
				}}
				onSave={handleSave}
				onDelete={(id) => {
					deleteTask(id);
					setModalOpen(false);
					setEditingTask(null);
				}}
			/>
		</div>
	);
}
