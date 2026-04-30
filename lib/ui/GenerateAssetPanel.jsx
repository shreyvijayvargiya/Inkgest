import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
	Link2,
	Camera,
	FileText,
	BarChart2,
	Mail,
	Table,
	LayoutTemplate,
	Code2,
} from "lucide-react";
import { useGenerateAsset } from "../hooks/useGenerateAsset";
import {
	GENERATE_PANEL_TYPES,
	taskEmojiForType,
	taskTitleForType,
} from "../config/generateAssets";

function normalizePromptSuggestion(s) {
	if (typeof s === "string") return { urls: [], prompt: s };
	return {
		urls: Array.isArray(s.urls) ? s.urls : [],
		prompt: s.prompt ?? "",
	};
}


/** Lucide icon per panel type — compact tab row */
const PANEL_TAB_ICONS = {
	scrape: Link2,
	"image-gallery": Camera,
	blog: FileText,
	infographics: BarChart2,
	newsletter: Mail,
	table: Table,
	"landing-page": LayoutTemplate,
	react: Code2,
};

/**
 * URLs + prompt + asset type → POST /api/generate/:type (or scrape), stream preview, persist + Open.
 */
export default function GenerateAssetPanel({
	variant = "landing",
	theme: T,
	reduxUser,
	creditRemaining = 0,
	queryClient,
	router,
	onLogin,
	presets = [],
	promptSuggestions = [],
	showFormatControls = false,
	format: formatProp,
	setFormat: setFormatProp,
	style: styleProp,
	setStyle: setStyleProp,
	FORMATS,
	STYLES,
}) {
	const [urlInputs, setUrlInputs] = useState([""]);
	const [prompt, setPrompt] = useState("");
	const [assetType, setAssetType] = useState("blog");
	const [internalFormat, setInternalFormat] = useState("substack");
	const [internalStyle, setInternalStyle] = useState("casual");
	/** Same URL + prompt + type, repeated API calls (max 5). */
	const [variantCount, setVariantCount] = useState(1);

	const format = formatProp ?? internalFormat;
	const style = styleProp ?? internalStyle;
	const setFormat = setFormatProp ?? setInternalFormat;
	const setStyle = setStyleProp ?? setInternalStyle;

	const gen = useGenerateAsset({
		reduxUser,
		router,
		queryClient,
		assetType,
		format,
		style,
		urlInputs,
		setUrlInputs,
		prompt,
		onLogin,
		creditRemaining,
		variantCount,
	});

	const showFormatStyle = Boolean(showFormatControls && FORMATS && STYLES);

	const selectedType = useMemo(
		() =>
			GENERATE_PANEL_TYPES.find((x) => x.value === assetType) ??
			GENERATE_PANEL_TYPES[2],
		[assetType],
	);
	const selectedLabel = selectedType.label;

	const isApp = variant === "app";

	
	const applySuggestion = (s) => {
		const n = normalizePromptSuggestion(s);
		if (n.urls.length) setUrlInputs([...n.urls]);
		else setUrlInputs([""]);
		setPrompt(n.prompt);
	};

	const inputStyle = isApp
		? {
				background: T.surface,
				border: `1.5px solid ${T.border}`,
				borderRadius: 12,
				padding: "12px 14px",
				fontSize: 14,
				color: T.accent,
				outline: "none",
				width: "100%",
				boxSizing: "border-box",
			}
		: {
				background: T.base,
				border: `1px solid ${T.border}`,
				borderRadius: 12,
				padding: "12px 14px",
				fontSize: 14,
				color: T.accent,
				outline: "none",
				width: "100%",
				boxSizing: "border-box",
				fontFamily: "'Outfit', sans-serif",
			};

	const mainCardStyle = isApp
		? {
				width: "100%",
				background: T.surface,
				border: `1px solid ${T.border}`,
				borderRadius: 22,
				boxShadow:
					"0 1px 2px rgba(15, 23, 42, 0.04), 0 16px 40px -12px rgba(15, 23, 42, 0.1)",
				padding: "clamp(22px, 3vw, 36px) clamp(20px, 3vw, 40px)",
				boxSizing: "border-box",
			}
		: {
				width: "100%",
				background: T.surface,
				border: `1px solid ${T.border}`,
				borderRadius: 22,
				boxShadow:
					"0 1px 2px rgba(15, 23, 42, 0.04), 0 24px 48px -12px rgba(15, 23, 42, 0.12)",
				padding: "clamp(24px, 4vw, 40px) clamp(22px, 3.5vw, 44px)",
				boxSizing: "border-box",
			};

	const suggestionsCardStyle = {
		width: "100%",
		background: T.surface,
		border: `1px solid ${T.border}`,
		borderRadius: 22,
		boxShadow:
			"0 1px 2px rgba(15, 23, 42, 0.04), 0 16px 40px -12px rgba(15, 23, 42, 0.1)",
		padding: "clamp(20px, 3vw, 28px) clamp(20px, 3vw, 40px)",
		boxSizing: "border-box",
	};

	return (
		<div
			style={{
				width: "100%",
				display: "flex",
				flexDirection: "column",
				gap: 20,
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 0,
					...mainCardStyle,
				}}
			>
			<header
				style={{
					paddingBottom: 22,
					marginBottom: 24,
				}}
			>
				<p
					className="text-2xl font-bold text-warm md:text-3xl"
					style={{ marginBottom: 10, letterSpacing: "-0.02em" }}
				>
					<span style={{ color: T.warm }}>✦</span> Create an asset
				</p>
				<p
					style={{
						color: T.muted,
						lineHeight: 1.6,
						maxWidth: 640,
						fontSize: 15,
						fontFamily: "'Outfit', sans-serif",
					}}
				>
					Paste links, add a short brief (optional for most types), then pick an
					output — each option turns URLs into something you can ship.
				</p>
			</header>

			<section style={{ width: "100%", marginBottom: 28 }}>
				<label
					style={{
						display: "block",
						fontSize: 11,
						fontWeight: 700,
						textTransform: "",
						letterSpacing: "0.1em",
						color: T.muted,
						marginBottom: 12,
						fontFamily: "'Outfit', sans-serif",
					}}
				>
					Output type
				</label>
				<div
					role="tablist"
					aria-label="Asset output type"
					className="flex flex-nowrap gap-0.5 overflow-x-auto"
					style={{
						padding: 4,
						borderRadius: 14,
						border: `1px solid ${T.border}`,
						background: T.base,
						scrollbarWidth: "thin",
						WebkitOverflowScrolling: "touch",
					}}
				>
					{GENERATE_PANEL_TYPES.map((opt) => {
						const active = assetType === opt.value;
						const Icon = PANEL_TAB_ICONS[opt.value] || FileText;
						return (
							<motion.button
								key={opt.value}
								type="button"
								role="tab"
								aria-selected={active}
								whileHover={gen.loading ? {} : { scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => setAssetType(opt.value)}
								disabled={gen.loading}
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: 7,
									padding: "8px 12px",
									minHeight: 36,
									borderRadius: 10,
									border: "none",
									background: active ? T.surface : "transparent",
									color: active ? T.accent : T.muted,
									cursor: gen.loading ? "not-allowed" : "pointer",
									flexShrink: 0,
									boxShadow: active
										? "0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)"
										: "none",
									transition: "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
									fontFamily: "'Outfit', sans-serif",
								}}
							>
								<Icon size={15} strokeWidth={2} aria-hidden className="flex-shrink-0" />
								<span
									style={{
										fontSize: 12,
										fontWeight: active ? 700 : 600,
										whiteSpace: "nowrap",
										lineHeight: 1.2,
									}}
								>
									{opt.label}
								</span>
							</motion.button>
						);
					})}
				</div>
				<div
					style={{
						marginTop: 14,
						padding: "14px 18px",
						borderRadius: 14,
						background: T.base,
						border: `1px solid ${T.border}`,
						fontSize: 13,
						lineHeight: 1.55,
						color: T.muted,
						fontFamily: "'Outfit', sans-serif",
					}}
				>
					<strong style={{ color: T.accent, fontWeight: 700 }}>
						{selectedLabel}
					</strong>
					{" — "}
					{selectedType.hint}
				</div>
			</section>

			<div
				style={{
					width: "100%",
					display: "flex",
					flexDirection: "column",
					gap: 22,
				}}
			>
				<div className="flex min-w-0 flex-col gap-2">
					<label
						style={{
							fontSize: 11,
							fontWeight: 700,
							textTransform: "",
							letterSpacing: "0.1em",
							color: T.muted,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						Source URLs
					</label>
					{urlInputs.map((u, i) => (
						<div
							key={i}
							style={{ display: "flex", gap: 8, alignItems: "center" }}
						>
							<input
								type="url"
								value={u}
								onChange={(e) => gen.setUrlAt(i, e.target.value)}
								placeholder="https://…"
								disabled={gen.loading}
								style={inputStyle}
								onFocus={(e) => {
									e.target.style.borderColor = T.warm;
								}}
								onBlur={(e) => {
									e.target.style.borderColor = T.border;
								}}
							/>
							{urlInputs.length > 1 && (
								<button
									type="button"
									onClick={() => gen.removeUrlAt(i)}
									style={{
										background: "none",
										border: "none",
										color: T.muted,
										cursor: "pointer",
										padding: 4,
										flexShrink: 0,
									}}
									aria-label="Remove URL"
								>
									×
								</button>
							)}
						</div>
					))}
					<motion.button
						type="button"
						whileTap={{ scale: 0.98 }}
						onClick={gen.addUrlField}
						disabled={gen.loading}
						style={{
							alignSelf: "flex-start",
							fontSize: 12,
							fontWeight: 600,
							color: T.warm,
							background: "none",
							border: "none",
							cursor: gen.loading ? "not-allowed" : "pointer",
							padding: 0,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						+ Add URL
					</motion.button>
				</div>

				<div className="w-full min-w-0">
					<label
						style={{
							display: "block",
							fontSize: 11,
							fontWeight: 700,
							textTransform: "",
							letterSpacing: "0.1em",
							color: T.muted,
							marginBottom: 8,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						Prompt
					</label>
					<textarea
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						placeholder="Describe tone, audience, and what you want (optional if URLs are enough)."
						rows={4}
						disabled={gen.loading}
						style={{
							...inputStyle,
							resize: "vertical",
							lineHeight: 1.6,
							minHeight: 100,
						}}
						onFocus={(e) => {
							e.target.style.borderColor = T.warm;
						}}
						onBlur={(e) => {
							e.target.style.borderColor = T.border;
						}}
					/>
				</div>

				
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "stretch",
					gap: 16,
					width: "100%",
				}}
			>
				<div
					style={{
						flex: 1,
						minWidth: 0,
						display: "flex",
						flexDirection: "column",
						gap: 10,
						justifyContent: "center",
					}}
				>
					<motion.button
						type="button"
						whileHover={gen.canSubmit && !gen.loading ? { scale: 1.01 } : {}}
						whileTap={{ scale: 0.99 }}
						onClick={gen.loading ? gen.cancel : gen.handleGenerate}
						disabled={!gen.loading && !gen.canSubmit}
						style={{
							width: "100%",
							padding: "15px 20px",
							borderRadius: 14,
							border: "none",
							background: gen.loading || !gen.canSubmit ? T.border : T.accent,
							color: gen.loading || !gen.canSubmit ? T.muted : "white",
							fontWeight: 700,
							fontSize: 15,
							cursor:
								!gen.canSubmit && !gen.loading ? "not-allowed" : "pointer",
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						{gen.loading
							? "Generating…"
							: variantCount > 1
								? `Generate ×${variantCount}`
								: "Generate"}
					</motion.button>
					{gen.loading && (
						<motion.button
							type="button"
							whileTap={{ scale: 0.98 }}
							onClick={gen.cancel}
							style={{
								width: "100%",
								padding: "12px 16px",
								borderRadius: 12,
								border: `1px solid ${T.border}`,
								background: "#FEE2E2",
								color: "#DC2626",
								fontWeight: 600,
								fontSize: 13,
								cursor: "pointer",
								fontFamily: "'Outfit', sans-serif",
							}}
						>
							Stop
						</motion.button>
					)}
				</div>
			</div>

			{gen.error && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					style={{
						marginTop: 20,
						padding: "14px 18px",
						background: "#FEF2F2",
						border: "1px solid #FECACA",
						borderRadius: 14,
						fontSize: 13,
						color: "#DC2626",
						fontFamily: "'Outfit', sans-serif",
					}}
				>
					{gen.error}
				</motion.div>
			)}

			{(gen.loading ||
				gen.streamed ||
				gen.completedTasks.length > 0 ||
				(Array.isArray(gen.slotOutputs) && gen.slotOutputs.length > 1)) && (
				<motion.div
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					style={{
						marginTop: 24,
						padding: 22,
						background: T.base,
						border: `1px solid ${T.border}`,
						borderRadius: 16,
						fontFamily: "'Outfit', sans-serif",
					}}
				>
					<p
						style={{
							fontSize: 14,
							fontWeight: 700,
							color: T.accent,
							marginBottom: 12,
							display: "flex",
							alignItems: "center",
							gap: 8,
						}}
					>
						<span style={{ color: T.warm }}>✦</span> Output
					</p>
					{gen.lastRunPrompt && (
						<p
							style={{
								fontSize: 12,
								color: T.muted,
								marginBottom: 10,
							}}
						>
							<strong style={{ color: T.accent }}>{selectedLabel}</strong>
							{gen.lastRunType ? ` · ${gen.lastRunType}` : ""}
							{gen.lastRunPrompt
								? ` — “${gen.lastRunPrompt.slice(0, 120)}${gen.lastRunPrompt.length > 120 ? "…" : ""}”`
								: ""}
						</p>
					)}

					{Array.isArray(gen.slotOutputs) && gen.slotOutputs.length > 1 ? (
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 20,
							}}
						>
							{gen.slotOutputs.map((slot, idx) => (
								<div
									key={idx}
									style={{
										padding: 14,
										borderRadius: 12,
										border: `1px solid ${T.border}`,
										background: T.base,
									}}
								>
									<p
										style={{
											fontSize: 12,
											fontWeight: 700,
											color: T.accent,
											marginBottom: 10,
										}}
									>
										Copy {slot.slot ?? idx + 1} of {gen.slotOutputs.length}
									</p>
									{slot.error && (
										<p
											style={{
												fontSize: 12,
												color: slot.error === "Skipped" ? T.muted : "#DC2626",
												marginBottom: 8,
											}}
										>
											{slot.error}
										</p>
									)}
									{slot.loading && !slot.streamed && !slot.error && (
										<p style={{ fontSize: 13, color: T.muted }}>
											Working on this copy…
										</p>
									)}
									{Boolean(slot.streamed) && (
										<pre
											style={{
												fontSize: 12,
												lineHeight: 1.55,
												color: T.accent,
												whiteSpace: "pre-wrap",
												wordBreak: "break-word",
												maxHeight: 240,
												overflow: "auto",
												margin: "0 0 12px 0",
												padding: 12,
												background: T.surface,
												borderRadius: 10,
												border: `1px solid ${T.border}`,
												fontFamily: "ui-monospace, monospace",
											}}
										>
											{slot.streamed}
										</pre>
									)}
									{slot.completedTasks?.length > 0 && (
										<div>
											<p
												style={{
													fontSize: 11,
													color: T.muted,
													marginBottom: 8,
													fontWeight: 600,
												}}
											>
												Open in editor
											</p>
											<div
												style={{
													display: "flex",
													flexDirection: "column",
													gap: 8,
												}}
											>
												{slot.completedTasks.map((t, i) => (
													<motion.a
														key={`${t.id}-${i}`}
														href={t.path}
														onClick={(e) => {
															e.preventDefault();
															router.push(t.path);
														}}
														whileHover={{ x: 2, scale: 1.01 }}
														whileTap={{ scale: 0.99 }}
														style={{
															display: "flex",
															alignItems: "center",
															justifyContent: "space-between",
															padding: "10px 12px",
															background: T.surface,
															border: `1px solid ${T.border}`,
															borderRadius: 10,
															textDecoration: "none",
															color: T.accent,
															fontSize: 13,
															fontWeight: 600,
															cursor: "pointer",
														}}
													>
														<span
															style={{
																display: "flex",
																alignItems: "center",
																gap: 8,
															}}
														>
															<span>{taskEmojiForType(t.type)}</span>
															<span>
																{taskTitleForType(t.type)}
																{t.label ? ` · ${t.label}` : ""}
															</span>
														</span>
														<span
															style={{
																fontSize: 12,
																color: T.warm,
																fontWeight: 700,
															}}
														>
															Open →
														</span>
													</motion.a>
												))}
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					) : (
						<>
							{gen.loading && !gen.streamed && (
								<p style={{ fontSize: 13, color: T.muted }}>
									Working on your asset…
								</p>
							)}
							{gen.streamed && (
								<pre
									style={{
										fontSize: 12,
										lineHeight: 1.55,
										color: T.accent,
										whiteSpace: "pre-wrap",
										wordBreak: "break-word",
										maxHeight: 320,
										overflow: "auto",
										margin: 0,
										padding: 12,
										background: T.base,
										borderRadius: 10,
										border: `1px solid ${T.border}`,
										fontFamily: "ui-monospace, monospace",
									}}
								>
									{gen.streamed}
								</pre>
							)}
							{gen.completedTasks.length > 0 && (
								<div style={{ marginTop: 14 }}>
									<p
										style={{
											fontSize: 12,
											color: T.muted,
											marginBottom: 10,
											fontWeight: 600,
										}}
									>
										Open in editor
									</p>
									<div
										style={{ display: "flex", flexDirection: "column", gap: 8 }}
									>
										{gen.completedTasks.map((t, i) => (
											<motion.a
												key={`${t.id}-${i}`}
												href={t.path}
												onClick={(e) => {
													e.preventDefault();
													router.push(t.path);
												}}
												whileHover={{ x: 2, scale: 1.01 }}
												whileTap={{ scale: 0.99 }}
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: "space-between",
													padding: "12px 14px",
													background: T.base,
													border: `1px solid ${T.border}`,
													borderRadius: 10,
													textDecoration: "none",
													color: T.accent,
													fontSize: 13,
													fontWeight: 600,
													cursor: "pointer",
												}}
											>
												<span
													style={{
														display: "flex",
														alignItems: "center",
														gap: 8,
													}}
												>
													<span>{taskEmojiForType(t.type)}</span>
													<span>
														{taskTitleForType(t.type)}
														{t.label ? ` · ${t.label}` : ""}
													</span>
												</span>
												<span
													style={{
														fontSize: 12,
														color: T.warm,
														fontWeight: 700,
													}}
												>
													Open →
												</span>
											</motion.a>
										))}
									</div>
								</div>
							)}
						</>
					)}
				</motion.div>
			)}
			</div>

			{!gen.loading &&
				gen.completedTasks.length === 0 &&
				promptSuggestions.length > 0 && (
					<div style={suggestionsCardStyle}>
						<label
							style={{
								display: "block",
								fontSize: 11,
								fontWeight: 700,
								textTransform: "",
								letterSpacing: "0.1em",
								color: T.muted,
								marginBottom: 12,
								fontFamily: "'Outfit', sans-serif",
							}}
						>
							Try a suggestion
						</label>
						<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
							{promptSuggestions.map((raw, i) => {
								const s = normalizePromptSuggestion(raw);
								return (
									<motion.button
										key={i}
										type="button"
										whileHover={{ scale: 1.005, x: 4 }}
										whileTap={{ scale: 0.995 }}
										onClick={() => applySuggestion(raw)}
										style={{
											width: "100%",
											padding: "14px 18px",
											borderRadius: 12,
											fontSize: 13,
											fontWeight: 500,
											cursor: "pointer",
											border: `1px solid ${T.border}`,
											background: T.base,
											color: T.accent,
											textAlign: "left",
											lineHeight: 1.5,
											fontFamily: "'Outfit', sans-serif",
										}}
									>
										{s.urls.length > 0 && (
											<div
												style={{
													fontSize: 11,
													fontWeight: 500,
													color: T.muted,
													wordBreak: "break-all",
													marginBottom: 6,
													lineHeight: 1.45,
												}}
											>
												{s.urls.map((u, j) => (
													<span key={j}>
														{j > 0 ? " · " : ""}
														{u}
													</span>
												))}
											</div>
										)}
										<div style={{ fontWeight: 600 }}>{s.prompt}</div>
									</motion.button>
								);
							})}
						</div>
					</div>
				)}
		</div>
	);
}
