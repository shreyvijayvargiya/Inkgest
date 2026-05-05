import { normalizePersistGenerateType } from "../api/generateClient";
import {
	createDraft,
	createTable,
	createInfographicsAsset,
	createLandingPageAsset,
	createImageGalleryAsset,
} from "../api/userAssets";

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
		react: "React",
	};
	return m[type] ?? "Draft";
}

/**
 * Persist a successful /generate/:type JSON response to Firestore; returns UI task rows.
 */
export async function persistGenerateResponse({
	uid,
	generateType: rawGenerateType,
	data,
	prompt,
	urlList,
	format,
	queryClient,
}) {
	if (!uid || !data?.success) return [];

	const generateType = normalizePersistGenerateType(rawGenerateType);

	const newTasks = [];
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

	if (generateType === "table" || (Array.isArray(columns) && columns.length > 0)) {
		const cols = columns ?? [];
		const r = rows ?? [];
		if (cols.length > 0) {
			const { id } = await createTable(uid, {
				title: data.title ?? data.result?.title ?? "Generated table",
				description: data.description ?? data.result?.description ?? "",
				columns: cols,
				rows: r,
				sourceUrls: urls ?? [],
				prompt: prompt ?? "",
			});
			if (queryClient)
				queryClient.invalidateQueries({ queryKey: ["assets", uid] });
			newTasks.push({
				type: "table",
				label: data.title ?? "Table",
				id,
				path: `/app/${id}`,
			});
		}
		return newTasks;
	}

	if (generateType === "landing-page") {
		const html =
			(typeof data.html === "string" && data.html.trim()
				? data.html
				: null) ??
			(typeof data.result?.html === "string" && data.result.html.trim()
				? data.result.html
				: null) ??
			(typeof content === "string" && content.trim() ? content : "");
		if (html && String(html).trim()) {
			const { id } = await createLandingPageAsset(uid, {
				title: data.title ?? data.result?.title ?? "Landing page",
				description: data.description ?? data.result?.description ?? "",
				html: String(html),
				url: data.url ?? data.result?.url ?? "",
				prompt: prompt ?? "",
			});
			if (queryClient)
				queryClient.invalidateQueries({ queryKey: ["assets", uid] });
			newTasks.push({
				type: "landing_page",
				label: data.title ?? "Landing page",
				id,
				path: `/app/${id}`,
			});
		}
		return newTasks;
	}

	if (generateType === "image-gallery") {
		const list = Array.isArray(images) ? images : [];
		if (list.length > 0) {
			const { id } = await createImageGalleryAsset(uid, {
				title: data.title ?? data.result?.title ?? "Image gallery",
				description: data.description ?? data.result?.description ?? "",
				images: list,
				prompt: prompt ?? "",
			});
			if (queryClient)
				queryClient.invalidateQueries({ queryKey: ["assets", uid] });
			newTasks.push({
				type: "image_gallery",
				label: data.title ?? "Image gallery",
				id,
				path: `/app/${id}`,
			});
		}
		return newTasks;
	}

	if (
		generateType === "infographics" ||
		(Array.isArray(infographics) && infographics.length > 0)
	) {
		const ig = Array.isArray(infographics) ? infographics : [];
		if (ig.length === 0) return newTasks;
		const { id } = await createInfographicsAsset(uid, {
			title: data.title || "Infographics",
			description: data.description || "",
			prompt: prompt ?? "",
			infographics: ig,
		});
		if (queryClient) queryClient.invalidateQueries({ queryKey: ["assets", uid] });
		newTasks.push({
			type: "infographics",
			label: data.title || "Infographics",
			id,
			path: `/app/${id}`,
		});
		return newTasks;
	}

	if (content && content.trim()) {
		const title = extractTitleFromMarkdown(content);
		const bodyText = content
			.split("\n")
			.filter((l) => !/^#{1,6}\s/.test(l.trim()))
			.join(" ")
			.replace(/[*_`]/g, "")
			.replace(/\s+/g, " ")
			.trim();
		const draft = {
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
		};
		const { id } = await createDraft(uid, draft);
		if (queryClient) queryClient.invalidateQueries({ queryKey: ["assets", uid] });
		newTasks.push({
			type: generateType,
			label: title,
			id,
			path: `/app/${id}`,
		});
	}

	return newTasks;
}
