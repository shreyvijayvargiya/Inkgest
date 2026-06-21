import { mcpReadDoc, mcpUpdateDoc } from "../../../../lib/mcp/handlers";
import { runMcpRoute, mcpBadRequest } from "../../../../lib/mcp/mcpRoute";

export default async function handler(req, res) {
	const { id } = req.query;
	if (!id || typeof id !== "string") {
		return mcpBadRequest(res, "Document id is required");
	}

	if (req.method === "GET") {
		return runMcpRoute(req, res, {
			tool: "inkgest_read_doc",
			method: "GET",
			path: `/api/mcp/docs/${id}`,
			params: { doc_id: id },
			run: (uid) => mcpReadDoc(uid, id),
		});
	}

	if (req.method === "PATCH" || req.method === "PUT") {
		const { title, bodyMarkdown, prompt } = req.body || {};
		return runMcpRoute(req, res, {
			tool: "inkgest_update_doc",
			method: req.method,
			path: `/api/mcp/docs/${id}`,
			params: { doc_id: id, title, bodyMarkdown, prompt },
			run: (uid) => mcpUpdateDoc(uid, id, { title, bodyMarkdown, prompt }),
		});
	}

	return res.status(405).json({ ok: false, error: "Method not allowed" });
}
