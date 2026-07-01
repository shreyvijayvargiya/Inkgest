import Fuse from "fuse.js";

/**
 * @param {Array<{ value: string, label: string, searchText?: string }>} options
 * @param {string} query
 */
export function searchSelectOptionsWithFuse(options = [], query = "") {
	const q = String(query || "").trim();
	if (!q) return options;
	if (!options.length) return [];

	const fuse = new Fuse(options, {
		keys: [
			{ name: "label", weight: 0.55 },
			{ name: "searchText", weight: 0.35 },
			{ name: "value", weight: 0.1 },
		],
		threshold: 0.38,
		ignoreLocation: true,
	});

	return fuse.search(q).map((r) => r.item);
}
