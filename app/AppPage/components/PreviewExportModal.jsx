import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { htmlToMarkdown } from "../../../lib/utils/htmlToMarkdown";
import { buildThemedHTML } from "../../../lib/blogExportThemes";
import { T, Icons, Icon, parseCSSProp, stripDraftSlashQueryFromHtmlString } from "../draftPageLib";
import { THEMES } from "../../../lib/blogExportThemes";

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
	const isCopiedHtml =
		copiedTheme?.key === previewTheme && copiedTheme?.format === "html";
	const isCopiedReact =
		copiedTheme?.key === previewTheme && copiedTheme?.format === "react";
	const isCopiedMd =
		copiedTheme?.key === previewTheme && copiedTheme?.format === "markdown";
	const isCopiedTxt =
		copiedTheme?.key === previewTheme && copiedTheme?.format === "text";
	const isCopiedPublicUrl =
		copiedTheme?.key === previewTheme && copiedTheme?.format === "publicUrl";
	const markdownExport = htmlForPreview.trim() ? htmlToMarkdown(htmlForPreview) || "" : "";
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
											width: "92vw",
											maxWidth: 1280,
											height: "90vh",
											background: T.surface,
											borderRadius: 16,
											border: `1px solid ${T.border}`,
											display: "flex",
											flexDirection: "column",
											boxShadow: "0 32px 80px rgba(0,0,0,0.28)",
											overflow: "hidden",
											pointerEvents: "all",
										}}
									>
										{/* ─ Top bar ─ */}
										<div
											style={{
												height: 56,
												borderBottom: `1px solid ${T.border}`,
												display: "flex",
												alignItems: "center",
												padding: "0 20px",
												gap: 12,
												flexShrink: 0,
												background: T.surface,
											}}
										>
											<p
												style={{
													fontSize: 15,
													fontWeight: 700,
													color: T.accent,
													fontFamily: "",
												}}
											>
												Preview & Export
											</p>
											<div style={{ flex: 1 }} />

										{/* Export dropdown */}
										<div
											ref={themeExportRef}
											style={{ position: "relative" }}
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
													padding: "8px 14px",
													fontSize: 13,
													fontWeight: 600,
													color: T.accent,
													cursor: "pointer",
												}}
											>
												<Icon d={Icons.copy} size={13} stroke={T.accent} />
												Export — {activeTheme?.name}
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

										{/* ─ Body: sidebar + preview ─ */}
										<div
											style={{ flex: 1, display: "flex", overflow: "hidden" }}
										>
											{/* Left: theme list */}
											<div
												style={{
													width: 210,
													borderRight: `1px solid ${T.border}`,
													overflowY: "auto",
													flexShrink: 0,
													background: T.base,
													padding: "12px 10px",
													display: "flex",
													flexDirection: "column",
													gap: 3,
												}}
											>
												<p
													style={{
														fontSize: 10,
														fontWeight: 700,
														color: T.muted,
														textTransform: "uppercase",
														letterSpacing: "0.08em",
														marginBottom: 8,
														paddingLeft: 4,
													}}
												>
													Themes
												</p>
												{Object.entries(THEMES).map(([key, theme]) => {
													const isActive = previewTheme === key;
													const hColor =
														parseCSSProp(theme.h1, "color") || theme.text;
													return (
														<motion.div
															key={key}
															role="button"
															tabIndex={0}
															whileTap={{ scale: 0.97 }}
															onClick={() => setPreviewTheme(key)}
															onKeyDown={(e) => {
																if (e.key === "Enter" || e.key === " ") {
																	e.preventDefault();
																	setPreviewTheme(key);
																}
															}}
															style={{
																background: isActive
																	? T.surface
																	: "transparent",
																border: `1.5px solid ${isActive ? T.border : "transparent"}`,
																borderRadius: 10,
																padding: "10px 8px 10px 12px",
																cursor: "pointer",
																display: "flex",
																alignItems: "center",
																gap: 10,
																textAlign: "left",
																boxShadow: isActive
																	? "0 1px 6px rgba(0,0,0,0.07)"
																	: "none",
																outline: "none",
															}}
														>
															{/* Color swatch strip */}
															<div
																style={{
																	width: 28,
																	height: 28,
																	borderRadius: 7,
																	background: theme.bg,
																	border: "1px solid rgba(0,0,0,0.1)",
																	flexShrink: 0,
																	display: "flex",
																	alignItems: "center",
																	justifyContent: "center",
																	overflow: "hidden",
																}}
															>
																<div
																	style={{
																		width: 10,
																		height: 10,
																		borderRadius: "50%",
																		background: hColor,
																	}}
																/>
															</div>
															<div style={{ minWidth: 0, flex: 1 }}>
																<p
																	style={{
																		fontSize: 12,
																		fontWeight: isActive ? 700 : 500,
																		color: isActive ? T.accent : "#555",
																		lineHeight: 1.3,
																	}}
																>
																	{theme.name}
																</p>
																<p
																	style={{
																		fontSize: 10,
																		color: T.muted,
																		overflow: "hidden",
																		whiteSpace: "nowrap",
																		textOverflow: "ellipsis",
																		marginTop: 1,
																	}}
																>
																	{theme.label}
																</p>
															</div>
															<div
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: 6,
																	flexShrink: 0,
																	marginLeft: "auto",
																}}
															>
																{isPublic ? (
																	<button
																		type="button"
																		title="Copy public URL with this theme"
																		onClick={(e) => {
																			e.stopPropagation();
																			navigator.clipboard
																				.writeText(
																					getPublicUrl(
																						draft?.slug ||
																							toSlug(slugInput) ||
																							undefined,
																						key,
																					),
																				)
																				.catch(() => {});
																			setCopiedPubThemeRow(key);
																			setTimeout(
																				() => setCopiedPubThemeRow(null),
																				1600,
																			);
																		}}
																		style={{
																			width: 28,
																			height: 28,
																			borderRadius: 7,
																			border: `1px solid ${T.border}`,
																			background:
																				copiedPubThemeRow === key
																					? "#EFF6EE"
																					: T.surface,
																			cursor: "pointer",
																			display: "flex",
																			alignItems: "center",
																			justifyContent: "center",
																			padding: 0,
																			flexShrink: 0,
																		}}
																	>
																		{copiedPubThemeRow === key ? (
																			<svg
																				width={12}
																				height={12}
																				viewBox="0 0 24 24"
																				fill="none"
																				stroke="#3D7A35"
																				strokeWidth={2.5}
																				strokeLinecap="round"
																			>
																				<polyline points="20 6 9 17 4 12" />
																			</svg>
																		) : (
																			<svg
																				width={12}
																				height={12}
																				viewBox="0 0 24 24"
																				fill="none"
																				stroke={T.muted}
																				strokeWidth={2}
																				strokeLinecap="round"
																			>
																				<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
																				<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
																			</svg>
																		)}
																	</button>
																) : null}
																{isActive && (
																	<div
																		style={{
																			width: 6,
																			height: 6,
																			borderRadius: "50%",
																			background: T.warm,
																			flexShrink: 0,
																		}}
																	/>
																)}
															</div>
														</motion.div>
													);
												})}

										
											</div>

											{/* Right: iframe live preview */}
											<div
												style={{
													flex: 1,
													position: "relative",
													background: "#e5e7eb",
												}}
											>
												{themedDoc ? (
													<iframe
													key={`${previewTheme}-${translationLang}-${translatedHTML ? "t" : "o"}`}
														srcDoc={themedDoc}
														title={`Preview — ${activeTheme?.name}`}
														sandbox="allow-same-origin"
														style={{
															width: "100%",
															height: "100%",
															border: "none",
															display: "block",
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
										</div>
									</motion.div>
									{/* end centering shell */}
								</motion.div>
							</>
			)}
		</AnimatePresence>
	);
}
