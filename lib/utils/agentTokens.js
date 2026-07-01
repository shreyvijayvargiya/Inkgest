/**
 * Read total token count from inkgest-agent SSE / JSON payloads.
 * Supports common shapes from OpenRouter-style usage objects.
 */
export function extractAgentTotalTokens(data) {
	if (!data || typeof data !== "object") return null;
	const u = data.usage;
	const candidates = [
		data.totalTokens,
		data.total_tokens,
		data.tokenCount,
		data.tokens,
		u?.total_tokens,
		u?.totalTokens,
		u?.total,
		u?.prompt_tokens != null && u?.completion_tokens != null
			? u.prompt_tokens + u.completion_tokens
			: null,
	];
	for (const c of candidates) {
		if (typeof c === "number" && !Number.isNaN(c) && c >= 0) return Math.round(c);
	}
	return null;
}
