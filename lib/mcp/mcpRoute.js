/**
 * Shared MCP API route helpers — auth, rate limit, Firestore logging.
 */

import { checkRateLimit } from "../utils/rateLimit";
import { logMcpInvocation } from "../api/mcpLogsServer";
import { lookupMcpKeyMeta } from "../api/mcpKeysServer";
import {
	mcpUnauthorized,
	mcpBadRequest,
	mcpServerError,
} from "../utils/mcpAuth";

function extractBearerToken(req) {
	const header = req.headers.authorization || req.headers.Authorization || "";
	if (typeof header === "string" && header.startsWith("Bearer ")) {
		return header.slice(7).trim();
	}
	return "";
}

function loadEnvKeyMap() {
	const map = {};
	const json = process.env.MCP_API_KEYS;
	if (json) {
		try {
			Object.assign(map, JSON.parse(json));
		} catch {
			/* ignore */
		}
	}
	const single = process.env.MCP_API_KEY;
	const uid = process.env.MCP_USER_UID;
	if (single && uid) map[single] = uid;
	return map;
}

async function resolveMcpAuth(req) {
	const token = extractBearerToken(req);
	if (!token) throw new Error("Missing Authorization: Bearer <MCP_API_KEY>");

	const envUid = loadEnvKeyMap()[token];
	if (envUid) {
		return { uid: envUid, keyId: null, keyName: "Env key" };
	}

	const meta = await lookupMcpKeyMeta(token);
	if (meta) return meta;

	throw new Error("Invalid MCP API key");
}

/**
 * Run an MCP tool handler with auth, rate limiting, and Firestore logging.
 */
export async function runMcpRoute(req, res, options) {
	const { tool, method, path, params, successStatus = 200, run } = options;

	let auth;
	try {
		auth = await resolveMcpAuth(req);
	} catch (e) {
		return mcpUnauthorized(res, e.message);
	}

	const rateLimit = await checkRateLimit(req, { identifier: `mcp:${auth.uid}` });
	if (!rateLimit.allowed) {
		return res.status(429).json({
			ok: false,
			error: "Too many requests",
			retryAfter: rateLimit.resetIn,
		});
	}

	const started = Date.now();
	try {
		const result = await run(auth.uid);
		const durationMs = Date.now() - started;
		const isError = result?.ok === false;

		logMcpInvocation(auth.uid, {
			tool,
			method,
			path,
			params,
			result,
			status: isError ? "error" : "ok",
			statusCode: isError ? 400 : successStatus,
			durationMs,
			keyId: auth.keyId,
			keyName: auth.keyName,
			error: isError ? result.error : null,
		}).catch((e) => console.error("[mcp] log", e));

		if (isError) {
			const code = result.error === "Document not found" ? 404 : 400;
			return res.status(code).json(result);
		}

		return res.status(successStatus).json(result);
	} catch (e) {
		const durationMs = Date.now() - started;
		logMcpInvocation(auth.uid, {
			tool,
			method,
			path,
			params,
			status: "error",
			statusCode: 500,
			durationMs,
			keyId: auth.keyId,
			keyName: auth.keyName,
			error: e.message,
		}).catch((err) => console.error("[mcp] log", err));
		return mcpServerError(res, e);
	}
}

export { mcpBadRequest };
