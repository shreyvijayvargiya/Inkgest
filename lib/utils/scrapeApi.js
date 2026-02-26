/**
 * Scrape API — api.buildsaas.dev
 * Single URL: /scrap with { url }
 * Multiple URLs: /scrape-multiple with { urls }
 * Response: array of objects with data.markdown or data.data.markdown
 */

const SCRAP_SINGLE = "https://api.buildsaas.dev/scrape";
const SCRAP_MULTIPLE = "https://api.buildsaas.dev/scrape-multiple";

function extractMarkdown(item) {
	if (!item) return "";
	return (
		item?.data?.data?.markdown ||
		item?.data?.markdown ||
		item?.markdown ||
		item?.data?.content ||
		item?.data?.text ||
		""
	);
}

function extractTitle(item) {
	if (!item) return "";
	return (
		item?.data?.metadata?.title ||
		item?.data?.title ||
		item?.metadata?.title ||
		item?.title ||
		""
	);
}

function extractLinks(item) {
	return item?.data?.links || item?.links || [];
}

/**
 * Scrape a single URL
 * @param {{ url: string, apiKey: string, includeImages?: boolean }}
 * @returns {{ markdown: string, title: string, links: any[], raw: object }}
 */
export async function scrapeSingle({ url, apiKey, includeImages = false }) {
	const res = await fetch(SCRAP_SINGLE, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			url,
			...(includeImages ? { includeImages: true } : {}),
		}),
	});

	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error || `Scrape failed (${res.status})`);
	}

	const markdown = extractMarkdown(data);
	const title = extractTitle(data);
	const links = extractLinks(data);

	return { markdown, title, links, raw: data };
}

/**
 * Scrape multiple URLs in one request (batch)
 * @param {{ urls: string[], apiKey: string }}
 * @returns {{ results: Array<{ url: string, markdown: string, title: string, links: any[], raw: object }>, errors: Array<{ url: string, error: string }> }}
 */
export async function scrapeBatch({ urls, apiKey }) {
	const res = await fetch(SCRAP_MULTIPLE, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			urls,
		}),
	});

	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error || `Batch scrape failed (${res.status})`);
	}

	// Response can be array directly or wrapped in data
	const arr = Array.isArray(data) ? data : data?.data || data?.results || [];
	const results = [];
	const errors = [];

	urls.forEach((url, idx) => {
		const item = arr[idx];
		if (!item) {
			errors.push({ url, error: "No response for this URL" });
			return;
		}
		const markdown = extractMarkdown(item);
		const title = extractTitle(item);
		const links = extractLinks(item);
		if (!markdown?.trim()) {
			errors.push({ url, error: "No content extracted" });
			return;
		}
		results.push({
			url,
			markdown,
			title,
			links,
			raw: item,
		});
	});

	return { results, errors };
}

/**
 * Scrape one or more URLs — uses batch when multiple, single when one
 * @param {{ urls: string[], apiKey: string, includeImages?: boolean }}
 * @returns {{ sources: Array<{ url: string, markdown: string, title: string }>, scrapeErrors: Array<{ url: string, error: string }> }}
 */
export async function scrapeUrls({ urls, apiKey, includeImages = false }) {
	const urlList = Array.isArray(urls) ? urls.filter(Boolean) : [];
	if (urlList.length === 0) {
		return { sources: [], scrapeErrors: [] };
	}

	if (urlList.length === 1) {
		try {
			const scraped = await scrapeSingle({
				url: urlList[0],
				apiKey,
				includeImages,
			});
			return {
				sources: [
					{
						url: urlList[0],
						markdown: scraped.markdown || "",
						title: scraped.title || "",
						links: scraped.links || [],
					},
				],
				scrapeErrors: [],
			};
		} catch (e) {
			return {
				sources: [],
				scrapeErrors: [{ url: urlList[0], error: e?.message || "Scrape failed" }],
			};
		}
	}

	// Multiple URLs — use batch endpoint
	try {
		const { results, errors } = await scrapeBatch({ urls: urlList, apiKey });
		return {
			sources: results.map((r) => ({
				url: r.url,
				markdown: r.markdown || "",
				title: r.title || "",
				links: r.links || [],
			})),
			scrapeErrors: errors,
		};
	} catch (e) {
		return {
			sources: [],
			scrapeErrors: urlList.map((url) => ({ url, error: e?.message || "Batch scrape failed" })),
		};
	}
}
