/**
 * Re-run /generate for an existing asset and overwrite its Firestore document.
 */
import { getAsset } from "../api/userAssets";
import { requestGenerate, toGeneratePathType } from "../api/generateClient";
import { updateAssetFromGenerateResponse } from "./updateAssetFromGenerate";


/** Map stored asset type → POST /generate/:type path segment */
export function getGenerateTypeForAsset(docType, doc) {
	if (docType === "table") return "table";
	if (docType === "landing_page") return "landing-page";
	if (docType === "image_gallery") return "image-gallery";
	if (docType === "infographics") return "infographics";
	if (docType === "draft") return inferGenerateTypeFromDraft(doc);
}

function normalizeUrlList(doc, docType) {
	if (docType === "table") {
		const u = doc.sourceUrls || doc.urls;
		return Array.isArray(u) ? u.filter((x) => typeof x === "string") : [];
	}
	const u = doc.urls;
	if (Array.isArray(u)) return u.filter((x) => typeof x === "string");
	if (typeof doc.url === "string" && /^https?:\/\//i.test(doc.url))
		return [doc.url];
	return [];
}

/**
 * @returns {Promise<boolean>} true if asset was updated
 */
export async function regenerateAsset({
	uid,
	assetId,
	idToken,
	format = "substack",
	style = "casual",
	signal,
}) {
	const full = await getAsset(uid, assetId);
	if (!full?.doc) throw new Error("Asset not found");

	const doc = full.doc;
	const docType = full.type;
	const generateType = getGenerateTypeForAsset(docType, doc);
	const apiType = toGeneratePathType(generateType);
	const urls = normalizeUrlList(doc, docType);
	const prompt = String(doc.prompt || "").trim();

	const { data } = await requestGenerate({
		type: apiType,
		idToken,
		urls,
		prompt:
			prompt ||
			(docType === "landing_page"
				? "Refresh this landing page with improved copy and layout."
				: docType === "table"
					? "Regenerate this table from the same sources."
					: "Regenerate this content with the same intent."),
		format,
		style,
		signal,
	});

	if (!data?.success) {
		throw new Error(data?.error || data?.message || "Generation failed");
	}

	const ok = await updateAssetFromGenerateResponse({
		uid,
		existingAssetId: assetId,
		source: full.source,
		docType,
		generateType,
		data,
		prompt,
		urlList: urls,
		format,
	});

	return ok;
}
