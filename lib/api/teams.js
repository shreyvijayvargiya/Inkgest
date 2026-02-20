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

const TEAMS_COLLECTION = "teams";

/**
 * Get all team members
 * @returns {Promise<Array>} Array of team member documents
 */
export const getAllTeamMembers = async () => {
	try {
		const q = query(
			collection(db, TEAMS_COLLECTION),
			orderBy("createdAt", "desc")
		);

		const querySnapshot = await getDocs(q);
		const members = [];

		querySnapshot.forEach((doc) => {
			members.push({
				id: doc.id,
				...doc.data(),
			});
		});

		return members;
	} catch (error) {
		console.error("Error getting team members:", error);
		throw error;
	}
};

/**
 * Get a single team member by ID
 * @param {string} id - Team member document ID
 * @returns {Promise<Object>} Team member document
 */
export const getTeamMemberById = async (id) => {
	try {
		const docRef = doc(db, TEAMS_COLLECTION, id);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			return {
				id: docSnap.id,
				...docSnap.data(),
			};
		} else {
			throw new Error("Team member not found");
		}
	} catch (error) {
		console.error("Error getting team member:", error);
		throw error;
	}
};

/**
 * Get team member by email
 * @param {string} email - Team member email
 * @returns {Promise<Object|null>} Team member document or null
 */
export const getTeamMemberByEmail = async (email) => {
	try {
		if (!email) {
			console.warn("getTeamMemberByEmail: No email provided");
			return null;
		}
		const members = await getAllTeamMembers();
		console.log("getTeamMemberByEmail: All team members:", members);
		// Case-insensitive email matching
		const normalizedEmail = email.toLowerCase().trim();
		console.log(
			"getTeamMemberByEmail: Searching for normalized email:",
			normalizedEmail
		);

		const found =
			members.find((member) => {
				const memberEmail = member.email?.toLowerCase().trim();
				console.log(
					"getTeamMemberByEmail: Comparing",
					memberEmail,
					"with",
					normalizedEmail
				);
				return memberEmail === normalizedEmail;
			}) || null;

		console.log("getTeamMemberByEmail: Found member:", found);
		return found;
	} catch (error) {
		console.error("Error getting team member by email:", error);
		throw error;
	}
};

/**
 * Add a new team member
 * @param {Object} memberData - Team member data object
 * @param {string} memberData.email - Team member email
 * @param {string} memberData.username - Team member username
 * @param {string} memberData.role - Team member role (admin, editor, author, viewer)
 * @returns {Promise<string>} Document ID of created team member
 */
export const addTeamMember = async (memberData) => {
	try {
		// Check if member already exists
		const existing = await getTeamMemberByEmail(memberData.email);

		if (existing) {
			throw new Error("Team member with this email already exists");
		}

		const docRef = await addDoc(collection(db, TEAMS_COLLECTION), {
			email: memberData.email,
			username: memberData.username || memberData.email.split("@")[0],
			role: memberData.role || "viewer",
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});

		return docRef.id;
	} catch (error) {
		console.error("Error adding team member:", error);
		throw error;
	}
};

/**
 * Update an existing team member
 * @param {string} id - Team member document ID
 * @param {Object} memberData - Updated team member data
 * @returns {Promise<void>}
 */
export const updateTeamMember = async (id, memberData) => {
	try {
		const docRef = doc(db, TEAMS_COLLECTION, id);
		await updateDoc(docRef, {
			...memberData,
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error updating team member:", error);
		throw error;
	}
};

/**
 * Update team member role
 * @param {string} id - Team member document ID
 * @param {string} role - New role
 * @returns {Promise<void>}
 */
export const updateTeamMemberRole = async (id, role) => {
	try {
		const docRef = doc(db, TEAMS_COLLECTION, id);
		await updateDoc(docRef, {
			role: role,
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error updating team member role:", error);
		throw error;
	}
};

/**
 * Delete a team member
 * @param {string} id - Team member document ID
 * @returns {Promise<void>}
 */
export const deleteTeamMember = async (id) => {
	try {
		const docRef = doc(db, TEAMS_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting team member:", error);
		throw error;
	}
};
