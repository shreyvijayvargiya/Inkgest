import { checkAndDeductCredit } from "../../../lib/utils/credits";
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";
import { checkRateLimit } from "../../../lib/utils/rateLimit";
import { validateUrls } from "../../../lib/utils/urlAllowlist";
import { scrapeUrls } from "../../../lib/utils/scrapeApi";
import {
	TABLE_SYSTEM_PROMPT,
	parseTableJson,
	MAX_CONTENT_CHARS,
} from "../../../lib/prompts/table";

// No body size limit — tables can be large
const URL_REGEX = /^https?:\/\/\S+$/i;

async function callOpenRouter(apiKey, messages) {
	const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
	const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
			...(process.env.OPENROUTER_HTTP_REFERER
				? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER }
				: {}),
		},
		body: JSON.stringify({
			model,
			messages,
			temperature: 0.2,
			max_tokens: 4096,
		}),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error?.message || `OpenRouter error (${res.status})`);
	}
	return data?.choices?.[0]?.message?.content || "";
}

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const { url, urls: urlsBody, sources: preScrapedSources, prompt: userPrompt, idToken } = req.body || {};

	// ── Auth ──────────────────────────────────────────────────────────────────
	if (!idToken) {
		return res.status(401).json({ error: "Authentication required." });
	}
	let uid;
	try {
		uid = await verifyFirebaseToken(idToken);
	} catch (e) {
		return res.status(401).json({ error: e.message });
	}

	// ── Rate limit ────────────────────────────────────────────────────────────
	const rateLimit = await checkRateLimit(req, { identifier: uid });
	if (!rateLimit.allowed) {
		return res.status(429).json({
			error: "Too many requests. Please try again later.",
			retryAfter: rateLimit.resetIn,
		});
	}

	// ── Validate input ────────────────────────────────────────────────────────
	const urlList =
		Array.isArray(urlsBody) && urlsBody.length > 0
			? urlsBody.map((u) => String(u || "").trim()).filter(Boolean)
			: url && String(url).trim()
				? [String(url).trim()]
				: [];

	const hasPreScraped =
		Array.isArray(preScrapedSources) &&
		preScrapedSources.length > 0 &&
		preScrapedSources.every(
			(s) => s && typeof s.url === "string" && (typeof s.markdown === "string" || typeof s.content === "string")
		);

	if (!hasPreScraped && urlList.length === 0) {
		return res
			.status(400)
			.json({ error: "At least one valid URL or pre-scraped sources is required." });
	}
	if (!hasPreScraped && urlList.length > 10) {
		return res.status(400).json({ error: "Maximum 10 URLs per request." });
	}
	if (urlList.length > 0 && urlList.some((u) => !URL_REGEX.test(u))) {
		return res.status(400).json({ error: "One or more URLs are invalid." });
	}
	if (urlList.length > 0) {
		const urlValidation = validateUrls(urlList);
		if (!urlValidation.valid) {
			return res.status(400).json({ error: urlValidation.error });
		}
	}
	if (!userPrompt?.trim()) {
		return res.status(400).json({
			error: "A prompt describing what table to generate is required.",
		});
	}

	const openRouterKey = process.env.OPENROUTER_API_KEY;
	if (!openRouterKey) {
		return res.status(500).json({ error: "Server API keys not configured." });
	}

	// ── Credits — table uses scrape + AI = 2 credits ─────────────────────────
	const creditCheck = await checkAndDeductCredit(uid, 2);
	if (!creditCheck.allowed) {
		return res.status(429).json({ error: creditCheck.error });
	}

	// ── Use pre-scraped sources or scrape ────────────────────────────────────
	let sources;
	let scrapeErrors = [];

	if (hasPreScraped) {
		sources = preScrapedSources.map((s) => ({
			url: s.url,
			content: (s.markdown || s.content || "").slice(0, MAX_CONTENT_CHARS),
		}));
	} else {
		const scraped = await scrapeUrls({
			urls: urlList,
			apiKey: process.env.BUILDSAAS_API_KEY || "apiKey",
		});
		sources = scraped.sources.map((s) => ({
			url: s.url,
			content: (s.markdown || "").slice(0, MAX_CONTENT_CHARS),
		}));
		scrapeErrors = scraped.scrapeErrors;

		if (sources.length === 0) {
			return res.status(422).json({
				error:
					"Could not extract content from any URL. Please check the URLs and try again.",
				details: scrapeErrors,
			});
		}
	}

	const effectiveUrlList = urlList.length > 0 ? urlList : sources.map((s) => s.url);

	const combinedContent = sources
		.map((s, i) => `--- SOURCE ${i + 1}: ${s.url} ---\n\n${s.content}`)
		.join("\n\n");

	// ── LLM ───────────────────────────────────────────────────────────────────
	let raw;
	try {
		const urlListStr = effectiveUrlList.length === 1 ? effectiveUrlList[0] : effectiveUrlList.join(", ");
		raw = await callOpenRouter(openRouterKey, [
			{ role: "system", content: TABLE_SYSTEM_PROMPT },
			{
				role: "user",
				content: `URL(s): ${urlListStr}\n\nUser request: ${userPrompt.trim()}\n\nScraped content from ${sources.length} source(s):\n\n${combinedContent}`,
			},
		]);
	} catch (e) {
		return res
			.status(502)
			.json({ error: `AI generation failed: ${e.message}` });
	}

	// ── Parse ─────────────────────────────────────────────────────────────────
	let tableData;
	try {
		tableData = parseTableJson(raw);
	} catch {
		return res.status(500).json({
			error: "AI returned malformed data. Please try a more specific prompt.",
		});
	}

	if (!tableData.columns?.length) {
		return res.status(500).json({
			error: "AI did not return valid columns. Try a different prompt.",
		});
	}

	return res.status(200).json({
		success: true,
		title: tableData.title || "Generated Table",
		description: tableData.description || "",
		columns: tableData.columns,
		rows: tableData.rows || [],
		sourceUrls: effectiveUrlList,
		sourceUrl: effectiveUrlList[0],
		scrapeErrors: scrapeErrors.length > 0 ? scrapeErrors : undefined,
	});
}
