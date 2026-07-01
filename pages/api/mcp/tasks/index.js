import {
	mcpListTasks,
	mcpCreateTask,
} from "../../../../lib/mcp/handlers";
import { runMcpRoute, mcpBadRequest } from "../../../../lib/mcp/mcpRoute";
import {
	WRITING_TASK_STATUSES,
} from "../../../../lib/api/writingTasksServer";

export default async function handler(req, res) {
	if (req.method === "GET") {
		const limit = Number(req.query?.limit) || 20;
		const status = req.query?.status;
		const projectId = req.query?.project_id || req.query?.projectId || null;
		if (status && !WRITING_TASK_STATUSES.includes(status)) {
			return mcpBadRequest(
				res,
				`Invalid status. Use: ${WRITING_TASK_STATUSES.join(", ")}`,
			);
		}
		return runMcpRoute(req, res, {
			tool: "inkgest_list_tasks",
			method: "GET",
			path: "/api/mcp/tasks",
			params: { limit, status: status || null, project_id: projectId },
			run: (uid) => mcpListTasks(uid, { limit, status, projectId }),
		});
	}

	if (req.method === "POST") {
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
		if (!title || typeof title !== "string") {
			return mcpBadRequest(res, "title (string) is required");
		}
		const params = {
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
			tool: "inkgest_create_task",
			method: "POST",
			path: "/api/mcp/tasks",
			params,
			successStatus: 201,
			run: (uid) => mcpCreateTask(uid, params),
		});
	}

	return res.status(405).json({ ok: false, error: "Method not allowed" });
}
