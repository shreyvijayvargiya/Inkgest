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
	);
}
