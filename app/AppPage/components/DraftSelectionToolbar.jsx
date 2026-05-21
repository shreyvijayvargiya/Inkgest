import { motion, AnimatePresence } from "framer-motion";
import InfographicInlineGeneratePanel from "../../../lib/ui/InfographicInlineGeneratePanel";
import MermaidInlineGeneratePanel from "../../../lib/ui/MermaidInlineGeneratePanel";
import {
  T,
  Icons,
  Icon,
  SELECTION_TEXT_COLORS,
  SELECTION_BG_COLORS,
} from "../draftPageLib";
import {
  insertInfographicAfterCollapsedRange,
} from "../../../lib/ui/infographicInsertion";
import {
  insertMermaidAfterCollapsedRange,
} from "../../../lib/ui/mermaidInsertion";

export default function DraftSelectionToolbar(props) {
  const {
    selectionDropdown,
    setSelectionDropdown,
    selectionSubtool,
    setSelectionSubtool,
    selectionLinkOpen,
    setSelectionLinkOpen,
    selectionLinkUrl,
    setSelectionLinkUrl,
    selectionLinkText,
    setSelectionLinkText,
    setSelectionContext,
    setChatOpen,
    editorRef,
    restoreEditorSelection,
    selectionSavedRangeRef,
    countWords,
    applyDraftBubbleInlineStyle,
    execDraftForeColor,
    execDraftHiliteColor,
    unwrapDraftInlineSpan,
    openIconPickerAtPoint,
    iconPicker,
    closeIconPicker,
    draftSelectionSpansMultipleBlocks,
    getSelectionLinkContext,
  } = props;

  return (
    <>
    				{/* Text selection dropdown (Notion-style) */}
    				<AnimatePresence>
    					{selectionDropdown && (
    						<motion.div
    							data-selection-dropdown
    							initial={{ opacity: 0, y: 4, scale: 0.96 }}
    							animate={{ opacity: 1, y: 0, scale: 1 }}
    							exit={{ opacity: 0, y: 4, scale: 0.96 }}
    							style={{
    								position: "fixed",
    								left: selectionDropdown.x,
    								top: selectionDropdown.top,
    								zIndex: 100,
    								background: T.surface,
    								border: `1px solid ${T.border}`,
    								borderRadius: 10,
    								boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    								padding: 8,
    								display: "flex",
    								flexDirection: "column",
    								alignItems: "stretch",
    								gap: 0,
    								maxWidth: 700,
    								minWidth:
    									selectionSubtool === "infographics" ||
    									selectionSubtool === "mermaid"
    										? 360
    										: selectionSubtool
    											? 280
    											: 200,
    							}}
    						>
    							<div
    								style={{
    									display: "flex",
    									flexWrap: "wrap",
    									alignItems: "center",
    									gap: 4,
    								}}
    							>
    							<motion.button
    								whileHover={{ background: "#F0ECE5" }}
    								whileTap={{ scale: 0.96 }}
    								onClick={() => {
    									setSelectionContext(selectionDropdown.text);
    									setChatOpen(true);
    									setSelectionDropdown(null);
    								}}
    								style={{
    									display: "flex",
    									alignItems: "center",
    									gap: 5,
    									padding: "6px 10px",
    									border: "none",
    									borderRadius: 6,
    									background: "#C17B2F15",
    									fontSize: 12,
    									fontWeight: 700,
    									color: "#92400E",
    									cursor: "pointer",
    								}}
    							>
    								<Icon
    									d="M12 3l1.8 5.4L19.2 9l-5.4 1.8L12 16.2l-1.8-5.4L4.8 9l5.4-1.8L12 3z"
    									size={12}
    									stroke="#C17B2F"
    								/>
    								Add to AI chat
    							</motion.button>
    							<motion.button
    								whileHover={{ background: "#F0ECE5" }}
    								whileTap={{ scale: 0.96 }}
    								onMouseDown={(e) => e.preventDefault()}
    								onClick={() => {
    									document.execCommand("bold");
    									setSelectionDropdown(null);
    								}}
    								className="inline-flex items-center justify-center w-6 h-6 p-0 border-none rounded bg-none text-sm font-medium text-zinc-600 cursor-pointer"
    							>
    								B
    							</motion.button>
    							<motion.button
    								whileHover={{ background: "#F0ECE5" }}
    								whileTap={{ scale: 0.96 }}
    								onMouseDown={(e) => e.preventDefault()}
    								onClick={() => {
    									document.execCommand("italic");
    									setSelectionDropdown(null);
    								}}
    								className="inline-flex items-center justify-center w-6 h-6 p-0 border-none rounded bg-none text-sm font-medium text-zinc-600 cursor-pointer"
    							>
    								I
    							</motion.button>
    							<div
    								className="w-px h-4 bg-zinc-200 flex gap-1"
    							/>
    							{[
    								{ cmd: "p", label: "Text" },
    								{ cmd: "h1", label: "H1" },
    								{ cmd: "h2", label: "H2" },
    								{ cmd: "ul", label: "• List" },
    							].map(({ cmd, label }) => (
    								<motion.button
    									key={cmd}
    									whileHover={{ background: "#F0ECE5" }}
    									whileTap={{ scale: 0.96 }}
    									onMouseDown={(e) => e.preventDefault()}
    									onClick={() => {
    										if (cmd === "ul")
    											document.execCommand("insertUnorderedList");
    										else if (cmd === "ol")
    											document.execCommand("insertOrderedList");
    										else
    											document.execCommand("formatBlock", false, cmd);
    										setSelectionDropdown(null);
    										countWords();
    									}}
    									className="inline-flex items-center justify-center py-0.5 px-1 border-none rounded bg-none text-sm font-medium text-zinc-600 cursor-pointer"
    								>
    									{label}
    								</motion.button>
    							))}
    							<div
    								style={{
    									width: 1,
    									height: 20,
    									background: T.border,
    									margin: "0 2px",
    								}}
    							/>
    							<motion.button
    								whileHover={{ background: "#F0ECE5" }}
    								whileTap={{ scale: 0.96 }}
    								title="Add link"
    								onMouseDown={(e) => e.preventDefault()}
    								onClick={() => {
    									setSelectionSubtool((s) => {
    										if (s === "link") {
    											setSelectionLinkUrl("");
    											return null;
    										}
    										const { href: h } = getSelectionLinkContext(
    											window.getSelection(),
    										);
    										setSelectionLinkUrl(h);
    										return "link";
    									});
    								}}
    								className={`inline-flex items-center justify-center w-6 h-6 p-0 border-none rounded bg-none text-sm font-medium text-accent cursor-pointer ${selectionSubtool === "link" ? "bg-zinc-100" : "bg-none"}`}
    							>
    								<Icon
    									d={Icons.link2}
    									size={14}
    									stroke={T.accent}
    								/>
    							</motion.button>
    							<motion.button
    								whileHover={{ background: "#F0ECE5" }}
    								whileTap={{ scale: 0.96 }}
    								title="Insert icon inline with selection"
    								onMouseDown={(e) => e.preventDefault()}
    								onClick={() => {
    									if (!selectionDropdown) return;
    									if (iconPicker?.mode === "inline") {
    										closeIconPicker();
    										setSelectionSubtool(null);
    										return;
    									}
    									openIconPickerAtPoint(
    										Math.min(
    											selectionDropdown.x,
    											window.innerWidth - 310,
    										),
    										Math.min(
    											selectionDropdown.top + 44,
    											window.innerHeight - 390,
    										),
    									);
    									setSelectionSubtool("icon");
    								}}
    								className={`inline-flex items-center justify-center py-0.5 px-2 border-none rounded bg-none text-xs font-semibold text-accent cursor-pointer ${iconPicker?.mode === "inline" ? "bg-zinc-100" : "bg-none"}`}
    							>
    								Icon
    							</motion.button>
    							<motion.button
    								whileHover={{ background: "#F0ECE5" }}
    								whileTap={{ scale: 0.96 }}
    								title="Text color (Tailwind palette)"
    								onMouseDown={(e) => e.preventDefault()}
    								onClick={() =>
    									setSelectionSubtool((s) =>
    										s === "textColor" ? null : "textColor",
    									)
    								}
    								className={`inline-flex items-center justify-center w-6 h-6 p-0 border-none rounded bg-none text-sm font-medium text-zinc-500 cursor-pointer ${selectionSubtool === "textColor" ? "bg-zinc-100" : "bg-none"}`}
    							>
    								A
    							</motion.button>
    							<motion.button
    								whileHover={{ background: "#F0ECE5" }}
    								whileTap={{ scale: 0.96 }}
    								title="Highlight / background color"
    								onMouseDown={(e) => e.preventDefault()}
    								onClick={() =>
    									setSelectionSubtool((s) =>
    										s === "bgColor" ? null : "bgColor",
    									)
    								}
    								className={`inline-flex items-center justify-center w-6 h-6 p-0 border-none rounded bg-none text-sm font-medium text-zinc-500 cursor-pointer ${selectionSubtool === "bgColor" ? "bg-zinc-100" : "bg-none"}`}
    							>
    								ab
    							</motion.button>
    							<motion.button
    								whileHover={{ background: "#F0ECE5" }}
    								whileTap={{ scale: 0.96 }}
    								title="Infographic from selection"
    								onMouseDown={(e) => e.preventDefault()}
    								onClick={() =>
    									setSelectionSubtool((s) =>
    										s === "infographics" ? null : "infographics",
    									)
    								}
    								className={`inline-flex items-center justify-center w-6 h-6 p-0 border-none rounded bg-none text-sm font-medium text-accent cursor-pointer ${selectionSubtool === "infographics" ? "bg-zinc-100" : "bg-none"}`}
    							>
    								<Icon
    									d={Icons.barChart}
    									size={14}
    									stroke={T.accent}
    								/>
    							</motion.button>
    							<motion.button
    								whileHover={{ background: "#F0ECE5" }}
    								whileTap={{ scale: 0.96 }}
    								title="Mermaid diagram"
    								onMouseDown={(e) => e.preventDefault()}
    								onClick={() =>
    									setSelectionSubtool((s) =>
    										s === "mermaid" ? null : "mermaid",
    									)
    								}
    								className={`inline-flex items-center justify-center w-6 h-6 p-0 border-none rounded bg-none text-sm font-medium text-accent cursor-pointer ${selectionSubtool === "mermaid" ? "bg-zinc-100" : "bg-none"}`}
    							>
    								<Icon
    									d={Icons.workflow}
    									size={14}
    									stroke={T.accent}
    								/>
    							</motion.button>
    							</div>

    							<AnimatePresence initial={false}>
    								{selectionSubtool === "link" && (
    									<motion.div
    										key="selection-link-panel"
    										data-selection-dropdown
    										initial={{ opacity: 0, y: -8 }}
    										animate={{ opacity: 1, y: 0 }}
    										exit={{ opacity: 0, y: -8 }}
    										transition={{
    											duration: 0.18,
    											ease: [0.16, 1, 0.3, 1],
    										}}
    										style={{
    											marginTop: 8,
    											paddingTop: 10,
    											borderTop: `1px solid ${T.border}`,
    											display: "flex",
    											flexDirection: "column",
    											gap: 8,
    											overflow: "hidden",
    										}}
    									>
    										<p
    											style={{
    												fontSize: 11,
    												fontWeight: 700,
    												color: "#B0AAA3",
    												textTransform: "uppercase",
    												letterSpacing: "0.06em",
    												margin: 0,
    											}}
    										>
    											Link URL
    										</p>
    										<input
    											ref={selectionLinkInputRef}
    											type="text"
    											value={selectionLinkUrl}
    											onChange={(e) =>
    												setSelectionLinkUrl(e.target.value)
    											}
    											onKeyDown={(e) => {
    												if (e.key === "Enter") {
    													e.preventDefault();
    													let url = selectionLinkUrl.trim();
    													if (!url) return;
    													if (
    														!/^https?:\/\//i.test(url) &&
    														!url.startsWith("mailto:")
    													) {
    														url = `https://${url}`;
    													}
    													if (!restoreEditorSelection()) return;
    													document.execCommand(
    														"createLink",
    														false,
    														url,
    													);
    													countWords();
    													setSelectionDropdown(null);
    													setSelectionSubtool(null);
    													setSelectionLinkUrl("");
    												}
    											}}
    											placeholder="https:// or mailto:…"
    											style={{
    												width: "100%",
    												padding: "8px 10px",
    												borderRadius: 8,
    												border: `1px solid ${T.border}`,
    												fontSize: 13,
    												background: T.base,
    												color: T.accent,
    											}}
    											className="outline-none"
    										/>
    										<div
    											style={{
    												display: "flex",
    												justifyContent: "flex-end",
    												gap: 8,
    											}}
    										>
    											<button
    												type="button"
    												onMouseDown={(e) => e.preventDefault()}
    												onClick={() => {
    													setSelectionSubtool(null);
    													setSelectionLinkUrl("");
    												}}
    												style={{
    													padding: "6px 12px",
    													borderRadius: 8,
    													border: `1px solid ${T.border}`,
    													background: T.base,
    													fontSize: 12,
    													fontWeight: 600,
    													color: T.muted,
    													cursor: "pointer",
    												}}
    											>
    												Cancel
    											</button>
    											<button
    												type="button"
    												onMouseDown={(e) => e.preventDefault()}
    												onClick={() => {
    													let url = selectionLinkUrl.trim();
    													if (!url) return;
    													if (
    														!/^https?:\/\//i.test(url) &&
    														!url.startsWith("mailto:")
    													) {
    														url = `https://${url}`;
    													}
    													if (!restoreEditorSelection()) return;
    													document.execCommand(
    														"createLink",
    														false,
    														url,
    													);
    													countWords();
    													setSelectionDropdown(null);
    													setSelectionSubtool(null);
    													setSelectionLinkUrl("");
    												}}
    												style={{
    													padding: "6px 14px",
    													borderRadius: 8,
    													border: "none",
    													background: T.accent,
    													fontSize: 12,
    													fontWeight: 700,
    													color: "white",
    													cursor: "pointer",
    												}}
    											>
    												Apply link
    											</button>
    										</div>
    									</motion.div>
    								)}
    							</AnimatePresence>

    							{selectionSubtool === "textColor" && (
    								<div
    									data-selection-dropdown
    									style={{
    										marginTop: 8,
    										paddingTop: 10,
    										borderTop: `1px solid ${T.border}`,
    									}}
    								>
    									<p
    										style={{
    											fontSize: 11,
    											fontWeight: 700,
    											color: "#B0AAA3",
    											textTransform: "uppercase",
    											letterSpacing: "0.06em",
    											marginBottom: 8,
    										}}
    									>
    										Text color
    									</p>
    									<div
    										style={{
    											display: "grid",
    											gridTemplateColumns:
    												"repeat(12, 1fr)",
    											gap: 4,
    										}}
    									>
    										{SELECTION_TEXT_COLORS.map(({ label, hex }) => (
    											<button
    												key={label}
    												type="button"
    												title={label}
    												onMouseDown={(e) => e.preventDefault()}
    												onClick={() => {
    													if (!restoreEditorSelection()) return;
    													const patch = {
    														color: hex || null,
    													};
    													const ok = applyDraftBubbleInlineStyle(
    														editorRef.current,
    														patch,
    													);
    													if (!ok) {
    														if (!hex)
    															execDraftForeColor("#37352F");
    														else execDraftForeColor(hex);
    													}
    													countWords();
    													setSelectionDropdown(null);
    													setSelectionSubtool(null);
    												}}
    												style={{
    													width: "100%",
    													aspectRatio: "1",
    													borderRadius: 6,
    													border: `1px solid ${T.border}`,
    													background: hex || "#FFFFFF",
    													cursor: "pointer",
    													boxSizing: "border-box",
    													display: "flex",
    													alignItems: "center",
    													justifyContent: "center",
    													fontSize: 8,
    													fontWeight: 700,
    													color: hex ? "#fff" : T.muted,
    													textDecoration: !hex
    														? "line-through"
    														: "none",
    												}}
    											>
    												{!hex ? "×" : ""}
    											</button>
    										))}
    									</div>
    								</div>
    							)}

    							{selectionSubtool === "bgColor" && (
    								<div
    									data-selection-dropdown
    									style={{
    										marginTop: 8,
    										paddingTop: 10,
    										borderTop: `1px solid ${T.border}`,
    									}}
    								>
    									<p
    										style={{
    											fontSize: 11,
    											fontWeight: 700,
    											color: "#B0AAA3",
    											textTransform: "uppercase",
    											letterSpacing: "0.06em",
    											marginBottom: 8,
    										}}
    									>
    										Background
    									</p>
    									<div
    										style={{
    											display: "grid",
    											gridTemplateColumns:
    												"repeat(12, 1fr)",
    											gap: 4,
    										}}
    									>
    										{SELECTION_BG_COLORS.map(({ label, hex }) => (
    											<button
    												key={label}
    												type="button"
    												title={label}
    												onMouseDown={(e) => e.preventDefault()}
    												onClick={() => {
    													if (!restoreEditorSelection()) return;
    													const clearBg = "#F7F5F0";
    													const patch =
    														hex === "clear"
    															? { backgroundColor: null }
    															: { backgroundColor: hex };
    													const ok = applyDraftBubbleInlineStyle(
    														editorRef.current,
    														patch,
    													);
    													if (!ok) {
    														if (hex === "clear")
    															execDraftHiliteColor(clearBg);
    														else execDraftHiliteColor(hex);
    													}
    													countWords();
    													setSelectionDropdown(null);
    													setSelectionSubtool(null);
    												}}
    												style={{
    													width: "100%",
    													aspectRatio: "1",
    													borderRadius: 6,
    													border: `1px solid ${T.border}`,
    													background:
    														hex === "clear" ? T.base : hex,
    													cursor: "pointer",
    													boxSizing: "border-box",
    													display: "flex",
    													alignItems: "center",
    													justifyContent: "center",
    													fontSize: 7,
    													fontWeight: 700,
    													color: T.muted,
    												}}
    											>
    												{hex === "clear" ? "∅" : ""}
    											</button>
    										))}
    									</div>
    								</div>
    							)}

    							{selectionSubtool === "infographics" && (
    								<div
    									data-selection-dropdown
    									style={{
    										marginTop: 8,
    										paddingTop: 10,
    										borderTop: `1px solid ${T.border}`,
    									}}
    								>
    									{(selectionDropdown.text || "").trim().length <
    									8 ? (
    										<p
    											style={{
    												fontSize: 12,
    												color: T.muted,
    												margin: 0,
    												lineHeight: 1.5,
    											}}
    										>
    											Select a bit more text in the draft (at least
    											8 characters) to generate infographics.
    										</p>
    									) : (
    										<InfographicInlineGeneratePanel
    											userId={reduxUser?.uid || ""}
    											sourceText={(
    												selectionDropdown.text || ""
    											).trim()}
    											draftTitle={
    												titleRef.current?.innerText?.trim() ||
    												draft?.title ||
    												"Draft"
    											}
    											requestClose={() =>
    												setSelectionSubtool(null)
    											}
    											onInsertSpec={(spec) => {
    												const el = editorRef.current;
    												if (!el) return;
    												if (!restoreEditorSelection())
    													return;
    												const saved =
    													selectionSavedRangeRef.current;
    												if (
    													saved &&
    													insertInfographicAfterCollapsedRange(
    														el,
    														saved.cloneRange(),
    														spec,
    														false,
    													)
    												) {
    													countWords();
    												}
    												setSelectionDropdown(null);
    												setSelectionSubtool(null);
    											}}
    										/>
    									)}
    								</div>
    							)}

    							{selectionSubtool === "mermaid" && (
    								<div
    									data-selection-dropdown
    									style={{
    										marginTop: 8,
    										paddingTop: 10,
    										borderTop: `1px solid ${T.border}`,
    									}}
    								>
    									<MermaidInlineGeneratePanel
    										userId={reduxUser?.uid || ""}
    										sourceText={(
    											selectionDropdown.text || ""
    										).trim()}
    										draftTitle={
    											titleRef.current?.innerText?.trim() ||
    											draft?.title ||
    											"Draft"
    										}
    										requestClose={() =>
    											setSelectionSubtool(null)
    										}
    										onInsert={(payload) => {
    											const el = editorRef.current;
    											if (!el) return;
    											if (!restoreEditorSelection()) return;
    											const saved =
    												selectionSavedRangeRef.current;
    											if (
    												saved &&
    												insertMermaidAfterCollapsedRange(
    													el,
    													saved.cloneRange(),
    													payload.code,
    													payload.title || "",
    													false,
    												)
    											) {
    												countWords();
    											}
    											setSelectionDropdown(null);
    											setSelectionSubtool(null);
    										}}
    									/>
    								</div>
    							)}
    						</motion.div>
    					)}
    				</AnimatePresence>
    </>
  );
}
