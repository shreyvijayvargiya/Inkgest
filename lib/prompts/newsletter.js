/**
 * Newsletter prompts — shared by newsletter-generate API and inkagent
 */
const MAX_CHARS_PER_SOURCE = 15000;

export const FORMATS = {
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

export const STYLES = {
	casual:
		"friendly, conversational, use 'you', contractions, simple everyday words",
	professional:
		"formal, authoritative, industry terminology acceptable, third-person where appropriate",
	educational:
		"clear, structured, explain concepts step-by-step, use relatable examples",
	persuasive:
		"compelling, benefit-focused, strong CTAs, create urgency without being pushy",
};

const BLOCK_SYNTAX = `
RICH CONTENT BLOCKS — use these in your output where they add value:

Code blocks (standard markdown fencing with language identifier):
\`\`\`javascript
const example = "code here";
\`\`\`
Supported languages: javascript, typescript, python, css, html, bash, json, sql

Callout blocks (for highlights, warnings, tips):
:::info
An informational note or tip.
:::

:::warning
Something the reader should be careful about.
:::

:::success
A positive outcome or confirmation.
:::

:::danger
A critical error or destructive-action warning.
:::

Use callouts and code blocks sparingly — only when they genuinely improve clarity.`;

/** Infer format + label from user prompt when API doesn't return them (e.g. InkAgent) */
export function inferFormatFromPrompt(prompt) {
	if (!prompt || typeof prompt !== "string") return { format: "substack", label: "Newsletter" };
	const p = prompt.toLowerCase();
	if (p.includes("linkedin") || p.includes("linked in"))
		return { format: "linkedin", label: FORMATS.linkedin.label };
	if (p.includes("twitter") || p.includes("thread") || p.includes("tweet") || p.includes("x.com"))
		return { format: "twitter_thread", label: FORMATS.twitter_thread.label };
	if (p.includes("blog") || p.includes("blog post"))
		return { format: "blog_post", label: FORMATS.blog_post.label };
	if (p.includes("digest") || p.includes("email digest"))
		return { format: "email_digest", label: FORMATS.email_digest.label };
	if (p.includes("substack") || p.includes("newsletter"))
		return { format: "substack", label: FORMATS.substack.label };
	return { format: "substack", label: "Newsletter" };
}

export function clampText(text, maxChars = MAX_CHARS_PER_SOURCE) {
	if (!text) return "";
	if (text.length <= maxChars) return text;
	return `${text.slice(0, maxChars)}\n\n...[truncated]...`;
}

/**
 * Build newsletter system prompt from format, style, and sources
 */
export function buildNewsletterSystemPrompt(format = "substack", style = "casual", hasSources = false) {
	const formatConfig = FORMATS[format] || FORMATS.substack;
	const styleNote = STYLES[style] ? `\nTONE: ${STYLES[style]}` : "";
	const sourceInstruction = hasSources
		? "Generate the content based ONLY on the sources provided. If a claim isn't in the sources, omit it."
		: "Generate the content based ONLY on the user's prompt (no sources provided). Don't invent specific facts or quote URLs you didn't read.";
	return `${formatConfig.system}\n${sourceInstruction}${styleNote}\nOutput in Markdown. You may use the following rich block types where appropriate:\n${BLOCK_SYNTAX}`;
}

/**
 * Build newsletter user content (prompt + sources)
 */
export function buildNewsletterUserContent(prompt, sources = []) {
	const combined = sources
		.map((s, idx) => {
			const titleLine = s.title ? `Title: ${s.title}\n` : "";
			return `SOURCE ${idx + 1}\nURL: ${s.url}\n${titleLine}\nCONTENT (markdown):\n${clampText(s.markdown)}\n`;
		})
		.join("\n\n---\n\n");
	return [
		`USER PROMPT:\n${prompt}`,
		...(sources.length ? ["", "SOURCES:\n" + combined] : []),
	].join("\n");
}
