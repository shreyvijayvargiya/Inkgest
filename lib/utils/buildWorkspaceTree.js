import { SIDEBAR_ASSET_LABELS } from "./appSidebar";

/**
 * Build nested tree from flat workspace nodes + asset list.
 * Assets without a file node appear in looseAssets (backward compat).
 */
export function buildWorkspaceTree(nodes = [], assets = []) {
	const assetMap = new Map(assets.map((a) => [a.id, a]));
	const placedAssetIds = new Set(
		nodes.filter((n) => n.kind === "file" && n.assetId).map((n) => n.assetId),
	);

	const nodeMap = new Map();
	for (const n of nodes) {
		nodeMap.set(n.id, { ...n, children: [] });
	}

	const roots = [];
	for (const n of nodes) {
		const entry = nodeMap.get(n.id);
		if (!entry) continue;
		if (n.parentId && nodeMap.has(n.parentId)) {
			nodeMap.get(n.parentId).children.push(entry);
		} else {
			roots.push(entry);
		}
	}

	const sortSiblings = (list) => {
		list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
		for (const item of list) {
			if (item.children?.length) sortSiblings(item.children);
		}
	};
	sortSiblings(roots);

	const looseAssets = assets
		.filter((a) => !placedAssetIds.has(a.id))
		.sort((a, b) => {
			const aT = a.createdAt?.toMillis?.() ?? a.createdAt?.getTime?.() ?? 0;
			const bT = b.createdAt?.toMillis?.() ?? b.createdAt?.getTime?.() ?? 0;
			return bT - aT;
		});

	return { roots, looseAssets, assetMap };
}

/** assetId → "/Folder/Sub/file" path string */
export function buildAssetPathMap(nodes = [], assets = []) {
	const { roots, looseAssets } = buildWorkspaceTree(nodes, assets);
	const map = new Map();

	const walk = (list, parts) => {
		for (const node of list) {
			if (node.kind === "folder") {
				walk(node.children || [], [...parts, node.name || "Folder"]);
			} else if (node.kind === "file" && node.assetId) {
				const path = parts.length ? `/${parts.join("/")}` : "";
				map.set(node.assetId, path);
			}
		}
	};
	walk(roots, []);
	for (const a of looseAssets) {
		if (!map.has(a.id)) map.set(a.id, "");
	}
	return map;
}

/**
 * Flatten tree + loose assets for sidebar search (folders + files with paths).
 */
export function flattenWorkspaceForSearch(nodes = [], assets = []) {
	const { roots, looseAssets, assetMap } = buildWorkspaceTree(nodes, assets);
	const out = [];

	const walk = (list, parts) => {
		for (const node of list) {
			const path = parts.length ? parts.join("/") : "";
			if (node.kind === "folder") {
				out.push({
					kind: "folder",
					nodeId: node.id,
					name: node.name || "Folder",
					path,
					searchText: `${node.name || ""} ${path} folder`.toLowerCase(),
				});
				walk(node.children || [], [...parts, node.name || "Folder"]);
			} else if (node.kind === "file" && node.assetId) {
				const item = assetMap.get(node.assetId);
				if (item) {
					const title = item.title || "Untitled";
					const tag =
						SIDEBAR_ASSET_LABELS[item.type] || item.tag || "Draft";
					out.push({
						kind: "file",
						nodeId: node.id,
						item,
						name: title,
						path,
						searchText: [
							title,
							path,
							item.preview,
							item.description,
							item.type,
							tag,
							item.format,
						]
							.filter(Boolean)
							.join(" ")
							.toLowerCase(),
					});
				}
			}
		}
	};
	walk(roots, []);

	for (const item of looseAssets) {
		const title = item.title || "Untitled";
		const tag = SIDEBAR_ASSET_LABELS[item.type] || item.tag || "Draft";
		out.push({
			kind: "file",
			nodeId: null,
			item,
			name: title,
			path: "",
			searchText: [
				title,
				item.preview,
				item.description,
				item.type,
				tag,
				item.format,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase(),
		});
	}

	return out;
}

export function filterWorkspaceSearch(flatEntries = [], query = "") {
	const q = String(query || "").trim().toLowerCase();
	if (!q) return flatEntries;
	return flatEntries.filter((e) => e.searchText.includes(q));
}

/** Compact text block for AI chat context */
export function formatWorkspaceTreeForAi(nodes = [], assets = [], { maxLines = 40 } = {}) {
	const { roots, looseAssets, assetMap } = buildWorkspaceTree(nodes, assets);
	const lines = [];

	const walk = (list, indent) => {
		for (const node of list) {
			if (lines.length >= maxLines) return;
			const pad = "  ".repeat(indent);
			if (node.kind === "folder") {
				lines.push(`${pad}/${node.name || "Folder"}`);
				walk(node.children || [], indent + 1);
			} else if (node.kind === "file" && node.assetId) {
				const a = assetMap.get(node.assetId);
				if (a) {
					lines.push(
						`${pad}- ${a.title || "Untitled"} (${a.type || "draft"}, id: ${a.id})`,
					);
				}
			}
		}
	};
	walk(roots, 0);

	if (looseAssets.length && lines.length < maxLines) {
		const n = looseAssets.length;
		lines.push(`(root files without folder: ${n})`);
		for (const a of looseAssets.slice(0, 5)) {
			if (lines.length >= maxLines) break;
			lines.push(`  - ${a.title || "Untitled"} (${a.type || "draft"}, id: ${a.id})`);
		}
		if (n > 5) lines.push(`  … and ${n - 5} more`);
	}

	if (!lines.length) return "";
	return `[Workspace layout:\n${lines.join("\n")}]\n\n`;
}
