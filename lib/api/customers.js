import {
	collection,
	doc,
	getDoc,
	getDocs,
	query,
	where,
	orderBy,
} from "firebase/firestore";
import { db } from "../config/firebase";

const CUSTOMERS_COLLECTION = "customers";

/**
 * Get customer by email
 * @param {string} email - Customer email
 * @returns {Promise<Object|null>} Customer document or null
 */
export const getCustomerByEmail = async (email) => {
	try {
		const q = query(
			collection(db, CUSTOMERS_COLLECTION),
			where("email", "==", email)
		);
		const querySnapshot = await getDocs(q);

		if (querySnapshot.empty) {
			return null;
		}

		const customerDoc = querySnapshot.docs[0];
		return {
			id: customerDoc.id,
			...customerDoc.data(),
		};
	} catch (error) {
		console.error("Error getting customer by email:", error);
		throw error;
	}
};

/**
 * Get customer by customer ID
 * @param {string} customerId - Customer ID from Polar
 * @returns {Promise<Object|null>} Customer document or null
 */
export const getCustomerById = async (customerId) => {
	try {
		const q = query(
			collection(db, CUSTOMERS_COLLECTION),
			where("customerId", "==", customerId)
		);
		const querySnapshot = await getDocs(q);

		if (querySnapshot.empty) {
			return null;
		}

		const customerDoc = querySnapshot.docs[0];
		return {
			id: customerDoc.id,
			...customerDoc.data(),
		};
	} catch (error) {
		console.error("Error getting customer by ID:", error);
		throw error;
	}
};

/**
 * Convert Firestore Timestamp to ISO string (serializable)
 * @param {any} timestamp - Firestore Timestamp, Date, or null
 * @returns {string|null} ISO string or null
 */
const convertTimestamp = (timestamp) => {
	if (!timestamp) return null;

	// If it's a Firestore Timestamp, convert it
	if (timestamp.toDate && typeof timestamp.toDate === "function") {
		return timestamp.toDate().toISOString();
	}

	// If it's already a Date object
	if (timestamp instanceof Date) {
		return timestamp.toISOString();
	}

	// If it's already a string, return as is
	if (typeof timestamp === "string") {
		return timestamp;
	}

	// Try to convert to Date and then ISO string
	try {
		return new Date(timestamp).toISOString();
	} catch (error) {
		console.error("Error converting timestamp:", error);
		return null;
	}
};

/**
 * Get all customers from Firestore
 * @returns {Promise<Array>} Array of customer documents
 */
export const getAllCustomers = async () => {
	try {
		const q = query(
			collection(db, CUSTOMERS_COLLECTION),
			orderBy("createdAt", "desc")
		);
		const querySnapshot = await getDocs(q);
		const customers = [];

		querySnapshot.forEach((doc) => {
			customers.push({
				id: doc.id,
				...doc.data(),
			});
		});

		return customers;
	} catch (error) {
		// If orderBy fails (e.g., missing index), try without ordering
		try {
			const q = query(collection(db, CUSTOMERS_COLLECTION));
			const querySnapshot = await getDocs(q);
			const customers = [];

			querySnapshot.forEach((doc) => {
				customers.push({
					id: doc.id,
					...doc.data(),
				});
			});

			// Sort manually by createdAt if available
			customers.sort((a, b) => {
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

			return customers;
		} catch (fallbackError) {
			console.error("Error getting customers:", fallbackError);
			throw fallbackError;
		}
	}
};

/**
 * Get customer subscription status
 * @param {string} email - Customer email
 * @returns {Promise<Object>} Subscription status object
 */
export const getCustomerSubscription = async (email) => {
	try {
		const customer = await getCustomerByEmail(email);
		if (!customer) {
			return {
				isSubscribed: false,
				planName: null,
				status: null,
			};
		}

		return {
			isSubscribed: customer.status === "active",
			planName: customer.planName || null,
			planId: customer.planId || null,
			customerId: customer.customerId || null,
			status: customer.status || null,
			expiresAt: convertTimestamp(customer.expiresAt),
		};
	} catch (error) {
		console.error("Error getting customer subscription:", error);
		throw error;
	}
};
