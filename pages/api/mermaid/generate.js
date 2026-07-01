/**
 * POST /api/mermaid/generate
 *
 * Body: { idToken, prompt?, contextText?, articleTitle? }
 * Returns: { mermaid, title?, model }
 */
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";
import { checkAndDeductCredit } from "../../../lib/utils/credits";
import { checkRateLimit } from "../../../lib/utils/rateLimit";
import { normalizeAndValidateMermaid, validateMermaidParses } from "../../../lib/mermaid/normalizeMermaidOutput";
import {
	openRouterChatCompletion,
	resolveOpenRouterModels,
} from "../../../lib/utils/openRouter";

export const config = {
	api: {
		bodyParser: { sizeLimit: "512kb" },
	},
};

const SYSTEM = `You are a senior technical illustrator specializing in Mermaid diagrams for editorial and product blogs.

Your ONLY job is to output valid JSON describing ONE diagram — no markdown fences, no commentary outside JSON.

Rules:
• Choose the simplest diagram type that communicates the structure (flowchart/graph LR/TD, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, journey, gantt, pie, mindmap when appropriate).
• Output MUST be syntactically valid Mermaid that renders without errors in Mermaid.js v11 with securityLevel strict.
• Prefer short node IDs (A, B, C or PascalCase words). Escape double quotes inside labels with \\" — avoid raw HTML.
• Keep diagrams readable on mobile: typically ≤ 18 nodes unless the source explicitly requires more.
• Labels with commas, parentheses, or special characters MUST be quoted: A["Science (Theory)"] not A[Science (Theory)].
• mindmap/graph TD: every branch must follow grammar rules for that diagram type — prefer flowchart/graph LR when unsure.

JSON shape (exact keys):
{"title":"short human title","mermaid":"<diagram source ONLY>"}`;

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
		prompt = "",
		contextText = "",
		articleTitle = "",
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

	const brief = String(prompt || "").trim();
	const ctx = String(contextText || "").trim().slice(0, 60_000);
	const titleGround = String(articleTitle || "").trim().slice(0, 240);

	const userBlock = `${brief ? `Creative direction:\n${brief}\n\n` : ""}${titleGround ? `Working title (context): ${titleGround}\n\n` : ""}Source material:\n---\n${ctx || "(infer carefully from creative direction only)"}\n---\n\nReturn JSON with "title" and "mermaid" only.`;

	const models = resolveOpenRouterModels([
		"OPENROUTER_MERMAID_MODEL",
		"OPENROUTER_INFOGRAPHICS_MODEL",
	]);

	try {
		const { data, model } = await openRouterChatCompletion({
			models,
			messages: [
				{ role: "system", content: SYSTEM },
				{ role: "user", content: userBlock },
			],
			temperature: 0.35,
			max_tokens: 4096,
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
			console.error("[mermaid/generate] JSON parse", parseErr);
			return res.status(502).json({
				error: "Could not parse Mermaid JSON from model",
			});
		}

		let mermaidCode;
		try {
			mermaidCode = normalizeAndValidateMermaid(
				parsed.mermaid ?? parsed.diagram ?? "",
			);
		} catch (normErr) {
			return res.status(502).json({
				error: normErr?.message || "Invalid diagram output",
			});
		}

		let parseErrMsg = null;
		try {
			await validateMermaidParses(mermaidCode);
		} catch (vErr) {
			parseErrMsg = vErr?.message || String(vErr);
		}

		if (parseErrMsg) {
			console.warn("[mermaid/generate] parse failed, repairing:", parseErrMsg);
			const repairMessages = [
				{ role: "system", content: SYSTEM },
				{ role: "user", content: userBlock },
				{ role: "assistant", content: String(text).trim() },
				{
					role: "user",
					content: `Your diagram failed Mermaid validation:\n${parseErrMsg}\n\nReturn corrected JSON only with keys "title" and "mermaid". Fix Mermaid syntax only; preserve meaning.`,
				},
			];

			let repairData;
			try {
				const repairResult = await openRouterChatCompletion({
					models,
					messages: repairMessages,
					temperature: 0.35,
					max_tokens: 4096,
					preferJsonObject: true,
				});
				repairData = repairResult.data;
			} catch (repairUpstreamErr) {
				return res.status(502).json({
					error: repairUpstreamErr?.message || "OpenRouter repair failed",
					detail: parseErrMsg,
				});
			}

			const repairText = repairData.choices?.[0]?.message?.content;
			if (!repairText) {
				return res.status(502).json({
					error: "Empty repair response",
					detail: parseErrMsg,
				});
			}

			try {
				parsed = extractJsonObject(repairText);
				mermaidCode = normalizeAndValidateMermaid(
					parsed.mermaid ?? parsed.diagram ?? "",
				);
				await validateMermaidParses(mermaidCode);
			} catch (repairFail) {
				console.error("[mermaid/generate] repair failed", repairFail);
				return res.status(502).json({
					error:
						repairFail?.message ||
						"Diagram still invalid after automatic repair",
					detail: parseErrMsg,
				});
			}
		}

		const credit = await checkAndDeductCredit(uid, 1);
		if (!credit.allowed) {
			return res.status(429).json({ error: credit.error });
		}

		const title =
			String(parsed.title || titleGround || "Diagram").trim().slice(0, 240) ||
			"Diagram";

		return res.status(200).json({
			mermaid: mermaidCode,
			title,
			model,
		});
	} catch (err) {
		console.error("[mermaid/generate]", err);
		const status = err?.statusCode === 502 ? 502 : err?.statusCode === 500 ? 500 : 500;
		return res.status(status).json({
			error: err?.message || "Mermaid generation failed",
		});
	}
}
