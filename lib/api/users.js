import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";

const USERS_COLLECTION = "users";

/**
 * Get all users from Firestore
 * @returns {Promise<Array>} Array of user documents
 */
export const getAllUsers = async () => {
	try {
		const usersRef = collection(db, USERS_COLLECTION);
		const q = query(usersRef, orderBy("createdAt", "desc"));
		const querySnapshot = await getDocs(q);
		const users = [];

		querySnapshot.forEach((doc) => {
			users.push({
				id: doc.id,
				...doc.data(),
			});
		});

		return users;
	} catch (error) {
		console.error("Error getting users:", error);
		throw error;
	}
};

/**
 * Get all users with verified emails
 * @returns {Promise<Array>} Array of user documents with verified emails
 */
export const getUsersWithVerifiedEmails = async () => {
	try {
		const allUsers = await getAllUsers();
		return allUsers.filter((user) => user.email && user.emailVerified);
	} catch (error) {
		console.error("Error getting users with verified emails:", error);
		throw error;
	}
};
