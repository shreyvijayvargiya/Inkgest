/**
 * Build a Firestore draft record for createDraft (users/{uid}/assets).
 * Mirrors shape used in persistGenerateResponse for markdown drafts.
 */
export function extractTitleFromMarkdownBody(body) {
	const lines = String(body || "").split("\n");
	const h = lines.find((l) => /^#{1,6}\s/.test(l.trim()));
	if (h) return h.replace(/^#+\s*/, "").trim();
	const first = lines.find((l) => l.trim().length > 0);
	if (first) return first.trim().slice(0, 120);
	return "New draft";
}

export function buildAgentDraftRecord({
	title: titleIn,
	bodyMarkdown,
	prompt = "",
}) {
	const content = String(bodyMarkdown || "").trim();
	const title =
		String(titleIn || "").trim() || extractTitleFromMarkdownBody(content);
	const bodyText = content
		.split("\n")
		.filter((l) => !/^#{1,6}\s/.test(l.trim()))
		.join(" ")
		.replace(/[*_`]/g, "")
		.replace(/\s+/g, " ")
		.trim();
	return {
		title,
		preview:
			bodyText.slice(0, 180) + (bodyText.length > 180 ? "…" : ""),
		body: content,
		urls: [],
		prompt: String(prompt || "").trim(),
		words: content ? content.split(/\s+/).filter(Boolean).length : 0,
		date: new Date().toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		}),
		tag: "Agent",
		format: "substack",
	};
}
