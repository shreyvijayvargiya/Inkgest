import { verifyFirebaseToken } from "../../../../lib/utils/verifyAuth";
import { isFirebaseAdminConfigured } from "../../../../lib/config/firebaseAdmin";
import { listMcpLogsForUser } from "../../../../lib/api/mcpLogsServer";

export default async function handler(req, res) {
	if (req.method !== "GET") {
		return res.status(405).json({ ok: false, error: "Method not allowed" });
	}

	const idToken =
		req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
		req.query?.idToken;

	if (!idToken) {
		return res.status(401).json({ ok: false, error: "Authentication required" });
	}

	let uid;
	try {
		uid = await verifyFirebaseToken(idToken);
	} catch (e) {
		return res.status(401).json({ ok: false, error: e.message });
	}

	if (!isFirebaseAdminConfigured()) {
		return res.status(200).json({ ok: true, logs: [], adminConfigured: false });
	}

	try {
		const limit = Number(req.query?.limit) || 50;
		const logs = await listMcpLogsForUser(uid, limit);
		return res.status(200).json({ ok: true, logs, adminConfigured: true });
	} catch (e) {
		console.error("[mcp-logs] list", e);
		return res.status(500).json({ ok: false, error: e.message });
	}
}
