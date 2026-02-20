import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Fuse from "fuse.js";
import {
	Clock,
	Edit,
	Eye,
	X,
	Calendar,
	FileText,
	Mail,
	RefreshCw,
	Play,
	Trash2,
	Search,
} from "lucide-react";
import AnimatedDropdown from "../../../lib/ui/AnimatedDropdown";
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
	getAllCronJobs,
	updateCronJobSchedule,
	cancelCronJob,
	deleteCronJob,
	syncScheduledItemsToCronJobs,
} from "../../../lib/api/cronJobs";
import { getBlogById } from "../../../lib/api/blog";
import { getEmailById } from "../../../lib/api/emails";
import { toast } from "react-toastify";

const CronJobsTab = ({ queryClient }) => {
	const [selectedJob, setSelectedJob] = useState(null);
	const [showDetailsModal, setShowDetailsModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [editScheduledDate, setEditScheduledDate] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState(null);
	const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

	// Fetch all CRON jobs
	const { data: cronJobs = [], isLoading } = useQuery({
		queryKey: ["cronJobs"],
		queryFn: () => getAllCronJobs(),
	});

	// Fetch job details when modal opens
	const { data: jobDetails } = useQuery({
		queryKey: ["cronJobDetails", selectedJob?.id],
		queryFn: async () => {
			if (!selectedJob) return null;

			if (selectedJob.type === "blog") {
				return await getBlogById(selectedJob.itemId);
			} else if (selectedJob.type === "email") {
				return await getEmailById(selectedJob.itemId);
			}
			return null;
		},
		enabled: !!selectedJob && showDetailsModal,
	});

	// Update schedule mutation
	const updateScheduleMutation = useMutation({
		mutationFn: async ({ id, scheduledDate }) => {
			return await updateCronJobSchedule(id, new Date(scheduledDate));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cronJobs"] });
			toast.success("Schedule updated successfully");
			setShowEditModal(false);
		},
		onError: (error) => {
			toast.error(`Failed to update schedule: ${error.message}`);
		},
	});

	// Cancel job mutation
	const cancelJobMutation = useMutation({
		mutationFn: async (id) => {
			return await cancelCronJob(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cronJobs"] });
			toast.success("CRON job cancelled");
		},
		onError: (error) => {
			toast.error(`Failed to cancel job: ${error.message}`);
		},
	});

	// Delete job mutation
	const deleteJobMutation = useMutation({
		mutationFn: async (id) => {
			return await deleteCronJob(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cronJobs"] });
			toast.success("CRON job deleted");
		},
		onError: (error) => {
			toast.error(`Failed to delete job: ${error.message}`);
		},
	});

	// Sync scheduled items mutation
	const syncMutation = useMutation({
		mutationFn: () => syncScheduledItemsToCronJobs(),
		onSuccess: (results) => {
			queryClient.invalidateQueries({ queryKey: ["cronJobs"] });
			toast.success(
				`Synced ${results.blogsCreated} blogs and ${results.emailsCreated} emails`
			);
		},
		onError: (error) => {
			toast.error(`Failed to sync: ${error.message}`);
		},
	});

	// Execute CRON jobs mutation (only executes jobs that are due)
	const executeCronMutation = useMutation({
		mutationFn: async () => {
			const response = await fetch("/api/cron/execute", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.error || error.message || "Failed to execute CRON jobs"
				);
			}

			return await response.json();
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["cronJobs"] });
			if (data.results.processed === 0) {
				toast.info(
					"No due CRON jobs found. Jobs will execute automatically at their scheduled time."
				);
			} else {
				toast.success(
					`Executed ${data.results.processed} due job(s): ${data.results.success} succeeded, ${data.results.failed} failed`
				);
			}
		},
		onError: (error) => {
			toast.error(`Failed to execute CRON jobs: ${error.message}`);
		},
	});

	const formatDate = (date) => {
		if (!date) return "N/A";
		const d = date instanceof Date ? date : new Date(date);
		if (isNaN(d.getTime())) return "N/A";
		return d.toLocaleString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getStatusBadge = (status) => {
		const badges = {
			scheduled: (
				<span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
					Scheduled
				</span>
			),
			completed: (
				<span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
					Completed
				</span>
			),
			failed: (
				<span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
					Failed
				</span>
			),
			cancelled: (
				<span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
					Cancelled
				</span>
			),
		};
		return badges[status] || badges.scheduled;
	};

	const handleViewDetails = (job) => {
		setSelectedJob(job);
		setShowDetailsModal(true);
	};

	const handleEditSchedule = (job) => {
		setSelectedJob(job);
		const date =
			job.scheduledDate instanceof Date
				? job.scheduledDate
				: new Date(job.scheduledDate);
		setEditScheduledDate(date.toISOString().slice(0, 16));
		setShowEditModal(true);
	};

	const handleSaveSchedule = () => {
		if (!selectedJob || !editScheduledDate) {
			toast.warning("Please select a date");
			return;
		}
		updateScheduleMutation.mutate({
			id: selectedJob.id,
			scheduledDate: editScheduledDate,
		});
	};

	const handleCancelJob = (job) => {
		if (window.confirm("Are you sure you want to cancel this CRON job?")) {
			cancelJobMutation.mutate(job.id);
		}
	};

	const handleDeleteJob = (job) => {
		if (
			window.confirm(
				"Are you sure you want to delete this CRON job? This action cannot be undone."
			)
		) {
			deleteJobMutation.mutate(job.id);
		}
	};

	// Configure Fuse.js for fuzzy search
	const fuseOptions = useMemo(
		() => ({
			keys: [
				{ name: "itemData.title", weight: 0.5 },
				{ name: "itemData.subject", weight: 0.5 },
				{ name: "type", weight: 0.3 },
				{ name: "status", weight: 0.2 },
			],
			threshold: 0.3,
			includeScore: true,
			minMatchCharLength: 2,
		}),
		[]
	);

	// Create Fuse instance with cron jobs
	const fuse = useMemo(
		() => new Fuse(cronJobs, fuseOptions),
		[cronJobs, fuseOptions]
	);

	// Apply search using Fuse.js
	const searchedJobs = useMemo(() => {
		if (!searchQuery.trim()) {
			return cronJobs;
		}
		const results = fuse.search(searchQuery);
		return results.map((result) => result.item);
	}, [searchQuery, fuse, cronJobs]);

	// Apply status filter
	const filteredJobs = useMemo(() => {
		if (statusFilter === null) {
			return searchedJobs;
		}
		return searchedJobs.filter((job) => job.status === statusFilter);
	}, [searchedJobs, statusFilter]);

	// Calculate due jobs count (jobs that are scheduled and past their scheduled time)
	const dueJobsCount = useMemo(() => {
		const now = new Date();
		return cronJobs.filter((job) => {
			if (job.status !== "scheduled") return false;
			const scheduledDate =
				job.scheduledDate instanceof Date
					? job.scheduledDate
					: new Date(job.scheduledDate);
			return scheduledDate <= now;
		}).length;
	}, [cronJobs]);

	// Status filter options
	const statusFilterOptions = [
		{ value: null, label: "All Statuses" },
		{ value: "scheduled", label: "Scheduled" },
		{ value: "completed", label: "Completed" },
		{ value: "failed", label: "Failed" },
		{ value: "cancelled", label: "Cancelled" },
	];

	return (
		<div className="space-y-2">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-zinc-200 py-2 px-4">
				<div>
					<h1 className="text-lg text-zinc-900">CRON Jobs</h1>
					<p className="text-sm text-zinc-600 mt-1">
						Manage scheduled blog posts and email campaigns. Jobs execute
						automatically at their scheduled time via Vercel CRON (every 5
						minutes).
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => executeCronMutation.mutate()}
						disabled={executeCronMutation.isPending || dueJobsCount === 0}
						className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						title={
							dueJobsCount === 0
								? "No due jobs to execute. Jobs will run automatically at their scheduled time."
								: `Execute ${dueJobsCount} due CRON job(s) now (only runs jobs past their scheduled time)`
						}
					>
						<Play
							className={`w-4 h-4 ${
								executeCronMutation.isPending ? "animate-pulse" : ""
							}`}
						/>
						{executeCronMutation.isPending
							? "Running..."
							: `Run Due Jobs (${dueJobsCount})`}
					</button>
					<button
						onClick={() => syncMutation.mutate()}
						disabled={syncMutation.isPending}
						className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50"
					>
						<RefreshCw
							className={`w-4 h-4 ${
								syncMutation.isPending ? "animate-spin" : ""
							}`}
						/>
						Sync Scheduled Items
					</button>
				</div>
			</div>

			{/* Search and Filter */}
			<div className="flex items-center justify-between gap-4 px-4">
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
					<input
						type="text"
						placeholder="Search CRON jobs by title, subject, type, or status..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
					/>
				</div>
				<div className="flex items-center gap-2">
					<AnimatedDropdown
						isOpen={isStatusDropdownOpen}
						onToggle={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
						onSelect={(value) => {
							setStatusFilter(value);
						}}
						options={statusFilterOptions.map((opt) => ({
							value: opt.value,
							label: opt.label,
						}))}
						value={statusFilter}
						placeholder="Filter by Status"
						buttonClassName="text-sm min-w-[150px]"
					/>
				</div>
			</div>

			{/* Table */}
			<div className="px-4">
				{isLoading ? (
					<div className="text-center py-8 text-zinc-500">Loading...</div>
				) : cronJobs.length === 0 ? (
					<div className="text-center py-8 text-zinc-500">
						<Clock className="w-12 h-12 text-zinc-400 mx-auto mb-2" />
						<p>No CRON jobs found</p>
						<p className="text-sm mt-1">
							Click "Sync Scheduled Items" to import scheduled blogs and emails
						</p>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Type</TableHead>
								<TableHead>Title/Subject</TableHead>
								<TableHead>Scheduled Date</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredJobs.length === 0 ? (
								<TableEmpty
									colSpan={5}
									message={
										searchQuery || statusFilter !== null
											? "No CRON jobs found matching your search or filter."
											: "No CRON jobs found"
									}
									icon={Clock}
								/>
							) : (
								filteredJobs.map((job) => (
									<TableRow key={job.id}>
										<TableCell>
											<div className="flex items-center gap-2">
												{job.type === "blog" ? (
													<FileText className="w-4 h-4 text-blue-600" />
												) : (
													<Mail className="w-4 h-4 text-purple-600" />
												)}
												<span className="capitalize">{job.type}</span>
											</div>
										</TableCell>
										<TableCell>
											<span className="font-medium">
												{job.itemData?.title || job.itemData?.subject || "N/A"}
											</span>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<Calendar className="w-4 h-4 text-zinc-500" />
												<span>{formatDate(job.scheduledDate)}</span>
											</div>
										</TableCell>
										<TableCell>{getStatusBadge(job.status)}</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<button
													onClick={() => handleViewDetails(job)}
													className="p-1.5 rounded-xl hover:bg-zinc-100 transition-colors"
													title="View Details"
												>
													<Eye className="w-4 h-4 text-zinc-600" />
												</button>
												{job.status === "scheduled" && (
													<>
														<button
															onClick={() => handleEditSchedule(job)}
															className="p-1.5 rounded-xl hover:bg-zinc-100 transition-colors"
															title="Edit Schedule"
														>
															<Edit className="w-4 h-4 text-blue-600" />
														</button>
														<button
															onClick={() => handleCancelJob(job)}
															className="p-1.5 rounded-xl hover:bg-zinc-100 transition-colors"
															title="Cancel Job"
														>
															<X className="w-4 h-4 text-red-600" />
														</button>
													</>
												)}
												{job.status === "completed" && (
													<button
														onClick={() => handleDeleteJob(job)}
														className="p-1.5 rounded-xl hover:bg-zinc-100 transition-colors"
														title="Delete Job"
													>
														<Trash2 className="w-4 h-4 text-red-600" />
													</button>
												)}
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				)}
			</div>

			{/* Details Modal */}
			{showDetailsModal && selectedJob && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
					>
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-2xl font-bold text-zinc-900">
								CRON Job Details
							</h2>
							<button
								onClick={() => {
									setShowDetailsModal(false);
									setSelectedJob(null);
								}}
								className="p-2 rounded-xl hover:bg-zinc-100 transition-colors"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="space-y-4">
							<div>
								<label className="text-sm font-medium text-zinc-600">
									Type
								</label>
								<p className="text-base text-zinc-900 capitalize">
									{selectedJob.type}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium text-zinc-600">
									Scheduled Date
								</label>
								<p className="text-base text-zinc-900">
									{formatDate(selectedJob.scheduledDate)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium text-zinc-600">
									Status
								</label>
								<div className="mt-1">{getStatusBadge(selectedJob.status)}</div>
							</div>

							{jobDetails && (
								<div className="border-t border-zinc-200 pt-4">
									<h3 className="text-lg font-semibold text-zinc-900 mb-3">
										{selectedJob.type === "blog" ? "Blog" : "Email"} Details
									</h3>
									{selectedJob.type === "blog" ? (
										<div className="space-y-3">
											<div>
												<label className="text-sm font-medium text-zinc-600">
													Title
												</label>
												<p className="text-base text-zinc-900">
													{jobDetails.title}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-zinc-600">
													Slug
												</label>
												<p className="text-base text-zinc-900">
													{jobDetails.slug}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-zinc-600">
													Content Preview
												</label>
												<div
													className="text-sm text-zinc-700 mt-1 max-h-40 overflow-y-auto border border-zinc-200 rounded-xl p-3"
													dangerouslySetInnerHTML={{
														__html: jobDetails.content?.substring(0, 500) || "",
													}}
												/>
											</div>
										</div>
									) : (
										<div className="space-y-3">
											<div>
												<label className="text-sm font-medium text-zinc-600">
													Subject
												</label>
												<p className="text-base text-zinc-900">
													{jobDetails.subject}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-zinc-600">
													Content Preview
												</label>
												<div
													className="text-sm text-zinc-700 mt-1 max-h-40 overflow-y-auto border border-zinc-200 rounded-xl p-3"
													dangerouslySetInnerHTML={{
														__html: jobDetails.content?.substring(0, 500) || "",
													}}
												/>
											</div>
										</div>
									)}
								</div>
							)}
						</div>
					</motion.div>
				</div>
			)}

			{/* Edit Schedule Modal */}
			{showEditModal && selectedJob && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						className="bg-white rounded-2xl p-6 max-w-md w-full"
					>
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-2xl font-bold text-zinc-900">
								Edit Schedule
							</h2>
							<button
								onClick={() => {
									setShowEditModal(false);
									setSelectedJob(null);
								}}
								className="p-2 rounded-xl hover:bg-zinc-100 transition-colors"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-zinc-700 mb-2">
									New Scheduled Date & Time
								</label>
								<input
									type="datetime-local"
									value={editScheduledDate}
									onChange={(e) => setEditScheduledDate(e.target.value)}
									className="w-full px-4 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-100 focus:border-transparent"
								/>
							</div>

							<div className="flex gap-3">
								<button
									onClick={() => {
										setShowEditModal(false);
										setSelectedJob(null);
									}}
									className="flex-1 px-4 py-2 text-sm font-medium bg-zinc-100 text-zinc-900 rounded-xl hover:bg-zinc-200 transition-colors"
								>
									Cancel
								</button>
								<button
									onClick={handleSaveSchedule}
									disabled={updateScheduleMutation.isPending}
									className="flex-1 px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50"
								>
									{updateScheduleMutation.isPending ? "Saving..." : "Save"}
								</button>
							</div>
						</div>
					</motion.div>
				</div>
			)}
		</div>
	);
};

export default CronJobsTab;
