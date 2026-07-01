const CODE_TO_API = {
	en: "english",
	es: "spanish",
	fr: "french",
	de: "german",
	pt: "portuguese",
	it: "italian",
	zh: "chinese",
	ja: "japanese",
	ko: "korean",
	ar: "arabic",
	hi: "hindi",
	ru: "russian",
	nl: "dutch",
	sv: "swedish",
	tr: "turkish",
	pl: "polish",
	id: "indonesian",
	vi: "vietnamese",
};

export function languageCodeToApiLabel(code) {
	if (!code || code === "en") return "english";
	const c = String(code).toLowerCase().trim();
	return CODE_TO_API[c] || c;
}

export function isSourceLanguage(code) {
	return !code || code === "en";
}

/** Normalize ISO code or API label (spanish → es) for Firestore translation keys. */
export function normalizeTranslationLangCode(input) {
	const raw = String(input || "").trim().toLowerCase();
	if (!raw || raw === "en" || raw === "english") return null;
	if (CODE_TO_API[raw]) return raw;
	const fromApi = Object.entries(CODE_TO_API).find(([, api]) => api === raw)?.[0];
	if (fromApi) return fromApi;
	return raw;
}

const CODE_TO_DISPLAY = {
	en: "English",
	es: "Spanish",
	fr: "French",
	de: "German",
	pt: "Portuguese",
	it: "Italian",
	zh: "Chinese",
	ja: "Japanese",
	ko: "Korean",
	ar: "Arabic",
	hi: "Hindi",
	ru: "Russian",
	nl: "Dutch",
	sv: "Swedish",
	tr: "Turkish",
	pl: "Polish",
	id: "Indonesian",
	vi: "Vietnamese",
};

/** Human label for ISO code or API language name (spanish → Spanish). */
export function resolveTranslationLanguageLabel(codeOrApi) {
	const raw = String(codeOrApi || "").trim().toLowerCase();
	if (!raw) return "Translation";
	if (CODE_TO_DISPLAY[raw]) return CODE_TO_DISPLAY[raw];
	if (CODE_TO_API[raw]) {
		const viaCode = Object.entries(CODE_TO_API).find(([, api]) => api === raw)?.[0];
		if (viaCode && CODE_TO_DISPLAY[viaCode]) return CODE_TO_DISPLAY[viaCode];
	}
	return raw.charAt(0).toUpperCase() + raw.slice(1);
}
