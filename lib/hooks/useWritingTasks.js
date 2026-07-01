import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { makeWritingTask } from "../utils/writingTasksStore";
import {
	listWritingTasks,
	migrateLocalWritingTasks,
	createWritingTask,
	updateWritingTask,
	deleteWritingTask,
} from "../api/writingTasks";

async function loadTasks(userId) {
	if (!userId) {
		const { loadWritingTasks } = await import("../utils/writingTasksStore");
		return loadWritingTasks(userId);
	}
	await migrateLocalWritingTasks(userId);
	return listWritingTasks(userId);
}

export function useWritingTasks(userId) {
	const queryKey = ["writingTasks", userId || "guest"];
	const queryClient = useQueryClient();

	const { data: tasks = [], isLoading } = useQuery({
		queryKey,
		queryFn: () => loadTasks(userId),
		staleTime: 30_000,
	});

	const invalidate = useCallback(() => {
		queryClient.invalidateQueries({ queryKey });
	}, [queryClient, queryKey]);

	const addTask = useCallback(
		async (partial) => {
			const task = await createWritingTask(userId, partial);
			invalidate();
			return task;
		},
		[userId, invalidate],
	);

	const updateTaskFn = useCallback(
		async (id, updates) => {
			await updateWritingTask(userId, id, updates);
			invalidate();
		},
		[userId, invalidate],
	);

	const deleteTaskFn = useCallback(
		async (id) => {
			await deleteWritingTask(userId, id);
			invalidate();
		},
		[userId, invalidate],
	);

	const moveTask = useCallback(
		async (id, status) => {
			const task = tasks.find((t) => t.id === id);
			if (!task || task.status === status) return;
			const progress =
				status === "done"
					? 100
					: status === "in-progress"
						? Math.max(task.progress, 10)
						: task.progress;
			await updateTaskFn(id, { status, progress });
		},
		[tasks, updateTaskFn],
	);

	const detachTasksFromProject = useCallback(
		async (projectId) => {
			if (!projectId) return;
			const affected = tasks.filter((t) => t.projectId === projectId);
			await Promise.all(
				affected.map((t) => updateWritingTask(userId, t.id, { projectId: null })),
			);
			invalidate();
		},
		[tasks, userId, invalidate],
	);

	return {
		tasks,
		isLoading,
		addTask,
		updateTask: updateTaskFn,
		deleteTask: deleteTaskFn,
		moveTask,
		detachTasksFromProject,
	};
}
