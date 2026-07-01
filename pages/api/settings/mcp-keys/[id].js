import { verifyFirebaseToken } from "../../../../lib/utils/verifyAuth";
import { revokeMcpKeyForUser } from "../../../../lib/api/mcpKeysServer";

export default async function handler(req, res) {
	if (req.method !== "DELETE") {
		return res.status(405).json({ ok: false, error: "Method not allowed" });
	}

	const idToken =
		req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
		req.body?.idToken;

	if (!idToken) {
		return res.status(401).json({ ok: false, error: "Authentication required" });
	}

	let uid;
	try {
		uid = await verifyFirebaseToken(idToken);
	} catch (e) {
		return res.status(401).json({ ok: false, error: e.message });
	}

	const { id } = req.query;
	if (!id || typeof id !== "string") {
		return res.status(400).json({ ok: false, error: "Key id required" });
	}

	try {
		await revokeMcpKeyForUser(uid, id);
		return res.status(200).json({ ok: true });
	} catch (e) {
		console.error("[mcp-keys] revoke", e);
		const code = e.message === "Key not found" ? 404 : 500;
		return res.status(code).json({ ok: false, error: e.message });
	}
}
