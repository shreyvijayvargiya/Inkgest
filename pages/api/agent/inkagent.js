/**
 * InkAgent proxy — pure pass-through to external backend API, streams SSE response.
 * Credit deduction is handled by client calling /api/agent/inkagent on stream end.
 * External API: INKGEST_AGENT_URL (env, default http://localhost:3002/inkgest-agent)
 */
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";
import { checkRateLimit } from "../../../lib/utils/rateLimit";
import { validateUrls } from "../../../lib/utils/urlAllowlist";

export const config = {
	api: { bodyParser: { sizeLimit: "512kb" } },
};

// browser agent UI needs to be made
// screenshot and other API integration
// then integrate Notion or Google Doc but not that important but can add
// market the product agentic ink to gest, first browserless agent, aint need browser to do agentic work
// how to add

const INKGEST_AGENT_URL =
	process.env.INKGEST_AGENT_URL || "http://localhost:3002/inkgest-agent";
const URL_REGEX = /https?:\/\/[^\s\)\]"'\<\>]+/gi;

/** Extract URLs from text; validate before invoking AI to save credits.
 * Full URLs (https://) are validated. Bare domains (e.g. buildsaas.dev, dev.to) are allowed — backend normalizes them. */
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
	// Bare domains (buildsaas.dev, dev.to, etc.) without https:// are allowed — backend handles them
	return { valid: true, urls };
}

export default async function handler(req, res) {
	if (req.method !== "POST")
		return res.status(405).json({ error: "Method not allowed" });

	const {
		prompt,
		chatHistory = [],
		executeTasks = [],
		idToken,
	} = req.body || {};
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
						(Array.isArray(t?.params?.urls) ? t.params.urls : []).filter((u) =>
							/^https?:\/\/\S+$/i.test(String(u)),
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
