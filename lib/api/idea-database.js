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

const IDEAS_COLLECTION = "idea-database";

/**
 * Get all ideas
 * @returns {Promise<Array>} Array of idea documents
 */
export const getAllIdeas = async () => {
	try {
		const q = query(
			collection(db, IDEAS_COLLECTION),
			orderBy("createdAt", "desc")
		);

		const querySnapshot = await getDocs(q);
		const ideas = [];

		querySnapshot.forEach((doc) => {
			const data = doc.data();
			ideas.push({
				id: doc.id,
				...data,
				// Convert Firestore Timestamps to Date objects if needed
				createdAt: data.createdAt?.toDate
					? data.createdAt.toDate()
					: data.createdAt,
				updatedAt: data.updatedAt?.toDate
					? data.updatedAt.toDate()
					: data.updatedAt,
			});
		});

		return ideas;
	} catch (error) {
		console.error("Error getting ideas:", error);
		throw error;
	}
};

/**
 * Get a single idea by ID
 * @param {string} id - Idea document ID
 * @returns {Promise<Object>} Idea document
 */
export const getIdeaById = async (id) => {
	try {
		const docRef = doc(db, IDEAS_COLLECTION, id);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			const data = docSnap.data();
			return {
				id: docSnap.id,
				...data,
				createdAt: data.createdAt?.toDate
					? data.createdAt.toDate()
					: data.createdAt,
				updatedAt: data.updatedAt?.toDate
					? data.updatedAt.toDate()
					: data.updatedAt,
			};
		} else {
			throw new Error("Idea not found");
		}
	} catch (error) {
		console.error("Error getting idea:", error);
		throw error;
	}
};

/**
 * Create a new idea
 * @param {Object} ideaData - Idea data object
 * @param {string} ideaData.title - Idea title
 * @param {string} ideaData.content - Idea content (markdown/HTML)
 * @param {boolean} ideaData.markAsTask - Whether idea is marked as task
 * @param {string} ideaData.taskId - Task ID if markAsTask is true
 * @param {string} ideaData.taskStatus - Task status (todo, in-progress, completed)
 * @returns {Promise<string>} Document ID of created idea
 */
export const createIdea = async (ideaData) => {
	try {
		const dataToSave = {
			title: ideaData.title || "",
			content: ideaData.content || "",
			markAsTask: ideaData.markAsTask || false,
			taskId: ideaData.markAsTask ? ideaData.taskId || null : null,
			taskStatus: ideaData.markAsTask ? ideaData.taskStatus || "todo" : null,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		const docRef = await addDoc(collection(db, IDEAS_COLLECTION), dataToSave);

		return docRef.id;
	} catch (error) {
		console.error("Error creating idea:", error);
		throw error;
	}
};

/**
 * Update an existing idea
 * @param {string} id - Idea document ID
 * @param {Object} ideaData - Updated idea data
 * @returns {Promise<void>}
 */
export const updateIdea = async (id, ideaData) => {
	try {
		const dataToUpdate = {
			...ideaData,
			updatedAt: serverTimestamp(),
		};

		// If markAsTask is false, clear taskId and taskStatus
		if (!ideaData.markAsTask) {
			dataToUpdate.taskId = null;
			dataToUpdate.taskStatus = null;
		}

		// Remove undefined values
		Object.keys(dataToUpdate).forEach(
			(key) => dataToUpdate[key] === undefined && delete dataToUpdate[key]
		);

		const docRef = doc(db, IDEAS_COLLECTION, id);
		await updateDoc(docRef, dataToUpdate);
	} catch (error) {
		console.error("Error updating idea:", error);
		throw error;
	}
};

/**
 * Delete an idea
 * @param {string} id - Idea document ID
 * @returns {Promise<void>}
 */
export const deleteIdea = async (id) => {
	try {
		const docRef = doc(db, IDEAS_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting idea:", error);
		throw error;
	}
};
