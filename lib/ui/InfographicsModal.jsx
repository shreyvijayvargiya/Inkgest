/**
 * InfographicsModal — full-screen infographics generator
 *
 * Changes:
 *  • savedInfographics prop → loaded on first open, skips auto-generate
 *  • "Generate more" appends a new batch below existing cards (pagination)
 *  • accentColor field on every infographic drives per-card colour theming
 *  • 3 new renderer types: TimelineCard, ProgressCard, MetricGridCard (9 total)
 *  • excludeTypes passed to API so new batches are always different
 *
 * Props:
 *   open              boolean
 *   onClose           () => void
 *   content           string  — editor HTML
 *   title             string  — draft title
 *   userId            string
 *   draftId           string
 *   savedInfographics array   — draft.infographics from Firestore (may be empty)
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../config/firebase";

/* ─── Builds a fully self-contained HTML file from a card's rendered DOM ─── */
function wrapStandaloneHTML(innerHTML, igType = "") {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Infographic — ${igType}</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Outfit', sans-serif;
    background: #ffffff;
    -webkit-font-smoothing: antialiased;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-height: 100vh;
    padding: 40px 24px;
  }
  .ig-root { width: 100%; max-width: 520px; }
  /* Restore framer-motion inline transforms to static */
  [style*="transform"] { transform: none !important; }
