/**
 * Calls POST /api/mermaid/generate (OpenRouter JSON → Mermaid source).
 */

export async function fetchMermaidFromAgent({
	userId: _userId,
	idToken,
	prompt = "",
	contextText = "",
	articleTitle = "",
}) {
	void _userId;

	const res = await fetch("/api/mermaid/generate", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			idToken,
			prompt: String(prompt || "").trim(),
			contextText: String(contextText || "").trim(),
			articleTitle: String(articleTitle || "").trim(),
		}),
	});

	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error || "Mermaid generation failed");
	}

	return {
		mermaid: String(data.mermaid || ""),
		title: String(data.title || "Diagram"),
		raw: data,
	};
}
