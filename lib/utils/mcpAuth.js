/**
 * MCP API key auth — maps Bearer token → Firebase UID.
 *
 * 1. Firestore mcp_api_keys (user-created keys from Settings)
 * 2. Env MCP_API_KEYS JSON or MCP_API_KEY + MCP_USER_UID (dev / ops)
 */

import { lookupUidByMcpApiKey } from "../api/mcpKeysServer";

let envKeysCache = null;

function loadEnvKeyMap() {
	if (envKeysCache) return envKeysCache;
	const map = {};
	const json = process.env.MCP_API_KEYS;
	if (json) {
		try {
			Object.assign(map, JSON.parse(json));
		} catch {
			console.error("[mcpAuth] MCP_API_KEYS is not valid JSON");
		}
	}
	const single = process.env.MCP_API_KEY;
	const uid = process.env.MCP_USER_UID;
	if (single && uid) {
		map[single] = uid;
	}
	envKeysCache = map;
	return map;
}

function extractBearerToken(req) {
	const header = req.headers.authorization || req.headers.Authorization || "";
	if (typeof header === "string" && header.startsWith("Bearer ")) {
		return header.slice(7).trim();
	}
	return "";
}

/**
 * @param {import('next').NextApiRequest} req
 * @returns {Promise<string>} Firebase UID
 */
export async function verifyMcpRequest(req) {
	const token = extractBearerToken(req);
	if (!token) {
		throw new Error("Missing Authorization: Bearer <MCP_API_KEY>");
	}

	const envUid = loadEnvKeyMap()[token];
	if (envUid) return envUid;

	const uid = await lookupUidByMcpApiKey(token);
	if (uid) return uid;

	throw new Error("Invalid MCP API key");
}

export function mcpUnauthorized(res, message) {
	return res.status(401).json({ ok: false, error: message || "Unauthorized" });
}

export function mcpBadRequest(res, message) {
	return res.status(400).json({ ok: false, error: message });
}

export function mcpServerError(res, err) {
	const message = err?.message || "Internal server error";
	console.error("[mcp]", message, err);
	return res.status(500).json({ ok: false, error: message });
}
