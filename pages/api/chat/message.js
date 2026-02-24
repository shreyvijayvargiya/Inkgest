/**
 * POST /api/chat/message
 *
 * Streams an AI writing assistant response via Server-Sent Events (SSE).
 * Body: { messages: [{ role, content }], idToken }
 *
 * Client reads: data: {"delta":"..."} chunks, terminated by data: [DONE]
 */
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";

export const config = {
	api: { responseLimit: false },
};

const SYSTEM = `You are Inkgest — an expert AI writing assistant for newsletter writers, bloggers, and indie founders.
Help users draft, rewrite, expand, outline and polish content. Output clean markdown.

Rules:
• Be direct and concise. No filler phrases like "Certainly!" or "Great question!".
• Lead with the best stuff immediately.
• Match the requested tone precisely.
• When writing use **bold**, *italic*, ## headings, and - bullet lists where they add clarity.
• If the user provides editor context (text between [Editor context: ...]), use it to inform your suggestions but don't repeat it back.
• Keep responses focused and actionable.

RICH CONTENT BLOCKS — use these where they genuinely improve clarity:

Code blocks (standard markdown fencing):
\`\`\`javascript
const example = "code";
\`\`\`
(supported: javascript, typescript, python, css, html, bash, json, sql)

Callout blocks:
:::info
A helpful note or tip.
:::
:::warning
Something to be careful about.
:::
:::success
A positive confirmation.
:::
:::danger
A critical warning.
:::

Use callouts sparingly. Only include them when they add real value to the response.`;

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const { messages, idToken, model: requestedModel } = req.body || {};

	if (!idToken) {
		return res
			.status(401)
			.json({ error: "Authentication required. Please sign in." });
	}

	try {
		await verifyFirebaseToken(idToken);
	} catch (authErr) {
		return res.status(401).json({ error: authErr.message });
	}

	if (!Array.isArray(messages) || messages.length === 0) {
		return res.status(400).json({ error: "Messages array is required" });
	}

	const openRouterKey = process.env.OPENROUTER_API_KEY;
	if (!openRouterKey) {
		return res
			.status(500)
			.json({ error: "OpenRouter API key not configured on the server" });
	}

	// SSE headers — disable all buffering layers
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache, no-transform");
	res.setHeader("Connection", "keep-alive");
	res.setHeader("X-Accel-Buffering", "no"); // nginx
	res.flushHeaders();

	// Accept client-chosen model; whitelist to prevent abuse
	const ALLOWED_MODELS = [
		"openai/gpt-4o",
		"google/gemini-2.0-flash-001",
		"anthropic/claude-3-5-sonnet",
	];
	const model = ALLOWED_MODELS.includes(requestedModel)
		? requestedModel
		: String(process.env.OPENROUTER_MODEL || "").trim() || "openai/gpt-4o";

	try {
		const upstream = await fetch(
			"https://openrouter.ai/api/v1/chat/completions",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${openRouterKey}`,
					...(process.env.OPENROUTER_HTTP_REFERER
						? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER }
						: {}),
					...(process.env.OPENROUTER_APP_TITLE
						? { "X-Title": process.env.OPENROUTER_APP_TITLE }
						: {}),
				},
				body: JSON.stringify({
					model,
					messages: [
						{ role: "system", content: SYSTEM },
						...messages.slice(-14), // keep last 14 turns for context
					],
					stream: true,
					max_tokens: 1400,
					temperature: 0.72,
				}),
			},
		);

		if (!upstream.ok) {
			const errData = await upstream.json().catch(() => ({}));
			const msg =
				errData?.error?.message ||
				`OpenRouter error (${upstream.status})`;
			res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
			res.end();
			return;
		}

		const reader = upstream.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? ""; // retain any incomplete last line

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed.startsWith("data: ")) continue;
				const payload = trimmed.slice(6);
				if (payload === "[DONE]") {
					res.write("data: [DONE]\n\n");
					if (typeof res.flush === "function") res.flush();
					res.end();
					return;
				}
				try {
					const parsed = JSON.parse(payload);
					const delta = parsed.choices?.[0]?.delta?.content;
					if (delta) {
						res.write(`data: ${JSON.stringify({ delta })}\n\n`);
						if (typeof res.flush === "function") res.flush();
					}
				} catch {
					// skip malformed chunks
				}
			}
		}

		res.write("data: [DONE]\n\n");
	} catch (err) {
		console.error("[chat/message]", err);
		if (!res.writableEnded) {
			res.write(
				`data: ${JSON.stringify({ error: err.message || "Stream error" })}\n\n`,
			);
		}
	} finally {
		if (!res.writableEnded) res.end();
	}
}
