import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
	{
		id: "plan",
		icon: "✦",
		label: "Writing video script",
		sub: "Claude generating title, narration & slide prompts",
	},
	{
		id: "images",
		icon: "◈",
		label: "Generating slide images",
		sub: "FLUX creating visuals for each scene",
	},
	{
		id: "audio",
		icon: "◉",
		label: "Synthesising narration",
		sub: "Edge TTS converting script to voiceover",
	},
	{
		id: "render",
		icon: "▶",
		label: "Rendering MP4",
		sub: "Remotion stitching frames into video",
	},
	{
		id: "save",
		icon: "◎",
		label: "Saving to library",
		sub: "Uploading to storage and saving metadata",
	},
];

const STYLES = [
	{
		id: "cinematic",
		label: "Cinematic",
		desc: "Dramatic · Film-grade",
		icon: "🎬",
	},
	{ id: "minimal", label: "Minimal", desc: "Clean · Flat design", icon: "◻" },
	{
		id: "documentary",
		label: "Documentary",
		desc: "Realistic · Candid",
		icon: "📷",
	},
];

function usePipelineSteps() {
	const [activeStep, setActiveStep] = useState(-1);
	const [doneSteps, setDoneSteps] = useState([]);
	const timers = useRef([]);

	const start = () => {
		setActiveStep(0);
		setDoneSteps([]);
		const timings = [0, 4000, 14000, 19000, 38000];
		timings.forEach((delay, idx) => {
			const t = setTimeout(() => {
				setActiveStep(idx);
				if (idx > 0) setDoneSteps((d) => [...d, STEPS[idx - 1].id]);
			}, delay);
			timers.current.push(t);
		});
	};

	const finish = () => {
		timers.current.forEach(clearTimeout);
		setDoneSteps(STEPS.map((s) => s.id));
		setActiveStep(-1);
	};

	const reset = () => {
		timers.current.forEach(clearTimeout);
		setActiveStep(-1);
		setDoneSteps([]);
	};

	return { activeStep, doneSteps, start, finish, reset };
}

