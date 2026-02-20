import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	DollarSign,
	Search,
	Calendar,
	CheckCircle2,
	XCircle,
	Clock,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Trash2,
	FileText,
} from "lucide-react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../lib/config/firebase";
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
import ConfirmationModal from "../../../lib/ui/ConfirmationModal";
import InvoiceModal from "../../../lib/ui/InvoiceModal";
import ExportDropdown from "../../../lib/ui/ExportDropdown";
import { deletePayment } from "../../../lib/api/payments";
import { toast } from "react-toastify";

const PAYMENTS_COLLECTION = "payments";

const getAllPayments = async () => {
	try {
		// Try to get payments ordered by createdAt
		let q = query(
			collection(db, PAYMENTS_COLLECTION),
			orderBy("createdAt", "desc")
		);

		let querySnapshot;
		let orderByFailed = false;
		try {
			querySnapshot = await getDocs(q);
		} catch (orderError) {
			// If orderBy fails (e.g., missing index or createdAt field), get all without ordering
			console.warn(
				"Error ordering by createdAt, fetching all payments:",
				orderError
			);
			orderByFailed = true;
			q = query(collection(db, PAYMENTS_COLLECTION));
			querySnapshot = await getDocs(q);
		}

		const payments = [];
		querySnapshot.forEach((doc) => {
			const data = doc.data();
			payments.push({
				id: doc.id,
				...data,
			});
		});

		// Sort manually if orderBy failed or if some payments don't have createdAt
		if (orderByFailed || payments.some((p) => !p.createdAt)) {
			payments.sort((a, b) => {
				// Handle missing createdAt - put them at the end
				if (!a.createdAt && !b.createdAt) return 0;
				if (!a.createdAt) return 1;
				if (!b.createdAt) return -1;

				// Normalize dates
				let dateA, dateB;
				try {
					dateA = a.createdAt?.toDate
						? a.createdAt.toDate()
						: new Date(a.createdAt);
					dateB = b.createdAt?.toDate
						? b.createdAt.toDate()
						: new Date(b.createdAt);

					// Validate dates
					if (isNaN(dateA.getTime())) dateA = new Date(0);
					if (isNaN(dateB.getTime())) dateB = new Date(0);
				} catch (error) {
					console.warn("Error parsing date for payment:", a.id || b.id, error);
					return 0;
				}

				return dateB - dateA; // Descending order
			});
		}

		return payments;
	} catch (error) {
		console.error("Error getting payments:", error);
		throw error;
	}
};

