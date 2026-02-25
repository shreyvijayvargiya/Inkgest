import React, { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
	Plus,
	Trash2,
	X,
	Save,
	Image as ImageIcon,
	Copy,
	FileText,
	Search,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
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
	getAllBlogs,
	createBlog,
	updateBlog,
	deleteBlog,
} from "../../../lib/api/blog";
import { uploadBlogImages } from "../../../lib/api/upload";
import { htmlToMarkdown } from "../../../lib/utils/htmlToMarkdown";
import {
	getAllowedActions,
} from "../../../lib/config/roles-config";
import { getCachedUserRole, getUserRole } from "../../../lib/utils/getUserRole";
import { getCurrentUserEmail } from "../../../lib/utils/getCurrentUserEmail";
import AnimatedDropdown from "../../../lib/ui/AnimatedDropdown";
import ConfirmationModal from "../../../lib/ui/ConfirmationModal";
import ExportDropdown from "../../../lib/ui/ExportDropdown";
import { toast } from "sonner";

const BlogTab = ({ queryClient }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortField, setSortField] = useState(null); // 'title', 'author', 'status', 'createdAt'
	const [sortDirection, setSortDirection] = useState("asc"); // 'asc' or 'desc'
	const [showBlogModal, setShowBlogModal] = useState(false);
	const [editingBlog, setEditingBlog] = useState(null);
	const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
	const [blogForm, setBlogForm] = useState({
		title: "",
		slug: "",
		author: "",
		status: "draft",
		bannerImage: "",
	});
	const [blogContent, setBlogContent] = useState("");
	const [bannerFile, setBannerFile] = useState(null);
	const [bannerPreview, setBannerPreview] = useState(null);
	const bannerFileInputRef = useRef(null);

	// Modal states
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [confirmAction, setConfirmAction] = useState(null);

	// Fetch user role with React Query
	const fetchUserRole = async () => {
		try {
			// Get current user email (from Firebase Auth or localStorage fallback)
			const userEmail = await getCurrentUserEmail();

			console.log("BlogTab: Current user email:", userEmail);

			if (userEmail) {
				// Fetch role from Firestore teams collection using email
				const role = await getUserRole(userEmail, false);
				console.log("BlogTab: Fetched role from teams collection:", role);
				return role;
			} else {
				console.warn("BlogTab: No user email found, using cached role");
				// Fallback to cached role
				return getCachedUserRole();
			}
		} catch (error) {
			console.error("Error fetching user role:", error);
			// Fallback to cached role
			return getCachedUserRole();
		}
	};

	const { data: userRole = "viewer", isLoading: isLoadingRole } = useQuery({
		queryKey: ["userRole"],
		queryFn: fetchUserRole,
		staleTime: 5 * 60 * 1000, // 5 minutes
		cacheTime: 10 * 60 * 1000, // 10 minutes
	});

	// Get allowed actions for blogs
	const allowedActions = getAllowedActions(userRole, "blogs");

	// Fetch blogs with React Query
	const {
		data: blogs = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["blogs"],
		queryFn: () => getAllBlogs(),
	});

	// Filter blogs by search query
	const filteredBlogs = blogs.filter((blog) => {
		const searchLower = searchQuery.toLowerCase();
		return (
			blog.title?.toLowerCase().includes(searchLower) ||
			blog.author?.toLowerCase().includes(searchLower) ||
			blog.status?.toLowerCase().includes(searchLower) ||
			blog.slug?.toLowerCase().includes(searchLower)
		);
	});

	// Sort blogs
	const sortedBlogs = [...filteredBlogs].sort((a, b) => {
		if (!sortField) return 0;

		// Handle date comparison separately
		if (sortField === "createdAt") {
			const dateA = a.createdAt?.toDate
				? a.createdAt.toDate()
				: new Date(a.createdAt || 0);
			const dateB = b.createdAt?.toDate
				? b.createdAt.toDate()
				: new Date(b.createdAt || 0);
			return sortDirection === "asc"
				? dateA - dateB
				: dateB - dateA;
		}

		// Handle string comparison for other fields
		let aValue, bValue;

		switch (sortField) {
			case "title":
				aValue = (a.title || "").toLowerCase();
				bValue = (b.title || "").toLowerCase();
				break;
			case "author":
				aValue = (a.author || "").toLowerCase();
				bValue = (b.author || "").toLowerCase();
				break;
			case "status":
				aValue = (a.status || "").toLowerCase();
				bValue = (b.status || "").toLowerCase();
				break;
			default:
				return 0;
		}

		// String comparison
		if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
		if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
		return 0;
	});

	// Handle column sort
	const handleSort = (field) => {
		if (sortField === field) {
			// Toggle direction if clicking same field
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			// Set new field and default to ascending
			setSortField(field);
			setSortDirection("asc");
		}
	};

	// Get sort icon for column header
	const getSortIcon = (field) => {
		if (sortField !== field) {
			return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-zinc-400" />;
		}
		return sortDirection === "asc" ? (
			<ArrowUp className="w-3.5 h-3.5 ml-1 text-zinc-900" />
		) : (
			<ArrowDown className="w-3.5 h-3.5 ml-1 text-zinc-900" />
		);
	};

	// Create blog mutation
	const createBlogMutation = useMutation({
		mutationFn: async (blogData) => {
			// Upload images before creating blog
			const blogDataWithImages = await uploadBlogImages(
				blogData,
				bannerFile,
				null
			);
			return createBlog(blogDataWithImages);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["blogs"] });
			handleCloseModal();
			toast.success("Blog created successfully!");
		},
		onError: (error) => {
			console.error("Error creating blog:", error);
			toast.error("Failed to create blog. Please try again.");
		},
	});

	// Update blog mutation
	const updateBlogMutation = useMutation({
		mutationFn: async ({ id, data }) => {
			// Upload images before updating blog
			const blogDataWithImages = await uploadBlogImages(data, bannerFile, id);
			return updateBlog(id, blogDataWithImages);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["blogs"] });
			handleCloseModal();
			toast.success("Blog updated successfully!");
		},
		onError: (error) => {
			console.error("Error updating blog:", error);
			toast.error("Failed to update blog. Please try again.");
		},
	});

	// Delete blog mutation
	const deleteBlogMutation = useMutation({
		mutationFn: deleteBlog,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["blogs"] });
			toast.success("Blog deleted successfully!");
		},
		onError: (error) => {
			console.error("Error deleting blog:", error);
			toast.error("Failed to delete blog. Please try again.");
		},
	});

	// Generate slug from title
	const generateSlug = (title) => {
		return title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "");
	};

	// Handle blog form change
	const handleBlogFormChange = (e) => {
		const { name, value } = e.target;
		setBlogForm((prev) => {
			const updated = { ...prev, [name]: value };
			if (name === "title" && !editingBlog) {
				updated.slug = generateSlug(value);
			}
			return updated;
		});
	};

	// Handle banner image upload
	const handleBannerImageChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			if (!file.type.startsWith("image/")) {
				toast.warning("Please select an image file");
				return;
			}
			setBannerFile(file);
			const reader = new FileReader();
			reader.onload = (e) => {
				setBannerPreview(e.target.result);
			};
			reader.readAsDataURL(file);
		}
		e.target.value = "";
	};

	// Remove banner image
	const handleRemoveBanner = () => {
		setBannerFile(null);
		setBannerPreview(null);
		setBlogForm((prev) => ({ ...prev, bannerImage: "" }));
	};

	// Create or update blog
	const handleSaveBlog = async () => {
		if (!blogForm.title || !blogContent) return;

		const blogData = {
			...blogForm,
			content: blogContent,
		};

		if (editingBlog) {
			updateBlogMutation.mutate({ id: editingBlog.id, data: blogData });
		} else {
			createBlogMutation.mutate(blogData);
		}
	};

	// Delete blog
	const handleDeleteBlog = async (id) => {
		setConfirmAction(() => () => deleteBlogMutation.mutate(id));
		setShowConfirmModal(true);
	};

	// Edit blog
	const handleEditBlog = (blog) => {
		// Navigate to editor page instead of opening modal
		window.location.href = `/admin/editor/blog?id=${blog.id}`;
	};

	// Copy HTML content
	const handleCopyHTML = async (content) => {
		try {
			await navigator.clipboard.writeText(content);
			toast.success("HTML content copied to clipboard!");
		} catch (error) {
			console.error("Failed to copy HTML:", error);
			toast.error("Failed to copy HTML content");
		}
	};

	// Copy Markdown content
	const handleCopyMarkdown = async (htmlContent) => {
		try {
			const markdown = htmlToMarkdown(htmlContent);
			await navigator.clipboard.writeText(markdown);
			toast.success("Markdown content copied to clipboard!");
		} catch (error) {
			console.error("Failed to copy Markdown:", error);
			toast.error("Failed to copy Markdown content");
		}
	};

	// Close modal
	const handleCloseModal = () => {
		setShowBlogModal(false);
		setEditingBlog(null);
		setBlogForm({
			title: "",
			slug: "",
			author: "",
			status: "draft",
			bannerImage: "",
		});
		setBlogContent("");
		setBannerFile(null);
		setBannerPreview(null);
		setIsStatusDropdownOpen(false);
	};

	// Format date
	const formatDate = (dateString) => {
		if (!dateString) return "";
		const date = dateString?.toDate
			? dateString.toDate()
			: new Date(dateString);
		if (isNaN(date.getTime())) return "";
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	// Status options
	const statusOptions = [
		{ value: "draft", label: "Draft", color: "bg-yellow-100 text-yellow-800" },
		{
			value: "published",
			label: "Published",
			color: "bg-green-100 text-green-800",
		},
		{
			value: "scheduled",
			label: "Scheduled",
			color: "bg-blue-100 text-blue-800",
		},
	];

	// Handle status select
	const handleStatusSelect = (status) => {
		setBlogForm((prev) => ({ ...prev, status }));
	};

	return (
		<div>
			<div className="flex justify-between items-center border-b border-zinc-200 py-2 px-4">
				<div>
					<h2 className="text-lg text-zinc-900">Blog Posts</h2>
					<div>
						<p className="text-sm text-zinc-600 mt-1">
							Manage your blog posts and content
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<ExportDropdown dataType="blogs" data={sortedBlogs} />
					<motion.a
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						href="/admin/editor/blog"
						className="flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors text-sm"
					>
						<Plus className="w-3.5 h-3.5" />
						Create New Blog
					</motion.a>
				</div>
			</div>

			{/* Search */}
			<div className="relative my-4 mx-4">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
				<input
					type="text"
					placeholder="Search blogs by title, author, status, or slug..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
				/>
			</div>

			<div className="overflow-x-auto px-4">
				{isLoading ? (
					<TableSkeleton rows={5} columns={6} />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead
									sortable
									onClick={() => handleSort("title")}
									className="min-w-[250px]"
								>
									<div className="flex items-center gap-2">
										Title
										{getSortIcon("title")}
									</div>
								</TableHead>
								<TableHead
									sortable
									onClick={() => handleSort("author")}
								>
									<div className="flex items-center gap-2">
										Author
										{getSortIcon("author")}
									</div>
								</TableHead>
								<TableHead
									sortable
									onClick={() => handleSort("status")}
								>
									<div className="flex items-center gap-2">
										Status
										{getSortIcon("status")}
									</div>
								</TableHead>
								<TableHead
									sortable
									onClick={() => handleSort("createdAt")}
								>
									<div className="flex items-center gap-2">
										Created
										{getSortIcon("createdAt")}
									</div>
								</TableHead>
								<TableHead>Copy</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{error ? (
								<TableEmpty
									colSpan={6}
									message="Error loading blogs. Please try again."
								/>
							) : sortedBlogs.length === 0 ? (
								<TableEmpty
									colSpan={6}
									message={
										searchQuery
											? "No blogs found matching your search."
											: "No blogs found. Create your first blog!"
									}
								/>
							) : (
								sortedBlogs.map((blog) => (
									<TableRow
										key={blog.id}
										onClick={() => handleEditBlog(blog)}
										className="cursor-pointer"
									>
										<TableCell>
											<div className="font-medium text-zinc-900 hover:text-zinc-600 transition-colors">
												{blog.title}
											</div>
											<div className="text-sm text-zinc-500">{blog.slug}</div>
										</TableCell>
										<TableCell className="text-zinc-600">
											{blog.author}
										</TableCell>
										<TableCell>
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${blog.status === "published"
													? "bg-green-100 text-green-800"
													: blog.status === "scheduled"
														? "bg-blue-100 text-blue-800"
														: "bg-yellow-100 text-yellow-800"
													}`}
											>
												{blog.status}
											</span>
										</TableCell>
										<TableCell className="text-zinc-600">
											{formatDate(blog.createdAt)}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<motion.button
													whileHover={{ scale: 1.05 }}
													whileTap={{ scale: 0.95 }}
													onClick={(e) => {
														e.stopPropagation();
														handleCopyHTML(blog.content || "");
													}}
													className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
													title="Copy HTML"
												>
													<Copy className="w-4 h-4" />
												</motion.button>
												<motion.button
													whileHover={{ scale: 1.05 }}
													whileTap={{ scale: 0.95 }}
													onClick={(e) => {
														e.stopPropagation();
														handleCopyMarkdown(blog.content || "");
													}}
													className="p-2 text-zinc-400 hover:text-purple-600 transition-colors"
													title="Copy Markdown"
												>
													<FileText className="w-4 h-4" />
												</motion.button>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												{/* Always show delete button with confirmation modal */}
												<motion.button
													whileHover={{ scale: 1.05 }}
													whileTap={{ scale: 0.95 }}
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteBlog(blog.id);
													}}
													className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
													title="Delete"
												>
													<Trash2 className="w-4 h-4" />
												</motion.button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				)}
			</div>

			{/* Blog Modal */}
			<AnimatePresence>
				{showBlogModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
						>
							{/* Modal Header */}
							<div className="flex items-center justify-between p-4 border-b border-zinc-200">
								<h3 className="text-lg text-zinc-900">
									{editingBlog ? "Edit Blog" : "Create Blog"}
								</h3>
								<div className="flex items-center gap-3">
									<motion.button
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={handleSaveBlog}
										className="flex items-center gap-2 px-4 py-1.5 text-sm bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium transition-colors"
									>
										<Save className="w-4 h-4" />
										{editingBlog ? "Update" : "Create"} Blog
									</motion.button>
									<motion.button
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={handleCloseModal}
										className="px-4 py-1.5 text-sm text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-medium transition-colors"
									>
										Cancel
									</motion.button>
									<button
										onClick={handleCloseModal}
										className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
									>
										<X className="w-4 h-4" />
									</button>
								</div>
							</div>

							{/* Modal Body */}
							<div className="flex-1 overflow-y-auto p-4 space-y-4">
								{/* Banner Image */}
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Banner Image
									</label>
									{bannerPreview ? (
										<div className="relative">
											<img
												src={bannerPreview}
												alt="Banner preview"
												className="w-full h-48 object-cover rounded-xl border border-zinc-300"
											/>
											<motion.button
												whileHover={{ scale: 1.05 }}
												whileTap={{ scale: 0.95 }}
												onClick={handleRemoveBanner}
												className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
												title="Remove banner"
											>
												<X className="w-4 h-4" />
											</motion.button>
										</div>
									) : (
										<div
											onClick={() => bannerFileInputRef.current?.click()}
											className="w-full h-48 border-2 border-dashed border-zinc-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-zinc-400 transition-colors"
										>
											<ImageIcon className="w-12 h-12 text-zinc-400 mb-2" />
											<p className="text-sm text-zinc-600">
												Click to upload banner image
											</p>
											<p className="text-xs text-zinc-500 mt-1">
												Recommended: 1200x600px
											</p>
										</div>
									)}
									<input
										ref={bannerFileInputRef}
										type="file"
										accept="image/*"
										onChange={handleBannerImageChange}
										style={{ display: "none" }}
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-zinc-700 mb-2">
											Title *
										</label>
										<input
											type="text"
											name="title"
											value={blogForm.title}
											onChange={handleBlogFormChange}
											className="w-full px-4 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:outline-none"
											placeholder="Blog title"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-zinc-700 mb-2">
											Slug *
										</label>
										<input
											type="text"
											name="slug"
											value={blogForm.slug}
											onChange={handleBlogFormChange}
											className="w-full px-4 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:outline-none"
											placeholder="blog-slug"
										/>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-zinc-700 mb-2">
											Author *
										</label>
										<input
											type="text"
											name="author"
											value={blogForm.author}
											onChange={handleBlogFormChange}
											className="w-full px-4 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:outline-none"
											placeholder="Author name"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-zinc-700 mb-2">
											Status *
										</label>
										<AnimatedDropdown
											isOpen={isStatusDropdownOpen}
											onToggle={() =>
												setIsStatusDropdownOpen(!isStatusDropdownOpen)
											}
											onSelect={handleStatusSelect}
											options={statusOptions}
											value={blogForm.status}
											placeholder="Select status"
										/>
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Content *
									</label>
									<TiptapEditor
										placeholder="Start writing your blog post... Type / for commands"
										content={blogContent}
										onChange={setBlogContent}
									/>
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
				title="Delete Blog"
				message="Are you sure you want to delete this blog? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				variant="danger"
			/>
		</div>
	);
};

export default BlogTab;
