/**
 * Hono backend base URL (server-only proxy target). No trailing slash.
 * The browser calls Next.js `/generate/:type`, which forwards here — same pattern as `/api/scrape/url`.
 *
 * Override with INKGEST_GENERATE_URL or NEXT_PUBLIC_INKGEST_GENERATE_URL (e.g. production API origin).
 */
export function getInkgestGenerateBackendBase() {
	const raw =
		(typeof process !== "undefined" && process.env.INKGEST_GENERATE_URL) ||
		(typeof process !== "undefined" &&
			process.env.NEXT_PUBLIC_INKGEST_GENERATE_URL) ||
		"http://localhost:3002";
	return String(raw).replace(/\/$/, "");
}
