import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { htmlToMarkdown } from "../../../lib/utils/htmlToMarkdown";
import { buildThemedHTML } from "../../../lib/blogExportThemes";
import { useThemedPreviewWithMermaid } from "../../../lib/hooks/useThemedPreviewWithMermaid";
import {
	extractMermaidSourcesFromHtml,
	extractInfographicEmbedHtmlFromHtml,
	mermaidSourcesToMarkdown,
	infographicEmbedsToStandaloneDoc,
} from "../../../lib/utils/exportDraftEmbeds";
import { Icons, Icon, stripDraftSlashQueryFromHtmlString } from "../draftPageLib";
import { THEMES } from "../../../lib/blogExportThemes";
import { useCompactAssetsNav } from "../../../lib/hooks/useCompactAssetsNav";
import DraftTranslationBar from "./DraftTranslationBar";
import PreviewExportThemeList from "./PreviewExportThemeList";
import BlogToAudioDropdown from "./BlogToAudioDropdown";

const PREVIEW_EXPORT_TABS = [
	{ id: "themes", label: "Themes" },
	{ id: "language", label: "Language" },
	// { id: "audio", label: "Audio" },
	{ id: "export", label: "Export" },
];

function ExportActionButton({
	onClick,
	disabled,
	active,
	activeTone = "green",
	children,
	className = "",
}) {
	const activeClass =
		activeTone === "blue"
			? "bg-[rgba(30,58,95,0.1)] text-[#1E3A5F]"
			: "bg-[rgba(45,106,79,0.1)] text-[#2D6A4F]";

	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className={`flex w-full items-center gap-2 rounded-xl border-none px-3 py-2 text-left text-[13px] font-semibold transition-colors ${
				active
					? activeClass
					: "bg-transparent text-[#111111] hover:bg-[#F0ECE5]"
			} ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"} ${className}`}
		>
			{children}
		</button>
	);
}

