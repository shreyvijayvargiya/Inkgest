import { getTeamMemberByEmail } from "../api/teams";

/**
 * Get current user's role from Firestore teams collection
 * Falls back to localStorage or default role
 * @param {string} userEmail - Current user's email
 * @returns {Promise<string>} User role (admin, editor, author, viewer)
 */
export const getUserRole = async (userEmail, forceRefresh = false) => {
	try {
		// If no email provided, return default
		if (!userEmail) {
			console.warn("getUserRole: No email provided");
			return "viewer";
		}

		// Normalize email for comparison
		const normalizedEmail = userEmail.toLowerCase().trim();
		console.log("getUserRole: Fetching role for email:", normalizedEmail);

		// Check cache first (unless forcing refresh)
		if (!forceRefresh) {
			const cachedRole = localStorage.getItem("userRole");
			const cachedEmail = localStorage.getItem("userEmail");

			if (
				cachedRole &&
				cachedEmail &&
				cachedEmail.toLowerCase().trim() === normalizedEmail
			) {
				console.log("getUserRole: Using cached role:", cachedRole);
				return cachedRole;
			}
		}

		// Fetch from Firestore
		const teamMember = await getTeamMemberByEmail(normalizedEmail);
		console.log("getUserRole: Team member found:", teamMember);

		if (teamMember && teamMember.role) {
			// Cache the role
			localStorage.setItem("userRole", teamMember.role);
			localStorage.setItem("userEmail", normalizedEmail);
			console.log("getUserRole: Role set to:", teamMember.role);
			return teamMember.role;
		}

		// Default role if not found
		console.warn("getUserRole: No team member found, defaulting to viewer");
		const defaultRole = "viewer";
		localStorage.setItem("userRole", defaultRole);
		localStorage.setItem("userEmail", normalizedEmail);
		return defaultRole;
	} catch (error) {
		console.error("Error getting user role:", error);
		// Return default role on error
		return "viewer";
	}
};

/**
 * Get current user's role synchronously from localStorage
 * @returns {string} User role or "viewer" as default
 */
export const getCachedUserRole = () => {
	if (typeof window === "undefined") return "viewer";
	return localStorage.getItem("userRole") || "viewer";
};

/**
 * Clear cached user role
 */
export const clearCachedUserRole = () => {
	if (typeof window !== "undefined") {
		localStorage.removeItem("userRole");
		localStorage.removeItem("userEmail");
	}
};
