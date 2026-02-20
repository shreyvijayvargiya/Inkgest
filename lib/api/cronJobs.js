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
	where,
	serverTimestamp,
	Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getAllBlogs } from "./blog";
import { getAllEmails } from "./emails";

const CRON_JOBS_COLLECTION = "cronJobs";

/**
 * Get all CRON jobs
 * @returns {Promise<Array>} Array of CRON job documents
 */
export const getAllCronJobs = async () => {
	try {
		let querySnapshot;

		// Try to query with orderBy first
		try {
			const q = query(
				collection(db, CRON_JOBS_COLLECTION),
				orderBy("scheduledDate", "asc")
			);
			querySnapshot = await getDocs(q);
		} catch (error) {
			// If orderBy fails (likely due to missing index), use simple query
			if (error.message && error.message.includes("index")) {
				console.warn(
					"Firestore index missing for scheduledDate. Using simple query and sorting client-side. " +
						"Create the index at: https://console.firebase.google.com/project/_/firestore/indexes"
				);
				const q = query(collection(db, CRON_JOBS_COLLECTION));
				querySnapshot = await getDocs(q);
			} else {
				throw error;
			}
		}

		const cronJobs = [];

		querySnapshot.forEach((doc) => {
			const data = doc.data();
			cronJobs.push({
				id: doc.id,
				...data,
				scheduledDate: data.scheduledDate?.toDate
					? data.scheduledDate.toDate()
					: data.scheduledDate,
				createdAt: data.createdAt?.toDate
					? data.createdAt.toDate()
					: data.createdAt,
				updatedAt: data.updatedAt?.toDate
					? data.updatedAt.toDate()
					: data.updatedAt,
				lastRunAt: data.lastRunAt?.toDate
					? data.lastRunAt.toDate()
					: data.lastRunAt,
			});
		});

		// Sort client-side (always sort to ensure consistent ordering)
		cronJobs.sort((a, b) => {
			const dateA =
				a.scheduledDate instanceof Date
					? a.scheduledDate
					: a.scheduledDate
					? new Date(a.scheduledDate)
					: new Date(0);
			const dateB =
				b.scheduledDate instanceof Date
					? b.scheduledDate
					: b.scheduledDate
					? new Date(b.scheduledDate)
					: new Date(0);
			return dateA - dateB;
		});

		return cronJobs;
	} catch (error) {
		console.error("Error getting CRON jobs:", error);
		throw error;
	}
};

/**
 * Get CRON jobs by type
 * @param {string} type - 'blog' or 'email'
 * @returns {Promise<Array>} Array of CRON job documents
 */
export const getCronJobsByType = async (type) => {
	try {
		let querySnapshot;

		// Try to query with orderBy first (requires composite index: type + scheduledDate)
		try {
			const q = query(
				collection(db, CRON_JOBS_COLLECTION),
				where("type", "==", type),
				orderBy("scheduledDate", "asc")
			);
			querySnapshot = await getDocs(q);
		} catch (error) {
			// If orderBy fails (likely due to missing composite index), use simple query
			if (error.message && error.message.includes("index")) {
				console.warn(
					`Firestore composite index missing for type + scheduledDate. Using simple query and sorting client-side. ` +
						`Create the index at: https://console.firebase.google.com/project/_/firestore/indexes`
				);
				const q = query(
					collection(db, CRON_JOBS_COLLECTION),
					where("type", "==", type)
				);
				querySnapshot = await getDocs(q);
			} else {
				throw error;
			}
		}

		const cronJobs = [];

		querySnapshot.forEach((doc) => {
			const data = doc.data();
			cronJobs.push({
				id: doc.id,
				...data,
				scheduledDate: data.scheduledDate?.toDate
					? data.scheduledDate.toDate()
					: data.scheduledDate,
			});
		});

		// Sort client-side (always sort to ensure consistent ordering)
		cronJobs.sort((a, b) => {
			const dateA =
				a.scheduledDate instanceof Date
					? a.scheduledDate
					: a.scheduledDate
					? new Date(a.scheduledDate)
					: new Date(0);
			const dateB =
				b.scheduledDate instanceof Date
					? b.scheduledDate
					: b.scheduledDate
					? new Date(b.scheduledDate)
					: new Date(0);
			return dateA - dateB;
		});

		return cronJobs;
	} catch (error) {
		console.error("Error getting CRON jobs by type:", error);
		throw error;
	}
};

/**
 * Get a single CRON job by ID
 * @param {string} id - CRON job document ID
 * @returns {Promise<Object>} CRON job document
 */
export const getCronJobById = async (id) => {
	try {
		const docRef = doc(db, CRON_JOBS_COLLECTION, id);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			const data = docSnap.data();
			return {
				id: docSnap.id,
				...data,
				scheduledDate: data.scheduledDate?.toDate
					? data.scheduledDate.toDate()
					: data.scheduledDate,
			};
		} else {
			throw new Error("CRON job not found");
		}
	} catch (error) {
		console.error("Error getting CRON job:", error);
		throw error;
	}
};

/**
 * Create or update CRON job from scheduled blog/email
 * @param {Object} cronData - CRON job data
 * @param {string} cronData.type - 'blog' or 'email'
 * @param {string} cronData.itemId - Blog or email document ID
 * @param {Date} cronData.scheduledDate - Scheduled execution date
 * @param {Object} cronData.itemData - Blog or email data
 * @returns {Promise<string>} Document ID of created CRON job
 */
