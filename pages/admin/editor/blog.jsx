import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
	X,
	Save,
	Image as ImageIcon,
	ArrowLeft,
	Eye,
	FileText,
	Settings,
	Plus,
	Search,
	Menu,
	Calendar,
} from "lucide-react";
import TiptapEditor from "../../../app/admin/components/TiptapEditor";
import {
	getBlogById,
	createBlog,
	updateBlog,
	getAllBlogs,
} from "../../../lib/api/blog";
import { uploadBlogImages } from "../../../lib/api/upload";
import AnimatedDropdown from "../../../lib/ui/AnimatedDropdown";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const BlogEditorPage = () => {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { id } = router.query;

	const [isPreviewMode, setIsPreviewMode] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	// On desktop, sidebars are always visible, on mobile they start closed
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);

	// Open sidebars on desktop on mount
	useEffect(() => {
		const checkDesktop = () => {
			if (window.innerWidth >= 1024) {
				setIsSidebarOpen(true);
				setIsSettingsOpen(true);
			}
		};
		checkDesktop();
		window.addEventListener("resize", checkDesktop);
		return () => window.removeEventListener("resize", checkDesktop);
	}, []);

	// Blog state
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
	const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
	const [scheduledDate, setScheduledDate] = useState("");

	// Fetch all blogs for sidebar
	const { data: blogs = [], isLoading: isLoadingBlogs } = useQuery({
		queryKey: ["blogs"],
		queryFn: () => getAllBlogs(),
	});

	// Filter blogs based on search
	const filteredBlogs = blogs.filter((blog) =>
		blog.title?.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Fetch existing blog if editing
	const { data: existingItem, isLoading: isLoadingItem } = useQuery({
		queryKey: ["blog", id],
		queryFn: async () => {
			if (!id) return null;
			return await getBlogById(id);
		},
		enabled: !!id,
	});

	// Load existing data when editing
	useEffect(() => {
		if (existingItem && id) {
			setBlogForm({
				title: existingItem.title || "",
				slug: existingItem.slug || "",
				author: existingItem.author || "",
				status: existingItem.status || "draft",
				bannerImage: existingItem.bannerImage || "",
			});
			setBlogContent(existingItem.content || "");
			setBannerPreview(existingItem.bannerImage || null);
			setScheduledDate(existingItem.scheduledDate || "");
		} else if (!id) {
			// Reset form for new blog
			setBlogForm({
				title: "",
				slug: "",
				author: "",
				status: "draft",
				bannerImage: "",
			});
			setBlogContent("");
			setBannerPreview(null);
			setBannerFile(null);
			setScheduledDate("");
		}
	}, [existingItem, id]);

	// Create/Update mutation
	const saveBlogMutation = useMutation({
		mutationFn: async (blogData) => {
			const blogDataWithImages = await uploadBlogImages(
				blogData,
				bannerFile,
				id || null
			);
			if (id) {
				return await updateBlog(id, blogDataWithImages);
			} else {
				return await createBlog(blogDataWithImages);
			}
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["blogs"] });
			toast.success(
				id ? "Blog updated successfully!" : "Blog created successfully!"
			);
			setIsSaving(false);
			if (!id && data) {
				router.push(`/admin/editor/blog?id=${data}`);
			}
		},
		onError: (error) => {
			console.error("Error saving blog:", error);
			toast.error("Failed to save blog. Please try again.");
			setIsSaving(false);
		},
	});

	// Generate slug from title
	const generateSlug = (title) => {
		return title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "");
	};

	// Handle form changes
	const handleBlogFormChange = (e) => {
		const { name, value } = e.target;
		setBlogForm((prev) => {
			const updated = { ...prev, [name]: value };
			if (name === "title" && !id) {
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

	const handleRemoveBanner = () => {
		setBannerFile(null);
		setBannerPreview(null);
		setBlogForm((prev) => ({ ...prev, bannerImage: "" }));
	};

	// Handle status select
	const handleStatusSelect = (status) => {
		setBlogForm((prev) => ({ ...prev, status }));
	};

	// Save handler
	const handleSave = async () => {
		setIsSaving(true);
		if (!blogForm.title || !blogContent) {
			toast.warning("Title and content are required");
			setIsSaving(false);
			return;
		}
		saveBlogMutation.mutate({
			...blogForm,
			content: blogContent,
		});
	};

	// Handle blog selection from sidebar
	const handleBlogSelect = (blogId) => {
		router.push(`/admin/editor/blog?id=${blogId}`);
	};

	// Handle new blog
	const handleNewBlog = () => {
		router.push("/admin/editor/blog");
	};

	// Format date
	const formatDate = (date) => {
		if (!date) return "N/A";
		try {
			const dateObj = date?.toDate ? date.toDate() : new Date(date);
			return dateObj.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
		} catch {
			return "N/A";
		}
	};

	if (isLoadingItem && id) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 mx-auto"></div>
					<p className="mt-4 text-zinc-600">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-zinc-50 flex flex-col">
			{/* Header */}
			<header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
				<div className="max-w-[1920px] mx-auto p-2">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => router.push("/admin?path=blogs")}
								className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
							>
								<ArrowLeft className="w-3.5 h-3.5" />
								Back
							</motion.button>
							<div className="h-5 w-px bg-zinc-300"></div>
							<div className="items-center gap-1.5 md:flex hidden">
								<FileText className="w-4 h-4 text-zinc-700" />
								<h1 className="text-base font-semibold text-zinc-900">
									{id ? "Edit Blog" : "Create New Blog"}
								</h1>
							</div>
						</div>

						<div className="flex items-center gap-2">
							{/* Sidebar Toggle */}
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => setIsSidebarOpen(!isSidebarOpen)}
								className="lg:hidden block items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
							>
								<Menu className="w-4 h-4" />
							</motion.button>

							{/* Settings Toggle */}
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => setIsSettingsOpen(!isSettingsOpen)}
								className="lg:hidden block items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
							>
								<Settings className="w-4 h-4" />
							</motion.button>

							{/* Preview Toggle */}
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => setIsPreviewMode(!isPreviewMode)}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${isPreviewMode
									? "bg-zinc-200 text-zinc-900"
									: "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
									}`}
							>
								<Eye className="w-3.5 h-3.5" />
								<span className="hidden sm:inline">
									{isPreviewMode ? "Edit" : "Preview"}
								</span>
							</motion.button>

							{/* Save Button */}
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={handleSave}
								disabled={isSaving}
								className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Save className="w-3.5 h-3.5" />
								<span className="hidden sm:inline">
									{isSaving ? "Saving..." : id ? "Update" : "Save"}
								</span>
							</motion.button>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-1 w-full flex justify-center h-[calc(100vh-60px)] relative">
				{/* Overlay for mobile */}
				{(isSidebarOpen || isSettingsOpen) && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={() => {
							setIsSidebarOpen(false);
							setIsSettingsOpen(false);
						}}
						className="fixed inset-0 bg-black/50 z-40 lg:hidden"
					/>
				)}

				{/* Left Sidebar Drawer - Blogs List */}
				<div
					className={`fixed inset-y-0 lg:top-12 left-0 w-64 bg-white border-r border-zinc-200 flex flex-col z-50 lg:z-auto ${isSidebarOpen
						? "translate-x-0"
						: "-translate-x-full lg:translate-x-0"
						} transition-transform duration-300 ease-in-out`}
				>
					<div className="p-3 border-b border-zinc-200">
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<FileText className="w-4 h-4 text-zinc-600" />
								<h2 className="text-sm font-semibold text-zinc-900">Blogs</h2>
							</div>
							<button
								onClick={() => setIsSidebarOpen(false)}
								className="lg:hidden p-1 hover:bg-zinc-100 rounded-xl transition-colors"
							>
								<X className="w-4 h-4 text-zinc-600" />
							</button>
						</div>
						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							onClick={() => {
								handleNewBlog();
								setIsSidebarOpen(false);
							}}
							className="w-fit flex items-center justify-center gap-1.5 px-3 py-1.5 hover:bg-zinc-100 text-black bg-zinc-50 rounded-xl text-xs font-medium transition-colors mb-2"
						>
							<Plus className="w-3.5 h-3.5" />
							New Blog
						</motion.button>
						<div className="relative">
							<Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
							<input
								type="text"
								placeholder="Search blogs..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:outline-none"
							/>
						</div>
					</div>
					<div className="flex-1 overflow-y-auto">
						{isLoadingBlogs ? (
							<div className="p-3 text-center text-xs text-zinc-500">
								Loading...
							</div>
						) : filteredBlogs.length === 0 ? (
							<div className="p-3 text-center text-xs text-zinc-500">
								No blogs found
							</div>
						) : (
							<div className="p-2">
								{filteredBlogs.map((blog) => (
									<motion.div
										key={blog.id}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={() => {
											handleBlogSelect(blog.id);
											setIsSidebarOpen(false);
										}}
										className={`p-2 rounded-xl cursor-pointer transition-colors mb-1 ${id === blog.id
											? "bg-zinc-100 hover:bg-zinc-200 text-black  hover:text-zinc-900"
											: "hover:bg-zinc-50 text-zinc-900"
											}`}
									>
										<div className="text-xs font-medium truncate mb-1">
											{blog.title || "Untitled"}
										</div>
										<div
											className={`text-xs ${id === blog.id ? "text-zinc-600" : "text-zinc-500"
												}`}
										>
											{formatDate(blog.createdAt)} • {blog.status}
										</div>
									</motion.div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Center - Editor */}
				<div className="flex-1 max-h-screen flex justify-center px-4 py-4">
					{isPreviewMode ? (
						/* Preview Mode */
						<div className="w-full max-w-3xl bg-white rounded-xl shadow-sm border border-zinc-200 p-6 overflow-y-auto">
							<h1 className="text-3xl font-bold text-zinc-900 mb-4">
								{blogForm.title || "Blog Preview"}
							</h1>
							{blogForm.author && (
								<p className="text-sm text-zinc-600 mb-6">
									By {blogForm.author}
								</p>
							)}
							{bannerPreview && (
								<div className="mb-6">
									<img
										src={bannerPreview}
										alt="Banner"
										className="w-full h-80 object-cover rounded-xl"
									/>
								</div>
							)}
							<div className="prose prose-zinc max-w-none prose-sm">
								<ReactMarkdown>{blogContent || ""}</ReactMarkdown>
							</div>
						</div>
					) : (
						<div className="w-full max-w-3xl bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col">
							<div className="flex-1 overflow-hidden flex flex-col">
								<TiptapEditor
									placeholder="Start writing your blog post... Type / for commands"
									content={blogContent}
									onChange={setBlogContent}
									minHeight="100%"
									maxHeight="none"
								/>
							</div>
						</div>
					)}
				</div>

				{/* Right Sidebar Drawer - Settings */}
				<div
					className={`fixed inset-y-0 lg:top-12 right-0 w-80 bg-white border-l border-zinc-200 p-4 overflow-y-auto z-50 lg:z-auto ${isSettingsOpen
						? "translate-x-0"
						: "translate-x-full lg:translate-x-0"
						} transition-transform duration-300 ease-in-out`}
				>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
							<Settings className="w-4 h-4" />
							Settings
						</h2>
						<button
							onClick={() => setIsSettingsOpen(false)}
							className="lg:hidden p-1 hover:bg-zinc-100 rounded-xl transition-colors"
						>
							<X className="w-4 h-4 text-zinc-600" />
						</button>
					</div>

					<div className="space-y-4">
						{/* Banner Image */}
						<div>
							<label className="block text-xs font-medium text-zinc-700 mb-1.5">
								Banner Image
							</label>
							{bannerPreview ? (
								<div className="relative">
									<img
										src={bannerPreview}
										alt="Banner preview"
										className="w-full h-24 object-cover rounded-xl border border-zinc-300"
									/>
									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										onClick={handleRemoveBanner}
										className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
										title="Remove banner"
									>
										<X className="w-3 h-3" />
									</motion.button>
								</div>
							) : (
								<div
									onClick={() => bannerFileInputRef.current?.click()}
									className="w-full h-24 border-2 border-dashed border-zinc-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-zinc-400 transition-colors"
								>
									<ImageIcon className="w-6 h-6 text-zinc-400 mb-1" />
									<p className="text-xs text-zinc-600">Upload banner</p>
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

						{/* Title */}
						<div>
							<label className="block text-xs font-medium text-zinc-700 mb-1.5">
								Title *
							</label>
							<input
								type="text"
								name="title"
								value={blogForm.title}
								onChange={handleBlogFormChange}
								className="w-full px-3 py-1.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:outline-none"
								placeholder="Blog title"
							/>
						</div>

						{/* Slug */}
						<div>
							<label className="block text-xs font-medium text-zinc-700 mb-1.5">
								Slug *
							</label>
							<input
								type="text"
								name="slug"
								value={blogForm.slug}
								onChange={handleBlogFormChange}
								className="w-full px-3 py-1.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:outline-none"
								placeholder="blog-slug"
							/>
						</div>

						{/* Author */}
						<div>
							<label className="block text-xs font-medium text-zinc-700 mb-1.5">
								Author *
							</label>
							<input
								type="text"
								name="author"
								value={blogForm.author}
								onChange={handleBlogFormChange}
								className="w-full px-3 py-1.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:outline-none"
								placeholder="Author name"
							/>
						</div>

						{/* Status */}
						<div>
							<label className="block text-xs font-medium text-zinc-700 mb-1.5">
								Status *
							</label>
							<AnimatedDropdown
								isOpen={isStatusDropdownOpen}
								onToggle={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
								onSelect={handleStatusSelect}
								options={statusOptions}
								value={blogForm.status}
								placeholder="Select status"
							/>
							<AnimatePresence>
								{blogForm.status === "scheduled" && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: "auto" }}
										exit={{ opacity: 0, height: 0 }}
										transition={{ duration: 0.2 }}
										className="mt-3"
									>
										<label className="block text-xs font-medium text-zinc-700 mb-1.5">
											Schedule Date *
										</label>
										<div className="relative">
											<Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
											<input
												type="datetime-local"
												value={scheduledDate}
												onChange={(e) => setScheduledDate(e.target.value)}
												min={new Date().toISOString().slice(0, 16)}
												className="w-full pl-10 pr-3 py-1.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:outline-none"
											/>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
};

export default BlogEditorPage;
