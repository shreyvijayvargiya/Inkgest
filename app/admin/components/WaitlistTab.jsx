import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
	Search,
	Calendar,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Trash2,
	Send,
	Mail,
	Plus,
	X,
	Save,
} from "lucide-react";
import {
	getAllWaitlist,
	deleteWaitlistEntry,
	addWaitlistEntry,
} from "../../../lib/api/waitlist";
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
import ConfirmationModal from "../../../lib/ui/ConfirmationModal";
import ExportDropdown from "../../../lib/ui/ExportDropdown";
import { toast } from "sonner";

const WaitlistTab = ({ queryClient }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortField, setSortField] = useState(null); // 'name', 'email', 'createdAt'
	const [sortDirection, setSortDirection] = useState("asc"); // 'asc' or 'desc'
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [entryToDelete, setEntryToDelete] = useState(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [newEntry, setNewEntry] = useState({
		name: "",
		email: "",
	});
	const [showSendMessageModal, setShowSendMessageModal] = useState(false);
	const [selectedEntry, setSelectedEntry] = useState(null);
	const [messageForm, setMessageForm] = useState({
		subject: "",
		content: "",
	});
	const [isSendingMessage, setIsSendingMessage] = useState(false);

	const {
		data: waitlist = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["waitlist"],
		queryFn: () => getAllWaitlist(),
	});

	const filteredWaitlist = waitlist.filter((entry) => {
		const searchLower = searchQuery.toLowerCase();
		return (
			entry.name?.toLowerCase().includes(searchLower) ||
			entry.email?.toLowerCase().includes(searchLower)
		);
	});

	// Sort waitlist
	const sortedWaitlist = [...filteredWaitlist].sort((a, b) => {
		if (!sortField) return 0;

		// Handle date comparison
		if (sortField === "createdAt") {
			const dateA = a.createdAt?.toDate
				? a.createdAt.toDate()
				: new Date(a.createdAt || 0);
			const dateB = b.createdAt?.toDate
				? b.createdAt.toDate()
				: new Date(b.createdAt || 0);
			return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
		}

		// Handle string comparison for other fields
		let aValue, bValue;

		switch (sortField) {
			case "name":
				aValue = (a.name || "").toLowerCase();
				bValue = (b.name || "").toLowerCase();
				break;
			case "email":
				aValue = (a.email || "").toLowerCase();
				bValue = (b.email || "").toLowerCase();
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

	const formatDate = (date) => {
		if (!date) return "";
		const d = date?.toDate ? date.toDate() : new Date(date);
		if (isNaN(d.getTime())) return "";
		return d.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const handleDeleteClick = (entry) => {
		setEntryToDelete(entry);
		setIsDeleteModalOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!entryToDelete) return;

		try {
			await deleteWaitlistEntry(entryToDelete.id);
			toast.success("Waitlist entry removed successfully");
			queryClient.invalidateQueries({ queryKey: ["waitlist"] });
		} catch (error) {
			console.error("Error deleting waitlist entry:", error);
			toast.error("Failed to remove waitlist entry. Please try again.");
		} finally {
			setEntryToDelete(null);
			setIsDeleteModalOpen(false);
		}
	};

	const handleSendMessageClick = (entry) => {
		if (!entry.email) {
			toast.error("Email address is missing");
			return;
		}
		setSelectedEntry(entry);
		setMessageForm({
			subject: "",
			content: "",
		});
		setShowSendMessageModal(true);
	};

	const handleCloseSendMessageModal = () => {
		setShowSendMessageModal(false);
		setSelectedEntry(null);
		setMessageForm({
			subject: "",
			content: "",
		});
		setIsSendingMessage(false);
	};

	const handleSendMessage = async () => {
		if (!messageForm.subject.trim()) {
			toast.error("Please enter a subject/title");
			return;
		}

		if (!messageForm.content.trim()) {
			toast.error("Please enter a message");
			return;
		}

		if (!selectedEntry?.email) {
			toast.error("Recipient email is missing");
			return;
		}

		setIsSendingMessage(true);
		try {
			// TODO: Implement email sending API
			const response = await fetch("/api/emails/send-single", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: selectedEntry.email,
					name: selectedEntry.name || undefined,
					subject: messageForm.subject.trim(),
					content: messageForm.content.trim(),
				}),
			});

			const data = await response.json();

			if (response.ok) {
				toast.success("Message sent successfully!");
				handleCloseSendMessageModal();
			} else {
				toast.error(data.error || "Failed to send message");
			}
		} catch (error) {
			console.error("Error sending message:", error);
			toast.error("Failed to send message. Please try again.");
		} finally {
			setIsSendingMessage(false);
		}
	};

	const addWaitlistMutation = useMutation({
		mutationFn: addWaitlistEntry,
		onSuccess: () => {
			toast.success("Waitlist entry added successfully");
			queryClient.invalidateQueries({ queryKey: ["waitlist"] });
			handleCloseModal();
		},
		onError: (error) => {
			console.error("Error adding waitlist entry:", error);
			toast.error("Failed to add waitlist entry. Please try again.");
		},
	});

	const handleAddWaitlistEntry = () => {
		if (!newEntry.name.trim() || !newEntry.email.trim()) {
			toast.error("Please fill in both name and email");
			return;
		}

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(newEntry.email)) {
			toast.error("Please enter a valid email address");
			return;
		}

		addWaitlistMutation.mutate({
			name: newEntry.name.trim(),
			email: newEntry.email.trim().toLowerCase(),
		});
	};

	const handleCloseModal = () => {
		setShowAddModal(false);
		setNewEntry({
			name: "",
			email: "",
		});
	};

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-zinc-200 px-4 pb-2">
				<div>
					<h1 className="text-lg text-zinc-900">Waitlist</h1>
					<p className="text-sm text-zinc-600 mt-1">
						Manage your waitlist entries
					</p>
				</div>
				<div className="flex items-center gap-2">
					<ExportDropdown dataType="waitlist" data={sortedWaitlist} />
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => setShowAddModal(true)}
						className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl font-medium transition-colors"
					>
						<Plus className="w-4 h-4" />
						Add New Member
					</motion.button>
				</div>
			</div>

			{/* Search */}
			<div className="relative mx-4">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
				<input
					type="text"
					placeholder="Search waitlist by name or email..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
				/>
			</div>

			{/* Table */}
			<div className="overflow-x-auto px-4">
				{isLoading ? (
					<TableSkeleton rows={5} columns={4} />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead sortable onClick={() => handleSort("name")}>
									<div className="flex items-center gap-2">
										Name
										{getSortIcon("name")}
									</div>
								</TableHead>
								<TableHead sortable onClick={() => handleSort("email")}>
									<div className="flex items-center gap-2">
										Email
										{getSortIcon("email")}
									</div>
								</TableHead>
								<TableHead sortable onClick={() => handleSort("createdAt")}>
									<div className="flex items-center gap-2">
										Joined
										{getSortIcon("createdAt")}
									</div>
								</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{error ? (
								<TableEmpty
									colSpan={4}
									message="Error loading waitlist. Please try again."
								/>
							) : sortedWaitlist.length === 0 ? (
								<TableEmpty
									colSpan={4}
									message={
										searchQuery
											? "No waitlist entries found matching your search."
											: "No waitlist entries yet."
									}
								/>
							) : (
								sortedWaitlist.map((entry) => (
									<TableRow key={entry.id}>
										<TableCell>
											<div className="font-medium text-sm text-zinc-900">
												{entry.name || ""}
											</div>
										</TableCell>
										<TableCell>
											<div className="text-sm text-zinc-600 flex items-center gap-1">
												<Mail className="w-3 h-3" />
												{entry.email || ""}
											</div>
										</TableCell>
										<TableCell>
											<div className="text-xs text-zinc-600 flex items-center gap-1">
												<Calendar className="w-3 h-3" />
												{formatDate(entry.createdAt)}
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<motion.button
													whileHover={{ scale: 1.1 }}
													whileTap={{ scale: 0.9 }}
													onClick={() => handleSendMessageClick(entry)}
													className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors"
													title="Send Message"
												>
													<Send className="w-4 h-4" />
												</motion.button>
												<motion.button
													whileHover={{ scale: 1.1 }}
													whileTap={{ scale: 0.9 }}
													onClick={() => handleDeleteClick(entry)}
													className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
													title="Remove"
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

			{/* Add Waitlist Entry Modal */}
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
							className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
						>
							{/* Modal Header */}
							<div className="flex items-center justify-between p-4 border-b border-zinc-200">
								<div className="flex items-center gap-3">
									<div className="p-2 rounded-full bg-zinc-100 text-zinc-600">
										<Plus className="w-5 h-5" />
									</div>
									<h3 className="text-lg text-zinc-900">
										Add Waitlist Member
									</h3>
								</div>
								<button
									onClick={handleCloseModal}
									className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							{/* Modal Body */}
							<div className="p-6 space-y-4">
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Name *
									</label>
									<input
										type="text"
										value={newEntry.name}
										onChange={(e) =>
											setNewEntry({ ...newEntry, name: e.target.value })
										}
										className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
										placeholder="Enter name"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Email *
									</label>
									<input
										type="email"
										value={newEntry.email}
										onChange={(e) =>
											setNewEntry({ ...newEntry, email: e.target.value })
										}
										className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
										placeholder="Enter email address"
									/>
								</div>
							</div>

							{/* Modal Footer */}
							<div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-200 bg-zinc-50">
								<motion.button
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									onClick={handleCloseModal}
									className="px-4 py-2 text-sm text-zinc-700 bg-white hover:bg-zinc-100 rounded-xl font-medium transition-colors border border-zinc-300"
								>
									Cancel
								</motion.button>
								<motion.button
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									onClick={handleAddWaitlistEntry}
									disabled={addWaitlistMutation.isPending}
									className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Save className="w-4 h-4" />
									{addWaitlistMutation.isPending ? "Adding..." : "Add Member"}
								</motion.button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Send Message Modal */}
			<AnimatePresence>
				{showSendMessageModal && selectedEntry && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
						onClick={handleCloseSendMessageModal}
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
						>
							{/* Modal Header */}
							<div className="flex items-center justify-between p-4 border-b border-zinc-200">
								<div className="flex items-center gap-3">
									<div className="p-2 rounded-full bg-green-100 text-green-600">
										<Send className="w-5 h-5" />
									</div>
									<div>
										<h3 className="text-lg text-zinc-900">
											Send Message
										</h3>
										<p className="text-xs text-zinc-600">
											To: {selectedEntry.name || "N/A"} ({selectedEntry.email})
										</p>
									</div>
								</div>
								<button
									onClick={handleCloseSendMessageModal}
									className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							{/* Modal Body */}
							<div className="flex-1 overflow-y-auto p-6 space-y-4">
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Subject / Title *
									</label>
									<input
										type="text"
										value={messageForm.subject}
										onChange={(e) =>
											setMessageForm({
												...messageForm,
												subject: e.target.value,
											})
										}
										className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
										placeholder="Enter message subject"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Message *
									</label>
									<textarea
										value={messageForm.content}
										onChange={(e) =>
											setMessageForm({
												...messageForm,
												content: e.target.value,
											})
										}
										rows={8}
										className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm resize-none"
										placeholder="Type your message here..."
									/>
								</div>
							</div>

							{/* Modal Footer */}
							<div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-200 bg-zinc-50">
								<motion.button
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									onClick={handleCloseSendMessageModal}
									disabled={isSendingMessage}
									className="px-4 py-2 text-sm text-zinc-700 bg-white hover:bg-zinc-100 rounded-xl font-medium transition-colors border border-zinc-300 disabled:opacity-50"
								>
									Cancel
								</motion.button>
								<motion.button
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									onClick={handleSendMessage}
									disabled={isSendingMessage}
									className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Send className="w-4 h-4" />
									{isSendingMessage ? "Sending..." : "Send Message"}
								</motion.button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Delete Confirmation Modal */}
			<ConfirmationModal
				isOpen={isDeleteModalOpen}
				onClose={() => {
					setIsDeleteModalOpen(false);
					setEntryToDelete(null);
				}}
				onConfirm={handleDeleteConfirm}
				title="Remove Waitlist Entry"
				message={
					entryToDelete
						? `Are you sure you want to remove ${entryToDelete.name || entryToDelete.email
						} from the waitlist? This action cannot be undone.`
						: "Are you sure you want to remove this waitlist entry?"
				}
				confirmText="Remove"
				cancelText="Cancel"
				variant="danger"
			/>
		</div>
	);
};

export default WaitlistTab;
