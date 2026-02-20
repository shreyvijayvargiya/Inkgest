import {
	collection,
	doc,
	getDoc,
	getDocs,
	addDoc,
	updateDoc,
	deleteDoc,
	query,
	orderBy,
	serverTimestamp,
	Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const CHANGELOG_COLLECTION = "changelog";

/**
 * Get all changelog entries
 * @returns {Promise<Array>} Array of changelog documents
 */
export const getAllChangelogs = async () => {
	try {
		const q = query(
			collection(db, CHANGELOG_COLLECTION),
			orderBy("date", "desc")
		);

		const querySnapshot = await getDocs(q);
		const changelogs = [];

		querySnapshot.forEach((doc) => {
			const changelogData = {
				id: doc.id,
				...doc.data(),
			};
			changelogs.push(changelogData);
		});

		return changelogs;
	} catch (error) {
		console.error("Error getting changelogs:", error);
		throw error;
	}
};

/**
 * Get a single changelog by ID
 * @param {string} id - Changelog document ID
 * @returns {Promise<Object>} Changelog document
 */
export const getChangelogById = async (id) => {
	try {
		const docRef = doc(db, CHANGELOG_COLLECTION, id);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			return {
				id: docSnap.id,
				...docSnap.data(),
			};
		} else {
			throw new Error("Changelog not found");
		}
	} catch (error) {
		console.error("Error getting changelog:", error);
		throw error;
	}
};

/**
 * Create a new changelog entry
 * @param {Object} changelogData - Changelog data object
 * @param {string} changelogData.title - Changelog title
 * @param {string} changelogData.description - Changelog description
 * @param {string} changelogData.content - Changelog content (HTML/markdown)
 * @param {Date|string} changelogData.date - Changelog date
 * @param {Array<string>} changelogData.categories - Array of categories (e.g., ["New releases", "Improvements"])
 * @returns {Promise<string>} Document ID of created changelog
 */
export const createChangelog = async (changelogData) => {
	try {
		const dataToSave = {
			title: changelogData.title || "Untitled Changelog",
			description: changelogData.description || "",
			content: changelogData.content || "",
			date: changelogData.date || serverTimestamp(),
			categories: changelogData.categories || [],
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		// Convert date to Firestore Timestamp if it's a Date object
		if (changelogData.date && changelogData.date instanceof Date) {
			dataToSave.date = Timestamp.fromDate(changelogData.date);
		} else if (typeof changelogData.date === "string") {
			// If it's a string, try to parse it
			const dateObj = new Date(changelogData.date);
			if (!isNaN(dateObj.getTime())) {
				dataToSave.date = Timestamp.fromDate(dateObj);
			}
		}

		const docRef = await addDoc(
			collection(db, CHANGELOG_COLLECTION),
			dataToSave
		);

		return docRef.id;
	} catch (error) {
		console.error("Error creating changelog:", error);
		throw error;
	}
};

/**
 * Update an existing changelog
 * @param {string} id - Changelog document ID
 * @param {Object} changelogData - Updated changelog data
 * @returns {Promise<void>}
 */
export const updateChangelog = async (id, changelogData) => {
	try {
		const dataToUpdate = {
			...changelogData,
			updatedAt: serverTimestamp(),
		};

		// Convert date to Firestore Timestamp if it's a Date object
		if (changelogData.date && changelogData.date instanceof Date) {
			dataToUpdate.date = Timestamp.fromDate(changelogData.date);
		} else if (typeof changelogData.date === "string") {
			const dateObj = new Date(changelogData.date);
			if (!isNaN(dateObj.getTime())) {
				dataToUpdate.date = Timestamp.fromDate(dateObj);
			}
		}

		const docRef = doc(db, CHANGELOG_COLLECTION, id);
		await updateDoc(docRef, dataToUpdate);
	} catch (error) {
		console.error("Error updating changelog:", error);
		throw error;
	}
};

/**
 * Delete a changelog
 * @param {string} id - Changelog document ID
 * @returns {Promise<void>}
 */
export const deleteChangelog = async (id) => {
	try {
		const docRef = doc(db, CHANGELOG_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting changelog:", error);
		throw error;
	}
};
