/**
 * InkAgent credit deduction webhook — called by client when stream ends.
 * Validates idToken and deducts creditsUsed.
 */
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";
import { checkAndDeductCredit } from "../../../lib/utils/credits";

export default async function handler(req, res) {
	if (req.method !== "POST")
		return res.status(405).json({ error: "Method not allowed" });

	const { idToken, creditsUsed } = req.body || {};
	if (!idToken)
		return res.status(401).json({ error: "Authentication required" });

	const amount = Math.max(0, Number(creditsUsed) || 0);
	if (amount <= 0)
		return res.status(200).json({ ok: true, deducted: 0 });

	let uid;
	try {
		uid = await verifyFirebaseToken(idToken);
	} catch (e) {
		return res.status(401).json({ error: e.message });
	}

	try {
		const result = await checkAndDeductCredit(uid, amount);
		if (!result.allowed)
			return res.status(402).json({ error: result.error });
		return res.status(200).json({
			ok: true,
			deducted: amount,
			remaining: result.remaining,
		});
	} catch (err) {
		console.error("[inkagent-deduct]", err);
		return res.status(500).json({ error: "Credit deduction failed" });
	}
}
