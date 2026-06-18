/**
 * Workspace folder tree — users/{userId}/workspaceNodes/{nodeId}
 * Stores navigation structure only; asset payloads stay in users/{uid}/assets.
 */

import {
	collection,
	doc,
	addDoc,
	getDocs,
	updateDoc,
	serverTimestamp,
	writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";

export function workspaceNodesRef(userId) {
	if (!userId) return null;
	return collection(db, "users", userId, "workspaceNodes");
}

export function workspaceNodeRef(userId, nodeId) {
	if (!userId || !nodeId) return null;
	return doc(db, "users", userId, "workspaceNodes", nodeId);
}

/**
 * @returns {Promise<Array<{ id, kind, name, parentId, assetId, order, ... }>>}
 */
export async function listWorkspaceNodes(userId) {
	if (!userId) return [];
	const ref = workspaceNodesRef(userId);
	const snap = await getDocs(ref);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createFolder(userId, { parentId = null, name = "New folder" } = {}) {
	const ref = workspaceNodesRef(userId);
	if (!ref) throw new Error("User ID required");
	const docRef = await addDoc(ref, {
		kind: "folder",
		name: String(name || "").trim() || "New folder",
		parentId: parentId || null,
		assetId: null,
		order: Date.now(),
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});
	return { id: docRef.id };
}

export async function createFileNode(
	userId,
	{ parentId = null, assetId, name = null } = {},
) {
	if (!assetId) throw new Error("assetId required");
	const ref = workspaceNodesRef(userId);
	if (!ref) throw new Error("User ID required");
	const docRef = await addDoc(ref, {
		kind: "file",
		name: name ? String(name).trim() : null,
		parentId: parentId || null,
		assetId,
		order: Date.now(),
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});
	return { id: docRef.id };
}

export async function renameWorkspaceNode(userId, nodeId, name) {
	const ref = workspaceNodeRef(userId, nodeId);
	if (!ref) throw new Error("User ID and node ID required");
	await updateDoc(ref, {
		name: String(name || "").trim() || "Untitled",
		updatedAt: serverTimestamp(),
	});
}

export async function updateWorkspaceNode(userId, nodeId, updates) {
	const ref = workspaceNodeRef(userId, nodeId);
	if (!ref) throw new Error("User ID and node ID required");
	await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

/**
 * Delete a folder or file node. Folders: reparent direct children to this node's parent.
 */
export async function deleteWorkspaceNode(userId, nodeId) {
	if (!userId || !nodeId) return;
	const nodes = await listWorkspaceNodes(userId);
	const target = nodes.find((n) => n.id === nodeId);
	if (!target) return;

	const batch = writeBatch(db);
	const newParentId = target.parentId || null;

	for (const child of nodes) {
		if (child.parentId === nodeId) {
			batch.update(workspaceNodeRef(userId, child.id), {
				parentId: newParentId,
				updatedAt: serverTimestamp(),
			});
		}
	}
	batch.delete(workspaceNodeRef(userId, nodeId));
	await batch.commit();
}

/** Remove all file nodes pointing at an asset (e.g. on asset delete). */
export async function deleteFileNodesForAsset(userId, assetId) {
	if (!userId || !assetId) return;
	const nodes = await listWorkspaceNodes(userId);
	const matches = nodes.filter((n) => n.kind === "file" && n.assetId === assetId);
	if (!matches.length) return;
	const batch = writeBatch(db);
	for (const n of matches) {
		batch.delete(workspaceNodeRef(userId, n.id));
	}
	await batch.commit();
}

/** Collect all descendant node ids under a folder (not including the folder itself). */
export function collectDescendantIds(nodes, folderId) {
	const ids = new Set();
	const walk = (pid) => {
		for (const n of nodes) {
			if (n.parentId === pid) {
				ids.add(n.id);
				if (n.kind === "folder") walk(n.id);
			}
		}
	};
	walk(folderId);
	return ids;
}

/**
 * Move a workspace node to a new parent (and optional order).
 * Prevents nesting a folder inside itself or a descendant.
 */
export async function moveWorkspaceNode(
	userId,
	nodeId,
	{ parentId = null, order = null } = {},
) {
	if (!userId || !nodeId) return;
	const nodes = await listWorkspaceNodes(userId);
	const node = nodes.find((n) => n.id === nodeId);
	if (!node) return;

	const nextParent = parentId || null;
	if (node.kind === "folder" && nextParent) {
		const blocked = collectDescendantIds(nodes, nodeId);
		blocked.add(nodeId);
		if (blocked.has(nextParent)) {
			throw new Error("Cannot move a folder into itself or a subfolder");
		}
	}

	const payload = {
		parentId: nextParent,
		updatedAt: serverTimestamp(),
	};
	if (order != null) payload.order = order;
	await updateDoc(workspaceNodeRef(userId, nodeId), payload);
}

/** Place an asset in the tree — moves existing file node or creates one. */
export async function placeAssetInTree(userId, assetId, parentId = null) {
	if (!userId || !assetId) return;
	const nodes = await listWorkspaceNodes(userId);
	const existing = nodes.find((n) => n.kind === "file" && n.assetId === assetId);
	if (existing) {
		await moveWorkspaceNode(userId, existing.id, {
			parentId,
			order: Date.now(),
		});
		return existing.id;
	}
	const { id } = await createFileNode(userId, { parentId, assetId });
	return id;
}
