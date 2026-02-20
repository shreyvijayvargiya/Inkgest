import { flattenObject, stripHTML, truncateText } from "./utils";

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Object} options - Export options
 * @param {Array} options.fields - Specific fields to include (optional)
 * @param {Object} options.fieldMap - Map field names to display names
 * @param {number} options.maxContentLength - Max length for content fields
 * @returns {string} CSV string
 */
export const convertToCSV = (data, options = {}) => {
	if (!data || !Array.isArray(data) || data.length === 0) {
		return "";
	}

	const { fields = null, fieldMap = {}, maxContentLength = 500 } = options;

	// Get all unique keys from all objects
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

	// Create header row with mapped names
	const headers = allKeys.map((key) => fieldMap[key] || key);

	// Create CSV rows
	const rows = data.map((item) => {
		const flattened = flattenObject(item);
		return allKeys.map((key) => {
			let value = flattened[key] || "";

			// Handle special content fields
			if (
				key.includes("content") ||
				key.includes("body") ||
				key.includes("html")
			) {
				value = stripHTML(value);
				value = truncateText(value, maxContentLength);
			}

			// Escape CSV special characters
			if (typeof value === "string") {
				// Replace newlines with spaces
				value = value.replace(/\n/g, " ").replace(/\r/g, "");
				// Escape quotes and wrap in quotes if contains comma, quote, or newline
				if (
					value.includes(",") ||
					value.includes('"') ||
					value.includes("\n")
				) {
					value = `"${value.replace(/"/g, '""')}"`;
				}
			}

			return value;
		});
	});

	// Combine headers and rows
	const csvContent = [
		headers.join(","),
		...rows.map((row) => row.join(",")),
	].join("\n");

	return csvContent;
};

/**
 * Download CSV file
 * @param {string} csvContent - CSV string content
 * @param {string} filename - Filename for download
 */
export const downloadCSV = (csvContent, filename = "export.csv") => {
	if (!csvContent) {
		throw new Error("CSV content is required");
	}

	// Add BOM for Excel compatibility
	const BOM = "\uFEFF";
	const blob = new Blob([BOM + csvContent], {
		type: "text/csv;charset=utf-8;",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

/**
 * Export data to CSV with predefined field mappings
 * @param {string} dataType - Type of data (blogs, emails, subscribers, etc.)
 * @param {Array} data - Data array
 * @returns {string} CSV content
 */
export const exportDataToCSV = (dataType, data) => {
	const fieldMappings = {
		blogs: {
			id: "ID",
			title: "Title",
			slug: "Slug",
			author: "Author",
			status: "Status",
			content: "Content Preview",
			bannerImage: "Banner Image URL",
			createdAt: "Created At",
			updatedAt: "Updated At",
			publishedAt: "Published At",
		},
		emails: {
			id: "ID",
			subject: "Subject",
			status: "Status",
			content: "Content Preview",
			recipients: "Recipients Count",
			createdAt: "Created At",
			sentAt: "Sent At",
		},
		subscribers: {
			id: "ID",
			name: "Name",
			email: "Email",
			status: "Status",
			subscribedAt: "Subscribed At",
			unsubscribedAt: "Unsubscribed At",
			createdAt: "Created At",
		},
		users: {
			id: "ID",
			email: "Email",
			displayName: "Display Name",
			emailVerified: "Email Verified",
			provider: "Provider",
			createdAt: "Created At",
			lastSignIn: "Last Sign In",
		},
		customers: {
			id: "ID",
			email: "Email",
			name: "Name",
			customerId: "Customer ID",
			subscriptionId: "Subscription ID",
			planName: "Plan Name",
			status: "Status",
			createdAt: "Created At",
		},
		payments: {
			id: "ID",
			paymentId: "Payment ID",
			customerName: "Customer Name",
			customerEmail: "Customer Email",
			amount: "Amount",
			currency: "Currency",
			status: "Status",
			planName: "Plan Name",
			createdAt: "Created At",
		},
		invoices: {
			id: "ID",
			invoiceNumber: "Invoice Number",
			clientName: "Client Name",
			clientEmail: "Client Email",
			total: "Total",
			status: "Status",
			dueDate: "Due Date",
			createdAt: "Created At",
		},
		messages: {
			id: "ID",
			name: "Name",
			email: "Email",
			subject: "Subject",
			message: "Message",
			status: "Status",
			read: "Read",
			replied: "Replied",
			createdAt: "Created At",
		},
		waitlist: {
			id: "ID",
			name: "Name",
			email: "Email",
			joinedAt: "Joined At",
			createdAt: "Created At",
		},
		analytics: {
			id: "ID",
			ip: "IP Address",
			country: "Country",
			city: "City",
			region: "Region",
			userAgent: "User Agent",
			firstVisit: "First Visit",
			lastVisit: "Last Visit",
			visitCount: "Visit Count",
		},
	};

	const fieldMap = fieldMappings[dataType] || {};
	return convertToCSV(data, { fieldMap, maxContentLength: 500 });
};
