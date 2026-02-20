import { formatDateISO, flattenObject } from "./utils";

/**
 * Convert array of objects to JSON string with formatting
 * @param {Array} data - Array of objects to convert
 * @param {Object} options - Export options
 * @param {boolean} options.pretty - Pretty print JSON
 * @param {boolean} options.flatten - Flatten nested objects
 * @returns {string} JSON string
 */
export const convertToJSON = (data, options = {}) => {
	if (!data || !Array.isArray(data)) {
		return "[]";
	}

	const {
		pretty = true,
		flatten = false,
	} = options;

	// Process data
	let processedData = data.map((item) => {
		// Convert Firestore timestamps to ISO strings
		const processed = { ...item };
		
		for (const key in processed) {
			if (processed.hasOwnProperty(key)) {
				const value = processed[key];
				
				// Handle Firestore Timestamps
				if (value?.toDate && typeof value.toDate === "function") {
					processed[key] = formatDateISO(value);
				} else if (value instanceof Date) {
					processed[key] = formatDateISO(value);
				} else if (value?.seconds) {
					processed[key] = formatDateISO(value);
				} else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
					// Recursively process nested objects
					const nested = convertToJSON([value], { pretty: false, flatten });
					try {
						processed[key] = JSON.parse(nested)[0] || value;
					} catch {
						processed[key] = value;
					}
				}
			}
		}

		return flatten ? flattenObject(processed) : processed;
	});

	if (pretty) {
		return JSON.stringify(processedData, null, 2);
	}

	return JSON.stringify(processedData);
};

/**
 * Download JSON file
 * @param {string} jsonContent - JSON string content
 * @param {string} filename - Filename for download
 */
export const downloadJSON = (jsonContent, filename = "export.json") => {
	if (!jsonContent) {
		throw new Error("JSON content is required");
	}

	const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename.endsWith(".json") ? filename : `${filename}.json`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

/**
 * Export data to JSON
 * @param {Array} data - Data array
 * @param {Object} options - Export options
 * @returns {string} JSON content
 */
export const exportDataToJSON = (data, options = {}) => {
	return convertToJSON(data, options);
};
