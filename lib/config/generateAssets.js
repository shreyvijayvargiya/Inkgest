/**
 * Asset types for POST /generate/:type — `value` is the URL path segment (Hono allowlist).
 */
export const GENERATE_ASSET_TYPES = [
	{ value: "newsletter", label: "Newsletter", short: "Newsletter" },
	{ value: "blog", label: "Blog", short: "Blog" },
	{ value: "article", label: "Article", short: "Article" },
	{ value: "email", label: "Email", short: "Email" },
	{ value: "linkedin", label: "LinkedIn", short: "LinkedIn" },
	{ value: "twitter", label: "X / Twitter", short: "X" },
	{ value: "substack", label: "Substack", short: "Substack" },
	{ value: "infographics", label: "Infographics", short: "Graphics" },
	{ value: "table", label: "Table", short: "Table" },
	{
		value: "landing-page",
		label: "Landing page",
		short: "Landing",
	},
	{
		value: "image-gallery",
		label: "Image gallery",
		short: "Gallery",
	},
	{
		value: "infographics-svg-generator",
		label: "SVG infographics",
		short: "SVG",
	},
	{ value: "image-reading", label: "Image reading", short: "Image" },
];

export function getAssetTypeLabel(value) {
	return GENERATE_ASSET_TYPES.find((t) => t.value === value)?.label ?? value;
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
	};
	return m[type] ?? "Draft";
}
