/**
 * Writing tasks board — client Firestore SDK (Tasks page UI).
 * Collection: users/{uid}/writingTasks/{taskId}
 */

import {
	collection,
	doc,
	getDoc,
	getDocs,
	setDoc,
	updateDoc,
	deleteDoc,
	query,
	orderBy,
	serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import {
	createWritingTaskId,
	makeWritingTask,
	getWritingTasksStorageKey,
	loadWritingTasks,
} from "../utils/writingTasksStore";

function tasksCollectionRef(uid) {
	return collection(db, "users", uid, "writingTasks");
}

function toIso(value) {
	if (!value) return null;
	if (typeof value === "string") return value;
	if (value.toDate) return value.toDate().toISOString();
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

export async function listWritingTasks(uid) {
	if (!uid) return loadWritingTasks(uid);
	let snap;
	try {
		snap = await getDocs(query(tasksCollectionRef(uid), orderBy("updatedAt", "desc")));
	} catch {
		snap = await getDocs(tasksCollectionRef(uid));
	}
	const tasks = snap.docs.map((d) => normalizeTaskDoc(d.id, d.data()));
	tasks.sort((a, b) => {
		const aT = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
		const bT = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
		return bT - aT;
	});
	return tasks;
}

export async function migrateLocalWritingTasks(uid) {
	if (!uid || typeof window === "undefined") return;
	const local = loadWritingTasks(uid);
	if (local.length === 0) return;
	const remote = await listWritingTasks(uid);
	if (remote.length > 0) return;
	for (const task of local) {
		const taskId = task.id || createWritingTaskId();
		await setDoc(doc(db, "users", uid, "writingTasks", taskId), {
			title: task.title || "",
			description: task.description || "",
			status: task.status || "backlog",
			priority: task.priority || "Medium",
			progress: task.progress ?? 0,
			assignees: task.assignees || [],
			attachments: task.attachments ?? 0,
			comments: task.comments ?? 0,
			projectId: task.projectId || null,
			draftId: task.draftId || null,
			draftPath: task.draftPath || null,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});
	}
	localStorage.removeItem(getWritingTasksStorageKey(uid));
}

export async function createWritingTask(uid, partial = {}) {
	if (!uid) {
		const task = makeWritingTask(partial);
		const existing = loadWritingTasks(uid);
		const { saveWritingTasks } = await import("../utils/writingTasksStore");
		saveWritingTasks(uid, [task, ...existing]);
		return task;
	}
	const task = makeWritingTask(partial);
	const taskId = task.id;
	await setDoc(doc(db, "users", uid, "writingTasks", taskId), {
		title: task.title,
		description: task.description,
		status: task.status,
		priority: task.priority,
		progress: task.progress,
		assignees: task.assignees,
		attachments: task.attachments,
		comments: task.comments,
		projectId: task.projectId,
		draftId: task.draftId,
		draftPath: task.draftPath,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});
	return { ...task, id: taskId };
}

export async function updateWritingTask(uid, taskId, updates) {
	if (!uid) {
		const existing = loadWritingTasks(uid);
		const next = existing.map((t) =>
			t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
		);
		const { saveWritingTasks } = await import("../utils/writingTasksStore");
		saveWritingTasks(uid, next);
		return;
	}
	const payload = { ...updates, updatedAt: serverTimestamp() };
	Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
	await updateDoc(doc(db, "users", uid, "writingTasks", taskId), payload);
}

export async function deleteWritingTask(uid, taskId) {
	if (!uid) {
		const existing = loadWritingTasks(uid).filter((t) => t.id !== taskId);
		const { saveWritingTasks } = await import("../utils/writingTasksStore");
		saveWritingTasks(uid, existing);
		return;
	}
	await deleteDoc(doc(db, "users", uid, "writingTasks", taskId));
}

export async function getWritingTask(uid, taskId) {
	if (!uid) return loadWritingTasks(uid).find((t) => t.id === taskId) || null;
	const snap = await getDoc(doc(db, "users", uid, "writingTasks", taskId));
	if (!snap.exists()) return null;
	return normalizeTaskDoc(snap.id, snap.data());
}
