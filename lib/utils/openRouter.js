/**
 * Shared OpenRouter chat/completions helper with model fallbacks.
 * Infographics + Mermaid use structured JSON; chat uses OPENROUTER_MODEL → gpt-4o.
 */

export const OPENROUTER_CHAT_COMPLETIONS_URL =
	"https://openrouter.ai/api/v1/chat/completions";

/** Ordered fallbacks when env models are missing or unavailable on OpenRouter. */
export const STRUCTURED_JSON_MODEL_FALLBACKS = [
	"google/gemini-2.5-flash",
	"openai/gpt-4o-mini",
	"openai/gpt-4o",
];

export function getOpenRouterHeaders() {
	const key = process.env.OPENROUTER_API_KEY;
	if (!key) return null;
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${key}`,
		...(process.env.OPENROUTER_HTTP_REFERER
			? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER }
			: {}),
		...(process.env.OPENROUTER_APP_TITLE
			? { "X-Title": process.env.OPENROUTER_APP_TITLE }
			: {}),
	};
}

/**
 * @param {string[]} [envKeys] e.g. ["OPENROUTER_INFOGRAPHICS_MODEL"]
 * @returns {string[]}
 */
export function resolveOpenRouterModels(envKeys = []) {
	const out = [];
	const push = (m) => {
		const s = String(m || "").trim();
		if (s && !out.includes(s)) out.push(s);
	};
	for (const key of envKeys) push(process.env[key]);
	push(process.env.OPENROUTER_MODEL);
	for (const m of STRUCTURED_JSON_MODEL_FALLBACKS) push(m);
	return out;
}

function isModelUnavailable(status, errData) {
	const msg = String(
		errData?.error?.message || errData?.message || "",
	).toLowerCase();
	return (
		msg.includes("no endpoints") ||
		msg.includes("not a valid model") ||
		msg.includes("model not found") ||
		msg.includes("does not exist") ||
		msg.includes("invalid model") ||
		status === 404
	);
}

function isResponseFormatUnsupported(status, errData) {
	if (status !== 400) return false;
	const msg = String(errData?.error?.message || "").toLowerCase();
	return (
		msg.includes("response_format") ||
		msg.includes("json_object") ||
		msg.includes("structured")
	);
}

/**
 * @param {{
 *   models: string | string[],
 *   messages: object[],
 *   temperature?: number,
 *   max_tokens?: number,
 *   preferJsonObject?: boolean,
 * }} opts
 * @returns {Promise<{ data: object, model: string }>}
 */
export async function openRouterChatCompletion({
	models,
	messages,
	temperature = 0.4,
	max_tokens = 4096,
	preferJsonObject = true,
}) {
	const headers = getOpenRouterHeaders();
	if (!headers) {
		throw Object.assign(
			new Error("OpenRouter API key not configured on the server"),
			{ statusCode: 500 },
		);
	}

	const modelList = (Array.isArray(models) ? models : [models]).filter(
		Boolean,
	);
	if (!modelList.length) {
		throw Object.assign(new Error("No OpenRouter models configured"), {
			statusCode: 500,
		});
	}

	let lastError = null;

	for (const model of modelList) {
		const payloadBase = { model, messages, temperature, max_tokens };
		const bodies = preferJsonObject
			? [
					{ ...payloadBase, response_format: { type: "json_object" } },
					payloadBase,
				]
			: [payloadBase];

		for (const body of bodies) {
			const upstream = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
				method: "POST",
				headers,
				body: JSON.stringify(body),
			});

			if (upstream.ok) {
				return { data: await upstream.json(), model };
			}

			const errData = await upstream.json().catch(() => ({}));
			const msg =
				errData?.error?.message ||
				`OpenRouter error (${upstream.status})`;

			if (isResponseFormatUnsupported(upstream.status, errData)) {
				lastError = { msg, model };
				continue;
			}

			if (isModelUnavailable(upstream.status, errData)) {
				lastError = { msg, model };
				break;
			}

			throw Object.assign(new Error(msg), {
				statusCode: 502,
				errData,
			});
		}
	}

	const msg =
		lastError?.msg ||
		`No available OpenRouter models (tried: ${modelList.join(", ")})`;
	throw Object.assign(new Error(msg), { statusCode: 502 });
}
