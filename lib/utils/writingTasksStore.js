export const WRITING_TASK_COLUMNS = [
	{ id: "backlog", title: "Backlog" },
	{ id: "in-progress", title: "In Progress" },
	{ id: "done", title: "Done" },
];

const STORAGE_PREFIX = "inkgest_writing_tasks";

export function getWritingTasksStorageKey(userId) {
	return `${STORAGE_PREFIX}_${userId || "guest"}`;
}

export function loadWritingTasks(userId) {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(getWritingTasksStorageKey(userId));
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

export function saveWritingTasks(userId, tasks) {
	if (typeof window === "undefined") return;
	localStorage.setItem(getWritingTasksStorageKey(userId), JSON.stringify(tasks));
}

export function createWritingTaskId() {
	return `wt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function makeWritingTask(partial = {}) {
	const now = new Date().toISOString();
	return {
		id: partial.id || createWritingTaskId(),
		title: partial.title || "",
		description: partial.description || "",
		status: partial.status || "backlog",
		priority: partial.priority || "Medium",
		progress: partial.progress ?? 0,
		assignees: partial.assignees || [],
		attachments: partial.attachments ?? 0,
		comments: partial.comments ?? 0,
		projectId: partial.projectId || null,
		draftId: partial.draftId || null,
		draftPath: partial.draftPath || null,
		createdAt: partial.createdAt || now,
		updatedAt: now,
	};
}
