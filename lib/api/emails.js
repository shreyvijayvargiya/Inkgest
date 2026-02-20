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

const EMAILS_COLLECTION = "emails";

/**
 * Get all emails
 * @returns {Promise<Array>} Array of email documents
 */
export const getAllEmails = async () => {
	try {
		const q = query(
			collection(db, EMAILS_COLLECTION),
			orderBy("createdAt", "desc")
		);

		const querySnapshot = await getDocs(q);
		const emails = [];

		querySnapshot.forEach((doc) => {
			emails.push({
				id: doc.id,
				...doc.data(),
			});
		});

		return emails;
	} catch (error) {
		console.error("Error getting emails:", error);
		throw error;
	}
};

/**
 * Get a single email by ID
 * @param {string} id - Email document ID
 * @returns {Promise<Object>} Email document
 */
export const getEmailById = async (id) => {
	try {
		const docRef = doc(db, EMAILS_COLLECTION, id);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			return {
				id: docSnap.id,
				...docSnap.data(),
			};
		} else {
			throw new Error("Email not found");
		}
	} catch (error) {
		console.error("Error getting email:", error);
		throw error;
	}
};

/**
 * Create a new email
 * @param {Object} emailData - Email data object
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.content - Email content (HTML)
 * @param {string} emailData.status - Email status: 'draft' or 'published' (default: 'draft')
 * @returns {Promise<string>} Document ID of created email
 */
export const createEmail = async (emailData) => {
	try {
		const dataToSave = {
			...emailData,
			status: emailData.status || "draft",
			recipients: 0,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		// Convert scheduledDate to Firestore Timestamp if it's a Date
		if (emailData.scheduledDate && emailData.scheduledDate instanceof Date) {
			dataToSave.scheduledDate = Timestamp.fromDate(emailData.scheduledDate);
		}

		const docRef = await addDoc(collection(db, EMAILS_COLLECTION), dataToSave);

		return docRef.id;
	} catch (error) {
		console.error("Error creating email:", error);
		throw error;
	}
};

/**
 * Update an existing email
 * @param {string} id - Email document ID
 * @param {Object} emailData - Updated email data
 * @returns {Promise<void>}
 */
export const updateEmail = async (id, emailData) => {
	try {
		const dataToUpdate = {
			...emailData,
			updatedAt: serverTimestamp(),
		};

		// Convert scheduledDate to Firestore Timestamp if it's a Date
		if (emailData.scheduledDate && emailData.scheduledDate instanceof Date) {
			dataToUpdate.scheduledDate = Timestamp.fromDate(emailData.scheduledDate);
		}

		const docRef = doc(db, EMAILS_COLLECTION, id);
		await updateDoc(docRef, dataToUpdate);
	} catch (error) {
		console.error("Error updating email:", error);
		throw error;
	}
};

/**
 * Delete an email
 * @param {string} id - Email document ID
 * @returns {Promise<void>}
 */
export const deleteEmail = async (id) => {
	try {
		const docRef = doc(db, EMAILS_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting email:", error);
		throw error;
	}
};

/**
 * Mark email as published (sent)
 * @param {string} id - Email document ID
 * @param {number} recipients - Number of recipients
 * @returns {Promise<void>}
 */
export const markEmailAsSent = async (id, recipients) => {
	try {
		const docRef = doc(db, EMAILS_COLLECTION, id);
		await updateDoc(docRef, {
			status: "published",
			recipients: recipients,
			publishedAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error marking email as sent:", error);
		throw error;
	}
};
