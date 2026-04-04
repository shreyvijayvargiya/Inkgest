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

const MAX_VARIANTS = 5;

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
	variantCount = 1,
}) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [completedTasks, setCompletedTasks] = useState([]);
	const [lastRunPrompt, setLastRunPrompt] = useState("");
	const [lastRunType, setLastRunType] = useState("");
	const [rawContent, setRawContent] = useState("");
	const [streamEnabled, setStreamEnabled] = useState(false);
	const [serverStream, setServerStream] = useState(false);
	/** Multi-copy (2–5): one entry per slot with stream + tasks */
	const [slotOutputs, setSlotOutputs] = useState(null);
	const pendingAfterLoginRef = useRef(false);
	const abortRef = useRef(null);
	const runGenerateRef = useRef(() => {});
	const usedLiveStreamRef = useRef(false);
	const batchAbortedRef = useRef(false);

	const fakeStreamed = useStreamDisplay(
		rawContent,
		streamEnabled && !loading && !serverStream,
	);
	const streamed = serverStream ? rawContent : fakeStreamed;

	const copies = Math.min(
		MAX_VARIANTS,
		Math.max(1, Number(variantCount) || 1),
	);

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

	const nonStreamTypes = new Set([
		"table",
		"infographics",
		"infographics-svg-generator",
		"image-gallery",
		"landing-page",
	]);

	const runGenerate = useCallback(async () => {
		const urls = normalizeUrls(urlInputs);
		const promptStr = prompt.trim();
		if (!urls.length && !promptStr) return;
		if (!reduxUser) return;
		if (creditRemaining <= 0) {
			router.push("/pricing");
			return;
		}

		const n = Math.min(MAX_VARIANTS, Math.max(1, Number(variantCount) || 1));
		if (creditRemaining !== Infinity && creditRemaining < n) {
			setError(
				`You need at least ${n} credit${n === 1 ? "" : "s"} for ${n} copies. Upgrade or reduce the count.`,
			);
			return;
		}

		setLoading(true);
		setError(null);
		setCompletedTasks([]);
		setSlotOutputs(null);
		setRawContent("");
		setStreamEnabled(false);
		setServerStream(false);
		usedLiveStreamRef.current = false;
		setLastRunPrompt(promptStr);
		setLastRunType(assetType);
		batchAbortedRef.current = false;

		const runOne = async (slotIndex, total) => {
			const ac = new AbortController();
			abortRef.current = ac;
			usedLiveStreamRef.current = false;

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
					if (total > 1) {
						setSlotOutputs((prev) => {
							const next = prev ? [...prev] : [];
							next[slotIndex] = {
								...next[slotIndex],
								streamed: full,
								serverStream: true,
								streamEnabled: true,
								loading: true,
							};
							return next;
						});
					} else {
						setServerStream(true);
						setRawContent(full);
						setStreamEnabled(true);
					}
				},
			});

			const text =
				streamedText ||
				(typeof data.content === "string"
					? data.content
					: typeof data.result?.content === "string"
						? data.result.content
						: "");

			if (
				text &&
				!nonStreamTypes.has(assetType) &&
				!usedLiveStreamRef.current
			) {
				if (total > 1) {
					setSlotOutputs((prev) => {
						const next = prev ? [...prev] : [];
						next[slotIndex] = {
							...next[slotIndex],
							streamed: text,
							serverStream: false,
							streamEnabled: true,
							loading: true,
						};
						return next;
					});
				} else {
					setRawContent(text);
					setStreamEnabled(true);
				}
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

			if (total > 1) {
				setSlotOutputs((prev) => {
					const next = prev ? [...prev] : [];
					next[slotIndex] = {
						slot: slotIndex + 1,
						streamed: next[slotIndex]?.streamed ?? text ?? "",
						serverStream: Boolean(next[slotIndex]?.serverStream),
						streamEnabled: true,
						completedTasks: tasks,
						loading: false,
						error: null,
					};
					return next;
				});
			} else {
				setCompletedTasks(tasks);
			}

			if (tasks.length > 0) {
				deductCredits(idToken, 1);
				if (reduxUser?.uid && queryClient) {
					queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
				}
			}

			return tasks;
		};

		try {
			if (n === 1) {
				await runOne(0, 1);
			} else {
				setSlotOutputs(
					Array.from({ length: n }, (_, i) => ({
						slot: i + 1,
						streamed: "",
						serverStream: false,
						streamEnabled: false,
						completedTasks: [],
						loading: true,
						error: null,
					})),
				);
				for (let i = 0; i < n; i++) {
					if (batchAbortedRef.current) break;
					try {
						await runOne(i, n);
					} catch (err) {
						const aborted =
							err?.name === "AbortError" ||
							err?.code === "ABORT_ERR" ||
							/abort/i.test(err?.message || "");
						setSlotOutputs((prev) => {
							if (!prev) return prev;
							return prev.map((slot, j) => {
								if (j < i) return slot;
								if (j === i) {
									return {
										...slot,
										loading: false,
										error: aborted
											? "Stopped"
											: err?.message || "Generation failed",
									};
								}
								if (aborted) {
									return {
										...slot,
										loading: false,
										error: "Skipped",
									};
								}
								return slot;
							});
						});
						if (aborted) break;
					}
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
		variantCount,
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
		batchAbortedRef.current = true;
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
		slotOutputs,
		copies,
		canSubmit,
		addUrlField,
		setUrlAt,
		removeUrlAt,
		handleGenerate,
		cancel,
		runGenerate,
	};
}
