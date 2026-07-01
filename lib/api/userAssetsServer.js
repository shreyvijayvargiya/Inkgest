/**
 * Server-side user assets via Firebase Admin (MCP + trusted API routes).
 * Mirrors lib/api/userAssets.js without client SDK / security rules.
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "../config/firebaseAdmin";

function assetsCollection(userId) {
	return getAdminFirestore().collection("users").doc(userId).collection("assets");
}

function normalizeAssetDoc(id, data, source = "assets") {
	const created = data.createdAt;
	const date =
		created?.toDate?.()?.toLocaleDateString?.("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		}) ?? "";
	return {
		id,
		type: data.type || "draft",
		title: data.title,
		description: data.description,
		preview: data.preview,
		createdAt: created,
		date,
		source,
		...data,
	};
}

/**
 * @returns {Promise<Array<object>>}
 */
export async function listAssetsServer(userId) {
	if (!userId) return [];
	const result = [];
	const seen = new Set();

	try {
		const snap = await assetsCollection(userId).orderBy("createdAt", "desc").get();
		snap.docs.forEach((d) => {
			result.push(normalizeAssetDoc(d.id, d.data(), "assets"));
			seen.add(d.id);
		});
	} catch {
		const snap = await assetsCollection(userId).get();
		snap.docs.forEach((d) => {
			result.push(normalizeAssetDoc(d.id, d.data(), "assets"));
			seen.add(d.id);
		});
	}

	const db = getAdminFirestore();

	try {
		const draftsSnap = await db
			.collection("drafts")
			.where("userId", "==", userId)
			.get();
		draftsSnap.docs.forEach((d) => {
			if (!seen.has(d.id)) {
				result.push(normalizeAssetDoc(d.id, d.data(), "drafts"));
				seen.add(d.id);
			}
		});
	} catch (e) {
		console.error("[listAssetsServer] drafts fallback:", e);
	}

	try {
		const tablesSnap = await db.collection("tables").where("userId", "==", userId).get();
		tablesSnap.docs.forEach((d) => {
			if (!seen.has(d.id)) {
				result.push(normalizeAssetDoc(d.id, d.data(), "tables"));
				seen.add(d.id);
			}
		});
	} catch (e) {
		console.error("[listAssetsServer] tables fallback:", e);
	}

	result.sort((a, b) => {
		const aT = a.createdAt?.toMillis?.() ?? a.createdAt?.getTime?.() ?? 0;
		const bT = b.createdAt?.toMillis?.() ?? b.createdAt?.getTime?.() ?? 0;
		return bT - aT;
	});
	return result;
}

/**
 * @returns {Promise<{type, doc, source}|null>}
 */
export async function getAssetServer(userId, assetId) {
	if (!userId || !assetId) return null;
	const db = getAdminFirestore();

	const assetSnap = await assetsCollection(userId).doc(assetId).get();
	if (assetSnap.exists) {
		const data = assetSnap.data();
		let type = data.type || "draft";
		if (
			!data.type ||
			!["draft", "table", "infographics", "landing_page", "image_gallery"].includes(
				data.type,
			)
		) {
			if (Array.isArray(data.columns)) type = "table";
			else if (Array.isArray(data.infographics) && data.infographics.length > 0)
				type = "infographics";
			else if (data.html || data.url) type = "landing_page";
			else if (Array.isArray(data.images) && data.images.length > 0)
				type = "image_gallery";
			else if (data.body != null) type = "draft";
		}
		return { type, doc: { id: assetSnap.id, ...data }, source: "assets" };
	}

	const draftSnap = await db.collection("drafts").doc(assetId).get();
	if (draftSnap.exists) {
		const data = draftSnap.data();
		if (data.userId && data.userId !== userId) return null;
		return {
			type: "draft",
			doc: { id: draftSnap.id, ...data },
			source: "drafts",
		};
	}

	const tableSnap = await db.collection("tables").doc(assetId).get();
	if (tableSnap.exists) {
		const data = tableSnap.data();
		if (data.userId && data.userId !== userId) return null;
		return {
			type: "table",
			doc: {
				id: tableSnap.id,
				title: data.title,
				description: data.description,
				columns: data.columns || [],
				rows: data.rows || [],
				sourceUrls: data.sourceUrls || [],
				prompt: data.prompt || "",
			},
			source: "tables",
		};
	}
	return null;
}

export async function createDraftServer(userId, draft) {
	if (!userId) throw new Error("User ID required");
	const ref = await assetsCollection(userId).add({
		type: "draft",
		...draft,
		createdAt: FieldValue.serverTimestamp(),
	});
	return { id: ref.id };
}

export async function updateAssetServer(userId, assetId, updates, source = "assets") {
	const payload = { ...updates, updatedAt: FieldValue.serverTimestamp() };
	const db = getAdminFirestore();
	if (source === "assets") {
		await assetsCollection(userId).doc(assetId).update(payload);
	} else if (source === "drafts") {
		await db.collection("drafts").doc(assetId).update(payload);
	} else if (source === "tables") {
		await db.collection("tables").doc(assetId).update(payload);
	} else {
		throw new Error("Invalid source for updateAssetServer");
	}
}
