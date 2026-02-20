import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
	Plus,
	Trash2,
	Search,
	X,
	Save,
	Calendar,
	Tag,
	Edit,
	Eye,
} from "lucide-react";
import TiptapEditor from "./TiptapEditor";
import TableSkeleton from "../../../lib/ui/TableSkeleton";
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
	TableEmpty,
} from "../../../lib/ui/Table";
import {
	getAllChangelogs,
	createChangelog,
	updateChangelog,
	deleteChangelog,
} from "../../../lib/api/changelog";
import { toast } from "react-toastify";
import ConfirmationModal from "../../../lib/ui/ConfirmationModal";

const ChangelogTab = ({ queryClient }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [showChangelogModal, setShowChangelogModal] = useState(false);
	const [editingChangelog, setEditingChangelog] = useState(null);
	const [changelogForm, setChangelogForm] = useState({
		title: "",
		description: "",
		date: new Date().toISOString().split("T")[0],
		categories: [],
	});
	const [changelogContent, setChangelogContent] = useState("");
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [confirmAction, setConfirmAction] = useState(null);
	const [showPreviewModal, setShowPreviewModal] = useState(false);
	const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null);

	// Available categories
	const availableCategories = [
		"New releases",
		"Improvements",
		"Bug fixes",
		"Features",
		"Security",
	];

	// Fetch changelogs
	const {
		data: changelogs = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["changelog"],
		queryFn: () => getAllChangelogs(),
	});

	// Filter changelogs by search query
	const filteredChangelogs = changelogs.filter((changelog) => {
		const searchLower = searchQuery.toLowerCase();
		return (
			changelog.title?.toLowerCase().includes(searchLower) ||
			changelog.description?.toLowerCase().includes(searchLower) ||
			changelog.content?.toLowerCase().includes(searchLower) ||
			changelog.categories?.some((cat) =>
				cat.toLowerCase().includes(searchLower)
			)
		);
	});

	// Create changelog mutation
	const createChangelogMutation = useMutation({
		mutationFn: createChangelog,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["changelog"] });
			handleCloseModal();
			toast.success("Changelog created successfully!");
		},
		onError: (error) => {
			console.error("Error creating changelog:", error);
			toast.error("Failed to create changelog. Please try again.");
		},
	});

	// Update changelog mutation
	const updateChangelogMutation = useMutation({
		mutationFn: ({ id, data }) => updateChangelog(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["changelog"] });
			handleCloseModal();
			toast.success("Changelog updated successfully!");
		},
		onError: (error) => {
			console.error("Error updating changelog:", error);
			toast.error("Failed to update changelog. Please try again.");
		},
	});

	// Delete changelog mutation
	const deleteChangelogMutation = useMutation({
		mutationFn: deleteChangelog,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["changelog"] });
			toast.success("Changelog deleted successfully!");
		},
		onError: (error) => {
			console.error("Error deleting changelog:", error);
			toast.error("Failed to delete changelog. Please try again.");
		},
	});

	// Handle create new changelog
	const handleCreateChangelog = () => {
		setEditingChangelog(null);
		setChangelogForm({
			title: "",
			description: "",
			date: new Date().toISOString().split("T")[0],
			categories: [],
		});
		setChangelogContent("");
		setShowChangelogModal(true);
	};

	// Handle edit changelog
	const handleEditChangelog = (changelog) => {
		setEditingChangelog(changelog);
		const date = changelog.date?.toDate
			? changelog.date.toDate().toISOString().split("T")[0]
			: changelog.date
				? new Date(changelog.date).toISOString().split("T")[0]
				: new Date().toISOString().split("T")[0];

		setChangelogForm({
			title: changelog.title || "",
			description: changelog.description || "",
			date: date,
			categories: changelog.categories || [],
		});
		setChangelogContent(changelog.content || "");
		setShowChangelogModal(true);
	};

	// Handle save changelog
	const handleSaveChangelog = () => {
		if (!changelogForm.title.trim()) {
			toast.warning("Please enter a changelog title");
			return;
		}

		if (!changelogForm.date) {
			toast.warning("Please select a date");
			return;
		}

		const changelogData = {
			...changelogForm,
			content: changelogContent,
			date: new Date(changelogForm.date),
		};

		if (editingChangelog) {
			updateChangelogMutation.mutate({
				id: editingChangelog.id,
				data: changelogData,
			});
		} else {
			createChangelogMutation.mutate(changelogData);
		}
	};

	// Handle delete changelog
	const handleDeleteChangelog = (changelogId) => {
		setConfirmAction(() => () => deleteChangelogMutation.mutate(changelogId));
		setShowConfirmModal(true);
	};

	// Handle category toggle
	const handleToggleCategory = (category) => {
		setChangelogForm((prev) => {
			const categories = prev.categories || [];
			if (categories.includes(category)) {
				return {
					...prev,
					categories: categories.filter((cat) => cat !== category),
				};
			} else {
				return {
					...prev,
					categories: [...categories, category],
				};
			}
		});
	};

	// Format date
	const formatDate = (date) => {
		if (!date) return "";
		const d = date?.toDate ? date.toDate() : new Date(date);
		if (isNaN(d.getTime())) return "";
		return d.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	// Format date for preview (e.g., "December 23, 2025")
	const formatDatePreview = (date) => {
		if (!date) return "";
		const d = date?.toDate ? date.toDate() : new Date(date);
		if (isNaN(d.getTime())) return "";
		return d.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	// Group changelogs by date
	const groupChangelogsByDate = () => {
		const grouped = {};
		const filtered = selectedCategoryFilter
			? changelogs.filter((changelog) =>
					changelog.categories?.includes(selectedCategoryFilter)
				)
			: changelogs;

		filtered.forEach((changelog) => {
			const dateKey = formatDatePreview(changelog.date);
			if (!grouped[dateKey]) {
				grouped[dateKey] = [];
			}
			grouped[dateKey].push(changelog);
		});

		// Sort dates in descending order
		return Object.entries(grouped).sort((a, b) => {
			// Get the first changelog from each group to get the date
			const changelogA = a[1][0];
			const changelogB = b[1][0];
			const dateA = changelogA?.date;
			const dateB = changelogB?.date;
			const dA = dateA?.toDate ? dateA.toDate() : new Date(dateA);
			const dB = dateB?.toDate ? dateB.toDate() : new Date(dateB);
			return dB - dA;
		});
	};

	// Parse markdown/HTML content to display
	const parseContent = (content) => {
		if (!content) return "";

		// Check if it's HTML
		const isHTML =
			content.includes("<") &&
			content.includes(">") &&
			content.match(/<\/?[a-z][\s\S]*>/i);

		if (isHTML) {
			return content;
		}

		// Convert markdown to HTML
		let html = content;

		// Headers
		html = html.replace(
			/^### (.*$)/gim,
			"<h3 class='font-bold text-zinc-900 mt-4 mb-2'>$1</h3>"
		);
		html = html.replace(
			/^## (.*$)/gim,
			"<h2 class='font-bold text-zinc-900 mt-4 mb-2'>$1</h2>"
		);
		html = html.replace(
			/^# (.*$)/gim,
			"<h1 class='font-bold text-zinc-900 mt-4 mb-2 text-lg'>$1</h1>"
		);

		// Bold
		html = html.replace(
			/\*\*(.*?)\*\*/g,
			"<strong class='font-semibold'>$1</strong>"
		);

		// Italic
		html = html.replace(/\*(.*?)\*/g, "<em class='italic'>$1</em>");

		// Code
		html = html.replace(
			/`([^`]+)`/g,
			"<code class='bg-zinc-100 px-1 py-0.5 rounded text-sm font-mono'>$1</code>"
		);

		// Links
		html = html.replace(
			/\[([^\]]+)\]\(([^)]+)\)/g,
			"<a href='$2' class='text-blue-600 hover:underline' target='_blank' rel='noopener noreferrer'>$1</a>"
		);

		// Unordered lists
		html = html.replace(/^\- (.*$)/gim, "<li class='ml-4 mb-1'>$1</li>");
		html = html.replace(
			/(<li.*<\/li>)/s,
			"<ul class='list-disc ml-6 my-2 space-y-1'>$1</ul>"
		);

		// Ordered lists
		html = html.replace(/^\d+\. (.*$)/gim, "<li class='ml-4 mb-1'>$1</li>");

		// Paragraphs
		html = html
			.split("\n\n")
			.map((para) => {
				if (!para.trim()) return "";
				if (para.startsWith("<") && para.endsWith(">")) return para;
				return `<p class='mb-3 text-zinc-700'>${para.trim()}</p>`;
			})
			.join("\n");

		// Line breaks
		html = html.replace(/\n/g, "<br />");

		return html;
	};

	// Get all unique categories from changelogs
	const getAllCategories = () => {
		const categories = new Set();
		changelogs.forEach((changelog) => {
			changelog.categories?.forEach((cat) => categories.add(cat));
		});
		return Array.from(categories);
	};

	// Close modal
	const handleCloseModal = () => {
		setShowChangelogModal(false);
		setEditingChangelog(null);
		setChangelogForm({
			title: "",
			description: "",
			date: new Date().toISOString().split("T")[0],
			categories: [],
		});
		setChangelogContent("");
	};

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-zinc-200 py-2 px-4">
				<div>
					<h1 className="text-lg text-zinc-900">Changelog</h1>
					<p className="text-sm text-zinc-600 mt-1">
						Manage product updates and release notes
					</p>
				</div>
				<div className="flex items-center gap-2">
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => setShowPreviewModal(true)}
						className="flex items-center gap-2 bg-zinc-50 text-zinc-700 p-2 text-xs rounded-xl hover:bg-zinc-100 transition-colors"
					>
						<Eye className="w-3.5 h-3.5" />
						Preview
					</motion.button>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={handleCreateChangelog}
						className="flex items-center gap-2 bg-zinc-900 text-white p-2 text-xs rounded-xl hover:bg-zinc-800 transition-colors"
					>
						<Plus className="w-3.5 h-3.5" />
						New Changelog
					</motion.button>
				</div>
			</div>

			{/* Search */}
			<div className="relative mx-4">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
				<input
					type="text"
					placeholder="Search changelogs by title, description, content, or categories..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
				/>
			</div>

			{/* Changelogs Table */}
			<div className="overflow-x-auto px-4">
				{isLoading ? (
					<TableSkeleton rows={5} columns={5} />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="min-w-[200px]">Title</TableHead>
								<TableHead>Date</TableHead>
								<TableHead>Categories</TableHead>
								<TableHead className="min-w-[300px]">Description</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{error ? (
								<TableEmpty
									colSpan={5}
									message="Error loading changelogs. Please try again."
								/>
							) : filteredChangelogs.length === 0 ? (
								<TableEmpty
									colSpan={5}
									message={
										searchQuery
											? "No changelogs found matching your search."
											: "No changelogs yet. Create your first changelog entry!"
									}
								/>
							) : (
								filteredChangelogs.map((changelog) => (
									<TableRow key={changelog.id}>
										<TableCell>
											<div className="font-medium text-sm text-zinc-900">
												{changelog.title}
											</div>
										</TableCell>
										<TableCell className="text-zinc-600">
											<div className="flex items-center gap-1">
												<Calendar className="w-3.5 h-3.5" />
												{formatDate(changelog.date)}
											</div>
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{changelog.categories?.map((category, catIndex) => (
													<span
														key={catIndex}
														className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700"
													>
														<Tag className="w-3 h-3 mr-1" />
														{category}
													</span>
												))}
												{(!changelog.categories ||
													changelog.categories.length === 0) && (
													<span className="text-xs text-zinc-400">
														No categories
													</span>
												)}
											</div>
										</TableCell>
										<TableCell className="text-zinc-600">
											<div className="line-clamp-2 max-w-md">
												{changelog.description || "No description"}
											</div>
										</TableCell>
										<TableCell>
										<div className="flex items-center gap-2">
											<button
												onClick={() => handleEditChangelog(changelog)}
												className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
												title="Edit changelog"
											>
												<Edit className="w-4 h-4" />
											</button>
											<button
												onClick={() => handleDeleteChangelog(changelog.id)}
												className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
												title="Delete changelog"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				)}
			</div>

			{/* Changelog Modal */}
			<AnimatePresence>
				{showChangelogModal && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={handleCloseModal}
							className="fixed inset-0 bg-black bg-opacity-50 z-50"
						/>
						<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
							<motion.div
								initial={{ opacity: 0, scale: 0.95, y: 20 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95, y: 20 }}
								onClick={(e) => e.stopPropagation()}
								className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
							>
								{/* Modal Header */}
								<div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200">
									<h2 className="text-lg text-zinc-900">
										{editingChangelog ? "Edit Changelog" : "Create Changelog"}
									</h2>
									<button
										onClick={handleCloseModal}
										className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
									>
										<X className="w-4 h-4" />
									</button>
								</div>

								{/* Modal Body */}
								<div className="flex-1 overflow-y-auto p-6 space-y-4">
									<div>
										<label className="block text-sm font-medium text-zinc-900 mb-2">
											Title *
										</label>
										<input
											type="text"
											value={changelogForm.title}
											onChange={(e) =>
												setChangelogForm({
													...changelogForm,
													title: e.target.value,
												})
											}
											placeholder="Enter changelog title..."
											className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-zinc-900 mb-2">
											Description
										</label>
										<textarea
											value={changelogForm.description}
											onChange={(e) =>
												setChangelogForm({
													...changelogForm,
													description: e.target.value,
												})
											}
											placeholder="Enter a brief description..."
											rows={2}
											className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm resize-none"
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-zinc-900 mb-2">
												Date *
											</label>
											<input
												type="date"
												value={changelogForm.date}
												onChange={(e) =>
													setChangelogForm({
														...changelogForm,
														date: e.target.value,
													})
												}
												className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
											/>
										</div>

										<div>
											<label className="block text-sm font-medium text-zinc-900 mb-2">
												Categories
											</label>
											<div className="flex flex-wrap gap-2">
												{availableCategories.map((category) => (
													<button
														key={category}
														type="button"
														onClick={() => handleToggleCategory(category)}
														className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
															changelogForm.categories?.includes(category)
																? "bg-zinc-900 text-white"
																: "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
														}`}
													>
														{category}
													</button>
												))}
											</div>
										</div>
									</div>

									<div>
										<label className="block text-sm font-medium text-zinc-900 mb-2">
											Content *
										</label>
										<div
											className="border border-zinc-200 rounded-xl overflow-hidden"
											style={{ minHeight: "300px" }}
										>
											<TiptapEditor
												placeholder="Start writing your changelog content... Use markdown for formatting."
												content={changelogContent}
												onChange={setChangelogContent}
											/>
										</div>
									</div>
								</div>

								{/* Modal Footer */}
								<div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-zinc-200">
									<button
										onClick={handleCloseModal}
										className="px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
									>
										Cancel
									</button>
									<button
										onClick={handleSaveChangelog}
										className="px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
									>
										<Save className="w-3.5 h-3.5" />
										{editingChangelog ? "Update" : "Create"} Changelog
									</button>
								</div>
							</motion.div>
						</div>
					</>
				)}
			</AnimatePresence>

			{/* Preview Modal */}
			<AnimatePresence>
				{showPreviewModal && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setShowPreviewModal(false)}
							className="fixed inset-0 bg-black bg-opacity-50 z-50"
						/>
						<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
							<motion.div
								initial={{ opacity: 0, scale: 0.95, y: 20 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95, y: 20 }}
								onClick={(e) => e.stopPropagation()}
								className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
							>
								{/* Preview Modal Header */}
								<div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200">
									<div>
										<h2 className="text-xl font-bold text-zinc-900">
											New releases and improvements
										</h2>
										<p className="text-xs text-zinc-600 mt-0.5">
											Product updates and changelog
										</p>
									</div>
									<button
										onClick={() => setShowPreviewModal(false)}
										className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
									>
										<X className="w-4 h-4" />
									</button>
								</div>

								{/* Filters */}
								<div className="px-6 pt-4 pb-2 border-b border-zinc-200">
									<div className="flex items-center gap-3">
										<span className="text-sm font-medium text-zinc-700">
											Filters:
										</span>
										<button
											onClick={() => setSelectedCategoryFilter(null)}
											className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
												!selectedCategoryFilter
													? "bg-zinc-200 text-zinc-900"
													: "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
											}`}
										>
											All
										</button>
										{getAllCategories().map((category) => (
											<button
												key={category}
												onClick={() => setSelectedCategoryFilter(category)}
												className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
													selectedCategoryFilter === category
														? "bg-zinc-200 text-zinc-900"
														: "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
												}`}
											>
												{category}
											</button>
										))}
									</div>
								</div>

								{/* Preview Content */}
								<div className="flex-1 overflow-y-auto p-6">
									{isLoading ? (
										<div className="text-center py-8 text-zinc-500">
											Loading changelogs...
										</div>
									) : changelogs.length === 0 ? (
										<div className="text-center py-8 text-zinc-500">
											No changelogs yet. Create your first changelog entry!
										</div>
									) : (
										<div className="space-y-8">
											{groupChangelogsByDate().map(([date, dateChangelogs]) => (
												<div key={date} className="space-y-6">
													{/* Date Header */}
													<div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 inline-block">
														<span className="text-sm font-semibold text-green-900">
															{date}
														</span>
													</div>

													{/* Categories for this date */}
													<div className="flex flex-wrap gap-2 ml-0">
														{Array.from(
															new Set(
																dateChangelogs.flatMap(
																	(c) => c.categories || []
																)
															)
														).map((category, idx, arr) => (
															<React.Fragment key={category}>
																<span className="text-sm text-zinc-600">
																	{category}
																</span>
																{idx < arr.length - 1 && (
																	<span className="text-sm text-zinc-400">
																		•
																	</span>
																)}
															</React.Fragment>
														))}
													</div>

													{/* Changelog Entries for this date */}
													<div className="space-y-6 ml-0">
														{dateChangelogs.map((changelog) => (
															<div key={changelog.id} className="space-y-3">
																{/* Title */}
																<h3 className="text-lg text-zinc-900">
																	{changelog.title}
																</h3>

																{/* Description */}
																{changelog.description && (
																	<p className="text-sm text-zinc-600">
																		{changelog.description}
																	</p>
																)}

																{/* Content */}
																{changelog.content && (
																	<div
																		className="prose prose-sm max-w-none text-zinc-700"
																		dangerouslySetInnerHTML={{
																			__html: parseContent(changelog.content),
																		}}
																	/>
																)}
															</div>
														))}
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</motion.div>
						</div>
					</>
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
				title="Delete Changelog"
				message="Are you sure you want to delete this changelog entry? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				variant="danger"
			/>
		</div>
	);
};

export default ChangelogTab;
