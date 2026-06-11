/**
 * Fix YouTube <iframe src="..."> for public HTML (published blogs, exports).
 * Watch / Shorts / youtu.be URLs are not valid embed sources — the player loads but
 * playback fails ("An error occurred"). Only /embed/{id} works reliably.
 */

export function extractYoutubeVideoId(raw) {
	try {
		const u = String(raw || "").trim();
		if (!u) return null;
		const abs = u.startsWith("http")
			? u
			: u.startsWith("//")
				? `https:${u}`
				: `https://${u}`;
		const url = new URL(abs);
		const host = url.hostname.replace(/^www\./, "");

		if (host === "youtu.be") {
			return url.pathname.replace(/^\//, "").split(/[?#]/)[0] || null;
		}

		if (host === "youtube.com" || host.endsWith(".youtube.com")) {
			return (
				url.searchParams.get("v") ||
				url.pathname.match(/\/embed\/([^/?#]+)/)?.[1] ||
				url.pathname.match(/\/shorts\/([^/?#]+)/)?.[1] ||
				url.pathname.match(/\/live\/([^/?#]+)/)?.[1]
			);
		}

		if (host === "youtube-nocookie.com") {
			return url.pathname.match(/\/embed\/([^/?#]+)/)?.[1] || null;
		}
	} catch {
		return null;
	}
	return null;
}

/** Canonical embed URL, or null if not a YouTube URL we can fix. */
export function normalizeYoutubeIframeSrc(src) {
	if (!src || !/youtube|youtu\.be/i.test(String(src))) return null;
	const id = extractYoutubeVideoId(src);
	if (!id) return null;
	const canonical = `https://www.youtube.com/embed/${id}?rel=0`;
	const trimmed = String(src).trim().replace(/&amp;/g, "&");
	if (trimmed === canonical) return null;
	return canonical;
}

/**
 * Rewrite YouTube iframes in HTML string (SSR-safe, no DOM).
 */
export function normalizeYoutubeEmbedsInHtml(html) {
	if (!html || typeof html !== "string") return html;
	return html.replace(
		/(<iframe\b[^>]*\bsrc\s*=\s*)(["'])([^"']*)\2/gi,
		(_full, prefix, quote, srcAttr) => {
			const next = normalizeYoutubeIframeSrc(srcAttr);
			if (!next) return `${prefix}${quote}${srcAttr}${quote}`;
			return `${prefix}${quote}${next}${quote}`;
		},
	);
}

export default normalizeYoutubeEmbedsInHtml;
