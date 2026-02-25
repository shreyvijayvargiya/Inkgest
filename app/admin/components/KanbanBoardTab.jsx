import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";
import {
	Plus,
	Search,
	FilterIcon,
	MoreVertical,
	GripVertical,
	Paperclip,
	MessageCircle,
	X,
	Save,
	Edit,
	Trash2,
	LayoutGrid,
	List,
	Table,
	User,
	ClipboardList,
	PlayCircle,
	CheckCircle2,
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
import AnimatedDropdown from "../../../lib/ui/AnimatedDropdown";
import {
	getAllTasks,
	createTask,
	updateTask,
	deleteTask,
	updateTaskStatus,
	addAssigneeToTask,
} from "../../../lib/api/tasks";
import { getAllTeamMembers } from "../../../lib/api/teams";
import { toast } from "sonner";
import ConfirmationModal from "../../../lib/ui/ConfirmationModal";

// Sortable Task Card Component
const SortableTaskCard = ({
	task,
	onEdit,
	onDelete,
	onAddAssignee,
	getPriorityColor,
	getTypeColor,
	teamMembers,
}) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: task.id,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	// Get assignee initials from team members
	const getAssigneeInitials = (assigneeId) => {
		if (typeof assigneeId === "string" && assigneeId.includes("@")) {
			// It's an email, extract initials
			const parts = assigneeId.split("@")[0].split(".");
			if (parts.length >= 2) {
				return (parts[0][0] + parts[1][0]).toUpperCase();
			}
			return assigneeId.substring(0, 2).toUpperCase();
		}
		// Try to find in team members
		const member = teamMembers?.find(
			(m) => m.id === assigneeId || m.email === assigneeId
		);
		if (member) {
			if (member.username) {
				const parts = member.username.split(" ");
				if (parts.length >= 2) {
					return (parts[0][0] + parts[1][0]).toUpperCase();
				}
				return member.username.substring(0, 2).toUpperCase();
			}
			if (member.email) {
				const parts = member.email.split("@")[0].split(".");
				if (parts.length >= 2) {
					return (parts[0][0] + parts[1][0]).toUpperCase();
				}
				return member.email.substring(0, 2).toUpperCase();
			}
		}
		return assigneeId?.substring(0, 2).toUpperCase() || "U";
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="bg-white border border-zinc-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
		>
			{/* Type Badge */}
			<div className="flex items-center justify-between mb-2">
				<span
					className={`px-2 py-0.5 rounded-xl text-xs font-medium ${getTypeColor(
						task.type
					)}`}
				>
					{task.type}
				</span>
				<div className="flex items-center gap-1">
					<div
						{...attributes}
						{...listeners}
						className="p-1 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100 cursor-grab active:cursor-grabbing"
					>
						<GripVertical className="w-3 h-3" />
					</div>
					<motion.button
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.9 }}
						onClick={() => onEdit(task)}
						className="p-1 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100"
					>
						<Edit className="w-3 h-3" />
					</motion.button>
					<motion.button
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.9 }}
						onClick={() => onDelete(task.id)}
						className="p-1 text-zinc-400 hover:text-red-600 rounded-xl hover:bg-red-50"
					>
						<Trash2 className="w-3 h-3" />
					</motion.button>
				</div>
			</div>

			{/* Title */}
			<h4 className="font-semibold text-zinc-900 mb-1">{task.title}</h4>

			{/* Description */}
			{task.description && (
				<p className="text-sm text-zinc-600 mb-3 line-clamp-2">
					{task.description}
				</p>
			)}

			{/* Category */}
			{task.category && (
				<p className="text-xs text-zinc-500 mb-3">{task.category}</p>
			)}

			{/* Assignees */}
			<div className="flex items-center gap-2 mb-3">
				<div className="flex -space-x-2">
					{task.assignees?.map((assignee, idx) => (
						<div
							key={idx}
							className="w-6 h-6 rounded-full bg-zinc-200 border-2 border-white flex items-center justify-center text-xs font-medium text-zinc-700"
							title={assignee}
						>
							{getAssigneeInitials(assignee)}
						</div>
					))}
				</div>
				<motion.button
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.9 }}
					onClick={() => onAddAssignee(task.id)}
					className="w-6 h-6 rounded-full bg-zinc-100 border-2 border-dashed border-zinc-300 flex items-center justify-center text-xs font-medium text-zinc-500 hover:bg-zinc-200"
				>
					<Plus className="w-3 h-3" />
				</motion.button>
			</div>

			{/* Priority and Progress */}
			<div className="flex items-center justify-between mb-3">
				<span
					className={`px-2 py-0.5 rounded-xl text-xs font-medium ${getPriorityColor(
						task.priority
					)}`}
				>
					{task.priority}
				</span>
				<div className="flex items-center gap-2">
					<span className="text-xs text-zinc-600">{task.progress || 0}%</span>
					<div className="w-8 h-8 rounded-full border-2 border-zinc-200 flex items-center justify-center relative">
						{task.status === "done" ? (
							<div className="w-6 h-6 rounded-full bg-green-500" />
						) : (
							<svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 24 24">
								<circle
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="2"
									fill="none"
									className="text-zinc-200"
								/>
								<circle
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="2"
									fill="none"
									strokeDasharray={`${((task.progress || 0) / 100) * 62.83} 62.83`}
									className="text-zinc-900"
								/>
							</svg>
						)}
					</div>
				</div>
			</div>

			{/* Attachments and Comments */}
			<div className="flex items-center gap-4 text-xs text-zinc-500 pt-3 border-t border-zinc-100">
				<div className="flex items-center gap-1">
					<Paperclip className="w-3 h-3" />
					{task.attachments || 0}
				</div>
				<div className="flex items-center gap-1">
					<MessageCircle className="w-3 h-3" />
					{task.comments || 0}
				</div>
			</div>
		</div>
	);
};

