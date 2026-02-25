/**
 * URL allowlist — blocks SSRF vectors: localhost, private IPs, file://, etc.
 *
 * Only allows public http/https URLs.
 */

const BLOCKED_HOSTS = new Set([
	"localhost",
	"127.0.0.1",
	"0.0.0.0",
	"::1",
	"[::1]",
]);

const BLOCKED_PREFIXES = [
	"file://",
	"ftp://",
	"ftps://",
	"gopher://",
	"data:",
	"javascript:",
	"vbscript:",
];

// Private IP ranges (CIDR-style checks via regex for simplicity)
const PRIVATE_IP_PATTERNS = [
	/^10\./,                    // 10.0.0.0/8
	/^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
	/^192\.168\./,               // 192.168.0.0/16
	/^127\./,                    // 127.0.0.0/8 (loopback)
	/^169\.254\./,               // 169.254.0.0/16 (link-local)
	/^0\./,                      // 0.0.0.0/8
	/^fc00:/i,                   // fc00::/7 (IPv6 private)
	/^fe80:/i,                   // fe80::/10 (IPv6 link-local)
	/^::1$/,                     // ::1 (IPv6 loopback)
];

function isPrivateIp(host) {
	if (!host || typeof host !== "string") return true;
	const normalized = host.replace(/^\[|\]$/g, "").toLowerCase();
	return PRIVATE_IP_PATTERNS.some((re) => re.test(normalized));
}

function isBlockedHost(host) {
	if (!host || typeof host !== "string") return true;
	const normalized = host.split(":")[0].toLowerCase();
	return BLOCKED_HOSTS.has(normalized);
}

/**
 * Validate a URL for safe use (no SSRF).
 *
 * @param {string} url - URL to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUrl(url) {
	if (!url || typeof url !== "string") {
		return { valid: false, error: "URL is required" };
	}

	const trimmed = url.trim();
	if (!trimmed) {
		return { valid: false, error: "URL is required" };
	}

	// Block non-http(s) protocols
	const lower = trimmed.toLowerCase();
	for (const prefix of BLOCKED_PREFIXES) {
		if (lower.startsWith(prefix)) {
			return { valid: false, error: "URL protocol not allowed" };
		}
	}

	if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
		return { valid: false, error: "URL must start with http:// or https://" };
	}

	let host;
	try {
		const parsed = new URL(trimmed);
		host = parsed.hostname;
	} catch {
		return { valid: false, error: "Invalid URL format" };
	}

	if (isBlockedHost(host)) {
		return { valid: false, error: "URL host not allowed" };
	}

	if (isPrivateIp(host)) {
		return { valid: false, error: "Private or internal URLs are not allowed" };
	}

	return { valid: true };
}

/**
 * Validate multiple URLs. Returns first error or { valid: true }.
 */
export function validateUrls(urls) {
	if (!Array.isArray(urls)) {
		return { valid: false, error: "URLs must be an array" };
	}
	for (const url of urls) {
		const result = validateUrl(url);
		if (!result.valid) return result;
	}
	return { valid: true };
}
