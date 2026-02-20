import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	FileText,
	Mail,
	Users,
	Shield,
	Eye,
	ShoppingBag,
	Search,
	LogIn,
	ChevronDown,
	ChevronRight,
	Plus,
	Home,
	CreditCard,
	MessageSquare,
	User,
	RocketIcon,
	ExternalLink,
	Receipt,
	Building2,
	AlertCircle,
	UsersRound,
	LayoutGrid,
	FileEdit,
	GitBranch,
	FolderOpen,
	Clock,
	GripVertical,
	Lightbulb,
	Database,
	Table2,
	Lock,
} from "lucide-react";
import { getAllCollections } from "../../../lib/api/tables";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragOverlay,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "react-toastify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const ICON_MAP = {
	Home,
	FileText,
	Mail,
	LayoutGrid,
	FolderOpen,
	Clock,
	User,
	Users,
	Building2,
	UsersRound,
	Eye,
	CreditCard,
	Receipt,
	ShoppingBag,
	MessageSquare,
	FileEdit,
	AlertCircle,
	GitBranch,
	Shield,
	Lightbulb,
	Database,
	Table2,
	Lock,
};

const DEFAULT_NAV_STRUCTURE = [
	{
		id: "overview",
		title: "Overview",
		items: [{ id: "home", label: "Home", icon: "Home" }],
	},
	{
		id: "content",
		title: "Content",
		items: [
			{ id: "blogs", label: "Blogs", icon: "FileText" },
			{ id: "emails", label: "Emails", icon: "Mail" },
			{ id: "kanban-board", label: "Kanban Board", icon: "LayoutGrid" },
			{ id: "idea-database", label: "Idea Database", icon: "Lightbulb" },
			{ id: "assets", label: "Assets", icon: "FolderOpen" },
			{ id: "cron-jobs", label: "CRON Jobs", icon: "Clock" },
		],
	},
	{
		id: "audience",
		title: "Audience",
		items: [
			{ id: "subscribers", label: "Email Subscribers", icon: "User" },
			{ id: "users", label: "Users", icon: "Users" },
			{ id: "customers", label: "Customers", icon: "Building2" },
			{ id: "waitlist", label: "Waitlist", icon: "UsersRound" },
			{ id: "analytics", label: "Analytics", icon: "Eye" },
		],
	},
	{
		id: "financial",
		title: "Financial",
		items: [
			{ id: "payments", label: "Payments", icon: "CreditCard" },
			{ id: "invoices", label: "Invoices", icon: "Receipt" },
			{ id: "products", label: "Products", icon: "ShoppingBag" },
		],
	},
	{
		id: "communication",
		title: "Communication",
		items: [
			{ id: "messages", label: "Messages", icon: "MessageSquare" },
			{ id: "forms", label: "Forms", icon: "FileEdit" },
		],
	},
	{
		id: "support",
		title: "Support",
		items: [
			{ id: "reportIssues", label: "Report Issues", icon: "AlertCircle" },
		],
	},
	{
		id: "frontend",
		title: "Frontend",
		items: [{ id: "changelog", label: "Changelog", icon: "GitBranch" }],
	},
	{
		id: "automations",
		title: "Automations",
		items: [{ id: "workflows", label: "Workflows", icon: "Bot" }],
	},
	{
		id: "Database",
		title: "Database",
		items: [{ id: "tables", label: "Tables", icon: "Table2" }],
	},
	{
		id: "settings",
		title: "Settings",
		items: [{ id: "teams", label: "Teams", icon: "Shield" }],
	},
];

