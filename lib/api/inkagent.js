/**
 * InkAgent — streams from external backend to client, deducts credits when assets are created.
 * Use via POST handler; no Next.js API overhead beyond a thin route.
 *
 * External API: INKGEST_AGENT_URL (env, default http://localhost:3002/inkgest-agent)
 */
import { verifyFirebaseToken } from "../utils/verifyAuth";
import { checkRateLimit } from "../utils/rateLimit";
import { validateUrls } from "../utils/urlAllowlist";
import { checkAndDeductCredit } from "../utils/credits";

import { inkgestAgentRequestHeaders } from "../config/agent";

const INKGEST_AGENT_URL =
	process.env.INKGEST_AGENT_URL || "http://localhost:3002/inkgest-agent";
const URL_REGEX = /https?:\/\/[^\s\)\]"'\<\>]+/gi;

/** Extract URLs from text; validate before invoking AI to save credits. */
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
	return { valid: true, urls };
}

/**
 * Deduct credits when agent creates assets. Fire-and-forget so streaming isn't blocked.
 * Uses creditsUsed from stream if present, else 1 credit per executed task.
 */
function deductCreditsOnEnd(uid, data) {
	if (!uid || !data) return;
	const creditsUsed =
		typeof data.creditsUsed === "number" && data.creditsUsed > 0
			? data.creditsUsed
			: Array.isArray(data.executed) && data.executed.length > 0
				? 1
				: 0;
	if (creditsUsed <= 0) return;
	checkAndDeductCredit(uid, creditsUsed).catch((err) =>
		console.error("[inkagent] credit deduction failed:", err),
	);
}

/**
 * Stream upstream SSE to response, parsing for "end" events to deduct credits.
 * Handles both SSE stream (agent) and JSON (infographics) responses.
 * @param {object} opts - { req, res, uid, prompt, chatHistory, executeTasks, content, title, excludeTypes }
 */
export async function streamInkAgentToResponse(opts) {
	const {
		req,
		res,
		uid,
		prompt,
		chatHistory = [],
		executeTasks = [],
		content,
		title,
		excludeTypes,
	} = opts;

	const body = {
		prompt: String(prompt || "").trim(),
		chatHistory: chatHistory.slice(-6),
		executeTasks,
	};
	if (content) body.content = content;
	if (title) body.title = title;
	if (Array.isArray(excludeTypes)) body.excludeTypes = excludeTypes;

	const agentRes = await fetch(INKGEST_AGENT_URL, {
		method: "POST",
		headers: inkgestAgentRequestHeaders(uid),
		body: JSON.stringify(body),
	});

	if (!agentRes.ok) {
		const data = await agentRes.json().catch(() => ({}));
		return {
			ok: false,
			status: agentRes.status,
			error: data?.error || data?.message || `Agent error ${agentRes.status}`,
		};
	}

	const contentType = agentRes.headers.get("content-type") || "";
	const isJson = contentType.includes("application/json");

	if (isJson) {
		const data = await agentRes.json();
		const infographics = data?.infographics;
		if (Array.isArray(infographics) && infographics.length > 0) {
			deductCreditsOnEnd(uid, { creditsUsed: 1 });
		}
		res.setHeader("Content-Type", "application/json");
		res.status(200).json(data);
		return { ok: true };
	}

	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.flushHeaders?.();

	const reader = agentRes.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value, { stream: true });
			buffer += chunk;

			const parts = buffer.split("\n\n");
			buffer = parts.pop() || "";

			for (const part of parts) {
				const line = part.trim();
				if (!line.startsWith("data: ")) continue;
				const jsonStr = line.slice(6);
				if (!jsonStr) continue;
				try {
					const data = JSON.parse(jsonStr);
					if (data.type === "end") deductCreditsOnEnd(uid, data);
				} catch {
					// ignore parse errors
				}
			}

			res.write(Buffer.from(value));
		}

		// Handle trailing buffer
		if (buffer.trim()) {
			const line = buffer.trim();
			if (line.startsWith("data: ")) {
				try {
					const data = JSON.parse(line.slice(6));
					if (data.type === "end") deductCreditsOnEnd(uid, data);
				} catch {
					// ignore
				}
			}
		}

		res.end();
		return { ok: true };
	} catch (err) {
		console.error("[inkagent] stream error:", err);
		throw err;
	}
}

/**
 * Validate request and return uid or error. Call before streamInkAgentToResponse.
 */
export async function validateInkAgentRequest(req) {
	if (req.method !== "POST") {
		return { error: "Method not allowed", status: 405 };
	}

	const {
		prompt,
		chatHistory = [],
		executeTasks = [],
		content,
		title,
		excludeTypes,
		idToken,
	} = req.body || {};
	if (!idToken) {
		return { error: "Authentication required", status: 401 };
	}

	let uid;
	try {
		uid = await verifyFirebaseToken(idToken);
	} catch (e) {
		return { error: e.message, status: 401 };
	}

	const rateLimit = await checkRateLimit(req, { identifier: uid });
	if (!rateLimit.allowed) {
		return {
			error: "Too many requests",
			status: 429,
			retryAfter: rateLimit.resetIn,
		};
	}

	const userPrompt = String(prompt || "").trim();
	const hasExecuteTasks =
		Array.isArray(executeTasks) && executeTasks.length > 0;
	const hasContent = content.length > 0;
	if (!userPrompt && !hasExecuteTasks && !hasContent) {
		return { error: "Prompt, executeTasks, or content required", status: 400 };
	}

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
	const textToCheck = userPrompt || content || urlsFromTasks.join(" ");
	const urlCheck = extractAndValidateUrls(textToCheck);
	if (!urlCheck.valid) {
		return {
			error: urlCheck.error || "Invalid URL. Use full URLs with https://",
			status: 400,
		};
	}

	return {
		uid,
		prompt: userPrompt || content,
		chatHistory,
		executeTasks,
		content,
		title,
		excludeTypes,
	};
}
