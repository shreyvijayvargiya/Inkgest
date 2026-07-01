import { getInkgestGenerateBackendBase } from "../config/generate";

/**
 * POST Hono /generate/translate — markdown in, translated markdown out.
 * @param {{ idToken: string, markdown: string, language: string, signal?: AbortSignal }} params
 */
export async function requestTranslate({ idToken, markdown, language, signal }) {
	const base = getInkgestGenerateBackendBase();
	const res = await fetch(`${base}/generate/translate`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${idToken}`,
		},
		body: JSON.stringify({
			markdown: String(markdown || ""),
			language: String(language || "").trim(),
		}),
		signal,
	});

	const data = await res.json().catch(() => ({}));

	if (!res.ok) {
		const msg =
			data.error ||
			data.message ||
			(res.status === 429
				? `Rate limit exceeded. Retry in ${data.retryAfter ?? "?"}s`
				: `Translation failed (${res.status})`);
		const err = new Error(msg);
		err.status = res.status;
		err.code = data.code;
		throw err;
	}

	if (!data.success || !data.markdown) {
		throw new Error(data.error || "Translation returned empty content");
	}

	return {
		markdown: String(data.markdown),
		language: data.language,
		truncatedInput: Boolean(data.truncatedInput),
		inputChars: data.inputChars,
		usage: data.usage,
	};
}
