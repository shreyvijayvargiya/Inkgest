/**
 * Utility functions for export operations
 */

/**
 * Format Firestore Timestamp to readable date string
 * @param {any} timestamp - Firestore Timestamp or Date object
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp) => {
	if (!timestamp) return "";

	try {
		let date;
		if (timestamp?.toDate && typeof timestamp.toDate === "function") {
			date = timestamp.toDate();
		} else if (timestamp instanceof Date) {
			date = timestamp;
		} else if (typeof timestamp === "string") {
			date = new Date(timestamp);
		} else if (timestamp?.seconds) {
			date = new Date(timestamp.seconds * 1000);
		} else {
			return "";
		}

		if (isNaN(date.getTime())) {
			return "";
		}

		return date.toLocaleString("en-US", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	} catch (error) {
		console.error("Error formatting date:", error);
		return "";
	}
};

/**
 * Format date to ISO string
 * @param {any} timestamp - Firestore Timestamp or Date object
 * @returns {string} ISO date string
 */
export const formatDateISO = (timestamp) => {
	if (!timestamp) return "";

	try {
		let date;
		if (timestamp?.toDate && typeof timestamp.toDate === "function") {
			date = timestamp.toDate();
		} else if (timestamp instanceof Date) {
			date = timestamp;
		} else if (typeof timestamp === "string") {
			date = new Date(timestamp);
		} else if (timestamp?.seconds) {
			date = new Date(timestamp.seconds * 1000);
		} else {
			return "";
		}

		if (isNaN(date.getTime())) {
			return "";
		}

		return date.toISOString();
	} catch (error) {
		console.error("Error formatting date to ISO:", error);
		return "";
	}
};

/**
 * Clean and flatten object for export
 * @param {Object} obj - Object to clean
 * @param {string} prefix - Prefix for nested keys
 * @returns {Object} Flattened object
 */
export const flattenObject = (obj, prefix = "") => {
	const flattened = {};

	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			const newKey = prefix ? `${prefix}.${key}` : key;
			const value = obj[key];

			if (value === null || value === undefined) {
				flattened[newKey] = "";
			} else if (value instanceof Date || (value?.toDate && typeof value.toDate === "function")) {
				flattened[newKey] = formatDate(value);
			} else if (typeof value === "object" && !Array.isArray(value)) {
				Object.assign(flattened, flattenObject(value, newKey));
			} else if (Array.isArray(value)) {
				flattened[newKey] = value.map((item) => 
					typeof item === "object" ? JSON.stringify(item) : String(item)
				).join("; ");
			} else {
				flattened[newKey] = String(value);
			}
		}
	}

	return flattened;
};

/**
 * Strip HTML tags from content
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
export const stripHTML = (html) => {
	if (!html) return "";
	if (typeof window === "undefined") {
		// Server-side: simple regex approach
		return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
	}
	const tmp = document.createElement("DIV");
	tmp.innerHTML = html;
	return tmp.textContent || tmp.innerText || "";
};

/**
 * Truncate text to max length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
	if (!text) return "";
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength) + "...";
};
