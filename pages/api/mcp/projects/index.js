import { mcpListProjects } from "../../../../lib/mcp/handlers";
import { runMcpRoute } from "../../../../lib/mcp/mcpRoute";

export default async function handler(req, res) {
	if (req.method !== "GET") {
		return res.status(405).json({ ok: false, error: "Method not allowed" });
	}

	const limit = Number(req.query?.limit) || 50;

	return runMcpRoute(req, res, {
		tool: "inkgest_list_projects",
		method: "GET",
		path: "/api/mcp/projects",
		params: { limit },
		run: (uid) => mcpListProjects(uid, { limit }),
	});
}
