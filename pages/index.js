import { useState, useRef } from "react";
import {
	motion,
	useInView,
	useScroll,
	useTransform,
	AnimatePresence,
} from "framer-motion";
import { useSelector } from "react-redux";

/* ── Google Fonts injected once ── */
const FontLink = () => (
	<style>{`
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: #F7F5F0; }
    .font-serif  { font-family: 'Instrument Serif', serif; }
    .font-sans   { font-family: 'Outfit', sans-serif; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #F7F5F0; }
    ::-webkit-scrollbar-thumb { background: #C17B2F; border-radius: 10px; }
  `}</style>
);

/* ── Design tokens ── */
const T = {
	base: "#F7F5F0",
	surface: "#FFFFFF",
	accent: "#1A1A1A",
	warm: "#C17B2F",
	muted: "#7A7570",
	border: "#E8E4DC",
};

/* ── Reusable fade-up on scroll ── */
function FadeUp({ children, delay = 0, className = "" }) {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, margin: "-60px" });
	return (
		<motion.div
			ref={ref}
			initial={{ opacity: 0, y: 28 }}
			animate={inView ? { opacity: 1, y: 0 } : {}}
			transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/* ── Animated cursor blink ── */
function Cursor() {
	return (
		<motion.span
			animate={{ opacity: [1, 0, 1] }}
			transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
			style={{
				display: "inline-block",
				width: 3,
				height: "0.85em",
				background: T.warm,
				borderRadius: 2,
				marginLeft: 3,
				verticalAlign: "middle",
			}}
		/>
	);
}

/* ── Nav ── */
function Nav() {
	const { scrollY } = useScroll();

	const shadow = useTransform(
		scrollY,
		[0, 60],
		["0 0 0 rgba(0,0,0,0)", "0 2px 24px rgba(0,0,0,0.08)"],
	);

	return (
		<motion.nav
			style={{ boxShadow: shadow, fontFamily: "'Outfit', sans-serif" }}
			className="fixed top-0 left-0 right-0 z-50 border-b"
			initial={{ y: -60, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
			css={{ borderColor: T.border }}
		>
			<div
				style={{
					background: "rgba(247,245,240,0.88)",
					backdropFilter: "blur(18px)",
					borderBottom: `1px solid ${T.border}`,
				}}
			>
				<div
					className="max-w-6xl mx-auto px-6 flex items-center justify-between"
					style={{ height: 60 }}
				>
					{/* Logo */}
					<a
						href="#"
						className="flex items-center gap-2 no-underline"
						style={{
							fontFamily: "'Instrument Serif', serif",
							fontSize: 22,
							color: T.accent,
						}}
					>
						<motion.span
							whileHover={{ scale: 1.3 }}
							style={{
								width: 9,
								height: 9,
								borderRadius: "50%",
								background: T.warm,
								display: "inline-block",
							}}
						/>
						inkgest
					</a>

					{/* Links */}
					<div className="hidden md:flex items-center gap-8">
						{["How it works", "Pricing", "FAQ"].map((l) => (
							<a
								key={l}
								href={`#${l.toLowerCase().replace(/ /g, "-")}`}
								className="no-underline text-sm font-medium transition-colors"
								style={{ color: T.muted, fontFamily: "'Outfit', sans-serif" }}
								onMouseEnter={(e) => (e.target.style.color = T.accent)}
								onMouseLeave={(e) => (e.target.style.color = T.muted)}
							>
								{l}
							</a>
						))}
					</div>

					{/* CTAs */}
					<div className="flex items-center gap-3">
						<motion.a
							href="/login"
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.97 }}
							className="hidden md:inline-flex text-sm font-semibold no-underline px-4 py-2 rounded-xl border transition-all"
							style={{
								fontFamily: "'Outfit', sans-serif",
								color: T.accent,
								borderColor: T.border,
								background: "transparent",
							}}
						>
							Log in
						</motion.a>
						<motion.a
							href="/app"
							whileHover={{
								scale: 1.04,
								y: -1,
								boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
							}}
							whileTap={{ scale: 0.96 }}
							className="inline-flex text-sm font-semibold no-underline px-5 py-2.5 rounded-xl text-white"
							style={{
								fontFamily: "'Outfit', sans-serif",
								background: T.accent,
							}}
						>
							Try free →
						</motion.a>
					</div>
				</div>
			</div>
		</motion.nav>
	);
}

/* ── Hero ── */
function Hero() {
	const heroRef = useRef(null);
	const { scrollYProgress } = useScroll({
		target: heroRef,
		offset: ["start start", "end start"],
	});
	const y = useTransform(scrollYProgress, [0, 1], [0, 80]);
	const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

	return (
		<section
			ref={heroRef}
			className="relative overflow-hidden"
			style={{ paddingTop: 140, paddingBottom: 80, background: T.base }}
		>
			{/* Ambient orb */}
			<motion.div
				animate={{ scale: [1, 1.08, 1], opacity: [0.18, 0.28, 0.18] }}
				transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
				style={{
					position: "absolute",
					top: "10%",
					left: "50%",
					transform: "translateX(-50%)",
					width: 600,
					height: 600,
					borderRadius: "50%",
					background: `radial-gradient(circle, ${T.warm}30 0%, transparent 70%)`,
					pointerEvents: "none",
				}}
			/>

			<motion.div
				style={{ y, opacity }}
				className="relative max-w-5xl mx-auto px-6 text-center"
			>
				{/* Badge */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
					className="inline-flex items-center gap-2 mb-10 px-4 py-1.5 rounded-full text-sm font-medium border"
					style={{
						background: T.surface,
						borderColor: T.border,
						color: T.muted,
						fontFamily: "'Outfit', sans-serif",
						boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
					}}
				>
					✦ <span style={{ color: T.warm, fontWeight: 700 }}>New</span> —
					Inkgest version one is live
				</motion.div>

				{/* Headline */}
				<motion.h1
					initial={{ opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
					style={{
						fontFamily: "'Instrument Serif', serif",
						fontSize: "clamp(52px,7.5vw,88px)",
						lineHeight: 1.06,
						letterSpacing: "-1.5px",
						color: T.accent,
						marginBottom: 24,
					}}
				>
					Turn any article into
					<br />
					your next{" "}
					<em style={{ fontStyle: "italic", color: T.warm }}>
						newsletter draft
					</em>
					<Cursor />
				</motion.h1>

				{/* Sub */}
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
					style={{
						fontSize: 18,
						color: T.muted,
						maxWidth: 440,
						margin: "0 auto 40px",
						lineHeight: 1.7,
						fontFamily: "'Outfit', sans-serif",
					}}
				>
					Paste a URL, describe your angle. Get a structured draft ready to edit
					and publish — in under 60 seconds.
				</motion.p>

				{/* CTAs */}
				<motion.div
					initial={{ opacity: 0, y: 18 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.48, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
					className="flex flex-wrap items-center justify-center gap-3 mb-4"
				>
					<motion.a
						href="/app"
						whileHover={{
							scale: 1.04,
							y: -2,
							boxShadow: "0 8px 28px rgba(0,0,0,0.2)",
						}}
						whileTap={{ scale: 0.97 }}
						style={{
							background: T.accent,
							color: "#fff",
							fontFamily: "'Outfit', sans-serif",
							fontWeight: 700,
							fontSize: 16,
							padding: "15px 36px",
							borderRadius: 13,
							textDecoration: "none",
							display: "inline-flex",
							alignItems: "center",
							gap: 8,
							transition: "box-shadow 0.2s",
						}}
					>
						Generate your first draft free →
					</motion.a>
					<motion.a
						href="#how-it-works"
						whileHover={{ scale: 1.03, borderColor: T.accent }}
						whileTap={{ scale: 0.97 }}
						style={{
							color: T.accent,
							fontFamily: "'Outfit', sans-serif",
							fontWeight: 600,
							fontSize: 15,
							padding: "15px 28px",
							borderRadius: 13,
							textDecoration: "none",
							border: `1.5px solid ${T.border}`,
							background: "transparent",
							transition: "border-color 0.2s",
						}}
					>
						See how it works
					</motion.a>
				</motion.div>

				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.62 }}
					style={{
						fontSize: 13,
						color: T.muted,
						fontFamily: "'Outfit', sans-serif",
					}}
				>
					<strong style={{ color: T.accent }}>3 free drafts</strong> · No credit
					card · Takes 60 seconds
				</motion.p>

				{/* Demo card */}
				<DemoCard />
			</motion.div>
		</section>
	);
}

/* ── Demo card mock ── */
function DemoCard() {
	const [generated, setGenerated] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [copied, setCopied] = useState(false);

	const handleGenerate = () => {
		setGenerating(true);
		setTimeout(() => {
			setGenerating(false);
			setGenerated(true);
		}, 1800);
	};
	const handleCopy = () => {
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 40 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.72, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
			style={{
				maxWidth: 860,
				margin: "56px auto 0",
				borderRadius: 20,
				border: `1px solid ${T.border}`,
				background: T.surface,
				boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 24px 64px rgba(0,0,0,0.10)",
				overflow: "hidden",
			}}
		>
			{/* Title bar */}
			<div
				style={{
					background: T.base,
					borderBottom: `1px solid ${T.border}`,
					padding: "11px 20px",
					display: "flex",
					alignItems: "center",
					gap: 6,
				}}
			>
				<span
					style={{
						width: 10,
						height: 10,
						borderRadius: "50%",
						background: "#FF5F57",
					}}
				/>
				<span
					style={{
						width: 10,
						height: 10,
						borderRadius: "50%",
						background: "#FEBC2E",
					}}
				/>
				<span
					style={{
						width: 10,
						height: 10,
						borderRadius: "50%",
						background: "#28C840",
					}}
				/>
				<span
					style={{
						flex: 1,
						background: "white",
						border: `1px solid ${T.border}`,
						borderRadius: 7,
						padding: "4px 14px",
						fontSize: 12,
						color: T.muted,
						marginLeft: 8,
						fontFamily: "monospace",
						textAlign: "left",
					}}
				>
					inkgest.app/generate
				</span>
			</div>

			{/* Body */}
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr" }}>
				{/* Left — inputs */}
				<div
					style={{
						borderRight: `1px solid ${T.border}`,
						padding: "26px 22px",
						background: T.base,
						textAlign: "left",
					}}
				>
					<p
						style={{
							fontSize: 11,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							color: T.muted,
							marginBottom: 8,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						Source URL
					</p>
					<div
						style={{
							background: "white",
							border: `1.5px solid ${T.border}`,
							borderRadius: 10,
							padding: "10px 13px",
							fontSize: 13,
							color: T.accent,
							marginBottom: 14,
							fontFamily: "'Outfit', sans-serif",
							textAlign: "left",
							lineHeight: 1.4,
						}}
					>
						techcrunch.com/2025/02/ai-agents-reshaping-workflows
					</div>
					<p
						style={{
							fontSize: 11,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							color: T.muted,
							marginBottom: 8,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						Your angle
					</p>
					<div
						style={{
							background: "white",
							border: `1.5px solid ${T.border}`,
							borderRadius: 10,
							padding: "10px 13px",
							fontSize: 13,
							color: T.accent,
							fontFamily: "'Outfit', sans-serif",
							lineHeight: 1.55,
							minHeight: 78,
						}}
					>
						Sunday newsletter for indie founders. Practical, conversational,
						under 400 words.
					</div>

					<motion.button
						onClick={handleGenerate}
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.97 }}
						style={{
							width: "100%",
							marginTop: 14,
							background: T.accent,
							color: "white",
							border: "none",
							padding: "11px",
							borderRadius: 10,
							fontSize: 14,
							fontWeight: 600,
							cursor: "pointer",
							fontFamily: "'Outfit', sans-serif",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 7,
						}}
					>
						{generating ? (
							<motion.span
								animate={{ rotate: 360 }}
								transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
								style={{ display: "inline-block" }}
							>
								⚙
							</motion.span>
						) : (
							"⚡"
						)}{" "}
						{generating ? "Reading & drafting…" : "Generate draft"}
					</motion.button>

					{/* Usage bar */}
					<div
						style={{
							marginTop: 12,
							display: "flex",
							alignItems: "center",
							gap: 8,
						}}
					>
						<span
							style={{
								fontSize: 11,
								color: T.muted,
								fontFamily: "'Outfit', sans-serif",
								whiteSpace: "nowrap",
							}}
						>
							2 of 3 used
						</span>
						<div
							style={{
								flex: 1,
								height: 4,
								background: T.border,
								borderRadius: 100,
								overflow: "hidden",
							}}
						>
							<motion.div
								animate={{ width: "66%" }}
								transition={{ duration: 0.8, delay: 0.5 }}
								style={{
									height: "100%",
									background: T.warm,
									borderRadius: 100,
								}}
							/>
						</div>
						<span
							style={{
								fontSize: 11,
								color: T.muted,
								fontFamily: "'Outfit', sans-serif",
								whiteSpace: "nowrap",
							}}
						>
							1 left
						</span>
					</div>
				</div>

				{/* Right — output */}
				<div
					style={{
						padding: "26px 26px",
						textAlign: "left",
						minHeight: 320,
						position: "relative",
					}}
				>
					<AnimatePresence mode="wait">
						{!generated && !generating && (
							<motion.div
								key="empty"
								initial={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									height: "100%",
									color: T.muted,
									gap: 10,
									paddingTop: 48,
								}}
							>
								<span style={{ fontSize: 32 }}>✍️</span>
								<p style={{ fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>
									Your draft will appear here
								</p>
							</motion.div>
						)}
						{generating && (
							<motion.div
								key="loading"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								style={{ paddingTop: 32 }}
							>
								{[80, 60, 90, 50, 70, 40, 85].map((w, i) => (
									<motion.div
										key={i}
										animate={{ opacity: [0.3, 0.7, 0.3] }}
										transition={{
											duration: 1.2,
											delay: i * 0.1,
											repeat: Infinity,
										}}
										style={{
											height: 12,
											width: `${w}%`,
											background: T.border,
											borderRadius: 6,
											marginBottom: 10,
										}}
									/>
								))}
							</motion.div>
						)}
						{generated && (
							<motion.div
								key="output"
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5 }}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 8,
										marginBottom: 5,
									}}
								>
									<span
										style={{
											background: "#EFF6EE",
											color: "#3D7A35",
											fontSize: 11,
											fontWeight: 700,
											padding: "2px 9px",
											borderRadius: 100,
											fontFamily: "'Outfit', sans-serif",
										}}
									>
										✓ Draft ready
									</span>
									<span
										style={{
											fontSize: 12,
											color: T.muted,
											fontFamily: "'Outfit', sans-serif",
										}}
									>
										387 words
									</span>
								</div>
								<h2
									style={{
										fontFamily: "'Instrument Serif', serif",
										fontSize: 20,
										color: T.accent,
										lineHeight: 1.3,
										marginBottom: 14,
									}}
								>
									The quiet agent revolution nobody's talking about
								</h2>
								<p
									style={{
										fontSize: 13.5,
										color: "#4A4540",
										lineHeight: 1.7,
										marginBottom: 11,
										fontFamily: "'Outfit', sans-serif",
									}}
								>
									If you've been watching the AI space closely, you'll have
									noticed something subtle shifting. It's not the models getting
									smarter — it's the way they're being used.
								</p>
								<p
									style={{
										fontSize: 13.5,
										color: "#4A4540",
										lineHeight: 1.7,
										fontFamily: "'Outfit', sans-serif",
										fontWeight: 600,
										marginBottom: 5,
									}}
								>
									What's actually changed
								</p>
								<p
									style={{
										fontSize: 13.5,
										color: "#4A4540",
										lineHeight: 1.7,
										fontFamily: "'Outfit', sans-serif",
									}}
								>
									Agents aren't replacing jobs yet. But they're eating the most
									tedious parts — the research loops, the context-switching, the
									repetitive drafting. For indie founders running lean, this
									matters more than any model release…
								</p>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</div>

			{/* Toolbar */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
					padding: "13px 24px",
					borderTop: `1px solid ${T.border}`,
					background: T.base,
				}}
			>
				{[
					{ label: copied ? "✓ Copied!" : "📋 Copy all", action: handleCopy },
					{ label: "💾 Save draft", action: () => {} },
					{ label: "↺ Regenerate", action: handleGenerate },
				].map(({ label, action }) => (
					<motion.button
						key={label}
						onClick={action}
						whileHover={{ scale: 1.03, borderColor: T.accent }}
						whileTap={{ scale: 0.96 }}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 5,
							fontSize: 12,
							fontWeight: 600,
							color: T.muted,
							background: "white",
							border: `1px solid ${T.border}`,
							padding: "6px 13px",
							borderRadius: 8,
							cursor: "pointer",
							fontFamily: "'Outfit', sans-serif",
							transition: "all 0.18s",
						}}
					>
						{label}
					</motion.button>
				))}
				<span
					style={{
						marginLeft: "auto",
						fontSize: 12,
						color: T.muted,
						fontFamily: "'Outfit', sans-serif",
					}}
				>
					387 words
				</span>
			</div>
		</motion.div>
	);
}

/* ── How it works ── */
function HowItWorks() {
	const steps = [
		{
			n: "01",
			title: "Paste any URL",
			body: "Drop in any article, blog post, research paper, or news story. inkgest reads the full page — no copy-pasting, no summarizing.",
		},
		{
			n: "02",
			title: "Describe your angle",
			body: "Tell inkgest who you're writing for and what point you're making. One sentence is enough. Two is better.",
		},
		{
			n: "03",
			title: "Edit and publish",
			body: "Your draft arrives structured — hook, body sections, closing CTA. Edit in the editor, then copy or save instantly.",
		},
	];

	return (
		<section
			id="how-it-works"
			style={{
				padding: "96px 24px",
				background: "white",
				borderTop: `1px solid ${T.border}`,
				borderBottom: `1px solid ${T.border}`,
			}}
		>
			<div className="max-w-6xl mx-auto">
				<FadeUp>
					<p
						style={{
							fontSize: 12,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.1em",
							color: T.warm,
							marginBottom: 10,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						How it works
					</p>
					<h2
						style={{
							fontFamily: "'Instrument Serif', serif",
							fontSize: "clamp(36px,4vw,54px)",
							color: T.accent,
							lineHeight: 1.1,
							marginBottom: 14,
							letterSpacing: "-0.5px",
						}}
					>
						Three steps.
						<br />
						One solid draft.
					</h2>
					<p
						style={{
							fontSize: 17,
							color: T.muted,
							lineHeight: 1.65,
							maxWidth: 440,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						No prompt engineering. No tab switching. No copy-pasting research
						from five different places.
					</p>
				</FadeUp>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
						gap: 24,
						marginTop: 52,
					}}
				>
					{steps.map((s, i) => (
						<FadeUp key={s.n} delay={i * 0.12}>
							<motion.div
								whileHover={{
									y: -6,
									boxShadow: "0 16px 48px rgba(0,0,0,0.11)",
								}}
								transition={{ duration: 0.25 }}
								style={{
									background: T.base,
									border: `1px solid ${T.border}`,
									borderRadius: 14,
									padding: "32px 28px",
									height: "100%",
									cursor: "default",
								}}
							>
								<div
									style={{
										fontFamily: "'Instrument Serif', serif",
										fontSize: 42,
										color: T.warm,
										lineHeight: 1,
										marginBottom: 20,
										opacity: 0.6,
									}}
								>
									{s.n}
								</div>
								<h3
									style={{
										fontFamily: "'Outfit', sans-serif",
										fontWeight: 700,
										fontSize: 17,
										color: T.accent,
										marginBottom: 10,
									}}
								>
									{s.title}
								</h3>
								<p
									style={{
										fontFamily: "'Outfit', sans-serif",
										fontSize: 14,
										color: T.muted,
										lineHeight: 1.7,
									}}
								>
									{s.body}
								</p>
							</motion.div>
						</FadeUp>
					))}
				</div>
			</div>
		</section>
	);
}

/* ── Stats strip ── */
function StatsStrip() {
	const stats = [
		{ num: "60", suffix: "s", label: "Average URL to draft time" },
		{ num: "3", suffix: "hrs", label: "Saved per newsletter on average" },
		{ num: "$12", suffix: "/mo", label: "Less than one coffee per week" },
	];
	return (
		<div style={{ background: T.accent, padding: "56px 24px" }}>
			<div
				className="max-w-6xl mx-auto"
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
				}}
			>
				{stats.map((s, i) => (
					<FadeUp key={s.label} delay={i * 0.1}>
						<div
							style={{
								textAlign: "center",
								padding: "0 32px",
								borderRight:
									i < stats.length - 1
										? "1px solid rgba(255,255,255,0.1)"
										: "none",
							}}
						>
							<div
								style={{
									fontFamily: "'Instrument Serif', serif",
									fontSize: 54,
									color: "white",
									lineHeight: 1,
								}}
							>
								{s.num}
								<span style={{ color: T.warm }}>{s.suffix}</span>
							</div>
							<div
								style={{
									fontSize: 14,
									color: "rgba(255,255,255,0.5)",
									marginTop: 6,
									fontFamily: "'Outfit', sans-serif",
								}}
							>
								{s.label}
							</div>
						</div>
					</FadeUp>
				))}
			</div>
		</div>
	);
}

/* ── Testimonials ── */
function Testimonials() {
	const cards = [
		{
			quote:
				"I publish every Tuesday. Research used to take 90 minutes. Now I paste two URLs, describe my angle, and I have a solid draft in under a minute.",
			highlight: "Cut my writing time by 40%.",
			name: "Aisha K.",
			role: "Founder Newsletter · 4,200 subscribers",
			img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=76&h=76&fit=crop&crop=face",
		},
		{
			quote:
				"Other AI writers give you generic slop. inkgest actually reads the source and writes something specific and usable.",
			highlight: "First draft needed maybe 20% editing.",
			name: "Marcus T.",
			role: "B2B Content Strategist",
			img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=76&h=76&fit=crop&crop=face",
		},
		{
			quote:
				"Honestly I was skeptical. Tried it once as a joke and ended up using the output almost verbatim.",
			highlight: "Saved me two hours on a deadline day.",
			name: "Priya S.",
			role: "Indie blogger · 12K monthly readers",
			img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=76&h=76&fit=crop&crop=face",
		},
	];

	return (
		<section style={{ padding: "96px 24px", background: T.base }}>
			<div className="max-w-6xl mx-auto">
				<FadeUp>
					<p
						style={{
							fontSize: 12,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.1em",
							color: T.warm,
							marginBottom: 10,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						Early users
					</p>
					<h2
						style={{
							fontFamily: "'Instrument Serif', serif",
							fontSize: "clamp(36px,4vw,54px)",
							color: T.accent,
							lineHeight: 1.1,
							letterSpacing: "-0.5px",
						}}
					>
						Writers who tried it
						<br />
						<em style={{ color: T.warm }}>didn't go back.</em>
					</h2>
				</FadeUp>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
						gap: 20,
						marginTop: 52,
					}}
				>
					{cards.map((c, i) => (
						<FadeUp key={c.name} delay={i * 0.12}>
							<motion.div
								whileHover={{
									y: -5,
									boxShadow: "0 16px 48px rgba(0,0,0,0.10)",
								}}
								style={{
									background: T.surface,
									border: `1px solid ${T.border}`,
									borderRadius: 14,
									padding: "28px",
									height: "100%",
									display: "flex",
									flexDirection: "column",
									boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
									cursor: "default",
								}}
							>
								<div
									style={{
										color: T.warm,
										fontSize: 14,
										letterSpacing: 2,
										marginBottom: 14,
									}}
								>
									★★★★★
								</div>
								<p
									style={{
										fontSize: 14,
										color: "#4A4540",
										lineHeight: 1.75,
										marginBottom: 18,
										flex: 1,
										fontFamily: "'Outfit', sans-serif",
									}}
								>
									"{c.quote}{" "}
									<strong style={{ color: T.accent }}>{c.highlight}</strong>"
								</p>
								<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
									<img
										src={c.img}
										alt={c.name}
										style={{
											width: 38,
											height: 38,
											borderRadius: "50%",
											objectFit: "cover",
										}}
									/>
									<div>
										<div
											style={{
												fontSize: 13,
												fontWeight: 700,
												color: T.accent,
												fontFamily: "'Outfit', sans-serif",
											}}
										>
											{c.name}
										</div>
										<div
											style={{
												fontSize: 12,
												color: T.muted,
												fontFamily: "'Outfit', sans-serif",
											}}
										>
											{c.role}
										</div>
									</div>
								</div>
							</motion.div>
						</FadeUp>
					))}
				</div>
			</div>
		</section>
	);
}

/* ── Pricing ── */
function Pricing() {
	const free = [
		"3 lifetime draft generations",
		"Full editor access",
		"Copy to clipboard",
		"Save up to 3 drafts",
		"Google login",
	];
	const pro = [
		"Unlimited draft generations",
		"Unlimited saved drafts",
		"Full editor + formatting",
		"Draft history",
		"Priority generation speed",
		"Cancel anytime",
	];

	return (
		<section
			id="pricing"
			style={{
				padding: "96px 24px",
				background: "white",
				borderTop: `1px solid ${T.border}`,
			}}
		>
			<div className="max-w-6xl mx-auto">
				<FadeUp>
					<p
						style={{
							fontSize: 12,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.1em",
							color: T.warm,
							marginBottom: 10,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						Pricing
					</p>
					<h2
						style={{
							fontFamily: "'Instrument Serif', serif",
							fontSize: "clamp(36px,4vw,54px)",
							color: T.accent,
							lineHeight: 1.1,
							marginBottom: 14,
							letterSpacing: "-0.5px",
						}}
					>
						Simple. One decision.
					</h2>
					<p
						style={{
							fontSize: 17,
							color: T.muted,
							lineHeight: 1.6,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						Try it free. Upgrade when it saves you more time than it costs.
					</p>
				</FadeUp>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
						gap: 20,
						marginTop: 52,
						maxWidth: 680,
					}}
				>
					{/* Free */}
					<FadeUp delay={0.1}>
						<motion.div
							whileHover={{ y: -4, boxShadow: "0 16px 48px rgba(0,0,0,0.10)" }}
							style={{
								background: T.base,
								border: `1.5px solid ${T.border}`,
								borderRadius: 16,
								padding: "34px 30px",
								height: "100%",
								display: "flex",
								flexDirection: "column",
							}}
						>
							<p
								style={{
									fontSize: 12,
									fontWeight: 700,
									textTransform: "uppercase",
									letterSpacing: "0.08em",
									color: T.muted,
									marginBottom: 10,
									fontFamily: "'Outfit', sans-serif",
								}}
							>
								Free
							</p>
							<div
								style={{
									fontFamily: "'Instrument Serif', serif",
									fontSize: 52,
									color: T.accent,
									lineHeight: 1,
								}}
							>
								$0
							</div>
							<p
								style={{
									fontSize: 14,
									color: T.muted,
									margin: "10px 0 24px",
									lineHeight: 1.6,
									fontFamily: "'Outfit', sans-serif",
								}}
							>
								Enough to know if it works for you. No card, no expiry.
							</p>
							<ul style={{ listStyle: "none", marginBottom: 28, flex: 1 }}>
								{free.map((f) => (
									<li
										key={f}
										style={{
											fontSize: 13.5,
											color: T.muted,
											padding: "8px 0",
											borderBottom: `1px solid ${T.border}`,
											display: "flex",
											alignItems: "center",
											gap: 9,
											fontFamily: "'Outfit', sans-serif",
										}}
									>
										<span style={{ color: T.warm, fontWeight: 700 }}>✓</span>{" "}
										{f}
									</li>
								))}
							</ul>
							<motion.a
								href="/login"
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.97 }}
								style={{
									display: "block",
									textAlign: "center",
									background: T.accent,
									color: "white",
									padding: "13px",
									borderRadius: 10,
									fontSize: 14,
									fontWeight: 600,
									textDecoration: "none",
									fontFamily: "'Outfit', sans-serif",
								}}
							>
								Start for free →
							</motion.a>
						</motion.div>
					</FadeUp>

					{/* Pro */}
					<FadeUp delay={0.2}>
						<motion.div
							whileHover={{
								y: -4,
								boxShadow: "0 16px 60px rgba(26,26,26,0.28)",
							}}
							style={{
								background: T.accent,
								border: `1.5px solid ${T.accent}`,
								borderRadius: 16,
								padding: "34px 30px",
								height: "100%",
								display: "flex",
								flexDirection: "column",
							}}
						>
							<p
								style={{
									fontSize: 12,
									fontWeight: 700,
									textTransform: "uppercase",
									letterSpacing: "0.08em",
									color: "rgba(255,255,255,0.5)",
									marginBottom: 10,
									fontFamily: "'Outfit', sans-serif",
								}}
							>
								Pro
							</p>
							<div
								style={{
									fontFamily: "'Instrument Serif', serif",
									fontSize: 52,
									color: "white",
									lineHeight: 1,
								}}
							>
								$12
								<span
									style={{
										fontSize: 18,
										color: "rgba(255,255,255,0.45)",
										fontFamily: "'Outfit', sans-serif",
										fontWeight: 400,
									}}
								>
									/mo
								</span>
							</div>
							<p
								style={{
									fontSize: 14,
									color: "rgba(255,255,255,0.6)",
									margin: "10px 0 24px",
									lineHeight: 1.6,
									fontFamily: "'Outfit', sans-serif",
								}}
							>
								For writers who publish on a schedule and can't afford a bad
								week.
							</p>
							<ul style={{ listStyle: "none", marginBottom: 28, flex: 1 }}>
								{pro.map((f) => (
									<li
										key={f}
										style={{
											fontSize: 13.5,
											color: "rgba(255,255,255,0.72)",
											padding: "8px 0",
											borderBottom: "1px solid rgba(255,255,255,0.1)",
											display: "flex",
											alignItems: "center",
											gap: 9,
											fontFamily: "'Outfit', sans-serif",
										}}
									>
										<span style={{ color: "#F0C070", fontWeight: 700 }}>✓</span>{" "}
										{f}
									</li>
								))}
							</ul>
							<motion.button
								whileHover={{ scale: 1.02, background: "#f5f0e8" }}
								whileTap={{ scale: 0.97 }}
								style={{
									display: "block",
									width: "100%",
									background: "white",
									color: T.accent,
									padding: "13px",
									borderRadius: 10,
									fontSize: 14,
									fontWeight: 700,
									border: "none",
									cursor: "pointer",
									fontFamily: "'Outfit', sans-serif",
								}}
							>
								Upgrade to Pro →
							</motion.button>
						</motion.div>
					</FadeUp>
				</div>

				<FadeUp delay={0.1}>
					<p
						style={{
							fontSize: 13,
							color: T.muted,
							marginTop: 20,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						Annual plan coming soon — 2 months free.{" "}
						<a
							href="#"
							style={{ color: T.accent, textDecoration: "underline" }}
						>
							Get notified
						</a>
					</p>
				</FadeUp>
			</div>
		</section>
	);
}

/* ── Open Source ── */
function OpenSource() {
	return (
		<section
			style={{
				padding: "96px 24px",
				background: T.base,
				borderTop: `1px solid ${T.border}`,
			}}
		>
			<div className="max-w-6xl mx-auto">
				<FadeUp>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: 64,
							alignItems: "center",
						}}
					>
						{/* Left */}
						<div>
							<p
								style={{
									fontSize: 12,
									fontWeight: 700,
									textTransform: "uppercase",
									letterSpacing: "0.1em",
									color: T.warm,
									marginBottom: 10,
									fontFamily: "'Outfit', sans-serif",
								}}
							>
								Open Source
							</p>
							<h2
								style={{
									fontFamily: "'Instrument Serif', serif",
									fontSize: "clamp(36px,4vw,54px)",
									color: T.accent,
									lineHeight: 1.1,
									marginBottom: 16,
									letterSpacing: "-0.5px",
								}}
							>
								Fully open.
								<br />
								<em style={{ color: T.warm }}>No black boxes.</em>
							</h2>
							<p
								style={{
									fontSize: 16,
									color: T.muted,
									lineHeight: 1.7,
									maxWidth: 420,
									fontFamily: "'Outfit', sans-serif",
									marginBottom: 32,
								}}
							>
								inkgest is completely open source. Read the code, fork it, self-host
								it, or contribute back. Built in public so you can see exactly
								what runs when you paste a URL.
							</p>
							<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
								<motion.a
									href="https://github.com/shreyvijayvargiya/Inkgest"
									target="_blank"
									rel="noopener noreferrer"
									whileHover={{
										scale: 1.03,
										y: -1,
										boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
									}}
									whileTap={{ scale: 0.97 }}
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: 9,
										background: T.accent,
										color: "white",
										padding: "12px 24px",
										borderRadius: 11,
										fontSize: 14,
										fontWeight: 700,
										textDecoration: "none",
										fontFamily: "'Outfit', sans-serif",
									}}
								>
									{/* GitHub icon */}
									<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
										<path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
									</svg>
									View on GitHub
								</motion.a>
								<motion.a
									href="https://github.com/shreyvijayvargiya/Inkgest/fork"
									target="_blank"
									rel="noopener noreferrer"
									whileHover={{ scale: 1.03, borderColor: T.accent }}
									whileTap={{ scale: 0.97 }}
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: 8,
										background: "transparent",
										color: T.accent,
										padding: "12px 24px",
										borderRadius: 11,
										fontSize: 14,
										fontWeight: 600,
										textDecoration: "none",
										fontFamily: "'Outfit', sans-serif",
										border: `1.5px solid ${T.border}`,
										transition: "border-color 0.2s",
									}}
								>
									Fork &amp; self-host
								</motion.a>
							</div>
						</div>

						{/* Right — feature tiles */}
						<FadeUp delay={0.1}>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: 14,
								}}
							>
								{[
									{ icon: "🔍", title: "Full source code", body: "Every line of the app is public on GitHub." },
									{ icon: "🍴", title: "Fork freely", body: "Clone and self-host your own instance in minutes." },
									{ icon: "🤝", title: "Contributions welcome", body: "Open PRs, file issues, suggest features." },
									{ icon: "🔒", title: "No hidden logic", body: "See exactly how drafts are generated end-to-end." },
								].map((item) => (
									<motion.div
										key={item.title}
										whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.09)" }}
										transition={{ duration: 0.22 }}
										style={{
											background: T.surface,
											border: `1px solid ${T.border}`,
											borderRadius: 12,
											padding: "20px 18px",
										}}
									>
										<div style={{ fontSize: 22, marginBottom: 8 }}>{item.icon}</div>
										<p
											style={{
												fontSize: 13,
												fontWeight: 700,
												color: T.accent,
												marginBottom: 5,
												fontFamily: "'Outfit', sans-serif",
											}}
										>
											{item.title}
										</p>
										<p
											style={{
												fontSize: 12.5,
												color: T.muted,
												lineHeight: 1.6,
												fontFamily: "'Outfit', sans-serif",
											}}
										>
											{item.body}
										</p>
									</motion.div>
								))}
							</div>
						</FadeUp>
					</div>
				</FadeUp>
			</div>
		</section>
	);
}

