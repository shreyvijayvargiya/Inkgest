/**
 * Canvas projects — users/{uid}/projects/{projectId}
 * Groups asset ids for InkAgent canvas + sidebar without duplicating asset payloads.
 */

import { db } from "../config/firebase";
import {
	collection,
	addDoc,
	getDocs,
	updateDoc,
	deleteDoc,
	doc,
	query,
	orderBy,
	serverTimestamp,
	arrayUnion,
	arrayRemove,
} from "firebase/firestore";

export function projectsCollectionRef(uid) {
	return collection(db, "users", uid, "projects");
}

export async function listCanvasProjects(uid) {
	if (!uid) return [];
	const ref = projectsCollectionRef(uid);
	let snap;
	try {
		snap = await getDocs(query(ref, orderBy("order", "asc")));
	} catch {
		snap = await getDocs(ref);
	}
	const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
	rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	return rows;
}

export async function createCanvasProject(uid, { name = "Untitled project", assetIds = [] }) {
	const ref = await addDoc(projectsCollectionRef(uid), {
		name: String(name || "").trim() || "Untitled project",
		assetIds: Array.isArray(assetIds) ? assetIds : [],
		order: Date.now(),
		createdAt: serverTimestamp(),
	});
	return ref.id;
}

export async function updateCanvasProject(uid, projectId, updates) {
	await updateDoc(doc(db, "users", uid, "projects", projectId), {
		...updates,
		updatedAt: serverTimestamp(),
	});
}

/** Persist canvas link lines: [{ id, from, to }] using node/asset ids */
export async function saveCanvasEdges(uid, projectId, edges) {
	if (!uid || !projectId) return;
	const clean = (Array.isArray(edges) ? edges : []).map((e) => ({
		id: String(e.id || `${e.from}-${e.to}`),
		from: String(e.from),
		to: String(e.to),
	}));
	await updateDoc(doc(db, "users", uid, "projects", projectId), {
		edges: clean,
		updatedAt: serverTimestamp(),
	});
}

export async function addAssetToCanvasProject(uid, projectId, assetId) {
	if (!projectId || !assetId) return;
	await updateDoc(doc(db, "users", uid, "projects", projectId), {
		assetIds: arrayUnion(assetId),
		updatedAt: serverTimestamp(),
	});
}

export async function removeAssetFromCanvasProject(uid, projectId, assetId) {
	if (!projectId || !assetId) return;
	await updateDoc(doc(db, "users", uid, "projects", projectId), {
		assetIds: arrayRemove(assetId),
		updatedAt: serverTimestamp(),
	});
}

export async function deleteCanvasProject(uid, projectId) {
	await deleteDoc(doc(db, "users", uid, "projects", projectId));
}
