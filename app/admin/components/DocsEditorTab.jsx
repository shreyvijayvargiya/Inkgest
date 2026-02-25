import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
	Save,
	FileText,
	Search,
	BookOpen,
	Plus,
	FolderPlus,
	X,
	MoreVertical,
	Edit,
	Trash2,
	Copy,
	Eye,
	Sidebar as SidebarIcon,
	BookA,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
	getAllDocs,
	getDocByPath,
	saveDoc,
	deleteDoc,
	createDoc,
	createCategory,
	renameDoc,
	duplicateDoc,
	getVersions,
} from "../../../lib/api/docs-editor";
import AnimatedDropdown from "../../../lib/ui/AnimatedDropdown";
import { toast } from "sonner";
import TiptapEditor from "./TiptapEditor";

// Doc Item Component
const DocItem = ({
	doc,
	selectedDocPath,
	onSelect,
	onMenuOpen,
	openMenuId,
	onRename,
	onDuplicate,
	onDelete,
}) => {
	return (
		<div className="flex items-center gap-1 group doc-menu-container relative">
			<button
				onClick={() => onSelect(doc)}
				className={`flex-1 text-left px-2 py-1.5 text-xs rounded transition-colors ${selectedDocPath === doc.path
						? "bg-zinc-50 text-zinc-900"
						: "text-zinc-600 hover:bg-zinc-100"
					}`}
			>
				<div className="truncate">{doc.title}</div>
			</button>
			<div className="relative">
				<button
					onClick={(e) => {
						e.stopPropagation();
						onMenuOpen(doc.path);
					}}
					className={`p-1 rounded transition-colors ${openMenuId === doc.path
							? "bg-zinc-200 text-zinc-900"
							: "text-zinc-400 hover:bg-zinc-100 opacity-0 group-hover:opacity-100"
						}`}
				>
					<MoreVertical className="w-3 h-3" />
				</button>
				<AnimatePresence>
					{openMenuId === doc.path && (
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: -10 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: -10 }}
							className="absolute right-0 top-6 z-50 bg-white border border-zinc-200 rounded shadow-lg py-1 min-w-[120px]"
							onClick={(e) => e.stopPropagation()}
						>
							{onRename && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										onRename(doc);
									}}
									className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 transition-colors"
								>
									<Edit className="w-3 h-3" />
									Rename
								</button>
							)}
							{onDuplicate && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										onDuplicate(doc);
									}}
									className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 transition-colors"
								>
									<Copy className="w-3 h-3" />
									Duplicate
								</button>
							)}
							<div className="border-t border-zinc-200 my-1" />
							{onDelete && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										onDelete(doc);
									}}
									className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
								>
									<Trash2 className="w-3 h-3" />
									Delete
								</button>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
};

// Category Component
const Category = ({
	category,
	docs,
	onAddFile,
	onMenuOpen,
	openMenuId,
	onRename,
	children,
}) => {
	const categoryIcon = docs[0]?.icon || "📁";

	return (
		<div className="mb-2">
			<div className="flex items-center gap-1 group category-menu-container">
				<div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-zinc-700">
					<span className="text-sm">{categoryIcon}</span>
					<span className="flex-1 text-left">{category || "Root"}</span>
				</div>
				<div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
					<button
						onClick={(e) => {
							e.stopPropagation();
							onAddFile(category);
						}}
						className="p-1.5 text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
						title="Add file to category"
					>
						<Plus className="w-3 h-3" />
					</button>
					<div className="relative">
						<button
							onClick={(e) => {
								e.stopPropagation();
								onMenuOpen(category);
							}}
							className={`p-1.5 rounded transition-colors ${openMenuId === category
									? "bg-zinc-200 text-zinc-900"
									: "text-zinc-600 hover:bg-zinc-100"
								}`}
						>
							<MoreVertical className="w-3 h-3" />
						</button>
						<AnimatePresence>
							{openMenuId === category && (
								<div className="relative">
									<motion.div
										initial={{ opacity: 0, scale: 0.95, y: -10 }}
										animate={{ opacity: 1, scale: 1, y: 0 }}
										exit={{ opacity: 0, scale: 0.95, y: -10 }}
										className="absolute right-0 top-6 z-50 bg-white border border-zinc-200 rounded shadow-lg py-1 min-w-[120px]"
									>
										<button
											onClick={(e) => {
												e.stopPropagation();
												if (onRename) {
													onRename(category);
												}
											}}
											className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 transition-colors"
										>
											<Edit className="w-3 h-3" />
											Rename
										</button>
									</motion.div>
									{/* Invisible overlay to close menu */}
									<div
										className="fixed inset-0 z-40"
										onClick={(e) => {
											e.stopPropagation();
											onMenuOpen(null);
										}}
									/>
								</div>
							)}
						</AnimatePresence>
					</div>
				</div>
			</div>
			<div className="ml-4 mt-1 space-y-0.5">{children}</div>
		</div>
	);
};

