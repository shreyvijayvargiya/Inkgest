/** Flat credit cost per AI translation or text-to-audio job. */
export const LLM_JOB_CREDIT = 1;

/** @deprecated Word-based pricing — use LLM_JOB_CREDIT for translation/audio jobs. */
export const TRANSLATION_WORDS_PER_CREDIT = 1000;
/** @deprecated */
export const TRANSLATION_MIN_CREDITS = 0.25;

export function countWordsInText(text = "") {
	const t = String(text || "").trim();
	if (!t) return 0;
	return t.split(/\s+/).filter(Boolean).length;
}

/**
 * @param {number} wordCount
 * @returns {number} Credits to deduct (e.g. 500 words → 0.5)
 */
export function creditsForTranslationWords(wordCount) {
	const words = Math.max(0, Number(wordCount) || 0);
	if (words === 0) return TRANSLATION_MIN_CREDITS;
	const raw = words / TRANSLATION_WORDS_PER_CREDIT;
	return Math.max(TRANSLATION_MIN_CREDITS, Math.round(raw * 100) / 100);
}