/* ── FAQ ── */
function FAQ() {
	const [open, setOpen] = useState(null);
	const faqs = [
		{
			q: "What URLs does it support?",
			a: "Most publicly accessible web pages — blog posts, news articles, research papers, Medium, Substack. Paywalled content won't work. We use Firecrawl so JavaScript-rendered pages are handled correctly.",
		},
		{
			q: "How good is the output, really?",
			a: "Better than starting from scratch, not a replacement for your voice. The draft gives you a structured starting point you then edit and make your own. Most users report needing to change 20–40% of the output. The more specific your prompt, the better the first draft.",
		},
		{
			q: "What happens when I use all 3 free generations?",
			a: "You'll see the upgrade screen. Your saved drafts stay accessible. We warn you after your 2nd generation so it's never a surprise.",
		},
		{
			q: "Can I cancel Pro anytime?",
			a: "Yes. Cancel from account settings in one click. No emails, no forms. Your Pro access continues until the end of the current billing period.",
		},
		{
			q: "Is my content private?",
			a: "Yes. Your drafts are stored in your private account and are never used to train any AI model. We don't share or sell your content.",
		},
		{
			q: "What AI model powers the drafts?",
			a: "State-of-the-art language models via OpenRouter, selecting the best available model for writing quality and speed. The model may change as better options emerge — we always optimize for output quality.",
		},
		{
			q: "Can I use it for blog posts, not just newsletters?",
			a: "Absolutely. Tell inkgest you're writing a blog post, LinkedIn article, or Twitter thread and it structures the output accordingly.",
		},
		{
			q: "Do you offer refunds?",
			a: "If you're not happy in your first 7 days on Pro, email us for a full refund — no questions asked.",
		},
	];

	return (
		<section id="faq" style={{ padding: "96px 24px", background: T.base }}>
			<div
				className="max-w-6xl mx-auto"
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1.6fr",
					gap: 64,
					alignItems: "start",
				}}
			>
				<FadeUp>
					<p
						style={{
							fontSize: 12,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.1em",
							color: T.warm,
							marginBottom: 10,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						FAQ
					</p>
					<h2
						style={{
							fontFamily: "'Instrument Serif', serif",
							fontSize: "clamp(36px,4vw,54px)",
							color: T.accent,
							lineHeight: 1.1,
							letterSpacing: "-0.5px",
						}}
					>
						Questions.
					</h2>
					<p
						style={{
							fontSize: 15,
							color: T.muted,
							marginTop: 14,
							lineHeight: 1.65,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						Anything else?{" "}
						<a
							href="mailto:hello@inkgest.app"
							style={{ color: T.accent, textDecoration: "underline" }}
						>
							Drop us an email.
						</a>
					</p>
				</FadeUp>

				<FadeUp delay={0.1}>
					<div>
						{faqs.map((f, i) => (
							<div key={f.q} style={{ borderBottom: `1px solid ${T.border}` }}>
								<button
									onClick={() => setOpen(open === i ? null : i)}
									style={{
										width: "100%",
										textAlign: "left",
										background: "none",
										border: "none",
										padding: "20px 0",
										fontSize: 15,
										fontWeight: 600,
										color: T.accent,
										cursor: "pointer",
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										gap: 16,
										fontFamily: "'Outfit', sans-serif",
									}}
								>
									{f.q}
									<motion.span
										animate={{ rotate: open === i ? 45 : 0 }}
										transition={{ duration: 0.25 }}
										style={{
											fontSize: 20,
											color: T.muted,
											flexShrink: 0,
											lineHeight: 1,
										}}
									>
										+
									</motion.span>
								</button>
								<AnimatePresence>
									{open === i && (
										<motion.div
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: "auto", opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
											style={{ overflow: "hidden" }}
										>
											<p
												style={{
													fontSize: 14.5,
													color: T.muted,
													lineHeight: 1.7,
													paddingBottom: 20,
													fontFamily: "'Outfit', sans-serif",
												}}
											>
												{f.a}
											</p>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						))}
					</div>
				</FadeUp>
			</div>
		</section>
	);
}

/* ── CTA Banner ── */
function CTABanner() {
	return (
		<section
			style={{
				padding: "96px 24px",
				background: "white",
				borderTop: `1px solid ${T.border}`,
				textAlign: "center",
			}}
		>
			<FadeUp>
				<div style={{ maxWidth: 560, margin: "0 auto" }}>
					<h2
						style={{
							fontFamily: "'Instrument Serif', serif",
							fontSize: "clamp(40px,5.5vw,64px)",
							color: T.accent,
							lineHeight: 1.08,
							marginBottom: 16,
							letterSpacing: "-1px",
						}}
					>
						Your next draft is
						<br />
						<em style={{ color: T.warm }}>60 seconds away.</em>
					</h2>
					<p
						style={{
							fontSize: 17,
							color: T.muted,
							marginBottom: 36,
							lineHeight: 1.65,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						3 free drafts. No credit card. Used by newsletter writers who
						publish on a deadline every week.
					</p>
					<motion.a
						href="#"
						whileHover={{
							scale: 1.04,
							y: -2,
							boxShadow: "0 10px 32px rgba(0,0,0,0.2)",
						}}
						whileTap={{ scale: 0.97 }}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 8,
							background: T.accent,
							color: "white",
							padding: "15px 36px",
							borderRadius: 13,
							fontSize: 16,
							fontWeight: 700,
							textDecoration: "none",
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						Generate your first draft free →
					</motion.a>
					<p
						style={{
							fontSize: 13,
							color: T.muted,
							marginTop: 16,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						Already have an account?{" "}
						<a
							href="#"
							style={{ color: T.accent, textDecoration: "underline" }}
						>
							Log in
						</a>
					</p>
				</div>
			</FadeUp>
		</section>
	);
}

/* ── Footer ── */
function Footer() {
	return (
		<footer style={{ background: T.accent, padding: "56px 24px 36px" }}>
			<div className="max-w-6xl mx-auto">
				<div
					style={{
						display: "flex",
						alignItems: "flex-start",
						justifyContent: "space-between",
						marginBottom: 48,
						gap: 40,
						flexWrap: "wrap",
					}}
				>
					<div>
						<div
							style={{
								fontFamily: "'Instrument Serif', serif",
								fontSize: 24,
								color: "white",
								display: "flex",
								alignItems: "center",
								gap: 8,
								marginBottom: 10,
							}}
						>
							<span
								style={{
									width: 8,
									height: 8,
									borderRadius: "50%",
									background: T.warm,
									display: "inline-block",
								}}
							/>
							inkgest
						</div>
						<p
							style={{
								fontSize: 13,
								color: "rgba(255,255,255,0.4)",
								maxWidth: 200,
								lineHeight: 1.6,
								fontFamily: "'Outfit', sans-serif",
							}}
						>
							Turn any URL into a newsletter draft in 60 seconds.
						</p>
					</div>
					<div style={{ display: "flex", gap: 64, flexWrap: "wrap" }}>
						{[
							{
								title: "Connect",
								links: [
									"https://x.com/@treyvijay",
									"mailto:shreyvijayvargiya26@gmail.com",
								],
							},
						].map((col) => (
							<div key={col.title}>
								<p
									style={{
										fontSize: 12,
										fontWeight: 700,
										textTransform: "uppercase",
										letterSpacing: "0.1em",
										color: "rgba(255,255,255,0.35)",
										marginBottom: 16,
										fontFamily: "'Outfit', sans-serif",
									}}
								>
									{col.title}
								</p>
								{col.links.map((l) => (
									<a
										key={l}
										href={l}
										style={{
											display: "block",
											fontSize: 14,
											color: "rgba(255,255,255,0.6)",
											textDecoration: "none",
											marginBottom: 10,
											fontFamily: "'Outfit', sans-serif",
											transition: "color 0.2s",
										}}
										onMouseEnter={(e) => (e.target.style.color = "white")}
										onMouseLeave={(e) =>
											(e.target.style.color = "rgba(255,255,255,0.6)")
										}
									>
										{l}
									</a>
								))}
							</div>
						))}
					</div>
				</div>
				<div
					style={{
						borderTop: "1px solid rgba(255,255,255,0.1)",
						paddingTop: 28,
						display: "flex",
						justifyContent: "space-between",
						flexWrap: "wrap",
						gap: 12,
					}}
				>
					<span
						style={{
							fontSize: 13,
							color: "rgba(255,255,255,0.3)",
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						© 2025 inkgest. All rights reserved.
					</span>
					<span
						style={{
							fontSize: 13,
							color: "rgba(255,255,255,0.3)",
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						Made for writers who publish on a deadline. Built using{" "}
						<a
							href="https://buildsaas.dev"
							target="_blank"
							className="text-orange-500"
							style={{ color: T.surface }}
							rel="noopener noreferrer"
						>
							Buildsaas
						</a>
					</span>
				</div>
			</div>
		</footer>
	);
}

/* ── Root ── */
export default function inkgestLanding() {
	const { user } = useSelector((state) => state?.user);
	if (user?.isAuthenticated) {
		return <Redirect href="/app" />;
	}
	return (
		<div style={{ fontFamily: "'Outfit', sans-serif", background: T.base }}>
			<FontLink />
			<Nav />
			<Hero />
			<HowItWorks />
			<StatsStrip />
			{/* /<Testimonials /> */}
		<Pricing />
		<OpenSource />
		<FAQ />
			<CTABanner />
			<Footer />
		</div>
	);
}