function Spinner() {
	return (
		<svg
			style={{ animation: "spin 1s linear infinite", width: 16, height: 16 }}
			viewBox="0 0 24 24"
			fill="none"
		>
			<style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.2} }`}</style>
			<circle
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				strokeWidth="3"
				strokeOpacity="0.25"
			/>
			<path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
		</svg>
	);
}

function PulsingDot() {
	return (
		<span
			style={{
				display: "block",
				width: 8,
				height: 8,
				borderRadius: "50%",
				background: "#10b981",
				animation: "pulse-dot 1.1s ease-in-out infinite",
			}}
		/>
	);
}

export default function VideoGenerator({ userId = "demo-user" }) {
	const [prompt, setPrompt] = useState("");
	const [style, setStyle] = useState("cinematic");
	const [speed, setSpeed] = useState(1.0);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState(null);
	const [error, setError] = useState(null);
	const pipeline = usePipelineSteps();

	const canSubmit = prompt.trim().length >= 10 && !loading;

	const handleGenerate = async () => {
		if (!canSubmit) return;
		setLoading(true);
		setResult(null);
		setError(null);
		pipeline.start();

		try {
			const res = await fetch("/api/generate-video", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					prompt: prompt.trim(),
					userId,
					style,
					voiceSpeed: speed,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Generation failed");
			pipeline.finish();
			setResult(data);
		} catch (err) {
			pipeline.reset();
			setError(err.message || "Something went wrong");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			style={{
				minHeight: "100vh",
				background: "#080a0d",
				color: "#e8eaed",
				position: "relative",
				overflowX: "hidden",
			}}
		>
			{/* Grid background */}
			<div
				style={{
					position: "fixed",
					inset: 0,
					pointerEvents: "none",
					zIndex: 0,
					backgroundImage:
						"linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px)",
					backgroundSize: "48px 48px",
				}}
			/>

			{/* Glow */}
			<div
				style={{
					position: "fixed",
					top: "-18%",
					left: "50%",
					transform: "translateX(-50%)",
					width: 640,
					height: 380,
					borderRadius: "50%",
					pointerEvents: "none",
					zIndex: 0,
					background:
						"radial-gradient(ellipse,rgba(16,185,129,.16) 0%,transparent 70%)",
				}}
			/>

			{/* Content */}
			<div
				style={{
					position: "relative",
					zIndex: 1,
					maxWidth: 620,
					margin: "0 auto",
					padding: "60px 20px 80px",
				}}
			>
				{/* ── Header ── */}
				<motion.div
					initial={{ opacity: 0, y: -14 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45 }}
					style={{ textAlign: "center", marginBottom: 40 }}
				>
					<div
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 8,
							fontSize: 10,
							letterSpacing: "0.18em",
							textTransform: "uppercase",
							color: "rgba(16,185,129,0.8)",
							border: "1px solid rgba(16,185,129,0.25)",
							borderRadius: 999,
							padding: "5px 16px",
							background: "rgba(16,185,129,0.06)",
							marginBottom: 20,
						}}
					>
						<span
							style={{
								width: 6,
								height: 6,
								borderRadius: "50%",
								background: "#10b981",
								display: "inline-block",
							}}
						/>
						AI · Remotion · Edge TTS
					</div>
					<h1
						style={{
							fontSize: 38,
							fontWeight: 800,
							letterSpacing: "-0.04em",
							color: "#ffffff",
							lineHeight: 1,
							marginBottom: 12,
							fontFamily: "'Syne','DM Sans',system-ui,sans-serif",
						}}
					>
						Prompt → Video
					</h1>
					<p
						style={{
							fontSize: 13,
							color: "rgba(255,255,255,0.38)",
							lineHeight: 1.6,
						}}
					>
						Describe anything. Get a narrated MP4 slideshow in ~60 seconds.
					</p>
				</motion.div>

				{/* ── Input Card ── */}
				<motion.div
					initial={{ opacity: 0, y: 18 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45, delay: 0.08 }}
					style={{
						borderRadius: 16,
						border: "1px solid rgba(255,255,255,0.08)",
						background: "rgba(255,255,255,0.03)",
						backdropFilter: "blur(12px)",
						overflow: "hidden",
						marginBottom: 12,
					}}
				>
					{/* Prompt */}
					<div style={{ padding: "20px 20px 14px" }}>
						<label
							style={{
								display: "block",
								fontSize: 10,
								letterSpacing: "0.14em",
								textTransform: "uppercase",
								color: "rgba(255,255,255,0.38)",
								marginBottom: 10,
							}}
						>
							Your Prompt
						</label>
						<textarea
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							disabled={loading}
							rows={4}
							placeholder="e.g. A documentary about solo founders who quit their jobs to build software products alone and became successful..."
							style={{
								width: "100%",
								background: "transparent",
								border: "none",
								outline: "none",
								resize: "none",
								fontSize: 13,
								color: "rgba(255,255,255,0.82)",
								lineHeight: 1.65,
								fontFamily: "inherit",
								opacity: loading ? 0.4 : 1,
							}}
						/>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								marginTop: 6,
							}}
						>
							<span
								style={{
									fontSize: 10,
									color:
										prompt.length > 1800 ? "#f87171" : "rgba(255,255,255,0.2)",
								}}
							>
								{prompt.length} / 2000
							</span>
							{prompt.length > 0 && prompt.length < 10 && (
								<span style={{ fontSize: 10, color: "rgba(251,191,36,0.7)" }}>
									Need {10 - prompt.length} more chars
								</span>
							)}
						</div>
					</div>

					<div
						style={{
							height: 1,
							background: "rgba(255,255,255,0.06)",
							margin: "0 20px",
						}}
					/>

					{/* Style selector */}
					<div style={{ padding: "16px 20px" }}>
						<label
							style={{
								display: "block",
								fontSize: 10,
								letterSpacing: "0.14em",
								textTransform: "uppercase",
								color: "rgba(255,255,255,0.38)",
								marginBottom: 12,
							}}
						>
							Visual Style
						</label>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(3,1fr)",
								gap: 8,
							}}
						>
							{STYLES.map((st) => (
								<button
									key={st.id}
									onClick={() => !loading && setStyle(st.id)}
									disabled={loading}
									style={{
										borderRadius: 12,
										padding: "12px 10px",
										textAlign: "left",
										cursor: loading ? "not-allowed" : "pointer",
										border:
											style === st.id
												? "1px solid rgba(16,185,129,0.5)"
												: "1px solid rgba(255,255,255,0.08)",
										background:
											style === st.id
												? "rgba(16,185,129,0.1)"
												: "rgba(255,255,255,0.02)",
										color:
											style === st.id ? "#ffffff" : "rgba(255,255,255,0.4)",
										transition: "all 0.18s",
										opacity: loading ? 0.5 : 1,
									}}
								>
									<div style={{ fontSize: 18, marginBottom: 6 }}>{st.icon}</div>
									<div
										style={{
											fontSize: 12,
											fontWeight: 600,
											display: "block",
											color:
												style === st.id ? "#fff" : "rgba(255,255,255,0.55)",
										}}
									>
										{st.label}
									</div>
									<div
										style={{
											fontSize: 10,
											marginTop: 2,
											color: "rgba(255,255,255,0.28)",
										}}
									>
										{st.desc}
									</div>
								</button>
							))}
						</div>
					</div>

					<div
						style={{
							height: 1,
							background: "rgba(255,255,255,0.06)",
							margin: "0 20px",
						}}
					/>

					{/* Voice speed */}
					<div style={{ padding: "16px 20px" }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: 10,
							}}
						>
							<label
								style={{
									fontSize: 10,
									letterSpacing: "0.14em",
									textTransform: "uppercase",
									color: "rgba(255,255,255,0.38)",
								}}
							>
								Voice Speed
							</label>
							<span style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>
								{speed.toFixed(1)}×
							</span>
						</div>
						<input
							type="range"
							min={0.5}
							max={2.0}
							step={0.1}
							value={speed}
							onChange={(e) => setSpeed(parseFloat(e.target.value))}
							disabled={loading}
							style={{
								width: "100%",
								accentColor: "#10b981",
								opacity: loading ? 0.4 : 1,
							}}
						/>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								fontSize: 9,
								color: "rgba(255,255,255,0.2)",
								marginTop: 5,
							}}
						>
							<span>0.5× slow</span>
							<span>1.0× normal</span>
							<span>2.0× fast</span>
						</div>
					</div>

					{/* Generate button */}
					<div style={{ padding: "0 20px 20px" }}>
						<motion.button
							onClick={handleGenerate}
							disabled={!canSubmit}
							whileTap={canSubmit ? { scale: 0.97 } : {}}
							style={{
								width: "100%",
								padding: "14px",
								borderRadius: 12,
								border: "none",
								background: canSubmit ? "#10b981" : "rgba(255,255,255,0.05)",
								color: canSubmit ? "#000000" : "rgba(255,255,255,0.2)",
								fontSize: 13,
								fontWeight: 700,
								fontFamily: "inherit",
								cursor: canSubmit ? "pointer" : "not-allowed",
								letterSpacing: "0.03em",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: 8,
								transition: "all 0.18s",
							}}
						>
							{loading ? (
								<>
									<Spinner />
									Generating video…
								</>
							) : (
								"Generate Video →"
							)}
						</motion.button>
					</div>
				</motion.div>

				{/* ── Pipeline Progress ── */}
				<AnimatePresence>
					{loading && (
						<motion.div
							key="pipeline"
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.28 }}
							style={{ overflow: "hidden", marginBottom: 12 }}
						>
							<div
								style={{
									borderRadius: 16,
									border: "1px solid rgba(255,255,255,0.07)",
									background: "rgba(255,255,255,0.02)",
									padding: 20,
								}}
							>
								<div
									style={{
										fontSize: 10,
										letterSpacing: "0.14em",
										textTransform: "uppercase",
										color: "rgba(255,255,255,0.28)",
										marginBottom: 18,
									}}
								>
									Pipeline Progress
								</div>
								{STEPS.map((step, idx) => {
									const isDone = pipeline.doneSteps.includes(step.id);
									const isActive = pipeline.activeStep === idx;
									return (
										<motion.div
											key={step.id}
											initial={{ opacity: 0, x: -8 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: idx * 0.06 }}
											style={{
												display: "flex",
												alignItems: "flex-start",
												gap: 12,
												marginBottom: idx < STEPS.length - 1 ? 14 : 0,
											}}
										>
											<div
												style={{
													width: 28,
													height: 28,
													borderRadius: 8,
													flexShrink: 0,
													marginTop: 2,
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													fontSize: 11,
													border: isDone
														? "1px solid rgba(16,185,129,0.5)"
														: isActive
															? "1px solid rgba(16,185,129,0.3)"
															: "1px solid rgba(255,255,255,0.08)",
													background: isDone
														? "rgba(16,185,129,0.12)"
														: isActive
															? "rgba(16,185,129,0.06)"
															: "transparent",
													color: isDone
														? "#10b981"
														: isActive
															? "#6ee7b7"
															: "rgba(255,255,255,0.2)",
													transition: "all 0.3s",
												}}
											>
												{isDone ? "✓" : isActive ? <PulsingDot /> : step.icon}
											</div>
											<div>
												<div
													style={{
														fontSize: 12,
														fontWeight: 500,
														marginBottom: 2,
														color: isDone
															? "#10b981"
															: isActive
																? "#ffffff"
																: "rgba(255,255,255,0.25)",
														transition: "color 0.3s",
													}}
												>
													{step.label}
												</div>
												{isActive && (
													<motion.div
														initial={{ opacity: 0 }}
														animate={{ opacity: 1 }}
														style={{
															fontSize: 10,
															color: "rgba(255,255,255,0.3)",
															lineHeight: 1.5,
														}}
													>
														{step.sub}
													</motion.div>
												)}
											</div>
										</motion.div>
									);
								})}
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* ── Error ── */}
				<AnimatePresence>
					{error && (
						<motion.div
							key="error"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0 }}
							style={{
								borderRadius: 14,
								border: "1px solid rgba(239,68,68,0.3)",
								background: "rgba(239,68,68,0.06)",
								padding: 16,
								marginBottom: 12,
								display: "flex",
								gap: 12,
							}}
						>
							<span
								style={{
									color: "#f87171",
									fontSize: 14,
									marginTop: 1,
									flexShrink: 0,
								}}
							>
								⚠
							</span>
							<div>
								<div
									style={{
										fontSize: 12,
										fontWeight: 600,
										color: "#f87171",
										marginBottom: 4,
									}}
								>
									Generation failed
								</div>
								<div
									style={{
										fontSize: 11,
										color: "rgba(252,165,165,0.65)",
										lineHeight: 1.5,
									}}
								>
									{error}
								</div>
								<button
									onClick={() => setError(null)}
									style={{
										background: "none",
										border: "none",
										cursor: "pointer",
										fontFamily: "inherit",
										fontSize: 10,
										color: "rgba(248,113,113,0.6)",
										marginTop: 8,
										textDecoration: "underline",
										padding: 0,
									}}
								>
									Dismiss
								</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* ── Result ── */}
				<AnimatePresence>
					{result && (
						<motion.div
							key="result"
							initial={{ opacity: 0, y: 24, scale: 0.97 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
							style={{
								borderRadius: 16,
								border: "1px solid rgba(16,185,129,0.28)",
								background: "rgba(16,185,129,0.03)",
								overflow: "hidden",
							}}
						>
							{/* Header */}
							<div
								style={{
									padding: "18px 20px 14px",
									borderBottom: "1px solid rgba(255,255,255,0.06)",
								}}
							>
								<div
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: 6,
										fontSize: 9,
										letterSpacing: "0.18em",
										textTransform: "uppercase",
										color: "rgba(16,185,129,0.75)",
										border: "1px solid rgba(16,185,129,0.22)",
										borderRadius: 999,
										padding: "3px 10px",
										marginBottom: 10,
									}}
								>
									<span
										style={{
											width: 5,
											height: 5,
											borderRadius: "50%",
											background: "#10b981",
											display: "inline-block",
										}}
									/>
									Ready · {result.slideCount} slides · {result.style}
								</div>
								<div
									style={{
										fontSize: 17,
										fontWeight: 700,
										color: "#ffffff",
										letterSpacing: "-0.02em",
										fontFamily: "'Syne',system-ui,sans-serif",
									}}
								>
									{result.title}
								</div>
							</div>

							{/* Video player */}
							<div style={{ background: "#000" }}>
								<video
									src={result.videoUrl}
									controls
									autoPlay
									style={{ width: "100%", display: "block", maxHeight: 340 }}
								/>
							</div>

							{/* Narration */}
							{result.narration && (
								<div
									style={{
										padding: "14px 20px",
										borderTop: "1px solid rgba(255,255,255,0.06)",
									}}
								>
									<div
										style={{
											fontSize: 10,
											letterSpacing: "0.14em",
											textTransform: "uppercase",
											color: "rgba(255,255,255,0.28)",
											marginBottom: 8,
										}}
									>
										Script / Narration
									</div>
									<p
										style={{
											fontSize: 11,
											color: "rgba(255,255,255,0.4)",
											lineHeight: 1.65,
											display: "-webkit-box",
											WebkitLineClamp: 4,
											WebkitBoxOrient: "vertical",
											overflow: "hidden",
										}}
									>
										{result.narration}
									</p>
								</div>
							)}

							{/* Actions */}
							<div
								style={{
									padding: "0 20px 20px",
									display: "flex",
									gap: 8,
									flexWrap: "wrap",
									alignItems: "center",
								}}
							>
								<a
									href={result.videoUrl}
									download
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: 6,
										fontSize: 12,
										fontWeight: 600,
										background: "#10b981",
										color: "#000",
										borderRadius: 10,
										padding: "8px 16px",
										textDecoration: "none",
										fontFamily: "inherit",
									}}
								>
									↓ Download MP4
								</a>
								{result.audioUrl && (
									<a
										href={result.audioUrl}
										download
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: 6,
											fontSize: 12,
											fontWeight: 500,
											border: "1px solid rgba(255,255,255,0.12)",
											color: "rgba(255,255,255,0.55)",
											borderRadius: 10,
											padding: "8px 16px",
											textDecoration: "none",
											fontFamily: "inherit",
										}}
									>
										↓ Audio MP3
									</a>
								)}
								<button
									onClick={() => {
										setResult(null);
										setPrompt("");
									}}
									style={{
										marginLeft: "auto",
										background: "none",
										border: "none",
										fontSize: 11,
										color: "rgba(255,255,255,0.25)",
										cursor: "pointer",
										fontFamily: "inherit",
										padding: "8px 4px",
									}}
								>
									Generate another →
								</button>
							</div>

							{/* Slide plan */}
							{result.plan?.slides?.length > 0 && (
								<div
									style={{
										borderTop: "1px solid rgba(255,255,255,0.06)",
										padding: "14px 20px 20px",
									}}
								>
									<div
										style={{
											fontSize: 10,
											letterSpacing: "0.14em",
											textTransform: "uppercase",
											color: "rgba(255,255,255,0.28)",
											marginBottom: 14,
										}}
									>
										Slide Plan
									</div>
									{result.plan.slides.map((slide, i) => (
										<div
											key={i}
											style={{
												display: "flex",
												gap: 12,
												alignItems: "flex-start",
												marginBottom: 10,
											}}
										>
											<span
												style={{
													fontSize: 10,
													color: "rgba(255,255,255,0.2)",
													width: 20,
													flexShrink: 0,
													marginTop: 2,
													fontVariantNumeric: "tabular-nums",
												}}
											>
												{String(i + 1).padStart(2, "0")}
											</span>
											<div>
												<div
													style={{
														fontSize: 12,
														fontWeight: 500,
														color: "rgba(255,255,255,0.68)",
													}}
												>
													{slide.caption}
												</div>
												{slide.scriptLine && (
													<div
														style={{
															fontSize: 10,
															color: "rgba(255,255,255,0.28)",
															marginTop: 2,
															lineHeight: 1.5,
														}}
													>
														{slide.scriptLine}
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</motion.div>
					)}
				</AnimatePresence>

				{/* Footer */}
				{!loading && !result && (
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.55 }}
						style={{
							textAlign: "center",
							fontSize: 10,
							color: "rgba(255,255,255,0.14)",
							marginTop: 28,
							lineHeight: 1.8,
						}}
					>
						Powered by OpenRouter · Remotion · Edge TTS · Firebase Storage
					</motion.p>
				)}
			</div>
		</div>
	);
}
