import { useState, useCallback } from "react";
import { toast } from "sonner";
import { auth } from "../config/firebase";
import {
	INKGEST_AGENT_URL,
	inkgestAgentRequestHeaders,
} from "../config/agent";
import { deductCredits } from "../api/deductCredits";
import { consumeInkAgentResponse } from "../utils/consumeInkAgentSse";
import { addAssetToCanvasProject } from "../api/canvasProjects";
import { persistAgentResults } from "../utils/persistAgentExecuted";
import { buildWritingTaskAgentPrompt } from "../utils/buildWritingTaskPrompt";
import { extractUrlsFromPromptText } from "../utils/extractUrlsFromPromptText";
import { validateUrls } from "../utils/urlAllowlist";

export function useWritingTaskAiDraft({
	reduxUser,
	queryClient,
	router,
	creditRemaining,
	onLogin,
	onCreditsUsed,
	updateTask,
}) {
	const [generatingTaskId, setGeneratingTaskId] = useState(null);

	const generateFromTask = useCallback(
		async (task) => {
			if (!task?.id || generatingTaskId) return null;
			if (!reduxUser) {
				onLogin?.();
				return null;
			}
			if (creditRemaining <= 0) {
				toast.error("Not enough credits for an AI draft.");
				router?.push?.("/pricing");
				return null;
			}

			setGeneratingTaskId(task.id);

			try {
				const idToken = await auth.currentUser?.getIdToken();
				if (!idToken) throw new Error("Session expired. Please sign in again.");

				const promptStr = buildWritingTaskAgentPrompt(task);
				const urlList = extractUrlsFromPromptText(
					`${task.title || ""}\n${task.description || ""}`,
				);

				if (urlList.length > 0) {
					const urlCheck = validateUrls(urlList);
					if (!urlCheck.valid) {
						throw new Error(urlCheck.error || "Invalid URL in task");
					}
				}

				const res = await fetch(INKGEST_AGENT_URL, {
					method: "POST",
					headers: inkgestAgentRequestHeaders(reduxUser.uid),
					body: JSON.stringify({
						prompt: promptStr,
						content: promptStr,
						title: task.title,
						chatHistory: [],
						executeTasks: [
							{
								type: "blog",
								label: task.title,
								params: { prompt: promptStr, urls: urlList },
							},
						],
						idToken,
					}),
				});

				const { streamedText, finalPayload } =
					await consumeInkAgentResponse(res);

				const results = await persistAgentResults({
					uid: reduxUser.uid,
					finalPayload,
					streamedText,
					urlList,
					prompt: promptStr,
					queryClient,
				});

				if (!results.length) {
					throw new Error(
						"No draft was created. Add more detail to the task and try again.",
					);
				}

				const draft = results[0];
				deductCredits(idToken, 1);
				onCreditsUsed?.();

				if (task.projectId) {
					addAssetToCanvasProject(reduxUser.uid, task.projectId, draft.id).catch(
						(e) => console.error("[tasks] add draft to project", e),
					);
					queryClient?.invalidateQueries?.({
						queryKey: ["canvasProjects", reduxUser.uid],
					});
				}

				updateTask(task.id, {
					draftId: draft.id,
					draftPath: draft.path,
					status: task.status === "done" ? "done" : "in-progress",
					progress: Math.max(task.progress || 0, 75),
				});

				toast.success("Draft ready — open it to keep editing.", {
					action: {
						label: "Open draft",
						onClick: () => router?.push?.(draft.path),
					},
				});
				return draft;
			} catch (e) {
				const msg = e?.message || "AI draft failed";
				toast.error(msg);
				throw e;
			} finally {
				setGeneratingTaskId(null);
			}
		},
		[
			generatingTaskId,
			reduxUser,
			creditRemaining,
			onLogin,
			router,
			queryClient,
			onCreditsUsed,
			updateTask,
		],
	);

	return { generateFromTask, generatingTaskId };
}
