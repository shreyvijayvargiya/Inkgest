import {
	mcpGetTask,
	mcpUpdateTask,
	mcpDeleteTask,
} from "../../../../lib/mcp/handlers";
import { runMcpRoute, mcpBadRequest } from "../../../../lib/mcp/mcpRoute";

export default async function handler(req, res) {
	const { id } = req.query;
	if (!id || typeof id !== "string") {
		return mcpBadRequest(res, "Task id is required");
	}

	if (req.method === "GET") {
		return runMcpRoute(req, res, {
			tool: "inkgest_get_task",
			method: "GET",
			path: `/api/mcp/tasks/${id}`,
			params: { task_id: id },
			run: (uid) => mcpGetTask(uid, id),
		});
	}

	if (req.method === "PATCH" || req.method === "PUT") {
		const {
			title,
			description,
			status,
			priority,
			progress,
			projectId,
			draftId,
			draftPath,
		} = req.body || {};
		const params = {
			task_id: id,
			title,
			description,
			status,
			priority,
			progress,
			projectId,
			draftId,
			draftPath,
		};
		return runMcpRoute(req, res, {
			tool: "inkgest_update_task",
			method: req.method,
			path: `/api/mcp/tasks/${id}`,
			params,
			run: (uid) => mcpUpdateTask(uid, id, params),
		});
	}

	if (req.method === "DELETE") {
		return runMcpRoute(req, res, {
			tool: "inkgest_delete_task",
			method: "DELETE",
			path: `/api/mcp/tasks/${id}`,
			params: { task_id: id },
			run: (uid) => mcpDeleteTask(uid, id),
		});
	}

	return res.status(405).json({ ok: false, error: "Method not allowed" });
}