const PaymentsTab = ({ queryClient }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all"); // all, succeeded, failed, pending
	const [isStatusFilterDropdownOpen, setIsStatusFilterDropdownOpen] =
		useState(false);
	const [sortField, setSortField] = useState(null); // 'paymentId', 'customerName', 'amount', 'status', 'createdAt', 'planName'
	const [sortDirection, setSortDirection] = useState("asc"); // 'asc' or 'desc'
	const [selectedPayment, setSelectedPayment] = useState(null);
	const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [paymentToDelete, setPaymentToDelete] = useState(null);

	const {
		data: payments = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["payments"],
		queryFn: () => getAllPayments(),
	});

	const filteredPayments = payments.filter((payment) => {
		const matchesSearch =
			payment.customerEmail
				?.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			payment.paymentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			payment.customerId?.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesStatus =
			statusFilter === "all" || payment.status === statusFilter;

		return matchesSearch && matchesStatus;
	});

	// Sort payments
	const sortedPayments = [...filteredPayments].sort((a, b) => {
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

		// Handle numeric comparison for amount
		if (sortField === "amount") {
			const amountA = a.amount || 0;
			const amountB = b.amount || 0;
			return sortDirection === "asc" ? amountA - amountB : amountB - amountA;
		}

		// Handle string comparison for other fields
		let aValue, bValue;

		switch (sortField) {
			case "paymentId":
				aValue = (a.paymentId || a.id || "").toLowerCase();
				bValue = (b.paymentId || b.id || "").toLowerCase();
				break;
			case "customerName":
				aValue = (a.customerName || "").toLowerCase();
				bValue = (b.customerName || "").toLowerCase();
				break;
			case "status":
				aValue = (a.status || "").toLowerCase();
				bValue = (b.status || "").toLowerCase();
				break;
			case "planName":
				aValue = (a.planName || "").toLowerCase();
				bValue = (b.planName || "").toLowerCase();
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

		let d;
		try {
			// Handle Firestore Timestamp
			if (date?.toDate && typeof date.toDate === "function") {
				d = date.toDate();
			}
			// Handle Date object
			else if (date instanceof Date) {
				d = date;
			}
			// Handle ISO string or timestamp
			else {
				d = new Date(date);
			}

			// Validate date
			if (isNaN(d.getTime())) {
				return "";
			}

			return d.toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch (error) {
			console.error("Error formatting date:", error, date);
			return "";
		}
	};

	const formatCurrency = (amount, currency = "usd") => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency.toUpperCase(),
		}).format(amount / 100);
	};

	const getStatusBadge = (status) => {
		switch (status) {
			case "succeeded":
				return (
					<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
						<CheckCircle2 className="w-3 h-3" />
						Success
					</span>
				);
			case "failed":
				return (
					<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
						<XCircle className="w-3 h-3" />
						Failed
					</span>
				);
			case "pending":
				return (
					<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
						<Clock className="w-3 h-3" />
						Pending
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800">
						{status || "Unknown"}
					</span>
				);
		}
	};

	const stats = {
		total: payments.length,
		succeeded: payments.filter((p) => p.status === "succeeded").length,
		failed: payments.filter((p) => p.status === "failed").length,
		pending: payments.filter((p) => p.status === "pending").length,
		totalRevenue: payments
			.filter((p) => p.status === "succeeded")
			.reduce((sum, p) => sum + (p.amount || 0), 0),
	};

	const handleDeleteClick = (payment) => {
		setPaymentToDelete(payment);
		setIsDeleteModalOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!paymentToDelete) return;

		try {
			await deletePayment(paymentToDelete.id);
			toast.success("Payment deleted successfully");
			queryClient.invalidateQueries({ queryKey: ["payments"] });
		} catch (error) {
			console.error("Error deleting payment:", error);
			toast.error("Failed to delete payment. Please try again.");
		} finally {
			setPaymentToDelete(null);
			setIsDeleteModalOpen(false);
		}
	};

	const handleInvoiceClick = (payment) => {
		setSelectedPayment(payment);
		setIsInvoiceModalOpen(true);
	};

	// Status filter options
	const statusFilterOptions = [
		{ value: "all", label: "All Status" },
		{
			value: "succeeded",
			label: "Succeeded",
			color: "bg-green-100 text-green-800",
		},
		{ value: "failed", label: "Failed", color: "bg-red-100 text-red-800" },
		{
			value: "pending",
			label: "Pending",
			color: "bg-yellow-100 text-yellow-800",
		},
	];

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-zinc-200 px-4 pb-2">
				<div>
					<h1 className="text-lg text-zinc-900">Payments</h1>
					<p className="text-sm text-zinc-600 mt-1">
						Track all payment transactions and revenue
					</p>
				</div>
				<ExportDropdown dataType="payments" data={sortedPayments} />
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4">
			<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="p-4 rounded-xl border border-zinc-200 bg-white"
				>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-xs font-medium text-zinc-600 mb-1">
								Total Payments
							</p>
							<p className="text-2xl font-bold text-zinc-900">{stats.total}</p>
						</div>
						<DollarSign className="w-8 h-8 text-zinc-400" />
					</div>
				</motion.div>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="p-4 rounded-xl border border-green-200 bg-green-50"
				>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-xs font-medium text-green-600 mb-1">
								Successful
							</p>
							<p className="text-2xl font-bold text-green-900">
								{stats.succeeded}
							</p>
						</div>
						<CheckCircle2 className="w-8 h-8 text-green-400" />
					</div>
				</motion.div>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="p-4 rounded-xl border border-red-200 bg-red-50"
				>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-xs font-medium text-red-600 mb-1">Failed</p>
							<p className="text-2xl font-bold text-red-900">{stats.failed}</p>
						</div>
						<XCircle className="w-8 h-8 text-red-400" />
					</div>
				</motion.div>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="p-4 rounded-xl border border-yellow-200 bg-yellow-50"
				>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-xs font-medium text-yellow-600 mb-1">
								Total Revenue
							</p>
							<p className="text-2xl font-bold text-yellow-900">
								{formatCurrency(stats.totalRevenue)}
							</p>
						</div>
						<DollarSign className="w-8 h-8 text-yellow-400" />
					</div>
				</motion.div>
			</div>

			{/* Filters */}
			<div className="flex items-center gap-4 px-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
					<input
						type="text"
						placeholder="Search payments by email, payment ID, or customer ID..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
					/>
				</div>
				<div className="w-48">
					<AnimatedDropdown
						isOpen={isStatusFilterDropdownOpen}
						onToggle={() =>
							setIsStatusFilterDropdownOpen(!isStatusFilterDropdownOpen)
						}
						onSelect={(value) => {
							setStatusFilter(value);
							setIsStatusFilterDropdownOpen(false);
						}}
						options={statusFilterOptions}
						value={statusFilter}
						placeholder="All Status"
						buttonClassName="text-sm"
					/>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto px-4">
				{isLoading ? (
					<TableSkeleton rows={5} columns={8} />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead sortable onClick={() => handleSort("paymentId")}>
									<div className="flex items-center gap-2">
										Payment ID
										{getSortIcon("paymentId")}
									</div>
								</TableHead>
								<TableHead
									sortable
									onClick={() => handleSort("customerName")}
									className="min-w-[200px]"
								>
									<div className="flex items-center gap-2">
										Customer
										{getSortIcon("customerName")}
									</div>
								</TableHead>
								<TableHead sortable onClick={() => handleSort("amount")}>
									<div className="flex items-center gap-2">
										Amount
										{getSortIcon("amount")}
									</div>
								</TableHead>
								<TableHead sortable onClick={() => handleSort("status")}>
									<div className="flex items-center gap-2">
										Status
										{getSortIcon("status")}
									</div>
								</TableHead>
								<TableHead sortable onClick={() => handleSort("createdAt")}>
									<div className="flex items-center gap-2">
										Date
										{getSortIcon("createdAt")}
									</div>
								</TableHead>
								<TableHead sortable onClick={() => handleSort("planName")}>
									<div className="flex items-center gap-2">
										Plan
										{getSortIcon("planName")}
									</div>
								</TableHead>
								<TableHead>Invoice</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{error ? (
								<TableEmpty
									colSpan={8}
									message="Error loading payments. Please try again."
								/>
							) : sortedPayments.length === 0 ? (
								<TableEmpty
									colSpan={8}
									message={
										searchQuery || statusFilter !== "all"
											? "No payments found matching your filters."
											: "No payments yet. Payments will appear here after customers subscribe."
									}
								/>
							) : (
								sortedPayments.map((payment) => (
									<TableRow key={payment.id}>
										<TableCell>
											<code className="text-xs text-zinc-600 font-mono">
												{payment.paymentId || payment.id}
											</code>
										</TableCell>
										<TableCell>
											<div>
												<div className="font-medium text-sm text-zinc-900">
													{payment.customerName || ""}
												</div>
												<div className="text-xs text-zinc-600">
													{payment.customerEmail || ""}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<span className="font-semibold text-sm text-zinc-900">
												{payment.amount
													? formatCurrency(payment.amount, payment.currency)
													: "$0"}
											</span>
										</TableCell>
										<TableCell>{getStatusBadge(payment.status)}</TableCell>
										<TableCell>
											<div className="text-xs text-zinc-600 flex items-center gap-1">
												<Calendar className="w-3 h-3" />
												{formatDate(payment.createdAt)}
											</div>
										</TableCell>
										<TableCell>
											<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-medium bg-zinc-900 text-white">
												{payment.planName || "Pro"}
											</span>
										</TableCell>
										<TableCell>
											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={() => handleInvoiceClick(payment)}
												className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
												title="View Invoice"
											>
												<FileText className="w-4 h-4" />
											</motion.button>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<motion.button
													whileHover={{ scale: 1.1 }}
													whileTap={{ scale: 0.9 }}
													onClick={() => handleDeleteClick(payment)}
													className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
													title="Delete Payment"
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

			{/* Delete Confirmation Modal */}
			<ConfirmationModal
				isOpen={isDeleteModalOpen}
				onClose={() => {
					setIsDeleteModalOpen(false);
					setPaymentToDelete(null);
				}}
				onConfirm={handleDeleteConfirm}
				title="Delete Payment"
				message={
					paymentToDelete
						? `Are you sure you want to delete payment ${
								paymentToDelete.paymentId || paymentToDelete.id
						  }? This action cannot be undone.`
						: "Are you sure you want to delete this payment?"
				}
				confirmText="Delete"
				cancelText="Cancel"
				variant="danger"
			/>

			{/* Invoice Modal */}
			<InvoiceModal
				isOpen={isInvoiceModalOpen}
				onClose={() => {
					setIsInvoiceModalOpen(false);
					setSelectedPayment(null);
				}}
				payment={selectedPayment}
			/>
		</div>
	);
};

export default PaymentsTab;
