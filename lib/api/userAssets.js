/**
 * User assets — drafts, tables, videos stored under users/{userId}/assets
 * Replaces root-level drafts and tables collections for cleaner structure.
 * Supports backward compatibility: reads try assets first, then fall back to drafts/tables.
 */

import {
	collection,
	doc,
	addDoc,
	getDoc,
	getDocs,
	updateDoc,
	deleteDoc,
	query,
	where,
	orderBy,
	serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

/** Collection ref for a user's assets */
export function assetsRef(userId) {
	if (!userId) return null;
	return collection(db, "users", userId, "assets");
}

/** Doc ref for a specific asset */
export function assetRef(userId, assetId) {
	if (!userId || !assetId) return null;
	return doc(db, "users", userId, "assets", assetId);
}

/** Normalize asset doc for list display */
function normalizeAsset(d, type, source) {
	const data = d.data();
	const created = data.createdAt;
	const date =
		created?.toDate?.()?.toLocaleDateString?.("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		}) ?? "";
	return {
		id: d.id,
		type: type || data.type || "draft",
		title: data.title,
		description: data.description,
		preview: data.preview,
		createdAt: created,
		date,
		source: source || "assets",
		...data,
	};
}

/**
 * List all assets (drafts + tables) for a user.
 * Tries users/{uid}/assets first, then falls back to drafts + tables.
 * @returns {Promise<Array<{id, type, ...}>>}
 */
export async function listAssets(userId) {
	if (!userId) return [];
	const result = [];
	const seen = new Set();

	// 1. Try new path: users/{uid}/assets
	try {
		const ref = assetsRef(userId);
		let snap;
		try {
			const q = query(ref, orderBy("createdAt", "desc"));
			snap = await getDocs(q);
		} catch {
			// Index may not exist; fetch without orderBy and sort in memory
			snap = await getDocs(ref);
		}
		snap.docs.forEach((d) => {
			result.push(normalizeAsset(d, d.data().type, "assets"));
			seen.add(d.id);
		});
	} catch (e) {
		console.error("[listAssets] assets fetch failed:", e);
	}

	// 2. Fallback: drafts + tables
	try {
		const [draftsSnap, tablesSnap] = await Promise.all([
			getDocs(
				query(
					collection(db, "drafts"),
					where("userId", "==", userId),
					orderBy("createdAt", "desc"),
				),
			),
			getDocs(
				query(collection(db, "tables"), where("userId", "==", userId)),
			),
		]);
		draftsSnap.docs.forEach((d) => {
			if (!seen.has(d.id)) {
				result.push(normalizeAsset(d, "draft", "drafts"));
				seen.add(d.id);
			}
		});
		tablesSnap.docs.forEach((d) => {
			if (!seen.has(d.id)) {
				result.push(normalizeAsset(d, "table", "tables"));
				seen.add(d.id);
			}
		});
	} catch (e) {
		console.error("[listAssets] fallback failed:", e);
	}

	result.sort((a, b) => {
		const aT = a.createdAt?.toMillis?.() ?? a.createdAt?.getTime?.() ?? 0;
		const bT = b.createdAt?.toMillis?.() ?? b.createdAt?.getTime?.() ?? 0;
		return bT - aT;
	});
	return result;
}

/**
 * Get a single asset by ID.
 * Tries users/{uid}/assets first, then drafts, then tables.
 * @returns {Promise<{type, doc, source}|null>} source: "assets" | "drafts" | "tables"
 */
export async function getAsset(userId, assetId) {
	if (!userId || !assetId) return null;

	// 1. Try new path
	const ref = assetRef(userId, assetId);
	const snap = await getDoc(ref);
	if (snap.exists()) {
		const data = snap.data();
		/* Infer type from structure when missing or unknown */
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
		return {
			type,
			doc: { id: snap.id, ...data },
			source: "assets",
		};
	}

	// 2. Fallback: drafts
	const draftSnap = await getDoc(doc(db, "drafts", assetId));
	if (draftSnap.exists()) {
		const data = draftSnap.data();
		if (data.userId && data.userId !== userId) return null;
		return {
			type: "draft",
			doc: { id: draftSnap.id, ...data },
			source: "drafts",
		};
	}

	// 3. Fallback: tables
	const tableSnap = await getDoc(doc(db, "tables", assetId));
	if (tableSnap.exists()) {
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

/**
 * Create a draft asset
 * @returns {Promise<{id}>}
 */
export async function createDraft(userId, draft) {
	const ref = assetsRef(userId);
	if (!ref) throw new Error("User ID required");
	const docRef = await addDoc(ref, {
		type: "draft",
		...draft,
		createdAt: serverTimestamp(),
	});
	return { id: docRef.id };
}

/**
 * Create a table asset
 * @returns {Promise<{id}>}
 */
export async function createTable(userId, table) {
	const ref = assetsRef(userId);
	if (!ref) throw new Error("User ID required");
	const docRef = await addDoc(ref, {
		type: "table",
		...table,
		createdAt: serverTimestamp(),
	});
	return { id: docRef.id };
}

/**
 * Create an infographics asset (from backend inkgest-agent)
 * @returns {Promise<{id}>}
 */
export async function createInfographicsAsset(userId, data) {
	const ref = assetsRef(userId);
	if (!ref) throw new Error("User ID required");
	const docRef = await addDoc(ref, {
		type: "infographics",
		title: data.title || "Infographics",
		description: data.description || "",
		prompt: data.prompt || "",
		infographics: data.infographics || [],
		...data,
		createdAt: serverTimestamp(),
	});
	return { id: docRef.id };
}

/**
 * Create a landing page asset (HTML from backend API)
 * @returns {Promise<{id}>}
 */
export async function createLandingPageAsset(userId, data) {
	const ref = assetsRef(userId);
	if (!ref) throw new Error("User ID required");
	const docRef = await addDoc(ref, {
		type: "landing_page",
		title: data.title || "Landing Page",
		description: data.description || "",
		html: data.html || "",
		url: data.url || "",
		...data,
		createdAt: serverTimestamp(),
	});
	return { id: docRef.id };
}

/**
 * Create an image gallery asset
 * @returns {Promise<{id}>}
 */
export async function createImageGalleryAsset(userId, data) {
	const ref = assetsRef(userId);
	if (!ref) throw new Error("User ID required");
	const docRef = await addDoc(ref, {
		type: "image_gallery",
		title: data.title || "Image Gallery",
		description: data.description || "",
		images: data.images || [],
		...data,
		createdAt: serverTimestamp(),
	});
	return { id: docRef.id };
}

/**
 * Update an asset (draft or table).
 * @param {string} source - "assets" | "drafts" | "tables"
 */
export async function updateAsset(userId, assetId, updates, source = "assets") {
	const payload = { ...updates, updatedAt: serverTimestamp() };
	if (source === "assets") {
		const ref = assetRef(userId, assetId);
		if (!ref) throw new Error("User ID and asset ID required");
		await updateDoc(ref, payload);
	} else if (source === "drafts") {
		await updateDoc(doc(db, "drafts", assetId), payload);
	} else if (source === "tables") {
		await updateDoc(doc(db, "tables", assetId), payload);
	} else {
		throw new Error("Invalid source for updateAsset");
	}
}

/**
 * Delete an asset.
 * @param {string} source - "assets" | "drafts" | "tables"
 */
export async function deleteAsset(userId, assetId, source = "assets") {
	if (source === "assets") {
		const ref = assetRef(userId, assetId);
		if (!ref) throw new Error("User ID and asset ID required");
		await deleteDoc(ref);
	} else if (source === "drafts") {
		await deleteDoc(doc(db, "drafts", assetId));
	} else if (source === "tables") {
		await deleteDoc(doc(db, "tables", assetId));
	} else {
		throw new Error("Invalid source for deleteAsset");
	}
}
