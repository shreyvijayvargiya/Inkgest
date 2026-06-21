import { mcpListDocs, mcpCreateDoc } from "../../../../lib/mcp/handlers";
import { runMcpRoute, mcpBadRequest } from "../../../../lib/mcp/mcpRoute";

export default async function handler(req, res) {
	if (req.method === "GET") {
		const limit = Number(req.query?.limit) || 20;
		return runMcpRoute(req, res, {
			tool: "inkgest_list_docs",
			method: "GET",
			path: "/api/mcp/docs",
			params: { limit },
			run: (uid) => mcpListDocs(uid, limit),
		});
	}

	if (req.method === "POST") {
		const { title, bodyMarkdown, prompt } = req.body || {};
		if (!bodyMarkdown || typeof bodyMarkdown !== "string") {
			return mcpBadRequest(res, "bodyMarkdown (string) is required");
		}
		return runMcpRoute(req, res, {
			tool: "inkgest_create_doc",
			method: "POST",
			path: "/api/mcp/docs",
			params: { title, bodyMarkdown, prompt },
			successStatus: 201,
			run: (uid) => mcpCreateDoc(uid, { title, bodyMarkdown, prompt }),
		});
	}

	return res.status(405).json({ ok: false, error: "Method not allowed" });
}
