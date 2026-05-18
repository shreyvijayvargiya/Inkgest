import { useState, useCallback, useRef, useMemo } from "react";
import { auth } from "../config/firebase";
import {
	INKGEST_AGENT_URL,
	inkgestAgentRequestHeaders,
} from "../config/agent";
import { deductCredits } from "../api/deductCredits";
import {
	extractUrlsFromPromptText,
	removeUrlOccurrences,
} from "../utils/extractUrlsFromPromptText";
import { validateUrls } from "../utils/urlAllowlist";
import { consumeInkAgentResponse } from "../utils/consumeInkAgentSse";
import { persistAgentResults } from "../utils/persistAgentExecuted";

function mergeUrlProgress(prev, parsed) {
	if (!prev.length) return prev;
	const url =
		parsed.url ||
		parsed.href ||
		parsed.sourceUrl ||
		parsed.source?.url ||
		(parsed.params &&
			typeof parsed.params === "object" &&
			parsed.params.url);

	const stage =
		parsed.stage ||
		parsed.phase ||
		parsed.status ||
		(typeof parsed.state === "string" ? parsed.state : null);

	const doneHints =
		parsed.type === "scrape_done" ||
		parsed.type === "url_done" ||
		parsed.scrapeComplete === true ||
		stage === "done" ||
		stage === "complete";

	const errHints =
		parsed.type === "error" ||
		Boolean(parsed.error) ||
		stage === "error" ||
		parsed.failed === true;

	const idx =
		typeof url === "string" && url
			? prev.findIndex((x) => x.url === url)
			: -1;

	if (idx < 0) return prev;

	const next = prev.map((r) => ({ ...r }));
	let status = next[idx].status;
	if (errHints) status = "error";
	else if (doneHints) status = "done";
	else if (
		stage === "scraping" ||
		stage === "pending" ||
		parsed.type === "scrape_start"
	)
		status = "scraping";

	next[idx] = { ...next[idx], status };
	return next;
}

/**
 * Direct POST to INKGEST_AGENT_URL — SSE or JSON — persist executed tasks / streamed markdown.
 */
export function useInkgestAgentAssetGenerate({
	reduxUser,
	queryClient,
	router,
	creditRemaining,
	onLogin,
}) {
	const [combinedPrompt, setCombinedPrompt] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [streamedPreview, setStreamedPreview] = useState("");
	const [completedTasks, setCompletedTasks] = useState([]);
	const [lastRunSnippet, setLastRunSnippet] = useState("");
	const [urlProgress, setUrlProgress] = useState([]);
	const abortRef = useRef(null);

	const extractedUrls = useMemo(
		() => extractUrlsFromPromptText(combinedPrompt),
		[combinedPrompt],
	);

	const urlsValidity = useMemo(
		() =>
			extractedUrls.length === 0
				? { valid: true }
				: validateUrls(extractedUrls),
		[extractedUrls],
	);

	const removeChipUrl = useCallback((url) => {
		setCombinedPrompt((prev) => removeUrlOccurrences(prev, url));
	}, []);

	const canSubmit =
		!loading &&
		combinedPrompt.trim().length > 0 &&
		urlsValidity.valid;

	const cancel = useCallback(() => {
		abortRef.current?.abort();
	}, []);

	const handleGenerate = useCallback(async () => {
		const promptStr = combinedPrompt.trim();
		if (!promptStr || loading) return;
		if (!reduxUser) {
			onLogin?.();
			return;
		}
		if (creditRemaining <= 0) {
			router.push("/pricing");
			return;
		}
		if (!urlsValidity.valid) {
			setError(urlsValidity.error || "Invalid URL");
			return;
		}

		setLoading(true);
		setError(null);
		setCompletedTasks([]);
		setStreamedPreview("");
		setLastRunSnippet(promptStr.slice(0, 200));

		const urlsSnapshot = [...extractedUrls];
		setUrlProgress(
			urlsSnapshot.length > 0
				? urlsSnapshot.map((url) => ({ url, status: "scraping" }))
				: [],
		);

		const ac = new AbortController();
		abortRef.current = ac;

		try {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Session expired. Please sign in again.");

			const res = await fetch(INKGEST_AGENT_URL, {
				method: "POST",
				headers: inkgestAgentRequestHeaders(reduxUser.uid),
				body: JSON.stringify({
					prompt: promptStr,
					content: promptStr,
					idToken,
				}),
				signal: ac.signal,
			});

			const { streamedText, finalPayload } = await consumeInkAgentResponse(
				res,
				{
					signal: ac.signal,
					onStreamText: (full) => setStreamedPreview(full),
					onPayload: (parsed) => {
						setUrlProgress((prev) => {
							if (!prev.length) return prev;
							return mergeUrlProgress(prev, parsed);
						});
					},
				},
			);

			setUrlProgress((prev) =>
				prev.map((row) =>
					row.status === "scraping" ? { ...row, status: "done" } : row,
				),
			);

			const tasks = await persistAgentResults({
				uid: reduxUser.uid,
				finalPayload,
				streamedText,
				urlList: urlsSnapshot,
				prompt: promptStr,
				queryClient: queryClient || null,
			});

			setCompletedTasks(tasks);

			const creditsUsed =
				typeof finalPayload?.creditsUsed === "number" &&
				finalPayload.creditsUsed > 0
					? finalPayload.creditsUsed
					: tasks.length > 0
						? 1
						: 0;
			if (creditsUsed > 0) deductCredits(idToken, creditsUsed);
		} catch (e) {
			const aborted =
				e?.name === "AbortError" ||
				e?.code === "ABORT_ERR" ||
				/abort/i.test(e?.message || "");
			setUrlProgress((prev) =>
				prev.map((row) =>
					row.status === "scraping"
						? { ...row, status: aborted ? "skipped" : "error" }
						: row,
				),
			);
			if (!aborted) setError(e?.message || "Agent request failed");
		} finally {
			abortRef.current = null;
			setLoading(false);
		}
	}, [
		combinedPrompt,
		loading,
		reduxUser,
		creditRemaining,
		router,
		queryClient,
		onLogin,
		extractedUrls,
		urlsValidity.valid,
		urlsValidity.error,
	]);

	return {
		combinedPrompt,
		setCombinedPrompt,
		extractedUrls,
		removeChipUrl,
		loading,
		error,
		setError,
		streamedPreview,
		completedTasks,
		urlProgress,
		lastRunSnippet,
		canSubmit,
		handleGenerate,
		cancel,
	};
}