</style>
</head>
<body>
<div class="ig-root">
${innerHTML}
</div>
</body>
</html>`;
}

/* ── App light tokens (modal chrome) ── */
const T = {
	base: "#F7F5F0",
	surface: "#FFFFFF",
	accent: "#1A1A1A",
	warm: "#C17B2F",
	muted: "#7A7570",
	border: "#E8E4DC",
};

/* ── Light card tokens ── */
const D = {
	bg: "#F7F5F0",      // canvas / modal body
	surface: "#F0ECE5", // inner panel surfaces
	card: "#FFFFFF",    // card background — white
	border: "#E8E4DC",  // borders
	text: "#1A1A1A",    // primary text
	muted: "#7A7570",   // secondary text
	dim: "#9A9590",     // tertiary text
};

const GEN_STEPS = [
	"Reading content…",
	"Identifying data points & insights…",
	"Selecting optimal chart types…",
	"Designing visual layouts…",
	"Finalising infographics…",
];

/* Default accent per type — overridden by accentColor from AI */
const TYPE_DEFAULT_ACCENT = {
	donut: "#5B8FA8",
	bar: "#7C9D6F",
	steps: "#9B7DB5",
	comparison: "#C17B2F",
	stat: "#E8D5B0",
	quote: "#888888",
	timeline: "#E86F4A",
	progress: "#6C63FF",
	metric_grid: "#2ECCAA",
};

function accent(ig) {
	return ig.accentColor || TYPE_DEFAULT_ACCENT[ig.type] || "#C17B2F";
}

/* ════════════════════════════════════════════════
   CHART RENDERERS  (9 types)
════════════════════════════════════════════════ */

/* 1. Donut chart */
function DonutChart({ data }) {
	const { title, subtitle, segments = [], centerValue, centerLabel } = data;
	const col = accent(data);
	const total = segments.reduce((s, x) => s + (x.value || 0), 0) || 1;
	const palette = [col, `${col}BB`, `${col}77`, "#E8D5B0", "#5B8FA8"];
	let cum = 0;
	const r = 70, cx = 90, cy = 90, sw = 28, circ = 2 * Math.PI * r;

	const arcs = segments.map((seg, i) => {
		const pct = (seg.value || 0) / total;
		const dash = pct * circ;
		const offset = circ - cum * circ;
		cum += pct;
		return { dash, offset, color: palette[i % palette.length], label: seg.label, value: seg.value };
	});

	return (
		<div style={{ background: D.card, borderRadius: 18, padding: "28px 24px", border: `1px solid ${D.border}` }}>
			<p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: col, marginBottom: 6 }}>Donut Chart</p>
			<p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: D.text, marginBottom: subtitle ? 4 : 20, lineHeight: 1.3 }}>{title}</p>
			{subtitle && <p style={{ fontSize: 13, color: D.muted, marginBottom: 20 }}>{subtitle}</p>}
			<div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
				<svg width={180} height={180} viewBox="0 0 180 180" style={{ flexShrink: 0 }}>
					<circle cx={cx} cy={cy} r={r} fill="none" stroke={D.border} strokeWidth={sw} />
					{arcs.map((a, i) => (
						<circle key={i} cx={cx} cy={cy} r={r} fill="none"
							stroke={a.color} strokeWidth={sw}
							strokeDasharray={`${a.dash} ${circ - a.dash}`}
							strokeDashoffset={a.offset}
							strokeLinecap="round"
							style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px`, transition: "stroke-dasharray 1s ease" }}
						/>
					))}
					{centerValue && (
						<>
							<text x={cx} y={cy - 6} textAnchor="middle" style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, fill: D.text, fontWeight: 700 }}>{centerValue}</text>
							<text x={cx} y={cy + 14} textAnchor="middle" style={{ fontFamily: "Outfit,sans-serif", fontSize: 10, fill: D.muted }}>{centerLabel}</text>
						</>
					)}
				</svg>
				<div style={{ flex: 1, minWidth: 120 }}>
					{arcs.map((a, i) => (
						<div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
							<div style={{ width: 10, height: 10, borderRadius: 3, background: a.color, flexShrink: 0 }} />
							<div style={{ flex: 1 }}>
								<div style={{ display: "flex", justifyContent: "space-between" }}>
									<span style={{ fontSize: 13, color: D.text, fontWeight: 500 }}>{a.label}</span>
									<span style={{ fontSize: 13, color: D.muted, fontWeight: 700 }}>{a.value}%</span>
								</div>
								<div style={{ height: 3, background: D.border, borderRadius: 100, marginTop: 4, overflow: "hidden" }}>
									<motion.div initial={{ width: 0 }} animate={{ width: `${(a.value / total) * 100}%` }}
										transition={{ delay: i * 0.1 + 0.3, duration: 0.7 }}
										style={{ height: "100%", background: a.color, borderRadius: 100 }} />
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

/* 2. Bar chart */
function BarChart({ data }) {
	const { title, subtitle, bars = [], yLabel } = data;
	const col = accent(data);
	const max = Math.max(...bars.map(b => b.value || 0), 1);
	const W = 300, H = 140, pad = 36, count = bars.length || 1;
	const barW = Math.min(38, (W - pad * 2) / count - 6);

	return (
		<div style={{ background: D.card, borderRadius: 18, padding: "28px 24px", border: `1px solid ${D.border}` }}>
			<p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: col, marginBottom: 6 }}>Bar Chart</p>
			<p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: D.text, marginBottom: subtitle ? 4 : 16, lineHeight: 1.3 }}>{title}</p>
			{subtitle && <p style={{ fontSize: 13, color: D.muted, marginBottom: 16 }}>{subtitle}</p>}
			<svg width="100%" viewBox={`0 0 ${W} ${H + 44}`} style={{ overflow: "visible" }}>
				{[0, 25, 50, 75, 100].map(pct => {
					const y = pad + (H - pad) * (1 - pct / 100);
					return (
						<g key={pct}>
							<line x1={pad} y1={y} x2={W - 8} y2={y} stroke={D.border} strokeWidth={1} />
							<text x={pad - 6} y={y + 4} textAnchor="end" style={{ fontSize: 9, fill: D.muted, fontFamily: "Outfit" }}>
								{Math.round(max * pct / 100)}{yLabel || ""}
							</text>
						</g>
					);
				})}
				{bars.map((b, i) => {
					const slot = (W - pad * 2) / count;
					const x = pad + i * slot + (slot - barW) / 2;
					const bH = Math.max(2, (b.value / max) * (H - pad));
					return (
						<g key={i}>
							<motion.rect x={x} y={H - bH} width={barW} height={bH} rx={6}
								fill={i === 0 ? col : `${col}66`}
								initial={{ height: 0, y: H }} animate={{ height: bH, y: H - bH }}
								transition={{ delay: i * 0.08 + 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
							/>
							<text x={x + barW / 2} y={H - bH - 7} textAnchor="middle"
								style={{ fontSize: 10, fill: col, fontWeight: 700, fontFamily: "Outfit" }}>
								{b.value}{yLabel || ""}
							</text>
							<text x={x + barW / 2} y={H + 18} textAnchor="middle"
								style={{ fontSize: 10, fill: D.muted, fontFamily: "Outfit" }}>
								{b.label}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}

/* 3. Step flow */
function StepFlow({ data }) {
	const { title, subtitle, steps = [] } = data;
	const col = accent(data);
	const palette = [col, `${col}BB`, `${col}88`, `${col}66`, `${col}44`];
	return (
		<div style={{ background: D.card, borderRadius: 18, padding: "28px 24px", border: `1px solid ${D.border}` }}>
			<p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: col, marginBottom: 6 }}>Process Flow</p>
			<p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: D.text, marginBottom: subtitle ? 4 : 20, lineHeight: 1.3 }}>{title}</p>
			{subtitle && <p style={{ fontSize: 13, color: D.muted, marginBottom: 20 }}>{subtitle}</p>}
			<div style={{ position: "relative" }}>
				<div style={{ position: "absolute", left: 19, top: 20, bottom: 20, width: 2, background: `linear-gradient(to bottom, ${col}, ${col}22)`, borderRadius: 100 }} />
				{steps.map((step, i) => (
					<motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
						transition={{ delay: i * 0.12 + 0.1, duration: 0.45 }}
						style={{ display: "flex", gap: 16, marginBottom: i < steps.length - 1 ? 20 : 0, position: "relative" }}
					>
						<div style={{ width: 40, height: 40, borderRadius: 12, background: `${palette[i % palette.length]}22`, border: `2px solid ${palette[i % palette.length]}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
							<span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 16, color: col, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</span>
						</div>
						<div style={{ paddingTop: 8, flex: 1 }}>
							<p style={{ fontSize: 14, fontWeight: 700, color: D.text, marginBottom: 3 }}>{step.title}</p>
							<p style={{ fontSize: 13, color: D.muted, lineHeight: 1.6 }}>{step.body}</p>
						</div>
					</motion.div>
				))}
			</div>
		</div>
	);
}

/* 4. Comparison */
function ComparisonCard({ data }) {
	const { title, left, right } = data;
	return (
		<div style={{ background: D.card, borderRadius: 18, padding: "28px 24px", border: `1px solid ${D.border}` }}>
			<p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: accent(data), marginBottom: 6 }}>Comparison</p>
			<p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: D.text, marginBottom: 20, lineHeight: 1.3 }}>{title}</p>
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
				{[
					{ ...left, icon: "✕", bg: "rgba(239,68,68,0.08)", borderCol: "rgba(239,68,68,0.2)", iconColor: "#EF4444" },
					{ ...right, icon: "✓", bg: "rgba(124,157,111,0.12)", borderCol: "rgba(124,157,111,0.3)", iconColor: "#7C9D6F" },
				].map((col, i) => (
					<div key={i} style={{ background: col.bg, borderRadius: 12, padding: "18px 14px", border: `1px solid ${col.borderCol}` }}>
						<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
							<div style={{ width: 22, height: 22, borderRadius: "50%", background: col.borderCol, display: "flex", alignItems: "center", justifyContent: "center" }}>
								<span style={{ color: col.iconColor, fontSize: 11, fontWeight: 900 }}>{col.icon}</span>
							</div>
							<p style={{ fontSize: 12, fontWeight: 700, color: col.iconColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>{col.label}</p>
						</div>
						{(col.items || []).map((item, j) => (
							<div key={j} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
								<span style={{ color: col.iconColor, fontSize: 11, flexShrink: 0, lineHeight: 1.8 }}>{col.icon}</span>
								<p style={{ fontSize: 12.5, color: D.dim, lineHeight: 1.6 }}>{item}</p>
							</div>
						))}
					</div>
				))}
			</div>
		</div>
	);
}

/* 5. Stat hero */
function StatCard({ data }) {
	const { title, stat, unit, subtitle, context } = data;
	const col = accent(data);
	return (
		<div style={{ background: `linear-gradient(135deg, #FBF3E4 0%, ${D.card} 100%)`, borderRadius: 18, padding: "36px 28px", border: `1px solid ${col}44`, position: "relative", overflow: "hidden" }}>
			<div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${col}28 0%, transparent 70%)` }} />
			<div style={{ position: "absolute", bottom: -20, left: -20, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${col}12 0%, transparent 70%)` }} />
			<p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: col, marginBottom: 14, position: "relative", zIndex: 1 }}>Key Stat</p>
			<div style={{ position: "relative", zIndex: 1 }}>
				<motion.p initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
					style={{ fontFamily: "'Instrument Serif',serif", fontSize: 72, lineHeight: 1, color: col, letterSpacing: "-3px", marginBottom: 4 }}>
					{stat}<span style={{ fontSize: 32, color: col }}>{unit}</span>
				</motion.p>
				<p style={{ fontSize: 16, fontWeight: 600, color: D.text, lineHeight: 1.5, maxWidth: 280, marginBottom: 12 }}>{title}</p>
				{subtitle && <p style={{ fontSize: 13, color: D.muted, lineHeight: 1.6 }}>{subtitle}</p>}
				{context && <p style={{ fontSize: 11, color: D.border, marginTop: 16, paddingTop: 12, borderTop: `1px solid ${D.border}` }}>{context}</p>}
			</div>
		</div>
	);
}

/* 6. Quote pull */
function QuoteCard({ data }) {
	const { quote, author, source } = data;
	const col = accent(data);
	return (
		<div style={{ background: D.surface, borderRadius: 18, padding: "36px 28px", border: `1px solid ${D.border}`, position: "relative", overflow: "hidden" }}>
			<div style={{ position: "absolute", top: 14, left: 20 }}>
				<svg width="52" height="40" viewBox="0 0 52 40">
					<text y="40" style={{ fontFamily: "'Instrument Serif',serif", fontSize: 80, fill: col, opacity: 0.2 }}>{'"'}</text>
				</svg>
			</div>
			<div style={{ position: "relative", zIndex: 1, paddingTop: 16 }}>
				<p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: D.text, lineHeight: 1.6, fontStyle: "italic", marginBottom: 20 }}>
					{`"${quote}"`}
				</p>
				<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
					<div style={{ width: 32, height: 2, background: col, borderRadius: 100 }} />
					<div>
						{author && <p style={{ fontSize: 13, fontWeight: 700, color: D.text }}>{author}</p>}
						{source && <p style={{ fontSize: 12, color: D.muted }}>{source}</p>}
					</div>
				</div>
			</div>
		</div>
	);
}

/* 7. Timeline */
function TimelineCard({ data }) {
	const { title, subtitle, events = [] } = data;
	const col = accent(data);
	return (
		<div style={{ background: D.card, borderRadius: 18, padding: "28px 24px", border: `1px solid ${D.border}` }}>
			<p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: col, marginBottom: 6 }}>Timeline</p>
			<p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: D.text, marginBottom: subtitle ? 4 : 24, lineHeight: 1.3 }}>{title}</p>
			{subtitle && <p style={{ fontSize: 13, color: D.muted, marginBottom: 24 }}>{subtitle}</p>}
			<div style={{ position: "relative" }}>
				{/* Horizontal rail */}
				<div style={{ height: 2, background: `linear-gradient(to right, ${col}, ${col}22)`, borderRadius: 100, marginBottom: 0, position: "relative" }}>
					{events.map((_, i) => (
						<div key={i} style={{
							position: "absolute",
							left: `${(i / Math.max(events.length - 1, 1)) * 100}%`,
							top: "50%", transform: "translate(-50%, -50%)",
							width: 12, height: 12, borderRadius: "50%",
							background: col, border: `2px solid ${D.card}`,
							zIndex: 2,
						}} />
					))}
				</div>
				{/* Event labels below rail */}
				<div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, gap: 8 }}>
					{events.map((ev, i) => (
						<motion.div key={i}
							initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
							transition={{ delay: i * 0.1 + 0.2, duration: 0.4 }}
							style={{ flex: 1, minWidth: 0 }}
						>
							<p style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 3, textAlign: "center" }}>{ev.label}</p>
							<p style={{ fontSize: 12, fontWeight: 600, color: D.text, marginBottom: 3, textAlign: "center", lineHeight: 1.3 }}>{ev.title}</p>
							<p style={{ fontSize: 11, color: D.muted, textAlign: "center", lineHeight: 1.5 }}>{ev.detail}</p>
						</motion.div>
					))}
				</div>
			</div>
		</div>
	);
}

