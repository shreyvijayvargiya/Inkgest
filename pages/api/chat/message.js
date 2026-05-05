/**
 * POST /api/chat/message
 *
 * Streams an AI writing assistant response via Server-Sent Events (SSE).
 * Body: { messages: [{ role, content }], idToken }
 *
 * Client reads: data: {"delta":"..."} chunks, terminated by data: [DONE]
 */
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";
import { checkAndDeductCredit } from "../../../lib/utils/credits";
import { checkRateLimit } from "../../../lib/utils/rateLimit";

export const config = {
	api: {
		bodyParser: { sizeLimit: "1mb" },
		responseLimit: false,
	},
};

const SCRAPE_TOOLS = [
	{
		type: "function",
		function: {
			name: "scrape_url",
			description:
				"Fetch readable markdown/content from ONE public HTTPS page. Use when the user shares a link, asks to summarise a page, or you need actual page text (not guesses). Prefer this over saying you cannot browse.",
			parameters: {
				type: "object",
				properties: {
					url: {
						type: "string",
						description: "Full URL including https://",
					},
				},
				required: ["url"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "scrape_urls",
			description:
				"Fetch multiple public web pages in parallel. Use when the user provides several links or asks to compare, merge, or summarise multiple sources.",
			parameters: {
				type: "object",
				properties: {
					urls: {
						type: "array",
						items: { type: "string" },
						description: "Full HTTPS URLs (max 15 per call)",
						maxItems: 15,
					},
				},
				required: ["urls"],
			},
		},
	},
];

const SYSTEM = `You are Inkgest — an expert AI writing assistant for newsletter writers, bloggers, and indie founders.
Help users draft, rewrite, expand, outline and polish content. Output clean markdown.

TOOLS — Page content:
• You MAY call scrape_url with a single URL or scrape_urls with an array when the user gives link(s), asks for a summary of a site/article, or you need factual text from a page.
• After tool results arrive, answer from the scraped markdown; cite sources by domain or title when helpful.
• If a scrape fails, say so briefly and proceed with whatever context you still have — do not pretend you scraped successfully.

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

const AGENT_MODE_APPEND = `

AGENT MODE — Inkgest workspace (client-executed tools):
• search_user_assets — fuzzy search the user's drafts and tables by title/preview. Use when they ask to find a note, draft, or "that table about X".
• read_user_asset — load stored content for one asset id from search results. Drafts return markdown body (truncated in tool result). Tables return a short JSON summary of columns/rows.
• propose_create_draft — when the user wants a **new** draft/note saved to their library. Put the full draft in bodyMarkdown and a clear title. The app will show **Approve / Decline**; nothing is saved until they approve. Still write a helpful reply in your message (e.g. the paragraph they asked for).
• You still have scrape_url / scrape_urls for live web pages when needed.

Rules for propose_create_draft:
• Call it only when the user explicitly wants a new saved draft or similar.
• After calling it, briefly say the user can approve below to save (do not repeat the entire body if it is long).`;

const AGENT_TOOLS = [
	{
		type: "function",
		function: {
			name: "search_user_assets",
			description:
				"Fuzzy search this user's drafts and tables (titles + previews). Use for 'find my note about…', 'where is my draft on…'.",
			parameters: {
				type: "object",
				properties: {
					query: {
						type: "string",
						description: "Search phrase",
					},
				},
				required: ["query"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "read_user_asset",
			description:
				"Read stored content for one asset id (from search_user_assets). Use to quote or summarise an existing draft/table.",
			parameters: {
				type: "object",
				properties: {
					asset_id: {
						type: "string",
						description: "Firestore asset document id",
					},
				},
				required: ["asset_id"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "propose_create_draft",
			description:
				"Stage a NEW draft for user approval — not saved until they click Approve. Include complete bodyMarkdown.",
			parameters: {
				type: "object",
				properties: {
					title: { type: "string", description: "Draft title" },
					bodyMarkdown: {
						type: "string",
						description: "Full draft in markdown",
					},
				},
				required: ["title", "bodyMarkdown"],
			},
		},
	},
];

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const { messages, idToken, model: requestedModel, chatMode = "ask" } =
		req.body || {};
	const isAgent = chatMode === "agent";

	if (!idToken) {
		return res
			.status(401)
			.json({ error: "Authentication required. Please sign in." });
	}

	let uid;
	try {
		uid = await verifyFirebaseToken(idToken);
	} catch (authErr) {
		return res.status(401).json({ error: authErr.message });
	}

	// Rate limit — per IP and per user
	const rateLimit = await checkRateLimit(req, { identifier: uid });
	if (!rateLimit.allowed) {
		return res.status(429).json({
			error: "Too many requests. Please try again later.",
			retryAfter: rateLimit.resetIn,
		});
	}

	// Each chat message costs 0.25 credits
	const creditCheck = await checkAndDeductCredit(uid, 0.25);
	if (!creditCheck.allowed) {
		return res.status(429).json({ error: creditCheck.error });
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

	const enableScrapeTools = true;
	const systemContent = isAgent ? SYSTEM + AGENT_MODE_APPEND : SYSTEM;
	const payloadBody = {
		model,
		messages: [
			{ role: "system", content: systemContent },
			...messages.slice(-24),
		],
		stream: true,
		max_tokens: 2800,
		temperature: 0.72,
	};
	if (enableScrapeTools) {
		payloadBody.tools = isAgent
			? [...SCRAPE_TOOLS, ...AGENT_TOOLS]
			: SCRAPE_TOOLS;
		payloadBody.tool_choice = "auto";
	}

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
				body: JSON.stringify(payloadBody),
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
		/** @type {Record<number, { id: string, type: string, function: { name: string, arguments: string } }>} */
		const toolCallsByIndex = {};
		let lastFinishReason = null;

		const mergeToolCallDeltas = (deltas) => {
			if (!Array.isArray(deltas)) return;
			for (const tc of deltas) {
				const i = typeof tc.index === "number" ? tc.index : 0;
				if (!toolCallsByIndex[i]) {
					toolCallsByIndex[i] = {
						id: "",
						type: "function",
						function: { name: "", arguments: "" },
					};
				}
				if (tc.id) toolCallsByIndex[i].id = tc.id;
				if (tc.type) toolCallsByIndex[i].type = tc.type;
				if (tc.function?.name) {
					toolCallsByIndex[i].function.name += tc.function.name;
				}
				if (tc.function?.arguments) {
					toolCallsByIndex[i].function.arguments += tc.function.arguments;
				}
			}
		};

		const emitToolCallsIfNeeded = () => {
			const hasToolCalls = Object.keys(toolCallsByIndex).length > 0;
			if (!enableScrapeTools || !hasToolCalls) return;
			const tool_calls = Object.keys(toolCallsByIndex)
				.map((k) => Number(k))
				.sort((a, b) => a - b)
				.map((k) => toolCallsByIndex[k]);
			const allHaveName = tool_calls.every((t) => t?.function?.name);
			const allHaveArgs = tool_calls.every((t) => {
				const a = t?.function?.arguments;
				if (!a) return false;
				try {
					JSON.parse(a);
					return true;
				} catch {
					return false;
				}
			});
			if (
				lastFinishReason === "tool_calls" ||
				(allHaveName && allHaveArgs && tool_calls.length > 0)
			) {
				res.write(`data: ${JSON.stringify({ tool_calls })}\n\n`);
				if (typeof res.flush === "function") res.flush();
			}
		};

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
					emitToolCallsIfNeeded();
					res.write("data: [DONE]\n\n");
					if (typeof res.flush === "function") res.flush();
					res.end();
					return;
				}
				try {
					const parsed = JSON.parse(payload);
					const choice = parsed.choices?.[0];
					if (choice?.finish_reason) lastFinishReason = choice.finish_reason;
					const delta = choice?.delta;
					const text = delta?.content;
					if (text) {
						res.write(`data: ${JSON.stringify({ delta: text })}\n\n`);
						if (typeof res.flush === "function") res.flush();
					}
					if (enableScrapeTools && delta?.tool_calls) {
						mergeToolCallDeltas(delta.tool_calls);
					}
				} catch {
					// skip malformed chunks
				}
			}
		}

		emitToolCallsIfNeeded();
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
