/**
 * GET /api/getPublicDoc?slug=<slug>
 * Fetches a published blog from the `published_blogs` top-level Firestore collection.
 * Falls back to looking up a doc by the raw docId if no slug match is found.
 */
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/config/firebase";

export default async function handler(req, res) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const { slug } = req.query;
	if (!slug || typeof slug !== "string") {
		return res.status(400).json({ error: "slug query param required" });
	}

	try {
		// 1. Direct lookup by slug (doc ID in published_blogs)
		const slugRef = doc(db, "published_blogs", slug);
		const slugSnap = await getDoc(slugRef);
		if (slugSnap.exists()) {
			return res.status(200).json({ ...slugSnap.data(), id: slugSnap.id });
		}

		// 2. Try querying by slug field (handles edge cases)
		const q = query(
			collection(db, "published_blogs"),
			where("slug", "==", slug),
		);
		const qSnap = await getDocs(q);
		if (!qSnap.empty) {
			const d = qSnap.docs[0];
			return res.status(200).json({ ...d.data(), id: d.id });
		}

		// 3. Fallback: treat slug as a raw docId, check published_blogs where assetId == slug
		const idQ = query(
			collection(db, "published_blogs"),
			where("assetId", "==", slug),
		);
		const idSnap = await getDocs(idQ);
		if (!idSnap.empty) {
			const d = idSnap.docs[0];
			return res.status(200).json({ ...d.data(), id: d.id });
		}

		return res.status(404).json({ error: "Blog not found or not published" });
	} catch (err) {
		console.error("[getPublicDoc] error:", err);
		return res.status(500).json({ error: err?.message || "Internal server error" });
	}
}
