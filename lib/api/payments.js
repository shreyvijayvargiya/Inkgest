import {
	collection,
	getDocs,
	query,
	orderBy,
	doc,
	deleteDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

const PAYMENTS_COLLECTION = "payments";

/**
 * Get all payments from Firestore
 * @returns {Promise<Array>} Array of payment documents
 */
export const getAllPayments = async () => {
	try {
		// Try to get payments ordered by createdAt
		let q = query(
			collection(db, PAYMENTS_COLLECTION),
			orderBy("createdAt", "desc")
		);

		let querySnapshot;
		let orderByFailed = false;
		try {
			querySnapshot = await getDocs(q);
		} catch (orderError) {
			// If orderBy fails (e.g., missing index or createdAt field), get all without ordering
			console.warn(
				"Error ordering by createdAt, fetching all payments:",
				orderError
			);
			orderByFailed = true;
			q = query(collection(db, PAYMENTS_COLLECTION));
			querySnapshot = await getDocs(q);
		}

		const payments = [];
		querySnapshot.forEach((doc) => {
			const data = doc.data();
			payments.push({
				id: doc.id,
				...data,
			});
		});

		// Sort manually if orderBy failed or if some payments don't have createdAt
		if (orderByFailed || payments.some((p) => !p.createdAt)) {
			payments.sort((a, b) => {
				// Handle missing createdAt - put them at the end
				if (!a.createdAt && !b.createdAt) return 0;
				if (!a.createdAt) return 1;
				if (!b.createdAt) return -1;

				// Normalize dates
				let dateA, dateB;
				try {
					dateA = a.createdAt?.toDate
						? a.createdAt.toDate()
						: new Date(a.createdAt);
					dateB = b.createdAt?.toDate
						? b.createdAt.toDate()
						: new Date(b.createdAt);

					// Validate dates
					if (isNaN(dateA.getTime())) dateA = new Date(0);
					if (isNaN(dateB.getTime())) dateB = new Date(0);
				} catch (error) {
					console.warn("Error parsing date for payment:", a.id || b.id, error);
					return 0;
				}

				return dateB - dateA; // Descending order
			});
		}

		return payments;
	} catch (error) {
		console.error("Error getting payments:", error);
		throw error;
	}
};

/**
 * Delete a payment from Firestore
 * @param {string} id - Payment document ID
 * @returns {Promise<void>}
 */
export const deletePayment = async (id) => {
	try {
		const docRef = doc(db, PAYMENTS_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting payment:", error);
		throw error;
	}
};
