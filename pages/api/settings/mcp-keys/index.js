import { verifyFirebaseToken } from "../../../../lib/utils/verifyAuth";
import { isFirebaseAdminConfigured } from "../../../../lib/config/firebaseAdmin";
import {
	listMcpKeysForUser,
	createMcpKeyForUser,
} from "../../../../lib/api/mcpKeysServer";
import { getMcpIntegrationStatus } from "../../../../lib/api/mcpLogsServer";

function adminConfigError(res) {
	return res.status(503).json({
		ok: false,
		error:
			"MCP keys require Firebase Admin on the server. Add GOOGLE_APPLICATION_CREDENTIALS=./your-service-account.json to .env.local (or FIREBASE_SERVICE_ACCOUNT_JSON as a single line), then restart the dev server.",
		code: "ADMIN_NOT_CONFIGURED",
	});
}

export default async function handler(req, res) {
	const idToken =
		req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
		req.body?.idToken ||
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

	if (req.method === "GET") {
		if (!isFirebaseAdminConfigured()) {
			return res.status(200).json({ ok: true, keys: [], adminConfigured: false });
		}
		try {
			const [keys, integration] = await Promise.all([
				listMcpKeysForUser(uid),
				getMcpIntegrationStatus(uid),
			]);
			return res.status(200).json({
				ok: true,
				keys,
				integration,
				adminConfigured: true,
			});
		} catch (e) {
			console.error("[mcp-keys] list", e);
			return res.status(500).json({ ok: false, error: e.message });
		}
	}

	if (req.method === "POST") {
		if (!isFirebaseAdminConfigured()) {
			return adminConfigError(res);
		}
		const name = req.body?.name;
		try {
			const created = await createMcpKeyForUser(uid, name);
			return res.status(201).json({ ok: true, ...created });
		} catch (e) {
			console.error("[mcp-keys] create", e);
			const msg = e.message || "Failed to create key";
			if (msg.includes("Firebase Admin") || msg.includes("Could not load")) {
				return adminConfigError(res);
			}
			return res.status(500).json({ ok: false, error: msg });
		}
	}

	return res.status(405).json({ ok: false, error: "Method not allowed" });
}
