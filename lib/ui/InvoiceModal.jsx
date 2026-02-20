import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, FileText } from "lucide-react";
import { jsPDF } from "jspdf";

const InvoiceModal = ({ isOpen, onClose, payment }) => {
	if (!isOpen || !payment) return null;

	const formatDate = (date) => {
		if (!date) return "";

		let d;
		try {
			if (date?.toDate && typeof date.toDate === "function") {
				d = date.toDate();
			} else if (date instanceof Date) {
				d = date;
			} else {
				d = new Date(date);
			}

			if (isNaN(d.getTime())) {
				return "";
			}

			return d.toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
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

	const downloadInvoicePDF = () => {
		const doc = new jsPDF();
		const pageWidth = doc.internal.pageSize.getWidth();
		const pageHeight = doc.internal.pageSize.getHeight();
		const margin = 20;
		let yPos = margin;

		// Invoice Title
		doc.setFontSize(24);
		doc.setFont("helvetica", "bold");
		doc.text("INVOICE", pageWidth - margin, yPos, { align: "right" });
		yPos += 15;

		// Invoice Number
		doc.setFontSize(12);
		doc.setFont("helvetica", "normal");
		doc.text(
			`Invoice #: ${payment.paymentId || payment.id}`,
			pageWidth - margin,
			yPos,
			{ align: "right" }
		);
		yPos += 8;

		// Date
		doc.text(
			`Date: ${formatDate(payment.createdAt)}`,
			pageWidth - margin,
			yPos,
			{ align: "right" }
		);
		yPos += 20;

		// From Section
		doc.setFontSize(14);
		doc.setFont("helvetica", "bold");
		doc.text("From:", margin, yPos);
		yPos += 8;
		doc.setFontSize(10);
		doc.setFont("helvetica", "normal");
		doc.text("Your Company Name", margin, yPos);
		yPos += 5;
		doc.text("Your Company Address", margin, yPos);
		yPos += 5;
		doc.text("City, State, ZIP", margin, yPos);
		yPos += 15;

		// To Section
		doc.setFontSize(14);
		doc.setFont("helvetica", "bold");
		doc.text("To:", margin, yPos);
		yPos += 8;
		doc.setFontSize(10);
		doc.setFont("helvetica", "normal");
		doc.text(payment.customerName || "N/A", margin, yPos);
		yPos += 5;
		doc.text(payment.customerEmail || "N/A", margin, yPos);
		yPos += 15;

		// Line items table header
		doc.setFontSize(12);
		doc.setFont("helvetica", "bold");
		doc.text("Description", margin, yPos);
		doc.text("Amount", pageWidth - margin, yPos, { align: "right" });
		yPos += 8;

		// Line
		doc.setLineWidth(0.5);
		doc.line(margin, yPos, pageWidth - margin, yPos);
		yPos += 8;

		// Line item
		doc.setFontSize(10);
		doc.setFont("helvetica", "normal");
		const description = `${payment.planName || "Plan"} - ${payment.paymentType === "subscription" ? "Subscription" : "Payment"}`;
		doc.text(description, margin, yPos);
		const amount = payment.amount
			? formatCurrency(payment.amount, payment.currency)
			: formatCurrency(0, payment.currency);
		doc.text(amount, pageWidth - margin, yPos, { align: "right" });
		yPos += 10;

		// Line
		doc.line(margin, yPos, pageWidth - margin, yPos);
		yPos += 10;

		// Total
		doc.setFontSize(12);
		doc.setFont("helvetica", "bold");
		doc.text("Total:", pageWidth - margin - 50, yPos);
		doc.text(amount, pageWidth - margin, yPos, { align: "right" });
		yPos += 15;

		// Status
		doc.setFontSize(10);
		doc.setFont("helvetica", "normal");
		doc.text(`Status: ${payment.status || ""}`, margin, yPos);
		yPos += 8;

		// Payment ID
		doc.text(`Payment ID: ${payment.paymentId || payment.id}`, margin, yPos);
		yPos += 8;

		// Subscription ID (if available)
		if (payment.subscriptionId) {
			doc.text(`Subscription ID: ${payment.subscriptionId}`, margin, yPos);
		}

		// Footer
		const footerY = pageHeight - 20;
		doc.setFontSize(8);
		doc.setFont("helvetica", "italic");
		doc.text("Thank you for your business!", pageWidth / 2, footerY, {
			align: "center",
		});

		// Save PDF
		const fileName = `invoice-${payment.paymentId || payment.id}.pdf`;
		doc.save(fileName);
	};

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
						className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
					>
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b border-zinc-200">
							<div className="flex items-center gap-3">
								<div className="p-2 rounded-full bg-zinc-100 text-zinc-600">
									<FileText className="w-5 h-5" />
								</div>
								<h3 className="text-lg text-zinc-900">Invoice</h3>
							</div>
							<div className="flex items-center gap-2">
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									onClick={downloadInvoicePDF}
									className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
									title="Download PDF"
								>
									<Download className="w-5 h-5" />
								</motion.button>
								<button
									onClick={onClose}
									className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
						</div>

						{/* Body */}
						<div className="p-6 overflow-y-auto flex-1">
							<div className="space-y-6">
								{/* Invoice Header */}
								<div className="flex justify-between items-start border-b border-zinc-200 pb-4">
									<div>
										<h2 className="text-2xl font-bold text-zinc-900 mb-2">
											INVOICE
										</h2>
										<p className="text-sm text-zinc-600">
											Invoice #:{" "}
											<span className="font-mono">
												{payment.paymentId || payment.id}
											</span>
										</p>
										<p className="text-sm text-zinc-600">
											Date: {formatDate(payment.createdAt)}
										</p>
									</div>
									<div className="text-right">
										<p className="text-sm text-zinc-600 mb-1">Status</p>
										<span
											className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
												payment.status === "succeeded"
													? "bg-green-100 text-green-800"
													: payment.status === "failed"
														? "bg-red-100 text-red-800"
														: "bg-yellow-100 text-yellow-800"
											}`}
										>
											{payment.status || ""}
										</span>
									</div>
								</div>

								{/* From/To Section */}
								<div className="grid grid-cols-2 gap-6">
									<div>
										<h3 className="text-sm font-semibold text-zinc-900 mb-2">
											From
										</h3>
										<div className="text-sm text-zinc-600 space-y-1">
											<p>Your Company Name</p>
											<p>Your Company Address</p>
											<p>City, State, ZIP</p>
										</div>
									</div>
									<div>
										<h3 className="text-sm font-semibold text-zinc-900 mb-2">
											To
										</h3>
										<div className="text-sm text-zinc-600 space-y-1">
											<p className="font-medium text-zinc-900">
												{payment.customerName || ""}
											</p>
											<p>{payment.customerEmail || ""}</p>
										</div>
									</div>
								</div>

								{/* Items Table */}
								<div className="border border-zinc-200 rounded-xl overflow-hidden">
									<table className="w-full">
										<thead className="bg-zinc-50">
											<tr>
												<th className="py-3 px-4 text-left text-xs font-semibold text-zinc-700">
													Description
												</th>
												<th className="py-3 px-4 text-right text-xs font-semibold text-zinc-700">
													Amount
												</th>
											</tr>
										</thead>
										<tbody>
											<tr className="border-t border-zinc-200">
												<td className="py-3 px-4 text-sm text-zinc-900">
													{payment.planName || "Plan"} -{" "}
													{payment.paymentType === "subscription"
														? "Subscription"
														: "Payment"}
												</td>
												<td className="py-3 px-4 text-sm font-semibold text-zinc-900 text-right">
													{payment.amount
														? formatCurrency(payment.amount, payment.currency)
														: "$0"}
												</td>
											</tr>
										</tbody>
										<tfoot className="bg-zinc-50 border-t-2 border-zinc-300">
											<tr>
												<td className="py-3 px-4 text-sm font-semibold text-zinc-900">
													Total
												</td>
												<td className="py-3 px-4 text-sm font-bold text-zinc-900 text-right">
													{payment.amount
														? formatCurrency(payment.amount, payment.currency)
														: "$0"}
												</td>
											</tr>
										</tfoot>
									</table>
								</div>

								{/* Additional Info */}
								<div className="border-t border-zinc-200 pt-4">
									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<p className="text-zinc-600 mb-1">Payment ID</p>
											<p className="font-mono text-zinc-900">
												{payment.paymentId || payment.id}
											</p>
										</div>
										{payment.subscriptionId && (
											<div>
												<p className="text-zinc-600 mb-1">Subscription ID</p>
												<p className="font-mono text-zinc-900">
													{payment.subscriptionId}
												</p>
											</div>
										)}
										{payment.customerId && (
											<div>
												<p className="text-zinc-600 mb-1">Customer ID</p>
												<p className="font-mono text-zinc-900">
													{payment.customerId}
												</p>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Footer */}
						<div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-200 bg-zinc-50">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={downloadInvoicePDF}
								className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl font-medium transition-colors"
							>
								<Download className="w-4 h-4" />
								Download PDF
							</motion.button>
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={onClose}
								className="px-4 py-2 text-sm text-zinc-700 bg-white hover:bg-zinc-100 rounded-xl font-medium transition-colors border border-zinc-300"
							>
								Close
							</motion.button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default InvoiceModal;
