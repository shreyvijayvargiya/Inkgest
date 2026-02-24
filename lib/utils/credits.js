/**
 * Server-side credit helper — check limits and increment usage.
 *
 * Two credit types:
 *   "llm"    → AI draft generation via OpenRouter  (FREE_LLM_LIMIT / month)
 *   "scrape" → URL scrape via Firecrawl             (FREE_SCRAPE_LIMIT / month)
 *
 * Pro users are never blocked.
 * Credits auto-reset at the start of each calendar month.
 */

import {
	doc,
	getDoc,
	updateDoc,
	setDoc,
	serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

export const FREE_LLM_LIMIT = 20;
export const FREE_SCRAPE_LIMIT = 20;

const FIELD = {
	llm: "llmCreditsUsed",
	scrape: "scrapeCreditsUsed",
};

const LIMIT = {
	llm: FREE_LLM_LIMIT,
	scrape: FREE_SCRAPE_LIMIT,
};

const LABEL = {
	llm: "AI generation",
	scrape: "URL scrape",
};

/** Returns true when the stored reset date is from a previous calendar month */
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
 * Check whether a user can consume a credit, then increment the counter.
 *
 * Returns { allowed: true }              — request may proceed
 * Returns { allowed: false, error: "…" } — request should be blocked (429)
 *
 * @param {string} userId
 * @param {"llm"|"scrape"} type
 */
export async function checkAndIncrementCredit(userId, type) {
	if (!userId) return { allowed: false, error: "Authentication required" };

	const field = FIELD[type];
	const limit = LIMIT[type];
	const label = LABEL[type];

	const userRef = doc(db, "users", userId);
	const snap = await getDoc(userRef);

	const userData = snap.exists() ? snap.data() : {};
	const plan = userData.plan || "free";

	// Pro plan — always allow, no counting needed
	if (plan === "pro") return { allowed: true };

	let used = typeof userData[field] === "number" ? userData[field] : 0;

	// Monthly reset — wipe both counters together
	if (isStaleMonth(userData.creditsResetAt)) {
		const resetData = {
			llmCreditsUsed: 0,
			scrapeCreditsUsed: 0,
			creditsResetAt: serverTimestamp(),
		};
		if (snap.exists()) {
			await updateDoc(userRef, resetData);
		} else {
			await setDoc(userRef, { ...resetData, plan: "free" }, { merge: true });
		}
		used = 0;
	}

	if (used >= limit) {
		return {
			allowed: false,
			error: `You've used all ${limit} free ${label}s this month. Upgrade to Pro for unlimited access.`,
		};
	}

	// Increment
	await updateDoc(userRef, { [field]: used + 1 });

	return { allowed: true, creditsUsed: used + 1, remaining: limit - used - 1 };
}

/**
 * Read current credit state for a user (for the UI).
 *
 * Returns { plan, llmUsed, scrapeUsed, llmLimit, scrapeLimit }
 */
export async function getUserCredits(userId) {
	if (!userId)
		return {
			plan: "free",
			llmUsed: 0,
			scrapeUsed: 0,
			llmLimit: FREE_LLM_LIMIT,
			scrapeLimit: FREE_SCRAPE_LIMIT,
		};

	const snap = await getDoc(doc(db, "users", userId));
	const data = snap.exists() ? snap.data() : {};
	const plan = data.plan || "free";
	const stale = isStaleMonth(data.creditsResetAt);

	return {
		plan,
		llmUsed: stale ? 0 : (data.llmCreditsUsed ?? 0),
		scrapeUsed: stale ? 0 : (data.scrapeCreditsUsed ?? 0),
		llmLimit: FREE_LLM_LIMIT,
		scrapeLimit: FREE_SCRAPE_LIMIT,
	};
}
