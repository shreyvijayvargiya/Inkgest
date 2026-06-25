/**
 * Build Firestore update payload for markdown draft edits (chat agent / MCP).
 */
export function buildDraftMarkdownUpdates({ title, bodyMarkdown, prompt }) {
	const updates = {};
	if (title != null) updates.title = String(title).trim();
	if (bodyMarkdown != null) {
		const content = String(bodyMarkdown).trim();
		updates.body = content;
		const bodyText = content
			.split("\n")
			.filter((l) => !/^#{1,6}\s/.test(l.trim()))
			.join(" ")
			.replace(/[*_`]/g, "")
			.replace(/\s+/g, " ")
			.trim();
		updates.preview =
			bodyText.slice(0, 180) + (bodyText.length > 180 ? "…" : "");
		updates.words = content ? content.split(/\s+/).filter(Boolean).length : 0;
	}
	if (prompt != null) updates.prompt = String(prompt).trim();
	return updates;
}
