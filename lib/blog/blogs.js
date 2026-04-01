/**
 * Blog registry — add a row and a matching file under content/blog/ to publish.
 * `file` is the filename inside content/blog/; body markdown is read at build time.
 */
export const BLOG_POSTS = [
	{
		slug: "inkgest-for-creating-stunning-newsletter-emails",
		title: "Inkgest for creating stunning newsletter emails",
		description:
			"How AI streamlines newsletter creation, from structured drafts to stronger CTAs—plus practical tips your subscribers will notice.",
		banner: "/inkgest-logo.png",
		tags: ["Newsletter", "AI", "Product"],
		file: "inkgest-for-creating-stunning-newsletter-emails.md",
		publishedAt: "2026-03-15",
	},
	{
		slug: "getting-started-with-inkgest",
		title: "Getting started with Inkgest in under ten minutes",
		description:
			"Paste a URL, describe your angle, and ship a first draft—what to expect from the editor and how to iterate fast.",
		banner: "/inkgest-logo.png",
		tags: ["Guide", "Product"],
		file: "getting-started-with-inkgest.md",
		publishedAt: "2026-03-20",
	},
];
