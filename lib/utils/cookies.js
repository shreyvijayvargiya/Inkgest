import Cookies from "js-cookie";

const USER_COOKIE_KEY = "saas-starter_user";

/**
 * Store user data in cookie
 * @param {Object} user - User object to store
 */
export const setUserCookie = (user) => {
	try {
		const userData = {
			uid: user.uid,
			email: user.email,
			displayName:
				user.displayName || user.name || user.email?.split("@")[0] || "User",
			photoURL: user.photoURL || null,
			provider: user.provider || "email",
		};
		Cookies.set(USER_COOKIE_KEY, JSON.stringify(userData), {
			expires: 30, // 30 days
			sameSite: "strict",
			secure: process.env.NODE_ENV === "production",
		});
	} catch (error) {
		console.error("Error setting user cookie:", error);
	}
};

/**
 * Get user data from cookie
 * @returns {Object|null} User object or null
 */
export const getUserCookie = () => {
	try {
		const userData = Cookies.get(USER_COOKIE_KEY);
		if (userData) {
			return JSON.parse(userData);
		}
		return null;
	} catch (error) {
		console.error("Error getting user cookie:", error);
		return null;
	}
};

/**
 * Remove user cookie
 */
export const removeUserCookie = () => {
	try {
		Cookies.remove(USER_COOKIE_KEY);
	} catch (error) {
		console.error("Error removing user cookie:", error);
	}
};
