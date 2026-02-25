import { checkAndDeductCredit } from "../../../lib/utils/credits";
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";
import { checkRateLimit } from "../../../lib/utils/rateLimit";

export const config = {
	api: { bodyParser: { sizeLimit: "1mb" } },
};

/**
 * POST /api/automations/infographics-generate
 *
 * Body: { content, title, userId, excludeTypes?: string[] }
 *
 * Returns 4-5 infographic objects from 9 available types.
 * excludeTypes prevents the same types being returned on "Generate more".
 */

// All 9 supported schemas that the frontend can render
const SYSTEM_PROMPT = `You are a world-class data visualisation designer and editorial analyst.
Your job is to read the provided content and turn it into a set of 4–5 rich, visually diverse infographic data objects.

━━━ VISUAL STYLE RULES ━━━
• Every card must use a distinct visual style. Vary the accent colours across cards — do NOT use the same hex colour twice.
• Pick accent colours that match the emotional tone of each data point:
  – Data / metrics / numbers → blue #5B8FA8 or teal #2ECCAA
  – Process / workflow / steps → green #7C9D6F
  – Comparison / contrast → amber #E8A84A or orange #C17B2F
  – Key statistics / highlights → gold #E8D5B0
  – Quotes / narrative / insight → purple #9B7DB5
  – Timeline / history / milestones → coral #E86F4A
  – Progress / completion / ratios → indigo #6C63FF
  – Metric grids / dashboards → teal #2ECCAA
• Add an "accentColor" field (hex string) to every object.

━━━ AVAILABLE TYPES ━━━
Return ONLY a valid JSON array. No markdown, no explanation, no code fences. Raw JSON array only.

Each object must match ONE of these 9 schemas exactly:

1. type:"stat"
   { "type":"stat","accentColor":"#hex","title":"short insight label","stat":"NUMBER or %","unit":"unit string or empty","subtitle":"one sentence on what this means","context":"source / additional note" }

2. type:"donut"
   { "type":"donut","accentColor":"#hex","title":"chart title","subtitle":"one-line context","centerValue":"text in middle","centerLabel":"small label in middle","segments":[{"label":"Name","value":NUMBER},...] }
   • Max 5 segments. Values are percentages (add up to ~100).

3. type:"bar"
   { "type":"bar","accentColor":"#hex","title":"chart title","subtitle":"context","yLabel":"unit suffix e.g. % or h","bars":[{"label":"short","value":NUMBER},...] }
   • Max 6 bars.

4. type:"steps"
   { "type":"steps","accentColor":"#hex","title":"process title","subtitle":"one-line context","steps":[{"title":"Step title","body":"1–2 sentence description"},...] }
   • 3–4 steps.

5. type:"comparison"
   { "type":"comparison","accentColor":"#hex","title":"X vs Y","left":{"label":"Option A","items":["point","point","point"]},"right":{"label":"Option B","items":["point","point","point"]} }

6. type:"quote"
   { "type":"quote","accentColor":"#hex","quote":"compelling sentence ≤40 words from the text","author":"author name or 'Editor'","source":"title ≤6 words" }

7. type:"timeline"
   { "type":"timeline","accentColor":"#hex","title":"timeline title","subtitle":"one-line context","events":[{"label":"Year or date","title":"Event name","detail":"1-sentence description"},...] }
   • 3–5 events in chronological order.

8. type:"progress"
   { "type":"progress","accentColor":"#hex","title":"progress title","subtitle":"one-line context","items":[{"label":"Metric name","value":NUMBER,"max":NUMBER,"unit":"unit string or %"},...] }
   • 3–6 items. value must be ≤ max.

9. type:"metric_grid"
   { "type":"metric_grid","accentColor":"#hex","title":"grid title","subtitle":"one-line context","metrics":[{"label":"Metric name","value":"formatted value","unit":"unit","change":"e.g. +12%","trend":"up|down|neutral"},...] }
   • 4–6 metrics.

━━━ CONTENT & SELECTION RULES ━━━
• Use REAL data and numbers from the content — never invent figures.
• Never repeat the same type twice in one response.
• Choose types that best match what the content actually contains:
  stat / donut / bar / progress → when there are specific numbers or percentages
  steps → when there is a sequential process or how-to list
  comparison → when there is a before/after, pros/cons, or A-vs-B contrast
  quote → when there is a punchy, memorable standalone sentence
  timeline → when there are events, milestones, or a sequence across time
  metric_grid → when there are 4+ related metrics or KPIs worth comparing
• If content lacks numerical data, prefer: steps, comparison, quote, timeline.
• Return exactly 4 or 5 objects.`;

