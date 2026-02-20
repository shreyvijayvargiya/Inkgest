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

const BLOGS_COLLECTION = "blogs";

/**
 * Get all blogs
 * @param {string} status - Optional: 'draft' or 'published' to filter by status
 * @returns {Promise<Array>} Array of blog documents
 */
export const getAllBlogs = async (status = null) => {
	try {
		let q = query(
			collection(db, BLOGS_COLLECTION),
			orderBy("createdAt", "desc")
		);

		const querySnapshot = await getDocs(q);
		const blogs = [];

		querySnapshot.forEach((doc) => {
			const blogData = {
				id: doc.id,
				...doc.data(),
			};
			blogs.push(blogData);
		});

		// Filter by status client-side to avoid index requirement
		// This is more flexible and doesn't require composite indexes
		if (status) {
			return blogs.filter((blog) => blog.status === status);
		}

		return blogs;
	} catch (error) {
		console.error("Error getting blogs:", error);
		throw error;
	}
};

/**
 * Get a single blog by ID
 * @param {string} id - Blog document ID
 * @returns {Promise<Object>} Blog document
 */
export const getBlogById = async (id) => {
	try {
		const docRef = doc(db, BLOGS_COLLECTION, id);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			return {
				id: docSnap.id,
				...docSnap.data(),
			};
		} else {
			throw new Error("Blog not found");
		}
	} catch (error) {
		console.error("Error getting blog:", error);
		throw error;
	}
};

/**
 * Create a new blog
 * @param {Object} blogData - Blog data object
 * @param {string} blogData.title - Blog title
 * @param {string} blogData.slug - Blog slug
 * @param {string} blogData.content - Blog content (HTML)
 * @param {string} blogData.author - Author name
 * @param {string} blogData.status - Status: 'draft' or 'published'
 * @returns {Promise<string>} Document ID of created blog
 */
export const createBlog = async (blogData) => {
	try {
		const dataToSave = {
			...blogData,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		// Convert scheduledDate to Firestore Timestamp if it's a Date
		if (blogData.scheduledDate && blogData.scheduledDate instanceof Date) {
			dataToSave.scheduledDate = Timestamp.fromDate(blogData.scheduledDate);
		}

		const docRef = await addDoc(collection(db, BLOGS_COLLECTION), dataToSave);

		return docRef.id;
	} catch (error) {
		console.error("Error creating blog:", error);
		throw error;
	}
};

/**
 * Update an existing blog
 * @param {string} id - Blog document ID
 * @param {Object} blogData - Updated blog data
 * @returns {Promise<void>}
 */
export const updateBlog = async (id, blogData) => {
	try {
		const dataToUpdate = {
			...blogData,
			updatedAt: serverTimestamp(),
		};

		// Convert scheduledDate to Firestore Timestamp if it's a Date
		if (blogData.scheduledDate && blogData.scheduledDate instanceof Date) {
			dataToUpdate.scheduledDate = Timestamp.fromDate(blogData.scheduledDate);
		}

		const docRef = doc(db, BLOGS_COLLECTION, id);
		await updateDoc(docRef, dataToUpdate);
	} catch (error) {
		console.error("Error updating blog:", error);
		throw error;
	}
};

/**
 * Delete a blog
 * @param {string} id - Blog document ID
 * @returns {Promise<void>}
 */
export const deleteBlog = async (id) => {
	try {
		const docRef = doc(db, BLOGS_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting blog:", error);
		throw error;
	}
};

/**
 * Publish a draft blog
 * @param {string} id - Blog document ID
 * @returns {Promise<void>}
 */
export const publishBlog = async (id) => {
	try {
		const docRef = doc(db, BLOGS_COLLECTION, id);
		await updateDoc(docRef, {
			status: "published",
			publishedAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error publishing blog:", error);
		throw error;
	}
};

/**
 * Get blogs by status
 * @param {string} status - 'draft' or 'published'
 * @returns {Promise<Array>} Array of blog documents
 */
export const getBlogsByStatus = async (status) => {
	return getAllBlogs(status);
};
