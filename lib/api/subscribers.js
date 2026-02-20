import {
	collection,
	doc,
	getDoc,
	getDocs,
	addDoc,
	updateDoc,
	deleteDoc,
	query,
	where,
	orderBy,
	serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const SUBSCRIBERS_COLLECTION = "subscribers";

/**
 * Get all subscribers
 * @param {string} status - Optional: 'active' or 'unsubscribed' to filter by status
 * @returns {Promise<Array>} Array of subscriber documents
 */
export const getAllSubscribers = async (status = null) => {
	try {
		let q;

		if (status) {
			// When filtering by status, we can't use orderBy without a composite index
			// So we'll fetch and sort in memory instead
			q = query(
				collection(db, SUBSCRIBERS_COLLECTION),
				where("status", "==", status)
			);
		} else {
			// When not filtering, we can use orderBy
			q = query(
				collection(db, SUBSCRIBERS_COLLECTION),
				orderBy("subscribedAt", "desc")
			);
		}

		const querySnapshot = await getDocs(q);
		const subscribers = [];

		querySnapshot.forEach((doc) => {
			subscribers.push({
				id: doc.id,
				...doc.data(),
			});
		});

		// Sort in memory if we filtered by status (to avoid composite index requirement)
		if (status) {
			subscribers.sort((a, b) => {
				const dateA = a.subscribedAt?.toDate
					? a.subscribedAt.toDate()
					: new Date(a.subscribedAt || 0);
				const dateB = b.subscribedAt?.toDate
					? b.subscribedAt.toDate()
					: new Date(b.subscribedAt || 0);
				return dateB - dateA; // Descending order (newest first)
			});
		}

		return subscribers;
	} catch (error) {
		console.error("Error getting subscribers:", error);
		throw error;
	}
};

/**
 * Get active subscribers only
 * @returns {Promise<Array>} Array of active subscriber documents
 */
export const getActiveSubscribers = async () => {
	return getAllSubscribers("active");
};

/**
 * Get a single subscriber by ID
 * @param {string} id - Subscriber document ID
 * @returns {Promise<Object>} Subscriber document
 */
export const getSubscriberById = async (id) => {
	try {
		const docRef = doc(db, SUBSCRIBERS_COLLECTION, id);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			return {
				id: docSnap.id,
				...docSnap.data(),
			};
		} else {
			throw new Error("Subscriber not found");
		}
	} catch (error) {
		console.error("Error getting subscriber:", error);
		throw error;
	}
};

/**
 * Get subscriber by email
 * @param {string} email - Subscriber email
 * @returns {Promise<Object|null>} Subscriber document or null
 */
export const getSubscriberByEmail = async (email) => {
	try {
		const q = query(
			collection(db, SUBSCRIBERS_COLLECTION),
			where("email", "==", email)
		);

		const querySnapshot = await getDocs(q);

		if (!querySnapshot.empty) {
			const doc = querySnapshot.docs[0];
			return {
				id: doc.id,
				...doc.data(),
			};
		}

		return null;
	} catch (error) {
		console.error("Error getting subscriber by email:", error);
		throw error;
	}
};

/**
 * Add a new subscriber
 * @param {Object} subscriberData - Subscriber data object
 * @param {string} subscriberData.email - Subscriber email
 * @param {string} subscriberData.name - Subscriber name (optional)
 * @returns {Promise<string>} Document ID of created subscriber
 */
export const addSubscriber = async (subscriberData) => {
	try {
		// Check if subscriber already exists
		const existing = await getSubscriberByEmail(subscriberData.email);

		if (existing) {
			// Update existing subscriber to active
			if (existing.status === "unsubscribed") {
				await updateSubscriber(existing.id, {
					status: "active",
					subscribedAt: serverTimestamp(),
				});
				return existing.id;
			}
			throw new Error("Subscriber already exists");
		}

		const docRef = await addDoc(collection(db, SUBSCRIBERS_COLLECTION), {
			email: subscriberData.email,
			name: subscriberData.name || subscriberData.email.split("@")[0],
			status: "active",
			subscribedAt: serverTimestamp(),
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});

		return docRef.id;
	} catch (error) {
		console.error("Error adding subscriber:", error);
		throw error;
	}
};

/**
 * Update an existing subscriber
 * @param {string} id - Subscriber document ID
 * @param {Object} subscriberData - Updated subscriber data
 * @returns {Promise<void>}
 */
export const updateSubscriber = async (id, subscriberData) => {
	try {
		const docRef = doc(db, SUBSCRIBERS_COLLECTION, id);
		await updateDoc(docRef, {
			...subscriberData,
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error updating subscriber:", error);
		throw error;
	}
};

/**
 * Delete a subscriber
 * @param {string} id - Subscriber document ID
 * @returns {Promise<void>}
 */
export const deleteSubscriber = async (id) => {
	try {
		const docRef = doc(db, SUBSCRIBERS_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting subscriber:", error);
		throw error;
	}
};

/**
 * Unsubscribe a subscriber
 * @param {string} id - Subscriber document ID
 * @returns {Promise<void>}
 */
export const unsubscribeSubscriber = async (id) => {
	try {
		const docRef = doc(db, SUBSCRIBERS_COLLECTION, id);
		await updateDoc(docRef, {
			status: "unsubscribed",
			unsubscribedAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error unsubscribing subscriber:", error);
		throw error;
	}
};
