/**
 * InkAgent proxy — forwards prompt to external backend API.
 * External API: INKGEST_AGENT_URL (default http://localhost:3002/inkgest-agent)
 * Returns: success, thinking, message, suggestedTasks, executed, creditsUsed, creditsDistribution, tokenUsage
 */
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";
import { checkRateLimit } from "../../../lib/utils/rateLimit";
import { validateUrls } from "../../../lib/utils/urlAllowlist";

export const config = {
	api: { bodyParser: { sizeLimit: "512kb" } },
};

const INKGEST_AGENT_URL =
 "https://api.buildsaas.dev/inkgest-agent";
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

	const { prompt, idToken } = req.body || {};
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
	if (!userPrompt) return res.status(400).json({ error: "Prompt required" });

	const urlCheck = extractAndValidateUrls(userPrompt);
	if (!urlCheck.valid) {
		return res
			.status(400)
			.json({
				error: urlCheck.error || "Invalid URL. Use full URLs with https://",
			});
	}

	try {
		const agentRes = await fetch(INKGEST_AGENT_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ prompt: userPrompt }),
		});

		const data = await agentRes.json().catch(() => ({}));
		if (!agentRes.ok) {
			return res
				.status(agentRes.status)
				.json({
					error:
						data?.error || data?.message || `Agent error ${agentRes.status}`,
				});
		}

		return res.status(200).json({
			...data,
			_uid: uid,
		});
	} catch (err) {
		console.error("[inkagent proxy]", err);
		return res
			.status(502)
			.json({ error: err?.message || "Agent service unavailable" });
	}
}
