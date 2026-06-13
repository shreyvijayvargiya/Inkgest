/**
 * Call server to deduct credits when agent creates assets.
 * Fire-and-forget — does not block UI.
 * @param {string} idToken - Firebase ID token
 * @param {number} amount - Credits to deduct (default 1)
 */
export function deductCredits(idToken, amount = 1) {
	if (!idToken || amount <= 0) return;
	fetch("/api/agent/deduct-credits", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ idToken, amount: Number(amount) }),
	}).catch((err) => console.error("[deductCredits]", err));
}

/**
 * Deduct credits and wait for server confirmation (throws on failure).
 * @param {string} idToken
 * @param {number} amount
 */
export async function deductCreditsAsync(idToken, amount = 1) {
	if (!idToken || amount <= 0) return { ok: true };
	const res = await fetch("/api/agent/deduct-credits", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ idToken, amount: Number(amount) }),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data.error || "Credit deduction failed");
	}
	return data;
}
