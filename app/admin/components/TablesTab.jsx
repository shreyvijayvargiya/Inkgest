import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
	Table2,
	Search,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Trash2,
	Plus,
	ArrowLeft,
	X,
	Columns,
	Rows3,
	Database,
	ChevronDown,
	GripVertical,
	Check,
	AlertCircle,
	Eye,
	RefreshCw,
	FileText,
	Mail,
	User,
	Users,
	Building2,
	CreditCard,
	Receipt,
	ShoppingBag,
	MessageSquare,
	Shield,
	UsersRound,
	FileEdit,
	LayoutGrid,
	Lightbulb,
	FolderOpen,
	GitBranch,
	Clock,
	Lock,
} from "lucide-react";

// Icon map for system collections
const ICON_MAP = {
	FileText,
	Mail,
	User,
	Users,
	Building2,
	CreditCard,
	Receipt,
	ShoppingBag,
	MessageSquare,
	Shield,
	UsersRound,
	FileEdit,
	LayoutGrid,
	Lightbulb,
	FolderOpen,
	GitBranch,
	Clock,
	AlertCircle,
	Eye,
	Table2,
	Database,
};
import {
	getAllTables,
	getAllCollections,
	createTable,
	deleteTable,
	checkTableExists,
	getTable,
	getTableRows,
} from "../../../lib/api/tables";
import TableSkeleton from "../../../lib/ui/TableSkeleton";
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from "../../../lib/ui/Table";
import ConfirmationModal from "../../../lib/ui/ConfirmationModal";
import AnimatedDropdown from "../../../lib/ui/AnimatedDropdown";
import { toast } from "sonner";

const COLUMN_TYPES = [
	{ value: "text", label: "Text", description: "Plain text string" },
	{ value: "id", label: "ID", description: "Unique identifier" },
	{ value: "number", label: "Number", description: "Numeric value" },
	{ value: "boolean", label: "Boolean", description: "True or false" },
	{ value: "date", label: "Date", description: "Date and time" },
	{ value: "email", label: "Email", description: "Email address" },
	{ value: "url", label: "URL", description: "Web address" },
	{ value: "array", label: "Array", description: "List of values" },
	{ value: "object", label: "Object", description: "Nested data" },
];

