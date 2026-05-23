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

function decodeHtmlEntities(str) {
	const s = String(str ?? "");
	if (typeof document !== "undefined") {
		const el = document.createElement("textarea");
		el.innerHTML = s;
		return el.value;
	}
	return s
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function youtubeTranscriptToMarkdown(segments) {
	if (!Array.isArray(segments) || segments.length === 0) return "";
	const parts = segments.map((seg) =>
		decodeHtmlEntities(seg?.text ?? "").trim(),
	);
	return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

/**
 * POST ${INKGEST_BACKEND}/scrape-youtube — video transcript (Hono API).
 */
export async function fetchScrapeYoutube(url) {
	const u = String(url || "").trim();
	const base = getInkgestGenerateBackendBase();
	const res = await fetch(`${base}/scrape-youtube`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id: u }),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok || data.success === false) {
		const msg =
			data.error ||
			data.details ||
			(typeof data.details === "string" ? data.details : null) ||
			`YouTube transcript failed (${res.status})`;
		throw new Error(msg);
	}
	const segments =
		data.data?.transcript ??
		data.transcript ??
		(Array.isArray(data.data) ? data.data : []);
	const markdown = youtubeTranscriptToMarkdown(segments);
	return {
		url: u,
		title: "YouTube transcript",
		markdown,
		transcript: segments,
		raw: data,
	};
}

/**
 * POST ${INKGEST_BACKEND}/generate/translate — markdown in, translated markdown out (Hono API).
 * @param {{ idToken: string, markdown: string, language: string, signal?: AbortSignal }} params
 */
export async function fetchTranslate({ idToken, markdown, language, signal }) {
	const base = getInkgestGenerateBackendBase();
	const res = await fetch(`${base}/generate/translate`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${idToken}`,
		},
		body: JSON.stringify({
			markdown: String(markdown || ""),
			language: String(language || "").trim(),
		}),
		signal,
	});

	const data = await res.json().catch(() => ({}));

	if (!res.ok) {
		const msg =
			data.error ||
			data.message ||
			(res.status === 429
				? `Rate limit exceeded. Retry in ${data.retryAfter ?? "?"}s`
				: `Translation failed (${res.status})`);
		const err = new Error(msg);
		err.status = res.status;
		err.code = data.code;
		throw err;
	}

	if (!data.success || !data.markdown) {
		throw new Error(data.error || "Translation returned empty content");
	}

	return {
		markdown: String(data.markdown),
		language: data.language,
		truncatedInput: Boolean(data.truncatedInput),
		inputChars: data.inputChars,
		usage: data.usage,
		raw: data,
	};
}
