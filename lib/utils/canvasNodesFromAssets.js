/**
 * Build InkAgent canvas nodes from Firestore asset rows (users/{uid}/assets).
 * No extra persistence — layout is derived on the client from existing assets.
 */

const NW = 280;
const NH = 188;

const START_X = 120;
const START_Y = 100;
const GAP_X = 72;
const GAP_Y = 24;
const COLS = 3;

function assetTimeMs(asset) {
	const c = asset?.createdAt;
	if (c?.toMillis) return c.toMillis();
	if (c?.seconds) return c.seconds * 1000;
	if (c instanceof Date) return c.getTime();
	return 0;
}

/** Map DB asset → canvas UI `type` key (see GenerateCanvasTab buildCanvasConfig). */
export function getCanvasNodeTypeFromAsset(asset) {
	const t = asset?.type;
	if (t === "table") return "table";
	if (t === "infographics") return "infographics";
	if (t === "landing_page") return "landingPage";
	if (t === "image_gallery") return "imageGallery";
	if (t === "draft") {
		const tag = String(asset.tag || "").toLowerCase();
		if (tag.includes("newsletter")) return "newsletter";
		if (tag.includes("twitter") || tag.includes("thread")) return "twitter";
		if (tag.includes("linkedin")) return "linkedin";
		if (tag.includes("article")) return "article";
		if (tag.includes("substack")) return "blog";
		if (tag.includes("email")) return "newsletter";
		return "blog";
	}
	return "blog";
}

/** Infer generate task type for drafts (taskTitleForType / Open link). */
function inferDraftTaskType(asset) {
	const tag = String(asset.tag || "").toLowerCase();
	if (tag.includes("newsletter")) return "newsletter";
	if (tag.includes("twitter") || tag.includes("thread")) return "twitter";
	if (tag.includes("linkedin")) return "linkedin";
	if (tag.includes("article")) return "article";
	if (tag.includes("substack")) return "substack";
	if (tag.includes("email")) return "email";
	return "blog";
}

function previewContentFromAsset(asset) {
	const t = asset?.type;
	if (t === "draft") {
		const body = typeof asset.body === "string" ? asset.body : "";
		return body.slice(0, 8000);
	}
	if (t === "table") {
		const cols = asset.columns?.length ?? 0;
		const rows = asset.rows?.length ?? 0;
		return `${cols} columns · ${rows} rows · ${asset.title || "Table"}`;
	}
	if (t === "infographics") {
		return String(asset.description || asset.title || "").slice(0, 8000);
	}
	if (t === "landing_page") {
		return String(asset.description || asset.title || "").slice(0, 8000);
	}
	if (t === "image_gallery") {
		const n = Array.isArray(asset.images) ? asset.images.length : 0;
		return `${n} images · ${asset.title || ""}`.slice(0, 8000);
	}
	return "";
}

function buildTasksFromAsset(asset) {
	const t = asset?.type;
	const id = asset?.id;
	if (!id) return [];
	const path = `/app/${id}`;
	if (t === "draft") {
		const taskType = inferDraftTaskType(asset);
		return [
			{
				type: taskType,
				id,
				path,
				label: asset.title || "Draft",
			},
		];
	}
	if (t === "table") {
		return [{ type: "table", id, path, label: asset.title || "Table" }];
	}
	if (t === "infographics") {
		return [
			{ type: "infographics", id, path, label: asset.title || "Infographics" },
		];
	}
	if (t === "landing_page") {
		return [
			{ type: "landing_page", id, path, label: asset.title || "Landing page" },
		];
	}
	if (t === "image_gallery") {
		return [
			{ type: "image_gallery", id, path, label: asset.title || "Gallery" },
		];
	}
	return [];
}

/**
 * @param {object} asset — row from listAssets
 * @param {{ x: number, y: number }} pos
 */
export function assetToCanvasNode(asset, pos) {
	const nodeType = getCanvasNodeTypeFromAsset(asset);
	return {
		id: asset.id,
		type: nodeType,
		title: asset.title || "Untitled",
		x: pos.x,
		y: pos.y,
		content: previewContentFromAsset(asset),
		parentId: null,
		tasks: buildTasksFromAsset(asset),
		pending: false,
		urlInput: "",
		promptInput: "",
		urls: Array.isArray(asset.urls) ? asset.urls : [],
	};
}

export function getDefaultStarterNode() {
	return {
		id: "1",
		type: "blog",
		title: "Start here",
		x: START_X,
		y: START_Y,
		content:
			"Start from the bar below or add a node — each block becomes a generated asset via the same generate API.",
		parentId: null,
		tasks: [],
		pending: false,
		urlInput: "",
		promptInput: "",
		urls: [],
	};
}

/**
 * Merge Firestore assets into canvas state: preserve x/y for existing ids, keep local pending nodes.
 * @param {object} opts
 * @param {Array} opts.assets
 * @param {Array} opts.prevNodes
 * @param {Set<string>} [opts.hiddenIds]
 * @returns {Array}
 */
export function mergeCanvasNodesFromAssets({
	assets = [],
	prevNodes = [],
	hiddenIds = new Set(),
}) {
	const starter = getDefaultStarterNode();
	const filtered = (Array.isArray(assets) ? assets : []).filter(
		(a) => a?.id && !hiddenIds.has(a.id),
	);
	const posById = new Map(
		prevNodes.map((n) => [n.id, { x: n.x, y: n.y }]),
	);
	const sorted = [...filtered].sort((a, b) => assetTimeMs(b) - assetTimeMs(a));
	const built = sorted.map((a, i) => {
		const row = Math.floor(i / COLS);
		const col = i % COLS;
		/** Local node may still use a temp id while tasks[0].id is the Firestore doc */
		const bridge = prevNodes.find(
			(n) => n.tasks?.[0]?.id === a.id && n.id !== a.id,
		);
		const x =
			posById.get(a.id)?.x ??
			(bridge ? posById.get(bridge.id)?.x : undefined) ??
			START_X + col * (NW + GAP_X);
		const y =
			posById.get(a.id)?.y ??
			(bridge ? posById.get(bridge.id)?.y : undefined) ??
			START_Y + row * (NH + GAP_Y);
		return assetToCanvasNode(a, { x, y });
	});
	const pendingKeep = prevNodes.filter((n) => {
		if (!n.pending) return false;
		return !built.some((b) => b.id === n.id);
	});
	if (built.length === 0 && pendingKeep.length === 0) {
		return [starter];
	}
	return [...built, ...pendingKeep];
}

export const CANVAS_GRID = { NW, NH, START_X, START_Y, GAP_X, GAP_Y, COLS };
