import { mcpSearchDocs } from "../../../lib/mcp/handlers";
import { runMcpRoute, mcpBadRequest } from "../../../lib/mcp/mcpRoute";

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ ok: false, error: "Method not allowed" });
	}

	const { query, limit } = req.body || {};
	if (!query || typeof query !== "string") {
		return mcpBadRequest(res, "query (string) is required");
	}

	return runMcpRoute(req, res, {
		tool: "inkgest_search_docs",
		method: "POST",
		path: "/api/mcp/search",
		params: { query, limit },
		run: (uid) => mcpSearchDocs(uid, query, Number(limit) || 10),
	});
}
