/**
 * Apply a successful /generate response to an existing asset (regenerate flow).
 */
import { normalizePersistGenerateType } from "../api/generateClient";
import { updateAsset } from "../api/userAssets";

function extractTitleFromMarkdown(body) {
	const lines = String(body || "").split("\n");
	const h = lines.find((l) => /^#{1,6}\s/.test(l.trim()));
	if (h) return h.replace(/^#+\s*/, "").trim();
	return "Generated";
}

function tagForGenerateType(type) {
	const m = {
		blog: "Blog",
		article: "Article",
		email: "Email",
		newsletter: "Newsletter",
		linkedin: "LinkedIn",
		twitter: "Twitter",
		substack: "Substack",
	};
	return m[type] ?? "Draft";
}

/**
 * @param {object} p
 * @param {string} p.uid
 * @param {string} p.existingAssetId
 * @param {string} p.source — "assets" | "drafts" | "tables"
 * @param {string} p.docType — draft | table | landing_page | …
 * @param {string} p.generateType — raw API type before normalize
 * @param {object} p.data — API JSON body
 * @param {string} [p.prompt]
 * @param {string[]} [p.urlList]
 * @param {string} [p.format]
 */
export async function updateAssetFromGenerateResponse({
	uid,
	existingAssetId,
	source = "assets",
	docType,
	generateType: rawGenerateType,
	data,
	prompt,
	urlList,
	format,
}) {
	if (!uid || !existingAssetId || !data?.success) return false;

	const generateType = normalizePersistGenerateType(rawGenerateType);
	const urls = Array.isArray(data.urls) ? data.urls : urlList;

	const columns = data.columns ?? data.result?.columns;
	const rows = data.rows ?? data.result?.rows;
	const infographics = data.infographics ?? data.result?.infographics;
	const images = data.images ?? data.result?.images;
	const content =
		typeof data.content === "string"
			? data.content
			: typeof data.result?.content === "string"
				? data.result.content
				: "";

	if (docType === "table" || generateType === "table" || (Array.isArray(columns) && columns.length > 0)) {
		const cols = columns ?? [];
		const r = rows ?? [];
		if (cols.length === 0) return false;
		await updateAsset(
			uid,
			existingAssetId,
			{
				title: data.title ?? data.result?.title ?? "Generated table",
				description: data.description ?? data.result?.description ?? "",
				columns: cols,
				rows: r,
				sourceUrls: urls ?? [],
				prompt: prompt ?? "",
			},
			source,
		);
		return true;
	}

	if (docType === "landing_page" || generateType === "landing-page") {
		const html =
			(typeof data.html === "string" && data.html.trim()
				? data.html
				: null) ??
			(typeof data.result?.html === "string" && data.result.html.trim()
				? data.result.html
				: null) ??
			(typeof content === "string" && content.trim() ? content : "");
		if (!String(html || "").trim()) return false;
		await updateAsset(
			uid,
			existingAssetId,
			{
				title: data.title ?? data.result?.title ?? "Landing page",
				description: data.description ?? data.result?.description ?? "",
				html: String(html),
				url: data.url ?? data.result?.url ?? "",
				prompt: prompt ?? "",
			},
			source,
		);
		return true;
	}

	if (docType === "image_gallery" || generateType === "image-gallery") {
		const list = Array.isArray(images) ? images : [];
		if (list.length === 0) return false;
		await updateAsset(
			uid,
			existingAssetId,
			{
				title: data.title ?? data.result?.title ?? "Image gallery",
				description: data.description ?? data.result?.description ?? "",
				images: list,
				prompt: prompt ?? "",
			},
			source,
		);
		return true;
	}

	if (docType === "infographics" || generateType === "infographics") {
		const ig = Array.isArray(infographics) ? infographics : [];
		if (ig.length === 0) return false;
		await updateAsset(
			uid,
			existingAssetId,
			{
				title: data.title || "Infographics",
				description: data.description || "",
				prompt: prompt ?? "",
				infographics: ig,
			},
			source,
		);
		return true;
	}

	if (docType === "draft") {
		if (!content?.trim()) return false;
		const title = extractTitleFromMarkdown(content);
		const bodyText = content
			.split("\n")
			.filter((l) => !/^#{1,6}\s/.test(l.trim()))
			.join(" ")
			.replace(/[*_`]/g, "")
			.replace(/\s+/g, " ")
			.trim();
		await updateAsset(
			uid,
			existingAssetId,
			{
				title,
				preview: bodyText.slice(0, 180) + (bodyText.length > 180 ? "…" : ""),
				body: content,
				urls: urls ?? [],
				prompt: prompt ?? "",
				words: content.trim().split(/\s+/).filter(Boolean).length,
				date: new Date().toLocaleDateString("en-US", {
					weekday: "short",
					month: "short",
					day: "numeric",
				}),
				tag: tagForGenerateType(generateType),
				format: format ?? "substack",
			},
			source,
		);
		return true;
	}

	return false;
}
