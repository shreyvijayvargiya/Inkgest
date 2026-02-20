# SEO Configuration

This guide explains how to manage SEO (Search Engine Optimization) tags for your routes using the centralized SEO configuration system.

## Overview

The SEO system automatically applies meta tags (title, description, Open Graph, Twitter Cards, etc.) to all routes based on a centralized configuration file. This makes it easy to manage SEO for your entire application from one place.

## Configuration File

All SEO settings are managed in `lib/config/seo.js`. This file contains a `SEO_CONFIG` object where you can define SEO metadata for each route.

## Adding SEO for a Route

### Basic Route (Exact Match)

To add SEO tags for a specific route, add an entry to the `SEO_CONFIG` object:

```javascript
export const SEO_CONFIG = {
	"/your-route": {
		title: "Your Page Title - Inkgest",
		description:
			"A compelling description of your page (150-160 characters recommended)",
		keywords: "keyword1, keyword2, keyword3",
		ogImage: "/og-your-page.png",
		ogType: "website",
	},
};
```

**Example:**

```javascript
"/about": {
  title: "About Us - Inkgest",
  description: "Learn more about our mission, vision, and the team behind Inkgest.",
  keywords: "about, team, mission, company",
  ogImage: "/og-about.png",
  ogType: "website",
},
```

### Nested Routes (Wildcard Pattern)

For routes with dynamic segments or nested paths, use the wildcard pattern `/*`:

```javascript
"/blog/*": {
  title: "Blog - Inkgest",
  description: "Read our latest articles, tutorials, and updates.",
  keywords: "blog, articles, tutorials",
  ogImage: "/og-blog.png",
  ogType: "article",
},
```

This pattern will match:

- `/blog`
- `/blog/[slug]`
- `/blog/id/[id]`
- `/blog/category/[category]`
- Any other route starting with `/blog`

**Example for Admin Routes:**

```javascript
"/admin/*": {
  title: "Admin Dashboard - Inkgest",
  description: "Admin dashboard for managing your SaaS application.",
  keywords: "admin, dashboard, management",
  ogImage: "/og-admin.png",
  ogType: "website",
  noindex: true, // Hide from search engines
},
```

## Available SEO Fields

Each route configuration can include the following fields:

| Field         | Type    | Required | Description                                             |
| ------------- | ------- | -------- | ------------------------------------------------------- |
| `title`       | string  | Yes      | Page title (appears in browser tab and search results)  |
| `description` | string  | Yes      | Meta description (150-160 characters recommended)       |
| `keywords`    | string  | No       | Comma-separated keywords for SEO                        |
| `ogImage`     | string  | No       | Open Graph image URL (for social media sharing)         |
| `ogType`      | string  | No       | Open Graph type (`website`, `article`, `product`, etc.) |
| `noindex`     | boolean | No       | Set to `true` to hide from search engines               |
| `author`      | string  | No       | Page author name                                        |
| `viewport`    | string  | No       | Custom viewport settings (usually not needed)           |

## Route Matching Priority

The SEO system matches routes in the following order:

1. **Exact match** - Routes that exactly match the pathname (e.g., `/pricing`)
2. **Wildcard patterns** - Routes with `/*` that match the beginning of the pathname (e.g., `/blog/*`)
3. **Fallback** - The `"*"` wildcard route (used for all unmatched routes)

**Important:** More specific routes should be defined before less specific ones. The first match wins.

## Examples

### Example 1: Adding a New Page

```javascript
export const SEO_CONFIG = {
	// ... existing routes ...

	"/features": {
		title: "Features - Inkgest",
		description:
			"Discover all the powerful features included in our SaaS boilerplate.",
		keywords: "features, saas features, boilerplate features",
		ogImage: "/og-features.png",
		ogType: "website",
	},
};
```

### Example 2: Nested Route with Dynamic Segments

```javascript
export const SEO_CONFIG = {
	// Specific blog post route (if you want to override the wildcard)
	"/blog/[slug]": {
		title: "Blog Post - Inkgest",
		description: "Read our latest blog post",
		ogType: "article",
	},

	// General blog route (catches all blog routes)
	"/blog/*": {
		title: "Blog - Inkgest",
		description: "Read our latest articles and tutorials.",
		ogImage: "/og-blog.png",
		ogType: "article",
	},
};
```

### Example 3: Hiding Routes from Search Engines

```javascript
"/admin/*": {
  title: "Admin Dashboard",
  description: "Admin dashboard",
  noindex: true, // Prevents search engines from indexing
},
```

### Example 4: Custom Override in a Page Component

If you need to override SEO tags for a specific page, you can pass custom SEO to the component:

```javascript
import SEO from "../lib/modules/SEO";

export default function CustomPage() {
	const customSEO = {
		title: "Custom Page Title",
		description: "Custom description",
		ogImage: "/custom-og.png",
	};

	return (
		<>
			<SEO customSEO={customSEO} />
			{/* Your page content */}
		</>
	);
}
```

## Best Practices

1. **Title Tags**
   - Keep titles under 60 characters
   - Include your brand name (e.g., "Page Title - Inkgest")
   - Make them descriptive and unique

2. **Meta Descriptions**
   - Keep descriptions between 150-160 characters
   - Write compelling copy that encourages clicks
   - Include relevant keywords naturally

3. **Open Graph Images**
   - Recommended size: 1200x630 pixels
   - Use high-quality images
   - Store images in the `public` folder

4. **Keywords**
   - Use 5-10 relevant keywords
   - Separate with commas
   - Don't overstuff keywords

5. **Route Organization**
   - Group related routes together in the config
   - Use comments to organize sections
   - Keep the fallback route (`"*"`) at the end

## Testing SEO Tags

After adding or modifying SEO configuration:

1. **Check in Browser**
   - View page source (Right-click → View Page Source)
   - Look for `<meta>` tags in the `<head>` section

2. **Use Browser DevTools**
   - Open DevTools (F12)
   - Check the Elements tab for meta tags

3. **Test with Tools**
   - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - [Twitter Card Validator](https://cards-dev.twitter.com/validator)
   - [Google Rich Results Test](https://search.google.com/test/rich-results)

## Troubleshooting

### SEO Tags Not Appearing

1. **Check Route Matching**
   - Ensure your route pattern matches the actual pathname
   - Verify the route is defined in `SEO_CONFIG`

2. **Clear Cache**
   - Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear browser cache

3. **Check Component Override**
   - If a page component uses `<Head>` directly, it may override the SEO component
   - Remove direct `<Head>` usage or merge with SEO config

### Wrong Route Matched

- More specific routes should come before less specific ones
- Check the order of routes in `SEO_CONFIG`
- Exact matches take priority over wildcard patterns

## File Structure

```
lib/
  config/
    seo.js          # SEO configuration (edit this file)
  components/
    SEO.jsx         # SEO component (automatically applied)
pages/
  _app.js          # App wrapper (includes SEO component)
  _document.js     # Document structure
```

## Additional Resources

- [Next.js Head Component](https://nextjs.org/docs/api-reference/next/head)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Google Search Central](https://developers.google.com/search)
