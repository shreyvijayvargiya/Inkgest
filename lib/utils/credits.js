/**
 * Unified credit system.
 *
 * One pool of credits covers everything:
 *   AI Draft / Infographics / Newsletter  → 1 credit
 *   URL Scrape                            → 1 credit
 *   Table Creator (scrape + AI)           → 2 credits
 *   AI Chat message                       → 0.25 credits
 *   Blank Draft                           → 0 credits (free)
 *
 * Free plan: FREE_CREDIT_LIMIT credits / month.
 * Pro plan : unlimited.
 * Credits auto-reset on the 1st of each calendar month.
 *
 * Firestore field: users/{uid}.creditsUsed  (number, supports decimals)
 */

import {
	doc,
	getDoc,
	updateDoc,
	setDoc,
	serverTimestamp,
	increment,
} from "firebase/firestore";
import { db } from "../config/firebase";

export const FREE_CREDIT_LIMIT = 5;

/** Returns true when the stored reset timestamp is from a previous calendar month */
function isStaleMonth(resetAt) {
	if (!resetAt) return true;
	const d = resetAt.toDate
		? resetAt.toDate()
		: new Date((resetAt.seconds || 0) * 1000);
	const now = new Date();
	return (
		d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()
	);
}

/**
 * Check whether a user has enough credits, then atomically deduct `amount`.
 *
 * @param {string} userId
 * @param {number} amount  Credits to consume (e.g. 1, 2, 0.25). Default 1.
 * @returns {{ allowed: boolean, error?: string, creditsUsed?: number, remaining?: number }}
 */
export async function checkAndDeductCredit(userId, amount = 1) {
	if (!userId) return { allowed: false, error: "Authentication required." };

	const userRef = doc(db, "users", userId);
	const snap = await getDoc(userRef);
	const userData = snap.exists() ? snap.data() : {};
	const plan = userData.plan || "free";

	// Pro plan — always allow
	if (plan === "pro") return { allowed: true };

	// Monthly reset — zero out the unified counter
	let used = typeof userData.creditsUsed === "number" ? userData.creditsUsed : 0;
	if (isStaleMonth(userData.creditsResetAt)) {
		const resetData = {
			creditsUsed: 0,
			creditsResetAt: serverTimestamp(),
		};
		if (snap.exists()) {
			await updateDoc(userRef, resetData);
		} else {
			await setDoc(userRef, { ...resetData, plan: "free" }, { merge: true });
		}
		used = 0;
	}

	if (used + amount > FREE_CREDIT_LIMIT) {
		const remaining = Math.max(0, FREE_CREDIT_LIMIT - used);
		return {
			allowed: false,
			error:
				remaining === 0
					? `You've used all ${FREE_CREDIT_LIMIT} free credits this month. Upgrade to Pro for unlimited access.`
					: `Not enough credits (need ${amount}, have ${+remaining.toFixed(2)}). Upgrade to Pro for unlimited access.`,
		};
	}

	// Deduct (atomic increment by negative amount)
	await updateDoc(userRef, { creditsUsed: increment(amount) });

	const newUsed = used + amount;
	return {
		allowed: true,
		creditsUsed: +newUsed.toFixed(2),
		remaining: +(FREE_CREDIT_LIMIT - newUsed).toFixed(2),
	};
}

/**
 * Read current credit state for a user (UI use only, never blocks requests).
 *
 * @param {string} userId
 * @returns {{ plan: string, creditsUsed: number, creditsLimit: number, remaining: number }}
 */
export async function getUserCredits(userId) {
	const empty = {
		plan: "free",
		creditsUsed: 0,
		creditsLimit: FREE_CREDIT_LIMIT,
		remaining: FREE_CREDIT_LIMIT,
	};
	if (!userId) return empty;

	const snap = await getDoc(doc(db, "users", userId));
	const data = snap.exists() ? snap.data() : {};
	const plan = data.plan || "free";
	const stale = isStaleMonth(data.creditsResetAt);
	const creditsUsed = stale ? 0 : +(data.creditsUsed ?? 0).toFixed(2);

	return {
		plan,
		creditsUsed,
		creditsLimit: FREE_CREDIT_LIMIT,
		remaining: +(FREE_CREDIT_LIMIT - creditsUsed).toFixed(2),
	};
}

// ---------------------------------------------------------------------------
// Legacy alias — keeps old callers compiling during migration.
// Maps old (userId, "llm"|"scrape") signature → new checkAndDeductCredit(userId, 1).
// ---------------------------------------------------------------------------
export async function checkAndIncrementCredit(userId, _type) {
	return checkAndDeductCredit(userId, 1);
}
