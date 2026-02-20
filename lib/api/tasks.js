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
	where,
} from "firebase/firestore";
import { db } from "../config/firebase";

const TASKS_COLLECTION = "tasks";

/**
 * Get all tasks
 * @returns {Promise<Array>} Array of task documents
 */
export const getAllTasks = async () => {
	try {
		const q = query(
			collection(db, TASKS_COLLECTION),
			orderBy("createdAt", "desc")
		);

		const querySnapshot = await getDocs(q);
		const tasks = [];

		querySnapshot.forEach((doc) => {
			const data = doc.data();
			tasks.push({
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

		return tasks;
	} catch (error) {
		console.error("Error getting tasks:", error);
		throw error;
	}
};

/**
 * Get tasks by status
 * @param {string} status - Task status (backlog, in-progress, done)
 * @returns {Promise<Array>} Array of task documents
 */
export const getTasksByStatus = async (status) => {
	try {
		const q = query(
			collection(db, TASKS_COLLECTION),
			where("status", "==", status),
			orderBy("createdAt", "desc")
		);

		const querySnapshot = await getDocs(q);
		const tasks = [];

		querySnapshot.forEach((doc) => {
			const data = doc.data();
			tasks.push({
				id: doc.id,
				...data,
				createdAt: data.createdAt?.toDate
					? data.createdAt.toDate()
					: data.createdAt,
				updatedAt: data.updatedAt?.toDate
					? data.updatedAt.toDate()
					: data.updatedAt,
			});
		});

		return tasks;
	} catch (error) {
		console.error("Error getting tasks by status:", error);
		throw error;
	}
};

/**
 * Get a single task by ID
 * @param {string} id - Task document ID
 * @returns {Promise<Object>} Task document
 */
export const getTaskById = async (id) => {
	try {
		const docRef = doc(db, TASKS_COLLECTION, id);
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
			throw new Error("Task not found");
		}
	} catch (error) {
		console.error("Error getting task:", error);
		throw error;
	}
};

/**
 * Create a new task
 * @param {Object} taskData - Task data object
 * @param {string} taskData.title - Task title
 * @param {string} taskData.description - Task description
 * @param {string} taskData.type - Task type (task, bug, feature, improvement)
 * @param {string} taskData.status - Task status (backlog, in-progress, done)
 * @param {string} taskData.priority - Task priority (High, Medium, Low)
 * @param {number} taskData.progress - Task progress (0-100)
 * @param {Array} taskData.assignees - Array of assignee IDs or emails
 * @param {number} taskData.attachments - Number of attachments
 * @param {number} taskData.comments - Number of comments
 * @param {string} taskData.category - Task category (optional)
 * @returns {Promise<string>} Document ID of created task
 */
export const createTask = async (taskData) => {
	try {
		const dataToSave = {
			title: taskData.title,
			description: taskData.description || "",
			type: taskData.type || "task",
			status: taskData.status || "backlog",
			priority: taskData.priority || "Medium",
			progress: taskData.progress || 0,
			assignees: taskData.assignees || [],
			attachments: taskData.attachments || 0,
			comments: taskData.comments || 0,
			category: taskData.category || "",
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		const docRef = await addDoc(collection(db, TASKS_COLLECTION), dataToSave);

		return docRef.id;
	} catch (error) {
		console.error("Error creating task:", error);
		throw error;
	}
};

/**
 * Update an existing task
 * @param {string} id - Task document ID
 * @param {Object} taskData - Updated task data
 * @returns {Promise<void>}
 */
export const updateTask = async (id, taskData) => {
	try {
		const dataToUpdate = {
			...taskData,
			updatedAt: serverTimestamp(),
		};

		// Remove undefined values
		Object.keys(dataToUpdate).forEach(
			(key) => dataToUpdate[key] === undefined && delete dataToUpdate[key]
		);

		const docRef = doc(db, TASKS_COLLECTION, id);
		await updateDoc(docRef, dataToUpdate);
	} catch (error) {
		console.error("Error updating task:", error);
		throw error;
	}
};

/**
 * Delete a task
 * @param {string} id - Task document ID
 * @returns {Promise<void>}
 */
export const deleteTask = async (id) => {
	try {
		const docRef = doc(db, TASKS_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting task:", error);
		throw error;
	}
};

/**
 * Update task status (for drag and drop)
 * @param {string} id - Task document ID
 * @param {string} status - New status (backlog, in-progress, done)
 * @returns {Promise<void>}
 */
export const updateTaskStatus = async (id, status) => {
	try {
		const docRef = doc(db, TASKS_COLLECTION, id);
		await updateDoc(docRef, {
			status: status,
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error updating task status:", error);
		throw error;
	}
};

/**
 * Add assignee to task
 * @param {string} id - Task document ID
 * @param {string} assigneeId - Assignee ID or email
 * @returns {Promise<void>}
 */
export const addAssigneeToTask = async (id, assigneeId) => {
	try {
		const task = await getTaskById(id);
		const currentAssignees = task.assignees || [];

		if (!currentAssignees.includes(assigneeId)) {
			const docRef = doc(db, TASKS_COLLECTION, id);
			await updateDoc(docRef, {
				assignees: [...currentAssignees, assigneeId],
				updatedAt: serverTimestamp(),
			});
		}
	} catch (error) {
		console.error("Error adding assignee to task:", error);
		throw error;
	}
};

/**
 * Remove assignee from task
 * @param {string} id - Task document ID
 * @param {string} assigneeId - Assignee ID or email
 * @returns {Promise<void>}
 */
export const removeAssigneeFromTask = async (id, assigneeId) => {
	try {
		const task = await getTaskById(id);
		const currentAssignees = task.assignees || [];

		const docRef = doc(db, TASKS_COLLECTION, id);
		await updateDoc(docRef, {
			assignees: currentAssignees.filter((a) => a !== assigneeId),
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error removing assignee from task:", error);
		throw error;
	}
};
