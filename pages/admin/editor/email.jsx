import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
	Save,
	ArrowLeft,
	Eye,
	Mail,
	Settings,
	Plus,
	Search,
	Menu,
	X,
	Calendar,
	Send,
} from "lucide-react";
import TiptapEditor from "../../../app/admin/components/TiptapEditor";
import {
	getEmailById,
	createEmail,
	updateEmail,
	getAllEmails,
} from "../../../lib/api/emails";
import { getAllUsers } from "../../../lib/api/users";
import { getAllCustomers } from "../../../lib/api/customers";
import AnimatedDropdown from "../../../lib/ui/AnimatedDropdown";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const EmailEditorPage = () => {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { id } = router.query;

	const [isPreviewMode, setIsPreviewMode] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
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

	// Email state
	const [emailForm, setEmailForm] = useState({
		subject: "",
		status: "draft",
	});
	const [emailContent, setEmailContent] = useState("");

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

	// Send email state
	const [recipientType, setRecipientType] = useState("custom"); // 'user', 'customer', 'custom'
	const [isRecipientTypeDropdownOpen, setIsRecipientTypeDropdownOpen] =
		useState(false);
	const [selectedRecipient, setSelectedRecipient] = useState("");
	const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);
	const [customEmail, setCustomEmail] = useState("");
	const [customName, setCustomName] = useState("");
	const [isSendingEmail, setIsSendingEmail] = useState(false);

	// Fetch all emails for sidebar
	const { data: emails = [], isLoading: isLoadingEmails } = useQuery({
		queryKey: ["emails"],
		queryFn: () => getAllEmails(),
	});

	// Fetch users and customers for sending
	const { data: users = [] } = useQuery({
		queryKey: ["users"],
		queryFn: () => getAllUsers(),
	});

	const { data: customers = [] } = useQuery({
		queryKey: ["customers"],
		queryFn: () => getAllCustomers(),
	});

	// Filter emails based on search
	const filteredEmails = emails.filter((email) =>
		email.subject?.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Fetch existing email if editing
	const { data: existingItem, isLoading: isLoadingItem } = useQuery({
		queryKey: ["email", id],
		queryFn: async () => {
			if (!id) return null;
			return await getEmailById(id);
		},
		enabled: !!id,
	});

	// Load existing data when editing
	useEffect(() => {
		if (existingItem && id) {
			setEmailForm({
				subject: existingItem.subject || "",
				status: existingItem.status || "draft",
			});
			setEmailContent(existingItem.content || "");
			setScheduledDate(existingItem.scheduledDate || "");
		} else if (!id) {
			// Reset form for new email
			setEmailForm({
				subject: "",
				status: "draft",
			});
			setEmailContent("");
			setScheduledDate("");
		}
	}, [existingItem, id]);

	// Create/Update mutation
	const saveEmailMutation = useMutation({
		mutationFn: async (emailData) => {
			if (id) {
				return await updateEmail(id, emailData);
			} else {
				return await createEmail(emailData);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["emails"] });
			toast.success(
				id ? "Email updated successfully!" : "Email created successfully!"
			);
		},
		onError: (error) => {
			console.error("Error saving email:", error);
			toast.error("Failed to save email. Please try again.");
			setIsSaving(false);
		},
	});

	// Handle form changes
	const handleEmailFormChange = (e) => {
		const { name, value } = e.target;
		setEmailForm((prev) => ({ ...prev, [name]: value }));
	};

	// Handle status select
	const handleStatusSelect = (status) => {
		setEmailForm((prev) => ({ ...prev, status }));
	};

	// Save handler
	const handleSave = async () => {
		setIsSaving(true);
		if (!emailForm.subject || !emailContent) {
			toast.warning("Subject and content are required");
			setIsSaving(false);
			return;
		}
		saveEmailMutation.mutate({
			...emailForm,
			content: emailContent,
		});
	};

	// Handle email selection from sidebar
	const handleEmailSelect = (emailId) => {
		router.push(`/admin/editor/email?id=${emailId}`);
	};

	// Handle new email
	const handleNewEmail = () => {
		router.push("/admin/editor/email");
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

	// Recipient type options
	const recipientTypeOptions = [
		{ value: "user", label: "Send to User" },
		{ value: "customer", label: "Send to Customer" },
		{ value: "custom", label: "Send to Custom Email" },
	];

	// Get recipient options based on type
	const getRecipientOptions = () => {
		if (recipientType === "user") {
			return users.map((user) => ({
				value: user.id,
				label: `${user.name || user.displayName || user.email} (${user.email})`,
				data: user,
			}));
		} else if (recipientType === "customer") {
			return customers.map((customer) => ({
				value: customer.id,
				label: `${customer.name || customer.email} (${customer.email})`,
				data: customer,
			}));
		}
		return [];
	};

	// Handle recipient type change
	const handleRecipientTypeChange = (type) => {
		setRecipientType(type);
		setSelectedRecipient("");
		setCustomEmail("");
		setCustomName("");
	};

	// Handle recipient select
	const handleRecipientSelect = (recipientId) => {
		setSelectedRecipient(recipientId);
		const options = getRecipientOptions();
		const selected = options.find((opt) => opt.value === recipientId);
		if (selected && selected.data) {
			setCustomEmail(selected.data.email || "");
			setCustomName(
				selected.data.name ||
				selected.data.displayName ||
				selected.data.email ||
				""
			);
		}
	};

	// Handle send email
	const handleSendEmail = async () => {
		if (!emailForm.subject || !emailContent) {
			toast.warning("Subject and content are required");
			return;
		}

		let recipientEmail = "";
		let recipientName = "";

		if (recipientType === "custom") {
			if (!customEmail.trim()) {
				toast.warning("Please enter an email address");
				return;
			}
			recipientEmail = customEmail.trim();
			recipientName = customName.trim();
		} else {
			if (!selectedRecipient) {
				toast.warning("Please select a recipient");
				return;
			}
			const options = getRecipientOptions();
			const selected = options.find((opt) => opt.value === selectedRecipient);
			if (selected && selected.data) {
				recipientEmail = selected.data.email || "";
				recipientName =
					selected.data.name ||
					selected.data.displayName ||
					selected.data.email ||
					"";
			}
		}

		if (!recipientEmail) {
			toast.warning("Recipient email is missing");
			return;
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(recipientEmail)) {
			toast.warning("Please enter a valid email address");
			return;
		}

		setIsSendingEmail(true);
		try {
			const response = await fetch("/api/emails/send-single", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: recipientEmail,
					name: recipientName || undefined,
					subject: emailForm.subject,
					content: emailContent,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				toast.success("Email sent successfully!");
				// Reset recipient fields
				setSelectedRecipient("");
				setCustomEmail("");
				setCustomName("");
			} else {
				toast.error(data.error || "Failed to send email");
			}
		} catch (error) {
			console.error("Error sending email:", error);
			toast.error("Failed to send email. Please try again.");
		} finally {
			setIsSendingEmail(false);
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
				<div className="max-w-[1920px] mx-auto px-2 py-2">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => router.push("/admin?path=emails")}
								className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
							>
								<ArrowLeft className="w-3.5 h-3.5" />
								Back
							</motion.button>
							<div className="h-5 w-px bg-zinc-300"></div>
							<div className="items-center gap-1.5 md:flex hidden">
								<Mail className="w-4 h-4 text-zinc-700" />
								<h1 className="text-base font-semibold text-zinc-900">
									{id ? "Edit Email" : "Create New Email"}
								</h1>
							</div>
						</div>

						<div className="flex items-center gap-2">
							{/* Sidebar Toggle */}
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => setIsSidebarOpen(!isSidebarOpen)}
								className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
							>
								<Menu className="w-4 h-4" />
							</motion.button>

							{/* Settings Toggle */}
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => setIsSettingsOpen(!isSettingsOpen)}
								className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
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
				<AnimatePresence>
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
				</AnimatePresence>

				{/* Left Sidebar Drawer - Emails List */}
				<AnimatePresence>
					<div
						className={`fixed inset-y-0 lg:top-12 left-0 w-64 bg-white border-r border-zinc-200 flex flex-col z-50 lg:z-auto ${isSidebarOpen
								? "translate-x-0"
								: "-translate-x-full lg:translate-x-0"
							} transition-transform duration-300 ease-in-out`}
					>
						<div className="p-3 border-b border-zinc-200">
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2">
									<Mail className="w-4 h-4 text-zinc-600" />
									<h2 className="text-sm font-semibold text-zinc-900">
										Emails
									</h2>
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
									handleNewEmail();
									setIsSidebarOpen(false);
								}}
								className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl text-xs font-medium transition-colors mb-2"
							>
								<Plus className="w-3.5 h-3.5" />
								New Email
							</motion.button>
							<div className="relative">
								<Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
								<input
									type="text"
									placeholder="Search emails..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:outline-none"
								/>
							</div>
						</div>
						<div className="flex-1 overflow-y-auto">
							{isLoadingEmails ? (
								<div className="p-3 text-center text-xs text-zinc-500">
									Loading...
								</div>
							) : filteredEmails.length === 0 ? (
								<div className="p-3 text-center text-xs text-zinc-500">
									No emails found
								</div>
							) : (
								<div className="p-2">
									{filteredEmails.map((email) => (
										<motion.div
											key={email.id}
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											onClick={() => {
												handleEmailSelect(email.id);
												setIsSidebarOpen(false);
											}}
											className={`p-2 rounded-xl cursor-pointer transition-colors mb-1 ${id === email.id
													? "bg-zinc-100 hover:bg-zinc-200 text-black  hover:text-zinc-900"
													: "hover:bg-zinc-50 text-zinc-900"
												}`}
										>
											<div className="text-xs font-medium truncate mb-1">
												{email.subject || "Untitled"}
											</div>
											<div
												className={`text-xs ${id === email.id ? "text-zinc-700" : "text-zinc-800"
													}`}
											>
												{formatDate(email.createdAt)} • {email.status}
											</div>
										</motion.div>
									))}
								</div>
							)}
						</div>
					</div>
				</AnimatePresence>

				{/* Center - Editor */}
				<div className="flex-1 flex justify-center px-4 py-4">
					{isPreviewMode ? (
						/* Preview Mode */
						<div className="w-full max-w-3xl bg-white rounded-xl shadow-sm border border-zinc-200 p-6 overflow-y-auto">
							<h1 className="text-3xl font-bold text-zinc-900 mb-4">
								{emailForm.subject || "Email Preview"}
							</h1>
							<div className="prose prose-zinc max-w-none prose-sm">
								<ReactMarkdown>{emailContent || ""}</ReactMarkdown>
							</div>
						</div>
					) : (
						<div className="w-full max-w-3xl bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col">
							<div className="flex-1 overflow-hidden flex flex-col">
								<TiptapEditor
									placeholder="Start writing your email... Type / for commands"
									content={emailContent}
									onChange={setEmailContent}
									minHeight="100%"
									maxHeight="none"
								/>
							</div>
						</div>
					)}
				</div>

				{/* Right Sidebar Drawer - Settings */}
				<AnimatePresence>
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
							{/* Subject */}
							<div>
								<label className="block text-xs font-medium text-zinc-700 mb-1.5">
									Subject *
								</label>
								<input
									type="text"
									name="subject"
									value={emailForm.subject}
									onChange={handleEmailFormChange}
									className="w-full px-3 py-1.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:outline-none"
									placeholder="Email subject"
								/>
							</div>

							{/* Status */}
							<div>
								<label className="block text-xs font-medium text-zinc-700 mb-1.5">
									Status *
								</label>
								<AnimatedDropdown
									isOpen={isStatusDropdownOpen}
									onToggle={() =>
										setIsStatusDropdownOpen(!isStatusDropdownOpen)
									}
									onSelect={handleStatusSelect}
									options={statusOptions}
									value={emailForm.status}
									placeholder="Select status"
								/>
								<AnimatePresence>
									{emailForm.status === "scheduled" && (
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

							{/* Action Section */}
							<div className="pt-4 border-t border-zinc-200">
								<label className="block text-xs font-medium text-zinc-700 mb-3">
									Action
								</label>

								{/* Recipient Type */}
								<div className="mb-3">
									<AnimatedDropdown
										isOpen={isRecipientTypeDropdownOpen}
										onToggle={() =>
											setIsRecipientTypeDropdownOpen(
												!isRecipientTypeDropdownOpen
											)
										}
										onSelect={handleRecipientTypeChange}
										options={recipientTypeOptions}
										value={recipientType}
										placeholder="Select recipient type"
										buttonClassName="text-sm"
									/>
								</div>

								{/* Recipient Selection */}
								{recipientType !== "custom" && (
									<div className="mb-3">
										<AnimatedDropdown
											isOpen={isRecipientDropdownOpen}
											onToggle={() =>
												setIsRecipientDropdownOpen(!isRecipientDropdownOpen)
											}
											onSelect={handleRecipientSelect}
											options={getRecipientOptions()}
											value={selectedRecipient}
											placeholder={
												recipientType === "user"
													? "Select user..."
													: "Select customer..."
											}
											buttonClassName="text-sm"
										/>
									</div>
								)}

								{/* Custom Email Input */}
								{recipientType === "custom" && (
									<div className="space-y-3 mb-3">
										<div>
											<label className="block text-xs font-medium text-zinc-700 mb-1.5">
												Email *
											</label>
											<input
												type="email"
												value={customEmail}
												onChange={(e) => setCustomEmail(e.target.value)}
												className="w-full px-3 py-1.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:outline-none"
												placeholder="recipient@example.com"
											/>
										</div>
										<div>
											<label className="block text-xs font-medium text-zinc-700 mb-1.5">
												Name (Optional)
											</label>
											<input
												type="text"
												value={customName}
												onChange={(e) => setCustomName(e.target.value)}
												className="w-full px-3 py-1.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-500 focus:outline-none"
												placeholder="Recipient name"
											/>
										</div>
									</div>
								)}

								{/* Send Button */}
								<motion.button
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									onClick={handleSendEmail}
									disabled={isSendingEmail}
									className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Send className="w-4 h-4" />
									{isSendingEmail ? "Sending..." : "Send Email"}
								</motion.button>
							</div>
						</div>
					</div>
				</AnimatePresence>
			</main>
		</div>
	);
};

export default EmailEditorPage;
