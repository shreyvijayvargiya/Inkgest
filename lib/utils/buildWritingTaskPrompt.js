/**
 * Build an InkAgent prompt from a Kanban writing task.
 */
export function buildWritingTaskAgentPrompt(task) {
	const title = String(task?.title || "").trim() || "Untitled blog";
	const description = String(task?.description || "").trim();
	const priority = task?.priority ? `Priority: ${task.priority}.` : "";

	const lines = [
		"Write a complete, publish-ready blog post draft for the following writing task.",
		"",
		`Title: ${title}`,
	];

	if (description) {
		lines.push(`Notes / brief: ${description}`);
	}
	if (priority) lines.push(priority);

	lines.push(
		"",
		"Use clear markdown headings, an engaging intro, and actionable takeaways.",
		"Tone: professional but approachable — suitable for a newsletter or blog.",
	);

	return lines.join("\n");
}
