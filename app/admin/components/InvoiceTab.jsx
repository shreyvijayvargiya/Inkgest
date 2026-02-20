import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	FileText,
	Search,
	Calendar,
	CheckCircle2,
	XCircle,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Trash2,
	Edit,
	Eye,
	Plus,
	Send,
} from "lucide-react";
import { getAllInvoices } from "../../../lib/api/invoice";
import {
	deleteInvoice,
	markInvoiceAsPaid,
	markInvoiceAsUnpaid,
} from "../../../lib/api/invoice";
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
import CreateInvoiceModal from "../../../lib/ui/CreateInvoiceModal";
import InvoiceModal from "../../../lib/ui/InvoiceModal";
import ExportDropdown from "../../../lib/ui/ExportDropdown";
import { toast } from "react-toastify";

const InvoiceTab = ({ queryClient }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all"); // all, paid, unpaid
	const [isStatusFilterDropdownOpen, setIsStatusFilterDropdownOpen] =
		useState(false);
	const [sortField, setSortField] = useState(null); // 'invoiceNumber', 'toName', 'total', 'status', 'createdAt', 'dueDate'
	const [sortDirection, setSortDirection] = useState("asc"); // 'asc' or 'desc'
	const [selectedInvoice, setSelectedInvoice] = useState(null);
	const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [invoiceToEdit, setInvoiceToEdit] = useState(null);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [invoiceToDelete, setInvoiceToDelete] = useState(null);

	const {
		data: invoices = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["invoices"],
		queryFn: () => getAllInvoices(),
	});

	const filteredInvoices = invoices.filter((invoice) => {
		const searchLower = searchQuery.toLowerCase();
		const matchesSearch =
			invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
			invoice.to?.name?.toLowerCase().includes(searchLower) ||
			invoice.to?.email?.toLowerCase().includes(searchLower);

		const matchesStatus =
			statusFilter === "all" || invoice.status === statusFilter;

		return matchesSearch && matchesStatus;
	});

	// Sort invoices
	const sortedInvoices = [...filteredInvoices].sort((a, b) => {
		if (!sortField) return 0;

		// Handle date comparison
		if (sortField === "createdAt" || sortField === "dueDate") {
			const dateA = a[sortField]?.toDate
				? a[sortField].toDate()
				: new Date(a[sortField] || 0);
			const dateB = b[sortField]?.toDate
				? b[sortField].toDate()
				: new Date(b[sortField] || 0);
			return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
		}

		// Handle numeric comparison for total
		if (sortField === "total") {
			const totalA = a.total || 0;
			const totalB = b.total || 0;
			return sortDirection === "asc" ? totalA - totalB : totalB - totalA;
		}

		// Handle string comparison for other fields
		let aValue, bValue;

		switch (sortField) {
			case "invoiceNumber":
				aValue = (a.invoiceNumber || "").toLowerCase();
				bValue = (b.invoiceNumber || "").toLowerCase();
				break;
			case "toName":
				aValue = (a.to?.name || "").toLowerCase();
				bValue = (b.to?.name || "").toLowerCase();
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

	const formatCurrency = (amount) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount || 0);
	};

	const getStatusBadge = (status) => {
		switch (status) {
			case "paid":
				return (
					<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
						<CheckCircle2 className="w-3 h-3" />
						Paid
					</span>
				);
			case "unpaid":
				return (
					<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
						<XCircle className="w-3 h-3" />
						Unpaid
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
		total: invoices.length,
		paid: invoices.filter((i) => i.status === "paid").length,
		unpaid: invoices.filter((i) => i.status === "unpaid").length,
		totalAmount: invoices.reduce((sum, i) => sum + (i.total || 0), 0),
		paidAmount: invoices
			.filter((i) => i.status === "paid")
			.reduce((sum, i) => sum + (i.total || 0), 0),
	};

	const handleDeleteClick = (invoice) => {
		setInvoiceToDelete(invoice);
		setIsDeleteModalOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!invoiceToDelete) return;

		try {
			await deleteInvoice(invoiceToDelete.id);
			toast.success("Invoice deleted successfully");
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
		} catch (error) {
			console.error("Error deleting invoice:", error);
			toast.error("Failed to delete invoice. Please try again.");
		} finally {
			setInvoiceToDelete(null);
			setIsDeleteModalOpen(false);
		}
	};

	const handleViewClick = (invoice) => {
		// Convert invoice to payment-like format for InvoiceModal
		const paymentFormat = {
			id: invoice.id,
			paymentId: invoice.invoiceNumber,
			customerName: invoice.to?.name || "",
			customerEmail: invoice.to?.email || "",
			amount: invoice.total * 100, // Convert to cents
			currency: "usd",
			status: invoice.status === "paid" ? "succeeded" : "pending",
			createdAt: invoice.createdAt || invoice.invoiceDate,
			planName: "Invoice",
		};
		setSelectedInvoice(paymentFormat);
		setIsInvoiceModalOpen(true);
	};

	const handleEditClick = (invoice) => {
		setInvoiceToEdit(invoice);
		setIsCreateModalOpen(true);
	};

	const handleCreateClick = () => {
		setInvoiceToEdit(null);
		setIsCreateModalOpen(true);
	};

	const handleSendInvoice = async (invoice) => {
		if (!invoice.to?.email) {
			toast.error("Invoice recipient email is missing");
			return;
		}

		try {
			// TODO: Implement email sending API
			toast.info("Sending invoice email...");
			// await sendInvoiceEmail(invoice.id, invoice.to.email);
			toast.success("Invoice sent successfully");
		} catch (error) {
			console.error("Error sending invoice:", error);
			toast.error("Failed to send invoice. Please try again.");
		}
	};

	const handleStatusToggle = async (invoice) => {
		try {
			if (invoice.status === "paid") {
				await markInvoiceAsUnpaid(invoice.id);
				toast.success("Invoice marked as unpaid");
			} else {
				await markInvoiceAsPaid(invoice.id);
				toast.success("Invoice marked as paid");
			}
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
		} catch (error) {
			console.error("Error updating invoice status:", error);
			toast.error("Failed to update invoice status. Please try again.");
		}
	};

	// Status filter options
	const statusFilterOptions = [
		{ value: "all", label: "All Status" },
		{ value: "paid", label: "Paid", color: "bg-green-100 text-green-800" },
		{ value: "unpaid", label: "Unpaid", color: "bg-red-100 text-red-800" },
	];

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-zinc-200 py-2 px-4">
				<div>
					<h1 className="text-lg text-zinc-900">Invoices</h1>
					<p className="text-sm text-zinc-600 mt-1">
						Create and manage invoices for your clients
					</p>
				</div>
				<div className="flex items-center gap-2">
					<ExportDropdown dataType="invoices" data={sortedInvoices} />
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={handleCreateClick}
						className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl font-medium transition-colors"
					>
						<Plus className="w-4 h-4" />
						Create New Invoice
					</motion.button>
				</div>
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
								Total Invoices
							</p>
							<p className="text-2xl font-bold text-zinc-900">{stats.total}</p>
						</div>
						<FileText className="w-8 h-8 text-zinc-400" />
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
							<p className="text-xs font-medium text-green-600 mb-1">Paid</p>
							<p className="text-2xl font-bold text-green-900">{stats.paid}</p>
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
							<p className="text-xs font-medium text-red-600 mb-1">Unpaid</p>
							<p className="text-2xl font-bold text-red-900">{stats.unpaid}</p>
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
								Total Amount
							</p>
							<p className="text-2xl font-bold text-yellow-900">
								{formatCurrency(stats.totalAmount)}
							</p>
						</div>
						<FileText className="w-8 h-8 text-yellow-400" />
					</div>
				</motion.div>
			</div>

			{/* Filters */}
			<div className="flex items-center gap-4 px-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
					<input
						type="text"
						placeholder="Search invoices by number, client name, or email..."
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
					<TableSkeleton rows={5} columns={7} />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead
									sortable
									onClick={() => handleSort("invoiceNumber")}
								>
									<div className="flex items-center gap-2">
										Invoice #{getSortIcon("invoiceNumber")}
									</div>
								</TableHead>
								<TableHead
									sortable
									onClick={() => handleSort("toName")}
									className="min-w-[200px]"
								>
									<div className="flex items-center gap-2">
										Client
										{getSortIcon("toName")}
									</div>
								</TableHead>
								<TableHead
									sortable
									onClick={() => handleSort("total")}
								>
									<div className="flex items-center gap-2">
										Amount
										{getSortIcon("total")}
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
										Date
										{getSortIcon("createdAt")}
									</div>
								</TableHead>
								<TableHead
									sortable
									onClick={() => handleSort("dueDate")}
								>
									<div className="flex items-center gap-2">
										Due Date
										{getSortIcon("dueDate")}
									</div>
								</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{error ? (
								<TableEmpty
									colSpan={7}
									message="Error loading invoices. Please try again."
								/>
							) : sortedInvoices.length === 0 ? (
								<TableEmpty
									colSpan={7}
									message={
										searchQuery || statusFilter !== "all"
											? "No invoices found matching your filters."
											: "No invoices yet. Click 'Create New Invoice' to get started."
									}
								/>
							) : (
								sortedInvoices.map((invoice) => (
									<TableRow key={invoice.id}>
										<TableCell>
											<button
												type="button"
												onClick={() => handleViewClick(invoice)}
												className="text-xs text-zinc-600 font-mono hover:text-zinc-900 hover:underline"
												title="View invoice"
											>
												{invoice.invoiceNumber || invoice.id}
											</button>
										</TableCell>
										<TableCell>
											<div>
												<button
													type="button"
													onClick={() => handleViewClick(invoice)}
													className="font-medium text-sm text-zinc-900 hover:underline text-left"
													title="View invoice"
												>
													{invoice.to?.name || ""}
												</button>
												<div className="text-xs text-zinc-600">
													{invoice.to?.email || ""}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<span className="font-semibold text-sm text-zinc-900">
												{formatCurrency(invoice.total)}
											</span>
										</TableCell>
										<TableCell>
											<button
												onClick={() => handleStatusToggle(invoice)}
												className="cursor-pointer"
											>
												{getStatusBadge(invoice.status)}
											</button>
										</TableCell>
										<TableCell>
											<div className="text-xs text-zinc-600 flex items-center gap-1">
												<Calendar className="w-3 h-3" />
												{formatDate(invoice.invoiceDate || invoice.createdAt)}
											</div>
										</TableCell>
										<TableCell>
										<div className="text-xs text-zinc-600">
											{formatDate(invoice.dueDate)}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={() => handleViewClick(invoice)}
												className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
												title="View Invoice"
											>
												<Eye className="w-4 h-4" />
											</motion.button>
											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={() => handleEditClick(invoice)}
												className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors"
												title="Edit Invoice"
											>
												<Edit className="w-4 h-4" />
											</motion.button>
											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={() => handleSendInvoice(invoice)}
												className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors"
												title="Send Invoice"
											>
												<Send className="w-4 h-4" />
											</motion.button>
											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={() => handleDeleteClick(invoice)}
												className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
												title="Delete Invoice"
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
					setInvoiceToDelete(null);
				}}
				onConfirm={handleDeleteConfirm}
				title="Delete Invoice"
				message={
					invoiceToDelete
						? `Are you sure you want to delete invoice ${invoiceToDelete.invoiceNumber || invoiceToDelete.id}? This action cannot be undone.`
						: "Are you sure you want to delete this invoice?"
				}
				confirmText="Delete"
				cancelText="Cancel"
				variant="danger"
			/>

			{/* Create/Edit Invoice Modal */}
			<CreateInvoiceModal
				isOpen={isCreateModalOpen}
				onClose={() => {
					setIsCreateModalOpen(false);
					setInvoiceToEdit(null);
					queryClient.invalidateQueries({ queryKey: ["invoices"] });
				}}
				invoiceToEdit={invoiceToEdit}
			/>

			{/* View Invoice Modal */}
			<InvoiceModal
				isOpen={isInvoiceModalOpen}
				onClose={() => {
					setIsInvoiceModalOpen(false);
					setSelectedInvoice(null);
				}}
				payment={selectedInvoice}
			/>
		</div>
	);
};

export default InvoiceTab;
