import {
	collection,
	doc,
	getDoc,
	getDocs,
	addDoc,
	deleteDoc,
	query,
	orderBy,
	serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const WAITLIST_COLLECTION = "waitlist";

/**
 * Get all waitlist entries from Firestore
 * @returns {Promise<Array>} Array of waitlist documents
 */
export const getAllWaitlist = async () => {
	try {
		const q = query(
			collection(db, WAITLIST_COLLECTION),
			orderBy("createdAt", "desc")
		);
		const querySnapshot = await getDocs(q);
		const waitlist = [];

		querySnapshot.forEach((doc) => {
			waitlist.push({
				id: doc.id,
				...doc.data(),
			});
		});

		return waitlist;
	} catch (error) {
		// If orderBy fails, try without ordering
		try {
			const q = query(collection(db, WAITLIST_COLLECTION));
			const querySnapshot = await getDocs(q);
			const waitlist = [];

			querySnapshot.forEach((doc) => {
				waitlist.push({
					id: doc.id,
					...doc.data(),
				});
			});

			// Sort manually by createdAt if available
			waitlist.sort((a, b) => {
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

			return waitlist;
		} catch (fallbackError) {
			console.error("Error getting waitlist:", fallbackError);
			throw fallbackError;
		}
	}
};

/**
 * Get a single waitlist entry by ID
 * @param {string} id - Waitlist document ID
 * @returns {Promise<Object>} Waitlist document
 */
export const getWaitlistById = async (id) => {
	try {
		const docRef = doc(db, WAITLIST_COLLECTION, id);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			return {
				id: docSnap.id,
				...docSnap.data(),
			};
		} else {
			throw new Error("Waitlist entry not found");
		}
	} catch (error) {
		console.error("Error getting waitlist entry:", error);
		throw error;
	}
};

/**
 * Add a new waitlist entry
 * @param {Object} waitlistData - Waitlist data object
 * @returns {Promise<string>} Document ID of created waitlist entry
 */
export const addWaitlistEntry = async (waitlistData) => {
	try {
		const docRef = await addDoc(collection(db, WAITLIST_COLLECTION), {
			...waitlistData,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});

		return docRef.id;
	} catch (error) {
		console.error("Error adding waitlist entry:", error);
		throw error;
	}
};

/**
 * Delete a waitlist entry
 * @param {string} id - Waitlist document ID
 * @returns {Promise<void>}
 */
export const deleteWaitlistEntry = async (id) => {
	try {
		const docRef = doc(db, WAITLIST_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting waitlist entry:", error);
		throw error;
	}
};
