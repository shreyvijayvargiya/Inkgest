/**
 * Creative briefs aligned with infographic “story types”.
 * Passed to /api/infographics/generate as natural-language direction.
 */

export const INFOGRAPHIC_CREATIVE_FORMATS = [
	{
		id: "mindmap",
		label: "Mindmap",
		brief:
			"Central concept with branching sub-themes — hub-and-spoke or tree relationships, minimal text per node.",
	},
	{
		id: "process",
		label: "Process",
		brief:
			"A clear sequential or workflow layout — numbered steps or linear stages with verbs and outcomes.",
	},
	{
		id: "data",
		label: "Data",
		brief:
			"Evidence-led visuals — donut, bars, metric grid, or comparative stats anchored in numbers from the source.",
	},
	{
		id: "timelines",
		label: "Timelines",
		brief:
			"Ordered chronology — dates or phases with milestones; prefer timeline-oriented card types.",
	},
	{
		id: "comparison",
		label: "Comparison",
		brief:
			"Contrast two or more sides — pros/cons matrices, stacked comparisons, dual columns.",
	},
	{
		id: "business_frameworks",
		label: "Business Frameworks",
		brief:
			"Leverage recognizable strategy patterns — 2×2, pillars, flywheel, pyramid, roadmap phases when they fit.",
	},
	{
		id: "brainstorming",
		label: "Brainstorming",
		brief:
			"Divergent ideation clusters — loosely grouped sparks, verbs, bullets; exploratory tone.",
	},
	{
		id: "parts_of_a_whole",
		label: "Parts of a whole",
		brief:
			"Explain composition — shares of a whole, donut/pie metaphor, constituent layers.",
	},
	{
		id: "problems_and_solutions",
		label: "Problems and Solutions",
		brief:
			"Tension → resolution arcs — pains, blockers and matching fixes / outcomes paired clearly.",
	},
	{
		id: "visual_metaphors",
		label: "Visual Metaphors",
		brief:
			"A single memorable metaphor scaffold — iceberg, funnel, compass, lighthouse, journeys with labels.",
	},
	{
		id: "narrative",
		label: "Narrative",
		brief:
			"A story-forward arc — exposition, catalyst, midpoint, payoff; captions should read sequentially.",
	},
	{
		id: "cause_and_effect",
		label: "Cause and Effect",
		brief:
			"Causal chains — drivers → downstream effects or feedback loops expressed as linked nodes.",
	},
	{
		id: "hierarchy",
		label: "Hierarchy",
		brief:
			"Tiers / org / importance ranking — ladders, pyramid levels, branching authority or priority.",
	},
];

/** @returns {readonly string[]} */
export const INFOGRAPHIC_FORMAT_IDS = INFOGRAPHIC_CREATIVE_FORMATS.map((f) => f.id);

/**
 * Resolve user/model input to a canonical format id or null.
 * @param {string | undefined | null} raw
 */
export function resolveInfographicCreativeFormatId(raw) {
	if (raw == null || String(raw).trim() === "") return null;
	const s = String(raw).trim().toLowerCase().replace(/\s+/g, "_");
	const hit = INFOGRAPHIC_CREATIVE_FORMATS.find(
		(f) =>
			f.id === s ||
			f.label.toLowerCase() === raw.trim().toLowerCase() ||
			f.label.toLowerCase().replace(/\s+/g, "_") === s,
	);
	return hit?.id ?? null;
}

export function infographicFormatLabelFor(id) {
	return INFOGRAPHIC_CREATIVE_FORMATS.find((f) => f.id === id)?.label ?? "";
}
