import { useState, useMemo, useCallback } from "react";
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
	File,
	Sparkles,
} from "lucide-react";
import { useGenerateAsset } from "../hooks/useGenerateAsset";
import { useInkgestAgentAssetGenerate } from "../hooks/useInkgestAgentAssetGenerate";
import { createDraft } from "../api/userAssets";
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
	agent: Sparkles,
	table: Table,
	"landing-page": LayoutTemplate,
	react: Code2,
	blank: File,
};

/**
 * URLs + prompt + asset type → POST /generate/:type (or scrape), stream preview, persist + Open.
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
	/** Initial tab — e.g. `"agent"` on marketing hero */
	initialAssetType = "blog",
}) {
	const [urlInputs, setUrlInputs] = useState([""]);
	const [prompt, setPrompt] = useState("");
	const [assetType, setAssetType] = useState(() => initialAssetType);
	const [internalFormat, setInternalFormat] = useState("substack");
	const [internalStyle, setInternalStyle] = useState("casual");
	/** Same URL + prompt + type, repeated API calls (max 5). */
	const [variantCount, setVariantCount] = useState(1);
	const [blankName, setBlankName] = useState("");
	const [blankCreating, setBlankCreating] = useState(false);
	const [blankError, setBlankError] = useState(null);

	const format = formatProp ?? internalFormat;
	const style = styleProp ?? internalStyle;


	const hookAssetType =
		assetType === "blank" || assetType === "agent" ? "blog" : assetType;

	const gen = useGenerateAsset({
		reduxUser,
		router,
		queryClient,
		assetType: hookAssetType,
		format,
		style,
		urlInputs,
		setUrlInputs,
		prompt,
		onLogin,
		creditRemaining,
		variantCount,
	});

	const agentGen = useInkgestAgentAssetGenerate({
		reduxUser,
		queryClient,
		router,
		creditRemaining,
		onLogin,
	});


	const selectedType = useMemo(
		() =>
			GENERATE_PANEL_TYPES.find((x) => x.value === assetType) ??
			GENERATE_PANEL_TYPES.find((x) => x.value === "blog"),
		[assetType],
	);
	const selectedLabel = selectedType.label;

	const isApp = variant === "app";
	const isBlank = assetType === "blank";
	const isAgentTab = assetType === "agent";

	function shortUrlChip(u, max = 48) {
		if (!u || u.length <= max) return u || "";
		return `${u.slice(0, max - 1)}…`;
	}

	const handleCreateBlank = useCallback(async () => {
		setBlankError(null);
		if (!reduxUser) {
			onLogin?.();
			return;
		}
		setBlankCreating(true);
		try {
			const title = blankName.trim() || "Untitled draft";
			const now = new Date();
			const date = now.toLocaleDateString("en-US", {
				weekday: "short",
				month: "short",
				day: "numeric",
			});
			const draft = {
				title,
				preview: "",
				body: "",
				urls: [],
				words: 0,
				date,
				tag: "Draft",
			};
			const { id } = await createDraft(reduxUser.uid, draft);
			if (queryClient) {
				queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
			}
			setBlankName("");
			if (router?.push) router.push(`/app/${id}`);
		} catch (e) {
			setBlankError(e?.message || "Could not create draft");
		} finally {
			setBlankCreating(false);
		}
	}, [blankName, onLogin, queryClient, reduxUser, router]);

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
				fontFamily: "'Comic', sans-serif",
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
					paddingBottom: 10,
				}}
			>
				<p
					className="text-2xl font-bold text-warm md:text-3xl"
					style={{ marginBottom: 5, letterSpacing: "-0.02em" }}
				>
					<span style={{ color: T.warm }}>✦</span> Create {selectedLabel}
				</p>
				<p
					style={{
						color: T.muted,
						lineHeight: 1.6,
						maxWidth: 640,
						fontSize: 15,
						fontFamily: "'Comic', sans-serif",
					}}
				>
					{isBlank
						? "Give your draft a name, then open it in the editor—saved to your workspace, no AI run required."
						: isAgentTab
							? "Paste URLs and instructions together. We detect links, scrape them on run, and the agent decides what to create—same backend as Inkgest Agent."
							: `Paste links, add a short brief to create your ${selectedLabel} post`}
				</p>
			</header>

			<section style={{ width: "100%", marginBottom: 28 }}>
				<div
					role="tablist"
					aria-label="Asset output type"
					className={
						isApp
							? "flex min-w-0 max-w-full w-full flex-nowrap gap-0.5 hidescrollbar overflow-x-auto"
							: "flex w-fit flex-nowrap gap-0.5 overflow-x-auto"
					}
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
								whileHover={
									gen.loading || blankCreating || agentGen.loading
										? {}
										: { scale: 1.02 }
								}
								whileTap={{ scale: 0.98 }}
								onClick={() => {
									setAssetType(opt.value);
									if (opt.value !== "blank") setBlankError(null);
								}}
								disabled={gen.loading || blankCreating || agentGen.loading}
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
									cursor:
										gen.loading || blankCreating || agentGen.loading
											? "not-allowed"
											: "pointer",
									flexShrink: 0,
									boxShadow: active
										? "0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)"
										: "none",
									transition: "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
									fontFamily: "'Comic', sans-serif",
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
				
			</section>

			<div
				style={{
					width: "100%",
					display: "flex",
					flexDirection: "column",
					gap: 22,
				}}
			>
				{isBlank ? (
					<div className="w-full min-w-0">
						<label
							style={{
								display: "block",
								fontSize: 11,
								fontWeight: 700,
								letterSpacing: "0.1em",
								color: T.muted,
								marginBottom: 8,
								fontFamily: "'Comic', sans-serif",
							}}
						>
							Draft name
						</label>
						<input
							type="text"
							value={blankName}
							onChange={(e) => setBlankName(e.target.value)}
							placeholder="Title of the draft"
							disabled={blankCreating}
							style={inputStyle}
							onFocus={(e) => {
								e.target.style.borderColor = T.warm;
							}}
							onBlur={(e) => {
								e.target.style.borderColor = T.border;
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !blankCreating) handleCreateBlank();
							}}
						/>
						
					</div>
				) : isAgentTab ? (
					<div className="flex w-full min-w-0 flex-col gap-3">
						<label
							style={{
								fontSize: 11,
								fontWeight: 700,
								textTransform: "",
								letterSpacing: "0.1em",
								color: T.muted,
								fontFamily: "'Comic', sans-serif",
							}}
						>
							Prompt & URLs
						</label>
						{agentGen.extractedUrls.length > 0 && (
							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									gap: 8,
									marginBottom: 2,
								}}
							>
								{agentGen.extractedUrls.map((url) => (
									<span
										key={url}
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: 6,
											padding: "6px 10px",
											borderRadius: 10,
											background: T.surface,
											border: `1px solid ${T.border}`,
											fontSize: 12,
											color: T.accent,
											maxWidth: "100%",
										}}
									>
										<span
											title={url}
											style={{
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
												maxWidth: 280,
											}}
										>
											{shortUrlChip(url)}
										</span>
										<button
											type="button"
											disabled={agentGen.loading}
											onClick={() => agentGen.removeChipUrl(url)}
											style={{
												background: "none",
												border: "none",
												color: T.muted,
												cursor: agentGen.loading
													? "not-allowed"
													: "pointer",
												padding: 0,
												lineHeight: 1,
												fontSize: 16,
											}}
											aria-label={`Remove link ${url}`}
										>
											×
										</button>
									</span>
								))}
							</div>
						)}
						<textarea
							value={agentGen.combinedPrompt}
							onChange={(e) => agentGen.setCombinedPrompt(e.target.value)}
							placeholder="Paste one or more https links and say what you want — e.g. turn https://… into a Sunday newsletter for founders…"
							rows={6}
							disabled={agentGen.loading}
							style={{
								...inputStyle,
								resize: "vertical",
								lineHeight: 1.6,
								minHeight: 140,
							}}
							onFocus={(e) => {
								e.target.style.borderColor = T.warm;
							}}
							onBlur={(e) => {
								e.target.style.borderColor = T.border;
							}}
						/>
					</div>
				) : (
					<>
						<div className="flex min-w-0 flex-col gap-2">
							<label
								style={{
									fontSize: 11,
									fontWeight: 700,
									textTransform: "",
									letterSpacing: "0.1em",
									color: T.muted,
									fontFamily: "'Comic', sans-serif",
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
									fontFamily: "'Comic', sans-serif",
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
									fontFamily: "'Comic', sans-serif",
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
					</>
				)}
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
					className="my-4"
				>
					{isBlank ? (
						<motion.button
							type="button"
							whileHover={!blankCreating ? { scale: 1.01 } : {}}
							whileTap={{ scale: 0.99 }}
							onClick={handleCreateBlank}
							disabled={blankCreating}
							style={{
								width: "100%",
								padding: "15px 20px",
								borderRadius: 14,
								border: "none",
								background: blankCreating ? T.border : T.accent,
								color: blankCreating ? T.muted : "white",
								fontWeight: 700,
								fontSize: 15,
								cursor: blankCreating ? "not-allowed" : "pointer",
								fontFamily: "'Comic', sans-serif",
							}}
						>
							{blankCreating ? "Creating…" : "Create draft"}
						</motion.button>
					) : (
						<>
							<motion.button
								type="button"
								whileHover={
									(isAgentTab
										? agentGen.canSubmit && !agentGen.loading
										: gen.canSubmit && !gen.loading)
										? { scale: 1.01 }
										: {}
								}
								whileTap={{ scale: 0.99 }}
								onClick={
									isAgentTab
										? agentGen.loading
											? agentGen.cancel
											: agentGen.handleGenerate
										: gen.loading
											? gen.cancel
											: gen.handleGenerate
								}
								disabled={
									isAgentTab
										? !agentGen.loading && !agentGen.canSubmit
										: !gen.loading && !gen.canSubmit
								}
								style={{
									width: "100%",
									padding: "15px 20px",
									borderRadius: 14,
									border: "none",
									background:
										(isAgentTab
											? agentGen.loading || !agentGen.canSubmit
											: gen.loading || !gen.canSubmit)
											? T.border
											: T.accent,
									color:
										(isAgentTab
											? agentGen.loading || !agentGen.canSubmit
											: gen.loading || !gen.canSubmit)
											? T.muted
											: "white",
									fontWeight: 700,
									fontSize: 15,
									cursor:
										(isAgentTab
											? !agentGen.canSubmit && !agentGen.loading
											: !gen.canSubmit && !gen.loading)
											? "not-allowed"
											: "pointer",
									fontFamily: "'Comic', sans-serif",
								}}
							>
								{isAgentTab
									? agentGen.loading
										? "Running agent…"
										: "Generate"
									: gen.loading
										? "Generating…"
										: variantCount > 1
											? `Generate ×${variantCount}`
											: "Generate"}
							</motion.button>
							{(isAgentTab ? agentGen.loading : gen.loading) && (
								<motion.button
									type="button"
									whileTap={{ scale: 0.98 }}
									onClick={isAgentTab ? agentGen.cancel : gen.cancel}
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
										fontFamily: "'Comic', sans-serif",
									}}
								>
									Stop
								</motion.button>
							)}
							{isAgentTab && agentGen.urlProgress.length > 0 && (
								<div style={{ marginTop: 12 }}>
									<p
										style={{
											fontSize: 11,
											fontWeight: 700,
											letterSpacing: "0.08em",
											color: T.muted,
											marginBottom: 8,
										}}
									>
										Scrape progress
									</p>
									<ul
										style={{
											listStyle: "none",
											margin: 0,
											padding: 0,
											display: "flex",
											flexDirection: "column",
											gap: 8,
										}}
									>
										{agentGen.urlProgress.map(({ url: u, status }) => (
											<li
												key={u}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 10,
													fontSize: 12,
													color:
														status === "error"
															? "#DC2626"
															: T.accent,
												}}
											>
												<span style={{ flexShrink: 0, width: 18 }}>
													{status === "done"
														? "✓"
														: status === "scraping"
															? "…"
															: status === "error"
																? "✕"
																: status === "skipped"
																	? "–"
																	: "○"}
												</span>
												<span
													style={{
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
													}}
													title={u}
												>
													{shortUrlChip(u, 72)}
												</span>
											</li>
										))}
									</ul>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			{blankError && (
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
						fontFamily: "'Comic', sans-serif",
					}}
				>
					{blankError}
				</motion.div>
			)}

			{(isAgentTab ? agentGen.error : gen.error) && (
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
						fontFamily: "'Comic', sans-serif",
					}}
				>
					{isAgentTab ? agentGen.error : gen.error}
				</motion.div>
			)}

			{!isBlank &&
				(isAgentTab
					? agentGen.loading ||
						Boolean(agentGen.streamedPreview) ||
						agentGen.completedTasks.length > 0
					: gen.loading ||
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
						fontFamily: "'Comic', sans-serif",
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
					{(isAgentTab ? agentGen.lastRunSnippet : gen.lastRunPrompt) && (
						<p
							style={{
								fontSize: 12,
								color: T.muted,
								marginBottom: 10,
							}}
						>
							<strong style={{ color: T.accent }}>{selectedLabel}</strong>
							{isAgentTab
								? " · agent"
								: gen.lastRunType
									? ` · ${gen.lastRunType}`
									: ""}
							{(isAgentTab ? agentGen.lastRunSnippet : gen.lastRunPrompt)
								? ` — “${(
										isAgentTab
											? agentGen.lastRunSnippet
											: gen.lastRunPrompt
									).slice(0, 120)}${(isAgentTab ? agentGen.lastRunSnippet : gen.lastRunPrompt).length > 120 ? "…" : ""}”`
								: ""}
						</p>
					)}

					{isAgentTab &&
					(agentGen.multiBlog || agentGen.completedTasks.length > 1) &&
					agentGen.completedTasks.length > 0 ? (
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 10,
							}}
						>
							<p
								style={{
									fontSize: 12,
									color: T.muted,
									marginBottom: 4,
									fontWeight: 600,
								}}
							>
								{agentGen.completedTasks.length} asset
								{agentGen.completedTasks.length === 1 ? "" : "s"} ready
							</p>
							{agentGen.completedTasks.map((t, i) => (
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
											minWidth: 0,
										}}
									>
										<span>{taskEmojiForType(t.type)}</span>
										<span
											style={{
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{t.label || taskTitleForType(t.type)}
											{t.multiBlogIndex != null &&
											t.multiBlogTotal != null
												? ` · ${t.multiBlogIndex}/${t.multiBlogTotal}`
												: ""}
										</span>
									</span>
									<span
										style={{
											fontSize: 12,
											color: T.warm,
											fontWeight: 700,
											flexShrink: 0,
										}}
									>
										Open →
									</span>
								</motion.a>
							))}
						</div>
					) : !isAgentTab &&
					Array.isArray(gen.slotOutputs) &&
					gen.slotOutputs.length > 1 ? (
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
							{(isAgentTab ? agentGen.loading : gen.loading) &&
								!(isAgentTab
									? agentGen.streamedPreview
									: gen.streamed) && (
								<div>
									<p style={{ fontSize: 13, color: T.muted }}>
										{isAgentTab
											? "Running agent and scraping sources…"
											: "Working on your blog/newsletter..."}
									</p>
									{isAgentTab && agentGen.taskProgress.length > 0 && (
										<div
											style={{
												display: "flex",
												flexDirection: "column",
												gap: 8,
												marginTop: 12,
											}}
										>
											{agentGen.taskProgress.map((task) => (
												<div
													key={task.key}
													style={{
														display: "flex",
														alignItems: "center",
														justifyContent: "space-between",
														gap: 10,
														padding: "8px 10px",
														borderRadius: 8,
														background: T.surface,
														border: `1px solid ${T.border}`,
														fontSize: 12,
														color: T.accent,
													}}
												>
													<span>{task.label}</span>
													<span style={{ color: T.muted }}>
														{task.status === "done"
															? "Done"
															: task.status === "error"
																? "Failed"
																: "…"}
													</span>
												</div>
											))}
										</div>
									)}
								</div>
							)}
							{(isAgentTab ? agentGen.streamedPreview : gen.streamed) && (
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
									{isAgentTab ? agentGen.streamedPreview : gen.streamed}
								</pre>
							)}
							{!(isAgentTab && agentGen.multiBlog) &&
							(isAgentTab
								? agentGen.completedTasks
								: gen.completedTasks
							).length > 0 && (
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
										style={{
											display: "flex",
											flexDirection: "column",
											gap: 8,
										}}
									>
										{(isAgentTab
											? agentGen.completedTasks
											: gen.completedTasks
										).map((t, i) => (
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

			
		</div>
	);
}
