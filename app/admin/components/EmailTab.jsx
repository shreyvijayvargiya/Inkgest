import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
	Plus,
	Trash2,
	X,
	Save,
	Eye,
	Mail,
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
	getAllEmails,
	createEmail,
	updateEmail,
	deleteEmail,
} from "../../../lib/api/emails";
import { getAllowedActions } from "../../../lib/config/roles-config";
import { getCachedUserRole, getUserRole } from "../../../lib/utils/getUserRole";
import { getCurrentUserEmail } from "../../../lib/utils/getCurrentUserEmail";
import ConfirmationModal from "../../../lib/ui/ConfirmationModal";
import ExportDropdown from "../../../lib/ui/ExportDropdown";
import { toast } from "sonner";

const EmailTab = ({ queryClient }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortField, setSortField] = useState(null); // 'subject', 'status', 'recipients', 'createdAt'
	const [sortDirection, setSortDirection] = useState("asc"); // 'asc' or 'desc'
	const [showEmailModal, setShowEmailModal] = useState(false);
	const [showEmailPreview, setShowEmailPreview] = useState(false);
	const [editingEmail, setEditingEmail] = useState(null);
	const [emailForm, setEmailForm] = useState({
		subject: "",
		status: "draft",
	});
	const [emailContent, setEmailContent] = useState("");
	const [showSendSingleModal, setShowSendSingleModal] = useState(false);
	const [singleEmailForm, setSingleEmailForm] = useState({
		email: "",
		name: "",
	});

	// Modal states
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [confirmAction, setConfirmAction] = useState(null);
	const [confirmData, setConfirmData] = useState({
		title: "",
		message: "",
		variant: "danger",
	});

	// Fetch user role with React Query
	const fetchUserRole = async () => {
		try {
			// Get current user email (from Firebase Auth or localStorage fallback)
			const userEmail = await getCurrentUserEmail();

			console.log("EmailTab: Current user email:", userEmail);

			if (userEmail) {
				// Fetch role from Firestore teams collection using email
				const role = await getUserRole(userEmail, false);
				console.log("EmailTab: Fetched role from teams collection:", role);
				return role;
			} else {
				console.warn("EmailTab: No user email found, using cached role");
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

	// Get allowed actions for emails
	const allowedActions = getAllowedActions(userRole, "emails");

	// Fetch emails with React Query
	const {
		data: emails = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["emails"],
		queryFn: () => getAllEmails(),
	});

	const filteredEmails = emails.filter((email) => {
		const searchLower = searchQuery.toLowerCase();
		return (
			email.subject?.toLowerCase().includes(searchLower) ||
			email.status?.toLowerCase().includes(searchLower)
		);
	});

	// Sort emails
	const sortedEmails = [...filteredEmails].sort((a, b) => {
		if (!sortField) return 0;

		// Handle date comparison separately
		if (sortField === "createdAt") {
			const dateA = a.createdAt?.toDate
				? a.createdAt.toDate()
				: new Date(a.createdAt || 0);
			const dateB = b.createdAt?.toDate
				? b.createdAt.toDate()
				: new Date(b.createdAt || 0);
			return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
		}

		// Handle number comparison for recipients
		if (sortField === "recipients") {
			const recipientsA = a.recipients || 0;
			const recipientsB = b.recipients || 0;
			return sortDirection === "asc"
				? recipientsA - recipientsB
				: recipientsB - recipientsA;
		}

		// Handle string comparison for other fields
		let aValue, bValue;

		switch (sortField) {
			case "subject":
				aValue = (a.subject || "").toLowerCase();
				bValue = (b.subject || "").toLowerCase();
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
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
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

	// Create email mutation
	const createEmailMutation = useMutation({
		mutationFn: createEmail,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["emails"] });
			handleCloseModal();
			toast.success("Email created successfully!");
		},
		onError: (error) => {
			console.error("Error creating email:", error);
			toast.error("Failed to create email. Please try again.");
		},
	});

	// Update email mutation
	const updateEmailMutation = useMutation({
		mutationFn: ({ id, data }) => updateEmail(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["emails"] });
			handleCloseModal();
			toast.success("Email updated successfully!");
		},
		onError: (error) => {
			console.error("Error updating email:", error);
			toast.error("Failed to update email. Please try again.");
		},
	});

	// Delete email mutation
	const deleteEmailMutation = useMutation({
		mutationFn: deleteEmail,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["emails"] });
			toast.success("Email deleted successfully!");
		},
		onError: (error) => {
			console.error("Error deleting email:", error);
			toast.error("Failed to delete email. Please try again.");
		},
	});

	// Handle email form change
	const handleEmailFormChange = (e) => {
		const { name, value } = e.target;
		setEmailForm((prev) => ({ ...prev, [name]: value }));
	};

	// Create or update email
	const handleSaveEmail = async () => {
		if (!emailForm.subject || !emailContent) return;

		const emailData = {
			...emailForm,
			content: emailContent,
		};

		if (editingEmail) {
			updateEmailMutation.mutate({ id: editingEmail.id, data: emailData });
		} else {
			createEmailMutation.mutate(emailData);
		}
	};

	// Delete email
	const handleDeleteEmail = async (id) => {
		setConfirmData({
			title: "Delete Email",
			message:
				"Are you sure you want to delete this email? This action cannot be undone.",
			variant: "danger",
		});
		setConfirmAction(() => () => deleteEmailMutation.mutate(id));
		setShowConfirmModal(true);
	};

	// Edit email
	const handleEditEmail = (email) => {
		// Navigate to editor page instead of opening modal
		window.location.href = `/admin/editor/email?id=${email.id}`;
	};

	// Preview email
	const handlePreviewEmail = (email) => {
		setEditingEmail(email);
		setShowEmailPreview(true);
	};

	const onSendEmai = async () => {

	}
	// Send email
	const handleSendEmail = async (email) => {
		if (onSendEmail) {
			try {
				await onSendEmail(email);
				queryClient.invalidateQueries({ queryKey: ["emails"] });
			} catch (error) {
				console.error("Error sending email:", error);
			}
		}
	};

	// Handle single email form change
	const handleSingleEmailFormChange = (e) => {
		const { name, value } = e.target;
		setSingleEmailForm((prev) => ({ ...prev, [name]: value }));
	};

	// Send email to single user
	const handleSendSingleEmail = async () => {
		if (!singleEmailForm.email) {
			toast.warning("Email address is required");
			return;
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(singleEmailForm.email)) {
			toast.warning("Please enter a valid email address");
			return;
		}

		// Get the current email content and subject
		const currentSubject =
			emailForm.subject || editingEmail?.subject || "No Subject";
		const currentContent = emailContent || editingEmail?.content || "";

		if (!currentContent) {
			toast.warning("Email content is required");
			return;
		}

		try {
			const response = await fetch("/api/emails/send-single", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: singleEmailForm.email,
					name: singleEmailForm.name || undefined,
					subject: currentSubject,
					content: currentContent,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				toast.success("Email sent successfully!");
				setShowSendSingleModal(false);
				setSingleEmailForm({ email: "", name: "" });
			} else {
				toast.error(data.error || "Failed to send email");
			}
		} catch (error) {
			console.error("Error sending single email:", error);
			toast.error("Failed to send email. Please try again.");
		}
	};

	// Close modal
	const handleCloseModal = () => {
		setShowEmailModal(false);
		setEditingEmail(null);
		setEmailForm({ subject: "", status: "draft" });
		setEmailContent("");
	};

	// Get current email HTML for preview
	const getEmailPreviewHTML = () => {
		if (showEmailPreview && editingEmail) {
			if (!showEmailModal) {
				return editingEmail.content;
			}
			return emailContent;
		}
		return emailContent;
	};

	// Format date
	const formatDate = (dateString) => {
		if (!dateString) return "";
		const date = dateString?.toDate
			? dateString.toDate()
			: new Date(dateString);
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	return (
		<div>
			<div className="flex justify-between items-center border-b border-zinc-200 py-2 px-4">
				<div>
					<h2 className="text-lg text-zinc-900">Email Campaigns</h2>
					<p className="text-sm text-zinc-600 mt-1">
						Manage your email campaigns and templates
					</p>
				</div>
				<div className="flex items-center gap-2">
					<ExportDropdown dataType="emails" data={sortedEmails} />
					<motion.a
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						href="/admin/editor/email"
						className="flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors text-sm"
					>
						<Plus className="w-3.5 h-3.5" />
						Create New Email
					</motion.a>
				</div>
			</div>

			{/* Search */}
			<div className="relative my-4 mx-4">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
				<input
					type="text"
					placeholder="Search emails by subject or status..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-fit max-w-xl pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
				/>
			</div>

			<div className="overflow-x-auto px-4">
				{isLoading ? (
					<TableSkeleton rows={5} columns={5} />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead
									sortable
									onClick={() => handleSort("subject")}
									className="min-w-[250px]"
								>
									<div className="flex items-center gap-2">
										Subject
										{getSortIcon("subject")}
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
									onClick={() => handleSort("recipients")}
								>
									<div className="flex items-center gap-2">
										Recipients
										{getSortIcon("recipients")}
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
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{error ? (
								<TableEmpty
									colSpan={5}
									message="Error loading emails. Please try again."
								/>
							) : sortedEmails.length === 0 ? (
								<TableEmpty
									colSpan={5}
									message={
										searchQuery
											? "No emails found matching your search."
											: "No emails found. Create your first email campaign!"
									}
								/>
							) : (
								sortedEmails.map((email) => (
									<TableRow
										key={email.id}
										onClick={() => handleEditEmail(email)}
										className="cursor-pointer"
									>
										<TableCell>
											<div className="font-medium text-zinc-900 hover:text-zinc-600 transition-colors">
												{email.subject}
											</div>
										</TableCell>
										<TableCell>
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${email.status === "published"
														? "bg-green-100 text-green-800"
														: email.status === "scheduled"
															? "bg-blue-100 text-blue-800"
															: "bg-yellow-100 text-yellow-800"
													}`}
											>
												{email.status || "draft"}
											</span>
										</TableCell>
										<TableCell className="text-zinc-600">
											{email.recipients || 0}
										</TableCell>
										<TableCell className="text-zinc-600">
											{formatDate(email.createdAt)}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												{allowedActions.map((action) => {
													if (action === "send" && email.status === "draft") {
														return (
															<motion.button
																key="send"
																whileHover={{ scale: 1.05 }}
																whileTap={{ scale: 0.95 }}
																onClick={(e) => {
																	e.stopPropagation();
																	handleSendEmail(email);
																}}
																className="p-2 text-zinc-400 hover:text-green-600 transition-colors"
																title="Send to Subscribers"
															>
																<Mail className="w-4 h-4" />
															</motion.button>
														);
													}
													if (action === "view") {
														return (
															<motion.button
																key="preview"
																whileHover={{ scale: 1.05 }}
																whileTap={{ scale: 0.95 }}
																onClick={(e) => {
																	e.stopPropagation();
																	handlePreviewEmail(email);
																}}
																className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
																title="Preview"
															>
																<Eye className="w-4 h-4" />
															</motion.button>
														);
													}
													return null;
												})}
												{/* Always show delete button with confirmation modal */}
												<motion.button
													whileHover={{ scale: 1.05 }}
													whileTap={{ scale: 0.95 }}
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteEmail(email.id);
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

			{/* Email Modal */}
			<AnimatePresence>
				{showEmailModal && (
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
									{editingEmail ? "Edit Email" : "Create Email"}
								</h3>
								<div className="flex items-center gap-3">
									<motion.button
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={handleSaveEmail}
										className="flex items-center gap-2 px-4 py-1.5 text-sm bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium transition-colors"
									>
										<Save className="w-4 h-4" />
										{editingEmail ? "Update" : "Create"} Email
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
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Subject *
									</label>
									<input
										type="text"
										name="subject"
										value={emailForm.subject}
										onChange={handleEmailFormChange}
										className="w-full px-4 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:outline-none"
										placeholder="Email subject"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Content *
									</label>
									<TiptapEditor
										placeholder="Start writing your email... Type / for commands"
										content={emailContent}
										onChange={setEmailContent}
										showPreview={true}
										onPreview={() => {
											if (emailForm.subject && emailContent) {
												const tempEmail = {
													subject: emailForm.subject,
													content: emailContent,
												};
												setEditingEmail(tempEmail);
												setShowEmailPreview(true);
											}
										}}
									/>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Email Preview Modal */}
			<AnimatePresence>
				{showEmailPreview && editingEmail && (
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
							className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
						>
							{/* Preview Header */}
							<div className="flex items-center justify-between p-4 border-b border-zinc-200">
								<div>
									<h3 className="text-lg text-zinc-900">
										Email Preview
									</h3>
									<p className="text-xs text-zinc-600 mt-1">
										{editingEmail?.subject ||
											emailForm.subject ||
											"Email Preview"}
									</p>
								</div>
								<div className="flex items-center gap-3">
									<motion.button
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={async () => {
											const currentSubject =
												emailForm.subject || editingEmail?.subject || "";
											const currentContent =
												emailContent || editingEmail?.content || "";

											if (!currentSubject || !currentContent) {
												toast.warning("Email must have subject and content");
												return;
											}

											setConfirmData({
												title: "Send Email",
												message: "Send this email to all active subscribers?",
												variant: "info",
											});
											setConfirmAction(() => async () => {
												if (onSendEmail) {
													const emailToSend = {
														id: editingEmail?.id || "",
														subject: currentSubject,
														content: currentContent,
													};
													await onSendEmail(emailToSend);
													queryClient.invalidateQueries({
														queryKey: ["emails"],
													});
												}
											});
											setShowConfirmModal(true);
										}}
										className="px-4 py-1.5 text-sm bg-zinc-50 hover:bg-zinc-100 text-zinc-900 rounded-xl font-medium transition-colors border border-zinc-200"
									>
										Send to All Subscribers
									</motion.button>
									<motion.button
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={() => setShowSendSingleModal(true)}
										className="px-4 py-1.5 text-sm bg-zinc-50 hover:bg-zinc-100 text-zinc-900 rounded-xl font-medium transition-colors border border-zinc-200"
									>
										Send to Single User
									</motion.button>
									<button
										onClick={() => setShowEmailPreview(false)}
										className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
									>
										<X className="w-4 h-4" />
									</button>
								</div>
							</div>

							{/* Preview Content */}
							<div className="flex-1 overflow-y-auto p-4">
								<div
									className="prose prose-zinc max-w-none"
									dangerouslySetInnerHTML={{
										__html: getEmailPreviewHTML(),
									}}
								/>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Send Single Email Modal */}
			<AnimatePresence>
				{showSendSingleModal && (
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
							className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
						>
							{/* Modal Header */}
							<div className="flex items-center justify-between p-4 border-b border-zinc-200">
								<h3 className="text-lg text-zinc-900">
									Send Email to User
								</h3>
								<div className="flex items-center gap-3">
									<motion.button
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={handleSendSingleEmail}
										className="flex items-center gap-2 px-4 py-1.5 text-sm bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium transition-colors"
									>
										<Mail className="w-4 h-4" />
										Send
									</motion.button>
									<motion.button
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={() => {
											setShowSendSingleModal(false);
											setSingleEmailForm({ email: "", name: "" });
										}}
										className="px-4 py-1.5 text-sm text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-medium transition-colors"
									>
										Cancel
									</motion.button>
									<button
										onClick={() => {
											setShowSendSingleModal(false);
											setSingleEmailForm({ email: "", name: "" });
										}}
										className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
									>
										<X className="w-4 h-4" />
									</button>
								</div>
							</div>

							{/* Modal Body */}
							<div className="p-4 space-y-4">
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Email Address *
									</label>
									<input
										type="email"
										name="email"
										value={singleEmailForm.email}
										onChange={handleSingleEmailFormChange}
										className="w-full px-4 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:outline-none"
										placeholder="user@example.com"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Name (Optional)
									</label>
									<input
										type="text"
										name="name"
										value={singleEmailForm.name}
										onChange={handleSingleEmailFormChange}
										className="w-full px-4 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:outline-none"
										placeholder="User name"
									/>
								</div>
								<div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
									<p className="text-xs text-zinc-600 mb-1">
										<strong>Subject:</strong>{" "}
										{emailForm.subject || "No subject"}
									</p>
									<p className="text-xs text-zinc-500">
										Email will be sent with the current email content
									</p>
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

export default EmailTab;
