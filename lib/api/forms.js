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
} from "firebase/firestore";
import { db } from "../config/firebase";

const FORMS_COLLECTION = "forms";
const FORM_SUBMISSIONS_COLLECTION = "formSubmissions";

/**
 * Get all forms
 * @returns {Promise<Array>} Array of form documents
 */
export const getAllForms = async () => {
	try {
		const querySnapshot = await getDocs(collection(db, FORMS_COLLECTION));
		const forms = [];

		querySnapshot.forEach((doc) => {
			const formData = {
				id: doc.id,
				...doc.data(),
			};
			forms.push(formData);
		});

		// Sort by createdAt in memory to avoid index requirement
		forms.sort((a, b) => {
			const dateA = a.createdAt?.toDate
				? a.createdAt.toDate()
				: new Date(a.createdAt || 0);
			const dateB = b.createdAt?.toDate
				? b.createdAt.toDate()
				: new Date(b.createdAt || 0);
			return dateB - dateA;
		});

		return forms;
	} catch (error) {
		console.error("Error getting forms:", error);
		throw error;
	}
};

/**
 * Get a single form by ID or slug
 * @param {string} idOrSlug - Form document ID or slug
 * @returns {Promise<Object>} Form document
 */
export const getFormById = async (idOrSlug) => {
	try {
		// First try to get by ID
		const docRef = doc(db, FORMS_COLLECTION, idOrSlug);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			return {
				id: docSnap.id,
				...docSnap.data(),
			};
		}

		// If not found by ID, try to find by slug
		const q = query(
			collection(db, FORMS_COLLECTION),
			where("formSlug", "==", idOrSlug)
		);
		const querySnapshot = await getDocs(q);

		if (!querySnapshot.empty) {
			const formDoc = querySnapshot.docs[0];
			return {
				id: formDoc.id,
				...formDoc.data(),
			};
		}

		throw new Error("Form not found");
	} catch (error) {
		console.error("Error getting form:", error);
		throw error;
	}
};

/**
 * Create a new form
 * @param {Object} formData - Form data object
 * @param {string} formData.title - Form title
 * @param {string} formData.description - Form description
 * @param {Array} formData.fields - Array of form fields
 * @param {boolean} formData.isPublished - Whether form is published
 * @returns {Promise<string>} Document ID of created form
 */
