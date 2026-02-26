import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

const SETTINGS_COLLECTION = "settings";
const CREDITS_DOC_ID = "credits";

/**
 * Get credits settings (free credit limit)
 * @returns {Promise<{ freeCreditLimit: number }>}
 */
export const getCreditsSettings = async () => {
	try {
		const ref = doc(db, SETTINGS_COLLECTION, CREDITS_DOC_ID);
		const snap = await getDoc(ref);
		if (snap.exists()) {
			const data = snap.data();
			return {
				freeCreditLimit:
					typeof data.freeCreditLimit === "number"
						? data.freeCreditLimit
						: 10,
			};
		}
		return { freeCreditLimit: 10 };
	} catch (error) {
		console.error("Error getting credits settings:", error);
		return { freeCreditLimit: 10 };
	}
};

/**
 * Update credits settings (admin only)
 * @param {{ freeCreditLimit: number }} data
 */
export const updateCreditsSettings = async (data) => {
	const ref = doc(db, SETTINGS_COLLECTION, CREDITS_DOC_ID);
	await setDoc(
		ref,
		{
			...data,
			updatedAt: serverTimestamp(),
		},
		{ merge: true }
	);
};
