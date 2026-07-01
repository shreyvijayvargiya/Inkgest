/**
 * MCP invocation logs — Firestore (Admin SDK).
 *
 * users/{uid}/mcpLogs/{logId}     — per-tool call audit trail
 * users/{uid}/integrations/mcp    — connection summary for UI
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "../config/firebaseAdmin";

const LOG_RETENTION_CAP = 200;

function logsCollection(uid) {
	return getAdminFirestore().collection("users").doc(uid).collection("mcpLogs");
}

function integrationRef(uid) {
	return getAdminFirestore().collection("users").doc(uid).collection("integrations").doc("mcp");
}

function userKeysCollection(uid) {
	return getAdminFirestore().collection("users").doc(uid).collection("mcpKeys");
}

function truncate(value, max = 280) {
	const s = typeof value === "string" ? value : JSON.stringify(value ?? "");
	if (s.length <= max) return s;
	return `${s.slice(0, max)}…`;
}

function summarizeResult(tool, result) {
	if (!result || typeof result !== "object") return null;
	if (result.error) return truncate(result.error, 120);
	if (typeof result.count === "number") return `${result.count} result(s)`;
	if (result.deleted && result.id) return `deleted: ${result.id}`;
	if (result.mode === "saved" && result.languageLabel) {
		return `saved ${result.languageLabel}`;
	}
	if (result.mode === "fetch_source" && result.languageLabel) {
		return `source for ${result.languageLabel}`;
	}
	if (result.id && result.title) return `${result.title} (${result.id})`;
	if (result.id) return `id: ${result.id}`;
	if (result.updated) return `updated: ${result.updated.join(", ")}`;
	if (result.ok === false) return result.error || "failed";
	return "ok";
}

function sanitizeParams(params) {
	if (!params || typeof params !== "object") return {};
	const out = {};
	for (const [k, v] of Object.entries(params)) {
		if ((k === "bodyMarkdown" || k === "translated_markdown") && typeof v === "string") {
			out[k] = `[${v.length} chars]`;
		} else if (typeof v === "string") {
			out[k] = truncate(v, 160);
		} else {
			out[k] = v;
		}
	}
	return out;
}

/**
 * @returns {Promise<{ id: string }>}
 */
export async function logMcpInvocation(uid, entry) {
	if (!uid) return { id: null };

	const db = getAdminFirestore();
	const logId = `ml_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const now = FieldValue.serverTimestamp();
	const params = sanitizeParams(entry.params);
	const resultSummary = entry.resultSummary ?? summarizeResult(entry.tool, entry.result);

	const logDoc = {
		tool: entry.tool || "unknown",
		method: entry.method || "",
		path: entry.path || "",
		params,
		status: entry.status || "ok",
		statusCode: entry.statusCode ?? null,
		durationMs: entry.durationMs ?? null,
		keyId: entry.keyId || null,
		keyName: entry.keyName || null,
		resultSummary,
		error: entry.error ? truncate(entry.error, 200) : null,
		createdAt: now,
	};

	await logsCollection(uid).doc(logId).set(logDoc);

	const integrationUpdate = {
		status: "connected",
		lastActivityAt: now,
		lastTool: entry.tool || null,
		lastKeyName: entry.keyName || null,
		totalInvocations: FieldValue.increment(1),
	};

	const integrationSnap = await integrationRef(uid).get();
	if (!integrationSnap.exists) {
		integrationUpdate.firstConnectedAt = now;
	}

	await integrationRef(uid).set(integrationUpdate, { merge: true });

	if (entry.keyId) {
		await userKeysCollection(uid)
			.doc(entry.keyId)
			.set({ lastUsedAt: now }, { merge: true })
			.catch(() => {});
	}

	// Trim old logs (best-effort, don't block response)
	trimOldLogs(uid).catch(() => {});

	return { id: logId };
}

async function trimOldLogs(uid) {
	const snap = await logsCollection(uid).orderBy("createdAt", "desc").offset(LOG_RETENTION_CAP).limit(20).get();
	if (snap.empty) return;
	const batch = getAdminFirestore().batch();
	snap.docs.forEach((d) => batch.delete(d.ref));
	await batch.commit();
}

/**
 * @returns {Promise<{ status, firstConnectedAt, lastActivityAt, totalInvocations, lastTool, lastKeyName }|null>}
 */
export async function getMcpIntegrationStatus(uid) {
	if (!uid) return null;
	const snap = await integrationRef(uid).get();
	if (!snap.exists) return { status: "pending", totalInvocations: 0 };
	const data = snap.data();
	return {
		status: data.status || "pending",
		firstConnectedAt: data.firstConnectedAt?.toDate?.()?.toISOString?.() || null,
		lastActivityAt: data.lastActivityAt?.toDate?.()?.toISOString?.() || null,
		totalInvocations: data.totalInvocations || 0,
		lastTool: data.lastTool || null,
		lastKeyName: data.lastKeyName || null,
	};
}

/**
 * @returns {Promise<Array<object>>}
 */
export async function listMcpLogsForUser(uid, limit = 50) {
	if (!uid) return [];
	const cap = Math.min(Math.max(limit, 1), 100);
	let snap;
	try {
		snap = await logsCollection(uid).orderBy("createdAt", "desc").limit(cap).get();
	} catch {
		snap = await logsCollection(uid).limit(cap).get();
	}
	return snap.docs.map((d) => {
		const data = d.data();
		return {
			id: d.id,
			tool: data.tool || "",
			method: data.method || "",
			path: data.path || "",
			params: data.params || {},
			status: data.status || "ok",
			statusCode: data.statusCode ?? null,
			durationMs: data.durationMs ?? null,
			keyName: data.keyName || null,
			resultSummary: data.resultSummary || null,
			error: data.error || null,
			createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
		};
	});
}
