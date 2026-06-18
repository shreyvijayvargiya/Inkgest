import Fuse from "fuse.js";

/**
 * Fuse.js search across user assets (drafts / tables) for agent chat tooling.
 * Pass assets with optional `path` field (folder breadcrumb from workspace tree).
 *
 * @param {Array<object>} assets  — from listAssets(...) enriched with path
 * @param {string} query
 * @param {number} [limit=10]
 */
export function searchAssetsWithFuse(assets = [], query, limit = 10) {
	const q = String(query || "").trim();
	if (!q || !Array.isArray(assets) || assets.length === 0) return [];
	const list = assets.filter((a) =>
		["draft", "table"].includes(a?.type),
	);
	if (!list.length) return [];
	const fuse = new Fuse(list, {
		keys: [
			{ name: "title", weight: 0.4 },
			{ name: "path", weight: 0.28 },
			{ name: "preview", weight: 0.22 },
			{ name: "description", weight: 0.1 },
		],
		threshold: 0.4,
		ignoreLocation: true,
		includeScore: true,
	});
	return fuse.search(q, { limit }).map((r) => {
		const it = r.item;
		return {
			id: it.id,
			type: it.type,
			title: it.title || "(untitled)",
			path: it.path || "",
			preview: String(it.preview || it.description || "").slice(0, 220),
		};
	});
}
