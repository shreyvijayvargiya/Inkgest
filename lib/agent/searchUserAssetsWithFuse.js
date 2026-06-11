import Fuse from "fuse.js";

/**
 * Fuse.js search across user assets (drafts / tables) for agent chat tooling.
 *
 * @param {Array<object>} assets  — from listAssets(...)
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
			{ name: "title", weight: 0.45 },
			{ name: "preview", weight: 0.32 },
			{ name: "description", weight: 0.18 },
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
			preview: String(it.preview || it.description || "").slice(0, 220),
		};
	});
}
