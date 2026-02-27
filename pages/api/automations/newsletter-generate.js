import { checkAndDeductCredit } from "../../../lib/utils/credits";
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";
import { checkRateLimit } from "../../../lib/utils/rateLimit";
import { validateUrls } from "../../../lib/utils/urlAllowlist";
import { scrapeUrls } from "../../../lib/utils/scrapeApi";
import {
	FORMATS,
	buildNewsletterSystemPrompt,
	buildNewsletterUserContent,
} from "../../../lib/prompts/newsletter";

export const config = {
	api: { bodyParser: { sizeLimit: "1mb" } },
};

const urlRegex = /^https?:\/\/\S+$/i;
const MAX_URLS = 10;

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

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const openRouterKey = process.env.OPENROUTER_API_KEY;
		if (!openRouterKey) {
			return res
				.status(500)
				.json({ error: "OPENROUTER_API_KEY is not configured" });
		}

		const {
			urls,
			sources: preScrapedSources,
			prompt,
			model: requestedModel,
			format = "substack",
			style = "casual",
			idToken,
		} = req.body || {};

		// Require a signed Firebase ID token — verified server-side
		if (!idToken) {
			return res.status(401).json({
				error: "Authentication required. Please sign in to generate drafts.",
			});
		}

		let verifiedUid;
		try {
			verifiedUid = await verifyFirebaseToken(idToken);
		} catch (authErr) {
			return res.status(401).json({ error: authErr.message });
		}

		// Rate limit — per IP and per user
		const rateLimit = await checkRateLimit(req, { identifier: verifiedUid });
		if (!rateLimit.allowed) {
			return res.status(429).json({
				error: "Too many requests. Please try again later.",
				retryAfter: rateLimit.resetIn,
			});
		}

		// Credit gate — 5 free AI generations per month; Pro = unlimited
		const creditCheck = await checkAndDeductCredit(verifiedUid, 1);
		if (!creditCheck.allowed) {
			return res.status(429).json({ error: creditCheck.error });
		}

		const safePrompt = String(prompt || "").trim();
		const urlList = Array.isArray(urls)
			? urls.map((u) => String(u || "").trim()).filter(Boolean)
			: [];

		if (!safePrompt) {
			return res.status(400).json({ error: "Please provide a prompt" });
		}

		if (!FORMATS[format]) {
			return res.status(400).json({
				error: `Invalid format. Options: ${Object.keys(FORMATS).join(", ")}`,
			});
		}

		const hasPreScrapedForValidation =
			Array.isArray(preScrapedSources) &&
			preScrapedSources.length > 0 &&
			preScrapedSources.every(
				(s) => s && typeof s.url === "string" && typeof s.markdown === "string"
			);

		if (!hasPreScrapedForValidation && urlList.length > MAX_URLS) {
			return res.status(400).json({
				error: `Maximum ${MAX_URLS} URLs allowed per request`,
			});
		}

		if (urlList.length > 0 && urlList.some((u) => !urlRegex.test(u))) {
			return res.status(400).json({ error: "One or more URLs are invalid" });
		}

		if (urlList.length > 0) {
			const urlValidation = validateUrls(urlList);
			if (!urlValidation.valid) {
				return res.status(400).json({ error: urlValidation.error });
			}
		}

		// Use pre-scraped sources if provided (from InkAgent), otherwise scrape
		let sources = [];
		let scrapeErrors = [];

		if (hasPreScrapedForValidation) {
			sources = preScrapedSources.map((s) => ({
				url: s.url,
				markdown: s.markdown || "",
				title: s.title || "",
				links: s.links || [],
			}));
		} else if (urlList.length > 0) {
			const scraped = await scrapeUrls({
				urls: urlList,
				apiKey: process.env.BUILDSAAS_API_KEY || "apiKey",
				includeImages: true,
			});
			sources = scraped.sources;
			scrapeErrors = scraped.scrapeErrors;

			if (sources.length === 0) {
				return res.status(422).json({
					error: "All URL scrapes failed. Please check the URLs and try again.",
					details: scrapeErrors,
				});
			}
		}

		const model =
			String(requestedModel || "").trim() ||
			process.env.OPENROUTER_MODEL ||
			"openai/gpt-4o-mini";

		const referer =
			process.env.OPENROUTER_HTTP_REFERER ||
			(req.headers.origin ? String(req.headers.origin) : undefined);
		const appTitle = process.env.OPENROUTER_APP_TITLE || "Inkgest";

		const formatConfig = FORMATS[format];
		const system = buildNewsletterSystemPrompt(format, style, sources.length > 0);
		const user = buildNewsletterUserContent(safePrompt, sources);

		const { content } = await openRouterChat({
			apiKey: openRouterKey,
			model,
			messages: [
				{ role: "system", content: system },
				{ role: "user", content: user },
			],
			maxTokens: formatConfig.maxTokens,
			temperature: 0.6,
			referer,
			title: appTitle,
		});

		return res.status(200).json({
			success: true,
			model,
			format,
			formatLabel: formatConfig.label,
			style,
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
