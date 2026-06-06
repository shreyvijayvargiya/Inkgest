import { useMemo } from "react";
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
import { T, Icons, Icon, stripDraftSlashQueryFromHtmlString } from "../draftPageLib";
import { THEMES } from "../../../lib/blogExportThemes";
import { useCompactAssetsNav } from "../../../lib/hooks/useCompactAssetsNav";
import DraftTranslationBar from "./DraftTranslationBar";
import PreviewExportThemeList from "./PreviewExportThemeList";

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
	themeExportOpen,
	setThemeExportOpen,
	themeExportRef,
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

	return (
		<AnimatePresence>
			{open && (
							<>
								{/* Backdrop */}
								<motion.div
									key="theme-backdrop"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
								onClick={onClose}
									style={{
										position: "fixed",
										inset: 0,
										background: "rgba(0,0,0,0.5)",
										zIndex: 300,
										backdropFilter: "blur(4px)",
									}}
								/>

								{/* Centering shell — flexbox positions the modal, pointer-events:none lets backdrop work */}
								<motion.div
									key="theme-modal"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.22 }}
									style={{
										position: "fixed",
										inset: 0,
										zIndex: 301,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										pointerEvents: "none",
									}}
								>
									{/* Actual modal panel */}
									<motion.div
										initial={{ scale: 0.95, y: 24 }}
										animate={{ scale: 1, y: 0 }}
										exit={{ scale: 0.95, y: 24 }}
										transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
										style={{
											width: isCompact ? "100%" : "92vw",
											maxWidth: isCompact ? "100%" : 1280,
											height: isCompact ? "100dvh" : "90vh",
											maxHeight: isCompact ? "100dvh" : undefined,
											background: T.surface,
											borderRadius: isCompact ? 0 : 16,
											border: isCompact
												? "none"
												: `1px solid ${T.border}`,
											display: "flex",
											flexDirection: "column",
											boxShadow: isCompact
												? "none"
												: "0 32px 80px rgba(0,0,0,0.28)",
											overflow: "hidden",
											pointerEvents: "all",
										}}
									>
										{/* ─ Top bar ─ */}
										<div
											style={{
												borderBottom: `1px solid ${T.border}`,
												flexShrink: 0,
												background: T.surface,
											}}
										>
											<div
												style={{
													display: "flex",
													flexDirection: "column",
													padding: isCompact ? "10px 12px" : "10px 20px",
													gap: isCompact ? 10 : 0,
													minHeight: isCompact ? undefined : 56,
												}}
											>
												{/* Row 1: title · translation (desktop) · export · close */}
												<div
													style={{
														display: "flex",
														flexDirection: "row",
														alignItems: "center",
														gap: 8,
														width: "100%",
														minWidth: 0,
														flex: isCompact ? undefined : 1,
													}}
												>
													<p
														style={{
															fontSize: isCompact ? 14 : 15,
															fontWeight: 700,
															color: T.accent,
															margin: 0,
															whiteSpace: "nowrap",
															flex: isCompact ? "1 1 auto" : undefined,
															flexShrink: isCompact ? 1 : 0,
															minWidth: 0,
															overflow: "hidden",
															textOverflow: "ellipsis",
														}}
													>
														Preview & Export
													</p>

													{!isCompact ? (
														<>
															<DraftTranslationBar
																translationLang={translationLang}
																setTranslationLang={setTranslationLang}
																onTranslate={onTranslate}
																onSaveTranslation={onSaveTranslation}
																onShowOriginal={onShowOriginal}
																translating={translating}
																savingTranslation={savingTranslation}
																translationError=""
																translationSaved={translationSaved}
																savedLangs={savedLangs}
																creditEstimate={creditEstimate}
																hasTranslatedPreview={Boolean(
																	translatedHTML?.trim(),
																)}
															/>
															<div style={{ flex: 1, minWidth: 8 }} />
														</>
													) : null}

										{/* Export dropdown */}
										<div
											ref={themeExportRef}
											style={{ position: "relative", flexShrink: 0 }}
										>
											<motion.button
												type="button"
												whileHover={{ background: "#F0ECE5" }}
												whileTap={{ scale: 0.95 }}
												onClick={() => setThemeExportOpen((o) => !o)}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 6,
													background: T.base,
													border: `1px solid ${T.border}`,
													borderRadius: 9,
													padding: isCompact ? "7px 10px" : "8px 14px",
													fontSize: isCompact ? 12 : 13,
													fontWeight: 600,
													color: T.accent,
													cursor: "pointer",
													flexShrink: 0,
													whiteSpace: "nowrap",
												}}
											>
												<Icon d={Icons.copy} size={13} stroke={T.accent} />
												{isCompact
													? "Export"
													: `Export — ${activeTheme?.name}`}
												<span
													style={{
														display: "inline-flex",
														transform: themeExportOpen
															? "rotate(180deg)"
															: "none",
														transition: "transform 0.18s ease",
													}}
												>
													<Icon
														d={Icons.chevronD}
														size={14}
														stroke={T.accent}
													/>
												</span>
											</motion.button>

											<AnimatePresence>
												{themeExportOpen && (
													<motion.div
														initial={{ opacity: 0, y: -6 }}
														animate={{ opacity: 1, y: 0 }}
														exit={{ opacity: 0, y: -6 }}
														transition={{
															duration: 0.14,
															ease: [0.16, 1, 0.3, 1],
														}}
														style={{
															position: "absolute",
															top: "100%",
															right: 0,
															marginTop: 6,
															minWidth: 260,
															background: T.surface,
															border: `1px solid ${T.border}`,
															borderRadius: 10,
															boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
															padding: 6,
															zIndex: 400,
														}}
													>
														{/* Download HTML */}
														<button
															type="button"
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
																setThemeExportOpen(false);
												}}
												style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: "transparent",
													fontSize: 13,
													fontWeight: 600,
																color: T.accent,
													cursor: "pointer",
																display: "flex",
																alignItems: "center",
																gap: 9,
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
													strokeLinejoin="round"
												>
													<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
													<polyline points="7 10 12 15 17 10" />
													<line x1="12" y1="15" x2="12" y2="3" />
												</svg>
												Download .html
														</button>

														{/* Copy HTML */}
														<button
															type="button"
															onClick={() => {
																onCopyThemeHTML(previewTheme);
																setThemeExportOpen(false);
															}}
												style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: isCopiedHtml
																	? "rgba(45,106,79,0.1)"
																	: "transparent",
																fontSize: 13,
																fontWeight: 600,
																color: isCopiedHtml ? "#2D6A4F" : T.accent,
																cursor: "pointer",
													display: "flex",
													alignItems: "center",
																gap: 9,
															}}
														>
															<Icon
																d={Icons.copy}
																size={13}
																stroke={
																	isCopiedHtml ? "#2D6A4F" : T.accent
																}
															/>
															{isCopiedHtml
																? "HTML copied!"
																: `Copy HTML — ${activeTheme?.name}`}
														</button>

														{/* Copy public themed URL */}
														<button
															type="button"
															disabled={!isPublic}
															title={
																isPublic
																	? "Full URL viewers can open to see this post with the selected export theme"
																	: "Publish first to enable a shareable live URL"
															}
															onClick={() => {
																if (!isPublic) return;
																const u = getPublicUrl(
																	draft?.slug ||
																		toSlug(slugInput) ||
																		undefined,
																	previewTheme,
																);
																navigator.clipboard.writeText(u).catch(() => {});
																setCopiedTheme({
																	key: previewTheme,
																	format: "publicUrl",
																});
																setThemeExportOpen(false);
																setTimeout(() => setCopiedTheme(null), 2200);
															}}
															style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: isCopiedPublicUrl
																	? "rgba(45,106,79,0.1)"
																	: "transparent",
																fontSize: 13,
																fontWeight: 600,
																color: isCopiedPublicUrl
																	? "#2D6A4F"
																	: isPublic
																		? T.accent
																		: T.muted,
																cursor: isPublic ? "pointer" : "not-allowed",
																opacity: isPublic ? 1 : 0.5,
																display: "flex",
																alignItems: "center",
																gap: 9,
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
															{isCopiedPublicUrl
																? "Link copied!"
																: "Copy public URL (this theme)"}
														</button>

														{/* Copy React */}
														<button
															type="button"
															title="Copies a React component (iframe embed) you can paste into a Next.js or Vite app"
															onClick={() => {
																onCopyThemeReact(previewTheme);
																setThemeExportOpen(false);
															}}
															style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
													border: "none",
																borderRadius: 8,
																background: isCopiedReact
																	? "rgba(30,58,95,0.1)"
																	: "transparent",
													fontSize: 13,
													fontWeight: 600,
																color: isCopiedReact
																	? "#1E3A5F"
																	: T.accent,
													cursor: "pointer",
																display: "flex",
																alignItems: "center",
																gap: 9,
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
															strokeLinejoin="round"
														>
																<polyline points="16 18 22 12 16 6" />
																<polyline points="8 6 2 12 8 18" />
														</svg>
															{isCopiedReact
																? "React copied!"
																: `Copy React — ${activeTheme?.name}`}
														</button>

														{/* Download Markdown */}
														<button
															type="button"
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
																setThemeExportOpen(false);
															}}
												style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: "transparent",
																fontSize: 13,
																fontWeight: 600,
																color: T.accent,
																cursor: markdownExport.trim() ? "pointer" : "not-allowed",
																opacity: markdownExport.trim() ? 1 : 0.45,
													display: "flex",
													alignItems: "center",
																gap: 9,
															}}
														>
															<Icon d={Icons.fileText} size={13} stroke={T.accent} />
															Download .md
														</button>

														{/* Download plain text */}
														<button
															type="button"
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
																setThemeExportOpen(false);
															}}
															style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: "transparent",
													fontSize: 13,
													fontWeight: 600,
																color: T.accent,
																cursor: plainTextExport.trim() ? "pointer" : "not-allowed",
																opacity: plainTextExport.trim() ? 1 : 0.45,
																display: "flex",
																alignItems: "center",
																gap: 9,
															}}
														>
															<Icon d={Icons.fileText} size={13} stroke={T.accent} />
															Download .txt
														</button>

														{/* Copy Markdown */}
														<button
															type="button"
															onClick={() => {
																if (!markdownExport.trim()) return;
																navigator.clipboard.writeText(markdownExport).catch(() => {});
																setCopiedTheme({ key: previewTheme, format: "markdown" });
																setThemeExportOpen(false);
																setTimeout(() => setCopiedTheme(null), 2200);
															}}
															style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: isCopiedMd
																	? "rgba(45,106,79,0.1)"
																	: "transparent",
																fontSize: 13,
																fontWeight: 600,
																color: isCopiedMd ? "#2D6A4F" : T.accent,
																cursor: markdownExport.trim() ? "pointer" : "not-allowed",
																opacity: markdownExport.trim() ? 1 : 0.45,
																display: "flex",
																alignItems: "center",
																gap: 9,
															}}
														>
															<Icon
																d={Icons.copy}
																size={13}
																stroke={isCopiedMd ? "#2D6A4F" : T.accent}
															/>
															{isCopiedMd ? "Markdown copied!" : "Copy Markdown"}
														</button>

														{/* Copy Mermaid source */}
														<button
															type="button"
															disabled={!mermaidMarkdownExport.trim()}
															onClick={() => {
																if (!mermaidMarkdownExport.trim()) return;
																navigator.clipboard
																	.writeText(mermaidMarkdownExport)
																	.catch(() => {});
																setCopiedTheme({
																	key: previewTheme,
																	format: "mermaid",
																});
																setThemeExportOpen(false);
																setTimeout(() => setCopiedTheme(null), 2200);
															}}
															style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: isCopiedMermaid
																	? "rgba(45,106,79,0.1)"
																	: "transparent",
																fontSize: 13,
																fontWeight: 600,
																color: isCopiedMermaid ? "#2D6A4F" : T.accent,
																cursor: mermaidMarkdownExport.trim()
																	? "pointer"
																	: "not-allowed",
																opacity: mermaidMarkdownExport.trim() ? 1 : 0.45,
																display: "flex",
																alignItems: "center",
																gap: 9,
															}}
														>
															<Icon
																d={Icons.workflow}
																size={13}
																stroke={
																	isCopiedMermaid ? "#2D6A4F" : T.accent
																}
															/>
															{isCopiedMermaid
																? "Mermaid copied!"
																: `Copy Mermaid (${mermaidBlocks.length || 0})`}
														</button>

														{/* Download Mermaid markdown */}
														<button
															type="button"
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
																setThemeExportOpen(false);
															}}
															style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: "transparent",
																fontSize: 13,
																fontWeight: 600,
																color: T.accent,
																cursor: mermaidMarkdownExport.trim()
																	? "pointer"
																	: "not-allowed",
																opacity: mermaidMarkdownExport.trim() ? 1 : 0.45,
																display: "flex",
																alignItems: "center",
																gap: 9,
															}}
														>
															<Icon d={Icons.fileText} size={13} stroke={T.accent} />
															Download Mermaid .md
														</button>

														{/* Copy infographic embed HTML */}
														<button
															type="button"
															disabled={!infographicEmbeds.length}
															onClick={() => {
																if (!infographicEmbeds.length) return;
																navigator.clipboard
																	.writeText(infographicEmbeds.join("\n\n"))
																	.catch(() => {});
																setCopiedTheme({
																	key: previewTheme,
																	format: "infographic",
																});
																setThemeExportOpen(false);
																setTimeout(() => setCopiedTheme(null), 2200);
															}}
															style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: isCopiedInfographic
																	? "rgba(45,106,79,0.1)"
																	: "transparent",
																fontSize: 13,
																fontWeight: 600,
																color: isCopiedInfographic
																	? "#2D6A4F"
																	: T.accent,
																cursor: infographicEmbeds.length
																	? "pointer"
																	: "not-allowed",
																opacity: infographicEmbeds.length ? 1 : 0.45,
																display: "flex",
																alignItems: "center",
																gap: 9,
															}}
														>
															<Icon
																d={Icons.barChart}
																size={13}
																stroke={
																	isCopiedInfographic ? "#2D6A4F" : T.accent
																}
															/>
															{isCopiedInfographic
																? "Infographics copied!"
																: `Copy infographic HTML (${infographicEmbeds.length || 0})`}
														</button>

														{/* Download infographics HTML */}
														<button
															type="button"
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
																setThemeExportOpen(false);
															}}
															style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: "transparent",
																fontSize: 13,
																fontWeight: 600,
																color: T.accent,
																cursor: infographicStandaloneDoc.trim()
																	? "pointer"
																	: "not-allowed",
																opacity: infographicStandaloneDoc.trim() ? 1 : 0.45,
																display: "flex",
																alignItems: "center",
																gap: 9,
															}}
														>
															<Icon d={Icons.fileText} size={13} stroke={T.accent} />
															Download infographics .html
														</button>

														<div
															style={{
																height: 1,
																background: T.border,
																margin: "4px 6px",
															}}
														/>

														{/* Copy plain text */}
														<button
															type="button"
															onClick={() => {
																if (!plainTextExport.trim()) return;
																navigator.clipboard.writeText(plainTextExport).catch(() => {});
																setCopiedTheme({ key: previewTheme, format: "text" });
																setThemeExportOpen(false);
																setTimeout(() => setCopiedTheme(null), 2200);
															}}
															style={{
																width: "100%",
																textAlign: "left",
																padding: "9px 12px",
																border: "none",
																borderRadius: 8,
																background: isCopiedTxt
																	? "rgba(45,106,79,0.1)"
																	: "transparent",
																fontSize: 13,
																fontWeight: 600,
																color: isCopiedTxt ? "#2D6A4F" : T.accent,
																cursor: plainTextExport.trim() ? "pointer" : "not-allowed",
																opacity: plainTextExport.trim() ? 1 : 0.45,
																display: "flex",
																alignItems: "center",
																gap: 9,
															}}
														>
															<Icon
																d={Icons.copy}
																size={13}
																stroke={isCopiedTxt ? "#2D6A4F" : T.accent}
															/>
															{isCopiedTxt ? "Text copied!" : "Copy plain text"}
														</button>
													</motion.div>
												)}
											</AnimatePresence>
										</div>

											{/* Close */}
											<motion.button
												whileHover={{ background: "#F0ECE5" }}
												whileTap={{ scale: 0.93 }}
											onClick={onClose}
												style={{
													background: "transparent",
													border: `1px solid ${T.border}`,
													borderRadius: 8,
													width: 34,
													height: 34,
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													cursor: "pointer",
													flexShrink: 0,
												}}
											>
												<svg
													width={14}
													height={14}
													viewBox="0 0 24 24"
													fill="none"
													stroke={T.muted}
													strokeWidth={2}
													strokeLinecap="round"
												>
													<path d="M18 6L6 18M6 6l12 12" />
												</svg>
											</motion.button>
												</div>

											{isCompact ? (
												<div
													className="hidescrollbar"
													style={{
														width: "100%",
														minWidth: 0,
														overflowX: "auto",
														WebkitOverflowScrolling: "touch",
														paddingBottom: 2,
													}}
												>
													<DraftTranslationBar
														compact
														translationLang={translationLang}
														setTranslationLang={setTranslationLang}
														onTranslate={onTranslate}
														onSaveTranslation={onSaveTranslation}
														onShowOriginal={onShowOriginal}
														translating={translating}
														savingTranslation={savingTranslation}
														translationError=""
														translationSaved={translationSaved}
														savedLangs={savedLangs}
														creditEstimate={creditEstimate}
														hasTranslatedPreview={Boolean(
															translatedHTML?.trim(),
														)}
													/>
												</div>
											) : null}
											</div>

											{translationError ? (
												<div
													style={{
														padding: "6px 20px 10px",
														fontSize: 11,
														color: "#B45309",
														lineHeight: 1.35,
														borderTop: `1px solid ${T.border}`,
														background: "#FFFBEB",
													}}
												>
													{translationError}
												</div>
											) : null}
										</div>

										{/* ─ Body: themes + preview (column on mobile) ─ */}
										<div
											style={{
												flex: 1,
												display: "flex",
												flexDirection: isCompact ? "column" : "row",
												overflow: "hidden",
												minHeight: 0,
											}}
										>
											{!isCompact ? (
												<PreviewExportThemeList
													layout="sidebar"
													{...themeListProps}
												/>
											) : null}

											<div
												style={{
													flex: 1,
													position: "relative",
													background: "#e5e7eb",
													minHeight: 0,
													minWidth: 0,
												}}
											>
												{themedDoc ? (
													<iframe
													key={`${previewTheme}-${translationLang}-${translatedHTML ? "t" : "o"}-${previewSrcDoc ? "m" : "b"}`}
														srcDoc={previewSrcDoc}
														title={`Preview — ${activeTheme?.name}`}
														sandbox="allow-scripts allow-same-origin"
														style={{
															width: "100%",
															height: "100%",
															border: "none",
															display: "block",
															opacity: previewMermaidPending ? 0.72 : 1,
															transition: "opacity 0.15s ease",
														}}
													/>
												) : (
													<div
														style={{
															height: "100%",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
															color: T.muted,
															fontSize: 14,
														}}
													>
														No content yet — write something in the editor
														first.
													</div>
												)}
											</div>

											{isCompact ? (
												<PreviewExportThemeList
													layout="strip"
													{...themeListProps}
												/>
											) : null}
										</div>
									</motion.div>
									{/* end centering shell */}
								</motion.div>
							</>
			)}
		</AnimatePresence>
	);
}
