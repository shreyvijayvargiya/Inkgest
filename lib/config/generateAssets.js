/**
 * Curated types for the landing/app “Create an asset” panel.
 * - `kind: "scrape"` → Next `/api/scrape/url` (no Hono).
 * - `kind: "generate"` → POST /generate/:value on Hono (`value` = path segment).
 */
export const GENERATE_PANEL_TYPES = [
	{
		value: "scrape",
		label: "Scrape",
		short: "Scrape",
		kind: "scrape",
		hint: "Extract readable text from your URLs into a draft you can edit — no AI rewrite.",
	},
	{
		value: "image-gallery",
		label: "Screenshot",
		short: "Shots",
		kind: "generate",
		hint: "Pull images and figures from the page into a gallery asset.",
	},
	{
		value: "blog",
		label: "Blog",
		short: "Blog",
		kind: "generate",
		hint: "Long-form post with headings and flow, grounded in your sources.",
	},
	{
		value: "infographics",
		label: "Infographics",
		short: "Graphics",
		kind: "generate",
		hint: "Visual summary: key points, stats, and structured slides from the content.",
	},
	{
		value: "newsletter",
		label: "Newsletter",
		short: "Newsletter",
		kind: "generate",
		hint: "Email-style issue: sections, hooks, and a clear CTA for subscribers.",
	},
	{
		value: "table",
		label: "Tables",
		short: "Tables",
		kind: "generate",
		hint: "Structured rows and columns extracted or synthesized from your URLs.",
	},
	{
		value: "landing-page",
		label: "Landing page / HTML",
		short: "HTML",
		kind: "generate",
		hint: "Marketing page: hero, sections, and HTML you can preview and tweak.",
	},
	{
		value: "react",
		label: "React",
		short: "React",
		kind: "generate",
		hint: "UI as React — requires your generate API to support /generate/react.",
	},
];

/** Labels for any stored or legacy generate type (sidebar, canvas, old assets). */
const TYPE_LABEL_FALLBACK = {
	article: "Article",
	email: "Email",
	linkedin: "LinkedIn",
	twitter: "X / Twitter",
	substack: "Substack",
	"infographics-svg-generator": "SVG infographics",
	"image-reading": "Image reading",
	landing_page: "Landing page",
	image_gallery: "Image gallery",
	newsletter_draft: "Newsletter",
	blog_post: "Blog",
	linkedin_post: "LinkedIn",
	twitter_thread: "Thread",
	scrape: "Scrape",
};

export function getAssetTypeLabel(value) {
	const fromPanel = GENERATE_PANEL_TYPES.find((t) => t.value === value)?.label;
	if (fromPanel) return fromPanel;
	return TYPE_LABEL_FALLBACK[value] ?? value;
}

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