export const createForm = async (formData) => {
	try {
		const dataToSave = {
			title: formData.title || "Untitled Form",
			description: formData.description || "",
			fields: formData.fields || [],
			isPublished: formData.isPublished || false,
			formSlug: formData.formSlug || generateSlug(formData.title || "form"),
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		const docRef = await addDoc(collection(db, FORMS_COLLECTION), dataToSave);

		return docRef.id;
	} catch (error) {
		console.error("Error creating form:", error);
		throw error;
	}
};

/**
 * Update an existing form
 * @param {string} id - Form document ID
 * @param {Object} formData - Updated form data
 * @returns {Promise<void>}
 */
export const updateForm = async (id, formData) => {
	try {
		// If title changed and no slug provided, generate new slug
		const dataToUpdate = {
			...formData,
			updatedAt: serverTimestamp(),
		};

		// Ensure slug exists, generate if missing
		if (!dataToUpdate.formSlug && formData.title) {
			dataToUpdate.formSlug = generateSlug(formData.title);
		}

		const docRef = doc(db, FORMS_COLLECTION, id);
		await updateDoc(docRef, dataToUpdate);
	} catch (error) {
		console.error("Error updating form:", error);
		throw error;
	}
};

/**
 * Delete a form
 * @param {string} id - Form document ID
 * @returns {Promise<void>}
 */
export const deleteForm = async (id) => {
	try {
		const docRef = doc(db, FORMS_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting form:", error);
		throw error;
	}
};

/**
 * Get all submissions for a form
 * @param {string} formId - Form document ID
 * @returns {Promise<Array>} Array of submission documents
 */
export const getFormSubmissions = async (formId) => {
	try {
		const q = query(
			collection(db, FORM_SUBMISSIONS_COLLECTION),
			where("formId", "==", formId)
		);

		const querySnapshot = await getDocs(q);
		const submissions = [];

		querySnapshot.forEach((doc) => {
			const submissionData = {
				id: doc.id,
				...doc.data(),
			};
			submissions.push(submissionData);
		});

		// Sort by createdAt in memory to avoid composite index requirement
		submissions.sort((a, b) => {
			const dateA = a.createdAt?.toDate
				? a.createdAt.toDate()
				: new Date(a.createdAt || 0);
			const dateB = b.createdAt?.toDate
				? b.createdAt.toDate()
				: new Date(b.createdAt || 0);
			return dateB - dateA;
		});

		return submissions;
	} catch (error) {
		console.error("Error getting form submissions:", error);
		throw error;
	}
};

/**
 * Get submission count for a form
 * @param {string} formId - Form document ID
 * @returns {Promise<number>} Number of submissions
 */
export const getFormSubmissionCount = async (formId) => {
	try {
		const submissions = await getFormSubmissions(formId);
		return submissions.length;
	} catch (error) {
		console.error("Error getting form submission count:", error);
		return 0;
	}
};

/**
 * Get a single submission by ID
 * @param {string} id - Submission document ID
 * @returns {Promise<Object>} Submission document
 */
export const getSubmissionById = async (id) => {
	try {
		const docRef = doc(db, FORM_SUBMISSIONS_COLLECTION, id);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			return {
				id: docSnap.id,
				...docSnap.data(),
			};
		} else {
			throw new Error("Submission not found");
		}
	} catch (error) {
		console.error("Error getting submission:", error);
		throw error;
	}
};

/**
 * Create a new form submission
 * @param {Object} submissionData - Submission data object
 * @param {string} submissionData.formId - Form document ID
 * @param {Object} submissionData.data - Submission data (field values)
 * @returns {Promise<string>} Document ID of created submission
 */
export const createFormSubmission = async (submissionData) => {
	try {
		// Validate input
		if (!submissionData || !submissionData.data) {
			throw new Error("No valid form data provided");
		}

		// Clean data - remove empty keys, but keep valid values
		const cleanedData = {};
		const dataKeys = Object.keys(submissionData.data || {});

		// If no data keys at all, throw error
		if (dataKeys.length === 0) {
			throw new Error("No valid form data provided");
		}

		dataKeys.forEach((key) => {
			if (!key || key.trim() === "") {
				return; // Skip empty keys
			}

			const value = submissionData.data[key];

			// Include value if it's not null/undefined
			if (value !== undefined && value !== null) {
				if (Array.isArray(value)) {
					// Include arrays (even if empty - they represent image fields that might be optional)
					cleanedData[key] = value;
				} else if (typeof value === "string") {
					// Include strings (even if empty - they might be optional fields)
					// Empty strings are valid for optional fields
					cleanedData[key] = value;
				} else {
					// Include non-string values (numbers, booleans, etc.)
					cleanedData[key] = value;
				}
			}
		});

		// Ensure we have at least one field in cleanedData
		// Note: We allow empty strings and empty arrays because fields might be optional
		// The required field validation happens in submitForm before this function is called
		if (Object.keys(cleanedData).length === 0) {
			throw new Error("No valid form data provided");
		}

		const dataToSave = {
			formId: submissionData.formId,
			data: cleanedData,
			createdAt: serverTimestamp(),
		};

		const docRef = await addDoc(
			collection(db, FORM_SUBMISSIONS_COLLECTION),
			dataToSave
		);

		return docRef.id;
	} catch (error) {
		console.error("Error creating form submission:", error);
		throw error;
	}
};

/**
 * Submit a form (client-side submission with validation)
 * @param {string} formIdOrSlug - Form document ID or slug
 * @param {Object} formData - Form submission data
 * @returns {Promise<Object>} Submission result
 */
export const submitForm = async (formIdOrSlug, formData) => {
	try {
		// Get form by ID or slug
		const form = await getFormById(formIdOrSlug);

		if (!form) {
			throw new Error("Form not found");
		}

		if (!form.isPublished) {
			throw new Error("Form is not published");
		}

		// Validate required fields
		if (form.fields && Array.isArray(form.fields)) {
			for (const field of form.fields) {
				if (!field.label || field.label.trim() === "") {
					continue; // Skip fields with empty labels
				}

				if (field.required) {
					const value = formData[field.label];
					// Check if value is empty (null, undefined, empty string, or empty array)
					if (
						value === null ||
						value === undefined ||
						value === "" ||
						(Array.isArray(value) && value.length === 0)
					) {
						throw new Error(`Field "${field.label}" is required`);
					}
				}
			}
		}

		// Create submission
		const submissionId = await createFormSubmission({
			formId: form.id,
			data: formData,
		});

		return {
			success: true,
			submissionId,
			message: "Form submitted successfully",
		};
	} catch (error) {
		console.error("Error submitting form:", error);
		throw error;
	}
};

/**
 * Delete a form submission
 * @param {string} id - Submission document ID
 * @returns {Promise<void>}
 */
export const deleteFormSubmission = async (id) => {
	try {
		const docRef = doc(db, FORM_SUBMISSIONS_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting form submission:", error);
		throw error;
	}
};

/**
 * Generate a slug from title
 * @param {string} title - Title to generate slug from
 * @returns {string} Generated slug
 */
const generateSlug = (title) => {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
};
