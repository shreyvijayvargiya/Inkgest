import { checkAndIncrementCredit } from "../../../lib/utils/credits";
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";

const urlRegex = /^https?:\/\/\S+$/i;

const MAX_URLS = 10;
const MAX_CHARS_PER_SOURCE = 15000;

const FORMATS = {
	substack: {
		label: "Substack Newsletter",
		system:
			"You are a Substack newsletter writer. Create an engaging email newsletter with: catchy subject line, personal intro, 3-5 main sections with subheadings, and a conversational CTA. Use storytelling and keep it scannable.",
		maxTokens: 2000,
	},
	linkedin: {
		label: "LinkedIn Post",
		system:
			"You are a LinkedIn content expert. Create a professional LinkedIn post (max 3000 chars). Start with a strong single-line hook, use short paragraphs, include 3-5 key takeaways with emojis, end with a question to drive engagement.",
		maxTokens: 800,
	},
	twitter_thread: {
		label: "Twitter Thread",
		system:
			"You are a Twitter/X thread expert. Create a numbered thread of 5-10 tweets. Tweet 1 must hook readers immediately. Each tweet is max 280 chars. Use numbers (1/, 2/, ...), sparse emojis, and end with a CTA tweet. Separate tweets with a blank line.",
		maxTokens: 1000,
	},
	blog_post: {
		label: "Blog Post",
		system:
			"You are an expert blog writer. Create an SEO-friendly blog post with: H1 title, meta description, introduction, 4-6 H2 sections with detailed content, bullet points, and a conclusion with CTA.",
		maxTokens: 3000,
	},
	email_digest: {
		label: "Email Digest",
		system:
			"You are writing a weekly email digest. Create a curated summary with: catchy subject line, brief intro, 3-5 sections (one per source) with key takeaway + why it matters, and brief closing note.",
		maxTokens: 1500,
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

async function firecrawlScrapeMarkdown({ url, apiKey }) {
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

		const {
			urls,
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

		// Credit gate — 5 free AI generations per month; Pro = unlimited
		const creditCheck = await checkAndIncrementCredit(verifiedUid, "llm");
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

		if (urlList.length > MAX_URLS) {
			return res.status(400).json({
				error: `Maximum ${MAX_URLS} URLs allowed per request`,
			});
		}

		if (urlList.some((u) => !urlRegex.test(u))) {
			return res.status(400).json({ error: "One or more URLs are invalid" });
		}

		// Scrape all URLs — best-effort, collect successes and errors
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

			// All URLs were provided but every one failed
			if (sources.length === 0) {
				return res.status(422).json({
					error:
						"All URL scrapes failed. Please check the URLs and try again.",
					details: scrapeErrors,
				});
			}
		}

		// Build combined source content with per-source char limit
		const combined = sources
			.map((s, idx) => {
				const titleLine = s.title ? `Title: ${s.title}\n` : "";
				return `SOURCE ${idx + 1}\nURL: ${s.url}\n${titleLine}\nCONTENT (markdown):\n${clampText(s.markdown, MAX_CHARS_PER_SOURCE)}\n`;
			})
			.join("\n\n---\n\n");

		const model =
			String(requestedModel || "").trim() ||
			process.env.OPENROUTER_MODEL ||
			"openai/gpt-4o-mini";

		const referer =
			process.env.OPENROUTER_HTTP_REFERER ||
			(req.headers.origin ? String(req.headers.origin) : undefined);
		const appTitle = process.env.OPENROUTER_APP_TITLE || "Inkgest";

		const formatConfig = FORMATS[format];
		const styleNote = STYLES[style] ? `\nTONE: ${STYLES[style]}` : "";
		const sourceInstruction = sources.length
			? "Generate the content based ONLY on the sources provided. If a claim isn't in the sources, omit it."
			: "Generate the content based ONLY on the user's prompt (no sources provided). Don't invent specific facts or quote URLs you didn't read.";

		const system = `${formatConfig.system}\n${sourceInstruction}${styleNote}\nOutput MUST be Markdown (no code fences).`;

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