// Generate unique ID
function uid(prefix = "col") {
	return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// Column Editor Component - Renders as a table row
const ColumnEditorRow = ({ column, onUpdate, onRemove, index }) => {
	const [isTypeOpen, setIsTypeOpen] = useState(false);

	return (
		<TableRow hover={false} className="group">
			{/* Drag Handle & Index */}
			<TableCell className="w-12">
				<div className="flex items-center gap-2">
					<div className="opacity-0 group-hover:opacity-100 cursor-grab text-zinc-400 hover:text-zinc-600 transition-opacity">
						<GripVertical className="w-3.5 h-3.5" />
					</div>
					<span className="text-xs text-zinc-400">{index + 1}</span>
				</div>
			</TableCell>

			{/* Column Name */}
			<TableCell>
				<input
					value={column.name}
					onChange={(e) =>
						onUpdate({
							name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
						})
					}
					placeholder="column_name"
					className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-200 text-sm outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-300 transition-all bg-white"
				/>
			</TableCell>

			{/* Column Type */}
			<TableCell>
				<AnimatedDropdown
					isOpen={isTypeOpen}
					onToggle={() => setIsTypeOpen(!isTypeOpen)}
					onSelect={(value) => {
						onUpdate({ type: value });
						setIsTypeOpen(false);
					}}
					options={COLUMN_TYPES}
					value={column.type}
					placeholder="Select type..."
					buttonClassName="px-2.5 py-1.5 text-sm w-full z-[1000]"
					optionClassName="text-sm"
				/>
			</TableCell>

			{/* Default Value */}
			<TableCell>
				<input
					value={column.defaultValue || ""}
					onChange={(e) => onUpdate({ defaultValue: e.target.value })}
					placeholder="NULL"
					className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-200 text-sm outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-300 transition-all bg-white"
				/>
			</TableCell>

			{/* Required Checkbox */}
			<TableCell className="text-center">
				<button
					onClick={() => onUpdate({ required: !column.required })}
					className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all mx-auto ${column.required
							? "bg-zinc-900 border-zinc-900 text-white"
							: "bg-white border-zinc-200 text-transparent hover:border-zinc-300"
						}`}
				>
					<Check className="w-3.5 h-3.5" />
				</button>
			</TableCell>

			{/* Remove Button */}
			<TableCell className="text-center">
				<motion.button
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.9 }}
					onClick={onRemove}
					className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors mx-auto"
				>
					<Trash2 className="w-3.5 h-3.5" />
				</motion.button>
			</TableCell>
		</TableRow>
	);
};

// Table Detail View - Shows columns and rows of a selected table
const TableDetailView = ({ table, onBack }) => {
	const [activeDetailTab, setActiveDetailTab] = useState("columns");

	const {
		data: tableData,
		isLoading: isLoadingTable,
		refetch: refetchTable,
	} = useQuery({
		queryKey: ["table", table.name],
		queryFn: () => getTable(table.name),
		enabled: !!table.name,
	});

	const {
		data: rows = [],
		isLoading: isLoadingRows,
		refetch: refetchRows,
	} = useQuery({
		queryKey: ["tableRows", table.name],
		queryFn: () => getTableRows(table.name),
		enabled: !!table.name && activeDetailTab === "rows",
	});

	const columns = tableData?.columns || table.columns || [];

	const getTypeColor = (type) => {
		const colors = {
			text: "bg-zinc-100 text-zinc-700",
			number: "bg-green-100 text-green-700",
			boolean: "bg-purple-100 text-purple-700",
			date: "bg-orange-100 text-orange-700",
			email: "bg-cyan-100 text-cyan-700",
			url: "bg-indigo-100 text-indigo-700",
			array: "bg-pink-100 text-pink-700",
			object: "bg-amber-100 text-amber-700",
		};
		return colors[type] || "bg-zinc-100 text-zinc-700";
	};

	// Get the appropriate icon for the table
	const getDetailTableIcon = () => {
		if (table.isSystem && table.icon) {
			const IconComponent = ICON_MAP[table.icon];
			return IconComponent ? (
				<IconComponent className="w-5 h-5 text-zinc-600" />
			) : (
				<Table2 className="w-5 h-5 text-zinc-600" />
			);
		}
		return <Table2 className="w-5 h-5 text-zinc-600" />;
	};

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center gap-4 border-b border-zinc-200 px-4 pb-4">
				<div className="flex-1">
					<div className="flex items-center gap-3">
						<div
							className={`w-10 h-10 rounded-xl flex items-center justify-center `}
						>
							{getDetailTableIcon()}
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-lg font-semibold text-zinc-900">
									{table.name}
								</h1>
								{table.isSystem ? (
									<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-medium bg-zinc-100 text-zinc-700">
										<Lock className="w-3 h-3" />
										System
									</span>
								) : (
									<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-medium bg-green-100 text-green-700">
										Custom
									</span>
								)}
							</div>
							<p className="text-sm text-zinc-500">
								{table.description || "No description"}
							</p>
						</div>
					</div>
				</div>
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={() => {
						refetchTable();
						refetchRows();
					}}
					className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
					title="Refresh"
				>
					<RefreshCw className="w-5 h-5" />
				</motion.button>
			</div>
			<div className="px-4 flex justify-between items-center">
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={onBack}
					className="py-1 px-2 text-zinc-600 flex items-center gap-2 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
				>
					<ArrowLeft className="w-3.5 h-3.5 text-zinc-600" />

					<p className="text-sm text-zinc-600">All tables</p>
				</motion.button>
			</div>
			{/* Stats Cards */}
			<div className="flex gap-1 mx-4 divide-x divide-zinc-200 border border-zinc-200 rounded-xl w-fit">
				<div className="w-fit p-2 flex gap-2 items-center justify-start">
					<p className="text-xs font-medium text-zinc-700">{columns.length}</p>
					<span className="text-xs ">Columns</span>
				</div>
				<div className="w-fit p-2 flex gap-2 items-center justify-start">
					<p className="text-xs font-medium text-zinc-700">
						{tableData?.rowCount || table.rowCount || 0}
					</p>
					<span className="text-xs ">Rows</span>
				</div>
				<div className="w-fit p-2 flex items-center gap-2 justify-start">
					<p className="text-xs font-medium text-zinc-700">
						{table.isSystem ? "System Collection" : "Custom Table"}
					</p>
					<span className="text-xs ">Type</span>
				</div>
				<div className="w-fit p-2 flex items-center gap-2 justify-start">
					<p className="text-xs font-medium text-zinc-700">
						{table.createdAt
							? new Date(table.createdAt).toLocaleDateString("en-US", {
								year: "numeric",
								month: "short",
								day: "numeric",
							})
							: table.isSystem
								? "Built-in"
								: "Unknown"}
					</p>
					<span className="text-xs">Created</span>
				</div>
			</div>

			{/* Tabs */}
			<div className="px-4">
				<div className="flex gap-1 p-1 bg-zinc-100 rounded-xl w-fit">
					<button
						onClick={() => setActiveDetailTab("columns")}
						className={`p-2 text-xs font-medium rounded-xl transition-colors ${activeDetailTab === "columns"
								? "bg-white text-zinc-900 shadow-sm"
								: "text-zinc-600 hover:text-zinc-900"
							}`}
					>
						<span className="flex items-center gap-2">
							<Columns className="w-3 h-3" />
							Columns
						</span>
					</button>
					<button
						onClick={() => setActiveDetailTab("rows")}
						className={`p-2 text-xs font-medium rounded-xl transition-colors ${activeDetailTab === "rows"
								? "bg-white text-zinc-900 shadow-sm"
								: "text-zinc-600 hover:text-zinc-900"
							}`}
					>
						<span className="flex items-center gap-2">
							<Rows3 className="w-3 h-3" />
							Rows
						</span>
					</button>
				</div>
			</div>

			{/* Content */}
			<div className="px-4">
				<AnimatePresence mode="wait">
					{activeDetailTab === "columns" ? (
						<motion.div
							key="columns"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="space-y-3"
						>
							{isLoadingTable ? (
								<div className="space-y-2">
									{[1, 2, 3].map((i) => (
										<div
											key={i}
											className="h-16 bg-zinc-100 rounded-xl animate-pulse"
										/>
									))}
								</div>
							) : columns.length === 0 ? (
								<div className="p-8 text-center border border-zinc-200 rounded-xl">
									<Columns className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
									<p className="text-sm text-zinc-600">
										No columns defined for this table
									</p>
								</div>
							) : (
								<div className="border border-zinc-200 rounded-xl overflow-hidden">
									<div className="grid grid-cols-12 gap-4 px-4 py-3 bg-zinc-50 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
										<div className="col-span-1">#</div>
										<div className="col-span-4">Name</div>
										<div className="col-span-3">Type</div>
										<div className="col-span-2">Required</div>
										<div className="col-span-2">Default</div>
									</div>
									{columns.map((column, index) => (
										<div
											key={column.name}
											className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
										>
											<div className="col-span-1 text-sm text-zinc-400">
												{index + 1}
											</div>
											<div className="col-span-4">
												<span className="text-sm font-medium text-zinc-900">
													{column.name}
												</span>
											</div>
											<div className="col-span-3">
												<span
													className={`inline-flex px-2 py-0.5 rounded-xl text-xs font-medium ${getTypeColor(column.type)}`}
												>
													{column.type}
												</span>
											</div>
											<div className="col-span-2">
												{column.required ? (
													<span className="inline-flex items-center gap-1 text-xs text-green-600">
														<Check className="w-3 h-3" />
														Yes
													</span>
												) : (
													<span className="text-xs text-zinc-400">No</span>
												)}
											</div>
											<div className="col-span-2 text-sm text-zinc-500">
												{column.defaultValue || (
													<span className="text-zinc-300">NULL</span>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</motion.div>
					) : (
						<motion.div
							key="rows"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
						>
							{isLoadingRows ? (
								<div className="space-y-2">
									{[1, 2, 3].map((i) => (
										<div
											key={i}
											className="h-12 bg-zinc-100 rounded-xl animate-pulse"
										/>
									))}
								</div>
							) : rows.length === 0 ? (
								<div className="p-8 text-center border border-zinc-200 rounded-xl">
									<Rows3 className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
									<p className="text-sm text-zinc-600">
										No rows in this table yet
									</p>
								</div>
							) : (
								<div className="border border-zinc-200 rounded-xl overflow-hidden overflow-x-auto">
									<table className="w-full min-w-[600px]">
										<thead>
											<tr className="bg-zinc-50 border-b border-zinc-200">
												<th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
													ID
												</th>
												{columns.slice(0, 5).map((col) => (
													<th
														key={col.name}
														className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider"
													>
														{col.name}
													</th>
												))}
												{columns.length > 5 && (
													<th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
														...
													</th>
												)}
											</tr>
										</thead>
										<tbody>
											{rows.slice(0, 50).map((row) => (
												<tr
													key={row.id}
													className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
												>
													<td className="px-4 py-3 text-xs text-zinc-500 font-mono">
														{row.id.slice(0, 8)}...
													</td>
													{columns.slice(0, 5).map((col) => (
														<td
															key={col.name}
															className="px-4 py-3 text-sm text-zinc-900 max-w-[200px] truncate"
														>
															{typeof row[col.name] === "object"
																? JSON.stringify(row[col.name])
																: String(row[col.name] ?? "")}
														</td>
													))}
													{columns.length > 5 && (
														<td className="px-4 py-3 text-xs text-zinc-400">
															+{columns.length - 5} more
														</td>
													)}
												</tr>
											))}
										</tbody>
									</table>
									{rows.length > 50 && (
										<div className="px-4 py-2 bg-zinc-50 border-t border-zinc-200 text-xs text-zinc-500 text-center">
											Showing 50 of {rows.length} rows
										</div>
									)}
								</div>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
};

// Table Creator View
const TableCreator = ({ onBack, onSuccess, queryClient }) => {
	const [tableName, setTableName] = useState("");
	const [description, setDescription] = useState("");
	const [columns, setColumns] = useState([
		{ id: uid(), name: "id", type: "text", required: true, defaultValue: "" },
	]);
	const [error, setError] = useState("");
	const [isChecking, setIsChecking] = useState(false);

	const createTableMutation = useMutation({
		mutationFn: (data) => createTable(data),
		onSuccess: () => {
			toast.success(`Table "${tableName}" created successfully!`);
			queryClient.invalidateQueries({ queryKey: ["allCollections"] });
			onSuccess();
		},
		onError: (err) => {
			setError(err.message || "Failed to create table");
			toast.error(err.message || "Failed to create table");
		},
	});

	const addColumn = () => {
		setColumns([
			...columns,
			{ id: uid(), name: "", type: "text", required: false, defaultValue: "" },
		]);
	};

	const updateColumn = (id, updates) => {
		setColumns(
			columns.map((col) => (col.id === id ? { ...col, ...updates } : col)),
		);
	};

	const removeColumn = (id) => {
		if (columns.length > 1) {
			setColumns(columns.filter((col) => col.id !== id));
		} else {
			toast.warning("Table must have at least one column");
		}
	};

	const handleSubmit = async () => {
		setError("");

		// Validate table name
		const cleanName = tableName.trim();
		if (!cleanName) {
			setError("Table name is required");
			return;
		}

		if (cleanName.length < 2) {
			setError("Table name must be at least 2 characters");
			return;
		}

		// Validate columns
		const invalidCols = columns.filter((c) => !c.name?.trim());
		if (invalidCols.length > 0) {
			setError("All columns must have names");
			return;
		}

		// Check for duplicate column names
		const colNames = columns.map((c) => c.name.toLowerCase());
		const duplicates = colNames.filter(
			(name, idx) => colNames.indexOf(name) !== idx,
		);
		if (duplicates.length > 0) {
			setError(`Duplicate column name: "${duplicates[0]}"`);
			return;
		}

		// Check if table exists
		setIsChecking(true);
		try {
			const exists = await checkTableExists(cleanName);
			if (exists) {
				setError(
					`Table "${cleanName}" already exists. Please choose a different name.`,
				);
				setIsChecking(false);
				return;
			}
		} catch (err) {
			console.error("Error checking table:", err);
		}
		setIsChecking(false);

		// Create table
		createTableMutation.mutate({
			tableName: cleanName,
			description,
			columns: columns.map((c) => ({
				name: c.name,
				type: c.type,
				required: c.required,
				defaultValue: c.defaultValue,
			})),
		});
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4 border-b border-zinc-200 px-4 pb-4">
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={onBack}
					className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
				>
					<ArrowLeft className="w-3.5 h-3.5" />
				</motion.button>
				<div>
					<h1 className="text-lg text-zinc-900">Create New Table</h1>
					<p className="text-sm text-zinc-600 mt-0.5">
						Define your table schema like in Supabase
					</p>
				</div>
			</div>

			<div className="px-4 space-y-6">
				{/* Table Info */}
				<div className="border border-zinc-200 rounded-2xl p-6 space-y-4">
					<h2 className="text-sm font-semibold text-zinc-900">Table Details</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">
								Table Name *
							</label>
							<input
								value={tableName}
								onChange={(e) =>
									setTableName(
										e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
									)
								}
								placeholder="my_table"
								className="w-full px-4 py-2 rounded-xl border border-zinc-200 text-sm outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-300 transition-all bg-white"
							/>
							<p className="text-[10px] text-zinc-400 mt-1">
								Only lowercase letters, numbers, and underscores
							</p>
						</div>

						<div>
							<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">
								Description
							</label>
							<input
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="What is this table for?"
								className="w-full px-4 py-2 rounded-xl border border-zinc-200 text-sm outline-none focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-300 transition-all bg-white"
							/>
						</div>
					</div>
				</div>

				{/* Columns Section */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-sm font-semibold text-zinc-900">Columns</h2>
							<p className="text-xs text-zinc-500 mt-0.5">
								Define the structure of your table
							</p>
						</div>
						<div className="flex items-center gap-4">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={addColumn}
								className="flex items-center gap-2 p-2 text-sm text-zinc-700 bg-zinc-50 hover:bg-zinc-100 rounded-xl font-medium transition-colors"
							>
								<Plus className="w-3.5 h-3.5" />
								Add Column
							</motion.button>
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={handleSubmit}
								disabled={createTableMutation.isPending || isChecking}
								className="p-2 text-xs text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
							>
								{createTableMutation.isPending || isChecking ? (
									<>
										<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
										{isChecking ? "Checking..." : "Saving..."}
									</>
								) : (
									<>
										<Database className="w-3 h-3" />
										Save Table
									</>
								)}
							</motion.button>
						</div>
					</div>

					{/* Columns Table */}
					<Table>
						<TableHeader>
							<TableRow hover={false}>
								<TableHead className="w-12 text-right">#</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Default</TableHead>
								<TableHead className="text-center w-20">Required</TableHead>
								<TableHead className="text-center w-20">Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<AnimatePresence mode="popLayout">
								{columns.map((column, index) => (
									<ColumnEditorRow
										key={column.id}
										column={column}
										index={index}
										onUpdate={(updates) => updateColumn(column.id, updates)}
										onRemove={() => removeColumn(column.id)}
									/>
								))}
							</AnimatePresence>
						</TableBody>
					</Table>
				</div>

				{/* Error Message */}
				{error && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl"
					>
						<AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
						<p className="text-sm text-red-600">{error}</p>
					</motion.div>
				)}
			</div>
		</div>
	);
};

// Main Tables Tab Component
const TablesTab = ({ queryClient, selectedTable, onTableSelect }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortField, setSortField] = useState("name");
	const [sortDirection, setSortDirection] = useState("asc");
	const [isCreating, setIsCreating] = useState(false);
	const [tableToDelete, setTableToDelete] = useState(null);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [viewingTable, setViewingTable] = useState(null);
	const [filterType, setFilterType] = useState("all"); // "all", "system", "custom"

	// Update viewingTable when selectedTable changes from sidebar
	useEffect(() => {
		if (selectedTable) {
			setViewingTable(selectedTable);
			setIsCreating(false);
		}
	}, [selectedTable]);

	const {
		data: tables = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["allCollections"],
		queryFn: getAllCollections,
	});

	const deleteTableMutation = useMutation({
		mutationFn: (tableName) => deleteTable(tableName),
		onSuccess: () => {
			toast.success("Table deleted successfully");
			queryClient.invalidateQueries({ queryKey: ["allCollections"] });
		},
		onError: (err) => {
			toast.error(err.message || "Failed to delete table");
		},
	});

	// Count tables by type
	const systemCount = useMemo(
		() => tables.filter((t) => t.isSystem).length,
		[tables],
	);
	const customCount = useMemo(
		() => tables.filter((t) => !t.isSystem).length,
		[tables],
	);

	// Filter tables
	const filteredTables = useMemo(() => {
		return tables.filter((table) => {
			// Filter by type
			if (filterType === "system" && !table.isSystem) return false;
			if (filterType === "custom" && table.isSystem) return false;

			// Filter by search
			const searchLower = searchQuery.toLowerCase();
			return (
				table.name?.toLowerCase().includes(searchLower) ||
				table.description?.toLowerCase().includes(searchLower)
			);
		});
	}, [tables, searchQuery, filterType]);

	// Sort tables
	const sortedTables = useMemo(() => {
		return [...filteredTables].sort((a, b) => {
			if (!sortField) return 0;

			let aValue, bValue;

			switch (sortField) {
				case "name":
					aValue = (a.name || "").toLowerCase();
					bValue = (b.name || "").toLowerCase();
					break;
				case "columnCount":
					aValue = a.columnCount || 0;
					bValue = b.columnCount || 0;
					break;
				case "rowCount":
					aValue = a.rowCount || 0;
					bValue = b.rowCount || 0;
					break;
				case "createdAt":
					aValue = new Date(a.createdAt || 0).getTime();
					bValue = new Date(b.createdAt || 0).getTime();
					break;
				default:
					return 0;
			}

			if (typeof aValue === "string") {
				if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
				if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
				return 0;
			}

			return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
		});
	}, [filteredTables, sortField, sortDirection]);

	const handleSort = (field) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
	};

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

	const handleDeleteClick = (table) => {
		setTableToDelete(table);
		setIsDeleteModalOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!tableToDelete) return;

		try {
			await deleteTableMutation.mutateAsync(tableToDelete.name);
		} finally {
			setTableToDelete(null);
			setIsDeleteModalOpen(false);
		}
	};

	// Show table detail view
	if (viewingTable) {
		return (
			<TableDetailView
				table={viewingTable}
				onBack={() => {
					setViewingTable(null);
					onTableSelect?.(null);
				}}
				queryClient={queryClient}
			/>
		);
	}

	// Show table creator view
	if (isCreating) {
		return (
			<TableCreator
				onBack={() => setIsCreating(false)}
				onSuccess={() => setIsCreating(false)}
				queryClient={queryClient}
			/>
		);
	}

	if (error) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-xl m-4">
				<p className="text-sm text-red-600">
					Error loading tables: {error.message}
				</p>
			</div>
		);
	}

	// Get icon for a table
	const getTableIcon = (table) => {
		if (table.isSystem && table.icon) {
			const IconComponent = ICON_MAP[table.icon];
			return IconComponent ? (
				<IconComponent className="w-4 h-4 text-zinc-600" />
			) : (
				<Table2 className="w-4 h-4 text-zinc-600" />
			);
		}
		return <Table2 className="w-4 h-4 text-zinc-600" />;
	};

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-zinc-200 px-4 pb-2">
				<div>
					<h1 className="text-lg text-zinc-900">Database Collections</h1>
					<p className="text-sm text-zinc-600 mt-1">
						View and manage all Firestore collections in your app
					</p>
				</div>
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={() => setIsCreating(true)}
					className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl font-medium transition-colors"
				>
					<Plus className="w-4 h-4" />
					Create Table
				</motion.button>
			</div>

			{/* Filter Tabs */}
			<div className="px-4">
				<div className="flex gap-1 p-1 bg-zinc-100 rounded-xl w-fit">
					<button
						onClick={() => setFilterType("all")}
						className={`p-2 text-xs font-medium rounded-xl transition-colors ${filterType === "all"
								? "bg-white text-zinc-900 shadow-sm"
								: "text-zinc-600 hover:text-zinc-900"
							}`}
					>
						All ({tables.length})
					</button>
					<button
						onClick={() => setFilterType("system")}
						className={`p-2 text-xs font-medium rounded-xl transition-colors flex items-center gap-2 ${filterType === "system"
								? "bg-white text-zinc-900 shadow-sm"
								: "text-zinc-600 hover:text-zinc-900"
							}`}
					>
						<Lock className="w-3.5 h-3.5" />
						System ({systemCount})
					</button>
					<button
						onClick={() => setFilterType("custom")}
						className={`p-2 text-xs font-medium rounded-xl transition-colors flex items-center gap-2 ${filterType === "custom"
								? "bg-white text-zinc-900 shadow-sm"
								: "text-zinc-600 hover:text-zinc-900"
							}`}
					>
						<Database className="w-3.5 h-3.5" />
						Custom ({customCount})
					</button>
				</div>
			</div>

			{/* Search */}
			<div className="flex items-center gap-4 mx-4">
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
					<input
						type="text"
						placeholder="Search collections..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-100 focus:outline-none text-sm"
					/>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto px-4">
				{isLoading ? (
					<TableSkeleton columns={5} rows={5} />
				) : sortedTables.length === 0 ? (
					<div className="p-8 text-center border border-zinc-200 rounded-xl">
						<Database className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
						<p className="text-sm text-zinc-600">
							{searchQuery
								? "No tables found matching your search"
								: "No tables yet. Create your first table to get started."}
						</p>
						{!searchQuery && (
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => setIsCreating(true)}
								className="mt-4 flex items-center gap-2 px-4 py-2 text-sm text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl font-medium transition-colors mx-auto"
							>
								<Plus className="w-4 h-4" />
								Create Table
							</motion.button>
						)}
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead sortable onClick={() => handleSort("name")}>
									<div className="flex items-center gap-2">
										<Database className="w-4 h-4 text-zinc-400" />
										Collection
										{getSortIcon("name")}
									</div>
								</TableHead>
								<TableHead>Type</TableHead>
								<TableHead className="min-w-[180px]">Description</TableHead>
								<TableHead sortable onClick={() => handleSort("columnCount")}>
									<div className="flex items-center gap-2">
										<Columns className="w-4 h-4 text-zinc-400" />
										Columns
										{getSortIcon("columnCount")}
									</div>
								</TableHead>
								<TableHead sortable onClick={() => handleSort("rowCount")}>
									<div className="flex items-center gap-2">
										<Rows3 className="w-4 h-4 text-zinc-400" />
										Rows
										{getSortIcon("rowCount")}
									</div>
								</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sortedTables.map((table) => (
								<TableRow
									key={table.id}
									className="cursor-pointer hover:bg-zinc-50"
									onClick={() => setViewingTable(table)}
								>
									<TableCell>
										<div className="flex items-center gap-2">
											<div
												className={`w-8 h-8 rounded-xl flex items-center justify-center `}
											>
												{getTableIcon(table)}
											</div>
											<span className="font-medium text-zinc-900 hover:text-zinc-600 hover:underline transition-colors">
												{table.name}
											</span>
										</div>
									</TableCell>
									<TableCell>
										{table.isSystem ? (
											<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-medium bg-zinc-100 text-zinc-700">
												<Lock className="w-3 h-3" />
												System
											</span>
										) : (
											<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-medium bg-green-100 text-green-700">
												<Database className="w-3 h-3" />
												Custom
											</span>
										)}
									</TableCell>
									<TableCell>
										<span className="text-sm text-zinc-600 truncate max-w-[180px] block">
											{table.description || "No description"}
										</span>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											<span className="text-sm font-medium text-zinc-900">
												{table.columnCount}
											</span>
											<span className="text-xs text-zinc-500">cols</span>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											<span className="text-sm font-medium text-zinc-900">
												{table.rowCount}
											</span>
											<span className="text-xs text-zinc-500">rows</span>
										</div>
									</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center justify-end gap-2">
											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={(e) => {
													e.stopPropagation();
													setViewingTable(table);
												}}
												className="p-1.5 text-zinc-600 rounded-xl transition-colors"
												title="View"
											>
												<Eye className="w-3.5 h-3.5 text-zinc-600" />
											</motion.button>
											{!table.isSystem && (
												<motion.button
													whileHover={{ scale: 1.1 }}
													whileTap={{ scale: 0.9 }}
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteClick(table);
													}}
													className="p-1.5 text-zinc-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
													title="Delete"
												>
													<Trash2 className="w-4 h-4" />
												</motion.button>
											)}
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>

			{/* Delete Confirmation Modal */}
			<ConfirmationModal
				isOpen={isDeleteModalOpen}
				onClose={() => {
					setIsDeleteModalOpen(false);
					setTableToDelete(null);
				}}
				onConfirm={handleDeleteConfirm}
				title="Delete Table"
				message={`Are you sure you want to delete "${tableToDelete?.name}"? This will permanently delete all data in this table. This action cannot be undone.`}
				variant="danger"
				confirmText="Delete"
			/>
		</div>
	);
};

export default TablesTab;
