import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../../../lib/config/firebase";
import { requestBlogToAudio } from "../../../lib/api/blogToAudio";
import { deductCredits } from "../../../lib/api/deductCredits";
import { updateAsset } from "../../../lib/api/userAssets";
import { LLM_JOB_CREDIT } from "../../../lib/utils/translationCredits";
import {
	appendDraftSavedAudio,
	listDraftSavedAudios,
	makeDraftAudioId,
} from "../../../lib/utils/draftAudioStore";
import {
	BLOG_TO_AUDIO_DEFAULT_LANGUAGE,
	BLOG_TO_AUDIO_DEFAULT_VOICE,
	BLOG_TO_AUDIO_LANGUAGES,
} from "../../../lib/data/blogToAudioOptions";

function slugifyFilename(str) {
	return (
		String(str || "audio")
			.replace(/[^a-z0-9]+/gi, "-")
			.replace(/^-|-$/g, "")
			.toLowerCase() || "audio"
	);
}

export function useDraftBlogAudio({
	reduxUser,
	draft,
	draftId,
	docSource,
	queryClient,
	creditRemaining,
	content,
	title = "Blog audio",
}) {
	const abortRef = useRef(null);
	const [language, setLanguage] = useState(BLOG_TO_AUDIO_DEFAULT_LANGUAGE);
	const [voice, setVoice] = useState(BLOG_TO_AUDIO_DEFAULT_VOICE);
	const [generating, setGenerating] = useState(false);
	const [saving, setSaving] = useState(false);
	const [downloading, setDownloading] = useState(false);
	const [error, setError] = useState("");
	const [audioUrl, setAudioUrl] = useState(null);
	const [copiedUrl, setCopiedUrl] = useState(false);
	const [savedFlash, setSavedFlash] = useState(false);

	const hasContent = Boolean(String(content || "").trim());
	const languageLabel = useMemo(() => {
		const match = BLOG_TO_AUDIO_LANGUAGES.find((l) => l.code === language);
		return match?.name || language;
	}, [language]);

	const trackName = useMemo(() => {
		const base = title?.trim() || "Blog audio";
		return `${base} — ${languageLabel} (${voice})`;
	}, [title, languageLabel, voice]);

	const downloadFilename = useMemo(() => {
		const langSlug = slugifyFilename(languageLabel);
		const voiceSlug = slugifyFilename(voice);
		const titleSlug = slugifyFilename(title);
		return `${titleSlug}-${langSlug}-${voiceSlug}.wav`;
	}, [title, languageLabel, voice]);

	const savedAudios = useMemo(
		() => listDraftSavedAudios(draft),
		[draft?.savedAudios],
	);

	useEffect(() => {
		return () => abortRef.current?.abort();
	}, []);

	useEffect(() => {
		setAudioUrl(null);
		setError("");
		setCopiedUrl(false);
		setSavedFlash(false);
	}, [language, voice, content]);

	const handleGenerate = useCallback(async () => {
		if (!hasContent || generating) return;

		if (creditRemaining !== Infinity && creditRemaining < LLM_JOB_CREDIT) {
			setError(
				`Not enough credits (need ${LLM_JOB_CREDIT}, have ${Number(creditRemaining).toFixed(2)}).`,
			);
			return;
		}

		const user = auth.currentUser;
		if (!user) {
			setError("Sign in to generate audio.");
			return;
		}

		let idToken;
		try {
			idToken = await user.getIdToken();
		} catch {
			setError("Session expired. Please sign in again.");
			return;
		}

		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setGenerating(true);
		setError("");
		setAudioUrl(null);
		setCopiedUrl(false);
		setSavedFlash(false);

		try {
			const { url } = await requestBlogToAudio({
				content,
				language,
				voice,
				signal: controller.signal,
			});
			setAudioUrl(url);
			deductCredits(idToken, LLM_JOB_CREDIT);
			queryClient?.invalidateQueries({
				queryKey: ["credits", reduxUser?.uid],
			});
		} catch (err) {
			if (err?.name === "AbortError") return;
			setError(err?.message || "Could not generate audio");
		} finally {
			setGenerating(false);
		}
	}, [
		hasContent,
		generating,
		creditRemaining,
		content,
		language,
		voice,
		queryClient,
		reduxUser?.uid,
	]);

	const handleCopyUrl = useCallback(async (url = audioUrl) => {
		if (!url) return;
		try {
			await navigator.clipboard.writeText(url);
			setCopiedUrl(true);
			setTimeout(() => setCopiedUrl(false), 2200);
		} catch {
			setError("Could not copy URL");
		}
	}, [audioUrl]);

	const handleDownload = useCallback(
		async (url = audioUrl, filename = downloadFilename) => {
			if (!url || downloading) return;
			setDownloading(true);
			try {
				const res = await fetch(url);
				const blob = await res.blob();
				const blobUrl = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = blobUrl;
				a.download = filename;
				a.click();
				URL.revokeObjectURL(blobUrl);
			} catch {
				const a = document.createElement("a");
				a.href = url;
				a.download = filename;
				a.target = "_blank";
				a.rel = "noopener noreferrer";
				a.click();
			} finally {
				setDownloading(false);
			}
		},
		[audioUrl, downloadFilename, downloading],
	);

	const handleSave = useCallback(async () => {
		if (!audioUrl || !draftId || !reduxUser?.uid) {
			setError(audioUrl ? "Draft not ready to save." : "Generate audio first.");
			return;
		}

		setSaving(true);
		setError("");
		setSavedFlash(false);

		try {
			const id = makeDraftAudioId();
			const entry = {
				id,
				url: audioUrl,
				language,
				languageName: languageLabel,
				voice,
				title: trackName,
				createdAt: new Date().toISOString(),
			};
			const savedAudiosMap = appendDraftSavedAudio(draft?.savedAudios, entry);

			await updateAsset(
				reduxUser.uid,
				draftId,
				{ savedAudios: savedAudiosMap },
				docSource || "assets",
			);

			queryClient?.invalidateQueries({ queryKey: ["doc"] });
			queryClient?.invalidateQueries({
				queryKey: ["assets", reduxUser.uid],
			});

			setSavedFlash(true);
			setTimeout(() => setSavedFlash(false), 2200);
		} catch (err) {
			setError(err?.message || "Could not save audio");
		} finally {
			setSaving(false);
		}
	}, [
		audioUrl,
		draftId,
		reduxUser?.uid,
		language,
		languageLabel,
		voice,
		trackName,
		draft?.savedAudios,
		docSource,
		queryClient,
	]);

	return {
		language,
		setLanguage,
		voice,
		setVoice,
		generating,
		saving,
		downloading,
		error,
		audioUrl,
		copiedUrl,
		savedFlash,
		hasContent,
		languageLabel,
		trackName,
		downloadFilename,
		savedAudios,
		creditCost: LLM_JOB_CREDIT,
		handleGenerate,
		handleCopyUrl,
		handleDownload,
		handleSave,
	};
}
