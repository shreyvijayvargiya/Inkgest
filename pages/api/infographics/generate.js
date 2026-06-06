/**
 * POST /api/infographics/generate
 *
 * Generates 1–5 infographic panels as structured JSON via OpenRouter (same stack as /api/chat/message).
 * Body: {
 *   idToken: string,
 *   htmlOrTextContent?: string,
 *   title?: string,
 *   excludeTypes?: string[],
 *   visualFormatId?: string | null,
 *   minPanels?: number,
 *   maxPanels?: number,
 * }
 */
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";
import { checkAndDeductCredit } from "../../../lib/utils/credits";
import { checkRateLimit } from "../../../lib/utils/rateLimit";
import { INFOGRAPHIC_CREATIVE_FORMATS } from "../../../lib/config/infographicCreativeFormats";
import { normalizeInfographicsBatch } from "../../../lib/infographics/normalizePanels";
import {
	openRouterChatCompletion,
	resolveOpenRouterModels,
} from "../../../lib/utils/openRouter";

export const config = {
	api: {
		bodyParser: { sizeLimit: "2mb" },
	},
};

function formatDirectiveSnippet(formatId, minPanels, maxPanels) {
	const meta =
		formatId &&
		INFOGRAPHIC_CREATIVE_FORMATS.find((f) => f.id === formatId);
	const label = meta?.label || "General infographic";
	const brief =
		meta?.brief ||
		"Vary infographic types across donut, bars, timeline, comparisons, metric grids — stay faithful to cited facts.";
	return `[Infographics — structured JSON panels]
Produce between ${minPanels} and ${maxPanels} distinct infographic objects (prefer different types).
Creative direction (${label}): ${brief}`;
}

const SYSTEM = `You are an expert information designer for Inkgest. Output ONLY valid JSON (no markdown fences, no commentary).

Root shape:
{"infographics": [ ... ]}

Each panel MUST include:
- "type": one of donut | bar | steps | comparison | stat | quote | timeline | progress | metric_grid
- "title": short headline for the card
- Optional "subtitle": string
- Optional "accentColor": hex like "#7C9D6F"

Type-specific fields:
• donut — "segments": [{"label","value"}] numeric shares (relative weights; values sum logically). Optional "centerValue", "centerLabel".
• bar — "bars": [{"label","value"}]. Optional "yLabel".
• steps — "steps": [{"title","body"}] sequential process (at least 2).
• comparison — "left": {"label","items":[strings]}, "right": {"label","items":[strings]}.
• stat — "stat" (number or short string), "unit", optional "context".
• quote — "quote" (required), optional "author", "source".
• timeline — "events": [{"label"?,"title","detail"}] chronological (at least 2).
• progress — "items": [{"label","value","max"?,"unit"?}] completion bars (at least 2).
• metric_grid — "metrics": [{"label","value","unit"?,"change"?,"trend":"up"|"down"|"flat"}] (at least 2).

Ground every claim in the user's source material; do not invent fake citations or URLs. Use plausible illustrative numbers only when the source implies quantities but omits exact figures — note uncertainty in subtitles when needed.`;

function extractJsonObject(text) {
	const t = String(text || "").trim();
	const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const inner = fenced ? fenced[1].trim() : t;
	const start = inner.indexOf("{");
	const end = inner.lastIndexOf("}");
	if (start < 0 || end <= start) throw new Error("No JSON object in model output");
	return JSON.parse(inner.slice(start, end + 1));
}

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const {
		idToken,
		htmlOrTextContent = "",
		title = "",
		excludeTypes = [],
		visualFormatId = null,
		minPanels = 1,
		maxPanels = 5,
	} = req.body || {};

	if (!idToken) {
		return res.status(401).json({ error: "Authentication required." });
	}

	let uid;
	try {
		uid = await verifyFirebaseToken(idToken);
	} catch (e) {
		return res.status(401).json({ error: e.message });
	}

	const rateLimit = await checkRateLimit(req, { identifier: uid });
	if (!rateLimit.allowed) {
		return res.status(429).json({
			error: "Too many requests. Please try again later.",
			retryAfter: rateLimit.resetIn,
		});
	}

	const minP = Math.max(1, Math.min(5, Number(minPanels) || 1));
	const maxP = Math.max(minP, Math.min(5, Number(maxPanels) || 5));
	const directive = formatDirectiveSnippet(visualFormatId, minP, maxP);
	const bodyText = String(htmlOrTextContent || "").trim();
	const userBlock = `${directive}

Source material follows after "---".
---

${bodyText || "(minimal source — infer carefully from title and brief only)"}

Return {"infographics":[...]} with between ${minP} and ${maxP} panels. Use distinct types where possible.`;

	const models = resolveOpenRouterModels(["OPENROUTER_INFOGRAPHICS_MODEL"]);

	try {
		const { data, model } = await openRouterChatCompletion({
			models,
			messages: [
				{ role: "system", content: SYSTEM },
				{ role: "user", content: userBlock },
			],
			temperature: 0.42,
			max_tokens: 6144,
			preferJsonObject: true,
		});

		const text = data.choices?.[0]?.message?.content;
		if (!text) {
			return res.status(502).json({ error: "Empty model response" });
		}

		let parsed;
		try {
			parsed = extractJsonObject(text);
		} catch (parseErr) {
			console.error("[infographics/generate] JSON parse", parseErr);
			return res.status(502).json({
				error: "Could not parse infographic JSON from model",
			});
		}

		const batch = normalizeInfographicsBatch(
			parsed.infographics,
			Array.isArray(excludeTypes) ? excludeTypes : [],
			maxP,
		);

		if (batch.length > 0) {
			const credit = await checkAndDeductCredit(uid, 1);
			if (!credit.allowed) {
				return res.status(429).json({ error: credit.error });
			}
		}

		return res.status(200).json({
			infographics: batch,
			title: String(title || "Infographics").slice(0, 240),
			model,
		});
	} catch (err) {
		console.error("[infographics/generate]", err);
		const status = err?.statusCode === 502 ? 502 : err?.statusCode === 500 ? 500 : 500;
		return res.status(status).json({
			error: err?.message || "Infographic generation failed",
		});
	}
}