/* 8. Progress bars */
function ProgressCard({ data }) {
	const { title, subtitle, items = [] } = data;
	const col = accent(data);
	const palette = [col, `${col}CC`, `${col}99`, "#5B8FA8", "#7C9D6F", "#9B7DB5"];
	return (
		<div style={{ background: D.card, borderRadius: 18, padding: "28px 24px", border: `1px solid ${D.border}` }}>
			<p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: col, marginBottom: 6 }}>Progress</p>
			<p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: D.text, marginBottom: subtitle ? 4 : 20, lineHeight: 1.3 }}>{title}</p>
			{subtitle && <p style={{ fontSize: 13, color: D.muted, marginBottom: 20 }}>{subtitle}</p>}
			<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
				{items.map((item, i) => {
					const pct = Math.min(100, Math.round(((item.value || 0) / (item.max || 100)) * 100));
					const barCol = palette[i % palette.length];
					return (
						<div key={i}>
							<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
								<span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{item.label}</span>
								<span style={{ fontSize: 13, fontWeight: 700, color: barCol }}>
									{item.value}{item.unit ? ` ${item.unit}` : ""}
								</span>
							</div>
							<div style={{ height: 8, background: D.border, borderRadius: 100, overflow: "hidden" }}>
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${pct}%` }}
									transition={{ delay: i * 0.1 + 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
									style={{ height: "100%", borderRadius: 100, background: `linear-gradient(90deg, ${barCol}, ${barCol}BB)` }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

/* 9. Metric grid */
function MetricGridCard({ data }) {
	const { title, subtitle, metrics = [] } = data;
	const col = accent(data);
	const trendIcon = (t) => t === "up" ? "↑" : t === "down" ? "↓" : "→";
	const trendColor = (t) => t === "up" ? "#7C9D6F" : t === "down" ? "#EF4444" : D.muted;
	return (
		<div style={{ background: D.card, borderRadius: 18, padding: "28px 24px", border: `1px solid ${D.border}` }}>
			<p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: col, marginBottom: 6 }}>Metrics</p>
			<p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 20, color: D.text, marginBottom: subtitle ? 4 : 20, lineHeight: 1.3 }}>{title}</p>
			{subtitle && <p style={{ fontSize: 13, color: D.muted, marginBottom: 20 }}>{subtitle}</p>}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
				{metrics.map((m, i) => (
					<motion.div key={i}
						initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
						transition={{ delay: i * 0.08 + 0.15, duration: 0.4 }}
						style={{ background: D.surface, borderRadius: 12, padding: "16px 14px", border: `1px solid ${col}22` }}
					>
						<p style={{ fontSize: 11, color: D.muted, marginBottom: 6, fontWeight: 500 }}>{m.label}</p>
						<p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 26, color: col, lineHeight: 1, marginBottom: 4 }}>
							{m.value}<span style={{ fontSize: 14, color: D.muted, marginLeft: 3 }}>{m.unit}</span>
						</p>
						{m.change && (
							<p style={{ fontSize: 12, color: trendColor(m.trend), fontWeight: 600 }}>
								{trendIcon(m.trend)} {m.change}
							</p>
						)}
					</motion.div>
				))}
			</div>
		</div>
	);
}

/* Dispatcher */
function InfographicCard({ ig }) {
	switch (ig.type) {
		case "donut": return <DonutChart data={ig} />;
		case "bar": return <BarChart data={ig} />;
		case "steps": return <StepFlow data={ig} />;
		case "comparison": return <ComparisonCard data={ig} />;
		case "stat": return <StatCard data={ig} />;
		case "quote": return <QuoteCard data={ig} />;
		case "timeline": return <TimelineCard data={ig} />;
		case "progress": return <ProgressCard data={ig} />;
		case "metric_grid": return <MetricGridCard data={ig} />;
		default:
			return (
				<div style={{ background: D.card, borderRadius: 18, padding: 24, border: `1px solid ${D.border}` }}>
					<p style={{ color: D.muted, fontSize: 13 }}>Unknown type: {ig.type}</p>
				</div>
			);
	}
}

/* Divider between batches */
function BatchDivider({ number }) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			style={{
				display: "flex", alignItems: "center", gap: 14,
				margin: "8px 0 20px", breakInside: "avoid",
			}}
		>
			<div style={{ flex: 1, height: 1, background: D.border }} />
			<span style={{ fontSize: 11, fontWeight: 700, color: D.muted, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
				Generation {number}
			</span>
			<div style={{ flex: 1, height: 1, background: D.border }} />
		</motion.div>
	);
}

/* ════════════════════════════════════════════════
   MAIN MODAL
════════════════════════════════════════════════ */

export default function InfographicsModal({
	open,
	onClose,
	content,
	title,
	userId,
	draftId,
	savedInfographics = [],
}) {
	/**
	 * batches: array of arrays — each inner array is one generation round.
	 * allItems: flat list used for rendering type-filter pills.
	 */
	const [batches, setBatches] = useState([]);
	const [loading, setLoading] = useState(false);
	const [step, setStep] = useState(0);
	const [error, setError] = useState("");
	const [copied, setCopied] = useState(null);     // key for JSON copy
	const [copiedHtml, setCopiedHtml] = useState(null); // key for HTML copy
	const [copiedEmbed, setCopiedEmbed] = useState(null); // key for embed copy
	const [downloading, setDownloading] = useState({});   // { key: bool }
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const stepTimer = useRef(null);
	const hasAutoGenerated = useRef(false);

	const allItems = batches.flat();

	/* On open: restore saved infographics — never auto-call the API */
	useEffect(() => {
		if (!open) return;
		if (hasAutoGenerated.current) return; // already loaded this session
		hasAutoGenerated.current = true;

		if (savedInfographics.length > 0) {
			// Restore from Firestore — skip API call entirely
			setBatches([savedInfographics]);
		}
		// No auto-generate — user must click "Generate" explicitly
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	/* Reset only when modal actually closes so re-open restores from cache */
	useEffect(() => {
		if (!open) {
			// Keep hasAutoGenerated so re-opens don't reload; only reset if
			// we have no infographics (fresh session with nothing to show).
			if (batches.flat().length === 0) {
				hasAutoGenerated.current = false;
			}
		}
	}, [open, batches]);

	const generate = useCallback(async (isMore = false) => {
		if (loading) return;
		const plainText = (content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
		if (!plainText) {
			setError("No content in the editor. Write something first.");
			return;
		}

		setLoading(true);
		setError("");
		setStep(0);
		setSaved(false);

		let s = 0;
		stepTimer.current = setInterval(() => {
			s += 1;
			if (s < GEN_STEPS.length) setStep(s);
			else clearInterval(stepTimer.current);
		}, 500);

		// Tell the API which types are already showing so it picks different ones
		const excludeTypes = isMore ? allItems.map(ig => ig.type) : [];

		// Get a fresh signed ID token — proves the request comes from the real user
		const idToken = await auth.currentUser?.getIdToken();
		if (!idToken) {
			clearInterval(stepTimer.current);
			setLoading(false);
			setError("Session expired. Please sign in again.");
			return;
		}

		try {
			const res = await fetch("/api/automations/infographics-generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content, title, idToken, excludeTypes }),
			});
			clearInterval(stepTimer.current);

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Generation failed");

			const newBatch = data.infographics || [];
			if (isMore) {
				setBatches(prev => [...prev, newBatch]);
			} else {
				setBatches([newBatch]);
			}
		} catch (err) {
			setError(err.message || "Something went wrong. Please try again.");
		} finally {
			clearInterval(stepTimer.current);
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [content, title, userId, loading, allItems]);

	const handleCopy = (bIdx, iIdx) => {
		const ig = batches[bIdx]?.[iIdx];
		if (!ig) return;
		navigator.clipboard.writeText(JSON.stringify(ig, null, 2)).catch(() => { });
		const key = `${bIdx}-${iIdx}`;
		setCopied(key);
		setTimeout(() => setCopied(null), 2000);
	};

	const handleSaveAll = async () => {
		if (!draftId || allItems.length === 0 || saving) return;
		setSaving(true);
		try {
			await updateDoc(doc(db, "drafts", draftId), { infographics: allItems });
			setSaved(true);
			setTimeout(() => setSaved(false), 2500);
		} catch (err) {
			console.error("[InfographicsModal] save failed:", err);
		} finally {
			setSaving(false);
		}
	};

	/* ── Copy HTML ── */
	const handleCopyHtml = (bIdx, iIdx) => {
		const globalIdx = batches.slice(0, bIdx).reduce((s, b) => s + b.length, 0) + iIdx;
		const el = document.getElementById(`ig-content-${globalIdx}`);
		const ig = batches[bIdx]?.[iIdx];
		if (!el || !ig) return;
		const html = wrapStandaloneHTML(el.innerHTML, ig.type.replace(/_/g, " "));
		navigator.clipboard.writeText(html).catch(() => { });
		const key = `${bIdx}-${iIdx}`;
		setCopiedHtml(key);
		setTimeout(() => setCopiedHtml(null), 2200);
	};

	/* ── Copy Embed snippet ── */
	const handleCopyEmbed = (bIdx, iIdx) => {
		const globalIdx = batches.slice(0, bIdx).reduce((s, b) => s + b.length, 0) + iIdx;
		const el = document.getElementById(`ig-content-${globalIdx}`);
		const ig = batches[bIdx]?.[iIdx];
		if (!el || !ig) return;
		const snippet =
			`<!-- Infographic: ${ig.type} -->\n` +
			`<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">\n` +
			`<style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}` +
			`body{font-family:'Outfit',sans-serif;-webkit-font-smoothing:antialiased}</style>\n` +
			`<div style="max-width:520px;">\n${el.innerHTML}\n</div>`;
		navigator.clipboard.writeText(snippet).catch(() => { });
		const key = `${bIdx}-${iIdx}`;
		setCopiedEmbed(key);
		setTimeout(() => setCopiedEmbed(null), 2200);
	};

	/* ── Download PNG (html2canvas) ── */
	const handleDownloadPng = async (bIdx, iIdx) => {
		const globalIdx = batches.slice(0, bIdx).reduce((s, b) => s + b.length, 0) + iIdx;
		const el = document.getElementById(`ig-content-${globalIdx}`);
		const ig = batches[bIdx]?.[iIdx];
		if (!el || !ig) return;
		const key = `${bIdx}-${iIdx}`;
		setDownloading(prev => ({ ...prev, [key]: true }));
		try {
			const html2canvas = (await import("html2canvas")).default;
			const canvas = await html2canvas(el, {
				backgroundColor: "#ffffff",
				scale: 2,
				useCORS: true,
				allowTaint: true,
				logging: false,
			});
			const link = document.createElement("a");
			link.download = `infographic-${ig.type}-${Date.now()}.png`;
			link.href = canvas.toDataURL("image/png");
			link.click();
		} catch (err) {
			console.error("[InfographicsModal] download failed:", err);
		} finally {
			setDownloading(prev => ({ ...prev, [key]: false }));
		}
	};

	const accentOf = (ig) => ig.accentColor || TYPE_DEFAULT_ACCENT[ig.type] || "#C17B2F";

	return (
		<AnimatePresence>
			{open && (
				<>
					{/* Backdrop */}
					<motion.div
						key="ig-backdrop"
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						onClick={onClose}
						style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, backdropFilter: "blur(4px)" }}
					/>

					{/* Centering shell */}
					<motion.div
						key="ig-shell"
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						transition={{ duration: 0.22 }}
						style={{ position: "fixed", inset: 0, zIndex: 301, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}
					>
						{/* Modal panel */}
						<motion.div
							initial={{ scale: 0.95, y: 24 }}
							animate={{ scale: 1, y: 0 }}
							exit={{ scale: 0.95, y: 24 }}
							transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
							style={{
								width: "92vw", maxWidth: 1140, height: "90vh",
								background: T.surface,
								borderRadius: 16,
								border: `1px solid ${T.border}`,
								display: "flex", flexDirection: "column",
								boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
								overflow: "hidden", pointerEvents: "all",
							}}
						>
							{/* ── Header ── */}
							<div style={{ height: 56, flexShrink: 0, borderBottom: `1px solid ${T.border}`, background: T.surface, display: "flex", alignItems: "center", padding: "0 20px", gap: 12 }}>
								<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
									<svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={T.warm} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
										<line x1="18" y1="20" x2="18" y2="10" />
										<line x1="12" y1="20" x2="12" y2="4" />
										<line x1="6" y1="20" x2="6" y2="14" />
									</svg>
									<p style={{ fontSize: 15, fontWeight: 700, color: T.accent, fontFamily: "'Instrument Serif',serif" }}>Infographics</p>
								</div>

								<p style={{ fontSize: 12, color: T.muted }}>
									{loading
										? GEN_STEPS[step]
										: allItems.length > 0
											? `${allItems.length} infographic${allItems.length > 1 ? "s" : ""} · ${batches.length} generation${batches.length > 1 ? "s" : ""}`
											: "— AI generates visual charts from your draft"}
								</p>

								<div style={{ flex: 1 }} />

								{/* Save all */}
								{allItems.length > 0 && (
									<motion.button
										whileHover={{ background: saved ? "#DCFCE7" : "#F0ECE5" }}
										whileTap={{ scale: 0.97 }}
										onClick={handleSaveAll}
										disabled={saving}
										style={{
											display: "flex", alignItems: "center", gap: 6,
											background: saved ? "#F0FDF4" : T.base,
											border: `1px solid ${saved ? "#86EFAC" : T.border}`,
											borderRadius: 8, padding: "5px 12px",
											fontSize: 12, fontWeight: 600,
											color: saved ? "#16A34A" : T.accent,
											cursor: saving ? "not-allowed" : "pointer",
											transition: "all 0.2s",
										}}
									>
										{saved ? "✓ Saved" : saving ? "Saving…" : "Save to draft"}
									</motion.button>
								)}

								{/* Generate / Generate more */}
								<motion.button
									whileHover={!loading ? { background: T.warm, color: "white", borderColor: T.warm } : {}}
									whileTap={!loading ? { scale: 0.97 } : {}}
									onClick={() => generate(allItems.length > 0)}
									disabled={loading}
									style={{
										display: "flex", alignItems: "center", gap: 6,
										background: T.base, border: `1px solid ${T.border}`,
										borderRadius: 8, padding: "5px 12px",
										fontSize: 12, fontWeight: 600, color: T.accent,
										cursor: loading ? "not-allowed" : "pointer",
										opacity: loading ? 0.55 : 1, transition: "all 0.2s",
									}}
								>
									{loading ? (
										<motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", fontSize: 13 }}>⚙</motion.span>
									) : <span>↺</span>}
									{allItems.length > 0 ? "Generate more" : "Generate"}
								</motion.button>

								{/* Close */}
								<motion.button
									whileHover={{ background: "#F0ECE5" }} whileTap={{ scale: 0.95 }}
									onClick={onClose}
									style={{ background: "transparent", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, color: T.muted }}
								>✕</motion.button>
							</div>

							{/* ── Canvas ── */}
							<div style={{ flex: 1, background: D.bg, overflowY: "auto", padding: 24 }}>

								{/* Loading spinner */}
								{loading && (
									<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: allItems.length === 0 ? "center" : "flex-start", height: allItems.length === 0 ? "80%" : "auto", paddingTop: allItems.length > 0 ? 32 : 0, gap: 20 }}>
										<motion.div
											animate={{ rotate: 360 }}
											transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
											style={{ width: 48, height: 48, borderRadius: "50%", border: `3px solid ${D.border}`, borderTopColor: T.warm }}
										/>
										<div style={{ textAlign: "center" }}>
											<p style={{ fontSize: 14, fontWeight: 600, color: D.text, marginBottom: 4 }}>{GEN_STEPS[step]}</p>
											<p style={{ fontSize: 12, color: D.muted }}>
												{allItems.length > 0 ? "Adding more infographics…" : "Analysing your content with AI…"}
											</p>
										</div>
										<div style={{ width: 240, height: 3, background: D.border, borderRadius: 100, overflow: "hidden" }}>
											<motion.div
												animate={{ width: `${((step + 1) / GEN_STEPS.length) * 100}%` }}
												transition={{ duration: 0.5, ease: "easeOut" }}
												style={{ height: "100%", background: `linear-gradient(90deg, ${T.warm}, #E8A84A)`, borderRadius: 100 }}
											/>
										</div>
									</div>
								)}

								{/* Error */}
								{!loading && error && allItems.length === 0 && (
									<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60%", gap: 16 }}>
										<div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, padding: "20px 28px", maxWidth: 420, textAlign: "center" }}>
											<p style={{ fontSize: 14, color: "#FCA5A5", marginBottom: 14, lineHeight: 1.6 }}>⚠ {error}</p>
											<motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
												onClick={() => generate(false)}
												style={{ background: T.warm, color: "white", border: "none", borderRadius: 9, padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
												Try again
											</motion.button>
										</div>
									</div>
								)}

								{/* Error banner when adding more fails (existing results still show) */}
								{!loading && error && allItems.length > 0 && (
									<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
										style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
										<p style={{ fontSize: 13, color: "#FCA5A5", flex: 1 }}>⚠ {error}</p>
										<motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
											onClick={() => { setError(""); generate(true); }}
											style={{ background: T.warm, color: "white", border: "none", borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
											Retry
										</motion.button>
									</motion.div>
								)}

								{/* Empty state */}
								{!loading && !error && allItems.length === 0 && (
									<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60%", gap: 20 }}>
										<div style={{ width: 72, height: 72, borderRadius: 22, background: `${T.warm}1A`, border: `1px solid ${T.warm}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📊</div>
										<div style={{ textAlign: "center", maxWidth: 320 }}>
											<p style={{ fontSize: 16, fontWeight: 700, color: D.text, marginBottom: 8, fontFamily: "'Instrument Serif',serif" }}>Create infographics</p>
											<p style={{ fontSize: 13, color: D.muted, lineHeight: 1.6 }}>AI will analyse your draft and generate visual charts, stats, and data cards.</p>
										</div>
										<motion.button
											whileHover={{ scale: 1.04, background: T.warm }}
											whileTap={{ scale: 0.97 }}
											onClick={() => generate(false)}
											style={{
												display: "flex", alignItems: "center", gap: 8,
												background: T.accent, color: "white",
												border: "none", borderRadius: 10,
												padding: "11px 28px",
												fontSize: 14, fontWeight: 700,
												cursor: "pointer", transition: "all 0.2s",
											}}
										>
											<span style={{ fontSize: 16 }}>✦</span> Generate infographics
										</motion.button>
									</div>
								)}

								{/* Results — rendered batch by batch for pagination */}
								{allItems.length > 0 && (
									<>
										{/* Type pills — show all unique types across all batches */}
										<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
											{allItems.map((ig, i) => (
												<motion.div key={`${ig.type}-${i}`}
													initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
													transition={{ delay: (i % 5) * 0.06 }}
													onClick={() => document.getElementById(`ig-card-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
													style={{
														display: "flex", alignItems: "center", gap: 6,
														background: `${accentOf(ig)}18`,
														border: `1px solid ${accentOf(ig)}44`,
														borderRadius: 100, padding: "4px 12px", cursor: "pointer",
													}}
												>
													<div style={{ width: 6, height: 6, borderRadius: "50%", background: accentOf(ig) }} />
													<span style={{ fontSize: 11, fontWeight: 600, color: accentOf(ig), textTransform: "capitalize" }}>{ig.type.replace("_", " ")}</span>
												</motion.div>
											))}
										</div>

										{/* Paginated batches */}
										{batches.map((batch, batchIdx) => (
											<div key={batchIdx}>
												{/* Divider between batches */}
												{batchIdx > 0 && <BatchDivider number={batchIdx + 1} />}

												{/* Masonry grid for this batch */}
												<div style={{ columns: "2 360px", gap: 16 }}>
													{batch.map((ig, iIdx) => {
														const globalIdx = batches.slice(0, batchIdx).reduce((s, b) => s + b.length, 0) + iIdx;
														const copyKey = `${batchIdx}-${iIdx}`;
														return (
															<motion.div
																key={globalIdx}
																id={`ig-card-${globalIdx}`}
																initial={{ opacity: 0, y: 24 }}
																animate={{ opacity: 1, y: 0 }}
																transition={{ delay: iIdx * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
																style={{ breakInside: "avoid", marginBottom: 16 }}
															>
																<div
																	style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)", transition: "box-shadow 0.2s" }}
																	onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 28px rgba(0,0,0,0.12), 0 0 0 2px ${accentOf(ig)}55`; }}
																	onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)"; }}
																>
																	{/* Card chrome */}
																	<div style={{ background: D.surface, borderBottom: `1px solid ${D.border}`, padding: "9px 14px", display: "flex", alignItems: "center", gap: 8 }}>
																		<div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
																			<span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57", display: "inline-block" }} />
																			<span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E", display: "inline-block" }} />
																			<span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840", display: "inline-block" }} />
																		</div>
																		<div style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 6, padding: "2px 8px" }}>
																			<span style={{ fontSize: 11, fontWeight: 700, color: accentOf(ig), textTransform: "capitalize" }}>{ig.type.replace(/_/g, " ")}</span>
																		</div>
																		<div style={{ flex: 1 }} />
																		{/* Copy JSON */}
																		<motion.button
																			whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
																			onClick={() => handleCopy(batchIdx, iIdx)}
																			title="Copy raw JSON"
																			style={{
																				background: copied === copyKey ? `${accentOf(ig)}15` : "transparent",
																				border: `1px solid ${copied === copyKey ? accentOf(ig) : D.border}`,
																				borderRadius: 7, width: 28, height: 28,
																				display: "flex", alignItems: "center", justifyContent: "center",
																				cursor: "pointer", fontSize: 12,
																				color: copied === copyKey ? accentOf(ig) : D.muted,
																				transition: "all 0.15s",
																			}}
																		>
																			{copied === copyKey ? "✓" : "⎘"}
																		</motion.button>
																	</div>

																	{/* Infographic content — captured for export */}
																	<div id={`ig-content-${globalIdx}`}>
																		<InfographicCard ig={ig} />
																	</div>

																	{/* Action footer */}
																	<div style={{
																		background: D.surface,
																		borderTop: `1px solid ${D.border}`,
																		padding: "8px 12px",
																		display: "flex",
																		gap: 6,
																		flexWrap: "wrap",
																	}}>
																		{/* Copy HTML */}
																		<motion.button
																			whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
																			onClick={() => handleCopyHtml(batchIdx, iIdx)}
																			title="Copy as standalone HTML file"
																			style={{
																				flex: 1,
																				background: copiedHtml === copyKey ? `${accentOf(ig)}15` : T.base,
																				border: `1px solid ${copiedHtml === copyKey ? accentOf(ig) : D.border}`,
																				borderRadius: 8, padding: "5px 10px",
																				display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
																				cursor: "pointer", fontSize: 11, fontWeight: 600,
																				color: copiedHtml === copyKey ? accentOf(ig) : D.muted,
																				transition: "all 0.15s", whiteSpace: "nowrap",
																			}}
																		>
																			<span style={{ fontSize: 13 }}>{copiedHtml === copyKey ? "✓" : "</>"}</span>
																			{copiedHtml === copyKey ? "Copied!" : "Copy HTML"}
																		</motion.button>

																		{/* Download PNG */}
																		<motion.button
																			whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
																			onClick={() => handleDownloadPng(batchIdx, iIdx)}
																			title="Download as PNG image (2×)"
																			style={{
																				flex: 1,
																				background: downloading[copyKey] ? `${accentOf(ig)}15` : T.base,
																				border: `1px solid ${downloading[copyKey] ? accentOf(ig) : D.border}`,
																				borderRadius: 8, padding: "5px 10px",
																				display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
																				cursor: downloading[copyKey] ? "default" : "pointer",
																				fontSize: 11, fontWeight: 600,
																				color: downloading[copyKey] ? accentOf(ig) : D.muted,
																				transition: "all 0.15s", whiteSpace: "nowrap",
																			}}
																		>
																			{downloading[copyKey]
																				? (<><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", fontSize: 13 }}>↻</motion.span> Saving…</>)
																				: (<><span style={{ fontSize: 13 }}>↓</span> Download PNG</>)
																			}
																		</motion.button>

																		{/* Embed */}
																		<motion.button
																			whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
																			onClick={() => handleCopyEmbed(batchIdx, iIdx)}
																			title="Copy embed snippet (paste in any HTML page)"
																			style={{
																				flex: 1,
																				background: copiedEmbed === copyKey ? `${accentOf(ig)}15` : T.base,
																				border: `1px solid ${copiedEmbed === copyKey ? accentOf(ig) : D.border}`,
																				borderRadius: 8, padding: "5px 10px",
																				display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
																				cursor: "pointer", fontSize: 11, fontWeight: 600,
																				color: copiedEmbed === copyKey ? accentOf(ig) : D.muted,
																				transition: "all 0.15s", whiteSpace: "nowrap",
																			}}
																		>
																			<span style={{ fontSize: 13 }}>{copiedEmbed === copyKey ? "✓" : "⊞"}</span>
																			{copiedEmbed === copyKey ? "Copied!" : "Embed"}
																		</motion.button>
																	</div>
																</div>
															</motion.div>
														);
													})}
												</div>
											</div>
										))}

										{/* Loading spinner overlaid below existing cards when generating more */}
										{loading && (
											<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "32px 0" }}>
												<motion.div animate={{ rotate: 360 }} transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
													style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${D.border}`, borderTopColor: T.warm }} />
												<p style={{ fontSize: 13, color: D.muted }}>{GEN_STEPS[step]}</p>
											</div>
										)}
									</>
								)}
							</div>
						</motion.div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
