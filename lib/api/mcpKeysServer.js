/**
 * MCP API keys — Firestore (Admin SDK).
 *
 * users/{uid}/mcpKeys/{keyId}  — list/revoke for user UI
 * mcp_api_keys/{sha256}        — O(1) lookup on MCP requests
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "../config/firebaseAdmin";
import {
	createMcpKeyId,
	generateMcpApiKey,
	hashMcpApiKey,
	mcpKeyPrefix,
} from "../utils/mcpKeyCrypto";

function userKeysCollection(uid) {
	return getAdminFirestore().collection("users").doc(uid).collection("mcpKeys");
}

function lookupRef(keyHash) {
	return getAdminFirestore().collection("mcp_api_keys").doc(keyHash);
}

/**
 * @returns {Promise<string|null>} Firebase UID
 */
export async function lookupUidByMcpApiKey(apiKey) {
	const meta = await lookupMcpKeyMeta(apiKey);
	return meta?.uid || null;
}

/**
 * @returns {Promise<{ uid, keyId, keyName }|null>}
 */
export async function lookupMcpKeyMeta(apiKey) {
	if (!apiKey) return null;
	const keyHash = hashMcpApiKey(apiKey);
	const snap = await lookupRef(keyHash).get();
	if (!snap.exists) return null;
	const data = snap.data();
	if (data.revokedAt) return null;
	if (!data.uid) return null;
	return {
		uid: data.uid,
		keyId: data.keyId || null,
		keyName: data.name || "MCP key",
	};
}

/**
 * @returns {Promise<Array<{id, name, prefix, createdAt}>>}
 */
export async function listMcpKeysForUser(uid) {
	if (!uid) return [];
	let snap;
	try {
		snap = await userKeysCollection(uid).orderBy("createdAt", "desc").get();
	} catch {
		snap = await userKeysCollection(uid).get();
	}
	return snap.docs
		.filter((d) => !d.data().revokedAt)
		.map((d) => {
			const data = d.data();
			return {
				id: d.id,
				name: data.name || "MCP key",
				prefix: data.prefix || "",
				createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
				lastUsedAt: data.lastUsedAt?.toDate?.()?.toISOString?.() || null,
			};
		});
}

/**
 * @returns {Promise<{ id, apiKey, prefix, name }>} — apiKey shown once only
 */
export async function createMcpKeyForUser(uid, name = "Claude MCP") {
	if (!uid) throw new Error("User ID required");
	const apiKey = generateMcpApiKey();
	const keyHash = hashMcpApiKey(apiKey);
	const keyId = createMcpKeyId();
	const prefix = mcpKeyPrefix(apiKey);
	const label = String(name || "").trim() || "Claude MCP";
	const db = getAdminFirestore();
	const now = FieldValue.serverTimestamp();

	await db.runTransaction(async (tx) => {
		const lookupDoc = await tx.get(lookupRef(keyHash));
		if (lookupDoc.exists) throw new Error("Key collision — try again");

		tx.set(userKeysCollection(uid).doc(keyId), {
			name: label,
			prefix,
			keyHash,
			createdAt: now,
		});
		tx.set(lookupRef(keyHash), {
			uid,
			keyId,
			name: label,
			createdAt: now,
		});
	});

	return { id: keyId, apiKey, prefix, name: label };
}

export async function revokeMcpKeyForUser(uid, keyId) {
	if (!uid || !keyId) throw new Error("User ID and key ID required");
	const userRef = userKeysCollection(uid).doc(keyId);
	const userSnap = await userRef.get();
	if (!userSnap.exists) throw new Error("Key not found");
	const data = userSnap.data();
	if (data.keyHash) {
		await lookupRef(data.keyHash).delete();
	}
	await userRef.update({ revokedAt: FieldValue.serverTimestamp() });
}
