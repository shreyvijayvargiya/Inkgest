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
} from "firebase/firestore";
import { db } from "../config/firebase";

const REPORT_ISSUES_COLLECTION = "reportIssues";

/**
 * Get all report issues from Firestore
 * @returns {Promise<Array>} Array of report issue documents
 */
export const getAllReportIssues = async () => {
	try {
		const q = query(
			collection(db, REPORT_ISSUES_COLLECTION),
			orderBy("createdAt", "desc")
		);
		const querySnapshot = await getDocs(q);
		const issues = [];

		querySnapshot.forEach((doc) => {
			issues.push({
				id: doc.id,
				...doc.data(),
			});
		});

		return issues;
	} catch (error) {
		// If orderBy fails, try without ordering
		try {
			const q = query(collection(db, REPORT_ISSUES_COLLECTION));
			const querySnapshot = await getDocs(q);
			const issues = [];

			querySnapshot.forEach((doc) => {
				issues.push({
					id: doc.id,
					...doc.data(),
				});
			});

			// Sort manually by createdAt if available
			issues.sort((a, b) => {
				if (!a.createdAt && !b.createdAt) return 0;
				if (!a.createdAt) return 1;
				if (!b.createdAt) return -1;

				const dateA = a.createdAt?.toDate
					? a.createdAt.toDate()
					: new Date(a.createdAt);
				const dateB = b.createdAt?.toDate
					? b.createdAt.toDate()
					: new Date(b.createdAt);
				return dateB - dateA; // Descending order
			});

			return issues;
		} catch (fallbackError) {
			console.error("Error getting report issues:", fallbackError);
			throw fallbackError;
		}
	}
};

/**
 * Get a single report issue by ID
 * @param {string} id - Report issue document ID
 * @returns {Promise<Object>} Report issue document
 */
export const getReportIssueById = async (id) => {
	try {
		const docRef = doc(db, REPORT_ISSUES_COLLECTION, id);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			return {
				id: docSnap.id,
				...docSnap.data(),
			};
		} else {
			throw new Error("Report issue not found");
		}
	} catch (error) {
		console.error("Error getting report issue:", error);
		throw error;
	}
};

/**
 * Add a new report issue
 * @param {Object} issueData - Report issue data object
 * @returns {Promise<string>} Document ID of created report issue
 */
export const addReportIssue = async (issueData) => {
	try {
		const docRef = await addDoc(collection(db, REPORT_ISSUES_COLLECTION), {
			...issueData,
			status: issueData.status || "pending",
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});

		return docRef.id;
	} catch (error) {
		console.error("Error adding report issue:", error);
		throw error;
	}
};

/**
 * Update an existing report issue
 * @param {string} id - Report issue document ID
 * @param {Object} issueData - Updated report issue data
 * @returns {Promise<void>}
 */
export const updateReportIssue = async (id, issueData) => {
	try {
		const docRef = doc(db, REPORT_ISSUES_COLLECTION, id);
		await updateDoc(docRef, {
			...issueData,
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error updating report issue:", error);
		throw error;
	}
};

/**
 * Delete a report issue
 * @param {string} id - Report issue document ID
 * @returns {Promise<void>}
 */
export const deleteReportIssue = async (id) => {
	try {
		const docRef = doc(db, REPORT_ISSUES_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting report issue:", error);
		throw error;
	}
};

/**
 * Mark report issue as fixed
 * @param {string} id - Report issue document ID
 * @returns {Promise<void>}
 */
export const markIssueAsFixed = async (id) => {
	try {
		const docRef = doc(db, REPORT_ISSUES_COLLECTION, id);
		await updateDoc(docRef, {
			status: "fixed",
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error marking issue as fixed:", error);
		throw error;
	}
};

/**
 * Mark report issue as pending
 * @param {string} id - Report issue document ID
 * @returns {Promise<void>}
 */
export const markIssueAsPending = async (id) => {
	try {
		const docRef = doc(db, REPORT_ISSUES_COLLECTION, id);
		await updateDoc(docRef, {
			status: "pending",
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error marking issue as pending:", error);
		throw error;
	}
};
