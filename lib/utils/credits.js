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
 * Credits auto-reset every month from account creation (e.g. signup Feb 15 → renews Mar 15, Apr 15).
 *
 * Firestore fields: users/{uid}.creditsUsed, creditsResetAt, createdAt
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
import { getCreditsSettings } from "../api/settings";

export const FREE_CREDIT_LIMIT = 10;

/** Get free credit limit from Firestore settings, fallback to constant */
async function getFreeCreditLimit() {
	const { freeCreditLimit } = await getCreditsSettings();
	return typeof freeCreditLimit === "number" ? freeCreditLimit : FREE_CREDIT_LIMIT;
}

/** Parse Firestore timestamp to Date */
function toDate(ts) {
	if (!ts) return null;
	if (ts.toDate) return ts.toDate();
	if (ts.seconds) return new Date(ts.seconds * 1000);
	return new Date(ts);
}

/** Add n months to a date (handles month overflow, e.g. Jan 31 + 1 month → Feb 28) */
function addMonths(d, n) {
	const out = new Date(d);
	out.setMonth(out.getMonth() + n);
	return out;
}

/** Period start = when current credit period began (reset or account creation) */
function getPeriodStart(resetAt, createdAt) {
	return toDate(resetAt) ?? toDate(createdAt);
}

/** Returns true when the current period has ended (1 month since period start) */
function isStalePeriod(resetAt, createdAt) {
	const periodStart = getPeriodStart(resetAt, createdAt);
	if (!periodStart) return true; // legacy user, reset
	const nextRenewal = addMonths(periodStart, 1);
	return new Date() >= nextRenewal;
}

/** Next renewal date: 1 month from period start (per-user, from account creation) */
export function getNextRenewalDate(periodStart) {
	if (!periodStart) return addMonths(new Date(), 1);
	const d = periodStart instanceof Date ? periodStart : toDate(periodStart);
	return d ? addMonths(d, 1) : addMonths(new Date(), 1);
}

/** Format renewal date for display, e.g. "Mar 1" or "Mar 1, 2026" */
export function formatRenewalDate(date) {
	const d = date instanceof Date ? date : getNextRenewalDate();
	const month = d.toLocaleDateString("en-US", { month: "short" });
	const day = d.getDate();
	const year = d.getFullYear();
	const thisYear = new Date().getFullYear();
	return year === thisYear ? `${month} ${day}` : `${month} ${day}, ${year}`;
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

	// Monthly reset — zero out when period has ended (1 month from period start)
	let used = typeof userData.creditsUsed === "number" ? userData.creditsUsed : 0;
	if (isStalePeriod(userData.creditsResetAt, userData.createdAt)) {
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

	const limit = await getFreeCreditLimit();
	if (used + amount > limit) {
		const remaining = Math.max(0, limit - used);
		return {
			allowed: false,
			error:
				remaining === 0
					? `You've used all ${limit} free credits this month. Upgrade to Pro for unlimited access.`
					: `Not enough credits (need ${amount}, have ${+remaining.toFixed(2)}). Upgrade to Pro for unlimited access.`,
		};
	}

	// Deduct (atomic increment by negative amount)
	await updateDoc(userRef, { creditsUsed: increment(amount) });

	const newUsed = used + amount;
	return {
		allowed: true,
		creditsUsed: +newUsed.toFixed(2),
		remaining: +(limit - newUsed).toFixed(2),
	};
}

/**
 * Read current credit state for a user (UI use only, never blocks requests).
 *
 * @param {string} userId
 * @returns {{ plan: string, creditsUsed: number, creditsLimit: number, remaining: number, renewsAt: Date }}
 */
export async function getUserCredits(userId) {
	const limit = await getFreeCreditLimit();
	const empty = {
		plan: "free",
		creditsUsed: 0,
		creditsLimit: limit,
		remaining: limit,
		renewsAt: getNextRenewalDate(new Date()),
	};
	if (!userId) return empty;

	const snap = await getDoc(doc(db, "users", userId));
	const data = snap.exists() ? snap.data() : {};
	const plan = data.plan || "free";
	const stale = isStalePeriod(data.creditsResetAt, data.createdAt);
	const creditsUsed = stale ? 0 : +(data.creditsUsed ?? 0).toFixed(2);
	const periodStart = getPeriodStart(data.creditsResetAt, data.createdAt);
	const renewsAt = getNextRenewalDate(periodStart);

	return {
		plan,
		creditsUsed,
		creditsLimit: limit,
		remaining: +(limit - creditsUsed).toFixed(2),
		renewsAt,
	};
}

// ---------------------------------------------------------------------------
// Legacy alias — keeps old callers compiling during migration.
// Maps old (userId, "llm"|"scrape") signature → new checkAndDeductCredit(userId, 1).
// ---------------------------------------------------------------------------
export async function checkAndIncrementCredit(userId, _type) {
	return checkAndDeductCredit(userId, 1);
}
