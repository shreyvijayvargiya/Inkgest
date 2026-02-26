import { checkAndDeductCredit } from "../../../lib/utils/credits";
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";
import { checkRateLimit } from "../../../lib/utils/rateLimit";
import { validateUrls } from "../../../lib/utils/urlAllowlist";
import { scrapeUrls } from "../../../lib/utils/scrapeApi";

// No body size limit — tables can be large
const URL_REGEX = /^https?:\/\/\S+$/i;
const MAX_CONTENT_CHARS = 14000;

const SYSTEM_PROMPT = `You are a data-extraction and table-generation expert.

Given scraped webpage content and a user request, extract structured tabular data and return it as raw valid JSON — no markdown fences, no explanation, no extra text.

Use this exact schema:
{
  "title": "Descriptive title for this table",
  "description": "One-sentence description of what this data represents",
  "columns": [
    { "key": "snake_case_key", "label": "Human Readable Label", "type": "text|number|date|url|percentage" }
  ],
  "rows": [
    { "snake_case_key": "cell value" }
  ]
}

Rules:
- Create 3–8 columns; never exceed 8.
- Extract as many rows as the content supports (max 100 rows).
- Column keys MUST be unique lowercase_snake_case with no spaces.
- type "number"     → store only the numeric value (e.g. 42, not "$42").
- type "percentage" → store only the numeric value (e.g. 12.5, not "12.5%"). Put "(%)" in the label.
- type "url"        → store the full URL string.
- type "date"       → use ISO 8601 (YYYY-MM-DD) where possible.
- type "text"       → everything else.
- If numbers have units put the unit in the label (e.g. "Price (USD)", "Size (MB)").
- Order columns logically — primary identifier column first, then descriptive, then numeric.
- Prioritise what the user requests in their prompt.
- Never return empty rows or columns.
- If you cannot find enough structured data to build a table, return an empty rows array and explain in "description".`;

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

function parseTableJson(raw) {
	// Try stripping markdown code fences first
	const fenced = raw.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
	const jsonStr = fenced ? fenced[1] : raw.trim();
	try {
		return JSON.parse(jsonStr);
	} catch {
		// Last-resort: find first { … }
		const braceMatch = raw.match(/\{[\s\S]*\}/);
		if (braceMatch) return JSON.parse(braceMatch[0]);
		throw new Error("Failed to parse table JSON from AI response.");
	}
}

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const { url, urls: urlsBody, prompt: userPrompt, idToken } = req.body || {};

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
	if (urlList.length === 0) {
		return res
			.status(400)
			.json({ error: "At least one valid URL is required." });
	}
	if (urlList.length > 10) {
		return res.status(400).json({ error: "Maximum 10 URLs per request." });
	}
	if (urlList.some((u) => !URL_REGEX.test(u))) {
		return res.status(400).json({ error: "One or more URLs are invalid." });
	}
	const urlValidation = validateUrls(urlList);
	if (!urlValidation.valid) {
		return res.status(400).json({ error: urlValidation.error });
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

	// ── Scrape all URLs — uses batch endpoint when multiple ───────────────────
	const scraped = await scrapeUrls({
		urls: urlList,
		apiKey: "apiKey",
	});
	const sources = scraped.sources.map((s) => ({
		url: s.url,
		content: (s.markdown || "").slice(0, MAX_CONTENT_CHARS),
	}));
	const scrapeErrors = scraped.scrapeErrors;

	if (sources.length === 0) {
		return res.status(422).json({
			error:
				"Could not extract content from any URL. Please check the URLs and try again.",
			details: scrapeErrors,
		});
	}

	const combinedContent = sources
		.map((s, i) => `--- SOURCE ${i + 1}: ${s.url} ---\n\n${s.content}`)
		.join("\n\n");

	// ── LLM ───────────────────────────────────────────────────────────────────
	let raw;
	try {
		const urlListStr = urlList.length === 1 ? urlList[0] : urlList.join(", ");
		raw = await callOpenRouter(openRouterKey, [
			{ role: "system", content: SYSTEM_PROMPT },
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
		sourceUrls: urlList,
		sourceUrl: urlList[0],
		scrapeErrors: scrapeErrors.length > 0 ? scrapeErrors : undefined,
	});
}
