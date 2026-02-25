import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
	Mail,
	Search,
	Calendar,
	Trash2,
	Eye,
	EyeOff,
	MessageSquare,
	Send,
	X,
} from "lucide-react";
import {
	getAllMessages,
	markMessageAsRead,
	deleteMessage,
} from "../../../lib/api/messages";
import { CheckCircle2 } from "lucide-react";
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
import AnimatedDropdown from "../../../lib/ui/AnimatedDropdown";
import ExportDropdown from "../../../lib/ui/ExportDropdown";
import { toast } from "sonner";

const MessagesTab = ({ queryClient }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [readFilter, setReadFilter] = useState("all"); // all, read, unread
	const [repliedFilter, setRepliedFilter] = useState("all"); // all, replied, unreplied
	const [isReadFilterDropdownOpen, setIsReadFilterDropdownOpen] = useState(false);
	const [isRepliedFilterDropdownOpen, setIsRepliedFilterDropdownOpen] = useState(false);
	const [replyModalOpen, setReplyModalOpen] = useState(false);
	const [selectedMessage, setSelectedMessage] = useState(null);
	const [replyForm, setReplyForm] = useState({
		subject: "",
		content: "",
	});
	const [isSendingReply, setIsSendingReply] = useState(false);

	const {
		data: messages = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["messages"],
		queryFn: () => getAllMessages(),
	});

	const markAsReadMutation = useMutation({
		mutationFn: markMessageAsRead,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["messages"] });
			toast.success("Message marked as read");
		},
		onError: () => {
			toast.error("Failed to mark message as read");
		},
	});

	const deleteMessageMutation = useMutation({
		mutationFn: deleteMessage,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["messages"] });
			toast.success("Message deleted");
		},
		onError: () => {
			toast.error("Failed to delete message");
		},
	});

	const handleReplyClick = (message) => {
		setSelectedMessage(message);
		setReplyForm({
			subject: `Re: ${message.subject}`,
			content: "",
		});
		setReplyModalOpen(true);
	};

	const handleSendReply = async (e) => {
		e.preventDefault();
		if (!selectedMessage) return;

		setIsSendingReply(true);
		try {
			const response = await fetch("/api/messages/reply", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					to: selectedMessage.email,
					toName: selectedMessage.name || selectedMessage.email,
					subject: replyForm.subject,
					content: replyForm.content,
					originalMessage: selectedMessage.message,
					messageId: selectedMessage.id,
				}),
			});

			const data = await response.json();

			if (response.ok && data.success) {
				toast.success("Reply sent successfully!");
				setReplyModalOpen(false);
				setSelectedMessage(null);
				setReplyForm({ subject: "", content: "" });
				// Mark message as read after replying
				if (!selectedMessage.read) {
					markAsReadMutation.mutate(selectedMessage.id);
				}
			} else {
				throw new Error(data.error || "Failed to send reply");
			}
		} catch (error) {
			console.error("Error sending reply:", error);
			toast.error(error.message || "Failed to send reply. Please try again.");
		} finally {
			setIsSendingReply(false);
		}
	};

	const filteredMessages = messages.filter((message) => {
		const matchesSearch =
			message.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			message.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			message.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			message.message?.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesRead =
			readFilter === "all" ||
			(readFilter === "read" && message.read) ||
			(readFilter === "unread" && !message.read);

		const matchesReplied =
			repliedFilter === "all" ||
			(repliedFilter === "replied" && message.replied) ||
			(repliedFilter === "unreplied" && !message.replied);

		return matchesSearch && matchesRead && matchesReplied;
	});

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

	const unreadCount = messages.filter((m) => !m.read).length;

	// Read filter options
	const readFilterOptions = [
		{ value: "all", label: "All Messages" },
		{ value: "unread", label: "Unread" },
		{ value: "read", label: "Read" },
	];

	// Replied filter options
	const repliedFilterOptions = [
		{ value: "all", label: "All Replies" },
		{ value: "replied", label: "Replied" },
		{ value: "unreplied", label: "Unreplied" },
	];

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-zinc-200 px-4 pb-2">
				<div>
					<h1 className="text-lg text-zinc-900">Messages</h1>
					<p className="text-sm text-zinc-600 mt-1">
						Manage customer inquiries and support messages
					</p>
				</div>
				<ExportDropdown dataType="messages" data={filteredMessages} />
				{unreadCount > 0 && (
					<div className="px-3 py-1 bg-zinc-900 text-white rounded-xl text-xs font-semibold">
						{unreadCount} Unread
					</div>
				)}
			</div>

			{/* Filters */}
			<div className="flex items-center gap-4 px-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
					<input
						type="text"
						placeholder="Search messages by name, email, subject, or message..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
					/>
				</div>
				<div className="w-48">
					<AnimatedDropdown
						isOpen={isReadFilterDropdownOpen}
						onToggle={() => setIsReadFilterDropdownOpen(!isReadFilterDropdownOpen)}
						onSelect={(value) => {
							setReadFilter(value);
							setIsReadFilterDropdownOpen(false);
						}}
						options={readFilterOptions}
						value={readFilter}
						placeholder="All Messages"
						buttonClassName="text-sm"
					/>
				</div>
				<div className="w-48">
					<AnimatedDropdown
						isOpen={isRepliedFilterDropdownOpen}
						onToggle={() => setIsRepliedFilterDropdownOpen(!isRepliedFilterDropdownOpen)}
						onSelect={(value) => {
							setRepliedFilter(value);
							setIsRepliedFilterDropdownOpen(false);
						}}
						options={repliedFilterOptions}
						value={repliedFilter}
						placeholder="All Replies"
						buttonClassName="text-sm"
					/>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto px-4">
				{isLoading ? (
					<TableSkeleton rows={5} columns={6} />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="min-w-[200px]">From</TableHead>
								<TableHead className="min-w-[200px]">Subject</TableHead>
								<TableHead className="min-w-[300px]">Message</TableHead>
								<TableHead>Date</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{error ? (
								<TableEmpty
									colSpan={6}
									message="Error loading messages. Please try again."
								/>
							) : filteredMessages.length === 0 ? (
								<TableEmpty
									colSpan={6}
									message={
										searchQuery ||
											readFilter !== "all" ||
											repliedFilter !== "all"
											? "No messages found matching your filters."
											: "No messages yet. Messages from the contact form will appear here."
									}
								/>
							) : (
								filteredMessages.map((message) => (
									<TableRow
										key={message.id}
										className={!message.read ? "bg-blue-50/50" : ""}
									>
										<TableCell>
											<div>
												<div className="font-medium text-sm text-zinc-900 flex items-center gap-2">
													{!message.read && (
														<span className="w-2 h-2 bg-blue-600 rounded-full"></span>
													)}
													{message.name || "Anonymous"}
												</div>
												<div className="text-xs text-zinc-600 flex items-center gap-1 mt-1">
													<Mail className="w-3 h-3" />
													{message.email}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="font-medium text-sm text-zinc-900">
												{message.subject}
											</div>
										</TableCell>
										<TableCell>
											<div className="text-xs text-zinc-600 line-clamp-2 max-w-md">
												{message.message}
											</div>
										</TableCell>
										<TableCell>
											<div className="text-xs text-zinc-600 flex items-center gap-1">
												<Calendar className="w-3 h-3" />
												{formatDate(message.createdAt)}
											</div>
										</TableCell>
										<TableCell>
											<div className="flex flex-col gap-1">
												{message.replied ? (
													<div className="flex items-center gap-1.5 text-xs text-green-600">
														<CheckCircle2 className="w-3.5 h-3.5" />
														<span className="font-medium">Replied</span>
													</div>
												) : (
													<div className="flex items-center gap-1.5 text-xs text-zinc-500">
														<span>Not replied</span>
													</div>
												)}
												{message.read ? (
													<div className="text-xs text-zinc-500">Read</div>
												) : (
													<div className="text-xs text-blue-600 font-medium">
														Unread
													</div>
												)}
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<button
													onClick={() => handleReplyClick(message)}
													className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-xl transition-colors"
													title="Reply to message"
												>
													<Send className="w-4 h-4" />
												</button>
												{!message.read && (
													<button
														onClick={() => markAsReadMutation.mutate(message.id)}
														className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
														title="Mark as read"
													>
														<Eye className="w-4 h-4" />
													</button>
												)}
												<button
													onClick={() => {
														if (
															confirm(
																"Are you sure you want to delete this message?"
															)
														) {
															deleteMessageMutation.mutate(message.id);
														}
													}}
													className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-xl transition-colors"
													title="Delete message"
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

			{/* Reply Modal */}
			<AnimatePresence>
				{replyModalOpen && selectedMessage && (
					<>
						{/* Backdrop */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setReplyModalOpen(false)}
							className="fixed inset-0 bg-black bg-opacity-50 z-50"
						/>
						{/* Modal */}
						<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
							<motion.div
								initial={{ opacity: 0, scale: 0.95, y: 20 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95, y: 20 }}
								onClick={(e) => e.stopPropagation()}
								className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
							>
								{/* Header */}
								<div className="flex items-center justify-between p-6 border-b border-zinc-200">
									<div>
										<h2 className="text-xl font-bold text-zinc-900">
											Reply to Message
										</h2>
										<p className="text-sm text-zinc-600 mt-1">
											To: {selectedMessage.name || "Anonymous"} (
											{selectedMessage.email})
										</p>
									</div>
									<button
										onClick={() => setReplyModalOpen(false)}
										className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
									>
										<X className="w-5 h-5" />
									</button>
								</div>

								{/* Original Message Preview */}
								<div className="p-6 bg-zinc-50 border-b border-zinc-200">
									<p className="text-xs font-semibold text-zinc-700 mb-2">
										Original Message:
									</p>
									<div className="text-sm text-zinc-600 bg-white p-4 rounded-xl border border-zinc-200">
										<p className="font-medium text-zinc-900 mb-2">
											{selectedMessage.subject}
										</p>
										<p className="whitespace-pre-wrap">
											{selectedMessage.message}
										</p>
									</div>
								</div>

								{/* Reply Form */}
								<form
									onSubmit={handleSendReply}
									className="flex-1 overflow-y-auto p-6 space-y-4"
								>
									<div>
										<label className="block text-sm font-medium text-zinc-900 mb-1">
											Subject
										</label>
										<input
											type="text"
											value={replyForm.subject}
											onChange={(e) =>
												setReplyForm({
													...replyForm,
													subject: e.target.value,
												})
											}
											required
											className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-zinc-900 mb-1">
											Message
										</label>
										<textarea
											value={replyForm.content}
											onChange={(e) =>
												setReplyForm({
													...replyForm,
													content: e.target.value,
												})
											}
											required
											rows={8}
											placeholder="Type your reply here..."
											className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm resize-none"
										/>
									</div>
									<div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
										<button
											type="button"
											onClick={() => setReplyModalOpen(false)}
											className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
										>
											Cancel
										</button>
										<button
											type="submit"
											disabled={isSendingReply}
											className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50"
										>
											<Send className="w-4 h-4" />
											{isSendingReply ? "Sending..." : "Send Reply"}
										</button>
									</div>
								</form>
							</motion.div>
						</div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
};

export default MessagesTab;
