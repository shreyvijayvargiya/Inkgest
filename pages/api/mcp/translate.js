import { mcpTranslateDoc } from "../../../lib/mcp/handlers";
import { runMcpRoute, mcpBadRequest } from "../../../lib/mcp/mcpRoute";

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ ok: false, error: "Method not allowed" });
	}

	const { doc_id, language, translated_markdown } = req.body || {};
	if (!doc_id || typeof doc_id !== "string") {
		return mcpBadRequest(res, "doc_id (string) is required");
	}
	if (!language || typeof language !== "string") {
		return mcpBadRequest(res, "language (string) is required");
	}

	const params = {
		doc_id,
		language,
		translated_markdown: translated_markdown ?? null,
	};

	return runMcpRoute(req, res, {
		tool: "inkgest_translate_doc",
		method: "POST",
		path: "/api/mcp/translate",
		params,
		successStatus: translated_markdown ? 200 : 200,
		run: (uid) =>
			mcpTranslateDoc(uid, {
				docId: doc_id,
				language,
				translatedMarkdown: translated_markdown,
			}),
	});
}
