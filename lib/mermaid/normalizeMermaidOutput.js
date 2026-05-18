/**
 * Server-side normalization + validation for model-produced Mermaid source.
 */

const DIAGRAM_HINT =
	/\b(flowchart|graph\b|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie\b|mindmap|timeline|sankey|gitGraph|quadrantChart|block-beta|requirementDiagram|c4Context|c4Container|c4Component)\b/i;

export function stripMermaidFences(text) {
	let t = String(text ?? "").trim();
	const fenced = t.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
	if (fenced) t = fenced[1].trim();
	return t.replace(/^\uFEFF/, "").trim();
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeAndValidateMermaid(raw) {
	const code = stripMermaidFences(raw);
	if (!code || code.length > 14_000) {
		throw new Error("Diagram empty or too large.");
	}
	if (/<script\b/i.test(code) || /javascript:/i.test(code)) {
		throw new Error("Unsafe content rejected.");
	}
	if (!DIAGRAM_HINT.test(code)) {
		throw new Error("Output does not look like Mermaid syntax.");
	}
	return code;
}

/**
 * Throws if Mermaid cannot parse `code` (Mermaid.js v11, strict security).
 * Intended for Node/API validation — matches browser render constraints.
 */
export async function validateMermaidParses(code) {
	const trimmed = String(code ?? "").trim();
	if (!trimmed) throw new Error("Diagram empty.");
	const mermaid = (await import("mermaid")).default;
	await mermaid.initialize({
		startOnLoad: false,
		securityLevel: "strict",
		theme: "neutral",
	});
	await mermaid.parse(trimmed);
}
