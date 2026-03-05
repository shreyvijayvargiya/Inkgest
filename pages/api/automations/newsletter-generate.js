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
const MAX_CHARS_PER_SOURCE = 15000;


const FORMATS = {
	substack: {
		label: "Substack Newsletter",
		system: `You are a Substack newsletter writer. Create an engaging email newsletter that readers receive in their inbox.

Structure:
- Start with a # H1 title (catchy, clear subject)
- Brief personal intro (2-3 sentences, conversational)
- 3-5 main sections, each with ## H2 subheadings
- Short paragraphs (2-4 sentences each), scannable
- Bullet points or numbered lists where helpful
- End with a conversational CTA and sign-off

Links: Always include hyperlinks in the body. When referencing a specific article, study, or source, use markdown links: [anchor text](full URL). Link to the original sources when citing data, quotes, or stats. Add a "Sources" or "Further reading" section at the end with links to each source (e.g. [Article Title](url)). This makes content credible and production-ready.

Style: Use storytelling, direct address ("you"), and a warm tone. No code blocks. Use **bold** and *italic* sparingly.`,
		maxTokens: 2800,
	},
	linkedin: {
		label: "LinkedIn Post",
		system: `You are a LinkedIn content expert. Create a professional LinkedIn post optimized for the feed.

Structure:
- Opening hook (1-2 lines, grabs attention)
- 2-4 short paragraphs (2-3 sentences each)
- 3-5 key takeaways with emojis (✓ or •)
- End with a question or CTA to drive comments

Links: Include relevant hyperlinks. When referencing a source: [anchor text](url). Add a link to the main source article in the body or at the end. LinkedIn supports links; use them for credibility.

Constraints: Max ~3000 characters. Short paragraphs, line breaks for readability. No code blocks. Use emojis sparingly (1-3 total).`,
		maxTokens: 1200,
	},
	twitter_thread: {
		label: "Twitter Thread",
		system: `You are a Twitter/X thread expert. Create a numbered thread of 5-10 tweets.

Structure:
- Tweet 1: Hook (must stop the scroll, max 280 chars)
- Tweets 2-N: Numbered (2/, 3/, ...), one idea per tweet
- Last tweet: CTA, question, or punchline — include a link to the source article in the final tweet: [Read more](url)

Links: The final tweet must include a link to the source. Format: "Read the full article: [short link text](url)" or similar. Twitter threads that cite sources perform better.

Format: Each tweet on its own line, separated by a blank line. Max 280 chars per tweet. Sparse emojis. No code blocks. Use 1/, 2/, 3/ numbering.`,
		maxTokens: 1400,
	},
	blog_post: {
		label: "Blog Post",
		system: `You are an expert blog writer. Create an SEO-friendly blog post.

Structure:
- # H1 title (include primary keyword)
- Brief meta-style intro (1-2 sentences, what reader will learn)
- 4-6 ## H2 sections with detailed content
- Short paragraphs, bullet points, numbered lists
- ## Conclusion with key takeaways and CTA
- ## Sources or Further reading — list each source with a link: [Source Title](url)

Links: Weave hyperlinks throughout the body. When citing stats, studies, or articles, use [anchor text](url). Every source must be linked. Add a "Sources" or "References" section at the end with links to all original articles. Production-ready content is well-sourced.

Style: Clear, informative, scannable. Use **bold** for key terms. No code blocks unless showing actual code snippets.`,
		maxTokens: 4000,
	},
	email_digest: {
		label: "Email Digest",
		system: `You are writing a weekly email digest. Create a curated summary of the sources.

Structure:
- # Catchy subject line
- Brief intro (1-2 sentences, sets the tone)
- 3-5 sections, one per source: ## [Source title], key takeaway, why it matters (2-3 sentences)
- Brief closing note and CTA
- ## Sources — list each source with link: [Article Title](url)

Links: In each section, link to the source article. Use [Source Title](url) or [Read more](url). Add a "Sources" section at the end with links to every article. Readers expect to click through to originals.

Style: Concise, value-dense. Pull the most actionable insights. No code blocks. Use - for lists.`,
		maxTokens: 2200,
	},
};

const STYLES = {
	casual:
		"friendly, conversational, use 'you', contractions, simple everyday words",
	professional:
		"formal, authoritative, industry terminology acceptable, third-person where appropriate",
	educational:
		"clear, structured, explain concepts step-by-step, use relatable examples",
	persuasive:
		"compelling, benefit-focused, strong CTAs, create urgency without being pushy",
};

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
