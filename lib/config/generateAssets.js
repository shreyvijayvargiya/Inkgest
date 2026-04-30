/**
 * Curated types for the landing/app “Create an asset” panel.
 * - `kind: "scrape"` → Next.js POST `/api/scrape/url`.
 * - `kind: "generate"` → Next.js POST `/api/generate/:type` (proxies to Hono).
 */
export const GENERATE_PANEL_TYPES = [
	{
		value: "scrape",
		label: "Scrape",
		short: "Scrape",
		kind: "scrape",
		hint: "Extracts readable markdown from URLs into an editable draft (no AI).",
	},
	{
		value: "image-gallery",
		label: "Screenshot",
		short: "Shots",
		kind: "generate",
		hint: "Captures screenshots and images from linked pages into a gallery asset.",
	},
	{
		value: "blog",
		label: "Blog",
		short: "Blog",
		kind: "generate",
		hint: "AI-written long-form article from your URLs and brief.",
	},
	{
		value: "infographics",
		label: "Infographics",
		short: "Graphics",
		kind: "generate",
		hint: "structured visuals and key stats derived from your sources.",
	},
	{
		value: "newsletter",
		label: "Newsletter",
		short: "Newsletter",
		kind: "generate",
		hint: "Email-style sections and CTAs from URLs plus optional brief.",
	},
	{
		value: "table",
		label: "Tables",
		short: "Tables",
		kind: "generate",
		hint: "Generate rows and columns synthesized or extracted from linked content.",
	},
	{
		value: "landing-page",
		label: "Landing page / HTML",
		short: "HTML",
		kind: "generate",
		hint: "Create landing page in HTML (hero, sections) you can preview and edit.",
	},
	{
		value: "react",
		label: "React",
		short: "React",
		kind: "generate",
		hint: "React UI code components from your sources when the backend supports it.",
	},
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
	};
	return m[type] ?? "Draft";
}