// Extract table of contents from markdown
const extractTOC = (markdown) => {
	if (!markdown) return [];
	const lines = markdown.split("\n");
	const toc = [];

	lines.forEach((line, index) => {
		const match = line.match(/^(#{1,6})\s+(.+)$/);
		if (match) {
			const level = match[1].length;
			const title = match[2].trim();
			const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
			toc.push({ level, title, id, line: index });
		}
	});

	return toc;
};

const DocsEditorTab = () => {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedVersion, setSelectedVersion] = useState(null);
	const [selectedDoc, setSelectedDoc] = useState(null);
	const [expandedCategories, setExpandedCategories] = useState(new Set());
	const [docForm, setDocForm] = useState({
		title: "",
		description: "",
		content: "",
	});
	const [isSaving, setIsSaving] = useState(false);
	const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
	const [showCreateFileModal, setShowCreateFileModal] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState("");
	const [newFileName, setNewFileName] = useState("");
	const [newFileTitle, setNewFileTitle] = useState("");
	const [newFileCategory, setNewFileCategory] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [openMenuDoc, setOpenMenuDoc] = useState(null);
	const [showRenameModal, setShowRenameModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showDuplicateModal, setShowDuplicateModal] = useState(false);
	const [docToAction, setDocToAction] = useState(null);
	const [categoryToAction, setCategoryToAction] = useState(null);
	const [renameFileName, setRenameFileName] = useState("");
	const [openMenuCategory, setOpenMenuCategory] = useState(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [showPreviewModal, setShowPreviewModal] = useState(false);
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [previewSearchQuery, setPreviewSearchQuery] = useState("");
	const [previewExpandedCategories, setPreviewExpandedCategories] = useState(
		new Set()
	);
	const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);

	// Fetch available versions
	const { data: versionsData } = useQuery({
		queryKey: ["docs-versions"],
		queryFn: () => getVersions(),
	});

	const versions = versionsData || [];

	// Set default version on mount if versions exist
	useEffect(() => {
		if (versions.length > 0 && !selectedVersion) {
			setSelectedVersion(versions[0]);
		}
	}, [versions, selectedVersion]);

	// Fetch all docs
	const {
		data: docsData,
		isLoading,
		refetch: refetchDocs,
	} = useQuery({
		queryKey: ["docs", selectedVersion],
		queryFn: () => getAllDocs(selectedVersion),
		enabled: !!selectedVersion,
	});

	// Fetch selected doc content
	const { data: docContent, isLoading: isLoadingDoc } = useQuery({
		queryKey: ["doc", selectedDoc?.path, selectedVersion],
		queryFn: () => getDocByPath(selectedDoc.path, selectedVersion),
		enabled: !!selectedDoc && !!selectedVersion,
	});

	// Update form when doc content loads
	useEffect(() => {
		if (docContent) {
			setDocForm({
				title: docContent.title || "",
				description: docContent.description || "",
				content: docContent.content || "",
			});
		}
	}, [docContent]);

	// Group docs by category
	const categories = useMemo(() => {
		if (!docsData?.categories) return {};
		return docsData.categories;
	}, [docsData]);

	// Filter docs by search and remove empty categories
	const filteredCategories = useMemo(() => {
		let cats = categories;

		// Filter by search query if provided
		if (searchQuery) {
			const filtered = {};
			Object.keys(categories).forEach((category) => {
				const docs = categories[category].filter(
					(doc) =>
						doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
						doc.description.toLowerCase().includes(searchQuery.toLowerCase())
				);
				if (docs.length > 0) {
					filtered[category] = docs;
				}
			});
			cats = filtered;
		}

		// Remove empty categories (except root which might have files)
		const filtered = {};
		Object.keys(cats).forEach((category) => {
			if (cats[category].length > 0) {
				filtered[category] = cats[category];
			}
		});
		return filtered;
	}, [categories, searchQuery]);

	// Extract TOC from current content
	const toc = useMemo(() => {
		return extractTOC(docForm.content);
	}, [docForm.content]);

	// Initialize preview expanded categories when modal opens
	useEffect(() => {
		if (showPreviewModal && categories && Object.keys(categories).length > 0) {
			setPreviewExpandedCategories(new Set(Object.keys(categories)));
		}
	}, [showPreviewModal, categories]);

	// Toggle category expansion
	const toggleCategory = (category) => {
		const newExpanded = new Set(expandedCategories);
		if (newExpanded.has(category)) {
			newExpanded.delete(category);
		} else {
			newExpanded.add(category);
		}
		setExpandedCategories(newExpanded);
	};

	// Handle doc selection
	const handleSelectDoc = async (doc) => {
		setSelectedDoc(doc);
	};

	// Handle save
	const handleSave = async () => {
		if (!selectedDoc) {
			toast.warning("Please select a document to save");
			return;
		}

		if (!docForm.title.trim()) {
			toast.warning("Please enter a title");
			return;
		}

		if (!selectedVersion) {
			toast.warning("Please select a version");
			return;
		}

		setIsSaving(true);
		try {
			await saveDoc(
				selectedDoc.path,
				{
					title: docForm.title,
					description: docForm.description,
					content: docForm.content,
					icon: selectedDoc.icon,
					order: selectedDoc.order,
				},
				selectedVersion
			);
			toast.success("Document saved successfully");
			refetchDocs();
		} catch (error) {
			console.error("Error saving doc:", error);
			toast.error(error.message || "Failed to save document");
		} finally {
			setIsSaving(false);
		}
	};

	// Handle content change
	const handleContentChange = (content) => {
		setDocForm((prev) => ({ ...prev, content }));
	};

	// Handle create category
	const handleCreateCategory = async () => {
		if (!newCategoryName.trim()) {
			toast.warning("Please enter a category name");
			return;
		}

		if (!selectedVersion) {
			toast.warning("Please select a version");
			return;
		}

		setIsCreating(true);
		try {
			await createCategory(newCategoryName, selectedVersion);
			toast.success("Category created successfully");
			setShowCreateCategoryModal(false);
			setNewCategoryName("");
			refetchDocs();
		} catch (error) {
			console.error("Error creating category:", error);
			toast.error(error.message || "Failed to create category");
		} finally {
			setIsCreating(false);
		}
	};

	// Handle create file
	const handleCreateFile = async () => {
		if (!newFileName.trim()) {
			toast.warning("Please enter a file name");
			return;
		}

		if (!selectedVersion) {
			toast.warning("Please select a version");
			return;
		}

		setIsCreating(true);
		try {
			// If category is "root", pass null to create file directly in version directory
			const category =
				newFileCategory && newFileCategory !== "root" ? newFileCategory : null;
			await createDoc(
				category,
				newFileName,
				{
					title: newFileTitle || newFileName,
					description: "",
					icon: "📄",
					order: 999,
				},
				selectedVersion
			);
			toast.success("File created successfully");
			setShowCreateFileModal(false);
			setNewFileName("");
			setNewFileTitle("");
			setNewFileCategory("");
			refetchDocs();

			// Auto-expand the category and select the new file
			if (category) {
				setExpandedCategories((prev) => new Set([...prev, category]));
			}
		} catch (error) {
			console.error("Error creating file:", error);
			toast.error(error.message || "Failed to create file");
		} finally {
			setIsCreating(false);
		}
	};

	// Open create file modal for specific category
	const handleAddFileToCategory = (category) => {
		setNewFileCategory(category);
		setShowCreateFileModal(true);
	};

	// Handle rename
	const handleRename = async () => {
		if ((!docToAction && !categoryToAction) || !renameFileName.trim()) {
			toast.warning("Please enter a new name");
			return;
		}

		if (!selectedVersion) {
			toast.warning("Please select a version");
			return;
		}

		setIsProcessing(true);

		try {
			if (categoryToAction) {
				// Handle Category Rename
				// We need an API endpoint for renaming directories, but 'renameDoc' might work if it uses fs.rename
				// The current 'renameDoc' API (lib/api/docs-editor.js) takes oldPath and newPath.
				// If the backend implementation supports directories, this will work.
				// Assuming standard fs.rename(oldPath, newPath) behavior on the server.

				const oldPath = categoryToAction;
				const newPath = renameFileName; // Just the new folder name

				// We need to pass the full path if it's nested, but categories here seem top-level?
				// Based on 'createCategory', categories are top-level folders in content/modules.
				// So oldPath is "categoryName", newPath is "newCategoryName".

				// However, api/docs/rename expects paths relative to content/modules.

				await renameDoc(oldPath, newPath, selectedVersion);
				toast.success("Category renamed successfully");
				setCategoryToAction(null);
			} else {
				// Handle File Rename
				const oldPath = docToAction.path;
				const category = docToAction.category || "";
				const newPath = category
					? `${category}/${renameFileName.endsWith(".mdx")
						? renameFileName
						: renameFileName + ".mdx"
					}`
					: renameFileName.endsWith(".mdx")
						? renameFileName
						: renameFileName + ".mdx";

				await renameDoc(oldPath, newPath, selectedVersion);
				toast.success("File renamed successfully");
				setDocToAction(null);
			}

			setShowRenameModal(false);
			setRenameFileName("");
			refetchDocs();
		} catch (error) {
			console.error("Error renaming:", error);
			toast.error(error.message || "Failed to rename");
		} finally {
			setIsProcessing(false);
		}
	};

	// Handle delete
	const handleDelete = async () => {
		if (!docToAction) return;

		if (!selectedVersion) {
			toast.warning("Please select a version");
			return;
		}

		setIsProcessing(true);
		try {
			await deleteDoc(docToAction.path, selectedVersion);
			toast.success("File deleted successfully");
			setShowDeleteModal(false);
			setDocToAction(null);

			// Clear selection if deleted doc was selected
			if (selectedDoc?.path === docToAction.path) {
				setSelectedDoc(null);
				setDocForm({ title: "", description: "", content: "" });
			}

			refetchDocs();
		} catch (error) {
			console.error("Error deleting doc:", error);
			toast.error(error.message || "Failed to delete file");
		} finally {
			setIsProcessing(false);
		}
	};

	// Handle duplicate
	const handleDuplicate = async () => {
		if (!docToAction) return;

		if (!selectedVersion) {
			toast.warning("Please select a version");
			return;
		}

		// Generate duplicate path
		const oldPath = docToAction.path;
		const category = docToAction.category || "";
		const fileName = oldPath.split("/").pop();
		const nameWithoutExt = fileName.replace(/\.(mdx|md)$/, "");
		const ext = fileName.endsWith(".md") ? ".md" : ".mdx";
		const duplicateName = `${nameWithoutExt}-copy${ext}`;
		const newPath = category ? `${category}/${duplicateName}` : duplicateName;

		setIsProcessing(true);
		try {
			await duplicateDoc(oldPath, newPath, selectedVersion);
			toast.success("File duplicated successfully");
			setShowDuplicateModal(false);
			setDocToAction(null);
			refetchDocs();

			// Auto-expand category and select the new file
			if (category) {
				setExpandedCategories((prev) => new Set([...prev, category]));
			}
		} catch (error) {
			console.error("Error duplicating doc:", error);
			toast.error(error.message || "Failed to duplicate file");
		} finally {
			setIsProcessing(false);
		}
	};

	// Open rename modal
	const openRenameModal = (doc) => {
		setDocToAction(doc);
		setCategoryToAction(null);
		const fileName = doc.path
			.split("/")
			.pop()
			.replace(/\.(mdx|md)$/, "");
		setRenameFileName(fileName);
		setOpenMenuDoc(null);
		setShowRenameModal(true);
	};

	// Open rename category modal
	const openRenameCategoryModal = (category) => {
		setCategoryToAction(category);
		setDocToAction(null);
		setRenameFileName(category);
		setOpenMenuCategory(null);
		setShowRenameModal(true);
	};

	// Open delete modal
	const openDeleteModal = (doc) => {
		setDocToAction(doc);
		setOpenMenuDoc(null);
		setShowDeleteModal(true);
	};

	// Open duplicate modal
	const openDuplicateModal = (doc) => {
		setDocToAction(doc);
		setOpenMenuDoc(null);
		setShowDuplicateModal(true);
	};

	// Close menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (!event.target.closest(".doc-menu-container")) {
				setOpenMenuDoc(null);
			}
			if (!event.target.closest(".category-menu-container")) {
				setOpenMenuCategory(null);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	if (isLoading || !selectedVersion) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-sm text-zinc-500">
					{!selectedVersion
						? "Please select a version"
						: "Loading documentation..."}
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200">
				<div className="flex items-center gap-2">
					<BookA className="w-4 h-4 text-zinc-600" />
					<h1 className="text-lg text-zinc-900">
						Documentation Editor
					</h1>
				</div>
				{selectedDoc && (
					<div className="flex items-center gap-2">
						<span className="text-xs text-zinc-500 font-mono">
							{selectedDoc.path}
						</span>
						<button
							onClick={() => setShowPreviewModal(true)}
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-100 text-zinc-700 rounded hover:bg-zinc-200 transition-colors"
						>
							<Eye className="w-3 h-3" />
							Preview
						</button>
						<button
							onClick={handleSave}
							disabled={isSaving}
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Save className="w-3 h-3" />
							{isSaving ? "Saving..." : "Save"}
						</button>
					</div>
				)}
			</div>

			<div className="flex-1 flex gap-4 overflow-hidden mt-2 px-4 py-2">
				{/* Sidebar */}
				<div className="w-64 border-r border-l border-b border-zinc-200 rounded-xl flex flex-col">
					{/* Search */}
					<div className="p-2 border-b border-zinc-200">
						<div className="relative">
							<Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-zinc-400" />
							<input
								type="text"
								placeholder="Search docs..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full pl-7 pr-2 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-zinc-100"
							/>
						</div>
					</div>

					{/* Version Selector */}
					<div className="p-2 border-b border-zinc-200">
						<AnimatedDropdown
							isOpen={isVersionDropdownOpen}
							onToggle={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
							onSelect={(version) => {
								setSelectedVersion(version);
								setSelectedDoc(null);
								setDocForm({ title: "", description: "", content: "" });
								setIsVersionDropdownOpen(false);
							}}
							options={versions.map((v) => ({ value: v, label: v }))}
							value={selectedVersion}
							placeholder="Select version..."
							className="w-full"
							buttonClassName="text-[10px] py-1 px-2 h-7"
							dropdownClassName="max-h-40"
							optionClassName="text-[10px] py-1"
						/>
					</div>

					{/* Add File and Category Buttons */}
					<div className="p-2 border-b border-zinc-200 space-y-1">
						<button
							onClick={() => {
								setNewFileCategory("");
								setShowCreateFileModal(true);
							}}
							className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
						>
							<Plus className="w-3 h-3" />
							<span>New File</span>
						</button>
						<button
							onClick={() => setShowCreateCategoryModal(true)}
							className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
						>
							<FolderPlus className="w-3 h-3" />
							<span>New Category</span>
						</button>
					</div>

					{/* Categories and Docs */}
					<div className="flex-1 overflow-y-auto p-2">
						{Object.keys(filteredCategories).length === 0 ? (
							<div className="text-xs text-zinc-500 text-center py-4">
								No documentation found
							</div>
						) : (
							Object.keys(filteredCategories).map((category) => {
								const docs = filteredCategories[category];
								// Handle "root" category - show files directly without category header
								if (
									category === "root" ||
									category === "." ||
									category === ""
								) {
									return (
										<div key={category} className="mb-2">
											{docs.map((doc) => (
												<DocItem
													key={doc.path}
													doc={doc}
													selectedDocPath={selectedDoc?.path}
													onSelect={handleSelectDoc}
													onMenuOpen={(id) =>
														setOpenMenuDoc(openMenuDoc === id ? null : id)
													}
													openMenuId={openMenuDoc}
													onRename={openRenameModal}
													onDuplicate={openDuplicateModal}
													onDelete={openDeleteModal}
												/>
											))}
										</div>
									);
								}
								// Regular categories with header
								return (
									<Category
										key={category}
										category={category}
										docs={docs}
										onAddFile={handleAddFileToCategory}
										onMenuOpen={(id) =>
											setOpenMenuCategory(openMenuCategory === id ? null : id)
										}
										openMenuId={openMenuCategory}
										onRename={openRenameCategoryModal}
									>
										{docs.map((doc) => (
											<DocItem
												key={doc.path}
												doc={doc}
												selectedDocPath={selectedDoc?.path}
												onSelect={handleSelectDoc}
												onMenuOpen={(id) =>
													setOpenMenuDoc(openMenuDoc === id ? null : id)
												}
												openMenuId={openMenuDoc}
												onRename={openRenameModal}
												onDuplicate={openDuplicateModal}
												onDelete={openDeleteModal}
											/>
										))}
									</Category>
								);
							})
						)}
					</div>
				</div>

				{/* Main Content Area */}
				<div className="flex-1 flex gap-4 overflow-hidden">
					{/* Editor */}
					<div className="flex-1 flex flex-col">
						{selectedDoc ? (
							<>
								{isLoadingDoc ? (
									<div className="flex items-center justify-center h-full">
										<div className="text-sm text-zinc-500">Loading...</div>
									</div>
								) : (
									<>
										{/* Title and Description */}
										<div className="space-y-2">
											<input
												type="text"
												placeholder="Document Title"
												value={docForm.title}
												onChange={(e) =>
													setDocForm((prev) => ({
														...prev,
														title: e.target.value,
													}))
												}
												className="w-full px-3 py-2 text-sm font-semibold border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-zinc-100"
											/>
											<input
												type="text"
												placeholder="Description (optional)"
												value={docForm.description}
												onChange={(e) =>
													setDocForm((prev) => ({
														...prev,
														description: e.target.value,
													}))
												}
												className="w-full px-3 py-2 text-xs text-zinc-600 border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-zinc-100"
											/>
										</div>

										{/* Editor */}
										<div className="flex-1 overflow-hidden mt-2">
											<TiptapEditor
												content={docForm.content}
												onChange={handleContentChange}
												placeholder="Start writing your documentation..."
											/>
										</div>
									</>
								)}
							</>
						) : (
							<div className="flex items-center justify-center h-full">
								<div className="text-center">
									<FileText className="w-12 h-12 text-zinc-300 mx-auto mb-2" />
									<p className="text-sm text-zinc-500">
										Select a document from the sidebar to start editing
									</p>
								</div>
							</div>
						)}
					</div>

					{/* Table of Contents */}
					{selectedDoc && toc.length > 0 && (
						<div className="w-48 p-3 overflow-y-auto">
							<div className="text-xs font-semibold text-zinc-700 mb-2">
								Table of Contents
							</div>
							<div className="space-y-1">
								{toc.map((item, index) => (
									<a
										key={index}
										href={`#${item.id}`}
										className={`block text-xs text-zinc-600 hover:text-zinc-900 transition-colors ${item.level === 1
												? "font-medium pl-0"
												: item.level === 2
													? "pl-3"
													: "pl-6"
											}`}
									>
										{item.title}
									</a>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Create Category Modal */}
			<AnimatePresence>
				{showCreateCategoryModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
						onClick={() => setShowCreateCategoryModal(false)}
					>
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.95, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white rounded p-4 w-full max-w-md mx-4"
						>
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-sm font-semibold text-zinc-900">
									Create New Category
								</h3>
								<button
									onClick={() => setShowCreateCategoryModal(false)}
									className="p-1 text-zinc-400 hover:text-zinc-600 rounded"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
							<div className="space-y-3">
								<div>
									<label className="block text-xs font-medium text-zinc-700 mb-1">
										Category Name
									</label>
									<input
										type="text"
										value={newCategoryName}
										onChange={(e) => setNewCategoryName(e.target.value)}
										placeholder="e.g., api, guides, tutorials"
										className="w-full px-3 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-zinc-100"
										autoFocus
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												handleCreateCategory();
											}
										}}
									/>
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={handleCreateCategory}
										disabled={isCreating || !newCategoryName.trim()}
										className="flex-1 px-3 py-2 text-xs font-medium bg-zinc-900 text-white rounded hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isCreating ? "Creating..." : "Create Category"}
									</button>
									<button
										onClick={() => setShowCreateCategoryModal(false)}
										className="px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
									>
										Cancel
									</button>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Create File Modal */}
			<AnimatePresence>
				{showCreateFileModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
						onClick={() => setShowCreateFileModal(false)}
					>
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.95, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white rounded p-4 w-full max-w-md mx-4"
						>
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-sm font-semibold text-zinc-900">
									Create New File
									{newFileCategory && (
										<span className="text-xs text-zinc-500 ml-2">
											in {newFileCategory}
										</span>
									)}
								</h3>
								<button
									onClick={() => setShowCreateFileModal(false)}
									className="p-1 text-zinc-400 hover:text-zinc-600 rounded"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
							<div className="space-y-3">
								<div>
									<label className="block text-xs font-medium text-zinc-700 mb-1">
										File Name
									</label>
									<input
										type="text"
										value={newFileName}
										onChange={(e) => setNewFileName(e.target.value)}
										placeholder="e.g., getting-started"
										className="w-full px-3 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-zinc-100"
										autoFocus
									/>
									<p className="text-[10px] text-zinc-500 mt-1">
										Will be saved as {newFileName || "filename"}.mdx
									</p>
								</div>
								<div>
									<label className="block text-xs font-medium text-zinc-700 mb-1">
										Title (optional)
									</label>
									<input
										type="text"
										value={newFileTitle}
										onChange={(e) => setNewFileTitle(e.target.value)}
										placeholder="Document title"
										className="w-full px-3 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-zinc-100"
									/>
								</div>
								{!newFileCategory && (
									<div>
										<label className="block text-xs font-medium text-zinc-700 mb-1">
											Category (optional)
										</label>
										<input
											type="text"
											value={newFileCategory}
											onChange={(e) => setNewFileCategory(e.target.value)}
											placeholder="Leave empty for root"
											className="w-full px-3 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-zinc-100"
										/>
									</div>
								)}
								<div className="flex items-center gap-2">
									<button
										onClick={handleCreateFile}
										disabled={isCreating || !newFileName.trim()}
										className="flex-1 px-3 py-2 text-xs font-medium bg-zinc-900 text-white rounded hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isCreating ? "Creating..." : "Create File"}
									</button>
									<button
										onClick={() => setShowCreateFileModal(false)}
										className="px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
									>
										Cancel
									</button>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Rename Modal */}
			<AnimatePresence>
				{showRenameModal && (docToAction || categoryToAction) && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
						onClick={() => setShowRenameModal(false)}
					>
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.95, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white rounded p-4 w-full max-w-md mx-4"
						>
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-sm font-semibold text-zinc-900">
									{categoryToAction ? "Rename" : "Rename"}
								</h3>
								<button
									onClick={() => setShowRenameModal(false)}
									className="p-1 text-zinc-400 hover:text-zinc-600 rounded"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
							<div className="space-y-3">
								<div>
									<label className="block text-xs font-medium text-zinc-700 mb-1">
										{categoryToAction ? "New Category Name" : "New File Name"}
									</label>
									<input
										type="text"
										value={renameFileName}
										onChange={(e) => setRenameFileName(e.target.value)}
										placeholder={
											categoryToAction ? "category-name" : "file-name"
										}
										className="w-full px-3 py-2 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-zinc-100"
										autoFocus
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												handleRename();
											}
										}}
									/>
									{!categoryToAction && (
										<p className="text-[10px] text-zinc-500 mt-1">
											Will be saved as {renameFileName || "filename"}.mdx
										</p>
									)}
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={handleRename}
										disabled={isProcessing || !renameFileName.trim()}
										className="flex-1 px-3 py-2 text-xs font-medium bg-zinc-900 text-white rounded hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isProcessing ? "Renaming..." : "Rename"}
									</button>
									<button
										onClick={() => setShowRenameModal(false)}
										className="px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
									>
										Cancel
									</button>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Delete Confirmation Modal */}
			<AnimatePresence>
				{showDeleteModal && docToAction && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
						onClick={() => setShowDeleteModal(false)}
					>
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.95, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white rounded p-4 w-full max-w-md mx-4"
						>
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-sm font-semibold text-zinc-900">
									Delete File
								</h3>
								<button
									onClick={() => setShowDeleteModal(false)}
									className="p-1 text-zinc-400 hover:text-zinc-600 rounded"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
							<div className="space-y-3">
								<p className="text-xs text-zinc-600">
									Are you sure you want to delete{" "}
									<strong>{docToAction.title}</strong>? This action cannot be
									undone.
								</p>
								<div className="flex items-center gap-2">
									<button
										onClick={handleDelete}
										disabled={isProcessing}
										className="flex-1 px-3 py-2 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isProcessing ? "Deleting..." : "Delete"}
									</button>
									<button
										onClick={() => setShowDeleteModal(false)}
										className="px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
									>
										Cancel
									</button>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Duplicate Confirmation Modal */}
			<AnimatePresence>
				{showDuplicateModal && docToAction && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
						onClick={() => setShowDuplicateModal(false)}
					>
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.95, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white rounded p-4 w-full max-w-md mx-4"
						>
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-sm font-semibold text-zinc-900">
									Duplicate File
								</h3>
								<button
									onClick={() => setShowDuplicateModal(false)}
									className="p-1 text-zinc-400 hover:text-zinc-600 rounded"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
							<div className="space-y-3">
								<p className="text-xs text-zinc-600">
									Create a copy of <strong>{docToAction.title}</strong>? The
									duplicate will be named "{docToAction.title} (Copy)".
								</p>
								<div className="flex items-center gap-2">
									<button
										onClick={handleDuplicate}
										disabled={isProcessing}
										className="flex-1 px-3 py-2 text-xs font-medium bg-zinc-900 text-white rounded hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isProcessing ? "Duplicating..." : "Duplicate"}
									</button>
									<button
										onClick={() => setShowDuplicateModal(false)}
										className="px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
									>
										Cancel
									</button>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Preview Modal */}
			<AnimatePresence>
				{showPreviewModal && selectedDoc && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black bg-opacity-50 z-50 flex"
						onClick={() => setShowPreviewModal(false)}
					>
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.95, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white rounded w-full max-w-7xl h-[90vh] mx-auto my-auto flex flex-col overflow-hidden"
						>
							{/* Preview Header */}
							<div className="flex items-center justify-between p-3 border-b border-zinc-200">
								<div className="flex items-center gap-2">
									<BookOpen className="w-4 h-4 text-zinc-600" />
									<span className="text-xs font-semibold text-zinc-900">
										Docs
									</span>
								</div>
							</div>

							{/* Preview Content */}
							<div className="flex-1 flex overflow-hidden">
								{/* Sidebar */}
								<AnimatePresence>
									{isSidebarOpen && (
										<motion.aside
											initial={{ width: 0, opacity: 0 }}
											animate={{ width: 240, opacity: 1 }}
											exit={{ width: 0, opacity: 0 }}
											className="border-r border-zinc-200 flex flex-col overflow-hidden"
										>
											{/* Search */}
											<div className="p-2 border-b border-zinc-200">
												<div className="relative">
													<Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-zinc-400" />
													<input
														type="text"
														placeholder="Search docs..."
														value={previewSearchQuery}
														onChange={(e) =>
															setPreviewSearchQuery(e.target.value)
														}
														className="w-full pl-7 pr-2 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-zinc-100"
													/>
												</div>
											</div>

											{/* Categories */}
											<div className="flex-1 overflow-y-auto p-2">
												{Object.keys(categories).map((category) => {
													const docs = categories[category];
													const isExpanded =
														previewExpandedCategories.has(category);
													const categoryIcon = docs[0]?.icon || "📁";

													return (
														<div key={category} className="mb-2">
															<div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-zinc-700">
																<span className="text-sm">{categoryIcon}</span>
																<span className="flex-1 text-left">
																	{category || "Root"}
																</span>
															</div>
															<div className="ml-4 mt-1 space-y-0.5">
																{docs.map((doc) => (
																	<button
																		key={doc.path}
																		onClick={async () => {
																			// Load the doc content when clicked in preview
																			try {
																				const docContent = await getDocByPath(
																					doc.path,
																					selectedVersion
																				);
																				setSelectedDoc(doc);
																				setDocForm({
																					title: docContent.title || "",
																					description:
																						docContent.description || "",
																					content: docContent.content || "",
																				});
																			} catch (error) {
																				console.error(
																					"Error loading doc:",
																					error
																				);
																				toast.error("Failed to load document");
																			}
																		}}
																		className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${selectedDoc?.path === doc.path
																				? "bg-zinc-50 text-zinc-900"
																				: "text-zinc-600 hover:bg-zinc-100"
																			}`}
																	>
																		<div className="truncate">{doc.title}</div>
																	</button>
																))}
															</div>
														</div>
													);
												})}
											</div>
										</motion.aside>
									)}
								</AnimatePresence>

								{/* Sidebar Toggle Button */}
								{!isSidebarOpen && (
									<button
										onClick={() => setIsSidebarOpen(true)}
										className="absolute left-2 top-16 p-2 bg-white border border-zinc-200 rounded shadow-sm hover:bg-zinc-50 transition-colors z-10"
									>
										<SidebarIcon className="w-4 h-4 text-zinc-600" />
									</button>
								)}

								{/* Main Content */}
								<div className="flex-1 flex overflow">
									<div className="flex-1 overflow-y-auto p-6">
										{/* Title and Description */}
										<div className="max-w-4xl mx-auto mb-6">
											<div className="flex items-center justify-between mb-2">
												<h1 className="text-2xl font-bold text-zinc-900">
													{docForm.title || selectedDoc.title}
												</h1>
												<button
													onClick={async () => {
														try {
															await navigator.clipboard.writeText(
																docForm.content
															);
															toast.success("Content copied to clipboard!");
														} catch (error) {
															toast.error("Failed to copy");
														}
													}}
													className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-100 text-zinc-700 rounded hover:bg-zinc-200 transition-colors"
												>
													<Copy className="w-3 h-3" />
													Copy
												</button>
											</div>
											{docForm.description && (
												<p className="text-sm text-zinc-600 mb-4">
													{docForm.description}
												</p>
											)}
										</div>

										{/* Markdown Content */}
										<div className="max-w-4xl mx-auto prose prose-zinc prose-sm max-w-none">
											<ReactMarkdown
												components={{
													h1: ({ node, children, ...props }) => {
														const text = String(children);
														const id = text
															.toLowerCase()
															.replace(/[^a-z0-9]+/g, "-")
															.replace(/^-+|-+$/g, "");
														return (
															<h1
																id={id}
																className="text-2xl font-bold text-zinc-900 mb-4 mt-6 scroll-mt-4"
																{...props}
															>
																{children}
															</h1>
														);
													},
													h2: ({ node, children, ...props }) => {
														const text = String(children);
														const id = text
															.toLowerCase()
															.replace(/[^a-z0-9]+/g, "-")
															.replace(/^-+|-+$/g, "");
														return (
															<h2
																id={id}
																className="text-xl font-bold text-zinc-900 mb-3 mt-5 scroll-mt-4"
																{...props}
															>
																{children}
															</h2>
														);
													},
													h3: ({ node, children, ...props }) => {
														const text = String(children);
														const id = text
															.toLowerCase()
															.replace(/[^a-z0-9]+/g, "-")
															.replace(/^-+|-+$/g, "");
														return (
															<h3
																id={id}
																className="text-lg font-semibold text-zinc-900 mb-2 mt-4 scroll-mt-4"
																{...props}
															>
																{children}
															</h3>
														);
													},
													p: ({ node, ...props }) => (
														<p
															className="text-zinc-700 mb-3 leading-6 text-sm"
															{...props}
														/>
													),
													ul: ({ node, ...props }) => (
														<ul
															className="list-disc mb-3 space-y-1.5 text-zinc-700 text-sm ml-6"
															{...props}
														/>
													),
													ol: ({ node, ...props }) => (
														<ol
															className="list-decimal mb-3 space-y-1.5 text-zinc-700 text-sm ml-6"
															{...props}
														/>
													),
													code: ({ node, inline, children, ...props }) => {
														if (inline) {
															return (
																<code
																	className="text-zinc-900 px-1.5 py-0.5 rounded text-xs font-mono bg-zinc-100 border border-zinc-200"
																	style={{
																		display: "inline",
																		whiteSpace: "pre-wrap",
																	}}
																	{...props}
																>
																	{children}
																</code>
															);
														}
														return (
															<code
																className="block p-3 bg-zinc-100 rounded text-xs font-mono overflow-x-auto"
																{...props}
															>
																{children}
															</code>
														);
													},
													pre: ({ node, ...props }) => (
														<pre
															className="bg-zinc-100 rounded p-3 overflow-x-auto mb-3"
															{...props}
														/>
													),
													blockquote: ({ node, ...props }) => (
														<blockquote
															className="border-l-4 border-zinc-300 pl-3 italic text-zinc-600 my-3 text-sm"
															{...props}
														/>
													),
													a: ({ node, ...props }) => (
														<a
															className="text-blue-600 hover:text-blue-800 underline"
															target="_blank"
															rel="noopener noreferrer"
															{...props}
														/>
													),
													strong: ({ node, ...props }) => (
														<strong
															className="font-semibold text-zinc-900"
															{...props}
														/>
													),
												}}
											>
												{docForm.content || "*No content yet*"}
											</ReactMarkdown>
										</div>
									</div>

									{/* Table of Contents */}
									{toc.length > 0 && (
										<div className="w-48 p-4 overflow-y-auto">
											<div className="text-xs font-semibold text-zinc-700 mb-3">
												Table of Contents
											</div>
											<div className="space-y-1">
												{toc.map((item, index) => (
													<a
														key={index}
														href={`#${item.id}`}
														onClick={(e) => {
															e.preventDefault();
															const element = document.getElementById(item.id);
															if (element) {
																element.scrollIntoView({
																	behavior: "smooth",
																	block: "start",
																});
															}
														}}
														className={`block text-xs text-zinc-600 hover:text-zinc-900 transition-colors ${item.level === 1
																? "font-medium pl-0"
																: item.level === 2
																	? "pl-3"
																	: "pl-6"
															}`}
													>
														{item.title}
													</a>
												))}
											</div>
										</div>
									)}
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default DocsEditorTab;
