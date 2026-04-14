/** Resolve a site-relative path or absolute URL for SEO and JSON-LD. */
export function absoluteUrl(pathOrUrl) {
	if (!pathOrUrl) return "";
	if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
	const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
	const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
	return base ? `${base}${path}` : pathOrUrl;
}