export const createCronJob = async (cronData) => {
	try {
		const dataToSave = {
			type: cronData.type, // 'blog' or 'email'
			itemId: cronData.itemId,
			scheduledDate:
				cronData.scheduledDate instanceof Date
					? Timestamp.fromDate(cronData.scheduledDate)
					: cronData.scheduledDate,
			status: "scheduled", // 'scheduled', 'completed', 'failed', 'cancelled'
			itemData: cronData.itemData || {},
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		const docRef = await addDoc(
			collection(db, CRON_JOBS_COLLECTION),
			dataToSave
		);
		return docRef.id;
	} catch (error) {
		console.error("Error creating CRON job:", error);
		throw error;
	}
};

/**
 * Update CRON job scheduled date
 * @param {string} id - CRON job document ID
 * @param {Date} scheduledDate - New scheduled date
 * @returns {Promise<void>}
 */
export const updateCronJobSchedule = async (id, scheduledDate) => {
	try {
		const dataToUpdate = {
			scheduledDate:
				scheduledDate instanceof Date
					? Timestamp.fromDate(scheduledDate)
					: scheduledDate,
			updatedAt: serverTimestamp(),
		};

		const docRef = doc(db, CRON_JOBS_COLLECTION, id);
		await updateDoc(docRef, dataToUpdate);
	} catch (error) {
		console.error("Error updating CRON job schedule:", error);
		throw error;
	}
};

/**
 * Mark CRON job as completed
 * @param {string} id - CRON job document ID
 * @returns {Promise<void>}
 */
export const markCronJobCompleted = async (id) => {
	try {
		const docRef = doc(db, CRON_JOBS_COLLECTION, id);
		await updateDoc(docRef, {
			status: "completed",
			lastRunAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error marking CRON job as completed:", error);
		throw error;
	}
};

/**
 * Mark CRON job as failed
 * @param {string} id - CRON job document ID
 * @param {string} errorMessage - Error message
 * @returns {Promise<void>}
 */
export const markCronJobFailed = async (id, errorMessage) => {
	try {
		const docRef = doc(db, CRON_JOBS_COLLECTION, id);
		await updateDoc(docRef, {
			status: "failed",
			error: errorMessage,
			lastRunAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error marking CRON job as failed:", error);
		throw error;
	}
};

/**
 * Cancel CRON job
 * @param {string} id - CRON job document ID
 * @returns {Promise<void>}
 */
export const cancelCronJob = async (id) => {
	try {
		const docRef = doc(db, CRON_JOBS_COLLECTION, id);
		await updateDoc(docRef, {
			status: "cancelled",
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error cancelling CRON job:", error);
		throw error;
	}
};

/**
 * Delete CRON job
 * @param {string} id - CRON job document ID
 * @returns {Promise<void>}
 */
export const deleteCronJob = async (id) => {
	try {
		const docRef = doc(db, CRON_JOBS_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting CRON job:", error);
		throw error;
	}
};

/**
 * Sync scheduled blogs and emails to CRON jobs
 * This should be called to populate CRON jobs from existing scheduled items
 * @returns {Promise<Object>} Sync results
 */
export const syncScheduledItemsToCronJobs = async () => {
	try {
		const blogs = await getAllBlogs();
		const emails = await getAllEmails();

		const scheduledBlogs = blogs.filter(
			(blog) => blog.status === "scheduled" && blog.scheduledDate
		);
		const scheduledEmails = emails.filter(
			(email) => email.status === "scheduled" && email.scheduledDate
		);

		const results = {
			blogsCreated: 0,
			emailsCreated: 0,
			errors: [],
		};

		// Create CRON jobs for scheduled blogs
		for (const blog of scheduledBlogs) {
			try {
				// Check if CRON job already exists
				const existingJobs = await getCronJobsByType("blog");
				const exists = existingJobs.some((job) => job.itemId === blog.id);

				if (!exists) {
					await createCronJob({
						type: "blog",
						itemId: blog.id,
						scheduledDate: blog.scheduledDate?.toDate
							? blog.scheduledDate.toDate()
							: new Date(blog.scheduledDate),
						itemData: {
							title: blog.title,
							slug: blog.slug,
							status: blog.status,
						},
					});
					results.blogsCreated++;
				}
			} catch (error) {
				results.errors.push(
					`Error creating CRON job for blog ${blog.id}: ${error.message}`
				);
			}
		}

		// Create CRON jobs for scheduled emails
		for (const email of scheduledEmails) {
			try {
				// Check if CRON job already exists
				const existingJobs = await getCronJobsByType("email");
				const exists = existingJobs.some((job) => job.itemId === email.id);

				if (!exists) {
					await createCronJob({
						type: "email",
						itemId: email.id,
						scheduledDate: email.scheduledDate?.toDate
							? email.scheduledDate.toDate()
							: new Date(email.scheduledDate),
						itemData: {
							subject: email.subject,
							status: email.status,
						},
					});
					results.emailsCreated++;
				}
			} catch (error) {
				results.errors.push(
					`Error creating CRON job for email ${email.id}: ${error.message}`
				);
			}
		}

		return results;
	} catch (error) {
		console.error("Error syncing scheduled items:", error);
		throw error;
	}
};
