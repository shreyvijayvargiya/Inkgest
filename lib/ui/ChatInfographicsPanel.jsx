"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
	INK_INFOGRAPHIC_DRAG_MIME,
	appendInfographicToEditor,
	infographicDragPayloadString,
	infographicEmbedOuterHtml,
	insertInfographicAfterCollapsedRange,
} from "./infographicInsertion";
import InfographicThumbPreview from "./InfographicThumbPreview";
import { InfographicCard } from "./InfographicsModal";

/** Matches scraped-sources strip in AIChatSidebar */
const WARM = {
	border: "#EAD9BF",
	hdr: "#5e5e5e",
	sub: "#B08B5F",
	muted: "#5A5550",
	bg: "linear-gradient(180deg, #FFFDF8 0%, #FDF8F4 100%)",
	cellBorder: "#E8E4DC",
	accent: "#C17B2F",
};

function formatTypeLabel(type) {
	if (!type) return "Visual";
	return String(type)
		.replace(/_/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Chat attachment: one summary card → modal grid → insert / preview / copy embed.
 */
export default function ChatInfographicsPanel({
	items = [],
	editorRef,
	onInserted,
}) {
	const [pickerOpen, setPickerOpen] = useState(false);
	const [previewIg, setPreviewIg] = useState(null);
	const [menuIdx, setMenuIdx] = useState(null);

	useEffect(() => {
		if (!pickerOpen && !previewIg) return;
		const onKey = (e) => {
			if (e.key === "Escape") {
				setPreviewIg(null);
				setPickerOpen(false);
				setMenuIdx(null);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [pickerOpen, previewIg]);

	useEffect(() => {
		if (menuIdx == null) return;
		const close = (e) => {
			const el = e.target;
			if (!(el instanceof Element)) return;
			if (el.closest("[data-chat-ig-menu-root]")) return;
			setMenuIdx(null);
		};
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, [menuIdx]);

	const startDrag = useCallback((e, ig) => {
		try {
			e.dataTransfer.setData(
				INK_INFOGRAPHIC_DRAG_MIME,
				infographicDragPayloadString(ig),
			);
			e.dataTransfer.effectAllowed = "copy";
		} catch {
			/* ignore */
		}
	}, []);

	const insertIntoDraft = useCallback(
		(ig) => {
			const el = editorRef?.current;
			if (!el) {
				toast.error("Editor not connected.");
				return;
			}
			const sel = window.getSelection();
			let ok = false;
			if (
				sel?.rangeCount > 0 &&
				el.contains(sel.getRangeAt(0).commonAncestorContainer)
			) {
				ok = insertInfographicAfterCollapsedRange(
					el,
					sel.getRangeAt(0),
					ig,
					false,
				);
			} else {
				ok = appendInfographicToEditor(el, ig);
			}
			if (ok) {
				toast.success("Inserted into draft");
				onInserted?.();
				setPickerOpen(false);
			} else {
				toast.error("Could not insert — click inside the editor first.");
			}
		},
		[editorRef, onInserted],
	);

	const copyEmbed = useCallback((ig) => {
		const html = infographicEmbedOuterHtml(ig);
		if (!html) {
			toast.error("Could not build embed HTML.");
			return;
		}
		navigator.clipboard.writeText(html).then(
			() => toast.success("Embed HTML copied"),
			() => toast.error("Clipboard failed"),
		);
		setMenuIdx(null);
	}, []);

	if (!items?.length) return null;

	const headline =
		items.length === 1
			? items[0].title || items[0].type || "Infographic"
			: `${items.length} panels ready`;

	const teaser =
		items.length === 1
			? (
					String(items[0].subtitle || "").trim().slice(0, 110) ||
					formatTypeLabel(items[0].type)
				)
			: items
					.slice(0, 2)
					.map((x) => x.title || formatTypeLabel(x.type))
					.join(" · ");

	const previewIgItem = previewIg;

	return (
		<>
			<div
				style={{
					marginBottom: 10,
					borderRadius: 10,
					border: `1px solid ${WARM.border}`,
					background: WARM.bg,
					overflow: "hidden",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "8px 10px",
						borderBottom: `1px solid #EDE4D6`,
						background: "#FFFFFF95",
					}}
				>
					<span
						style={{ fontSize: 11, fontWeight: 700, color: WARM.hdr }}
					>
						Infographics
					</span>
					<span style={{ fontSize: 10.5, color: WARM.sub }}>
						Inkgest · {items.length} panel
						{items.length === 1 ? "" : "s"}
					</span>
				</div>

				<button
					type="button"
					onClick={() => setPickerOpen(true)}
					style={{
						width: "100%",
						display: "block",
						padding: "11px 12px",
						border: "none",
						background: "transparent",
						cursor: "pointer",
						textAlign: "left",
						fontFamily: "inherit",
					}}
				>
					<p
						style={{
							margin: "0 0 4px",
							fontSize: 13,
							fontWeight: 700,
							color: "#1A1A1A",
							lineHeight: 1.35,
						}}
					>
						{headline}
					</p>
					<p
						style={{
							margin: 0,
							fontSize: 11.5,
							color: WARM.muted,
							lineHeight: 1.45,
							display: "-webkit-box",
							WebkitLineClamp: 2,
							WebkitBoxOrient: "vertical",
							overflow: "hidden",
						}}
					>
						{teaser}
						{items.length > 2 ? " …" : ""}
					</p>
					<p
						style={{
							margin: "8px 0 0",
							fontSize: 11,
							fontWeight: 600,
							color: WARM.accent,
						}}
					>
						Click to choose panels · drag from grid into the draft
					</p>
				</button>
			</div>

			{typeof document !== "undefined" &&
				createPortal(
					<>
						<AnimatePresence>
							{pickerOpen ? (
								<motion.div
									key="ig-picker"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									style={{
										position: "fixed",
										inset: 0,
										zIndex: 425,
										background: "rgba(0,0,0,0.48)",
										backdropFilter: "blur(4px)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										padding: "16px",
									}}
									onClick={() => setPickerOpen(false)}
								>
									<motion.div
										initial={{ opacity: 0, y: 10, scale: 0.98 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										exit={{ opacity: 0, y: 8, scale: 0.98 }}
										transition={{ duration: 0.2 }}
										onClick={(e) => e.stopPropagation()}
										style={{
											width: "min(920px, 100%)",
											maxHeight: "min(88vh, 900px)",
											display: "flex",
											flexDirection: "column",
											background: "#FFFFFF",
											borderRadius: 14,
											border: `1px solid ${WARM.border}`,
											boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
											overflow: "hidden",
										}}
									>
										<div
											style={{
												display: "flex",
												alignItems: "flex-start",
												justifyContent: "space-between",
												gap: 12,
												padding: "14px 16px",
												borderBottom: `1px solid ${WARM.cellBorder}`,
												background: "#FFFFFF",
											}}
										>
											<div>
												<p
													style={{
														margin: 0,
														fontSize: 14,
														fontWeight: 700,
														color: "#1A1A1A",
													}}
												>
													Choose an infographic
												</p>
												<p
													style={{
														margin: "5px 0 0",
														fontSize: 12,
														color: WARM.muted,
														lineHeight: 1.45,
													}}
												>
													Preview matches published posts. Copy embed HTML for
													notion‑style paste elsewhere.
												</p>
											</div>
											<button
												type="button"
												onClick={() => setPickerOpen(false)}
												style={{
													flexShrink: 0,
													padding: "7px 12px",
													borderRadius: 8,
													border: `1px solid ${WARM.cellBorder}`,
													background: "#fff",
													fontSize: 12,
													fontWeight: 600,
													cursor: "pointer",
													color: "#57534E",
												}}
											>
												Close
											</button>
										</div>

										<div
											style={{
												padding: 14,
												overflowY: "auto",
												flex: 1,
											}}
										>
											<div
												style={{
													display: "grid",
													gridTemplateColumns:
														"repeat(auto-fill, minmax(240px, 1fr))",
													gap: 12,
												}}
											>
												{items.map((ig, i) => {
													const menuOpen = menuIdx === i;
													return (
														<motion.div
															key={`${ig.type}-${i}-${String(ig.title || "").slice(0, 12)}`}
															layout
															draggable
															onDragStart={(e) => startDrag(e, ig)}
															style={{
																position: "relative",
																borderRadius: 12,
																border: `1px solid ${WARM.cellBorder}`,
																background: "#FFFFFF",
																overflow: "hidden",
																display: "flex",
																flexDirection: "column",
																cursor: "grab",
															}}
														>
															<div
																style={{
																	borderBottom: `1px solid ${WARM.cellBorder}`,
																	overflow: "hidden",
																}}
															>
																<InfographicThumbPreview ig={ig} height={148} />
															</div>

															<div style={{ padding: "10px 10px 12px", flex: 1 }}>
																<p
																	style={{
																		fontSize: 12,
																		fontWeight: 700,
																		margin: "0 0 4px",
																		color: "#1A1A1A",
																		lineHeight: 1.35,
																		display: "-webkit-box",
																		WebkitLineClamp: 2,
																		WebkitBoxOrient: "vertical",
																		overflow: "hidden",
																	}}
																>
																	{ig.title ||
																		formatTypeLabel(ig.type)}
																</p>
																<span
																	style={{
																		display: "inline-block",
																		fontSize: 10,
																		fontWeight: 600,
																		color: "#92400E",
																		background: "#FEF3E2",
																		borderRadius: 6,
																		padding: "2px 8px",
																		marginBottom: 10,
																	}}
																>
																	{formatTypeLabel(ig.type)}
																</span>

																<div
																	style={{
																		display: "flex",
																		flexWrap: "wrap",
																		gap: 6,
																		alignItems: "center",
																	}}
																>
																	<button
																		type="button"
																		onClick={() =>
																			insertIntoDraft(ig)
																		}
																		style={{
																			padding: "6px 11px",
																			borderRadius: 8,
																			border: "none",
																			background: WARM.accent,
																			color: "#fff",
																			fontWeight: 700,
																			fontSize: 11,
																			cursor: "pointer",
																		}}
																	>
																		Insert in draft
																	</button>
																	<button
																		type="button"
																		onClick={() =>
																			setPreviewIg(ig)
																		}
																		style={{
																			padding: "6px 11px",
																			borderRadius: 8,
																			border: `1px solid ${WARM.cellBorder}`,
																			background: "#fff",
																			fontWeight: 600,
																			fontSize: 11,
																			cursor: "pointer",
																			color: "#44403C",
																		}}
																	>
																		Preview
																	</button>

																	<div
																		data-chat-ig-menu-root
																		style={{
																			position: "relative",
																			marginLeft: "auto",
																		}}
																	>
																		<button
																			type="button"
																			onClick={(e) => {
																				e.stopPropagation();
																				setMenuIdx(menuOpen ? null : i);
																			}}
																			style={{
																				padding: "6px 10px",
																				borderRadius: 8,
																				border: `1px solid ${WARM.cellBorder}`,
																				background: menuOpen
																					? "#F5F3EF"
																					: "#fff",
																				fontWeight: 600,
																				fontSize: 11,
																				cursor: "pointer",
																				color: "#57534E",
																			}}
																		>
																			Copy ▾
																		</button>
																		{menuOpen ? (
																			<div
																				style={{
																					position: "absolute",
																					right: 0,
																					top: "100%",
																					marginTop: 4,
																					minWidth: 160,
																					background: "#fff",
																					border: `1px solid ${WARM.cellBorder}`,
																					borderRadius: 10,
																					boxShadow:
																						"0 12px 28px rgba(0,0,0,0.12)",
																					zIndex: 50,
																					overflow: "hidden",
																				}}
																				onMouseDown={(e) =>
																					e.stopPropagation()
																				}
																			>
																				<button
																					type="button"
																					onClick={() =>
																						copyEmbed(ig)
																					}
																					style={{
																						display: "block",
																						width: "100%",
																						padding:
																							"10px 12px",
																						border: "none",
																						background:
																							"#fff",
																						textAlign:
																							"left",
																						fontSize: 12,
																						fontWeight: 600,
																						cursor: "pointer",
																						color: "#292524",
																					}}
																				>
																					Copy embed HTML
																				</button>
																			</div>
																		) : null}
																	</div>
																</div>
															</div>
														</motion.div>
													);
												})}
											</div>
										</div>
									</motion.div>
								</motion.div>
							) : null}
						</AnimatePresence>

						<AnimatePresence>
							{previewIg ? (
								<motion.div
									key="ig-full-preview"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									style={{
										position: "fixed",
										inset: 0,
										zIndex: 435,
										background: "rgba(0,0,0,0.5)",
										backdropFilter: "blur(4px)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										padding: 20,
									}}
									onClick={() => setPreviewIg(null)}
								>
									<motion.div
										initial={{ scale: 0.96, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
										exit={{ scale: 0.96, opacity: 0 }}
										transition={{ duration: 0.18 }}
										onClick={(e) => e.stopPropagation()}
										style={{
											width: "min(560px, 100%)",
											maxHeight: "92vh",
											overflowY: "auto",
											background: "#fff",
											borderRadius: 16,
											border: `1px solid ${WARM.border}`,
											padding: 16,
											boxShadow: "0 32px 60px rgba(0,0,0,0.22)",
										}}
									>
										<div
											style={{
												display: "flex",
												justifyContent: "flex-end",
												marginBottom: 8,
											}}
										>
											<button
												type="button"
												onClick={() => setPreviewIg(null)}
												style={{
													padding: "6px 12px",
													borderRadius: 8,
													border: `1px solid ${WARM.cellBorder}`,
													background: "#fff",
													fontWeight: 600,
													fontSize: 12,
													cursor: "pointer",
												}}
											>
												Close
											</button>
										</div>
										{previewIgItem ? (
											<div
												style={{
													width: "100%",
													maxWidth: 520,
													margin: "0 auto",
												}}
											>
												<InfographicCard ig={previewIgItem} />
											</div>
										) : null}
									</motion.div>
								</motion.div>
							) : null}
						</AnimatePresence>
					</>,
					document.body,
				)}
		</>
	);
}
