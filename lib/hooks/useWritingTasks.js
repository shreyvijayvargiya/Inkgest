import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	loadWritingTasks,
	saveWritingTasks,
	makeWritingTask,
} from "../utils/writingTasksStore";

export function useWritingTasks(userId) {
	const storageKey = userId || "guest";
	const queryKey = ["writingTasks", storageKey];
	const queryClient = useQueryClient();

	const { data: tasks = [], isLoading } = useQuery({
		queryKey,
		queryFn: () => loadWritingTasks(userId),
		staleTime: Infinity,
	});

	const persist = useCallback(
		(next) => {
			saveWritingTasks(userId, next);
			queryClient.setQueryData(queryKey, next);
		},
		[userId, queryClient, queryKey],
	);

	const addTask = useCallback(
		(partial) => {
			const task = makeWritingTask(partial);
			persist([task, ...tasks]);
			return task;
		},
		[tasks, persist],
	);

	const updateTask = useCallback(
		(id, updates) => {
			persist(
				tasks.map((t) =>
					t.id === id
						? { ...t, ...updates, updatedAt: new Date().toISOString() }
						: t,
				),
			);
		},
		[tasks, persist],
	);

	const deleteTask = useCallback(
		(id) => {
			persist(tasks.filter((t) => t.id !== id));
		},
		[tasks, persist],
	);

	const moveTask = useCallback(
		(id, status) => {
			const task = tasks.find((t) => t.id === id);
			if (!task || task.status === status) return;
			const progress =
				status === "done" ? 100 : status === "in-progress" ? Math.max(task.progress, 10) : task.progress;
			updateTask(id, { status, progress });
		},
		[tasks, updateTask],
	);

	return {
		tasks,
		isLoading,
		addTask,
		updateTask,
		deleteTask,
		moveTask,
	};
}
