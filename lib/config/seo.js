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
		title: "Inkgest - Link to Gest",
		description:
			"Complete SaaS boilerplate with authentication, payments, admin panel, and more. Built with Next.js, Firebase, and Stripe.",
		keywords: "saas, boilerplate, nextjs, firebase, stripe, starter",
		ogImage: "/og-home.png",
		ogType: "website",
	},

	// Pricing
	"/pricing": {
		title: "Pricing - Inkgest",
		description:
			"Choose the perfect plan for your needs. Flexible pricing options for individuals and teams.",
		keywords: "pricing, plans, subscription, saas pricing",
		ogImage: "/og-pricing.png",
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

	// Documentation
	"/docs": {
		title: "Documentation - Inkgest",
		description:
			"Complete documentation for Inkgest. Learn how to set up, configure, and deploy your SaaS application.",
		keywords: "documentation, docs, saas documentation, setup guide",
		ogImage: "/og-docs.png",
		ogType: "website",
	},

	// Builder
	"/builder": {
		title: "Build Your SaaS - Inkgest",
		description:
			"Configure your SaaS application and generate your repository setup. Customize Firebase, Stripe, and deployment settings.",
		keywords: "builder, saas builder, configuration, setup",
		ogImage: "/og-builder.png",
		ogType: "website",
	},

	// Blog routes (nested)
	"/blog/*": {
		title: "Blog - Inkgest",
		description:
			"Read our latest articles, tutorials, and updates about SaaS development, best practices, and industry insights.",
		keywords: "blog, articles, saas blog, tutorials",
		ogImage: "/og-blog.png",
		ogType: "article",
	},

	// Contact
	"/contact": {
		title: "Contact Us - Inkgest",
		description:
			"Get in touch with us. We're here to help you build your SaaS application.",
		keywords: "contact, support, help, saas support",
		ogImage: "/og-contact.png",
		ogType: "website",
	},

	// 404 Error Page
	"/404": {
		title: "404 - Page Not Found - Inkgest",
		description: "The page you are looking for does not exist.",
		keywords: "404, page not found, error",
		ogImage: "/og-default.png",
		ogType: "website",
		noindex: true, // Hide 404 pages from search engines
	},

	// Admin routes (nested)
	"/admin/*": {
		title: "Admin Dashboard - Inkgest",
		description: "Admin dashboard for managing your SaaS application.",
		keywords: "admin, dashboard, management",
		ogImage: "/og-admin.png",
		ogType: "website",
		noindex: true, // Hide admin routes from search engines
	},

	// Default/fallback for all other routes
	"*": {
		title: "Inkgest - Link to Gest",
		description:
			"Complete SaaS boilerplate with authentication, payments, admin panel, and more.",
		keywords: "saas, boilerplate, nextjs, firebase, stripe",
		ogImage: "/og-default.png",
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
