import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../../../lib/config/firebase";
import { requestTranslate } from "../../../lib/api/translateClient";
import { deductCredits } from "../../../lib/api/deductCredits";
import { updateAsset } from "../../../lib/api/userAssets";
import { htmlToMarkdown } from "../../../lib/utils/htmlToMarkdown";
import { FREE_CREDIT_LIMIT } from "../../../lib/utils/credits";
import { LLM_JOB_CREDIT } from "../../../lib/utils/translationCredits";
import {
	getDraftTranslationHtml,
	listDraftTranslationLangs,
	mergeDraftTranslations,
} from "../../../lib/utils/draftTranslationStore";
import {
	isSourceLanguage,
	languageCodeToApiLabel,
} from "../../../lib/utils/translateLanguage";
import { stripDraftSlashQueryFromHtmlString } from "../draftPageLib";

/**
 * Draft theme-preview translation: API call, credits, Firestore cache by language.
 */
export function useDraftTranslation({
	reduxUser,
	draft,
	draftId,
	docSource,
	editorRef,
	formatBody,
	translationLang,
	setTranslationLang,
	translatedHTML,
	setTranslatedHTML,
	themeDrawerOpen,
	queryClient,
	creditRemaining = FREE_CREDIT_LIMIT,
}) {
	const [translating, setTranslating] = useState(false);
	const [savingTranslation, setSavingTranslation] = useState(false);
	const [translationError, setTranslationError] = useState("");
	const [translationSaved, setTranslationSaved] = useState(false);
	const lastMarkdownRef = useRef("");
	const abortRef = useRef(null);

	const savedLangs = useMemo(
		() => listDraftTranslationLangs(draft),
		[draft?.translations],
	);

	const getSourceHtml = useCallback(() => {
		return stripDraftSlashQueryFromHtmlString(
			editorRef.current?.innerHTML || draft?.body || "",
		);
	}, [editorRef, draft?.body]);

	const getSourceMarkdown = useCallback(() => {
		const html = getSourceHtml();
		return html.trim() ? htmlToMarkdown(html) || "" : "";
	}, [getSourceHtml]);

	const creditEstimate = LLM_JOB_CREDIT;

	/** When language changes, load cached Firestore translation or clear for source. */
	useEffect(() => {
		if (!themeDrawerOpen) return;
		if (isSourceLanguage(translationLang)) {
			setTranslatedHTML("");
			setTranslationError("");
			return;
		}
		const cached = getDraftTranslationHtml(draft, translationLang);
		setTranslatedHTML(cached.trim() ? cached : "");
		setTranslationError("");
	}, [
		themeDrawerOpen,
		translationLang,
		draft?.translations,
		draft?.id,
		setTranslatedHTML,
	]);

	const handleShowOriginal = useCallback(() => {
		setTranslationLang("en");
		setTranslatedHTML("");
		setTranslationError("");
	}, [setTranslationLang, setTranslatedHTML]);

	const handleTranslate = useCallback(async () => {
		if (isSourceLanguage(translationLang)) {
			setTranslationError("Choose a target language other than English.");
			return;
		}
		const markdown = getSourceMarkdown();
		if (!markdown.trim()) {
			setTranslationError("Write some content in the editor before translating.");
			return;
		}

		if (creditRemaining !== Infinity && creditRemaining < LLM_JOB_CREDIT) {
			setTranslationError(
				`Not enough credits (need ${LLM_JOB_CREDIT}, have ${Number(creditRemaining).toFixed(2)}).`,
			);
			return;
		}

		const user = auth.currentUser;
		if (!user) {
			setTranslationError("Sign in to translate content.");
			return;
		}

		let idToken;
		try {
			idToken = await user.getIdToken();
		} catch {
			setTranslationError("Session expired. Please sign in again.");
			return;
		}

		abortRef.current?.abort();
		const ac = new AbortController();
		abortRef.current = ac;

		setTranslating(true);
		setTranslationError("");
		setTranslationSaved(false);

		try {
			const apiLang = languageCodeToApiLabel(translationLang);
			const { markdown: translatedMd, truncatedInput } =
				await requestTranslate({
					idToken,
					markdown,
					language: apiLang,
					signal: ac.signal,
				});

			lastMarkdownRef.current = translatedMd;
			const html = formatBody(translatedMd);
			setTranslatedHTML(html);

			deductCredits(idToken, LLM_JOB_CREDIT);
			queryClient?.invalidateQueries({
				queryKey: ["credits", reduxUser?.uid],
			});

			if (truncatedInput) {
				setTranslationError(
					"Content was truncated for translation due to length limits.",
				);
			}
		} catch (err) {
			if (err?.name === "AbortError") return;
			setTranslationError(err?.message || "Translation failed");
		} finally {
			setTranslating(false);
		}
	}, [
		translationLang,
		getSourceMarkdown,
		creditRemaining,
		formatBody,
		setTranslatedHTML,
		reduxUser?.uid,
		queryClient,
	]);

	const handleSaveTranslation = useCallback(async () => {
		if (!draftId || !reduxUser?.uid || isSourceLanguage(translationLang)) {
			return;
		}
		const html = translatedHTML?.trim();
		if (!html) {
			setTranslationError("Translate first, then save.");
			return;
		}

		setSavingTranslation(true);
		setTranslationError("");
		setTranslationSaved(false);

		try {
			const markdown =
				lastMarkdownRef.current ||
				(html.trim() ? htmlToMarkdown(html) : "");
			const translations = mergeDraftTranslations(
				draft?.translations,
				translationLang,
				{ html, markdown },
			);

			await updateAsset(
				reduxUser.uid,
				draftId,
				{ translations },
				docSource || "assets",
			);

			queryClient?.invalidateQueries({ queryKey: ["doc"] });
			queryClient?.invalidateQueries({
				queryKey: ["assets", reduxUser.uid],
			});

			setTranslationSaved(true);
			setTimeout(() => setTranslationSaved(false), 2200);
		} catch (err) {
			setTranslationError(err?.message || "Could not save translation");
		} finally {
			setSavingTranslation(false);
		}
	}, [
		draftId,
		reduxUser?.uid,
		translationLang,
		translatedHTML,
		draft?.translations,
		docSource,
		queryClient,
	]);

	useEffect(() => {
		return () => abortRef.current?.abort();
	}, []);

	return {
		translating,
		savingTranslation,
		translationError,
		translationSaved,
		savedLangs,
		creditEstimate,
		handleTranslate,
		handleSaveTranslation,
		handleShowOriginal,
	};
}
