import { validateUrl } from "./urlAllowlist";

/** Mirrors lib/api/inkagent URL extraction (trim trailing punctuation client-side). */
const URL_REGEX = /https?:\/\/[^\s\)\]"'<>]+/gi;

/**
 * Strip trailing punctuation often pasted after URLs.
 * @param {string} u
 */
function stripTrailingPunct(u) {
	return u.replace(/[.,;:!?)]+$/, "");
}

/**
 * Unique https URLs from free-form prompt text (validated against SSRF allowlist).
 * @param {string} text
 * @returns {string[]}
 */
export function extractUrlsFromPromptText(text) {
	if (!text || typeof text !== "string") return [];
	const raw = text.match(URL_REGEX) || [];
	const cleaned = raw.map((u) => stripTrailingPunct(u));
	const uniq = [...new Set(cleaned)];
	const valid = [];
	for (const u of uniq) {
		if (validateUrl(u).valid) valid.push(u);
	}
	return valid;
}

/**
 * Remove every occurrence of a URL substring from prompt text (chip dismiss).
 * @param {string} text
 * @param {string} url
 */
export function removeUrlOccurrences(text, url) {
	if (!text || !url) return String(text || "").trim();
	const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return text.replace(new RegExp(escaped, "g"), " ").replace(/\s+/g, " ").trim();
}
