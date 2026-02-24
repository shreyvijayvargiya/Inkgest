import { checkAndIncrementCredit } from "../../../lib/utils/credits";
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";

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

async function scrapeUrl(url, apiKey) {
	const res = await fetch(
		"https://ihatereading-api.vercel.app/scrap-url-puppeteer",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				url,
				formats: ["markdown"],
				onlyMainContent: true,
			}),
		},
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error || `Firecrawl error (${res.status})`);
	}
	return (data?.data?.markdown || data?.markdown || "").slice(0, MAX_CONTENT_CHARS);
}

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

	const { url, prompt: userPrompt, idToken } = req.body || {};

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

	// ── Validate input ────────────────────────────────────────────────────────
	if (!url || !URL_REGEX.test(url.trim())) {
		return res.status(400).json({ error: "A valid URL is required." });
	}
	if (!userPrompt?.trim()) {
		return res
			.status(400)
			.json({ error: "A prompt describing what table to generate is required." });
	}

	const firecrawlKey = process.env.FIRECRAWL_API_KEY;
	const openRouterKey = process.env.OPENROUTER_API_KEY;
	if (!firecrawlKey || !openRouterKey) {
		return res.status(500).json({ error: "Server API keys not configured." });
	}

	// ── Credits — deduct SCRAPE first, then LLM ───────────────────────────────
	const scrapeCheck = await checkAndIncrementCredit(uid, "scrape");
	if (!scrapeCheck.allowed) {
		return res.status(429).json({ error: scrapeCheck.error });
	}
	const llmCheck = await checkAndIncrementCredit(uid, "llm");
	if (!llmCheck.allowed) {
		return res.status(429).json({ error: llmCheck.error });
	}

	// ── Scrape ────────────────────────────────────────────────────────────────
	let markdown;
	try {
		markdown = await scrapeUrl(url.trim(), firecrawlKey);
	} catch (e) {
		return res.status(502).json({ error: `Scrape failed: ${e.message}` });
	}
	if (!markdown.trim()) {
		return res
			.status(422)
			.json({ error: "Could not extract any content from this URL." });
	}

	// ── LLM ───────────────────────────────────────────────────────────────────
	let raw;
	try {
		raw = await callOpenRouter(openRouterKey, [
			{ role: "system", content: SYSTEM_PROMPT },
			{
				role: "user",
				content: `URL: ${url.trim()}\n\nUser request: ${userPrompt.trim()}\n\nScraped content:\n${markdown}`,
			},
		]);
	} catch (e) {
		return res.status(502).json({ error: `AI generation failed: ${e.message}` });
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
		return res
			.status(500)
			.json({ error: "AI did not return valid columns. Try a different prompt." });
	}

	return res.status(200).json({
		success: true,
		title: tableData.title || "Generated Table",
		description: tableData.description || "",
		columns: tableData.columns,
		rows: tableData.rows || [],
		sourceUrl: url.trim(),
	});
}
