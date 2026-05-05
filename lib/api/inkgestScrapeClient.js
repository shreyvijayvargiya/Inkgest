import { getInkgestGenerateBackendBase } from "../config/generate";

/**
 * POST ${INKGEST_BACKEND}/scrape — single URL (Hono API).
 */
export async function fetchScrapeSingle(url) {
	const base = getInkgestGenerateBackendBase();
	const res = await fetch(`${base}/scrape`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ url: String(url).trim() }),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok || data.success === false) {
		const msg =
			data.error ||
			data.details ||
			(typeof data.details === "string" ? data.details : null) ||
			`Scrape failed (${res.status})`;
		throw new Error(msg);
	}
	const title =
		data.metadata?.title ||
		data.data?.metadata?.title ||
		data.title ||
		"";
	return {
		url: data.url || String(url).trim(),
		title: typeof title === "string" ? title : "",
		markdown: String(data.markdown || "").trim(),
		raw: data,
	};
}

/**
 * POST ${INKGEST_BACKEND}/scrape-multiple — parallel URLs (Hono API).
 */
export async function fetchScrapeMultiple(urls) {
	const list = [...new Set((urls || []).map((u) => String(u || "").trim()).filter(Boolean))];
	if (!list.length) {
		throw new Error("No valid URLs to scrape");
	}
	const base = getInkgestGenerateBackendBase();
	const res = await fetch(`${base}/scrape-multiple`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ urls: list }),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok || data.success === false) {
		const msg = data.error || `Batch scrape failed (${res.status})`;
		throw new Error(msg);
	}
	const results = Array.isArray(data.results) ? data.results : [];
	return results.map((r) => ({
		url: r.url || "",
		title:
			r.data?.metadata?.title ||
			r.metadata?.title ||
			"",
		markdown: r.success !== false ? String(r.markdown || "").trim() : "",
		error:
			r.success === false ? String(r.error || "Scrape failed") : undefined,
	}));
}