const SortableNavItem = ({ item, activeTab, onSelect }) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const Icon = ICON_MAP[item.icon] || Home;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`group relative flex items-center rounded-xl transition-all ${
				isDragging ? "bg-zinc-50 ring-2 ring-zinc-200 shadow-sm z-50" : ""
			}`}
		>
			<button
				{...attributes}
				{...listeners}
				className="py-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 transition-opacity"
			>
				<GripVertical className="w-3 h-3" />
			</button>
			<button
				onClick={() => onSelect(item.id)}
				className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors rounded-xl flex items-center gap-2 ${
					activeTab === item.id
						? "bg-zinc-100 text-zinc-900"
						: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
				}`}
			>
				<Icon className="w-3.5 h-3.5" />
				{item.label}
			</button>
		</div>
	);
};

const SortableCategory = ({ category, activeTab, onSelect }) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: category.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`pt-2 group/category rounded-xl transition-all ${
				isDragging
					? "bg-white ring-2 ring-zinc-100 shadow-lg z-50 px-1 pb-2"
					: ""
			}`}
		>
			<div className="flex items-center justify-between mb-1">
				<p className="px-2.5 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
					{category.title}
				</p>
				<button
					{...attributes}
					{...listeners}
					className="p-1 opacity-0 group-hover/category:opacity-100 cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 transition-opacity"
				>
					<GripVertical className="w-3 h-3" />
				</button>
			</div>
			<div className="space-y-1">
				<SortableContext
					items={category.items.map((i) => i.id)}
					strategy={verticalListSortingStrategy}
				>
					{category.items.map((item) => (
						<SortableNavItem
							key={item.id}
							item={item}
							activeTab={activeTab}
							onSelect={onSelect}
						/>
					))}
				</SortableContext>
			</div>
		</div>
	);
};

const Sidebar = ({
	activeTab,
	setActiveTab,
	isSidebarOpen,
	setIsSidebarOpen,
	setShowSearchModal,
	setShowLoginModal,
	user,
	onTableSelect,
	selectedTable,
}) => {
	const queryClient = useQueryClient();
	const queryKey = ["admin_nav_structure"];
	const [isTablesExpanded, setIsTablesExpanded] = useState(true);

	// Fetch all database collections
	const { data: databaseTables = [] } = useQuery({
		queryKey: ["allCollections"],
		queryFn: getAllCollections,
	});

	// Helper function to merge new items from default structure into saved structure
	const mergeNavStructure = (savedStructure, defaultStructure) => {
		if (!savedStructure) return defaultStructure;

		// Create a map of existing items by id for quick lookup
		const existingItems = new Set();
		savedStructure.forEach((category) => {
			category.items?.forEach((item) => existingItems.add(item.id));
		});

		// Merge new items from default structure
		const merged = savedStructure.map((savedCategory) => {
			const defaultCategory = defaultStructure.find(
				(cat) => cat.id === savedCategory.id,
			);
			if (!defaultCategory) return savedCategory;

			// Find items in default that don't exist in saved
			const newItems = defaultCategory.items.filter(
				(defaultItem) => !existingItems.has(defaultItem.id),
			);

			// If there are new items, add them to the saved category
			if (newItems.length > 0) {
				return {
					...savedCategory,
					items: [...savedCategory.items, ...newItems],
				};
			}

			return savedCategory;
		});

		// Add any new categories that don't exist in saved structure
		defaultStructure.forEach((defaultCategory) => {
			const exists = merged.some((cat) => cat.id === defaultCategory.id);
			if (!exists) {
				merged.push(defaultCategory);
			}
		});

		return merged;
	};

	// Use React Query to manage the sidebar structure
	const { data: navStructure = DEFAULT_NAV_STRUCTURE } = useQuery({
		queryKey,
		queryFn: () => {
			if (typeof window === "undefined") return DEFAULT_NAV_STRUCTURE;
			const saved = localStorage.getItem("admin_nav_structure");
			const savedStructure = saved ? JSON.parse(saved) : null;

			// Merge saved structure with default to include any new items
			const merged = mergeNavStructure(savedStructure, DEFAULT_NAV_STRUCTURE);

			// If structure was merged (new items added), save it back
			if (
				savedStructure &&
				JSON.stringify(merged) !== JSON.stringify(savedStructure)
			) {
				localStorage.setItem("admin_nav_structure", JSON.stringify(merged));
			}

			return merged;
		},
		staleTime: Infinity, // Keep the data fresh as it's purely local
	});

	const { mutate: updateNavStructure } = useMutation({
		mutationFn: async (newStructure) => {
			if (typeof window !== "undefined") {
				localStorage.setItem(
					"admin_nav_structure",
					JSON.stringify(newStructure),
				);
			}
			return newStructure;
		},
		onSuccess: (newStructure) => {
			queryClient.setQueryData(queryKey, newStructure);
		},
	});

	const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
	const [activeId, setActiveId] = useState(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 5,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragStart = (event) => {
		setActiveId(event.active.id);
	};

	const handleDragEnd = (event) => {
		const { active, over } = event;
		setActiveId(null);
		if (!over) return;

		if (active.id !== over.id) {
			// Check if we are dragging a category or an item
			const isActiveCategory = navStructure.some((cat) => cat.id === active.id);
			const isOverCategory = navStructure.some((cat) => cat.id === over.id);

			if (isActiveCategory && isOverCategory) {
				// Reordering categories
				const oldIndex = navStructure.findIndex((cat) => cat.id === active.id);
				const newIndex = navStructure.findIndex((cat) => cat.id === over.id);
				updateNavStructure(arrayMove(navStructure, oldIndex, newIndex));
			} else {
				// Reordering items within or across categories
				const activeCatIndex = navStructure.findIndex((cat) =>
					cat.items.some((i) => i.id === active.id),
				);
				const overCatIndex = navStructure.findIndex((cat) =>
					cat.items.some((i) => i.id === over.id),
				);

				if (activeCatIndex === -1) return;

				const newStructure = [...navStructure];

				if (activeCatIndex === overCatIndex) {
					// Reordering within the same category
					const category = { ...newStructure[activeCatIndex] };
					const oldIndex = category.items.findIndex((i) => i.id === active.id);
					const newIndex = category.items.findIndex((i) => i.id === over.id);
					category.items = arrayMove(category.items, oldIndex, newIndex);
					newStructure[activeCatIndex] = category;
				} else if (overCatIndex !== -1) {
					// Moving from one category to another
					const activeCategory = { ...newStructure[activeCatIndex] };
					const overCategory = { ...newStructure[overCatIndex] };

					const activeItemIndex = activeCategory.items.findIndex(
						(i) => i.id === active.id,
					);
					const item = activeCategory.items[activeItemIndex];

					// Remove from active category
					activeCategory.items.splice(activeItemIndex, 1);

					// Add to over category at the correct index
					const overItemIndex = overCategory.items.findIndex(
						(i) => i.id === over.id,
					);
					overCategory.items.splice(overItemIndex, 0, item);

					newStructure[activeCatIndex] = activeCategory;
					newStructure[overCatIndex] = overCategory;
				}

				updateNavStructure(newStructure);
			}
		}
	};

	const handleDragCancel = () => {
		setActiveId(null);
	};

	const activeItem = activeId
		? navStructure
				.flatMap((cat) => [cat, ...cat.items])
				.find((item) => item.id === activeId)
		: null;

	const isCategory = (id) => navStructure.some((cat) => cat.id === id);

	const sidebarContent = (isMobile = false) => (
		<div className={`flex flex-col h-full ${isMobile ? "p-3" : "py-6 px-1"}`}>
			<div className="space-y-2 hidescrollbar overflow-y-auto">
				{/* Project Dropdown / Logo */}
				<div className="relative project-dropdown mb-2">
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() =>
							isMobile && setIsProjectDropdownOpen(!isProjectDropdownOpen)
						}
						className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
					>
						<RocketIcon className="w-3.5 h-3.5" />
						<span className="text-xs font-medium">Inkgest Admin</span>
						{isMobile && (
							<ChevronDown
								className={`w-4 h-4 ml-auto text-zinc-400 transition-transform ${
									isProjectDropdownOpen ? "rotate-180" : ""
								}`}
							/>
						)}
					</motion.button>

					{isMobile && (
						<AnimatePresence>
							{isProjectDropdownOpen && (
								<motion.div
									initial={{ opacity: 0, y: -10, scale: 0.95 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									exit={{ opacity: 0, y: -10, scale: 0.95 }}
									transition={{ duration: 0.15 }}
									className="absolute top-full left-0 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden"
								>
									<div className="p-2 border-b border-zinc-100 bg-zinc-50">
										<p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2">
											Projects
										</p>
									</div>
									<button className="w-full px-4 py-2.5 text-left text-sm font-medium text-zinc-900 border-b border-zinc-100 hover:bg-zinc-50 flex items-center gap-2">
										<RocketIcon className="w-3.5 h-3.5 text-zinc-400" />
										Default Project
									</button>
									<button
										onClick={() => toast.info("Coming soon!")}
										className="w-full px-4 py-2.5 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-50 flex items-center gap-2"
									>
										<Plus className="w-3.5 h-3.5" />
										Add New Project
									</button>
								</motion.div>
							)}
						</AnimatePresence>
					)}
				</div>

				{/* Search Button */}
				<button
					onClick={() => {
						setShowSearchModal(true);
						if (isMobile) setIsSidebarOpen(false);
					}}
					className="w-full px-2 py-1 text-sm font-medium transition-colors rounded-xl flex items-center gap-2 bg-white hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 border border-zinc-300 mb-2"
				>
					<Search className="w-3.5 h-3.5" />
					<div className="flex items-center gap-2 flex-1 justify-between">
						<p>Search</p>
						{!isMobile && (
							<i className="text-[9px] mt-0.5 text-zinc-400 whitespace-nowrap">
								CMD + K
							</i>
						)}
					</div>
				</button>
			</div>
			<div className="flex-1 hidescrollbar overflow-y-auto">
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragCancel={handleDragCancel}
				>
					<SortableContext
						items={navStructure.map((cat) => cat.id)}
						strategy={verticalListSortingStrategy}
					>
						{navStructure.map((category) => (
							<SortableCategory
								key={category.id}
								category={category}
								activeTab={activeTab}
								onSelect={(id) => {
									setActiveTab(id);
									if (isMobile) setIsSidebarOpen(false);
								}}
								databaseTables={databaseTables}
								isTablesExpanded={isTablesExpanded}
								setIsTablesExpanded={setIsTablesExpanded}
								onTableSelect={(table) => {
									onTableSelect?.(table);
									if (isMobile) setIsSidebarOpen(false);
								}}
								selectedTable={selectedTable}
							/>
						))}
					</SortableContext>
					<DragOverlay zoom={1.05}>
						{activeId ? (
							isCategory(activeId) ? (
								<div className="bg-white ring-2 ring-zinc-200 shadow-2xl rounded-xl p-2 opacity-90">
									<p className="px-2.5 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
										{activeItem.title}
									</p>
									<div className="space-y-1">
										{activeItem.items.map((item) => (
											<div
												key={item.id}
												className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-50 rounded-xl border border-zinc-100 italic opacity-50"
											>
												{item.label}
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-zinc-900 bg-white rounded-xl shadow-xl ring-2 ring-zinc-200 border border-zinc-100 min-w-[150px]">
									{ICON_MAP[activeItem.icon] &&
										React.createElement(ICON_MAP[activeItem.icon], {
											className: "w-3.5 h-3.5",
										})}
									{activeItem.label}
								</div>
							)
						) : null}
					</DragOverlay>
				</DndContext>
			</div>

			{/* Footer Section */}
			<div className="mt-auto pt-4 space-y-2 border-t border-zinc-100">
				<a
					className="flex gap-2 items-center px-2 py-1.5 cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
					href="/docs"
					target="_blank"
				>
					<ExternalLink className="w-3 h-3" /> Read Docs
				</a>
				<button
					onClick={() => setShowLoginModal(true)}
					className="w-full px-2.5 py-1.5 text-xs font-medium transition-colors rounded-xl flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-black"
				>
					<LogIn className="w-3.5 h-3.5" />
					<span className="truncate flex-1 text-left">
						{user ? user.displayName || "Logged In" : "Login"}
					</span>
				</button>

				<div className="p-3 bg-white border border-zinc-200 rounded-xl shadow-sm">
					<p className="font-bold text-zinc-900 text-sm">Inkgest PRO</p>
					<p className="text-[10px] text-zinc-500 mt-1 mb-2 leading-relaxed">
						Build SAAS applications 10x Faster. The complete boilerplate for
						developers.
					</p>
					<a
						className="block text-center bg-zinc-900 text-white text-[10px] py-1.5 rounded-xl font-medium hover:bg-zinc-800 transition-colors"
						target="_blank"
						rel="noopener noreferrer"
						href="https://buy.polar.sh/polar_cl_4DKKA9Ohkz60mo6VtK0VetQLUkkS5lWnjpeRv4Y9rPK"
					>
						Get PRO Access
					</a>
				</div>
			</div>
		</div>
	);

	return (
		<>
			{/* Desktop Sidebar */}
			<aside className="hidden md:flex h-full w-48 bg-transparent flex-col overflow-hidden">
				{sidebarContent(false)}
			</aside>

			{/* Mobile Sidebar */}
			<AnimatePresence>
				{isSidebarOpen && (
					<motion.aside
						initial={{ x: -280 }}
						animate={{ x: 0 }}
						exit={{ x: -280 }}
						transition={{ type: "spring", damping: 25, stiffness: 200 }}
						className="fixed md:hidden inset-y-0 left-0 top-0 w-64 bg-white border-r border-zinc-200 z-50 overflow-hidden"
					>
						{sidebarContent(true)}
					</motion.aside>
				)}
			</AnimatePresence>
		</>
	);
};

export default Sidebar;
