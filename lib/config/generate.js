/**
 * Hono backend base URL (client-safe). No trailing slash.
 * Example: https://api.inkgest.com
 */
export const INKGEST_GENERATE_BASE_URL =
	(typeof process !== "undefined" &&
		process.env.NEXT_PUBLIC_INKGEST_GENERATE_URL) ||
	"http://localhost:3002";

export function getGenerateUrl(type) {
	const base = INKGEST_GENERATE_BASE_URL.replace(/\/$/, "");
	if (!base) return "";
	const t = encodeURIComponent(String(type || "").toLowerCase());
	return `${base}/generate/${t}`;
}
