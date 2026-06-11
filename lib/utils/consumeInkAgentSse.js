function appendStreamPiece(streamedText, payload) {
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
	if (piece) return streamedText + piece;
	if (
		typeof payload.content === "string" &&
		payload.type !== "end" &&
		!piece
	) {
		return payload.content;
	}
	return streamedText;
}

/**
 * Consume JSON or SSE body from INKGEST_AGENT_URL (same framing as generate SSE).
 *
 * @param {Response} res - fetch Response
 * @param {{ signal?: AbortSignal, onStreamText?: (full: string) => void, onPayload?: (obj: object) => void }} opts
 * @returns {Promise<{ streamedText: string, finalPayload: object }>}
 */
export async function consumeInkAgentResponse(res, opts = {}) {
	const { signal, onStreamText, onPayload } = opts;

	const ct = res.headers.get("content-type") || "";

	if (ct.includes("application/json")) {
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			throw new Error(
				data.error || data.message || `Request failed (${res.status})`,
			);
		}
		onPayload?.(data);
		let streamedText = "";
		if (typeof data.content === "string") streamedText = data.content;
		onStreamText?.(streamedText);
		return { streamedText, finalPayload: data };
	}

	if (!res.ok) {
		const errText = await res.text().catch(() => "");
		let errJson;
		try {
			errJson = JSON.parse(errText);
		} catch {
			errJson = {};
		}
		throw new Error(
			errJson.error || errJson.message || errText || `HTTP ${res.status}`,
		);
	}

	const reader = res.body?.getReader();
	if (!reader) {
		return { streamedText: "", finalPayload: {} };
	}

	const decoder = new TextDecoder();
	let buffer = "";
	let streamedText = "";
	let lastPayload = /** @type {object | null} */ (null);
	let endPayload = /** @type {object | null} */ (null);

	try {
		while (true) {
			if (signal?.aborted) {
				await reader.cancel().catch(() => {});
				throw new DOMException("Aborted", "AbortError");
			}
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
					lastPayload = payload;
					if (payload.type === "end") endPayload = payload;
					onPayload?.(payload);

					if (payload.type !== "end") {
						streamedText = appendStreamPiece(streamedText, payload);
						onStreamText?.(streamedText);
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
					lastPayload = payload;
					if (payload.type === "end") endPayload = payload;
					onPayload?.(payload);
				} catch {
					// ignore
				}
			}
		}
	} finally {
		reader.releaseLock?.();
	}

	const resolvedEnd =
		endPayload && typeof endPayload === "object" ? { ...endPayload } : null;

	let finalPayload =
		resolvedEnd ??
		(lastPayload && typeof lastPayload === "object"
			? { ...lastPayload }
			: { success: false });

	const endAssets =
		finalPayload.assets ??
		finalPayload.payload?.assets ??
		(Array.isArray(finalPayload.payload) ? null : null);
	if (Array.isArray(endAssets)) {
		finalPayload.assets = endAssets;
	}
	if (finalPayload.multiBlog == null && finalPayload.payload?.multiBlog != null) {
		finalPayload.multiBlog = finalPayload.payload.multiBlog;
	}

	if (streamedText && typeof finalPayload.content !== "string") {
		finalPayload.content = streamedText;
	}

	if (finalPayload.success !== true) {
		if (finalPayload.error) throw new Error(finalPayload.error);
		if (
			finalPayload.assets?.length ||
			finalPayload.content ||
			finalPayload.columns ||
			finalPayload.infographics ||
			finalPayload.executed?.length
		) {
			finalPayload.success = true;
		} else if (streamedText.trim()) {
			finalPayload.success = true;
		}
	}

	return { streamedText, finalPayload };
}

/** Canonical deliverables from an inkgest-agent `type: "end"` payload. */
export function getInkAgentEndAssets(finalPayload) {
	if (!finalPayload || typeof finalPayload !== "object") return [];
	const assets =
		finalPayload.assets ??
		finalPayload.payload?.assets ??
		[];
	return Array.isArray(assets) ? assets : [];
}
