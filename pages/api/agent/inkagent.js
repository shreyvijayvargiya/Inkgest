/**
 * InkAgent proxy — pure pass-through to external backend API, streams SSE response.
 * Credit deduction is handled by client calling /api/agent/inkagent-deduct on stream end.
 * External API: INKGEST_AGENT_URL (env, default http://localhost:3002/inkgest-agent)
 */
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";
import { checkRateLimit } from "../../../lib/utils/rateLimit";
import { validateUrls } from "../../../lib/utils/urlAllowlist";

export const config = {
	api: { bodyParser: { sizeLimit: "512kb" } },
};

const INKGEST_AGENT_URL =
	process.env.INKGEST_AGENT_URL || "http://localhost:3002/inkgest-agent";
const URL_REGEX = /https?:\/\/[^\s\)\]"'\<\>]+/gi;
const BARE_DOMAIN_REGEX =
	/\b(?:[\w-]+\.)+(?:com|dev|org|io|net|co|app|blog)\b/gi;

/** Extract URLs from text; validate before invoking AI to save credits */
function extractAndValidateUrls(text) {
	if (!text || typeof text !== "string") return { valid: true, urls: [] };
	const fullUrls = (text.match(URL_REGEX) || []).map((u) =>
		u.replace(/[.,;:!?]+$/, ""),
	);
	const urls = [...new Set(fullUrls)];
	if (urls.length > 0) {
		const result = validateUrls(urls);
		if (!result.valid) return result;
	}
	const textWithoutProtocol = text.replace(URL_REGEX, "");
	const bareMatch = textWithoutProtocol.match(BARE_DOMAIN_REGEX);
	if (bareMatch && bareMatch.length > 0) {
		return {
			valid: false,
			error: "URLs must include https:// (e.g. https://example.com)",
		};
	}
	return { valid: true, urls };
}

export default async function handler(req, res) {
	if (req.method !== "POST")
		return res.status(405).json({ error: "Method not allowed" });

	const { prompt, chatHistory = [], executeTasks = [], idToken } =
		req.body || {};
	if (!idToken)
		return res.status(401).json({ error: "Authentication required" });

	let uid;
	try {
		uid = await verifyFirebaseToken(idToken);
	} catch (e) {
		return res.status(401).json({ error: e.message });
	}

	const rateLimit = await checkRateLimit(req, { identifier: uid });
	if (!rateLimit.allowed)
		return res
			.status(429)
			.json({ error: "Too many requests", retryAfter: rateLimit.resetIn });

	const userPrompt = String(prompt || "").trim();
	const hasExecuteTasks =
		Array.isArray(executeTasks) && executeTasks.length > 0;
	if (!userPrompt && !hasExecuteTasks)
		return res.status(400).json({ error: "Prompt or executeTasks required" });

	const urlsFromTasks = hasExecuteTasks
		? [
				...new Set(
					executeTasks.flatMap((t) =>
						(Array.isArray(t?.params?.urls) ? t.params.urls : []).filter(
							(u) => /^https?:\/\/\S+$/i.test(String(u)),
						),
					),
				),
			]
		: [];
	const textToCheck = userPrompt || urlsFromTasks.join(" ");
	const urlCheck = extractAndValidateUrls(textToCheck);
	if (!urlCheck.valid) {
		return res.status(400).json({
			error: urlCheck.error || "Invalid URL. Use full URLs with https://",
		});
	}

	try {
		const agentRes = await fetch(INKGEST_AGENT_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				prompt: userPrompt,
				chatHistory: chatHistory.slice(-6),
				executeTasks,
			}),
		});

		if (!agentRes.ok) {
			const data = await agentRes.json().catch(() => ({}));
			return res.status(agentRes.status).json({
				error: data?.error || data?.message || `Agent error ${agentRes.status}`,
			});
		}

		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.flushHeaders?.();

		const reader = agentRes.body.getReader();
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			res.write(Buffer.from(value));
		}
		res.end();
	} catch (err) {
		console.error("[inkagent proxy]", err);
		return res
			.status(502)
			.json({ error: err?.message || "Agent service unavailable" });
	}
}