// Droppable Column Component
const DroppableColumn = ({ id, children }) => {
	const { setNodeRef, isOver } = useDroppable({
		id: `column-${id}`,
	});

	return (
		<div
			ref={setNodeRef}
			className={`flex-shrink-0 w-80 bg-white rounded-xl p-4 border border-zinc-200 ${isOver ? "ring-2 ring-zinc-900 ring-offset-2" : ""
				}`}
		>
			{children}
		</div>
	);
};

const KanbanBoardTab = ({ queryClient }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState("board"); // board, list, table
	const [showAddModal, setShowAddModal] = useState(false);
	const [showAssigneeModal, setShowAssigneeModal] = useState(false);
	const [showFilterDropdown, setShowFilterDropdown] = useState(false);
	const [openFilterType, setOpenFilterType] = useState(null); // "type", "priority", "status", or null
	const [openModalDropdown, setOpenModalDropdown] = useState(null); // "type", "priority", "status", or null
	const [activeFilters, setActiveFilters] = useState({
		type: null, // null, "task", "bug", "feature", "improvement"
		priority: null, // null, "High", "Medium", "Low"
		status: null, // null, "backlog", "in-progress", "done"
	});
	const [activeId, setActiveId] = useState(null);
	const [selectedTask, setSelectedTask] = useState(null);
	const [editingTask, setEditingTask] = useState(null);
	const filterDropdownRef = useRef(null);
	const modalDropdownRef = useRef(null);

	// Modal states
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [confirmAction, setConfirmAction] = useState(null);
	const [confirmData, setConfirmData] = useState({
		title: "",
		message: "",
		variant: "danger",
	});

	const [assigneeForm, setAssigneeForm] = useState({
		email: "",
	});
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		type: "task",
		priority: "Medium",
		status: "backlog",
		category: "",
	});

	// Fetch tasks
	const {
		data: tasks = [],
		isLoading: isLoadingTasks,
		error: tasksError,
	} = useQuery({
		queryKey: ["tasks"],
		queryFn: () => getAllTasks(),
	});

	// Fetch team members
	const { data: teamMembers = [], isLoading: isLoadingTeamMembers } = useQuery({
		queryKey: ["teamMembers"],
		queryFn: () => getAllTeamMembers(),
	});

	// Close filter dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				filterDropdownRef.current &&
				!filterDropdownRef.current.contains(event.target)
			) {
				setShowFilterDropdown(false);
				setOpenFilterType(null);
			}
			if (
				modalDropdownRef.current &&
				!modalDropdownRef.current.contains(event.target)
			) {
				setOpenModalDropdown(null);
			}
		};

		if (showFilterDropdown || openModalDropdown) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showFilterDropdown, openModalDropdown]);

	// Drag and drop sensors
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	const columns = [
		{ id: "backlog", title: "Backlog", color: "bg-zinc-100" },
		{ id: "in-progress", title: "In Progress", color: "bg-blue-50" },
		{ id: "done", title: "Done", color: "bg-green-50" },
	];

	// Configure Fuse.js for fuzzy search
	const fuseOptions = useMemo(
		() => ({
			keys: [
				{ name: "title", weight: 0.5 },
				{ name: "description", weight: 0.3 },
				{ name: "category", weight: 0.2 },
				{ name: "type", weight: 0.1 },
				{ name: "priority", weight: 0.1 },
			],
			threshold: 0.3, // 0.0 = perfect match, 1.0 = match anything
			includeScore: true,
			minMatchCharLength: 2,
		}),
		[]
	);

	// Create Fuse instance with tasks
	const fuse = useMemo(
		() => new Fuse(tasks, fuseOptions),
		[tasks, fuseOptions]
	);

	// Apply search using Fuse.js
	const searchedTasks = useMemo(() => {
		if (!searchQuery.trim()) {
			return tasks;
		}
		const results = fuse.search(searchQuery);
		return results.map((result) => result.item);
	}, [searchQuery, fuse, tasks]);

	// Apply filters after search
	const filteredTasks = useMemo(() => {
		return searchedTasks.filter((task) => {
			// Type filter
			const matchesType =
				activeFilters.type === null || task.type === activeFilters.type;

			// Priority filter
			const matchesPriority =
				activeFilters.priority === null ||
				task.priority === activeFilters.priority;

			// Status filter
			const matchesStatus =
				activeFilters.status === null || task.status === activeFilters.status;

			return matchesType && matchesPriority && matchesStatus;
		});
	}, [searchedTasks, activeFilters]);

	const getTasksByStatus = (status) => {
		return filteredTasks.filter((task) => task.status === status);
	};

	// Create task mutation
	const createTaskMutation = useMutation({
		mutationFn: createTask,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			handleCloseModal();
			toast.success("Task created successfully!");
		},
		onError: (error) => {
			console.error("Error creating task:", error);
			toast.error("Failed to create task. Please try again.");
		},
	});

	// Update task mutation
	const updateTaskMutation = useMutation({
		mutationFn: ({ id, data }) => updateTask(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			handleCloseModal();
			toast.success("Task updated successfully!");
		},
		onError: (error) => {
			console.error("Error updating task:", error);
			toast.error("Failed to update task. Please try again.");
		},
	});

	// Delete task mutation
	const deleteTaskMutation = useMutation({
		mutationFn: deleteTask,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			toast.success("Task deleted successfully!");
		},
		onError: (error) => {
			console.error("Error deleting task:", error);
			toast.error("Failed to delete task. Please try again.");
		},
	});

	// Update task status mutation
	const updateTaskStatusMutation = useMutation({
		mutationFn: ({ id, status }) => updateTaskStatus(id, status),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
		onError: (error) => {
			console.error("Error updating task status:", error);
			toast.error("Failed to update task status. Please try again.");
		},
	});

	// Add assignee mutation
	const addAssigneeMutation = useMutation({
		mutationFn: ({ id, assigneeId }) => addAssigneeToTask(id, assigneeId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			setShowAssigneeModal(false);
			setSelectedTask(null);
			setAssigneeForm({ email: "" });
			toast.success("Assignee added successfully!");
		},
		onError: (error) => {
			console.error("Error adding assignee:", error);
			toast.error("Failed to add assignee. Please try again.");
		},
	});

	const handleSave = () => {
		if (!formData.title) {
			toast.warning("Task title is required");
			return;
		}

		const taskData = {
			title: formData.title,
			description: formData.description,
			type: formData.type,
			status: formData.status,
			priority: formData.priority,
			category: formData.category,
			progress: editingTask ? editingTask.progress : 0,
			assignees: editingTask ? editingTask.assignees || [] : [],
			attachments: editingTask ? editingTask.attachments || 0 : 0,
			comments: editingTask ? editingTask.comments || 0 : 0,
		};

		if (editingTask) {
			updateTaskMutation.mutate({ id: editingTask.id, data: taskData });
		} else {
			createTaskMutation.mutate(taskData);
		}
	};

	const handleDelete = (id) => {
		setConfirmData({
			title: "Delete Task",
			message:
				"Are you sure you want to delete this task? This action cannot be undone.",
			variant: "danger",
		});
		setConfirmAction(() => () => deleteTaskMutation.mutate(id));
		setShowConfirmModal(true);
	};

	const handleAddAssignee = (taskId) => {
		setSelectedTask(tasks.find((t) => t.id === taskId));
		setAssigneeForm({
			email: "",
		});
		setShowAssigneeModal(true);
	};

	const handleSaveAssignee = () => {
		if (!assigneeForm.email || !selectedTask) {
			toast.warning("Email is required");
			return;
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(assigneeForm.email)) {
			toast.warning("Please enter a valid email address");
			return;
		}

		addAssigneeMutation.mutate({
			id: selectedTask.id,
			assigneeId: assigneeForm.email,
		});
	};

	const getPriorityColor = (priority) => {
		switch (priority) {
			case "High":
				return "bg-zinc-900 text-white";
			case "Medium":
				return "bg-zinc-200 text-zinc-700";
			case "Low":
				return "bg-zinc-100 text-zinc-600";
			default:
				return "bg-zinc-200 text-zinc-700";
		}
	};

	const getTypeColor = (type) => {
		switch (type) {
			case "task":
				return "bg-orange-100 text-orange-700";
			case "bug":
				return "bg-red-100 text-red-700";
			case "feature":
				return "bg-blue-100 text-blue-700";
			case "improvement":
				return "bg-purple-100 text-purple-700";
			default:
				return "bg-zinc-100 text-zinc-700";
		}
	};

	// Filter options
	const filterOptions = {
		type: [
			{ value: null, label: "All Types" },
			{
				value: "task",
				label: "Task",
				color: "bg-orange-100 text-orange-700",
			},
			{ value: "bug", label: "Bug", color: "bg-red-100 text-red-700" },
			{
				value: "feature",
				label: "Feature",
				color: "bg-blue-100 text-blue-700",
			},
			{
				value: "improvement",
				label: "Improvement",
				color: "bg-purple-100 text-purple-700",
			},
		],
		priority: [
			{ value: null, label: "All Priorities" },
			{ value: "High", label: "High", color: "bg-zinc-900 text-white" },
			{ value: "Medium", label: "Medium", color: "bg-zinc-200 text-zinc-700" },
			{ value: "Low", label: "Low", color: "bg-zinc-100 text-zinc-600" },
		],
		status: [
			{ value: null, label: "All Statuses" },
			{
				value: "backlog",
				label: "Backlog",
				color: "bg-zinc-100 text-zinc-700",
			},
			{
				value: "in-progress",
				label: "In Progress",
				color: "bg-blue-100 text-blue-700",
			},
			{ value: "done", label: "Done", color: "bg-green-100 text-green-700" },
		],
	};

	// Modal form options (without "All" option)
	const modalOptions = {
		type: [
			{
				value: "task",
				label: "Task",
				color: "bg-orange-100 text-orange-700",
			},
			{ value: "bug", label: "Bug", color: "bg-red-100 text-red-700" },
			{
				value: "feature",
				label: "Feature",
				color: "bg-blue-100 text-blue-700",
			},
			{
				value: "improvement",
				label: "Improvement",
				color: "bg-purple-100 text-purple-700",
			},
		],
		priority: [
			{ value: "High", label: "High", color: "bg-zinc-900 text-white" },
			{ value: "Medium", label: "Medium", color: "bg-zinc-200 text-zinc-700" },
			{ value: "Low", label: "Low", color: "bg-zinc-100 text-zinc-600" },
		],
		status: [
			{
				value: "backlog",
				label: "Backlog",
				color: "bg-zinc-100 text-zinc-700",
			},
			{
				value: "in-progress",
				label: "In Progress",
				color: "bg-blue-100 text-blue-700",
			},
			{ value: "done", label: "Done", color: "bg-green-100 text-green-700" },
		],
	};

	const handleFilterSelect = (filterType, value) => {
		setActiveFilters((prev) => ({
			...prev,
			[filterType]: value,
		}));
	};

	const clearFilters = () => {
		setActiveFilters({
			type: null,
			priority: null,
			status: null,
		});
	};

	const hasActiveFilters = Object.values(activeFilters).some(
		(filter) => filter !== null
	);

	// Drag and drop handlers
	const handleDragStart = (event) => {
		setActiveId(event.active.id);
	};

	const handleDragEnd = (event) => {
		const { active, over } = event;
		setActiveId(null);

		if (!over || !active) return;

		const taskId = active.id;
		const task = tasks.find((t) => t.id === taskId);
		if (!task) return;

		// Safely get the over id
		let overId = null;
		try {
			if (over.id !== null && over.id !== undefined) {
				overId = typeof over.id === "string" ? over.id : String(over.id);
			}
		} catch (error) {
			console.error("Error processing over.id:", error);
			return;
		}

		if (!overId || typeof overId !== "string") return;

		// Check if dropped on a column
		if (overId.startsWith("column-")) {
			const newStatus = overId.replace("column-", "");
			// Validate that the status is one of our valid columns
			if (columns.some((col) => col.id === newStatus)) {
				updateTaskStatusMutation.mutate({ id: taskId, status: newStatus });
			}
			return;
		}

		// If dropped on another task, find which column it belongs to
		const overTask = tasks.find((t) => String(t.id) === String(overId));
		if (overTask) {
			// Move to the same column as the task we dropped on
			updateTaskStatusMutation.mutate({
				id: taskId,
				status: overTask.status,
			});
		}
	};

	const handleEdit = (task) => {
		setEditingTask(task);
		setFormData({
			title: task.title || "",
			description: task.description || "",
			type: task.type || "task",
			priority: task.priority || "Medium",
			status: task.status || "backlog",
			category: task.category || "",
		});
		setShowAddModal(true);
	};

	const handleCloseModal = () => {
		setShowAddModal(false);
		setEditingTask(null);
		setFormData({
			title: "",
			description: "",
			type: "task",
			priority: "Medium",
			status: "backlog",
			category: "",
		});
	};

	// Get assignee initials for display in header
	const getAssigneeInitials = (assigneeId) => {
		if (typeof assigneeId === "string" && assigneeId.includes("@")) {
			const parts = assigneeId.split("@")[0].split(".");
			if (parts.length >= 2) {
				return (parts[0][0] + parts[1][0]).toUpperCase();
			}
			return assigneeId.substring(0, 2).toUpperCase();
		}
		const member = teamMembers?.find(
			(m) => m.id === assigneeId || m.email === assigneeId
		);
		if (member) {
			if (member.username) {
				const parts = member.username.split(" ");
				if (parts.length >= 2) {
					return (parts[0][0] + parts[1][0]).toUpperCase();
				}
				return member.username.substring(0, 2).toUpperCase();
			}
			if (member.email) {
				const parts = member.email.split("@")[0].split(".");
				if (parts.length >= 2) {
					return (parts[0][0] + parts[1][0]).toUpperCase();
				}
				return member.email.substring(0, 2).toUpperCase();
			}
		}
		return assigneeId?.substring(0, 2).toUpperCase() || "U";
	};

	// Get unique assignees from all tasks
	const allAssignees = [
		...new Set(tasks.flatMap((task) => task.assignees || []).filter(Boolean)),
	].slice(0, 8);

	return (
		<div className="min-h-full">
			{/* Header */}
			<div className="mb-6 border-b border-zinc-200 py-2 px-4">
				<h2 className="text-lg text-zinc-900">Kanban Board</h2>
				<div>
					<p className="text-sm text-zinc-600 mt-1">
						Manage your kanban board and tasks
					</p>
				</div>
			</div>

			<div className="flex items-center gap-1 mb-4 mx-4 rounded-xl p-1.5 bg-zinc-50 w-fit">
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={() => setViewMode("board")}
					className={`px-2 py-1 rounded-xl text-sm font-medium flex items-center gap-2 ${viewMode === "board"
							? "bg-white border border-zinc-200 text-zinc-700"
							: "bg-zinc-100 border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
						}`}
				>
					<LayoutGrid className="w-3 h-3" />
					Board
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={() => setViewMode("list")}
					className={`px-2 py-1 rounded-xl text-sm font-medium flex items-center gap-2 ${viewMode === "list"
							? "bg-white border border-zinc-200 text-zinc-700"
							: "bg-zinc-100 border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
						}`}
				>
					<List className="w-3 h-3" />
					List
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={() => setViewMode("table")}
					className={`px-2 py-1 rounded-xl text-sm font-medium flex items-center gap-2 ${viewMode === "table"
							? "bg-white border border-zinc-200 text-zinc-700"
							: "bg-zinc-100 border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
						}`}
				>
					<Table className="w-3 h-3" />
					Table
				</motion.button>
			</div>
			{/* Top Action Bar */}
			<div className="flex items-center justify-between mb-6 px-4">
				<div className="flex items-center gap-3">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
						<input
							type="text"
							placeholder="Search tasks..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-sm w-64"
						/>
					</div>
					<div className="relative" ref={filterDropdownRef}>
						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							onClick={() => setShowFilterDropdown(!showFilterDropdown)}
							className={`flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50 ${hasActiveFilters ? "ring-2 ring-zinc-900" : ""
								}`}
						>
							<FilterIcon className="w-4 h-4" />
							Filters
							{hasActiveFilters && (
								<span className="px-1.5 py-0.5 bg-zinc-900 text-white rounded-full text-xs">
									{
										Object.values(activeFilters).filter((f) => f !== null)
											.length
									}
								</span>
							)}
						</motion.button>

						<AnimatePresence>
							{showFilterDropdown && (
								<motion.div
									initial={{ opacity: 0, y: -10, scale: 0.95 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									exit={{ opacity: 0, y: -10, scale: 0.95 }}
									className="absolute right-0 top-full mt-2 w-80 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 p-4 space-y-4"
								>
									<div className="flex items-center justify-between mb-2">
										<h4 className="font-semibold text-zinc-900">Filters</h4>
										{hasActiveFilters && (
											<button
												onClick={() => {
													clearFilters();
													setShowFilterDropdown(false);
												}}
												className="text-xs text-zinc-600 hover:text-zinc-900 underline"
											>
												Clear all
											</button>
										)}
									</div>

									{/* Type Filter */}
									<div>
										<label className="block text-xs font-medium text-zinc-700 mb-2">
											Type
										</label>
										<AnimatedDropdown
											isOpen={openFilterType === "type"}
											onToggle={() =>
												setOpenFilterType(
													openFilterType === "type" ? null : "type"
												)
											}
											onSelect={(value) => {
												handleFilterSelect("type", value);
												setOpenFilterType(null);
											}}
											options={filterOptions.type}
											value={activeFilters.type}
											placeholder="All Types"
										/>
									</div>

									{/* Priority Filter */}
									<div>
										<label className="block text-xs font-medium text-zinc-700 mb-2">
											Priority
										</label>
										<AnimatedDropdown
											isOpen={openFilterType === "priority"}
											onToggle={() =>
												setOpenFilterType(
													openFilterType === "priority" ? null : "priority"
												)
											}
											onSelect={(value) => {
												handleFilterSelect("priority", value);
												setOpenFilterType(null);
											}}
											options={filterOptions.priority}
											value={activeFilters.priority}
											placeholder="All Priorities"
										/>
									</div>

									{/* Status Filter */}
									<div>
										<label className="block text-xs font-medium text-zinc-700 mb-2">
											Status
										</label>
										<AnimatedDropdown
											isOpen={openFilterType === "status"}
											onToggle={() =>
												setOpenFilterType(
													openFilterType === "status" ? null : "status"
												)
											}
											onSelect={(value) => {
												handleFilterSelect("status", value);
												setOpenFilterType(null);
											}}
											options={filterOptions.status}
											value={activeFilters.status}
											placeholder="All Statuses"
										/>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => {
							setEditingTask(null);
							setFormData({
								title: "",
								description: "",
								type: "task",
								priority: "Medium",
								status: "backlog",
								category: "",
							});
							setShowAddModal(true);
						}}
						className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800"
					>
						<Plus className="w-4 h-4" />
						Add Task
					</motion.button>
					<div className="flex items-center gap-2">
						<div className="flex -space-x-2">
							{allAssignees.slice(0, 3).map((assignee, idx) => (
								<div
									key={idx}
									className="w-8 h-8 rounded-full bg-zinc-200 border-2 border-white flex items-center justify-center text-xs font-medium text-zinc-700"
									title={assignee}
								>
									{getAssigneeInitials(assignee)}
								</div>
							))}
						</div>
						{allAssignees.length > 3 && (
							<span className="text-xs text-zinc-600">
								+{allAssignees.length - 3}
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Loading State */}
			{isLoadingTasks && (
				<div className="text-center py-12 text-zinc-500">Loading tasks...</div>
			)}

			{/* Error State */}
			{tasksError && (
				<div className="text-center py-12 text-red-500">
					Error loading tasks. Please try again.
				</div>
			)}

			{/* Board View */}
			{!isLoadingTasks && !tasksError && viewMode === "board" && (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
				>
					<div className="flex gap-4 overflow-x-auto pb-4 px-4">
						{columns.map((column) => {
							const columnTasks = getTasksByStatus(column.id);
							const taskIds = columnTasks.map((task) => task.id);

							return (
								<DroppableColumn key={column.id} id={column.id}>
									{/* Column Header */}
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center gap-2">
											<h3 className="font-semibold text-zinc-900">
												{column.title}
											</h3>
											<span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-medium">
												{columnTasks.length}
											</span>
										</div>
										<div className="flex items-center gap-1">
											<button className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100">
												<GripVertical className="w-4 h-4" />
											</button>
											<button className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100">
												<MoreVertical className="w-4 h-4" />
											</button>
											<button className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100">
												<Plus className="w-4 h-4" />
											</button>
										</div>
									</div>

									{/* Task Cards */}
									<SortableContext
										items={taskIds}
										strategy={verticalListSortingStrategy}
									>
										<div className="space-y-3 min-h-[200px]">
											{columnTasks.length > 0 ? (
												columnTasks.map((task) => (
													<SortableTaskCard
														key={task.id}
														task={task}
														onEdit={handleEdit}
														onDelete={handleDelete}
														onAddAssignee={handleAddAssignee}
														getPriorityColor={getPriorityColor}
														getTypeColor={getTypeColor}
														teamMembers={teamMembers}
													/>
												))
											) : (
												<motion.div
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													className="flex flex-col items-center justify-center py-12 px-4"
												>
													{column.id === "backlog" && (
														<>
															<ClipboardList className="w-12 h-12 text-zinc-300 mb-3" />
															<p className="text-sm text-zinc-500 font-medium">
																No tasks in backlog
															</p>
															<p className="text-xs text-zinc-400 mt-1">
																Drag tasks here or create a new one
															</p>
														</>
													)}
													{column.id === "in-progress" && (
														<>
															<PlayCircle className="w-12 h-12 text-zinc-300 mb-3" />
															<p className="text-sm text-zinc-500 font-medium">
																No tasks in progress
															</p>
															<p className="text-xs text-zinc-400 mt-1">
																Move tasks here to start working
															</p>
														</>
													)}
													{column.id === "done" && (
														<>
															<CheckCircle2 className="w-12 h-12 text-zinc-300 mb-3" />
															<p className="text-sm text-zinc-500 font-medium">
																No completed tasks
															</p>
															<p className="text-xs text-zinc-400 mt-1">
																Completed tasks will appear here
															</p>
														</>
													)}
												</motion.div>
											)}
										</div>
									</SortableContext>
								</DroppableColumn>
							);
						})}
					</div>

					<DragOverlay>
						{activeId ? (
							<div className="opacity-50">
								{(() => {
									const task = tasks.find((t) => t.id === activeId);
									if (!task) return null;
									return (
										<SortableTaskCard
											task={task}
											onEdit={handleEdit}
											onDelete={handleDelete}
											onAddAssignee={handleAddAssignee}
											getPriorityColor={getPriorityColor}
											getTypeColor={getTypeColor}
											teamMembers={teamMembers}
										/>
									);
								})()}
							</div>
						) : null}
					</DragOverlay>
				</DndContext>
			)}

			{/* List View */}
			{!isLoadingTasks && !tasksError && viewMode === "list" && (
				<div className="bg-white rounded-xl border border-zinc-200 overflow-hidden px-4">
					<div className="overflow-x-auto">
						<div className="space-y-2 p-4">
							{filteredTasks.map((task) => (
								<motion.div
									key={task.id}
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									className="flex items-center gap-4 p-4 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
								>
									<div className="flex items-center gap-3 flex-1 min-w-0">
										<span
											className={`px-2 py-1 rounded-xl text-xs font-medium flex-shrink-0 ${getTypeColor(
												task.type
											)}`}
										>
											{task.type}
										</span>
										<div className="flex-1 min-w-0">
											<h4 className="font-semibold text-zinc-900 truncate">
												{task.title}
											</h4>
											{task.description && (
												<p className="text-sm text-zinc-600 truncate">
													{task.description}
												</p>
											)}
										</div>
										{task.category && (
											<span className="text-xs text-zinc-500 flex-shrink-0">
												{task.category}
											</span>
										)}
										<div className="flex -space-x-2 flex-shrink-0">
											{task.assignees?.map((assignee, idx) => (
												<div
													key={idx}
													className="w-8 h-8 rounded-full bg-zinc-200 border-2 border-white flex items-center justify-center text-xs font-medium text-zinc-700"
													title={assignee}
												>
													{getAssigneeInitials(assignee)}
												</div>
											))}
											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={() => handleAddAssignee(task.id)}
												className="w-8 h-8 rounded-full bg-zinc-100 border-2 border-dashed border-zinc-300 flex items-center justify-center text-xs font-medium text-zinc-500 hover:bg-zinc-200"
											>
												<Plus className="w-4 h-4" />
											</motion.button>
										</div>
										<span
											className={`px-2 py-1 rounded-xl text-xs font-medium flex-shrink-0 ${getPriorityColor(
												task.priority
											)}`}
										>
											{task.priority}
										</span>
										<span className="text-xs text-zinc-600 flex-shrink-0">
											{task.progress || 0}%
										</span>
										<span
											className={`px-2 py-1 rounded-xl text-xs font-medium flex-shrink-0 ${task.status === "done"
													? "bg-green-100 text-green-700"
													: task.status === "in-progress"
														? "bg-blue-100 text-blue-700"
														: "bg-zinc-100 text-zinc-700"
												}`}
										>
											{task.status}
										</span>
										<div className="flex items-center gap-2 flex-shrink-0">
											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={() => handleEdit(task)}
												className="p-2 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100"
											>
												<Edit className="w-4 h-4" />
											</motion.button>
											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={() => handleDelete(task.id)}
												className="p-2 text-zinc-400 hover:text-red-600 rounded-xl hover:bg-red-50"
											>
												<Trash2 className="w-4 h-4" />
											</motion.button>
										</div>
									</div>
								</motion.div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* Table View */}
			{!isLoadingTasks && !tasksError && viewMode === "table" && (
				<div className="bg-white rounded-xl border border-zinc-200 overflow-hidden px-4">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-zinc-50 border-b border-zinc-200">
								<tr>
									<th className="text-left py-3 px-4 font-semibold text-zinc-700 text-sm">
										Type
									</th>
									<th className="text-left py-3 px-4 font-semibold text-zinc-700 text-sm">
										Title
									</th>
									<th className="text-left py-3 px-4 font-semibold text-zinc-700 text-sm">
										Category
									</th>
									<th className="text-left py-3 px-4 font-semibold text-zinc-700 text-sm">
										Assignees
									</th>
									<th className="text-left py-3 px-4 font-semibold text-zinc-700 text-sm">
										Priority
									</th>
									<th className="text-left py-3 px-4 font-semibold text-zinc-700 text-sm">
										Progress
									</th>
									<th className="text-left py-3 px-4 font-semibold text-zinc-700 text-sm">
										Status
									</th>
									<th className="text-left py-3 px-4 font-semibold text-zinc-700 text-sm">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{filteredTasks.map((task) => (
									<tr
										key={task.id}
										className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
									>
										<td className="py-3 px-4">
											<span
												className={`px-2 py-1 rounded-xl text-xs font-medium ${getTypeColor(
													task.type
												)}`}
											>
												{task.type}
											</span>
										</td>
										<td className="py-3 px-4">
											<div>
												<div className="font-medium text-zinc-900">
													{task.title}
												</div>
												{task.description && (
													<div className="text-sm text-zinc-600 truncate max-w-xs">
														{task.description}
													</div>
												)}
											</div>
										</td>
										<td className="py-3 px-4 text-sm text-zinc-600">
											{task.category || "-"}
										</td>
										<td className="py-3 px-4">
											<div className="flex items-center gap-2">
												<div className="flex -space-x-2">
													{task.assignees?.map((assignee, idx) => (
														<div
															key={idx}
															className="w-8 h-8 rounded-full bg-zinc-200 border-2 border-white flex items-center justify-center text-xs font-medium text-zinc-700"
															title={assignee}
														>
															{getAssigneeInitials(assignee)}
														</div>
													))}
												</div>
												<motion.button
													whileHover={{ scale: 1.1 }}
													whileTap={{ scale: 0.9 }}
													onClick={() => handleAddAssignee(task.id)}
													className="w-8 h-8 rounded-full bg-zinc-100 border-2 border-dashed border-zinc-300 flex items-center justify-center text-xs font-medium text-zinc-500 hover:bg-zinc-200"
												>
													<Plus className="w-4 h-4" />
												</motion.button>
											</div>
										</td>
										<td className="py-3 px-4">
											<span
												className={`px-2 py-1 rounded-xl text-xs font-medium ${getPriorityColor(
													task.priority
												)}`}
											>
												{task.priority}
											</span>
										</td>
										<td className="py-3 px-4">
											<div className="flex items-center gap-2">
												<span className="text-sm text-zinc-600">
													{task.progress || 0}%
												</span>
												<div className="w-12 h-2 bg-zinc-200 rounded-full overflow-hidden">
													<div
														className="h-full bg-zinc-900 transition-all"
														style={{ width: `${task.progress || 0}%` }}
													/>
												</div>
											</div>
										</td>
										<td className="py-3 px-4">
											<span
												className={`px-2 py-1 rounded-xl text-xs font-medium ${task.status === "done"
														? "bg-green-100 text-green-700"
														: task.status === "in-progress"
															? "bg-blue-100 text-blue-700"
															: "bg-zinc-100 text-zinc-700"
													}`}
											>
												{task.status}
											</span>
										</td>
										<td className="py-3 px-4">
											<div className="flex items-center gap-2">
												<motion.button
													whileHover={{ scale: 1.1 }}
													whileTap={{ scale: 0.9 }}
													onClick={() => handleEdit(task)}
													className="p-2 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100"
												>
													<Edit className="w-4 h-4" />
												</motion.button>
												<motion.button
													whileHover={{ scale: 1.1 }}
													whileTap={{ scale: 0.9 }}
													onClick={() => handleDelete(task.id)}
													className="p-2 text-zinc-400 hover:text-red-600 rounded-xl hover:bg-red-50"
												>
													<Trash2 className="w-4 h-4" />
												</motion.button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Add/Edit Task Modal */}
			<AnimatePresence>
				{showAddModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
						onClick={handleCloseModal}
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
						>
							<div className="flex items-center justify-between p-4 border-b border-zinc-200">
								<h3 className="text-lg text-zinc-900">
									{editingTask ? "Edit Task" : "Add New Task"}
								</h3>
								<button
									onClick={handleCloseModal}
									className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
							<div className="p-4 space-y-4" ref={modalDropdownRef}>
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Title *
									</label>
									<input
										type="text"
										value={formData.title}
										onChange={(e) =>
											setFormData({ ...formData, title: e.target.value })
										}
										className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Description
									</label>
									<textarea
										value={formData.description}
										onChange={(e) =>
											setFormData({ ...formData, description: e.target.value })
										}
										rows={3}
										className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
									/>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-zinc-700 mb-2">
											Type
										</label>
										<AnimatedDropdown
											isOpen={openModalDropdown === "type"}
											onToggle={() =>
												setOpenModalDropdown(
													openModalDropdown === "type" ? null : "type"
												)
											}
											onSelect={(value) => {
												setFormData({ ...formData, type: value });
												setOpenModalDropdown(null);
											}}
											options={modalOptions.type}
											value={formData.type}
											placeholder="Select Type"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-zinc-700 mb-2">
											Priority
										</label>
										<AnimatedDropdown
											isOpen={openModalDropdown === "priority"}
											onToggle={() =>
												setOpenModalDropdown(
													openModalDropdown === "priority" ? null : "priority"
												)
											}
											onSelect={(value) => {
												setFormData({ ...formData, priority: value });
												setOpenModalDropdown(null);
											}}
											options={modalOptions.priority}
											value={formData.priority}
											placeholder="Select Priority"
										/>
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Status
									</label>
									<AnimatedDropdown
										isOpen={openModalDropdown === "status"}
										onToggle={() =>
											setOpenModalDropdown(
												openModalDropdown === "status" ? null : "status"
											)
										}
										onSelect={(value) => {
											setFormData({ ...formData, status: value });
											setOpenModalDropdown(null);
										}}
										options={modalOptions.status}
										value={formData.status}
										placeholder="Select Status"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Category (optional)
									</label>
									<input
										type="text"
										value={formData.category}
										onChange={(e) =>
											setFormData({ ...formData, category: e.target.value })
										}
										className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
									/>
								</div>
								<div className="flex items-center gap-2 pt-2">
									<motion.button
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={handleSave}
										className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium text-sm"
									>
										<Save className="w-4 h-4" />
										{editingTask ? "Update" : "Add"} Task
									</motion.button>
									<motion.button
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={handleCloseModal}
										className="px-4 py-2 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-medium text-sm transition-colors"
									>
										Cancel
									</motion.button>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Confirmation Modal */}
			<ConfirmationModal
				isOpen={showConfirmModal}
				onClose={() => {
					setShowConfirmModal(false);
					setConfirmAction(null);
				}}
				onConfirm={() => {
					if (confirmAction) {
						confirmAction();
					}
					setShowConfirmModal(false);
					setConfirmAction(null);
				}}
				title={confirmData.title}
				message={confirmData.message}
				confirmText="Confirm"
				cancelText="Cancel"
				variant={confirmData.variant}
			/>
		</div>
	);
};

export default KanbanBoardTab;
