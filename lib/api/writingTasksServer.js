/**
 * Writing tasks board — Firestore (Admin SDK) for MCP + trusted API routes.
 * Collection: users/{uid}/writingTasks/{taskId}
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "../config/firebaseAdmin";

export const WRITING_TASK_STATUSES = ["backlog", "in-progress", "done"];
export const WRITING_TASK_PRIORITIES = ["High", "Medium", "Low"];
export const WRITING_TASK_PROJECT_UNASSIGNED = "unassigned";

function tasksCollection(uid) {
	return getAdminFirestore().collection("users").doc(uid).collection("writingTasks");
}

function createWritingTaskId() {
	return `wt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value) {
	if (!value) return null;
	if (typeof value === "string") return value;
	if (value.toDate) return value.toDate().toISOString();
	if (value instanceof Date) return value.toISOString();
	return null;
}

function normalizeTaskDoc(id, data) {
	return {
		id,
		title: data.title || "",
		description: data.description || "",
		status: data.status || "backlog",
		priority: data.priority || "Medium",
		progress: data.progress ?? 0,
		assignees: Array.isArray(data.assignees) ? data.assignees : [],
		attachments: data.attachments ?? 0,
		comments: data.comments ?? 0,
		projectId: data.projectId || null,
		draftId: data.draftId || null,
		draftPath: data.draftPath || null,
		createdAt: toIso(data.createdAt),
		updatedAt: toIso(data.updatedAt),
	};
}

/**
 * @returns {Promise<Array<object>>}
 * @param {{ limit?: number, status?: string, projectId?: string|null }} opts
 *   projectId — Firestore project id, or WRITING_TASK_PROJECT_UNASSIGNED for tasks with no project
 */
export async function listWritingTasksServer(uid, { limit = 50, status, projectId } = {}) {
	if (!uid) return [];
	const cap = Math.min(Math.max(limit, 1), 100);
	let snap;
	try {
		let q = tasksCollection(uid).orderBy("updatedAt", "desc");
		if (status && WRITING_TASK_STATUSES.includes(status)) {
			q = tasksCollection(uid).where("status", "==", status).orderBy("updatedAt", "desc");
		} else if (
			projectId &&
			projectId !== WRITING_TASK_PROJECT_UNASSIGNED
		) {
			q = tasksCollection(uid).where("projectId", "==", projectId).orderBy("updatedAt", "desc");
		}
		snap = await q.limit(cap).get();
	} catch {
		snap = await tasksCollection(uid).limit(cap).get();
	}
	let tasks = snap.docs.map((d) => normalizeTaskDoc(d.id, d.data()));
	if (status && WRITING_TASK_STATUSES.includes(status)) {
		tasks = tasks.filter((t) => t.status === status);
	}
	if (projectId === WRITING_TASK_PROJECT_UNASSIGNED) {
		tasks = tasks.filter((t) => !t.projectId);
	} else if (projectId) {
		tasks = tasks.filter((t) => t.projectId === projectId);
	}
	tasks.sort((a, b) => {
		const aT = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
		const bT = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
		return bT - aT;
	});
	return tasks.slice(0, cap);
}

/**
 * @returns {Promise<object|null>}
 */
export async function getWritingTaskServer(uid, taskId) {
	if (!uid || !taskId) return null;
	const snap = await tasksCollection(uid).doc(taskId).get();
	if (!snap.exists) return null;
	return normalizeTaskDoc(snap.id, snap.data());
}

/**
 * @returns {Promise<object>}
 */
export async function createWritingTaskServer(uid, data = {}) {
	if (!uid) throw new Error("User ID required");
	const taskId = data.id || createWritingTaskId();
	const now = FieldValue.serverTimestamp();
	const doc = {
		title: String(data.title || "").trim(),
		description: String(data.description || "").trim(),
		status: WRITING_TASK_STATUSES.includes(data.status) ? data.status : "backlog",
		priority: WRITING_TASK_PRIORITIES.includes(data.priority) ? data.priority : "Medium",
		progress: typeof data.progress === "number" ? data.progress : 0,
		assignees: Array.isArray(data.assignees) ? data.assignees : [],
		attachments: data.attachments ?? 0,
		comments: data.comments ?? 0,
		projectId: data.projectId || null,
		draftId: data.draftId || null,
		draftPath: data.draftPath || null,
		createdAt: now,
		updatedAt: now,
	};
	await tasksCollection(uid).doc(taskId).set(doc);
	return {
		ok: true,
		id: taskId,
		title: doc.title,
		status: doc.status,
		path: "/tasks",
	};
}

/**
 * @returns {Promise<object>}
 */
export async function updateWritingTaskServer(uid, taskId, updates = {}) {
	if (!uid || !taskId) throw new Error("Task id required");
	const existing = await getWritingTaskServer(uid, taskId);
	if (!existing) return { ok: false, error: "Task not found" };

	const payload = { updatedAt: FieldValue.serverTimestamp() };
	if (updates.title != null) payload.title = String(updates.title).trim();
	if (updates.description != null) payload.description = String(updates.description).trim();
	if (updates.status != null) {
		if (!WRITING_TASK_STATUSES.includes(updates.status)) {
			return { ok: false, error: `Invalid status. Use: ${WRITING_TASK_STATUSES.join(", ")}` };
		}
		payload.status = updates.status;
	}
	if (updates.priority != null) {
		if (!WRITING_TASK_PRIORITIES.includes(updates.priority)) {
			return { ok: false, error: `Invalid priority. Use: ${WRITING_TASK_PRIORITIES.join(", ")}` };
		}
		payload.priority = updates.priority;
	}
	if (updates.progress != null) payload.progress = Number(updates.progress);
	if (updates.projectId !== undefined) payload.projectId = updates.projectId || null;
	if (updates.draftId !== undefined) payload.draftId = updates.draftId || null;
	if (updates.draftPath !== undefined) payload.draftPath = updates.draftPath || null;
	if (updates.assignees != null) {
		payload.assignees = Array.isArray(updates.assignees) ? updates.assignees : [];
	}

	if (Object.keys(payload).length <= 1) {
		return { ok: false, error: "No updates provided" };
	}

	await tasksCollection(uid).doc(taskId).update(payload);
	return {
		ok: true,
		id: taskId,
		path: "/tasks",
		updated: Object.keys(payload).filter((k) => k !== "updatedAt"),
	};
}

/**
 * @returns {Promise<object>}
 */
export async function deleteWritingTaskServer(uid, taskId) {
	if (!uid || !taskId) throw new Error("Task id required");
	const existing = await getWritingTaskServer(uid, taskId);
	if (!existing) return { ok: false, error: "Task not found" };
	await tasksCollection(uid).doc(taskId).delete();
	return { ok: true, id: taskId, deleted: true };
}
