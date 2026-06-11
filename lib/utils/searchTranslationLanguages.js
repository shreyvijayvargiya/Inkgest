import Fuse from "fuse.js";

/** UI + API aliases for fuzzy language search */
const LANGUAGE_SEARCH_ALIASES = {
	en: "english original source",
	es: "spanish español esp",
	fr: "french français",
	de: "german deutsch",
	pt: "portuguese português brazil",
	it: "italian italiano",
	zh: "chinese mandarin 中文",
	ja: "japanese 日本語 nippon",
	ko: "korean 한국어 hangul",
	ar: "arabic العربية",
	hi: "hindi हिन्दी",
	ru: "russian русский",
	nl: "dutch nederlands",
	sv: "swedish svenska",
	tr: "turkish türkçe",
	pl: "polish polski",
	id: "indonesian bahasa",
	vi: "vietnamese tiếng việt",
};

/**
 * @param {Array<{ code: string, label: string, flag?: string }>} languages
 * @returns {Array<{ value: string, label: string, searchText: string }>}
 */
export function buildTranslationLanguageOptions(languages = []) {
	const base = [
		{
			value: "en",
			label: "Original (English)",
			searchText: "original english source en",
		},
	];
	const rest = languages.map((l) => ({
		value: l.code,
		label: `${l.flag || ""} ${l.label}`.trim(),
		searchText: `${l.label} ${l.code} ${LANGUAGE_SEARCH_ALIASES[l.code] || ""}`.trim(),
	}));
	return [...base, ...rest];
}

/**
 * @param {Array<{ value: string, label: string, searchText?: string }>} options
 * @param {string} query
 */
export function searchTranslationLanguagesWithFuse(options = [], query = "") {
	const q = String(query || "").trim();
	if (!q) return options;
	if (!options.length) return [];

	const fuse = new Fuse(options, {
		keys: [
			{ name: "label", weight: 0.5 },
			{ name: "searchText", weight: 0.35 },
			{ name: "value", weight: 0.15 },
		],
		threshold: 0.38,
		ignoreLocation: true,
	});

	return fuse.search(q).map((r) => r.item);
}
