/**
 * Canvas projects — Firestore (Admin SDK) for MCP routes.
 * Collection: users/{uid}/projects/{projectId}
 */

import { getAdminFirestore } from "../config/firebaseAdmin";

function projectsCollection(uid) {
	return getAdminFirestore().collection("users").doc(uid).collection("projects");
}

function toIso(value) {
	if (!value) return null;
	if (typeof value === "string") return value;
	if (value.toDate) return value.toDate().toISOString();
	return null;
}

/**
 * @returns {Promise<Array<{ id, name, order, assetCount, createdAt, updatedAt }>>}
 */
export async function listCanvasProjectsServer(uid) {
	if (!uid) return [];
	let snap;
	try {
		snap = await projectsCollection(uid).orderBy("order", "asc").get();
	} catch {
		snap = await projectsCollection(uid).get();
	}
	const rows = snap.docs.map((d) => {
		const data = d.data();
		const assetIds = Array.isArray(data.assetIds) ? data.assetIds : [];
		return {
			id: d.id,
			name: String(data.name || "").trim() || "Untitled project",
			order: data.order ?? 0,
			assetCount: assetIds.length,
			createdAt: toIso(data.createdAt),
			updatedAt: toIso(data.updatedAt),
		};
	});
	rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	return rows;
}
