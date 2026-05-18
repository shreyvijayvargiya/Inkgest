import { persistGenerateResponse } from "./persistGenerateResponse";

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
