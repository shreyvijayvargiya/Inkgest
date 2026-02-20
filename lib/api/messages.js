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

const MESSAGES_COLLECTION = "messages";

/**
 * Get all messages
 * @returns {Promise<Array>} Array of message documents
 */
export const getAllMessages = async () => {
	try {
		const q = query(
			collection(db, MESSAGES_COLLECTION),
			orderBy("createdAt", "desc")
		);

		const querySnapshot = await getDocs(q);
		const messages = [];

		querySnapshot.forEach((doc) => {
			messages.push({
				id: doc.id,
				...doc.data(),
			});
		});

		return messages;
	} catch (error) {
		console.error("Error getting messages:", error);
		throw error;
	}
};

/**
 * Get a single message by ID
 * @param {string} id - Message document ID
 * @returns {Promise<Object>} Message document
 */
export const getMessageById = async (id) => {
	try {
		const docRef = doc(db, MESSAGES_COLLECTION, id);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			return {
				id: docSnap.id,
				...docSnap.data(),
			};
		} else {
			throw new Error("Message not found");
		}
	} catch (error) {
		console.error("Error getting message:", error);
		throw error;
	}
};

/**
 * Create a new message
 * @param {Object} messageData - Message data object
 * @param {string} messageData.name - Sender name
 * @param {string} messageData.email - Sender email
 * @param {string} messageData.subject - Message subject
 * @param {string} messageData.message - Message content
 * @returns {Promise<string>} Document ID of created message
 */
export const createMessage = async (messageData) => {
	try {
		const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), {
			...messageData,
			read: false,
			createdAt: serverTimestamp(),
		});

		return docRef.id;
	} catch (error) {
		console.error("Error creating message:", error);
		throw error;
	}
};

/**
 * Mark message as read
 * @param {string} id - Message document ID
 * @returns {Promise<void>}
 */
export const markMessageAsRead = async (id) => {
	try {
		const docRef = doc(db, MESSAGES_COLLECTION, id);
		await updateDoc(docRef, {
			read: true,
			readAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error marking message as read:", error);
		throw error;
	}
};

/**
 * Mark message as replied
 * @param {string} id - Message document ID
 * @returns {Promise<void>}
 */
export const markMessageAsReplied = async (id) => {
	try {
		const docRef = doc(db, MESSAGES_COLLECTION, id);
		await updateDoc(docRef, {
			replied: true,
			repliedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error marking message as replied:", error);
		throw error;
	}
};

/**
 * Delete a message
 * @param {string} id - Message document ID
 * @returns {Promise<void>}
 */
export const deleteMessage = async (id) => {
	try {
		const docRef = doc(db, MESSAGES_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting message:", error);
		throw error;
	}
};
