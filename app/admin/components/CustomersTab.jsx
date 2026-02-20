import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	Search,
	Mail,
	Calendar,
	CheckCircle2,
	XCircle,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Ban,
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
import ExportDropdown from "../../../lib/ui/ExportDropdown";

const CUSTOMERS_COLLECTION = "customers";

const getAllCustomers = async () => {
	try {
		const q = query(
			collection(db, CUSTOMERS_COLLECTION),
			orderBy("createdAt", "desc")
		);
		const querySnapshot = await getDocs(q);
		const customers = [];
		querySnapshot.forEach((doc) => {
			customers.push({
				id: doc.id,
				...doc.data(),
			});
		});
		return customers;
	} catch (error) {
		console.error("Error getting customers:", error);
		throw error;
	}
};

const CustomersTab = () => {
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState(null); // null = all, 'active', 'inactive'
	const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
	const [sortField, setSortField] = useState(null); // 'name', 'planName', 'status', 'amount', 'createdAt', 'customerId'
	const [sortDirection, setSortDirection] = useState("asc"); // 'asc' or 'desc'

	const {
		data: customers = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["customers"],
		queryFn: () => getAllCustomers(),
	});

	// Status filter options
	const statusOptions = [
		{ value: null, label: "All Statuses" },
		{ value: "active", label: "Active", color: "bg-green-100 text-green-800" },
		{ value: "inactive", label: "Inactive", color: "bg-red-100 text-red-800" },
		{
			value: "cancelled",
			label: "Cancelled",
			color: "bg-orange-100 text-orange-800",
		},
	];

	const filteredCustomers = customers.filter((customer) => {
		// Search filter
		const searchLower = searchQuery.toLowerCase();
		const matchesSearch =
			customer.email?.toLowerCase().includes(searchLower) ||
			customer.name?.toLowerCase().includes(searchLower) ||
			customer.customerId?.toLowerCase().includes(searchLower);

		// Status filter
		const matchesStatus =
			statusFilter === null ||
			customer.status?.toLowerCase() === statusFilter?.toLowerCase();

		return matchesSearch && matchesStatus;
	});

	// Sort customers
	const sortedCustomers = [...filteredCustomers].sort((a, b) => {
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

		// Handle number comparison for amount
		if (sortField === "amount") {
			const amountA = a.amount || 0;
			const amountB = b.amount || 0;
			return sortDirection === "asc" ? amountA - amountB : amountB - amountA;
		}

		// Handle string comparison for other fields
		let aValue, bValue;

		switch (sortField) {
			case "name":
				aValue = (a.name || "").toLowerCase();
				bValue = (b.name || "").toLowerCase();
				break;
			case "planName":
				aValue = (a.planName || "").toLowerCase();
				bValue = (b.planName || "").toLowerCase();
				break;
			case "status":
				aValue = (a.status || "").toLowerCase();
				bValue = (b.status || "").toLowerCase();
				break;
			case "customerId":
				aValue = (a.customerId || a.id || "").toLowerCase();
				bValue = (b.customerId || b.id || "").toLowerCase();
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

	const formatCurrency = (amount, currency = "usd") => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency.toUpperCase(),
		}).format(amount / 100);
	};

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
				<div>
					<h1 className="text-lg text-zinc-900">Customers</h1>
					<p className="text-sm text-zinc-600 mt-1">
						Manage your paid customers and subscriptions
					</p>
				</div>
				<ExportDropdown dataType="customers" data={sortedCustomers} />
			</div>

			{/* Search and Status Filter */}
			<div className="flex gap-3 px-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
					<input
						type="text"
						placeholder="Search customers by email, name, or customer ID..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
					/>
				</div>
				<div className="w-48">
					<AnimatedDropdown
						isOpen={isStatusDropdownOpen}
						onToggle={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
						onSelect={(value) => {
							setStatusFilter(value);
							setIsStatusDropdownOpen(false);
						}}
						options={statusOptions}
						value={statusFilter}
						placeholder="Filter by status"
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
								<TableHead
									sortable
									onClick={() => handleSort("name")}
									className="min-w-[200px]"
								>
									<div className="flex items-center gap-2">
										Customer
										{getSortIcon("name")}
									</div>
								</TableHead>
								<TableHead sortable onClick={() => handleSort("planName")}>
									<div className="flex items-center gap-2">
										Plan
										{getSortIcon("planName")}
									</div>
								</TableHead>
								<TableHead sortable onClick={() => handleSort("status")}>
									<div className="flex items-center gap-2">
										Status
										{getSortIcon("status")}
									</div>
								</TableHead>
								<TableHead sortable onClick={() => handleSort("amount")}>
									<div className="flex items-center gap-2">
										Amount
										{getSortIcon("amount")}
									</div>
								</TableHead>
								<TableHead sortable onClick={() => handleSort("createdAt")}>
									<div className="flex items-center gap-2">
										Joined
										{getSortIcon("createdAt")}
									</div>
								</TableHead>
								<TableHead sortable onClick={() => handleSort("customerId")}>
									<div className="flex items-center gap-2">
										Customer ID
										{getSortIcon("customerId")}
									</div>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{error ? (
								<TableEmpty
									colSpan={6}
									message="Error loading customers. Please try again."
								/>
							) : sortedCustomers.length === 0 ? (
								<TableEmpty
									colSpan={6}
									message={
										searchQuery || statusFilter !== null
											? "No customers found matching your search or filter."
											: "No customers yet. Customers will appear here after they subscribe."
									}
								/>
							) : (
								sortedCustomers.map((customer) => (
									<TableRow key={customer.id}>
										<TableCell>
											<div>
												<div className="font-medium text-sm text-zinc-900">
													{customer.name || ""}
												</div>
												<div className="text-xs text-zinc-600 flex items-center gap-1 mt-1">
													<Mail className="w-3 h-3" />
													{customer.email || ""}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-900 text-white">
												{customer.planName || "Pro"}
											</span>
										</TableCell>
										<TableCell>
											{customer.status === "active" ? (
												<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
													<CheckCircle2 className="w-3 h-3" />
													Active
												</span>
											) : customer.status === "cancelled" ? (
												<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
													<Ban className="w-3 h-3" />
													Cancelled
												</span>
											) : (
												<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
													<XCircle className="w-3 h-3" />
													{customer.status || "Inactive"}
												</span>
											)}
										</TableCell>
										<TableCell>
											{customer.amount
												? formatCurrency(customer.amount, customer.currency)
												: "$0"}
										</TableCell>
										<TableCell>
											<div className="text-xs text-zinc-600 flex items-center gap-1">
												<Calendar className="w-3 h-3" />
												{formatDate(customer.createdAt)}
											</div>
										</TableCell>
										<TableCell>
											<code className="text-xs text-zinc-600 font-mono">
												{customer.customerId || customer.id}
											</code>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				)}
			</div>
		</div>
	);
};

export default CustomersTab;
