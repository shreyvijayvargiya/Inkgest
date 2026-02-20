import { serverTimestamp } from "firebase/firestore";

/**
 * Convert various date formats to a consistent Date object
 * Handles Firestore Timestamps, Date objects, Unix timestamps, and ISO strings
 *
 * @param {any} dateValue - Date value in various formats
 * @returns {Date|null} Normalized Date object or null
 */
export function normalizeDate(dateValue) {
	if (!dateValue) return null;

	// Firestore Timestamp
	if (dateValue.toDate && typeof dateValue.toDate === "function") {
		return dateValue.toDate();
	}

	// Already a Date object
	if (dateValue instanceof Date) {
		return dateValue;
	}

	// Unix timestamp (seconds)
	if (typeof dateValue === "number") {
		return new Date(dateValue * 1000);
	}

	// ISO string or other string format
	if (typeof dateValue === "string") {
		return new Date(dateValue);
	}

	return null;
}

/**
 * Get a consistent date for Firestore storage
 * Always uses Date object for consistency, falls back to serverTimestamp()
 *
 * @param {any} dateValue - Date value in various formats
 * @returns {Date|Timestamp} Date object or serverTimestamp()
 */
export function getFirestoreDate(dateValue) {
	const normalized = normalizeDate(dateValue);
	return normalized || serverTimestamp();
}
