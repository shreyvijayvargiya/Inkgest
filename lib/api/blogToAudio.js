import { getInkgestGenerateBackendBase } from "../config/generate";

/**
 * POST /blog-to-audio — convert blog text to speech.
 * language + voice (alloy, nova, …).
 */
export async function requestBlogToAudio({
	content,
	language = "en",
	voice = "alloy",
	signal,
}) {
	const text = String(content || "").trim();
	if (!text) {
		throw new Error("No content to convert to audio");
	}

	const base = getInkgestGenerateBackendBase();
	const res = await fetch(`${base}/blog-to-audio`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			content: text,
			language,
			voice,
		}),
		signal,
	});

	const data = await res.json().catch(() => ({}));
	if (!res.ok || data.success === false) {
		throw new Error(
			data.error || data.message || `Audio generation failed (${res.status})`,
		);
	}

	const url =
		data.url ||
		data.audioUrl ||
		data.audio ||
		data.fileUrl ||
		data.data?.url;
	if (!url || typeof url !== "string") {
		throw new Error("No audio URL returned from server");
	}

	return { url, raw: data };
}
