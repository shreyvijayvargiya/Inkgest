import { LUCIDE_ICONS } from "../ui/IconSelectorDropdown.jsx";

/** Default sidebar icons by asset type */
export const DEFAULT_SIDEBAR_ICONS = {
	draft: { type: "lucide", name: "file-text" },
	table: { type: "lucide", name: "table" },
	infographics: { type: "lucide", name: "bar-chart" },
	landing_page: { type: "lucide", name: "layout" },
	image_gallery: { type: "lucide", name: "image" },
};

export function resolveSidebarIcon(item) {
	const stored = item?.sidebarIcon;
	if (stored?.type === "emoji" && stored.value) return stored;
	if (stored?.type === "lucide" && stored.name) return stored;
	return DEFAULT_SIDEBAR_ICONS[item?.type] || DEFAULT_SIDEBAR_ICONS.draft;
}

export function pickToSidebarIcon(pick) {
	if (pick.type === "emoji") {
		return { type: "emoji", value: pick.value };
	}
	if (pick.type === "lucide" && pick.icon?.name) {
		return { type: "lucide", name: pick.icon.name };
	}
	return null;
}

export function findLucideIcon(name) {
	return LUCIDE_ICONS.find((i) => i.name === name) || LUCIDE_ICONS[0];
}
