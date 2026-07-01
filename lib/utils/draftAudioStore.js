/**
 * Firestore shape on draft assets:
 * savedAudios: {
 *   [id]: {
 *     url, language, languageName, voice, title, createdAt
 *   }
 * }
 */

export function listDraftSavedAudios(draft) {
	const raw = draft?.savedAudios;
	if (!raw || typeof raw !== "object") return [];
	return Object.values(raw)
		.filter((entry) => entry && typeof entry.url === "string" && entry.url.trim())
		.sort(
			(a, b) =>
				new Date(b.createdAt || 0).getTime() -
				new Date(a.createdAt || 0).getTime(),
		);
}

export function appendDraftSavedAudio(existing, entry) {
	const prev = existing && typeof existing === "object" ? { ...existing } : {};
	return {
		...prev,
		[entry.id]: {
			...entry,
			createdAt: entry.createdAt || new Date().toISOString(),
		},
	};
}

export function makeDraftAudioId() {
	return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
