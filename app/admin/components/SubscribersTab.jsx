import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
	Trash2,
	Plus,
	X,
	Save,
	Search,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
} from "lucide-react";
import {
	getAllSubscribers,
	deleteSubscriber,
	addSubscriber,
} from "../../../lib/api/subscribers";
import { getAllEmails } from "../../../lib/api/emails";
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
	getAllowedActions,
} from "../../../lib/config/roles-config";
import { getCachedUserRole, getUserRole } from "../../../lib/utils/getUserRole";
import { getCurrentUserEmail } from "../../../lib/utils/getCurrentUserEmail";
import ConfirmationModal from "../../../lib/ui/ConfirmationModal";
import ExportDropdown from "../../../lib/ui/ExportDropdown";
import { toast } from "react-toastify";

const SubscribersTab = ({ queryClient }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortField, setSortField] = useState(null); // 'email', 'name', 'status', 'subscribedAt'
	const [sortDirection, setSortDirection] = useState("asc"); // 'asc' or 'desc'
	const [showAddModal, setShowAddModal] = useState(false);
	const [subscriberForm, setSubscriberForm] = useState({
		email: "",
		name: "",
	});
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [confirmAction, setConfirmAction] = useState(null);

	// Fetch user role with React Query
	const fetchUserRole = async () => {
		try {
			// Get current user email (from Firebase Auth or localStorage fallback)
			const userEmail = await getCurrentUserEmail();

			console.log("SubscribersTab: Current user email:", userEmail);

			if (userEmail) {
				// Fetch role from Firestore teams collection using email
				const role = await getUserRole(userEmail, false);
				console.log(
					"SubscribersTab: Fetched role from teams collection:",
					role
				);
				return role;
			} else {
				console.warn("SubscribersTab: No user email found, using cached role");
				// Fallback to cached role
				return getCachedUserRole();
			}
		} catch (error) {
			console.error("Error fetching user role:", error);
			// Fallback to cached role
			return getCachedUserRole();
		}
	};

	const { data: userRole = "viewer" } = useQuery({
		queryKey: ["userRole"],
		queryFn: fetchUserRole,
		staleTime: 5 * 60 * 1000, // 5 minutes
		cacheTime: 10 * 60 * 1000, // 10 minutes
	});

	// Get allowed actions for subscribers
	const allowedActions = getAllowedActions(userRole, "subscribers");

	// Fetch subscribers with React Query
	const {
		data: subscribers = [],
		isLoading: isLoadingSubscribers,
		error: subscribersError,
	} = useQuery({
		queryKey: ["subscribers"],
		queryFn: () => getAllSubscribers(),
	});

	// Fetch emails with React Query
	const { data: emails = [], isLoading: isLoadingEmails } = useQuery({
		queryKey: ["emails"],
		queryFn: () => getAllEmails(),
	});

	const filteredSubscribers = subscribers.filter((subscriber) => {
		const searchLower = searchQuery.toLowerCase();
		return (
			subscriber.email?.toLowerCase().includes(searchLower) ||
			subscriber.name?.toLowerCase().includes(searchLower)
		);
	});

	// Sort subscribers
	const sortedSubscribers = [...filteredSubscribers].sort((a, b) => {
		if (!sortField) return 0;

		// Handle date comparison separately
		if (sortField === "subscribedAt") {
			const dateA = a.subscribedAt?.toDate
				? a.subscribedAt.toDate()
				: new Date(a.subscribedAt || 0);
			const dateB = b.subscribedAt?.toDate
				? b.subscribedAt.toDate()
				: new Date(b.subscribedAt || 0);
			return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
		}

		// Handle string comparison for other fields
		let aValue, bValue;

		switch (sortField) {
			case "email":
				aValue = (a.email || "").toLowerCase();
				bValue = (b.email || "").toLowerCase();
				break;
			case "name":
				aValue = (a.name || "").toLowerCase();
				bValue = (b.name || "").toLowerCase();
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

	// Add subscriber mutation
	const addSubscriberMutation = useMutation({
		mutationFn: addSubscriber,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["subscribers"] });
			handleCloseModal();
		},
		onError: (error) => {
			console.error("Error adding subscriber:", error);
			toast.error(
				error.message || "Failed to add subscriber. Please try again."
			);
		},
	});

	// Delete subscriber mutation
	const deleteSubscriberMutation = useMutation({
		mutationFn: deleteSubscriber,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["subscribers"] });
		},
		onError: (error) => {
			console.error("Error deleting subscriber:", error);
			toast.error("Failed to delete subscriber. Please try again.");
		},
	});

	// Handle form change
	const handleFormChange = (e) => {
		const { name, value } = e.target;
		setSubscriberForm((prev) => ({ ...prev, [name]: value }));
	};

	// Handle add subscriber
	const handleAddSubscriber = () => {
		if (!subscriberForm.email) {
			toast.warning("Email is required");
			return;
		}

		addSubscriberMutation.mutate(subscriberForm);
	};

	// Close modal
	const handleCloseModal = () => {
		setShowAddModal(false);
		setSubscriberForm({ email: "", name: "" });
	};

	// Delete subscriber
	const handleDeleteSubscriber = async (id) => {
		setConfirmAction(() => () => deleteSubscriberMutation.mutate(id));
		setShowConfirmModal(true);
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

	const activeSubscribers = subscribers.filter(
		(s) => s.status === "active"
	).length;

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center mb-4 border-b border-zinc-200 px-4 pb-2">
				<div>
					<h2 className="text-lg text-zinc-900">
						Subscribers ({activeSubscribers} active)
					</h2>
					<p className="text-sm text-zinc-600 mt-1">
						Manage your subscribers and email list
					</p>
				</div>
				<div className="flex items-center gap-2">
					<ExportDropdown dataType="subscribers" data={sortedSubscribers} />
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => setShowAddModal(true)}
						className="flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors text-sm"
					>
						<Plus className="w-3.5 h-3.5" />
						Add Subscriber
					</motion.button>
				</div>
			</div>

			{/* Search */}
			<div className="relative mx-4">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
				<input
					type="text"
					placeholder="Search subscribers by email or name..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
				/>
			</div>

			<div className="overflow-x-auto px-4">
				{isLoadingSubscribers ? (
					<TableSkeleton rows={5} columns={5} />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead
									sortable
									onClick={() => handleSort("email")}
									className="min-w-[200px]"
								>
									<div className="flex items-center gap-2">
										Email
										{getSortIcon("email")}
									</div>
								</TableHead>
								<TableHead
									sortable
									onClick={() => handleSort("name")}
								>
									<div className="flex items-center gap-2">
										Name
										{getSortIcon("name")}
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
									onClick={() => handleSort("subscribedAt")}
								>
									<div className="flex items-center gap-2">
										Subscribed
										{getSortIcon("subscribedAt")}
									</div>
								</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{subscribersError ? (
								<TableEmpty
									colSpan={5}
									message="Error loading subscribers. Please try again."
								/>
							) : sortedSubscribers.length === 0 ? (
								<TableEmpty
									colSpan={5}
									message={
										searchQuery
											? "No subscribers found matching your search."
											: "No subscribers found."
									}
								/>
							) : (
								sortedSubscribers.map((subscriber) => (
									<TableRow key={subscriber.id}>
										<TableCell>
											<div className="font-medium text-zinc-900">
												{subscriber.email}
											</div>
										</TableCell>
										<TableCell className="text-zinc-600">
											{subscriber.name}
										</TableCell>
										<TableCell>
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													subscriber.status === "active"
														? "bg-green-100 text-green-800"
														: "bg-red-100 text-red-800"
												}`}
											>
												{subscriber.status}
											</span>
										</TableCell>
										<TableCell className="text-zinc-600">
											{formatDate(subscriber.subscribedAt)}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<motion.button
													whileHover={{ scale: 1.05 }}
													whileTap={{ scale: 0.95 }}
													onClick={() => handleDeleteSubscriber(subscriber.id)}
													className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
													title="Delete subscriber"
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

			{/* Add Subscriber Modal */}
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
										Add Subscriber
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
									<label className="block text-sm font-medium text-zinc-700 mb-1.5">
										Email *
									</label>
									<input
										type="email"
										name="email"
										value={subscriberForm.email}
										onChange={handleFormChange}
										className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-zinc-900"
										placeholder="subscriber@example.com"
										required
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-1.5">
										Name (Optional)
									</label>
									<input
										type="text"
										name="name"
										value={subscriberForm.name}
										onChange={handleFormChange}
										className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-zinc-900"
										placeholder="Subscriber name"
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
									onClick={handleAddSubscriber}
									disabled={addSubscriberMutation.isPending}
									className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Save className="w-4 h-4" />
									{addSubscriberMutation.isPending
										? "Adding..."
										: "Add Subscriber"}
								</motion.button>
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
				}}
				title="Delete Subscriber"
				message="Are you sure you want to delete this subscriber? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				variant="danger"
			/>
		</div>
	);
};

export default SubscribersTab;
