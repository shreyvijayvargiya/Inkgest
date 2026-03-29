/**
 * Normalize inkgest-agent tasks that are markdown/article drafts (blog, tweets, newsletter, etc.)
 */

const ARTICLE_LIKE_TYPES = new Set([
	"newsletter",
	"linkedin",
	"blog_post",
	"blog",
	"twitter_thread",
	"email_digest",
	"article",
	"substack",
	"tweet",
	"tweets",
	"twitter",
	"linkedin_post",
	"linkedin-post",
	"long_form",
	"content",
	"content_draft",
]);

function normalizeTaskType(type) {
	if (!type || typeof type !== "string") return "";
	return type.toLowerCase().replace(/-/g, "_");
}

export function isArticleLikeAgentTask(type) {
	const t = normalizeTaskType(type);
	if (ARTICLE_LIKE_TYPES.has(t)) return true;
	if (t.endsWith("_post") || t.endsWith("_article")) return true;
	if (t.includes("blog") && !t.includes("table")) return true;
	if (t === "article" || t.includes("newsletter") || t.includes("substack"))
		return true;
	if (
		t.includes("tweet") ||
		t.includes("twitter") ||
		t.includes("thread")
	)
		return true;
	if (t.includes("linkedin") && !t.includes("table")) return true;
	if (t.includes("digest") || t.includes("email_digest")) return true;
	return false;
}

/** Markdown / text body from various agent payload shapes */
export function getAgentTaskArticleBody(task) {
	if (!task) return "";
	if (typeof task.content === "string" && task.content.trim()) return task.content;
	const r = task.result;
	if (typeof r === "string" && r.trim()) return r;
	if (r && typeof r === "object") {
		if (typeof r.content === "string" && r.content.trim()) return r.content;
		if (typeof r.markdown === "string" && r.markdown.trim()) return r.markdown;
		if (typeof r.text === "string" && r.text.trim()) return r.text;
		if (typeof r.body === "string" && r.body.trim()) return r.body;
	}
	if (typeof task.output === "string" && task.output.trim()) return task.output;
	return "";
}

/** Stable type for UI labels (Open row icon / text) */
export function displayTypeForArticleTask(taskType) {
	const t = normalizeTaskType(taskType);
	if (t.includes("twitter") || t.includes("tweet") || t.includes("thread"))
		return "twitter_thread";
	if (t.includes("linkedin")) return "linkedin";
	if (t.includes("blog") || t === "article" || t.includes("post"))
		return "blog_post";
	if (t.includes("digest") || t.includes("email")) return "email_digest";
	if (t.includes("newsletter") || t.includes("substack")) return "newsletter";
	return "blog_post";
}
