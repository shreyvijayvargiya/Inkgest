/**
 * Maps UI / legacy skill ids to POST /generate/:type path segments (Hono-supported names).
 * See backend allowlist: blog, landing-page, image-gallery, infographics, etc.
 */
export function toGeneratePathType(type) {
	const m = {
		"landing-page-generator": "landing-page",
		"image-gallery-creator": "image-gallery",
		"infographics-svg-generator": "infographics",
		landing: "landing-page",
		gallery: "image-gallery",
	};
	return m[type] ?? type;
}

/**
 * Same mapping for persist logic (branch on canonical path type).
 */
export function normalizePersistGenerateType(type) {
	return toGeneratePathType(type);
}

/**
 * POST /api/generate/:type (Next.js proxy → Hono /generate/:type). Body includes idToken like /api/scrape/url.
 * Supports streaming (text/event-stream) or a single JSON body.
 *
 * SSE: expects `data: {json}` lines. Text deltas: `content` | `delta` | `text` | `chunk`.
 * Final payload: event with `success: true` or `type: "end"` carrying full fields for persist.
 */
export async function requestGenerate({
	type,
	idToken,
	urls,
	prompt,
	format = "substack",
	style = "casual",
	signal,
	onStreamText,
}) {
	const pathType = toGeneratePathType(type);
	const url = `/api/generate/${encodeURIComponent(pathType)}`;

	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			idToken,
			urls: Array.isArray(urls) ? urls : [],
			prompt: String(prompt || "").trim(),
			format,
			style,
		}),
		signal,
	});

	const contentType = res.headers.get("content-type") || "";

	if (contentType.includes("text/event-stream")) {
		if (!res.ok) {
			const errText = await readStreamAsText(res.body);
			let errJson;
			try {
				errJson = JSON.parse(errText);
			} catch {
				throw new Error(errText || `Request failed (${res.status})`);
			}
			throw new Error(errJson.error || errJson.message || `Request failed (${res.status})`);
		}
		return parseSseGenerateStream(res.body, onStreamText);
	}

	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data.error || data.message || `Request failed (${res.status})`);
	}
	return { data, streamedText: extractTextFromPayload(data) };
}

async function readStreamAsText(body) {
	if (!body) return "";
	const reader = body.getReader();
	const dec = new TextDecoder();
	let out = "";
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		out += dec.decode(value, { stream: true });
	}
	return out;
}

function extractTextFromPayload(data) {
	if (!data || typeof data !== "object") return "";
	if (typeof data.content === "string") return data.content;
	if (typeof data.result?.content === "string") return data.result.content;
	return "";
}

/**
 * @returns {Promise<{ data: object, streamedText: string }>}
 */
async function parseSseGenerateStream(body, onStreamText) {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let streamedText = "";
	let lastData = null;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });

		const blocks = buffer.split("\n\n");
		buffer = blocks.pop() || "";

		for (const block of blocks) {
			const lines = block.split("\n");
			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed.startsWith("data:")) continue;
				const jsonStr = trimmed.slice(5).trim();
				if (!jsonStr || jsonStr === "[DONE]") continue;
				let payload;
				try {
					payload = JSON.parse(jsonStr);
				} catch {
					continue;
				}
				lastData = payload;

				const piece =
					typeof payload.content === "string"
						? payload.content
						: typeof payload.delta === "string"
							? payload.delta
							: typeof payload.text === "string"
								? payload.text
								: typeof payload.chunk === "string"
									? payload.chunk
									: null;

				if (piece) {
					streamedText += piece;
					onStreamText?.(streamedText, piece);
				}

				if (typeof payload.content === "string" && !piece && payload.type !== "end") {
					streamedText = payload.content;
					onStreamText?.(streamedText, payload.content);
				}
			}
		}
	}

	if (buffer.trim()) {
		for (const line of buffer.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed.startsWith("data:")) continue;
			const jsonStr = trimmed.slice(5).trim();
			if (!jsonStr) continue;
			try {
				const payload = JSON.parse(jsonStr);
				lastData = payload;
			} catch {
				// ignore
			}
		}
	}

	let finalData =
		lastData && typeof lastData === "object" ? { ...lastData } : { success: false };

	if (streamedText && !finalData.content) finalData.content = streamedText;

	if (finalData.success !== true) {
		if (finalData.error) throw new Error(finalData.error);
		if (finalData.content || finalData.columns || finalData.infographics) {
			finalData.success = true;
		} else if (streamedText.trim()) {
			finalData.success = true;
		}
	}

	const textOut =
		streamedText ||
		extractTextFromPayload(finalData) ||
		(typeof finalData.content === "string" ? finalData.content : "");

	return { data: finalData, streamedText: textOut };
}
