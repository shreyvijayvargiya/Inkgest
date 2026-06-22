/**
 * Centralized SEO Configuration
 *
 * Add or modify routes here to automatically set SEO tags.
 * Routes are matched in order - more specific routes should come first.
 *
 * Supported patterns:
 * - Exact match: "/pricing" matches only /pricing
 * - Nested routes: "/blog/*" matches /blog, /blog/[slug], /blog/id/[id], etc.
 * - Wildcard: "*" matches all routes (use as fallback)
 *
 * @example
 * {
 *   path: "/pricing",
 *   title: "Pricing - My SaaS",
 *   description: "Choose the perfect plan for your needs",
 *   keywords: "pricing, plans, subscription",
 *   ogImage: "/og-pricing.png"
 * }
 */

export const SEO_CONFIG = {
	// Homepage
	"/": {
		title: "Inkgest — Agentic AI Editor to Scrape, Write, Publish & Translate",
		description:
			"The agentic workspace for content creators: scrape sources, draft with AI, chat and rewrite in a rich editor, translate globally, publish in one click, and connect Claude via MCP — newsletters, blogs, infographics & more.",
		keywords:
			"Inkgest, agentic AI, AI editor, AI chatbot, content creation, newsletter, blog, publishing, translation, MCP, Claude Desktop, web scraping, infographics, writing assistant, markdown export, content workflow, kanban tasks",
		ogImage: "/inkgest-logo.png",
		ogType: "website",
	},

	// Pricing
	"/pricing": {
		title: "Pricing - Inkgest",
		description:
			"Choose the perfect plan for your needs. Flexible pricing options for individuals and teams.",
		keywords: "pricing, plans, subscription, saas pricing",
		ogImage: "/inkgest-logo.png",
		ogType: "website",
	},

	// Blog (listing; individual posts override via pageProps.customSEO)
	"/blog": {
		title: "Blog — Inkgest",
		description:
			"Guides and notes on AI-assisted newsletters, content workflows, and getting the most out of Inkgest.",
		keywords: "Inkgest, blog, newsletter, AI content, email",
		ogImage: "/inkgest-logo.png",
		ogType: "website",
	},

	// Features
	"/features": {
		title: "Features - Inkgest",
		description:
			"Discover all the powerful features included in our SaaS boilerplate. Authentication, payments, admin panel, and more.",
		keywords: "features, saas features, boilerplate features",
		ogImage: "/og-features.png",
		ogType: "website",
	},


	// 404 Error Page
	"/404": {
		title: "404 - Page Not Found - Inkgest",
		description: "The page you are looking for does not exist.",
		keywords: "404, page not found, error",
		ogImage: "/inkgest-logo.png",
		ogType: "website",
		noindex: true, // Hide 404 pages from search engines
	},

	// Admin routes (nested)
	"/admin/*": {
		title: "Admin Dashboard - Inkgest",
		description: "Admin dashboard for managing your SaaS application.",
		keywords: "admin, dashboard, management",
		ogImage: "/inkgest-logo.png",
		ogType: "website",
		noindex: true, // Hide admin routes from search engines
	},

	// Default/fallback for all other routes
	"*": {
		title: "Inkgest — Agentic AI Editor to Scrape, Write, Publish & Translate",
		description:
			"Scrape sources, draft with agentic AI, rewrite in-editor with chat, translate, publish, and connect Claude via MCP — one workspace for modern content creators.",
		keywords:
			"Inkgest, agentic AI, AI editor, AI chatbot, content creation, publishing, translation, MCP, newsletter, blog, content workflow",
		ogImage: "/inkgest-logo.png",
		ogType: "website",
	},
};

/**
 * Get SEO config for a specific path
 * @param {string} pathname - The current pathname
 * @returns {object} SEO configuration object
 */
export const getSEOConfig = (pathname) => {
	// Try exact match first
	if (SEO_CONFIG[pathname]) {
		return SEO_CONFIG[pathname];
	}

	// Try nested route patterns (e.g., "/blog/*")
	for (const [pattern, config] of Object.entries(SEO_CONFIG)) {
		if (pattern.includes("*")) {
			const basePath = pattern.replace("/*", "");
			if (pathname.startsWith(basePath)) {
				return config;
			}
		}
	}

	// Fallback to wildcard
	return SEO_CONFIG["*"] || {};
};

/**
 * Get canonical URL for a path
 * @param {string} pathname - The current pathname
 * @param {string} baseUrl - Base URL of the site (optional)
 * @returns {string} Canonical URL
 */
export const getCanonicalUrl = (pathname, baseUrl = "") => {
	if (!baseUrl) {
		// Try to get from environment or use current origin
		if (typeof window !== "undefined") {
			baseUrl = window.location.origin;
		} else {
			baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
		}
	}
	return `${baseUrl}${pathname}`;
};
