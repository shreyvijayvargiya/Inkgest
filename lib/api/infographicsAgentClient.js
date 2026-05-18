/**
 * Calls the Next.js infographic generator (OpenRouter JSON panels — same AI stack as /api/chat/message).
 * userId is accepted for backwards compatibility; authentication uses idToken only.
 */

export async function fetchInfographicsFromAgent({
	userId: _userId,
	idToken,
	htmlOrTextContent = "",
	title = "",
	excludeTypes = [],
	visualFormatId = null,
	minPanels = 1,
	maxPanels = 5,
}) {
	void _userId;
	const bodyText = String(htmlOrTextContent || "").trim();

	const res = await fetch("/api/infographics/generate", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			idToken,
			htmlOrTextContent: bodyText,
			title: title || "Infographics",
			excludeTypes,
			visualFormatId,
			minPanels,
			maxPanels,
		}),
	});

	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error || "Generation failed");
	}

	const batch = Array.isArray(data.infographics) ? data.infographics : [];
	return { infographics: batch, raw: data };
}
