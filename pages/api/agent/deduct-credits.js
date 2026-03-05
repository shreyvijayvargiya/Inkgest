/**
 * POST /api/agent/deduct-credits
 * Deducts credits when agent creates assets (client calls after stream ends or infographics created).
 * Body: { idToken, amount } — amount defaults to 1.
 */
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";
import { checkAndDeductCredit } from "../../../lib/utils/credits";

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const { idToken, amount = 1 } = req.body || {};
	if (!idToken) {
		return res.status(401).json({ error: "Authentication required" });
	}

	let uid;
	try {
		uid = await verifyFirebaseToken(idToken);
	} catch (e) {
		return res.status(401).json({ error: e.message });
	}

	const amt = Math.max(0, Number(amount)) || 1;
	const result = await checkAndDeductCredit(uid, amt);
	if (!result.allowed) {
		return res.status(429).json({ error: result.error });
	}

	return res.status(200).json({ ok: true, remaining: result.remaining });
}
