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

const INVOICES_COLLECTION = "invoices";

/**
 * Get all invoices from Firestore
 * @returns {Promise<Array>} Array of invoice documents
 */
export const getAllInvoices = async () => {
	try {
		const q = query(
			collection(db, INVOICES_COLLECTION),
			orderBy("createdAt", "desc")
		);
		const querySnapshot = await getDocs(q);
		const invoices = [];

		querySnapshot.forEach((doc) => {
			invoices.push({
				id: doc.id,
				...doc.data(),
			});
		});

		return invoices;
	} catch (error) {
		// If orderBy fails (e.g., missing index), try without ordering
		try {
			const q = query(collection(db, INVOICES_COLLECTION));
			const querySnapshot = await getDocs(q);
			const invoices = [];

			querySnapshot.forEach((doc) => {
				invoices.push({
					id: doc.id,
					...doc.data(),
				});
			});

			// Sort manually by createdAt if available
			invoices.sort((a, b) => {
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

			return invoices;
		} catch (fallbackError) {
			console.error("Error getting invoices:", fallbackError);
			throw fallbackError;
		}
	}
};

/**
 * Get a single invoice by ID
 * @param {string} id - Invoice document ID
 * @returns {Promise<Object>} Invoice document
 */
export const getInvoiceById = async (id) => {
	try {
		const docRef = doc(db, INVOICES_COLLECTION, id);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			return {
				id: docSnap.id,
				...docSnap.data(),
			};
		} else {
			throw new Error("Invoice not found");
		}
	} catch (error) {
		console.error("Error getting invoice:", error);
		throw error;
	}
};

/**
 * Create a new invoice
 * @param {Object} invoiceData - Invoice data object
 * @returns {Promise<string>} Document ID of created invoice
 */
export const createInvoice = async (invoiceData) => {
	try {
		const docRef = await addDoc(collection(db, INVOICES_COLLECTION), {
			...invoiceData,
			status: invoiceData.status || "unpaid",
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});

		return docRef.id;
	} catch (error) {
		console.error("Error creating invoice:", error);
		throw error;
	}
};

/**
 * Update an existing invoice
 * @param {string} id - Invoice document ID
 * @param {Object} invoiceData - Updated invoice data
 * @returns {Promise<void>}
 */
export const updateInvoice = async (id, invoiceData) => {
	try {
		const docRef = doc(db, INVOICES_COLLECTION, id);
		await updateDoc(docRef, {
			...invoiceData,
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error updating invoice:", error);
		throw error;
	}
};

/**
 * Delete an invoice
 * @param {string} id - Invoice document ID
 * @returns {Promise<void>}
 */
export const deleteInvoice = async (id) => {
	try {
		const docRef = doc(db, INVOICES_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting invoice:", error);
		throw error;
	}
};

/**
 * Mark invoice as paid
 * @param {string} id - Invoice document ID
 * @returns {Promise<void>}
 */
export const markInvoiceAsPaid = async (id) => {
	try {
		const docRef = doc(db, INVOICES_COLLECTION, id);
		await updateDoc(docRef, {
			status: "paid",
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error marking invoice as paid:", error);
		throw error;
	}
};

/**
 * Mark invoice as unpaid
 * @param {string} id - Invoice document ID
 * @returns {Promise<void>}
 */
export const markInvoiceAsUnpaid = async (id) => {
	try {
		const docRef = doc(db, INVOICES_COLLECTION, id);
		await updateDoc(docRef, {
			status: "unpaid",
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error marking invoice as unpaid:", error);
		throw error;
	}
};
