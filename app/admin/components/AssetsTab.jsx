import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
	Plus,
	Trash2,
	Search,
	X,
	Upload,
	File,
	Image as ImageIcon,
	Video,
	FileText,
	Copy,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	CheckCircle2,
	Eye,
	Download,
	Calendar,
	Hash,
	Type,
	ExternalLink,
} from "lucide-react";
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
	getAllAssets,
	deleteAsset,
	uploadAssetFile,
	formatFileSize,
	getFileTypeCategory,
} from "../../../lib/api/assets";
import { toast } from "react-toastify";
import ConfirmationModal from "../../../lib/ui/ConfirmationModal";
import AnimatedDropdown from "../../../lib/ui/AnimatedDropdown";

const AssetsTab = ({ queryClient }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortField, setSortField] = useState(null);
	const [sortDirection, setSortDirection] = useState("desc");
	const [showUploadModal, setShowUploadModal] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState([]);
	const [uploadProgress, setUploadProgress] = useState({});
	const [isUploading, setIsUploading] = useState(false);
	const [fileTypeFilter, setFileTypeFilter] = useState("all");
	const [isFileTypeDropdownOpen, setIsFileTypeDropdownOpen] = useState(false);
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [confirmAction, setConfirmAction] = useState(null);
	const [selectedAssetForView, setSelectedAssetForView] = useState(null);
	const fileInputRef = useRef(null);

	// Fetch assets
	const {
		data: assets = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["assets"],
		queryFn: () => getAllAssets(),
	});

	// File type filter options
	const fileTypeOptions = [
		{ value: "all", label: "All Types" },
		{ value: "image", label: "Images" },
		{ value: "video", label: "Videos" },
		{ value: "pdf", label: "PDFs" },
		{ value: "document", label: "Documents" },
		{ value: "other", label: "Other" },
	];

	// Filter assets
	const filteredAssets = assets.filter((asset) => {
		const matchesSearch =
			asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			asset.type?.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesType =
			fileTypeFilter === "all" ||
			getFileTypeCategory(asset.type) === fileTypeFilter;

		return matchesSearch && matchesType;
	});

	// Sort assets
	const sortedAssets = [...filteredAssets].sort((a, b) => {
		if (!sortField) return 0;

		if (sortField === "createdAt") {
			const dateA = a.createdAt?.toDate
				? a.createdAt.toDate()
				: new Date(a.createdAt || 0);
			const dateB = b.createdAt?.toDate
				? b.createdAt.toDate()
				: new Date(b.createdAt || 0);
			return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
		}

		if (sortField === "size") {
			return sortDirection === "asc"
				? (a.size || 0) - (b.size || 0)
				: (b.size || 0) - (a.size || 0);
		}

		if (sortField === "name") {
			const aValue = (a.name || "").toLowerCase();
			const bValue = (b.name || "").toLowerCase();
			if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
			if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
			return 0;
		}

		if (sortField === "type") {
			const aValue = (a.type || "").toLowerCase();
			const bValue = (b.type || "").toLowerCase();
			if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
			if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
			return 0;
		}

		return 0;
	});

	// Handle column sort
	const handleSort = (field) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("desc");
		}
	};

	// Get sort icon
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

	// Upload mutation
	const uploadMutation = useMutation({
		mutationFn: async ({ file, onProgress }) => {
			return await uploadAssetFile(file, onProgress);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["assets"] });
		},
		onError: (error) => {
			console.error("Error uploading file:", error);
			toast.error("Failed to upload file. Please try again.");
		},
	});

	// Delete mutation
	const deleteAssetMutation = useMutation({
		mutationFn: deleteAsset,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["assets"] });
			toast.success("Asset deleted successfully!");
		},
		onError: (error) => {
			console.error("Error deleting asset:", error);
			toast.error("Failed to delete asset. Please try again.");
		},
	});

	// Handle file selection
	const handleFileSelect = (e) => {
		const files = Array.from(e.target.files || []);
		if (files.length > 0) {
			setSelectedFiles(files);
		}
	};

	// Handle upload
	const handleUpload = async () => {
		if (selectedFiles.length === 0) {
			toast.warning("Please select at least one file");
			return;
		}

		setIsUploading(true);
		setUploadProgress({});

		try {
			const uploadPromises = selectedFiles.map(async (file, index) => {
				const fileId = `file-${index}`;
				setUploadProgress((prev) => ({
					...prev,
					[fileId]: { progress: 0, fileName: file.name },
				}));

				try {
					await uploadMutation.mutateAsync({
						file,
						onProgress: (bytesTransferred, totalBytes) => {
							const progress = (bytesTransferred / totalBytes) * 100;
							setUploadProgress((prev) => ({
								...prev,
								[fileId]: {
									progress: Math.round(progress),
									fileName: file.name,
								},
							}));
						},
					});
				} catch (error) {
					console.error(`Error uploading ${file.name}:`, error);
					throw error;
				}
			});

			await Promise.all(uploadPromises);
			toast.success(`Successfully uploaded ${selectedFiles.length} file(s)!`);
			handleCloseUploadModal();
		} catch (error) {
			console.error("Error uploading files:", error);
			toast.error("Some files failed to upload. Please try again.");
		} finally {
			setIsUploading(false);
			setUploadProgress({});
		}
	};

	// Handle delete
	const handleDelete = (assetId) => {
		setConfirmAction(() => () => deleteAssetMutation.mutate(assetId));
		setShowConfirmModal(true);
	};

	// Handle copy link
	const handleCopyLink = (asset) => {
		const link = `${window.location.origin}/admin/files/${asset.fileId}`;
		navigator.clipboard.writeText(link);
		toast.success("Link copied to clipboard!");
	};

	// Get file icon
	const getFileIcon = (type) => {
		const category = getFileTypeCategory(type);
		switch (category) {
			case "image":
				return <ImageIcon className="w-5 h-5 text-blue-600" />;
			case "video":
				return <Video className="w-5 h-5 text-red-600" />;
			case "pdf":
				return <FileText className="w-5 h-5 text-red-600" />;
			default:
				return <File className="w-5 h-5 text-zinc-600" />;
		}
	};

	// Format date
	const formatDate = (date) => {
		if (!date) return "";
		const d = date?.toDate ? date.toDate() : new Date(date);
		if (isNaN(d.getTime())) return "";
		return d.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Close upload modal
	const handleCloseUploadModal = () => {
		setShowUploadModal(false);
		setSelectedFiles([]);
		setUploadProgress({});
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-zinc-200 py-2 px-4">
				<div>
					<h1 className="text-lg text-zinc-900">Assets</h1>
					<p className="text-sm text-zinc-600 mt-1">
						Manage files, images, PDFs, and videos
					</p>
				</div>
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={() => setShowUploadModal(true)}
					className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors text-sm"
				>
					<Plus className="w-4 h-4" />
					Add New File
				</motion.button>
			</div>

			<div className="flex flex-col lg:flex-row gap-6 items-start px-4">
				<div className="flex-1 w-full space-y-4">
					{/* Search and Filters */}
					<div className="flex items-center gap-4">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
							<input
								type="text"
								placeholder="Search assets by name or type..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
							/>
						</div>
						<div className="w-48">
							<AnimatedDropdown
								isOpen={isFileTypeDropdownOpen}
								onToggle={() => setIsFileTypeDropdownOpen(!isFileTypeDropdownOpen)}
								onSelect={(value) => {
									setFileTypeFilter(value);
									setIsFileTypeDropdownOpen(false);
								}}
								options={fileTypeOptions}
								value={fileTypeFilter}
								placeholder="All Types"
								buttonClassName="text-sm"
							/>
						</div>
					</div>

					{/* Assets Table */}
					<div className="overflow-x-auto">
						{isLoading ? (
							<TableSkeleton rows={5} columns={7} />
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>File</TableHead>
										<TableHead sortable onClick={() => handleSort("name")}>
											<div className="flex items-center gap-2">
												Name
												{getSortIcon("name")}
											</div>
										</TableHead>
										<TableHead sortable onClick={() => handleSort("type")}>
											<div className="flex items-center gap-2">
												Type
												{getSortIcon("type")}
											</div>
										</TableHead>
										<TableHead sortable onClick={() => handleSort("size")}>
											<div className="flex items-center gap-2">
												Size
												{getSortIcon("size")}
											</div>
										</TableHead>
										<TableHead>Link</TableHead>
										<TableHead sortable onClick={() => handleSort("createdAt")}>
											<div className="flex items-center gap-2">
												Uploaded
												{getSortIcon("createdAt")}
											</div>
										</TableHead>
										<TableHead>Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{error ? (
										<TableEmpty
											colSpan={7}
											message="Error loading assets. Please try again."
										/>
									) : sortedAssets.length === 0 ? (
										<TableEmpty
											colSpan={7}
											message={
												searchQuery || fileTypeFilter !== "all"
													? "No assets found matching your filters."
													: "No assets yet. Upload your first file!"
											}
										/>
									) : (
										sortedAssets.map((asset) => (
											<TableRow
												key={asset.id}
												onClick={() => setSelectedAssetForView(asset)}
												className="cursor-pointer"
											>
												<TableCell>
													<div className="flex items-center justify-center">
														{getFileIcon(asset.type)}
													</div>
												</TableCell>
												<TableCell>
													<div className="font-medium text-sm text-zinc-900 group-hover:text-blue-600 transition-colors">
														{asset.name}
													</div>
												</TableCell>
												<TableCell className="text-zinc-600">
													{asset.type || "Unknown"}
												</TableCell>
												<TableCell className="text-zinc-600">
													{formatFileSize(asset.size || 0)}
													{asset.originalSize &&
														asset.originalSize !== asset.size && (
															<span className="text-xs text-zinc-400 ml-1">
																(was {formatFileSize(asset.originalSize)})
															</span>
														)}
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-1">
														<button
															onClick={(e) => {
																e.stopPropagation();
																setSelectedAssetForView(asset);
															}}
															className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
															title="View details"
														>
															<Eye className="w-4 h-4" />
														</button>
														<button
															onClick={(e) => {
																e.stopPropagation();
																handleCopyLink(asset);
															}}
															className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
															title="Copy link"
														>
															<Copy className="w-4 h-4" />
														</button>
													</div>
												</TableCell>
												<TableCell className="text-zinc-600">
													{formatDate(asset.createdAt)}
												</TableCell>
												<TableCell>
													<button
														onClick={(e) => {
															e.stopPropagation();
															handleDelete(asset.id);
														}}
														className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
														title="Delete asset"
													>
														<Trash2 className="w-4 h-4" />
													</button>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						)}
					</div>
				</div>

				{/* Storage Overview Card */}
				{!isLoading && assets.length > 0 && (
					<div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm w-full lg:w-80 shrink-0 sticky top-4">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-sm font-bold text-zinc-900">Storage Overview</h2>
						</div>

						{(() => {
							const stats = assets.reduce(
								(acc, asset) => {
									const cat = getFileTypeCategory(asset.type);
									const size = asset.size || 0;
									acc.total += size;
									if (cat === "image") acc.images += size;
									else if (cat === "video") acc.videos += size;
									else if (cat === "pdf" || cat === "document")
										acc.documents += size;
									else acc.other += size;
									return acc;
								},
								{ total: 0, images: 0, videos: 0, documents: 0, other: 0 }
							);

							const limit = 15 * 1024 * 1024 * 1024; // 15GB in bytes
							const usedPercent = Math.min(Math.round((stats.total / limit) * 100), 100);
							const getWidth = (size) => `${(size / limit) * 100}%`;

							return (
								<div className="space-y-4">
									{/* Segmented Progress Bar */}
									<div className="relative w-full h-2 bg-zinc-100 rounded-full overflow-hidden flex">
										<div
											className="h-full bg-violet-500 transition-all duration-500"
											style={{ width: getWidth(stats.images) }}
										/>
										<div
											className="h-full bg-pink-500 transition-all duration-500"
											style={{ width: getWidth(stats.videos) }}
										/>
										<div
											className="h-full bg-amber-500 transition-all duration-500"
											style={{ width: getWidth(stats.documents) }}
										/>
										<div
											className="h-full bg-zinc-400 transition-all duration-500"
											style={{ width: getWidth(stats.other) }}
										/>
									</div>

									<div className="flex items-center justify-between">
										<p className="text-xs text-zinc-500 font-medium">
											<span className="text-zinc-900 font-bold">
												{formatFileSize(stats.total)}
											</span>{" "}
											of 15 GB used
										</p>
										<p className="text-xs font-bold text-zinc-900">
											{usedPercent}%
										</p>
									</div>

									{/* Category Breakdown - Small Cards */}
									<div className="space-y-2">
										<div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100">
											<div className="flex items-center gap-2">
												<div className="w-2 h-2 rounded-full bg-violet-500" />
												<span className="text-[11px] font-medium text-zinc-600">
													Images
												</span>
											</div>
											<span className="text-[11px] font-bold text-zinc-900">
												{formatFileSize(stats.images)}
											</span>
										</div>
										<div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100">
											<div className="flex items-center gap-2">
												<div className="w-2 h-2 rounded-full bg-pink-500" />
												<span className="text-[11px] font-medium text-zinc-600">
													Videos
												</span>
											</div>
											<span className="text-[11px] font-bold text-zinc-900">
												{formatFileSize(stats.videos)}
											</span>
										</div>
										<div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100">
											<div className="flex items-center gap-2">
												<div className="w-2 h-2 rounded-full bg-amber-500" />
												<span className="text-[11px] font-medium text-zinc-600">
													Documents
												</span>
											</div>
											<span className="text-[11px] font-bold text-zinc-900">
												{formatFileSize(stats.documents)}
											</span>
										</div>
										<div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100">
											<div className="flex items-center gap-2">
												<div className="w-2 h-2 rounded-full bg-zinc-400" />
												<span className="text-[11px] font-medium text-zinc-600">
													Other
												</span>
											</div>
											<span className="text-[11px] font-bold text-zinc-900">
												{formatFileSize(stats.other)}
											</span>
										</div>
									</div>
								</div>
							);
						})()}
					</div>
				)}
			</div>

			{/* Upload Modal */}
			<AnimatePresence>
				{showUploadModal && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={handleCloseUploadModal}
							className="fixed inset-0 bg-black bg-opacity-50 z-50"
						/>
						<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
							<motion.div
								initial={{ opacity: 0, scale: 0.95, y: 20 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95, y: 20 }}
								onClick={(e) => e.stopPropagation()}
								className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
							>
								{/* Modal Header */}
								<div className="flex items-center justify-between p-6 border-b border-zinc-200">
									<h2 className="text-xl font-bold text-zinc-900">
										Upload Files
									</h2>
									<button
										onClick={handleCloseUploadModal}
										disabled={isUploading}
										className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors disabled:opacity-50"
									>
										<X className="w-5 h-5" />
									</button>
								</div>

								{/* Modal Body */}
								<div className="flex-1 overflow-y-auto p-6 space-y-4">
									{/* File Input */}
									<div>
										<label className="block text-sm font-medium text-zinc-900 mb-2">
											Select Files
										</label>
										<div
											onClick={() => !isUploading && fileInputRef.current?.click()}
											className="border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center cursor-pointer hover:border-zinc-400 transition-colors"
										>
											<Upload className="w-12 h-12 text-zinc-400 mx-auto mb-2" />
											<p className="text-sm text-zinc-600 mb-1">
												Click to select files or drag and drop
											</p>
											<p className="text-xs text-zinc-500">
												Supports images, PDFs, videos, and documents
											</p>
											<input
												ref={fileInputRef}
												type="file"
												multiple
												onChange={handleFileSelect}
												disabled={isUploading}
												className="hidden"
												accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
											/>
										</div>
									</div>

									{/* Selected Files */}
									{selectedFiles.length > 0 && (
										<div>
											<label className="block text-sm font-medium text-zinc-900 mb-2">
												Selected Files ({selectedFiles.length})
											</label>
											<div className="space-y-2 max-h-48 overflow-y-auto">
												{selectedFiles.map((file, index) => {
													const fileId = `file-${index}`;
													const progress = uploadProgress[fileId]?.progress || 0;
													const isUploadingFile = isUploading && progress < 100;

													return (
														<div
															key={index}
															className="border border-zinc-200 rounded-xl p-3"
														>
															<div className="flex items-center justify-between mb-2">
																<div className="flex items-center gap-2 flex-1 min-w-0">
																	{getFileIcon(file.type)}
																	<span className="text-sm text-zinc-900 truncate">
																		{file.name}
																	</span>
																	<span className="text-xs text-zinc-500">
																		({formatFileSize(file.size)})
																	</span>
																</div>
																{!isUploading && (
																	<button
																		onClick={() => {
																			setSelectedFiles(
																				selectedFiles.filter((_, i) => i !== index)
																			);
																		}}
																		className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
																	>
																		<X className="w-4 h-4" />
																	</button>
																)}
															</div>
															{isUploadingFile && (
																<div className="space-y-1">
																	<div className="flex items-center justify-between text-xs">
																		<span className="text-zinc-600">
																			Uploading...
																		</span>
																		<span className="text-zinc-900 font-medium">
																			{progress}%
																		</span>
																	</div>
																	<div className="w-full bg-zinc-200 rounded-full h-2">
																		<motion.div
																			initial={{ width: 0 }}
																			animate={{ width: `${progress}%` }}
																			className="bg-zinc-900 h-2 rounded-full transition-all"
																		/>
																	</div>
																</div>
															)}
															{progress === 100 && (
																<div className="flex items-center gap-1 text-xs text-green-600">
																	<CheckCircle2 className="w-3.5 h-3.5" />
																	<span>Uploaded successfully</span>
																</div>
															)}
														</div>
													);
												})}
											</div>
										</div>
									)}
								</div>

								{/* Modal Footer */}
								<div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-200">
									<button
										onClick={handleCloseUploadModal}
										disabled={isUploading}
										className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors disabled:opacity-50"
									>
										Cancel
									</button>
									<button
										onClick={handleUpload}
										disabled={isUploading || selectedFiles.length === 0}
										className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<Upload className="w-4 h-4" />
										{isUploading ? "Uploading..." : "Upload Files"}
									</button>
								</div>
							</motion.div>
						</div>
					</>
				)}
			</AnimatePresence>

			{/* Asset Detail Modal */}
			<AnimatePresence>
				{selectedAssetForView && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setSelectedAssetForView(null)}
							className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
						/>
						<div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
							<motion.div
								initial={{ opacity: 0, scale: 0.95, y: 20 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95, y: 20 }}
								className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
							>
								{/* Left Side: Preview */}
								<div className="flex-1 bg-zinc-100 flex items-center justify-center p-4 min-h-[300px] relative">
									<button
										onClick={() => setSelectedAssetForView(null)}
										className="absolute top-4 right-4 md:hidden p-2 bg-white/80 rounded-full shadow-sm text-zinc-500 hover:text-zinc-900 z-10"
									>
										<X className="w-5 h-5" />
									</button>

									{getFileTypeCategory(selectedAssetForView.type) === "image" ? (
										<img
											src={selectedAssetForView.url}
											alt={selectedAssetForView.name}
											className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
										/>
									) : getFileTypeCategory(selectedAssetForView.type) === "video" ? (
										<video
											src={selectedAssetForView.url}
											controls
											className="max-h-full max-w-full rounded-xl shadow-lg"
										/>
									) : (
										<div className="text-center space-y-4">
											<div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto ring-1 ring-zinc-200">
												{getFileIcon(selectedAssetForView.type)}
											</div>
											<p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
												Preview not available
											</p>
										</div>
									)}
								</div>

								{/* Right Side: Details */}
								<div className="w-full md:w-80 lg:w-96 bg-white border-l border-zinc-100 flex flex-col p-6 space-y-6">
									<div className="flex items-center justify-between">
										<h2 className="text-lg text-zinc-900 truncate pr-4">
											Asset Details
										</h2>
										<button
											onClick={() => setSelectedAssetForView(null)}
											className="hidden md:block p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
										>
											<X className="w-5 h-5" />
										</button>
									</div>

									{/* Quick Actions */}
									<div className="flex gap-2">
										<button
											onClick={() => handleCopyLink(selectedAssetForView)}
											className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-100 transition-colors"
										>
											<Copy className="w-4 h-4" />
											Copy Link
										</button>
										<a
											href={selectedAssetForView.url}
											download={selectedAssetForView.name}
											target="_blank"
											rel="noopener noreferrer"
											className="p-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all shadow-sm"
										>
											<Download className="w-5 h-5" />
										</a>
									</div>

									{/* Metadata List */}
									<div className="space-y-4">
										<div className="space-y-1">
											<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
												<Type className="w-3 h-3" />
												Name
											</label>
											<p className="text-sm font-medium text-zinc-900 break-all leading-relaxed">
												{selectedAssetForView.name}
											</p>
										</div>

										<div className="grid grid-cols-2 gap-4 pt-2">
											<div className="space-y-1">
												<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
													<Hash className="w-3 h-3" />
													Size
												</label>
												<p className="text-sm font-medium text-zinc-900">
													{formatFileSize(selectedAssetForView.size)}
												</p>
											</div>
											<div className="space-y-1">
												<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
													<ImageIcon className="w-3 h-3" />
													Format
												</label>
												<p className="text-sm font-medium text-zinc-900 truncate">
													{selectedAssetForView.type?.split("/")[1]?.toUpperCase() || "N/A"}
												</p>
											</div>
										</div>

										<div className="space-y-1 pt-2">
											<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
												<Calendar className="w-3 h-3" />
												Uploaded On
											</label>
											<p className="text-sm font-medium text-zinc-900">
												{formatDate(selectedAssetForView.createdAt)}
											</p>
										</div>

										<div className="space-y-1 pt-2">
											<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
												<ExternalLink className="w-3 h-3" />
												Storage Path
											</label>
											<p className="text-[11px] font-mono text-zinc-500 truncate bg-zinc-50 p-2 rounded-xl border border-zinc-100">
												{selectedAssetForView.storagePath || "N/A"}
											</p>
										</div>
									</div>

									{/* Footer Info */}
									<div className="mt-auto pt-6">
										<button
											onClick={() => {
												handleDelete(selectedAssetForView.id);
												setSelectedAssetForView(null);
											}}
											className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-700 font-medium text-xs p-2 hover:bg-red-50 rounded-xl transition-colors"
										>
											<Trash2 className="w-4 h-4" />
											Delete Permanently
										</button>
									</div>
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
				title="Delete Asset"
				message="Are you sure you want to delete this asset? This action cannot be undone and will remove the file from storage."
				confirmText="Delete"
				cancelText="Cancel"
				variant="danger"
			/>
		</div>
	);
};

export default AssetsTab;

