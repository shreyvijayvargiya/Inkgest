import { motion, AnimatePresence } from "framer-motion";
import { htmlToMarkdown } from "../../../lib/utils/htmlToMarkdown";
import { THEMES, buildThemedHTML } from "../../../lib/blogExportThemes";
import { T, Icons, Icon, parseCSSProp, copyTextToClipboard, stripDraftSlashQueryFromHtmlString, buildThemedReactSnippet } from "../draftPageLib";

export default function ExportThemesModal({
	open,
	onClose,
	editorRef,
	titleRef,
	draft,
	previewTheme,
	setPreviewTheme,
	translatedHTML,
	copiedTheme,
	setCopiedTheme,
	translationCopyOpen,
	setTranslationCopyOpen,
	translationCopyRef,
}) {
	const rawHtml = stripDraftSlashQueryFromHtmlString(
		editorRef.current?.innerHTML || draft?.body || "",
	);
	const htmlSrc = translatedHTML || rawHtml;
	const titleText = titleRef.current?.innerText?.trim() || draft?.title || "Untitled";
	const themeObj = THEMES[previewTheme] || THEMES.ink;
	const themedDoc = htmlSrc ? buildThemedHTML(htmlSrc, themeObj, titleText) : "";
	const markdownExport = htmlSrc.trim() ? htmlToMarkdown(htmlSrc) || "" : "";
	const reactSnippet = htmlSrc.trim()
		? buildThemedReactSnippet(htmlSrc, previewTheme, titleText)
		: "";
	const isCopiedHtmlMini =
		copiedTheme?.key === previewTheme && copiedTheme?.format === "html";
	const isCopiedMdMini =
		copiedTheme?.key === previewTheme && copiedTheme?.format === "markdown";
	const isCopiedReactMini =
		copiedTheme?.key === previewTheme && copiedTheme?.format === "react";

	return (
		<AnimatePresence>
			{open && (
							<>
								<motion.div
									key="trans-backdrop"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									onClick={() => onClose()}
									style={{
										position: "fixed",
										inset: 0,
										background: "rgba(0,0,0,0.5)",
										zIndex: 302,
										backdropFilter: "blur(4px)",
									}}
								/>
								<motion.div
									key="trans-shell"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.2 }}
									style={{
										position: "fixed",
										inset: 0,
										zIndex: 303,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										pointerEvents: "none",
									}}
								>
									<motion.div
										initial={{ scale: 0.96, y: 16 }}
										animate={{ scale: 1, y: 0 }}
										exit={{ scale: 0.96, y: 16 }}
										transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
										onClick={(e) => e.stopPropagation()}
										style={{
											width: "min(94vw, 1000px)",
											height: "min(86vh, 720px)",
											background: T.surface,
											borderRadius: 16,
											border: `1px solid ${T.border}`,
											boxShadow: "0 28px 72px rgba(0,0,0,0.22)",
											display: "flex",
											flexDirection: "column",
											overflow: "hidden",
											pointerEvents: "auto",
										}}
									>
										<div
											style={{
												minHeight: 52,
												borderBottom: `1px solid ${T.border}`,
												display: "flex",
												alignItems: "center",
												padding: "10px 16px",
												gap: 10,
												flexShrink: 0,
											}}
										>
											<div style={{ flex: 1, minWidth: 0 }}>
												<span
													style={{
														fontSize: 14,
														fontWeight: 700,
														color: T.accent,
														display: "block",
													}}
												>
													Export themes
												</span>
											</div>
											<div
												ref={translationCopyRef}
												style={{
													position: "relative",
													flexShrink: 0,
												}}
											>
												<motion.button
													type="button"
													whileHover={{ background: "#F0F0F0" }}
													whileTap={{ scale: 0.97 }}
													disabled={
														!themedDoc &&
														!markdownExport.trim() &&
														!reactSnippet
													}
													onClick={() =>
														setTranslationCopyOpen((o) => !o)
													}
													title="Copy as HTML, Markdown, or React"
													style={{
														display: "flex",
														alignItems: "center",
														gap: 6,
														padding: "6px 10px",
														borderRadius: 8,
														border: `1px solid ${T.border}`,
														background: T.base,
														cursor:
															themedDoc ||
															markdownExport.trim() ||
															reactSnippet
																? "pointer"
																: "not-allowed",
														opacity:
															themedDoc ||
															markdownExport.trim() ||
															reactSnippet
																? 1
																: 0.45,
														fontSize: 12,
														fontWeight: 700,
														color: T.accent,
														whiteSpace: "nowrap",
													}}
												>
													<Icon
														d={Icons.copy}
														size={13}
														stroke={T.accent}
													/>
													Copy as…
													<span
														style={{
															display: "inline-flex",
															transform: translationCopyOpen
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
													{translationCopyOpen && (
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
																minWidth: 268,
																background: T.surface,
																border: `1px solid ${T.border}`,
																borderRadius: 10,
																boxShadow:
																	"0 12px 32px rgba(0,0,0,0.12)",
																padding: 6,
																zIndex: 420,
															}}
														>
															<button
																type="button"
																disabled={!themedDoc}
																onClick={() => {
																	if (!themedDoc) return;
																	void copyTextToClipboard(
																		themedDoc,
																	).then((ok) => {
																		if (!ok) return;
																		setCopiedTheme({
																			key: previewTheme,
																			format: "html",
																		});
																		setTimeout(
																			() =>
																				setCopiedTheme(null),
																			2200,
																		);
																		setTranslationCopyOpen(
																			false,
																		);
																	});
																}}
																title="Copy full themed HTML document"
																style={{
																	width: "100%",
																	textAlign: "left",
																	padding: "10px 12px",
																	border: "none",
																	borderRadius: 8,
																	background: isCopiedHtmlMini
																		? "rgba(45,106,79,0.1)"
																		: "transparent",
																	cursor: themedDoc
																		? "pointer"
																		: "not-allowed",
																	opacity: themedDoc ? 1 : 0.45,
																	display: "flex",
																	alignItems: "center",
																	gap: 10,
																}}
															>
																<div
																	style={{
																		width: 36,
																		height: 36,
																		borderRadius: 9,
																		background: T.base,
																		border: `1px solid ${T.border}`,
																		display: "flex",
																		alignItems: "center",
																		justifyContent: "center",
																		flexShrink: 0,
																	}}
																>
																	<Icon
																		d={Icons.copy}
																		size={15}
																		stroke={
																			isCopiedHtmlMini
																				? "#2D6A4F"
																				: T.accent
																		}
																	/>
																</div>
																<div style={{ minWidth: 0, flex: 1 }}>
																	<div
																		style={{
																			fontSize: 13,
																			fontWeight: 700,
																			color: isCopiedHtmlMini
																				? "#2D6A4F"
																				: T.accent,
																		}}
																	>
																		{isCopiedHtmlMini
																			? "HTML copied"
																			: "HTML"}
																	</div>
																	<div
																		style={{
																			fontSize: 11,
																			color: T.muted,
																			marginTop: 2,
																			lineHeight: 1.35,
																		}}
																	>
																		Full themed document
																	</div>
																</div>
															</button>
															<button
																type="button"
																disabled={!markdownExport.trim()}
																onClick={() => {
																	if (!markdownExport.trim())
																		return;
																	void copyTextToClipboard(
																		markdownExport,
																	).then((ok) => {
																		if (!ok) return;
																		setCopiedTheme({
																			key: previewTheme,
																			format: "markdown",
																		});
																		setTimeout(
																			() =>
																				setCopiedTheme(null),
																			2200,
																		);
																		setTranslationCopyOpen(
																			false,
																		);
																	});
																}}
																title="Copy Markdown (editor body, not full HTML wrapper)"
																style={{
																	width: "100%",
																	textAlign: "left",
																	padding: "10px 12px",
																	border: "none",
																	borderRadius: 8,
																	background: isCopiedMdMini
																		? "rgba(45,106,79,0.1)"
																		: "transparent",
																	cursor: markdownExport.trim()
																		? "pointer"
																		: "not-allowed",
																	opacity: markdownExport.trim()
																		? 1
																		: 0.45,
																	display: "flex",
																	alignItems: "center",
																	gap: 10,
																}}
															>
																<div
																	style={{
																		width: 36,
																		height: 36,
																		borderRadius: 9,
																		background: T.base,
																		border: `1px solid ${T.border}`,
																		display: "flex",
																		alignItems: "center",
																		justifyContent: "center",
																		flexShrink: 0,
																	}}
																>
																	<Icon
																		d={Icons.fileText}
																		size={15}
																		stroke={
																			isCopiedMdMini
																				? "#2D6A4F"
																				: T.accent
																		}
																	/>
																</div>
																<div style={{ minWidth: 0, flex: 1 }}>
																	<div
																		style={{
																			fontSize: 13,
																			fontWeight: 700,
																			color: isCopiedMdMini
																				? "#2D6A4F"
																				: T.accent,
																		}}
																	>
																		{isCopiedMdMini
																			? "Markdown copied"
																			: "Markdown"}
																	</div>
																	<div
																		style={{
																			fontSize: 11,
																			color: T.muted,
																			marginTop: 2,
																			lineHeight: 1.35,
																		}}
																	>
																		Editor body, no HTML wrapper
																	</div>
																</div>
															</button>
															<button
																type="button"
																disabled={!reactSnippet}
																onClick={() => {
																	if (!reactSnippet) return;
																	void copyTextToClipboard(
																		reactSnippet,
																	).then((ok) => {
																		if (!ok) return;
																		setCopiedTheme({
																			key: previewTheme,
																			format: "react",
																		});
																		setTimeout(
																			() =>
																				setCopiedTheme(null),
																			2200,
																		);
																		setTranslationCopyOpen(
																			false,
																		);
																	});
																}}
																title="Copy React iframe embed snippet"
																style={{
																	width: "100%",
																	textAlign: "left",
																	padding: "10px 12px",
																	border: "none",
																	borderRadius: 8,
																	background: isCopiedReactMini
																		? "rgba(30,58,95,0.1)"
																		: "transparent",
																	cursor: reactSnippet
																		? "pointer"
																		: "not-allowed",
																	opacity: reactSnippet ? 1 : 0.45,
																	display: "flex",
																	alignItems: "center",
																	gap: 10,
																}}
															>
																<div
																	style={{
																		width: 36,
																		height: 36,
																		borderRadius: 9,
																		background: T.base,
																		border: `1px solid ${T.border}`,
																		display: "flex",
																		alignItems: "center",
																		justifyContent: "center",
																		flexShrink: 0,
																	}}
																>
																	<Icon
																		d={Icons.link2}
																		size={15}
																		stroke={
																			isCopiedReactMini
																				? "#1E3A5F"
																				: T.accent
																		}
																	/>
																</div>
																<div style={{ minWidth: 0, flex: 1 }}>
																	<div
																		style={{
																			fontSize: 13,
																			fontWeight: 700,
																			color: isCopiedReactMini
																				? "#1E3A5F"
																				: T.accent,
																		}}
																	>
																		{isCopiedReactMini
																			? "React copied"
																			: "React"}
																	</div>
																	<div
																		style={{
																			fontSize: 11,
																			color: T.muted,
																			marginTop: 2,
																			lineHeight: 1.35,
																		}}
																	>
																		Iframe embed snippet
																	</div>
																</div>
															</button>
														</motion.div>
													)}
												</AnimatePresence>
											</div>
											<motion.button
												type="button"
												whileHover={{ background: "#F0F0F0" }}
												whileTap={{ scale: 0.93 }}
												onClick={() => onClose()}
												style={{
													width: 32,
													height: 32,
													borderRadius: 8,
													border: `1px solid ${T.border}`,
													background: "transparent",
													cursor: "pointer",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													color: T.muted,
													flexShrink: 0,
													alignSelf: "flex-start",
												}}
												title="Close"
											>
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
											</motion.button>
										</div>
										<div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
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
														<motion.button
															key={key}
															whileTap={{ scale: 0.97 }}
															onClick={() => setPreviewTheme(key)}
															style={{
																background: isActive
																	? T.surface
																	: "transparent",
																border: `1.5px solid ${isActive ? T.border : "transparent"}`,
																borderRadius: 10,
																padding: "10px 12px",
																cursor: "pointer",
																display: "flex",
																alignItems: "center",
																gap: 10,
																textAlign: "left",
																boxShadow: isActive
																	? "0 1px 6px rgba(0,0,0,0.07)"
																	: "none",
															}}
														>
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
															<div style={{ minWidth: 0 }}>
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
															{isActive && (
																<div
																	style={{
																		marginLeft: "auto",
																		width: 6,
																		height: 6,
																		borderRadius: "50%",
																		background: T.warm,
																		flexShrink: 0,
																	}}
																/>
															)}
														</motion.button>
													);
												})}
											</div>
											<div style={{ flex: 1, position: "relative", background: "#e5e7eb" }}>
												{themedDoc ? (
													<iframe
														key={`theme-prev-${previewTheme}-${translatedHTML ? "t" : "o"}`}
														srcDoc={themedDoc}
														title="Theme preview"
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
															padding: 24,
															textAlign: "center",
														}}
													>
														No content to preview — write in the editor first.
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