function PreviewExportActionsPanel({
	activeTheme,
	previewTheme,
	themedDoc,
	markdownExport,
	plainTextExport,
	mermaidMarkdownExport,
	mermaidBlocks,
	infographicEmbeds,
	infographicStandaloneDoc,
	slugBase,
	isPublic,
	draft,
	slugInput,
	toSlug,
	getPublicUrl,
	isCopiedHtml,
	isCopiedReact,
	isCopiedMd,
	isCopiedMermaid,
	isCopiedInfographic,
	isCopiedTxt,
	isCopiedPublicUrl,
	onCopyThemeHTML,
	onCopyThemeReact,
	setCopiedTheme,
}) {
	return (
		<div className="flex flex-col gap-0.5">
			<p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-wider text-[#888888]">
				Export — {activeTheme?.name}
			</p>

			<ExportActionButton
				onClick={() => {
					if (!themedDoc) return;
					const blob = new Blob([themedDoc], {
						type: "text/html;charset=utf-8",
					});
					const a = document.createElement("a");
					a.href = URL.createObjectURL(blob);
					a.download = `${slugBase}-${(activeTheme?.name || "theme").toLowerCase().replace(/\s+/g, "-")}.html`;
					a.click();
					URL.revokeObjectURL(a.href);
				}}
				disabled={!themedDoc}
			>
				<svg
					width={13}
					height={13}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" y1="15" x2="12" y2="3" />
				</svg>
				Download .html
			</ExportActionButton>

			<ExportActionButton
				active={isCopiedHtml}
				onClick={() => onCopyThemeHTML(previewTheme)}
			>
				<Icon
					d={Icons.copy}
					size={13}
					stroke={isCopiedHtml ? "#2D6A4F" : "#111111"}
				/>
				{isCopiedHtml ? "HTML copied!" : `Copy HTML — ${activeTheme?.name}`}
			</ExportActionButton>

			<ExportActionButton
				active={isCopiedPublicUrl}
				disabled={!isPublic}
				title={
					isPublic
						? "Full URL viewers can open to see this post with the selected export theme"
						: "Publish first to enable a shareable live URL"
				}
				onClick={() => {
					if (!isPublic) return;
					const u = getPublicUrl(
						draft?.slug || toSlug(slugInput) || undefined,
						previewTheme,
					);
					navigator.clipboard.writeText(u).catch(() => {});
					setCopiedTheme({ key: previewTheme, format: "publicUrl" });
					setTimeout(() => setCopiedTheme(null), 2200);
				}}
			>
				<svg
					width={13}
					height={13}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
				>
					<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
					<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
				</svg>
				{isCopiedPublicUrl ? "Link copied!" : "Copy public URL (this theme)"}
			</ExportActionButton>

			<ExportActionButton
				active={isCopiedReact}
				activeTone="blue"
				title="Copies a React component (iframe embed) you can paste into a Next.js or Vite app"
				onClick={() => onCopyThemeReact(previewTheme)}
			>
				<svg
					width={13}
					height={13}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<polyline points="16 18 22 12 16 6" />
					<polyline points="8 6 2 12 8 18" />
				</svg>
				{isCopiedReact ? "React copied!" : `Copy React — ${activeTheme?.name}`}
			</ExportActionButton>

			<ExportActionButton
				disabled={!markdownExport.trim()}
				onClick={() => {
					if (!markdownExport.trim()) return;
					const blob = new Blob([markdownExport], {
						type: "text/markdown;charset=utf-8",
					});
					const a = document.createElement("a");
					a.href = URL.createObjectURL(blob);
					a.download = `${slugBase}.md`;
					a.click();
					URL.revokeObjectURL(a.href);
				}}
			>
				<Icon d={Icons.fileText} size={13} stroke="#111111" />
				Download .md
			</ExportActionButton>

			<ExportActionButton
				disabled={!plainTextExport.trim()}
				onClick={() => {
					if (!plainTextExport.trim()) return;
					const blob = new Blob([plainTextExport], {
						type: "text/plain;charset=utf-8",
					});
					const a = document.createElement("a");
					a.href = URL.createObjectURL(blob);
					a.download = `${slugBase}.txt`;
					a.click();
					URL.revokeObjectURL(a.href);
				}}
			>
				<Icon d={Icons.fileText} size={13} stroke="#111111" />
				Download .txt
			</ExportActionButton>

			<ExportActionButton
				active={isCopiedMd}
				disabled={!markdownExport.trim()}
				onClick={() => {
					if (!markdownExport.trim()) return;
					navigator.clipboard.writeText(markdownExport).catch(() => {});
					setCopiedTheme({ key: previewTheme, format: "markdown" });
					setTimeout(() => setCopiedTheme(null), 2200);
				}}
			>
				<Icon
					d={Icons.copy}
					size={13}
					stroke={isCopiedMd ? "#2D6A4F" : "#111111"}
				/>
				{isCopiedMd ? "Markdown copied!" : "Copy Markdown"}
			</ExportActionButton>

			<ExportActionButton
				active={isCopiedMermaid}
				disabled={!mermaidMarkdownExport.trim()}
				onClick={() => {
					if (!mermaidMarkdownExport.trim()) return;
					navigator.clipboard.writeText(mermaidMarkdownExport).catch(() => {});
					setCopiedTheme({ key: previewTheme, format: "mermaid" });
					setTimeout(() => setCopiedTheme(null), 2200);
				}}
			>
				<Icon
					d={Icons.workflow}
					size={13}
					stroke={isCopiedMermaid ? "#2D6A4F" : "#111111"}
				/>
				{isCopiedMermaid
					? "Mermaid copied!"
					: `Copy Mermaid (${mermaidBlocks.length || 0})`}
			</ExportActionButton>

			<ExportActionButton
				disabled={!mermaidMarkdownExport.trim()}
				onClick={() => {
					if (!mermaidMarkdownExport.trim()) return;
					const blob = new Blob([mermaidMarkdownExport], {
						type: "text/markdown;charset=utf-8",
					});
					const a = document.createElement("a");
					a.href = URL.createObjectURL(blob);
					a.download = `${slugBase}-diagrams.md`;
					a.click();
					URL.revokeObjectURL(a.href);
				}}
			>
				<Icon d={Icons.fileText} size={13} stroke="#111111" />
				Download Mermaid .md
			</ExportActionButton>

			<ExportActionButton
				active={isCopiedInfographic}
				disabled={!infographicEmbeds.length}
				onClick={() => {
					if (!infographicEmbeds.length) return;
					navigator.clipboard.writeText(infographicEmbeds.join("\n\n")).catch(() => {});
					setCopiedTheme({ key: previewTheme, format: "infographic" });
					setTimeout(() => setCopiedTheme(null), 2200);
				}}
			>
				<Icon
					d={Icons.barChart}
					size={13}
					stroke={isCopiedInfographic ? "#2D6A4F" : "#111111"}
				/>
				{isCopiedInfographic
					? "Infographics copied!"
					: `Copy infographic HTML (${infographicEmbeds.length || 0})`}
			</ExportActionButton>

			<ExportActionButton
				disabled={!infographicStandaloneDoc.trim()}
				onClick={() => {
					if (!infographicStandaloneDoc.trim()) return;
					const blob = new Blob([infographicStandaloneDoc], {
						type: "text/html;charset=utf-8",
					});
					const a = document.createElement("a");
					a.href = URL.createObjectURL(blob);
					a.download = `${slugBase}-infographics.html`;
					a.click();
					URL.revokeObjectURL(a.href);
				}}
			>
				<Icon d={Icons.fileText} size={13} stroke="#111111" />
				Download infographics .html
			</ExportActionButton>

			<div className="mx-1.5 my-1 h-px bg-[#E2E2E2]" />

			<ExportActionButton
				active={isCopiedTxt}
				disabled={!plainTextExport.trim()}
				onClick={() => {
					if (!plainTextExport.trim()) return;
					navigator.clipboard.writeText(plainTextExport).catch(() => {});
					setCopiedTheme({ key: previewTheme, format: "text" });
					setTimeout(() => setCopiedTheme(null), 2200);
				}}
			>
				<Icon
					d={Icons.copy}
					size={13}
					stroke={isCopiedTxt ? "#2D6A4F" : "#111111"}
				/>
				{isCopiedTxt ? "Text copied!" : "Copy plain text"}
			</ExportActionButton>
		</div>
	);
}

export default function PreviewExportModal({
	open,
	onClose,
	editorRef,
	titleRef,
	draft,
	previewTheme,
	setPreviewTheme,
	translatedHTML,
	translationLang,
	setTranslationLang,
	onTranslate,
	onSaveTranslation,
	onShowOriginal,
	translating,
	savingTranslation,
	translationError,
	translationSaved,
	savedLangs,
	creditEstimate,
	copiedTheme,
	setCopiedTheme,
	copiedPubThemeRow,
	setCopiedPubThemeRow,
	isPublic,
	slugInput,
	toSlug,
	getPublicUrl,
	onCopyThemeHTML,
	onCopyThemeReact,
}) {
	const isCompact = useCompactAssetsNav();
	const [activeTab, setActiveTab] = useState("themes");
	const activeTheme = THEMES[previewTheme] || THEMES.ink;
	const currentHTML = stripDraftSlashQueryFromHtmlString(
		editorRef.current?.innerHTML || draft?.body || "",
	);
	const htmlForPreview = translatedHTML || currentHTML;
	const previewDocTitle = titleRef.current?.innerText?.trim() || draft?.title || "";
	const themedDoc =
		activeTheme && htmlForPreview.trim()
			? buildThemedHTML(htmlForPreview, activeTheme, previewDocTitle)
			: "";
	const { previewSrcDoc, pending: previewMermaidPending } =
		useThemedPreviewWithMermaid(themedDoc);
	const isCopiedHtml =
		copiedTheme?.key === previewTheme && copiedTheme?.format === "html";
	const isCopiedReact =
		copiedTheme?.key === previewTheme && copiedTheme?.format === "react";
	const isCopiedMd =
		copiedTheme?.key === previewTheme && copiedTheme?.format === "markdown";
	const isCopiedMermaid =
		copiedTheme?.key === previewTheme && copiedTheme?.format === "mermaid";
	const isCopiedInfographic =
		copiedTheme?.key === previewTheme && copiedTheme?.format === "infographic";
	const isCopiedTxt =
		copiedTheme?.key === previewTheme && copiedTheme?.format === "text";
	const isCopiedPublicUrl =
		copiedTheme?.key === previewTheme && copiedTheme?.format === "publicUrl";
	const markdownExport = htmlForPreview.trim() ? htmlToMarkdown(htmlForPreview) || "" : "";
	const mermaidBlocks = useMemo(
		() => extractMermaidSourcesFromHtml(currentHTML),
		[currentHTML],
	);
	const mermaidMarkdownExport = useMemo(
		() => mermaidSourcesToMarkdown(mermaidBlocks),
		[mermaidBlocks],
	);
	const infographicEmbeds = useMemo(
		() => extractInfographicEmbedHtmlFromHtml(currentHTML),
		[currentHTML],
	);
	const infographicStandaloneDoc = useMemo(
		() =>
			infographicEmbeds.length
				? infographicEmbedsToStandaloneDoc(
						infographicEmbeds,
						previewDocTitle || "Infographics",
					)
				: "",
		[infographicEmbeds, previewDocTitle],
	);
	const plainTextExport = useMemo(() => {
		if (!htmlForPreview.trim()) return "";
		try {
			const d = document.createElement("div");
			d.innerHTML = htmlForPreview;
			return (d.innerText || "").trim();
		} catch {
			return "";
		}
	}, [htmlForPreview]);
	const slugBase = (draft?.title || "draft")
		.replace(/[^a-z0-9]/gi, "-")
		.toLowerCase();

	const themeListProps = {
		previewTheme,
		setPreviewTheme,
		isPublic,
		getPublicUrl,
		toSlug,
		slugInput,
		draft,
		copiedPubThemeRow,
		setCopiedPubThemeRow,
	};

	const exportPanelProps = {
		activeTheme,
		previewTheme,
		themedDoc,
		markdownExport,
		plainTextExport,
		mermaidMarkdownExport,
		mermaidBlocks,
		infographicEmbeds,
		infographicStandaloneDoc,
		slugBase,
		isPublic,
		draft,
		slugInput,
		toSlug,
		getPublicUrl,
		isCopiedHtml,
		isCopiedReact,
		isCopiedMd,
		isCopiedMermaid,
		isCopiedInfographic,
		isCopiedTxt,
		isCopiedPublicUrl,
		onCopyThemeHTML,
		onCopyThemeReact,
		setCopiedTheme,
	};

	const renderTabContent = () => {
		switch (activeTab) {
			case "themes":
				return (
					<PreviewExportThemeList
						layout={isCompact ? "strip" : "sidebar"}
						embedded
						{...themeListProps}
					/>
				);
			case "language":
				return (
					<div className="flex flex-col gap-3">
						<p className="m-0 text-[10px] font-bold uppercase tracking-wider text-[#888888]">
							Translate blog
						</p>
						<div className="w-full min-w-0">
							<DraftTranslationBar
								compact
								translationLang={translationLang}
								setTranslationLang={setTranslationLang}
								onTranslate={onTranslate}
								onSaveTranslation={onSaveTranslation}
								onShowOriginal={onShowOriginal}
								translating={translating}
								savingTranslation={savingTranslation}
								translationError={translationError}
								translationSaved={translationSaved}
								savedLangs={savedLangs}
								creditEstimate={creditEstimate}
								hasTranslatedPreview={Boolean(translatedHTML?.trim())}
							/>
						</div>
						{translationError ? (
							<p className="m-0 text-[11px] leading-snug text-[#B45309]">
								{translationError}
							</p>
						) : null}
					</div>
				);
			case "audio":
				return (
					<BlogToAudioDropdown
						inline
						content={plainTextExport}
						title={previewDocTitle}
						isCompact={isCompact}
					/>
				);
			case "export":
				return <PreviewExportActionsPanel {...exportPanelProps} />;
			default:
				return null;
		}
	};

	return (
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						key="theme-backdrop"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm"
					/>

					<motion.div
						key="theme-modal"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.22 }}
						className="pointer-events-none fixed inset-0 z-[301] flex items-center justify-center"
					>
						<motion.div
							initial={{ scale: 0.95, y: 24 }}
							animate={{ scale: 1, y: 0 }}
							exit={{ scale: 0.95, y: 24 }}
							transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
							className={`pointer-events-auto flex flex-col overflow-hidden bg-white ${
								isCompact
									? "h-dvh max-h-dvh w-full rounded-none border-none shadow-none"
									: "h-[90vh] w-[92vw] max-w-[1280px] rounded-2xl border border-[#E2E2E2] shadow-[0_32px_80px_rgba(0,0,0,0.28)]"
							}`}
						>
							{/* Header */}
							<div className="shrink-0 border-b border-[#E2E2E2] bg-white">
								<div className="flex items-center justify-between gap-3 px-3 py-2.5 md:px-5 md:py-2.5">
									<p className="m-0 min-w-0 flex-1 truncate text-sm font-bold text-[#111111] md:text-[15px]">
										Preview & Export
									</p>
									<motion.button
										whileHover={{ backgroundColor: "#F0ECE5" }}
										whileTap={{ scale: 0.93 }}
										onClick={onClose}
										type="button"
										className="flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#E2E2E2] bg-transparent"
									>
										<svg
											width={14}
											height={14}
											viewBox="0 0 24 24"
											fill="none"
											stroke="#888888"
											strokeWidth={2}
											strokeLinecap="round"
										>
											<path d="M18 6L6 18M6 6l12 12" />
										</svg>
									</motion.button>
								</div>

								{/* Tab bar */}
								<div className="hidescrollbar flex gap-1 overflow-x-auto px-3 pb-2 md:px-5">
									{PREVIEW_EXPORT_TABS.map((tab) => {
										const isActive = activeTab === tab.id;
										return (
											<button
												key={tab.id}
												type="button"
												onClick={() => setActiveTab(tab.id)}
												className={`shrink-0 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
													isActive
														? "bg-[#111111] text-white"
														: "bg-[#F2F2F2] text-[#888888] hover:bg-[#E8E4DC] hover:text-[#111111]"
												}`}
											>
												{tab.label}
											</button>
										);
									})}
								</div>
							</div>

							{/* Body */}
							<div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
								{/* Left panel: active tab content */}
								<div
									className={`flex min-h-0 shrink-0 flex-col bg-zinc-50 md:w-[248px] md:border-r md:border-[#E2E2E2] ${
										isCompact ? "max-h-[38%] border-b border-zinc-50" : ""
									}`}
								>
									<div className="min-h-0 flex-1 overflow-y-auto p-3">
										{renderTabContent()}
									</div>
								</div>

								{/* Preview */}
								<div className="relative min-h-0 min-w-0 flex-1 bg-[#e5e7eb]">
									{themedDoc ? (
										<iframe
											key={`${previewTheme}-${translationLang}-${translatedHTML ? "t" : "o"}-${previewSrcDoc ? "m" : "b"}`}
											srcDoc={previewSrcDoc}
											title={`Preview — ${activeTheme?.name}`}
											sandbox="allow-scripts allow-same-origin"
											className={`block h-full w-full border-0 transition-opacity duration-150 ${
												previewMermaidPending ? "opacity-70" : "opacity-100"
											}`}
										/>
									) : (
										<div className="flex h-full items-center justify-center text-sm text-[#888888]">
											No content yet — write something in the editor first.
										</div>
									)}
								</div>
							</div>
						</motion.div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
