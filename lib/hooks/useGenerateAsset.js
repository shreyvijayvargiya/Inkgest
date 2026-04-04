import { useState, useRef, useEffect, useCallback } from "react";
import { auth } from "../config/firebase";
import { deductCredits } from "../api/deductCredits";
import { persistGenerateResponse } from "../utils/persistGenerateResponse";
import { requestGenerate } from "../api/generateClient";

function normalizeUrls(list) {
	return (Array.isArray(list) ? list : [])
		.map((u) => (typeof u === "string" ? u.trim() : ""))
		.filter((u) => /^https?:\/\//i.test(u));
}

/**
 * Simulated streaming when the API returns one JSON blob (non-SSE).
 */
function useStreamDisplay(fullText, enabled) {
	const [display, setDisplay] = useState("");
	useEffect(() => {
		if (!enabled || !fullText) {
			setDisplay("");
			return;
		}
		let i = 0;
		const len = fullText.length;
		const step = Math.max(2, Math.ceil(len / 120));
		const id = setInterval(() => {
			i += step;
			if (i >= len) {
				setDisplay(fullText);
				clearInterval(id);
			} else {
				setDisplay(fullText.slice(0, i));
			}
		}, 18);
		return () => clearInterval(id);
	}, [fullText, enabled]);
	return display;
}

export function useGenerateAsset({
	reduxUser,
	router,
	queryClient,
	assetType,
	format,
	style,
	urlInputs,
	setUrlInputs,
	prompt,
	onLogin,
	creditRemaining,
}) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [completedTasks, setCompletedTasks] = useState([]);
	const [lastRunPrompt, setLastRunPrompt] = useState("");
	const [lastRunType, setLastRunType] = useState("");
	const [rawContent, setRawContent] = useState("");
	const [streamEnabled, setStreamEnabled] = useState(false);
	const [serverStream, setServerStream] = useState(false);
	const pendingAfterLoginRef = useRef(false);
	const abortRef = useRef(null);
	const runGenerateRef = useRef(() => {});
	const usedLiveStreamRef = useRef(false);

	const fakeStreamed = useStreamDisplay(
		rawContent,
		streamEnabled && !loading && !serverStream,
	);
	const streamed = serverStream ? rawContent : fakeStreamed;

	const canSubmit =
		(normalizeUrls(urlInputs).length > 0 || prompt.trim().length > 0) &&
		!loading;

	const addUrlField = useCallback(() => {
		setUrlInputs((prev) => [...prev, ""]);
	}, [setUrlInputs]);

	const setUrlAt = useCallback(
		(i, v) => {
			setUrlInputs((prev) => {
				const next = [...prev];
				next[i] = v;
				return next;
			});
		},
		[setUrlInputs],
	);

	const removeUrlAt = useCallback(
		(i) => {
			setUrlInputs((prev) => prev.filter((_, j) => j !== i));
		},
		[setUrlInputs],
	);

	const runGenerate = useCallback(async () => {
		const urls = normalizeUrls(urlInputs);
		const promptStr = prompt.trim();
		if (!urls.length && !promptStr) return;
		if (!reduxUser) return;
		if (creditRemaining <= 0) {
			router.push("/pricing");
			return;
		}

		setLoading(true);
		setError(null);
		setCompletedTasks([]);
		setRawContent("");
		setStreamEnabled(false);
		setServerStream(false);
		usedLiveStreamRef.current = false;
		setLastRunPrompt(promptStr);
		setLastRunType(assetType);

		const ac = new AbortController();
		abortRef.current = ac;

		try {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Session expired. Please sign in again.");

			const { data, streamedText } = await requestGenerate({
				type: assetType,
				idToken,
				urls,
				prompt: promptStr,
				format,
				style,
				signal: ac.signal,
				onStreamText: (full) => {
					usedLiveStreamRef.current = true;
					setServerStream(true);
					setRawContent(full);
					setStreamEnabled(true);
				},
			});

			const text =
				streamedText ||
				(typeof data.content === "string"
					? data.content
					: typeof data.result?.content === "string"
						? data.result.content
						: "");

			const nonStreamTypes = new Set([
				"table",
				"infographics",
				"infographics-svg-generator",
				"image-gallery",
				"landing-page",
			]);
			if (
				text &&
				!nonStreamTypes.has(assetType) &&
				!usedLiveStreamRef.current
			) {
				setRawContent(text);
				setStreamEnabled(true);
			}

			const tasks = await persistGenerateResponse({
				uid: reduxUser.uid,
				generateType: assetType,
				data,
				prompt: promptStr,
				urlList: urls,
				format,
				queryClient: queryClient || null,
			});

			setCompletedTasks(tasks);
			if (tasks.length > 0) {
				deductCredits(idToken, 1);
				if (reduxUser?.uid && queryClient) {
					queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
				}
			}
		} catch (e) {
			const aborted =
				e?.name === "AbortError" ||
				e?.code === "ABORT_ERR" ||
				/abort/i.test(e?.message || "");
			if (!aborted) setError(e?.message || "Something went wrong");
		} finally {
			abortRef.current = null;
			setLoading(false);
		}
	}, [
		urlInputs,
		prompt,
		reduxUser,
		creditRemaining,
		router,
		queryClient,
		assetType,
		format,
		style,
	]);

	runGenerateRef.current = runGenerate;

	const handleGenerate = useCallback(() => {
		if (loading) return;
		if (!reduxUser) {
			pendingAfterLoginRef.current = true;
			onLogin?.();
			return;
		}
		const urls = normalizeUrls(urlInputs);
		const promptStr = prompt.trim();
		if (!urls.length && !promptStr) return;
		runGenerate();
	}, [loading, reduxUser, onLogin, urlInputs, prompt, runGenerate]);

	useEffect(() => {
		if (!reduxUser || !pendingAfterLoginRef.current) return;
		pendingAfterLoginRef.current = false;
		runGenerateRef.current();
	}, [reduxUser]);

	const cancel = useCallback(() => {
		abortRef.current?.abort();
	}, []);

	return {
		loading,
		error,
		setError,
		completedTasks,
		lastRunPrompt,
		lastRunType,
		streamed,
		streamEnabled,
		rawContent,
		canSubmit,
		addUrlField,
		setUrlAt,
		removeUrlAt,
		handleGenerate,
		cancel,
		runGenerate,
	};
}
