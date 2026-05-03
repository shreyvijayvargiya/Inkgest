import { updateAsset } from "./userAssets";

/**
 * Merge-export metadata under `composioExportLinks` on a draft asset.
 * @param {string} userId
 * @param {string} assetId
 * @param {string} source assets | drafts
 * @param {"notion" | "googledocs"} platform
 * @param {{ url?: string, documentId?: string, notionParentId?: string }} patch
 */
export async function mergeDraftComposioExport(
	userId,
	assetId,
	source,
	platform,
	patch,
	existingLinks = {},
) {
	const next = {
		...(existingLinks && typeof existingLinks === "object"
			? existingLinks
			: {}),
		[platform]: {
			...(existingLinks?.[platform] || {}),
			...patch,
			lastPushedAt: new Date().toISOString(),
		},
	};
	await updateAsset(
		userId,
		assetId,
		{ composioExportLinks: next },
		source || "assets",
	);
	return next;
}
