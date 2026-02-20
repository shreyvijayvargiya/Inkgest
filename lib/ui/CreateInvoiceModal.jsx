import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import AnimatedDropdown from "./AnimatedDropdown";
import { getAllUsers } from "../api/users";
import { getAllCustomers } from "../api/customers";
import { getAllSubscribers } from "../api/subscribers";
import { createInvoice, updateInvoice } from "../api/invoice";
import { toast } from "react-toastify";

const CreateInvoiceModal = ({ isOpen, onClose, invoiceToEdit = null }) => {
	const [selectedClientType, setSelectedClientType] = useState("users");
	const [isClientTypeDropdownOpen, setIsClientTypeDropdownOpen] =
		useState(false);
	const [selectedClient, setSelectedClient] = useState(null);
	const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
	const [useCustomEmail, setUseCustomEmail] = useState(false);
	const [fromDetails, setFromDetails] = useState({
		name: "",
		email: "",
		address: "",
		city: "",
		state: "",
		zip: "",
		country: "",
	});
	const [toDetails, setToDetails] = useState({
		name: "",
		email: "",
		address: "",
		city: "",
		state: "",
		zip: "",
		country: "",
	});
	const [invoiceNumber, setInvoiceNumber] = useState("");
	const [invoiceDate, setInvoiceDate] = useState(
		new Date().toISOString().split("T")[0]
	);
	const [dueDate, setDueDate] = useState("");
	const [items, setItems] = useState([
		{ description: "", quantity: 1, price: 0, total: 0 },
	]);
	const [notes, setNotes] = useState("");
	const [signature, setSignature] = useState("");
	const [status, setStatus] = useState("unpaid");
	const [isSaving, setIsSaving] = useState(false);

	// Fetch users, customers, and subscribers
	const { data: users = [] } = useQuery({
		queryKey: ["users"],
		queryFn: getAllUsers,
	});

	const { data: customers = [] } = useQuery({
		queryKey: ["customers"],
		queryFn: getAllCustomers,
	});

	const { data: subscribers = [] } = useQuery({
		queryKey: ["subscribers"],
		queryFn: getAllSubscribers,
	});

	// Prepare client options based on selected type
	const getClientOptions = () => {
		switch (selectedClientType) {
			case "users":
				return users.map((user) => ({
					value: user.id,
					label: `${user.name || user.displayName || user.email} (${user.email || "N/A"})`,
					data: user,
				}));
			case "customers":
				return customers.map((customer) => ({
					value: customer.id,
					label: `${customer.name || customer.email} (${customer.email || "N/A"})`,
					data: customer,
				}));
			case "subscribers":
				return subscribers.map((subscriber) => ({
					value: subscriber.id,
					label: `${subscriber.name || subscriber.email} (${subscriber.email || "N/A"})`,
					data: subscriber,
				}));
			default:
				return [];
		}
	};

	// Handle client selection
	const handleClientSelect = (clientId) => {
		const options = getClientOptions();
		const selected = options.find((opt) => opt.value === clientId);
		if (selected) {
			setSelectedClient(selected.value);
			const clientData = selected.data;
			setToDetails({
				name: clientData.name || clientData.displayName || "",
				email: clientData.email || "",
				address: clientData.address || "",
				city: clientData.city || "",
				state: clientData.state || "",
				zip: clientData.zip || "",
				country: clientData.country || "",
			});
		}
	};

	// Calculate total for an item
	const calculateItemTotal = (item) => {
		return (item.quantity || 0) * (item.price || 0);
	};

	// Calculate grand total
	const calculateGrandTotal = () => {
		return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
	};

	// Update item total when quantity or price changes
	const updateItem = (index, field, value) => {
		const newItems = [...items];
		newItems[index] = {
			...newItems[index],
			[field]:
				field === "quantity" || field === "price"
					? parseFloat(value) || 0
					: value,
		};
		newItems[index].total = calculateItemTotal(newItems[index]);
		setItems(newItems);
	};

	// Add new row
	const addRow = () => {
		setItems([...items, { description: "", quantity: 1, price: 0, total: 0 }]);
	};

	// Remove row
	const removeRow = (index) => {
		if (items.length > 1) {
			setItems(items.filter((_, i) => i !== index));
		}
	};

	// Load invoice data if editing
	useEffect(() => {
		if (invoiceToEdit) {
			setInvoiceNumber(invoiceToEdit.invoiceNumber || "");

			// Handle invoice date
			let invoiceDateValue = new Date().toISOString().split("T")[0];
			if (invoiceToEdit.invoiceDate) {
				if (
					invoiceToEdit.invoiceDate.toDate &&
					typeof invoiceToEdit.invoiceDate.toDate === "function"
				) {
					invoiceDateValue = invoiceToEdit.invoiceDate
						.toDate()
						.toISOString()
						.split("T")[0];
				} else if (invoiceToEdit.invoiceDate instanceof Date) {
					invoiceDateValue = invoiceToEdit.invoiceDate
						.toISOString()
						.split("T")[0];
				} else {
					try {
						invoiceDateValue = new Date(invoiceToEdit.invoiceDate)
							.toISOString()
							.split("T")[0];
					} catch (e) {
						console.error("Error parsing invoice date:", e);
					}
				}
			}
			setInvoiceDate(invoiceDateValue);

			// Handle due date
			let dueDateValue = "";
			if (invoiceToEdit.dueDate) {
				if (
					invoiceToEdit.dueDate.toDate &&
					typeof invoiceToEdit.dueDate.toDate === "function"
				) {
					dueDateValue = invoiceToEdit.dueDate
						.toDate()
						.toISOString()
						.split("T")[0];
				} else if (invoiceToEdit.dueDate instanceof Date) {
					dueDateValue = invoiceToEdit.dueDate.toISOString().split("T")[0];
				} else {
					try {
						dueDateValue = new Date(invoiceToEdit.dueDate)
							.toISOString()
							.split("T")[0];
					} catch (e) {
						console.error("Error parsing due date:", e);
					}
				}
			}
			setDueDate(dueDateValue);

			setFromDetails(
				invoiceToEdit.from || {
					name: "",
					email: "",
					address: "",
					city: "",
					state: "",
					zip: "",
					country: "",
				}
			);
			setToDetails(
				invoiceToEdit.to || {
					name: "",
					email: "",
					address: "",
					city: "",
					state: "",
					zip: "",
					country: "",
				}
			);
			setItems(
				invoiceToEdit.items && invoiceToEdit.items.length > 0
					? invoiceToEdit.items
					: [{ description: "", quantity: 1, price: 0, total: 0 }]
			);
			setNotes(invoiceToEdit.notes || "");
			setSignature(invoiceToEdit.signature || "");
			setStatus(invoiceToEdit.status || "unpaid");
			setSelectedClientType(invoiceToEdit.clientType || "users");
			setSelectedClient(invoiceToEdit.clientId || null);
		}
	}, [invoiceToEdit]);

	// Reset form when modal closes
	useEffect(() => {
		if (!isOpen) {
			setSelectedClientType("users");
			setSelectedClient(null);
			setUseCustomEmail(false);
			setFromDetails({
				name: "",
				email: "",
				address: "",
				city: "",
				state: "",
				zip: "",
				country: "",
			});
			setToDetails({
				name: "",
				email: "",
				address: "",
				city: "",
				state: "",
				zip: "",
				country: "",
			});
			setInvoiceNumber("");
			setInvoiceDate(new Date().toISOString().split("T")[0]);
			setDueDate("");
			setItems([{ description: "", quantity: 1, price: 0, total: 0 }]);
			setNotes("");
			setSignature("");
			setStatus("unpaid");
		}
	}, [isOpen]);

	// Handle save
	const handleSave = async () => {
		if (!invoiceNumber.trim()) {
			toast.error("Please enter an invoice number");
			return;
		}

		if (!toDetails.name || !toDetails.email) {
			toast.error("Please select a client or fill in 'To' details");
			return;
		}

		if (items.some((item) => !item.description.trim())) {
			toast.error("Please fill in all item descriptions");
			return;
		}

		setIsSaving(true);
		try {
			const invoiceData = {
				invoiceNumber,
				invoiceDate: new Date(invoiceDate),
				dueDate: dueDate ? new Date(dueDate) : null,
				from: fromDetails,
				to: toDetails,
				items: items.map((item) => ({
					...item,
					total: calculateItemTotal(item),
				})),
				total: calculateGrandTotal(),
				notes,
				signature,
				status,
				clientType: selectedClientType,
				clientId: selectedClient,
			};

			if (invoiceToEdit) {
				await updateInvoice(invoiceToEdit.id, invoiceData);
				toast.success("Invoice updated successfully");
			} else {
				await createInvoice(invoiceData);
				toast.success("Invoice created successfully");
			}

			onClose();
		} catch (error) {
			console.error("Error saving invoice:", error);
			toast.error("Failed to save invoice. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	const clientTypeOptions = [
		{ value: "users", label: "Users" },
		{ value: "customers", label: "Customers" },
		{ value: "subscribers", label: "Subscribers" },
	];

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
					onClick={onClose}
				>
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.9, opacity: 0 }}
						onClick={(e) => e.stopPropagation()}
						className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col"
					>
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b border-zinc-200">
							<h3 className="text-lg text-zinc-900">
								{invoiceToEdit ? "Edit Invoice" : "Create New Invoice"}
							</h3>
							<button
								onClick={onClose}
								className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Body */}
						<div className="p-6 overflow-y-auto flex-1">
							<div className="space-y-6">
								{/* Client Selection */}
								<div className="space-y-4">
									<div className="flex items-center gap-2">
										<input
											type="checkbox"
											id="useCustomEmail"
											checked={useCustomEmail}
											onChange={(e) => {
												setUseCustomEmail(e.target.checked);
												if (e.target.checked) {
													setSelectedClient(null);
													setToDetails({
														name: "",
														email: "",
														address: "",
														city: "",
														state: "",
														zip: "",
														country: "",
													});
												}
											}}
											className="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900"
										/>
										<label
											htmlFor="useCustomEmail"
											className="text-sm font-medium text-zinc-700 cursor-pointer"
										>
											Use custom email instead of selecting from list
										</label>
									</div>
									{!useCustomEmail ? (
										<div className="grid grid-cols-2 gap-4">
											<div>
												<label className="block text-sm font-medium text-zinc-700 mb-2">
													Client Type
												</label>
												<AnimatedDropdown
													isOpen={isClientTypeDropdownOpen}
													onToggle={() =>
														setIsClientTypeDropdownOpen(!isClientTypeDropdownOpen)
													}
													onSelect={(value) => {
														setSelectedClientType(value);
														setSelectedClient(null);
														setToDetails({
															name: "",
															email: "",
															address: "",
															city: "",
															state: "",
															zip: "",
															country: "",
														});
														setIsClientTypeDropdownOpen(false);
													}}
													options={clientTypeOptions}
													value={selectedClientType}
													placeholder="Select client type"
												/>
											</div>
											<div>
												<label className="block text-sm font-medium text-zinc-700 mb-2">
													Select Client
												</label>
												<AnimatedDropdown
													isOpen={isClientDropdownOpen}
													onToggle={() =>
														setIsClientDropdownOpen(!isClientDropdownOpen)
													}
													onSelect={handleClientSelect}
													options={getClientOptions()}
													value={selectedClient}
													placeholder="Select a client"
												/>
											</div>
										</div>
									) : null}
								</div>

								{/* Invoice Details */}
								<div className="grid grid-cols-3 gap-4">
									<div>
										<label className="block text-sm font-medium text-zinc-700 mb-2">
											Invoice Number *
										</label>
										<input
											type="text"
											value={invoiceNumber}
											onChange={(e) => setInvoiceNumber(e.target.value)}
											className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
											placeholder="INV-001"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-zinc-700 mb-2">
											Invoice Date
										</label>
										<input
											type="date"
											value={invoiceDate}
											onChange={(e) => setInvoiceDate(e.target.value)}
											className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-zinc-700 mb-2">
											Due Date
										</label>
										<input
											type="date"
											value={dueDate}
											onChange={(e) => setDueDate(e.target.value)}
											className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
										/>
									</div>
								</div>

								{/* From/To Section */}
								<div className="grid grid-cols-2 gap-6">
									{/* From */}
									<div className="border border-zinc-200 rounded-xl p-4">
										<h4 className="text-sm font-semibold text-zinc-900 mb-3">
											From
										</h4>
										<div className="space-y-3">
											<input
												type="text"
												placeholder="Company Name"
												value={fromDetails.name}
												onChange={(e) =>
													setFromDetails({
														...fromDetails,
														name: e.target.value,
													})
												}
												className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
											/>
											<input
												type="email"
												placeholder="Email"
												value={fromDetails.email}
												onChange={(e) =>
													setFromDetails({
														...fromDetails,
														email: e.target.value,
													})
												}
												className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
											/>
											<input
												type="text"
												placeholder="Address"
												value={fromDetails.address}
												onChange={(e) =>
													setFromDetails({
														...fromDetails,
														address: e.target.value,
													})
												}
												className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
											/>
											<div className="grid grid-cols-2 gap-2">
												<input
													type="text"
													placeholder="City"
													value={fromDetails.city}
													onChange={(e) =>
														setFromDetails({
															...fromDetails,
															city: e.target.value,
														})
													}
													className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
												/>
												<input
													type="text"
													placeholder="State"
													value={fromDetails.state}
													onChange={(e) =>
														setFromDetails({
															...fromDetails,
															state: e.target.value,
														})
													}
													className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
												/>
											</div>
											<div className="grid grid-cols-2 gap-2">
												<input
													type="text"
													placeholder="ZIP"
													value={fromDetails.zip}
													onChange={(e) =>
														setFromDetails({
															...fromDetails,
															zip: e.target.value,
														})
													}
													className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
												/>
												<input
													type="text"
													placeholder="Country"
													value={fromDetails.country}
													onChange={(e) =>
														setFromDetails({
															...fromDetails,
															country: e.target.value,
														})
													}
													className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
												/>
											</div>
										</div>
									</div>

									{/* To */}
									<div className="border border-zinc-200 rounded-xl p-4">
										<h4 className="text-sm font-semibold text-zinc-900 mb-3">
											To
										</h4>
										<div className="space-y-3">
											<input
												type="text"
												placeholder="Client Name *"
												value={toDetails.name}
												onChange={(e) =>
													setToDetails({ ...toDetails, name: e.target.value })
												}
												className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
											/>
											<input
												type="email"
												placeholder="Email *"
												value={toDetails.email}
												onChange={(e) =>
													setToDetails({ ...toDetails, email: e.target.value })
												}
												className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
											/>
											<input
												type="text"
												placeholder="Address"
												value={toDetails.address}
												onChange={(e) =>
													setToDetails({
														...toDetails,
														address: e.target.value,
													})
												}
												className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
											/>
											<div className="grid grid-cols-2 gap-2">
												<input
													type="text"
													placeholder="City"
													value={toDetails.city}
													onChange={(e) =>
														setToDetails({ ...toDetails, city: e.target.value })
													}
													className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
												/>
												<input
													type="text"
													placeholder="State"
													value={toDetails.state}
													onChange={(e) =>
														setToDetails({
															...toDetails,
															state: e.target.value,
														})
													}
													className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
												/>
											</div>
											<div className="grid grid-cols-2 gap-2">
												<input
													type="text"
													placeholder="ZIP"
													value={toDetails.zip}
													onChange={(e) =>
														setToDetails({ ...toDetails, zip: e.target.value })
													}
													className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
												/>
												<input
													type="text"
													placeholder="Country"
													value={toDetails.country}
													onChange={(e) =>
														setToDetails({
															...toDetails,
															country: e.target.value,
														})
													}
													className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
												/>
											</div>
										</div>
									</div>
								</div>

								{/* Items Table */}
								<div className="border border-zinc-200 rounded-xl overflow-hidden">
									<div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
										<h4 className="text-sm font-semibold text-zinc-900">
											Items
										</h4>
										<motion.button
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.95 }}
											onClick={addRow}
											className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded-xl hover:bg-zinc-100 transition-colors"
										>
											<Plus className="w-3.5 h-3.5" />
											Add Row
										</motion.button>
									</div>
									<table className="w-full">
										<thead className="bg-zinc-50 border-b border-zinc-200">
											<tr>
												<th className="py-2 px-4 text-left text-xs font-semibold text-zinc-700">
													Description
												</th>
												<th className="py-2 px-4 text-left text-xs font-semibold text-zinc-700">
													Quantity
												</th>
												<th className="py-2 px-4 text-left text-xs font-semibold text-zinc-700">
													Price
												</th>
												<th className="py-2 px-4 text-left text-xs font-semibold text-zinc-700">
													Total
												</th>
												<th className="py-2 px-4 text-center text-xs font-semibold text-zinc-700">
													Actions
												</th>
											</tr>
										</thead>
										<tbody>
											{items.map((item, index) => (
												<tr
													key={index}
													className={
														index !== items.length - 1
															? "border-b border-zinc-200"
															: ""
													}
												>
													<td className="py-2 px-4">
														<input
															type="text"
															value={item.description}
															onChange={(e) =>
																updateItem(index, "description", e.target.value)
															}
															className="w-full px-2 py-1 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
															placeholder="Item description"
														/>
													</td>
													<td className="py-2 px-4">
														<input
															type="number"
															min="0"
															step="1"
															value={item.quantity}
															onChange={(e) =>
																updateItem(index, "quantity", e.target.value)
															}
															className="w-full px-2 py-1 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
														/>
													</td>
													<td className="py-2 px-4">
														<input
															type="number"
															min="0"
															step="0.01"
															value={item.price}
															onChange={(e) =>
																updateItem(index, "price", e.target.value)
															}
															className="w-full px-2 py-1 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
														/>
													</td>
													<td className="py-2 px-4">
														<span className="text-sm font-medium text-zinc-900">
															${calculateItemTotal(item).toFixed(2)}
														</span>
													</td>
													<td className="py-2 px-4 text-center">
														{items.length > 1 && (
															<motion.button
																whileHover={{ scale: 1.1 }}
																whileTap={{ scale: 0.9 }}
																onClick={() => removeRow(index)}
																className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
															>
																<Trash2 className="w-4 h-4" />
															</motion.button>
														)}
													</td>
												</tr>
											))}
										</tbody>
										<tfoot className="bg-zinc-50 border-t-2 border-zinc-300">
											<tr>
												<td
													colSpan={3}
													className="py-3 px-4 text-sm font-semibold text-zinc-900 text-right"
												>
													Grand Total:
												</td>
												<td className="py-3 px-4 text-sm font-bold text-zinc-900">
													${calculateGrandTotal().toFixed(2)}
												</td>
												<td></td>
											</tr>
										</tfoot>
									</table>
								</div>

								{/* Notes */}
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Notes
									</label>
									<textarea
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										rows={3}
										className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
										placeholder="Additional notes or terms..."
									/>
								</div>

								{/* Signature & Footer */}
								<div className="space-y-3">
									<div>
										<label className="block text-sm font-medium text-zinc-700 mb-2">
											Signature
										</label>
										<input
											type="text"
											value={signature}
											onChange={(e) => setSignature(e.target.value)}
											className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
											placeholder="Your signature"
										/>
									</div>
									<div className="text-center text-sm text-zinc-600 space-y-1">
										<p>Cheers!</p>
										<p>Thank you for your business!</p>
									</div>
								</div>

								{/* Status */}
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Status
									</label>
									<select
										value={status}
										onChange={(e) => setStatus(e.target.value)}
										className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
									>
										<option value="unpaid">Unpaid</option>
										<option value="paid">Paid</option>
									</select>
								</div>
							</div>
						</div>

						{/* Footer */}
						<div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-200 bg-zinc-50">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={onClose}
								className="px-4 py-2 text-sm text-zinc-700 bg-white hover:bg-zinc-100 rounded-xl font-medium transition-colors border border-zinc-300"
							>
								Cancel
							</motion.button>
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={handleSave}
								disabled={isSaving}
								className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Save className="w-4 h-4" />
								{isSaving
									? "Saving..."
									: invoiceToEdit
										? "Update Invoice"
										: "Save Invoice"}
							</motion.button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default CreateInvoiceModal;
