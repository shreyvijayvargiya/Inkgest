/**
 * Curated types for the landing/app “Create an asset” panel.
 * - `kind: "scrape"` → Next.js POST `/api/scrape/url`.
 * - `kind: "generate"` → Next.js POST `/generate/:type` (proxies to Hono).
 * - `kind: "agent"` → POST `NEXT_PUBLIC_INKGEST_AGENT_URL` directly (streaming / JSON).
 * - `kind: "blank"` → create empty draft locally.
 */
export const GENERATE_PANEL_TYPES = [
	{
		value: "blog",
		label: "Blog",
		short: "Blog",
		kind: "generate",
		hint: "AI-written long-form article from your URLs and brief.",
	},
	{
		value: "newsletter",
		label: "Newsletter",
		short: "Newsletter",
		kind: "generate",
		hint: "Email-style sections and CTAs from URLs plus optional brief.",
	},
	{
		value: "agent",
		label: "AI",
		short: "AI",
		kind: "agent",
		hint: "One prompt box with links — agent scrapes URLs and creates assets.",
	},
	{
		value: "blank",
		label: "Blank",
		short: "Blank",
		kind: "blank",
		hint: "Create a blank draft. This will be empty until you add content.",
	}
];


export function taskEmojiForType(type) {
	const m = {
		newsletter: "📧",
		blog: "📝",
		article: "📝",
		email: "📧",
		linkedin: "💼",
		twitter: "🐦",
		substack: "📰",
		infographics: "📊",
		table: "📊",
		"landing-page": "🚀",
		"image-gallery": "🖼",
		landing_page: "🚀",
		image_gallery: "🖼",
		"infographics-svg-generator": "📐",
		"image-reading": "👁",
		newsletter_draft: "📧",
		blog_post: "📝",
		linkedin_post: "💼",
		twitter_thread: "🐦",
		scrape: "🔗",
		react: "⚛️",
		blank: "📄",
		agent: "✨",
	};
	return m[type] ?? "📄";
}

export function taskTitleForType(type) {
	const m = {
		newsletter: "Newsletter",
		blog: "Blog",
		article: "Article",
		email: "Email",
		linkedin: "LinkedIn",
		twitter: "Thread",
		substack: "Substack",
		infographics: "Infographics",
		table: "Table",
		"landing-page": "Landing page",
		"image-gallery": "Image gallery",
		landing_page: "Landing page",
		image_gallery: "Image gallery",
		"infographics-svg-generator": "SVG infographics",
		"image-reading": "Image reading",
		newsletter_draft: "Newsletter",
		blog_post: "Article",
		linkedin_post: "LinkedIn",
		twitter_thread: "Thread",
		scrape: "Scraped draft",
		react: "React",
		blank: "Blank draft",
		agent: "AI",
	};
	return m[type] ?? "Draft";
}
