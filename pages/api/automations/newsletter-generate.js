const urlRegex = /^https?:\/\/\S+$/i;

function clampText(text, maxChars) {
	if (!text) return "";
	if (text.length <= maxChars) return text;
	return `${text.slice(0, maxChars)}\n\n...[truncated]...`;
}

async function openRouterChat({
	apiKey,
	model,
	messages,
	maxTokens = 1800,
	temperature = 0.6,
	referer,
	title,
}) {
	const response = await fetch(
		"https://openrouter.ai/api/v1/chat/completions",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
				...(referer ? { "HTTP-Referer": referer } : {}),
				...(title ? { "X-Title": title } : {}),
			},
			body: JSON.stringify({
				model,
				messages,
				temperature,
				max_tokens: maxTokens,
			}),
		},
	);

	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(
			data?.error?.message ||
				data?.error ||
				`OpenRouter request failed (${response.status})`,
		);
	}

	const content = data?.choices?.[0]?.message?.content;
	if (!content) {
		throw new Error("OpenRouter returned an empty response");
	}
	return { content, raw: data };
}

async function firecrawlScrapeMarkdown({ url, apiKey }) {
	// Firecrawl scrape API (best-effort). If your Firecrawl workspace expects a different header,
	// adjust here to match your Firecrawl docs/account.
	const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
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
	});

	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(
			data?.error || `Firecrawl scrape failed (${response.status})`,
		);
	}

	// Common shapes seen in Firecrawl responses
	const markdown =
		data?.data?.markdown ||
		data?.markdown ||
		data?.data?.content ||
		data?.data?.text ||
		"";
	const title = data?.data?.metadata?.title || data?.data?.title || "";

	return { markdown, title, raw: data };
}

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const firecrawlKey = process.env.FIRECRAWL_API_KEY;
		if (!firecrawlKey) {
			return res
				.status(500)
				.json({ error: "FIRECRAWL_API_KEY is not configured" });
		}

		const openRouterKey = process.env.OPENROUTER_API_KEY;
		if (!openRouterKey) {
			return res
				.status(500)
				.json({ error: "OPENROUTER_API_KEY is not configured" });
		}

		const { urls, prompt, model: requestedModel } = req.body || {};
		const safePrompt = String(prompt || "").trim();
		const urlList = Array.isArray(urls)
			? urls.map((u) => String(u || "").trim()).filter(Boolean)
			: [];

		// Prompt is required; URLs are optional.
		if (!safePrompt) {
			return res.status(400).json({ error: "Please provide a prompt" });
		}
		if (urlList.some((u) => !urlRegex.test(u))) {
			return res.status(400).json({ error: "One or more URLs are invalid" });
		}

		// Scrape all URLs if provided (best-effort: keep successes, report failures)
		const sources = [];
		const scrapeErrors = [];

		if (urlList.length > 0) {
			for (const url of urlList) {
				try {
					const scraped = await firecrawlScrapeMarkdown({
						url,
						apiKey: firecrawlKey,
					});
					sources.push({
						url,
						title: scraped.title || "",
						markdown: scraped.markdown || "",
					});
				} catch (e) {
					scrapeErrors.push({ url, error: e?.message || "Scrape failed" });
				}
			}
		}

		// Build prompt with size limits to reduce token blowups
		const perSourceLimit = 12000;
		const combined = sources
			.map((s, idx) => {
				const titleLine = s.title ? `Title: ${s.title}\n` : "";
				return `SOURCE ${idx + 1}\nURL: ${s.url}\n${titleLine}\nCONTENT (markdown):\n${clampText(
					s.markdown,
					perSourceLimit,
				)}\n`;
			})
			.join("\n\n---\n\n");

		// Default to a small/cheap model. Override via env OPENROUTER_MODEL or request body `model`.
		const model =
			String(requestedModel || "").trim() ||
			process.env.OPENROUTER_MODEL ||
			"openai/gpt-4o-mini";

		const referer =
			process.env.OPENROUTER_HTTP_REFERER ||
			(req.headers.origin ? String(req.headers.origin) : undefined);
		const title = process.env.OPENROUTER_APP_TITLE || "Inkgest Automations";

		const system = [
			"You are an expert newsletter writer.",
			sources.length
				? "Generate a polished newsletter draft based ONLY on the sources provided."
				: "Generate a polished newsletter draft based ONLY on the user's prompt (no sources were provided). Avoid inventing specific facts or quotes.",
			"Output MUST be Markdown (no code fences).",
			"Include: catchy subject line, short intro, 3–7 sections with headings + bullet takeaways, and a closing CTA.",
			sources.length
				? "If a claim isn't supported by the sources, omit it."
				: "Don't claim you scraped or read any URLs.",
		].join("\n");

		const user = [
			`USER PROMPT:\n${safePrompt}`,
			...(sources.length ? ["", "SOURCES:\n" + combined] : []),
		].join("\n");

		const { content } = await openRouterChat({
			apiKey: openRouterKey,
			model,
			messages: [
				{ role: "system", content: system },
				{ role: "user", content: user },
			],
			// Keep output reasonably sized; raise if you want longer newsletters
			maxTokens: 2000,
			temperature: 0.6,
			referer,
			title,
		});

		return res.status(200).json({
			success: true,
			model,
			content,
			sources: sources.map((s) => ({ url: s.url, title: s.title })),
			scrapeErrors,
		});
	} catch (error) {
		console.error("Newsletter generate error:", error);
		return res
			.status(500)
			.json({ error: error?.message || "Failed to generate" });
	}
}
