import {
	signInWithPopup,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signOut,
	GoogleAuthProvider,
	onAuthStateChanged,
	updateProfile,
} from "firebase/auth";
import {
	collection,
	doc,
	getDoc,
	getDocs,
	query,
	setDoc,
	updateDoc,
	serverTimestamp,
	where,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { identifyUser, resetUser, trackEvent } from "../utils/posthog";

const USERS_COLLECTION = "users";

/**
 * Sign in with Google
 * @returns {Promise<Object>} User object
 */
export const signInWithGoogle = async () => {
	try {
		const provider = new GoogleAuthProvider();
		const result = await signInWithPopup(auth, provider);
		const user = result.user;

		// Store user in Firestore
		await saveUserToFirestore(user, "google");

		// Identify user in PostHog
		identifyUser(user.uid, {
			email: user.email,
			name: user.displayName,
			provider: "google",
		});

		trackEvent("login_with_google", { user_id: user.uid });

		return user;
	} catch (error) {
		console.error("Error signing in with Google:", error);
		throw error;
	}
};

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User object
 */
export const signInWithEmail = async (email, password) => {
	try {
		const result = await signInWithEmailAndPassword(auth, email, password);
		const user = result.user;

		// Update last sign in
		await updateUserLastSignIn(user.uid);

		// Identify user in PostHog
		identifyUser(user.uid, {
			email: user.email,
			name: user.displayName,
			provider: "email",
		});

		return user;
	} catch (error) {
		console.error("Error signing in with email:", error);
		throw error;
	}
};

/**
 * Check if user exists in Firestore by email
 * @param {string} email - User email
 * @returns {Promise<boolean>} True if user exists, false otherwise
 */
const checkUserExistsByEmail = async (email) => {
	try {
		const q = query(
			collection(db, USERS_COLLECTION),
			where("email", "==", email)
		);
		const querySnapshot = await getDocs(q);
		return !querySnapshot.empty;
	} catch (error) {
		console.error("Error checking if user exists:", error);
		return false;
	}
};

/**
 * Sign up with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User display name
 * @returns {Promise<Object>} User object
 */
export const signUpWithEmail = async (email, password, displayName) => {
	try {
		// Check if user already exists in Firestore
		const userExists = await checkUserExistsByEmail(email);
		if (userExists) {
			const error = new Error(
				"An account with this email already exists. Please use the login method instead."
			);
			error.code = "auth/email-already-in-use";
			throw error;
		}

		// Try to create user in Firebase Auth
		const result = await createUserWithEmailAndPassword(auth, email, password);
		const user = result.user;

		// Update display name
		await updateProfile(user, { displayName });

		// Store user in Firestore
		await saveUserToFirestore({ ...user, displayName }, "email");

		// Identify user in PostHog
		identifyUser(user.uid, {
			email: user.email,
			name: displayName,
			provider: "email",
		});

		return user;
	} catch (error) {
		console.error("Error signing up with email:", error);
		// If Firebase Auth throws email-already-in-use error, provide better message
		if (error.code === "auth/email-already-in-use") {
			const customError = new Error(
				"An account with this email already exists. Please use the login method instead."
			);
			customError.code = error.code;
			throw customError;
		}
		throw error;
	}
};

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export const signOutUser = async () => {
	try {
		// Reset PostHog user identification
		resetUser();
		
		await signOut(auth);
	} catch (error) {
		console.error("Error signing out:", error);
		throw error;
	}
};

/**
 * Get current user from Firebase Auth
 * Firebase Auth users don't have role - we check Firestore teams collection with email
 * @returns {Promise<Object|null>} Current user object or null
 */
export const getCurrentUser = () => {
	return new Promise((resolve) => {
		// First check if user is already available (synchronous check)
		const currentUser = auth.currentUser;
		if (currentUser) {
			console.log("getCurrentUser: User already available:", currentUser.email);
			resolve(currentUser);
			return;
		}

		// Otherwise wait for auth state change (async check)
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			unsubscribe();
			console.log(
				"getCurrentUser: Auth state changed, user:",
				user?.email || "null"
			);
			resolve(user);
		});
	});
};

/**
 * Save user to Firestore
 * @param {Object} user - Firebase user object
 * @param {string} provider - Auth provider ('google', 'email', etc.)
 * @returns {Promise<void>}
 */
export const saveUserToFirestore = async (user, provider) => {
	try {
		const userRef = doc(db, USERS_COLLECTION, user.uid);
		const userSnap = await getDoc(userRef);

		const userData = {
			uid: user.uid,
			email: user.email,
			name: user.displayName || user.email?.split("@")[0] || "User",
			displayName: user.displayName || user.email?.split("@")[0] || "User",
			provider: provider,
			photoURL: user.photoURL || null,
			emailVerified: user.emailVerified || false,
			lastSignIn: serverTimestamp(),
		};

		if (userSnap.exists()) {
			// Update existing user
			await updateDoc(userRef, {
				...userData,
				updatedAt: serverTimestamp(),
			});
		} else {
			// Create new user
			await setDoc(userRef, {
				...userData,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});
		}
	} catch (error) {
		console.error("Error saving user to Firestore:", error);
		throw error;
	}
};

/**
 * Update user's last sign in time
 * @param {string} uid - User UID
 * @returns {Promise<void>}
 */
export const updateUserLastSignIn = async (uid) => {
	try {
		const userRef = doc(db, USERS_COLLECTION, uid);
		await updateDoc(userRef, {
			lastSignIn: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error updating last sign in:", error);
		throw error;
	}
};

/**
 * Get user from Firestore
 * @param {string} uid - User UID
 * @returns {Promise<Object|null>} User document or null
 */
export const getUserFromFirestore = async (uid) => {
	try {
		const userRef = doc(db, USERS_COLLECTION, uid);
		const userSnap = await getDoc(userRef);

		if (userSnap.exists()) {
			return {
				id: userSnap.id,
				...userSnap.data(),
			};
		} else {
			return null;
		}
	} catch (error) {
		console.error("Error getting user from Firestore:", error);
		throw error;
	}
};

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Callback function that receives the user
 * @returns {Function} Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
	return onAuthStateChanged(auth, async (user) => {
		if (user) {
			// Ensure user is saved in Firestore
			const provider =
				user.providerData[0]?.providerId === "google.com" ? "google" : "email";
			await saveUserToFirestore(user, provider);
		}
		callback(user);
	});
};
