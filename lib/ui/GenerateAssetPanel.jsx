import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useGenerateAsset } from "../hooks/useGenerateAsset";
import {
	GENERATE_ASSET_TYPES,
	taskEmojiForType,
	taskTitleForType,
} from "../config/generateAssets";
import { FREE_CREDIT_LIMIT } from "../utils/credits";

function normalizePromptSuggestion(s) {
	if (typeof s === "string") return { urls: [], prompt: s };
	return {
		urls: Array.isArray(s.urls) ? s.urls : [],
		prompt: s.prompt ?? "",
	};
}

/**
 * URLs + prompt + asset type → Hono POST /generate/:type (Bearer token), stream preview, persist + Open.
 */
export default function GenerateAssetPanel({
	variant = "landing",
	theme: T,
	reduxUser,
	credits,
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
	const [assetType, setAssetType] = useState("newsletter");
	const [dropdownOpen, setDropdownOpen] = useState(false);
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

	const selectedLabel =
		GENERATE_ASSET_TYPES.find((x) => x.value === assetType)?.label ??
		"Asset type";

	const isApp = variant === "app";

	const applyPreset = (p) => {
		if (p.urls?.length) setUrlInputs([...p.urls]);
		else setUrlInputs([""]);
		setPrompt(p.prompt || "");
		if (p.assetType) setAssetType(p.assetType);
	};

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
				borderRadius: 11,
				padding: "10px 12px",
				fontSize: 14,
				color: T.accent,
				outline: "none",
				width: "100%",
				boxSizing: "border-box",
			}
		: {
				background: T.base,
				border: `1px solid ${T.border}`,
				borderRadius: 10,
				padding: "10px 12px",
				fontSize: 14,
				color: T.accent,
				outline: "none",
				width: "100%",
				boxSizing: "border-box",
				fontFamily: "'Outfit', sans-serif",
			};

	return (
		<div
			style={
				isApp
					? {
							display: "flex",
							flexDirection: "column",
							gap: 20,
							width: "100%",
						}
					: {}
			}
		>
			<p
				style={{
					fontSize: 15,
					fontWeight: 700,
					color: T.accent,
					marginBottom: 4,
					display: "flex",
					alignItems: "center",
					gap: 8,
					fontFamily: "'Outfit', sans-serif",
				}}
			>
				<span style={{ color: T.warm }}>✦</span> Create an asset
			</p>
			<p
				style={{
					fontSize: 13,
					color: T.muted,
					marginBottom: 16,
					fontFamily: "'Outfit', sans-serif",
				}}
			>
				Add source URLs, describe your angle, and pick what to generate.
			</p>

			<div
				className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end justify-start"
				style={{ width: "100%" }}
			>
				<div
					className="flex flex-col gap-2 min-w-0 md:flex-1"
					style={{ minWidth: isApp ? 200 : 180 }}
				>
					<label
						style={{
							fontSize: 11,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.08em",
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

				<div className="w-full" style={{ minWidth: isApp ? 220 : 200 }}>
					<label
						style={{
							display: "block",
							fontSize: 11,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.08em",
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

				<div
					style={{
						position: "relative",
						minWidth: 200,
						width: "100%",
						maxWidth: 280,
					}}
				>
					<label
						style={{
							display: "block",
							fontSize: 11,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							color: T.muted,
							marginBottom: 8,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						Asset type
					</label>
					<motion.button
						type="button"
						whileTap={{ scale: 0.99 }}
						onClick={() => setDropdownOpen((o) => !o)}
						disabled={gen.loading}
						style={{
							width: "100%",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 8,
							padding: "12px 14px",
							borderRadius: 12,
							border: `1.5px solid ${T.border}`,
							background: isApp ? T.surface : T.base,
							color: T.accent,
							fontSize: 14,
							fontWeight: 600,
							cursor: gen.loading ? "not-allowed" : "pointer",
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						<span>{selectedLabel}</span>
						<motion.span
							animate={{ rotate: dropdownOpen ? 180 : 0 }}
							transition={{ duration: 0.2 }}
						>
							<ChevronDown size={18} strokeWidth={2} />
						</motion.span>
					</motion.button>
					<AnimatePresence>
						{dropdownOpen && (
							<motion.div
								initial={{ opacity: 0, y: -6, height: 0 }}
								animate={{ opacity: 1, y: 0, height: "auto" }}
								exit={{ opacity: 0, y: -4, height: 0 }}
								transition={{ duration: 0.2 }}
								style={{
									position: "absolute",
									zIndex: 40,
									left: 0,
									right: 0,
									top: "100%",
									marginTop: 6,
									overflow: "hidden",
									borderRadius: 12,
									border: `1px solid ${T.border}`,
									background: isApp ? T.surface : T.surface,
									boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
								}}
							>
								<div style={{ maxHeight: 280, overflowY: "auto" }}>
									{GENERATE_ASSET_TYPES.map((opt) => (
										<button
											key={opt.value}
											type="button"
											onClick={() => {
												setAssetType(opt.value);
												setDropdownOpen(false);
											}}
											style={{
												display: "block",
												width: "100%",
												textAlign: "left",
												padding: "10px 14px",
												fontSize: 13,
												fontWeight: assetType === opt.value ? 700 : 500,
												background:
													assetType === opt.value
														? `${T.warm}18`
														: "transparent",
												color: T.accent,
												border: "none",
												cursor: "pointer",
												fontFamily: "'Outfit', sans-serif",
											}}
										>
											{opt.label}
										</button>
									))}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				<div
					style={{
						minWidth: 160,
						width: "100%",
						maxWidth: 200,
					}}
				>
					<label
						style={{
							display: "block",
							fontSize: 11,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							color: T.muted,
							marginBottom: 8,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						Copies (max 5)
					</label>
					<select
						value={variantCount}
						onChange={(e) =>
							setVariantCount(
								Math.min(5, Math.max(1, Number(e.target.value) || 1)),
							)
						}
						disabled={gen.loading}
						style={{
							width: "100%",
							padding: "12px 14px",
							borderRadius: 12,
							border: `1.5px solid ${T.border}`,
							background: isApp ? T.surface : T.base,
							color: T.accent,
							fontSize: 14,
							fontWeight: 600,
							cursor: gen.loading ? "not-allowed" : "pointer",
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						{[1, 2, 3, 4, 5].map((n) => (
							<option key={n} value={n}>
								{n} — same asset ×{n}
							</option>
						))}
					</select>
				</div>
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 12,
					flexWrap: "wrap",
					marginTop: 8,
				}}
			>
				<div
					style={{ display: "flex", gap: 8, justifyContent: "space-between" }}
				>
					<motion.button
						type="button"
						whileHover={gen.canSubmit && !gen.loading ? { scale: 1.02 } : {}}
						whileTap={{ scale: 0.98 }}
						onClick={gen.loading ? gen.cancel : gen.handleGenerate}
						disabled={!gen.loading && !gen.canSubmit}
						style={{
							padding: "12px 22px",
							borderRadius: 12,
							border: "none",
							background: gen.loading || !gen.canSubmit ? T.border : T.accent,
							color: gen.loading || !gen.canSubmit ? T.muted : "white",
							fontWeight: 700,
							fontSize: 14,
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
							whileTap={{ scale: 0.95 }}
							onClick={gen.cancel}
							style={{
								padding: "10px 16px",
								borderRadius: 10,
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
				{reduxUser && credits && (
					<span
						style={{
							fontSize: 12,
							fontWeight: 600,
							color: T.muted,
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						{credits?.plan === "pro"
							? "Pro"
							: `${Math.max(0, credits?.remaining ?? FREE_CREDIT_LIMIT).toFixed(1)}/${credits?.creditsLimit ?? FREE_CREDIT_LIMIT}`}
					</span>
				)}
			</div>

			{gen.error && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					style={{
						padding: "12px 14px",
						background: "#FEF2F2",
						border: "1px solid #FECACA",
						borderRadius: 10,
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
						marginTop: 8,
						padding: 18,
						background: T.surface,
						border: `1px solid ${T.border}`,
						borderRadius: 14,
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

			{!gen.loading &&
				gen.completedTasks.length === 0 &&
				promptSuggestions.length > 0 && (
					<div style={{ marginTop: 8 }}>
						<label
							style={{
								display: "block",
								fontSize: 11,
								fontWeight: 700,
								textTransform: "uppercase",
								letterSpacing: "0.08em",
								color: T.muted,
								marginBottom: 8,
								fontFamily: "'Outfit', sans-serif",
							}}
						>
							Try a suggestion
						</label>
						<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
											padding: "12px 16px",
											borderRadius: 10,
											fontSize: 13,
											fontWeight: 500,
											cursor: "pointer",
											border: `1.5px solid ${T.border}`,
											background: isApp ? T.surface : T.base,
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
