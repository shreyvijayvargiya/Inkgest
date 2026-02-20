import { flattenObject, stripHTML, truncateText } from "./utils";

/**
 * Export data to Excel (XLSX) format
 * Note: This requires the 'xlsx' package. Install with: npm install xlsx
 * @param {Array} data - Array of objects to export
 * @param {Object} options - Export options
 * @param {string} options.filename - Filename for download
 * @param {string} options.sheetName - Sheet name
 * @param {Array} options.fields - Fields to include
 * @param {Object} options.fieldMap - Field name mappings
 * @returns {Promise<Blob>} Excel blob
 */
export const exportToExcel = async (data, options = {}) => {
	// Dynamic import to avoid errors if xlsx is not installed
	let XLSX;
	try {
		XLSX = await import("xlsx");
	} catch (error) {
		throw new Error(
			"xlsx package is required for Excel export. Install it with: npm install xlsx"
		);
	}

	if (!data || !Array.isArray(data) || data.length === 0) {
		throw new Error("No data to export");
	}

	const {
		filename = "export.xlsx",
		sheetName = "Sheet1",
		fields = null,
		fieldMap = {},
	} = options;

	// Get all keys
	let allKeys = [];
	if (fields) {
		allKeys = fields;
	} else {
		const keySet = new Set();
		data.forEach((item) => {
			const flattened = flattenObject(item);
			Object.keys(flattened).forEach((key) => keySet.add(key));
		});
		allKeys = Array.from(keySet);
	}

	// Prepare data for Excel
	const excelData = data.map((item) => {
		const flattened = flattenObject(item);
		const row = {};

		allKeys.forEach((key) => {
			let value = flattened[key] || "";

			// Handle special content fields
			if (
				key.includes("content") ||
				key.includes("body") ||
				key.includes("html")
			) {
				value = stripHTML(value);
				value = truncateText(value, 1000);
			}

			// Use mapped field name if available
			const displayKey = fieldMap[key] || key;
			row[displayKey] = value;
		});

		return row;
	});

	// Create workbook
	const wb = XLSX.utils.book_new();

	// Create worksheet
	const ws = XLSX.utils.json_to_sheet(excelData);

	// Set column widths
	const colWidths = allKeys.map((key) => {
		const displayKey = fieldMap[key] || key;
		const maxLength = Math.max(
			displayKey.length,
			...excelData.map((row) => {
				const value = row[displayKey] || "";
				return String(value).length;
			})
		);
		return { wch: Math.min(Math.max(maxLength, 10), 50) };
	});
	ws["!cols"] = colWidths;

	// Add worksheet to workbook
	XLSX.utils.book_append_sheet(wb, ws, sheetName);

	// Generate blob
	const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
	return new Blob([excelBuffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
};

/**
 * Download Excel file
 * @param {Blob} excelBlob - Excel blob
 * @param {string} filename - Filename for download
 */
export const downloadExcel = (excelBlob, filename = "export.xlsx") => {
	const url = URL.createObjectURL(excelBlob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

/**
 * Export data to Excel with predefined settings
 * @param {string} dataType - Type of data
 * @param {Array} data - Data array
 * @returns {Promise<Blob>} Excel blob
 */
export const exportDataToExcel = async (dataType, data) => {
	const sheetNames = {
		blogs: "Blog Posts",
		emails: "Email Campaigns",
		subscribers: "Subscribers",
		users: "Users",
		customers: "Customers",
		payments: "Payments",
		invoices: "Invoices",
		messages: "Messages",
		waitlist: "Waitlist",
		analytics: "Analytics",
	};

	return exportToExcel(data, {
		sheetName: sheetNames[dataType] || "Data",
	});
};
