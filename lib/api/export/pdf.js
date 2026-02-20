import { jsPDF } from "jspdf";
import { formatDate, stripHTML, truncateText } from "./utils";

/**
 * Export data to PDF
 * @param {Array} data - Array of objects to export
 * @param {Object} options - Export options
 * @param {string} options.title - PDF title
 * @param {Array} options.fields - Fields to include
 * @param {Object} options.fieldMap - Field name mappings
 * @param {number} options.maxRowsPerPage - Maximum rows per page
 * @returns {Blob} PDF blob
 */
export const exportToPDF = (data, options = {}) => {
	if (!data || !Array.isArray(data) || data.length === 0) {
		throw new Error("No data to export");
	}

	const {
		title = "Export Report",
		fields = null,
		fieldMap = {},
		maxRowsPerPage = 25,
	} = options;

	const doc = new jsPDF();
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 15;
	const startY = 20;
	let currentY = startY;

	// Get all keys
	let allKeys = [];
	if (fields) {
		allKeys = fields;
	} else {
		const keySet = new Set();
		data.forEach((item) => {
			Object.keys(item).forEach((key) => keySet.add(key));
		});
		allKeys = Array.from(keySet);
	}

	// Filter out complex objects and arrays
	allKeys = allKeys.filter((key) => {
		const sampleValue = data[0]?.[key];
		return (
			sampleValue !== null &&
			sampleValue !== undefined &&
			typeof sampleValue !== "object"
		);
	});

	// Title
	doc.setFontSize(18);
	doc.setFont("helvetica", "bold");
	doc.text(title, margin, currentY);
	currentY += 10;

	// Date
	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.text(`Generated: ${new Date().toLocaleString()}`, margin, currentY);
	currentY += 10;

	// Table headers
	const colWidth = (pageWidth - 2 * margin) / allKeys.length;
	const headerHeight = 8;

	doc.setFontSize(9);
	doc.setFont("helvetica", "bold");
	doc.setFillColor(240, 240, 240);
	doc.rect(margin, currentY, pageWidth - 2 * margin, headerHeight, "F");

	allKeys.forEach((key, index) => {
		const x = margin + index * colWidth;
		const headerText = fieldMap[key] || key;
		doc.text(headerText.substring(0, 20), x + 2, currentY + 6);
	});

	currentY += headerHeight + 2;

	// Table rows
	doc.setFontSize(8);
	doc.setFont("helvetica", "normal");
	const rowHeight = 7;

	data.forEach((row, rowIndex) => {
		// Check if we need a new page
		if (currentY + rowHeight > pageHeight - margin) {
			doc.addPage();
			currentY = startY;

			// Redraw headers
			doc.setFontSize(9);
			doc.setFont("helvetica", "bold");
			doc.setFillColor(240, 240, 240);
			doc.rect(margin, currentY, pageWidth - 2 * margin, headerHeight, "F");
			allKeys.forEach((key, index) => {
				const x = margin + index * colWidth;
				const headerText = fieldMap[key] || key;
				doc.text(headerText.substring(0, 20), x + 2, currentY + 6);
			});
			currentY += headerHeight + 2;
			doc.setFontSize(8);
			doc.setFont("helvetica", "normal");
		}

		// Draw row
		allKeys.forEach((key, colIndex) => {
			const x = margin + colIndex * colWidth;
			let value = row[key] || "";

			// Format value
			if (value?.toDate && typeof value.toDate === "function") {
				value = formatDate(value);
			} else if (value instanceof Date) {
				value = formatDate(value);
			} else if (
				typeof value === "string" &&
				(key.includes("content") || key.includes("html"))
			) {
				value = stripHTML(value);
				value = truncateText(value, 50);
			}

			value = String(value).substring(0, 25);
			doc.text(value, x + 2, currentY + 5);
		});

		currentY += rowHeight;
	});

	return doc.output("blob");
};

/**
 * Download PDF file
 * @param {Blob} pdfBlob - PDF blob
 * @param {string} filename - Filename for download
 */
export const downloadPDF = (pdfBlob, filename = "export.pdf") => {
	const url = URL.createObjectURL(pdfBlob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

/**
 * Export data to PDF with predefined settings
 * @param {string} dataType - Type of data
 * @param {Array} data - Data array
 * @returns {Blob} PDF blob
 */
export const exportDataToPDF = (dataType, data) => {
	const titles = {
		blogs: "Blog Posts Export",
		emails: "Email Campaigns Export",
		subscribers: "Subscribers Export",
		users: "Users Export",
		customers: "Customers Export",
		payments: "Payments Export",
		invoices: "Invoices Export",
		messages: "Messages Export",
		waitlist: "Waitlist Export",
		analytics: "Analytics Export",
	};

	return exportToPDF(data, {
		title: titles[dataType] || "Data Export",
	});
};
