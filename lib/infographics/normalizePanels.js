/**
 * Normalizes LLM JSON into InfographicCard-compatible panel objects.
 */

const ALLOWED = new Set([
	"donut",
	"bar",
	"steps",
	"comparison",
	"stat",
	"quote",
	"timeline",
	"progress",
	"metric_grid",
]);

const TYPE_ALIASES = {
	donut_chart: "donut",
	pie: "donut",
	bar_chart: "bar",
	column: "bar",
	process: "steps",
	flow: "steps",
	compare: "comparison",
	stats: "stat",
	kpi: "stat",
	metrics: "metric_grid",
	metricgrid: "metric_grid",
	grid: "metric_grid",
};

function str(v, fb = "") {
	if (v == null) return fb;
	const s = String(v).trim();
	return s || fb;
}

function num(v, fb = 0) {
	const n = Number(v);
	return Number.isFinite(n) ? n : fb;
}

/**
 * @param {unknown} raw
 * @param {Set<string>} excludeTypes
 * @returns {object | null}
 */
export function normalizeInfographicPanel(raw, excludeTypes) {
	if (!raw || typeof raw !== "object") return null;
	let type = str(raw.type, "steps")
		.toLowerCase()
		.replace(/\s+/g, "_");
	type = TYPE_ALIASES[type] || type;
	if (!ALLOWED.has(type)) type = "steps";
	if (excludeTypes.has(type)) return null;

	const accent =
		typeof raw.accentColor === "string" && /^#[0-9A-Fa-f]{3,8}$/.test(raw.accentColor.trim())
			? raw.accentColor.trim()
			: undefined;
	const extra = accent ? { accentColor: accent } : {};
	const title = str(raw.title, "Untitled");
	const subtitle = str(raw.subtitle, "");

	switch (type) {
		case "donut": {
			let segments = Array.isArray(raw.segments) ? raw.segments : [];
			segments = segments
				.map((s) => ({
					label: str(s?.label, "Segment"),
					value: Math.max(0, num(s?.value, 0)),
				}))
				.filter((s) => s.label && s.value > 0);
			if (segments.length < 2) {
				segments = [
					{ label: "Primary", value: 55 },
					{ label: "Rest", value: 45 },
				];
			}
			return {
				type: "donut",
				title,
				subtitle,
				segments,
				centerValue: raw.centerValue != null ? str(raw.centerValue) : undefined,
				centerLabel: raw.centerLabel ? str(raw.centerLabel) : undefined,
				...extra,
			};
		}
		case "bar": {
			let bars = Array.isArray(raw.bars) ? raw.bars : [];
			bars = bars
				.map((b) => ({
					label: str(b?.label, "Item"),
					value: num(b?.value, 0),
				}))
				.filter((b) => b.label && b.value >= 0);
			if (bars.length < 2) {
				bars = [
					{ label: "A", value: 72 },
					{ label: "B", value: 48 },
				];
			}
			return {
				type: "bar",
				title,
				subtitle,
				yLabel: raw.yLabel ? str(raw.yLabel) : "",
				bars,
				...extra,
			};
		}
		case "steps": {
			let steps = Array.isArray(raw.steps) ? raw.steps : [];
			steps = steps
				.map((s) => ({
					title: str(s?.title, "Step"),
					body: str(s?.body, ""),
				}))
				.filter((s) => s.title || s.body);
			if (steps.length < 2) {
				steps = [
					{ title: "Step 1", body: "First move." },
					{ title: "Step 2", body: "Next action." },
				];
			}
			return { type: "steps", title, subtitle, steps, ...extra };
		}
		case "comparison": {
			const left = raw.left && typeof raw.left === "object" ? raw.left : {};
			const right = raw.right && typeof raw.right === "object" ? raw.right : {};
			const li = Array.isArray(left.items)
				? left.items.map((x) => str(x)).filter(Boolean)
				: [];
			const ri = Array.isArray(right.items)
				? right.items.map((x) => str(x)).filter(Boolean)
				: [];
			return {
				type: "comparison",
				title,
				left: {
					label: str(left.label, "Option A"),
					items: li.length ? li : ["Point one", "Point two"],
				},
				right: {
					label: str(right.label, "Option B"),
					items: ri.length ? ri : ["Point one", "Point two"],
				},
				...extra,
			};
		}
		case "stat":
			return {
				type: "stat",
				title,
				stat: str(raw.stat, "—"),
				unit: str(raw.unit, ""),
				subtitle: subtitle || undefined,
				context: raw.context ? str(raw.context) : undefined,
				...extra,
			};
		case "quote": {
			const quote = str(raw.quote, "");
			if (!quote) return null;
			return {
				type: "quote",
				quote,
				author: raw.author ? str(raw.author) : "",
				source: raw.source ? str(raw.source) : "",
				...extra,
			};
		}
		case "timeline": {
			let events = Array.isArray(raw.events) ? raw.events : [];
			events = events
				.map((e) => ({
					label: e?.label != null ? str(e.label) : "",
					title: str(e?.title, "Milestone"),
					detail: str(e?.detail, ""),
				}))
				.filter((e) => e.title || e.detail);
			if (events.length < 2) {
				events = [
					{ label: "Phase 1", title: "Start", detail: "Kickoff" },
					{ label: "Phase 2", title: "Ship", detail: "Delivery" },
				];
			}
			return { type: "timeline", title, subtitle, events, ...extra };
		}
		case "progress": {
			let items = Array.isArray(raw.items) ? raw.items : [];
			items = items
				.map((it) => ({
					label: str(it?.label, "Track"),
					value: num(it?.value, 0),
					max: Math.max(1, num(it?.max, 100)),
					unit: it?.unit != null ? str(it.unit) : "",
				}))
				.filter((it) => it.label);
			if (items.length < 2) {
				items = [
					{ label: "Done", value: 72, max: 100, unit: "%" },
					{ label: "Remaining", value: 28, max: 100, unit: "%" },
				];
			}
			return { type: "progress", title, subtitle, items, ...extra };
		}
		case "metric_grid": {
			let metrics = Array.isArray(raw.metrics) ? raw.metrics : [];
			metrics = metrics
				.map((m) => ({
					label: str(m?.label, "Metric"),
					value: str(m?.value, "—"),
					unit: m?.unit != null ? str(m.unit) : "",
					change: m?.change != null ? str(m.change) : "",
					trend: ["up", "down", "flat"].includes(str(m?.trend).toLowerCase())
						? str(m.trend).toLowerCase()
						: "flat",
				}))
				.filter((m) => m.label);
			if (metrics.length < 2) {
				metrics = [
					{ label: "North star", value: "12.4", unit: "k", change: "+8%", trend: "up" },
					{ label: "Retention", value: "94", unit: "%", change: "+1%", trend: "up" },
				];
			}
			return { type: "metric_grid", title, subtitle, metrics, ...extra };
		}
		default:
			return null;
	}
}

/**
 * @param {unknown[]} arr
 * @param {string[]} excludeTypes
 * @param {number} maxPanels
 */
export function normalizeInfographicsBatch(arr, excludeTypes, maxPanels) {
	const ex = new Set((excludeTypes || []).map((t) => String(t).toLowerCase()));
	const list = Array.isArray(arr) ? arr : [];
	const out = [];
	for (const raw of list) {
		const p = normalizeInfographicPanel(raw, ex);
		if (p) out.push(p);
		if (out.length >= maxPanels) break;
	}
	return out.slice(0, maxPanels);
}
