import { persistGenerateResponse } from "./persistGenerateResponse";
import { createDraft } from "../api/userAssets";
import { getInkAgentEndAssets } from "./consumeInkAgentSse";

function extractTitleFromMarkdown(body) {
	const lines = String(body || "").split("\n");
	const h = lines.find((l) => /^#{1,6}\s/.test(l.trim()));
	if (h) return h.replace(/^#+\s*/, "").trim();
	return "Generated";
}

function tagForAssetType(type) {
	const t = String(type || "").toLowerCase();
	if (t.includes("newsletter") || t.includes("substack")) return "Newsletter";
	if (t.includes("linkedin")) return "LinkedIn";
	if (t.includes("twitter") || t.includes("tweet")) return "Twitter";
	if (t.includes("email")) return "Email";
	return "Blog";
}

function normalizeExecutedTask(raw) {
	if (!raw || typeof raw !== "object") return null;
	const result =
		raw.result && typeof raw.result === "object" ? raw.result : {};

	const content =
		typeof raw.content === "string"
			? raw.content
			: typeof result.content === "string"
				? result.content
				: typeof raw.markdown === "string"
					? raw.markdown
					: typeof result.markdown === "string"
						? result.markdown
						: "";

	const infographics = raw.infographics ?? result.infographics;
	const columns = raw.columns ?? result.columns;
	const rows = raw.rows ?? result.rows;
	const html =
		typeof raw.html === "string"
			? raw.html
			: typeof result.html === "string"
				? result.html
				: "";

	if (Array.isArray(infographics) && infographics.length > 0) {
		return {
			success: true,
			infographics,
			title: raw.title || result.title || "Infographics",
			description: raw.description || result.description || "",
		};
	}

	if (Array.isArray(columns) && columns.length > 0 && Array.isArray(rows)) {
		return {
			success: true,
			columns,
			rows,
			title: raw.title || result.title || "Table",
			description: raw.description || result.description || "",
		};
	}

	if (typeof html === "string" && html.trim()) {
		return {
			success: true,
			html,
			title: raw.title || result.title || "Landing page",
			url: raw.url || result.url || "",
			description: raw.description || "",
		};
	}

	if (typeof content === "string" && content.trim()) {
		return {
			success: true,
			content,
			title: raw.title || result.title,
			urls: raw.urls ?? raw.sourceUrls ?? result.urls,
		};
	}

	return null;
}

function inferGenerateType(raw) {
	const t = String(raw?.type || raw?.taskType || "").toLowerCase();
	if (t.includes("newsletter") || t.includes("substack")) return "newsletter";
	if (t.includes("infographic")) return "infographics";
	if (t.includes("table")) return "table";
	if (t.includes("landing")) return "landing-page";
	if (t.includes("gallery") || t.includes("image-gallery"))
		return "image-gallery";
	return "blog";
}

function assetToGenerateData(asset) {
	if (!asset || typeof asset !== "object") return null;
	const result =
		asset.result && typeof asset.result === "object" ? asset.result : {};
	const content =
		typeof asset.content === "string"
			? asset.content
			: typeof result.content === "string"
				? result.content
				: "";
	const html =
		typeof asset.html === "string"
			? asset.html
			: typeof result.html === "string"
				? result.html
				: "";
	const infographics = asset.infographics ?? result.infographics;
	const columns = asset.columns ?? result.columns;
	const rows = asset.rows ?? result.rows;
	const label = asset.label || asset.title || result.title || "";

	if (Array.isArray(infographics) && infographics.length > 0) {
		return {
			success: true,
			infographics,
			title: label || "Infographics",
			description: asset.description || result.description || "",
		};
	}

	if (Array.isArray(columns) && columns.length > 0 && Array.isArray(rows)) {
		return {
			success: true,
			columns,
			rows,
			title: label || "Table",
			description: asset.description || result.description || "",
		};
	}

	if (typeof html === "string" && html.trim()) {
		return {
			success: true,
			html,
			title: label || "Landing page",
			url: asset.url || result.url || "",
			description: asset.description || "",
		};
	}

	if (typeof content === "string" && content.trim()) {
		return {
			success: true,
			content,
			title: label || extractTitleFromMarkdown(content),
			urls: asset.sources ?? asset.urls ?? result.urls,
		};
	}

	return null;
}

async function persistSingleAgentAsset({
	uid,
	asset,
	prompt,
	urlList,
	queryClient,
}) {
	const data = assetToGenerateData(asset);
	if (!data?.success) return [];

	const generateType = inferGenerateType(asset);
	const sources = Array.isArray(asset.sources)
		? asset.sources
		: Array.isArray(data.urls)
			? data.urls
			: urlList;
	const meta = {
		...(asset.multiBlogIndex != null
			? { multiBlogIndex: asset.multiBlogIndex }
			: {}),
		...(asset.multiBlogTotal != null
			? { multiBlogTotal: asset.multiBlogTotal }
			: {}),
		prompt: asset.params?.prompt ?? prompt ?? "",
	};
	const format = asset.format ?? asset.params?.format ?? "substack";

	if (
		data.content &&
		!data.infographics &&
		!data.columns &&
		!data.html
	) {
		const title =
			asset.label ||
			data.title ||
			extractTitleFromMarkdown(data.content);
		const bodyText = data.content
			.split("\n")
			.filter((l) => !/^#{1,6}\s/.test(l.trim()))
			.join(" ")
			.replace(/[*_`]/g, "")
			.replace(/\s+/g, " ")
			.trim();
		const draft = {
			title,
			preview:
				bodyText.slice(0, 180) + (bodyText.length > 180 ? "…" : ""),
			body: data.content,
			urls: sources ?? [],
			sources: sources ?? [],
			prompt: asset.params?.prompt ?? prompt ?? "",
			words: data.content.trim().split(/\s+/).filter(Boolean).length,
			date: new Date().toLocaleDateString("en-US", {
				weekday: "short",
				month: "short",
				day: "numeric",
			}),
			tag: tagForAssetType(asset.type),
			format,
			meta,
			agentType: asset.type || generateType,
		};
		const { id } = await createDraft(uid, draft);
		if (queryClient)
			queryClient.invalidateQueries({ queryKey: ["assets", uid] });
		return [
			{
				type: generateType,
				label: title,
				id,
				path: `/app/${id}`,
				multiBlogIndex: asset.multiBlogIndex,
				multiBlogTotal: asset.multiBlogTotal,
			},
		];
	}

	const batch = await persistGenerateResponse({
		uid,
		generateType,
		data,
		prompt: asset.params?.prompt ?? prompt,
		urlList: sources ?? urlList,
		format,
		queryClient,
	});
	return batch.map((row) => ({
		...row,
		label: asset.label || row.label,
		multiBlogIndex: asset.multiBlogIndex,
		multiBlogTotal: asset.multiBlogTotal,
	}));
}

/**
 * Persist inkgest-agent final payload (executed tasks and/or streamed markdown) via persistGenerateResponse.
 *
 * @param {object} opts
 * @param {string} opts.uid
 * @param {object} opts.finalPayload
 * @param {string} opts.streamedText
 * @param {string[]} opts.urlList
 * @param {string} opts.prompt
 * @param {import("@tanstack/react-query").QueryClient | null} opts.queryClient
 * @returns {Promise<Array<{ type: string, label?: string, id: string, path: string }>>}
 */
export async function persistAgentResults({
	uid,
	finalPayload,
	streamedText,
	urlList,
	prompt,
	queryClient,
}) {
	if (!uid) return [];

	const endAssets = getInkAgentEndAssets(finalPayload);
	if (endAssets.length > 0) {
		const tasks = [];
		for (const asset of endAssets) {
			const batch = await persistSingleAgentAsset({
				uid,
				asset,
				prompt,
				urlList,
				queryClient,
			});
			tasks.push(...batch);
		}
		return tasks;
	}

	const executed =
		finalPayload?.executed ??
		finalPayload?.tasks ??
		finalPayload?.results ??
		[];

	const tasks = [];

	if (Array.isArray(executed) && executed.length > 0) {
		for (const raw of executed) {
			const data = normalizeExecutedTask(raw);
			if (!data?.success) continue;
			const generateType = inferGenerateType(raw);
			const batch = await persistGenerateResponse({
				uid,
				generateType,
				data,
				prompt,
				urlList,
				format: "substack",
				queryClient,
			});
			tasks.push(...batch);
		}
		return tasks;
	}

	const text =
		(typeof streamedText === "string" && streamedText.trim()
			? streamedText
			: typeof finalPayload?.content === "string"
				? finalPayload.content
				: ""
		).trim();

	if (text) {
		const batch = await persistGenerateResponse({
			uid,
			generateType: "blog",
			data: { success: true, content: text },
			prompt,
			urlList,
			format: "substack",
			queryClient,
		});
		return batch;
	}

	return [];
}
