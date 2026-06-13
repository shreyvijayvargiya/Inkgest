export const SIDEBAR_ASSET_LABELS = {
	table: "Table",
	draft: "Draft",
	infographics: "Infographics",
	landing_page: "Landing Page",
	image_gallery: "Gallery",
};

export function groupSidebarByProject(items, projects) {
	if (!projects?.length) return [{ id: "_all", name: "All assets", items }];
	const out = [];
	const seen = new Set();
	for (const p of projects) {
		const ids = new Set(p.assetIds || []);
		const projItems = items.filter((i) => ids.has(i.id));
		projItems.forEach((i) => seen.add(i.id));
		if (projItems.length > 0) {
			out.push({
				id: p.id,
				name: p.name || "Project",
				items: projItems,
			});
		}
	}
	const loose = items.filter((i) => !seen.has(i.id));
	if (loose.length > 0) {
		out.push({ id: "_unassigned", name: "Unassigned", items: loose });
	}
	return out.length > 0 ? out : [{ id: "_all", name: "All assets", items }];
}

export const SIDEBAR_ICONS = {
	search:
		"M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
	settings:
		"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
};
