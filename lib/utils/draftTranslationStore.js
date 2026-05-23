/**
 * Firestore shape on draft assets:
 * translations: {
 *   [langCode]: { html: string, markdown: string, updatedAt: string }
 * }
 */

export function getDraftTranslationEntry(draft, langCode) {
	if (!draft?.translations || !langCode) return null;
	const entry = draft.translations[langCode];
	if (!entry || typeof entry !== "object") return null;
	return entry;
}

export function getDraftTranslationHtml(draft, langCode) {
	const entry = getDraftTranslationEntry(draft, langCode);
	return typeof entry?.html === "string" ? entry.html : "";
}

export function listDraftTranslationLangs(draft) {
	if (!draft?.translations || typeof draft.translations !== "object") {
		return [];
	}
	return Object.keys(draft.translations).filter(
		(k) => getDraftTranslationHtml(draft, k).trim().length > 0,
	);
}

export function mergeDraftTranslations(existing, langCode, patch) {
	const prev =
		existing && typeof existing === "object" ? { ...existing } : {};
	return {
		...prev,
		[langCode]: {
			...(prev[langCode] && typeof prev[langCode] === "object"
				? prev[langCode]
				: {}),
			...patch,
			updatedAt: new Date().toISOString(),
		},
	};
}