async function openRouterChat({ apiKey, model, systemPrompt, userContent, maxTokens = 2200, temperature = 0.55, referer, appTitle }) {
	const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
			...(referer ? { "HTTP-Referer": referer } : {}),
			...(appTitle ? { "X-Title": appTitle } : {}),
		},
		body: JSON.stringify({
			model,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userContent },
			],
			temperature,
			max_tokens: maxTokens,
		}),
	});

	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(
			data?.error?.message ||
			data?.error ||
			`OpenRouter request failed (${response.status})`,
		);
	}

	const content = data?.choices?.[0]?.message?.content;
	if (!content) throw new Error("OpenRouter returned an empty response");
	return content;
}

function stripHtml(html) {
	return (html || "")
		.replace(/<[^>]+>/g, " ")
		.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const openRouterKey = process.env.OPENROUTER_API_KEY;
		if (!openRouterKey) {
			return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured" });
		}

		const { content, title = "Draft", idToken, excludeTypes = [] } = req.body || {};

		// Require a signed Firebase ID token — verified server-side
		if (!idToken) {
			return res.status(401).json({ error: "Authentication required. Please sign in." });
		}

		let verifiedUid;
		try {
			verifiedUid = await verifyFirebaseToken(idToken);
		} catch (authErr) {
			return res.status(401).json({ error: authErr.message });
		}

		// Rate limit — per IP and per user
		const rateLimit = await checkRateLimit(req, { identifier: verifiedUid });
		if (!rateLimit.allowed) {
			return res.status(429).json({
				error: "Too many requests. Please try again later.",
				retryAfter: rateLimit.resetIn,
			});
		}

		if (!content || !stripHtml(content).length) {
			return res.status(400).json({ error: "Content is required — add some text to your draft first" });
		}

		const creditCheck = await checkAndDeductCredit(verifiedUid, 1);
		if (!creditCheck.allowed) {
			return res.status(429).json({ error: creditCheck.error });
		}

		const model = String(process.env.OPENROUTER_MODEL || "").trim() || "openai/gpt-4o-mini";
		const referer = process.env.OPENROUTER_HTTP_REFERER || (req.headers.origin ? String(req.headers.origin) : undefined);
		const appTitle = process.env.OPENROUTER_APP_TITLE || "Inkgest";

		const cleanContent = stripHtml(content).slice(0, 12000);

		// Build exclusion note for "Generate more" rounds
		const exclusionNote = excludeTypes.length > 0
			? `\n\nIMPORTANT: The following types were already shown — DO NOT use them again: ${excludeTypes.join(", ")}. Choose entirely different types from the remaining options and focus on data points not yet visualised.`
			: "";

		const userMessage = `Here is the content to analyse:\n\nTitle: ${title}\n\n${cleanContent}${exclusionNote}`;

		const raw = await openRouterChat({
			apiKey: openRouterKey,
			model,
			systemPrompt: SYSTEM_PROMPT,
			userContent: userMessage,
			maxTokens: 2200,
			temperature: 0.55,
			referer,
			appTitle,
		});

		let infographics;
		try {
			const clean = raw.replace(/```json|```/gi, "").trim();
			infographics = JSON.parse(clean);
		} catch {
			throw new Error("Could not parse infographic data from the AI response. Please try again.");
		}

		if (!Array.isArray(infographics) || infographics.length === 0) {
			throw new Error("No infographics were returned. Try adding more content to your draft.");
		}

		return res.status(200).json({ success: true, infographics, count: infographics.length });
	} catch (error) {
		console.error("[infographics-generate]", error);
		return res.status(500).json({ error: error?.message || "Failed to generate infographics" });
	}
}
