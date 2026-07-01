import { motion, AnimatePresence } from "framer-motion";
import AnimatedDropdown from "../../../lib/ui/AnimatedDropdown";
import { T } from "../draftPageLib";

export default function DraftDetailsDrawer({
  open,
  onClose,
  wordCount,
  editorRef,
  draft,
  sourceUrl,
  detailFontOpen,
  setDetailFontOpen,
  editorFont,
  setEditorFont,
  editorFontSize,
  setEditorFontSize,
  detailStyleOpen,
  setDetailStyleOpen,
  editorVariant,
  setEditorVariant,
  assetPrompt,
  setChatOpen,
}) {
  return (
    <AnimatePresence>
      {open && (
        					<motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 32 }}
        						style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 280, background: T.surface, borderLeft: `1px solid ${T.border}`, zIndex: 50, display: "flex", flexDirection: "column", boxShadow: "-8px 0 24px rgba(0,0,0,0.06)", overflowY: "auto" }}>
        						{/* Drawer header */}
        						<div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        							<span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>Document Details</span>
        							<button type="button" onClick={() => onClose()} style={{ width: 26, height: 26, borderRadius: "20%", border: `1px solid ${T.border}`, background: "transparent", color: T.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✕</button>
        						</div>

        						{/* Stats */}
        						<div style={{ padding: "14px 16px" }}>
        							<p style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Stats</p>
        							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        								{[
        									{ label: "Words", value: wordCount },
        									{ label: "Read time", value: `~${Math.max(1, Math.round(wordCount / 200))} min` },
        									{ label: "Characters", value: (editorRef.current?.innerText || "").replace(/\s/g, "").length },
        									{ label: "Paragraphs", value: (editorRef.current?.querySelectorAll("p") || []).length },
        								].map((s) => (
        									<div key={s.label} style={{ background: T.bg, borderRadius: 8, padding: "8px 10px", border: `1px solid ${T.border}` }}>
        										<p style={{ fontSize: 18, fontWeight: 700, color: T.accent, lineHeight: 1, marginBottom: 2 }}>{s.value}</p>
        										<p style={{ fontSize: 10, color: T.muted }}>{s.label}</p>
        									</div>
        								))}
        						</div>

        							{/* Meta */}
        							<p style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Meta</p>
        							<div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        								{draft?.date && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, color: T.muted }}>Created</span><span style={{ fontSize: 11, fontWeight: 600, color: T.accent }}>{draft.date}</span></div>}
        								{draft?.tag && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, color: T.muted }}>Tag</span><span style={{ fontSize: 11, fontWeight: 600, color: T.accent }}>{draft.tag}</span></div>}
        								{draft?.style && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, color: T.muted }}>Style</span><span style={{ fontSize: 11, fontWeight: 600, color: T.accent, textTransform: "capitalize" }}>{draft.style}</span></div>}
        								{sourceUrl && <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>Source</span><a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: T.warm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none" }}>{sourceUrl.replace(/^https?:\/\/(www\.)?/, "").slice(0, 30)}</a></div>}
        							</div>


        							{/* Editor appearance */}
        							<p style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Appearance</p>
        							<div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        								{/* Font family — AnimatedDropdown */}
        								<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        									<span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>Font</span>
        									<div style={{ flex: 1, maxWidth: 140 }}>
        										<AnimatedDropdown
        											isOpen={detailFontOpen}
        											onToggle={() => setDetailFontOpen(v => !v)}
        											onSelect={(val) => { setEditorFont(val); setDetailFontOpen(false); }}
        											value={editorFont}
        											options={[
        												{ value: "Comic", label: "Comic" },
        												{ value: "Georgia", label: "Georgia" },
        												{ value: "system-ui", label: "System" },
        											]}
        											buttonClassName="!py-1 !px-2 !rounded-xl !text-xs"
        											dropdownClassName="!rounded-xl !shadow-md"
        											optionClassName="!py-1 !px-2 !text-xs !rounded"
        										/>
        									</div>
        								</div>
        								{/* Font size */}
        								<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        									<span style={{ fontSize: 11, color: T.muted }}>Font size</span>
        									<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        										<button type="button" onClick={() => setEditorFontSize((s) => Math.max(12, s - 2))} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, fontSize: 11, fontWeight: 700, color: T.accent, cursor: "pointer" }}>−</button>
        										<span style={{ fontSize: 12, fontWeight: 600, color: T.accent, minWidth: 26, textAlign: "center" }}>{editorFontSize}px</span>
        										<button type="button" onClick={() => setEditorFontSize((s) => Math.min(24, s + 2))} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, fontSize: 11, fontWeight: 700, color: T.accent, cursor: "pointer" }}>+</button>
        									</div>
        								</div>
        								{/* Editor style / variant — AnimatedDropdown */}
        								<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        									<span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>Style</span>
        									<div style={{ flex: 1, maxWidth: 140 }}>
        										<AnimatedDropdown
        											isOpen={detailStyleOpen}
        											onToggle={() => setDetailStyleOpen(v => !v)}
        											onSelect={(val) => { setEditorVariant(val); setDetailStyleOpen(false); }}
        											value={editorVariant}
        											options={[
        												{ value: "default",    label: "Default" },
        												{ value: "paper",      label: "Paper Lines" },
        												{ value: "typewriter", label: "Typewriter" },
        												{ value: "terminal",   label: "Dark" },
        												{ value: "minimal",    label: "Minimal" },
        											]}
        											buttonClassName="!py-1 !px-2 !rounded-xl !text-xs"
        											dropdownClassName="!rounded-xl !shadow-md"
        											optionClassName="!py-1 !px-2 !text-xs !rounded"
        										/>
        									</div>
        						</div>
        					</div>
        					{/* Prompt */}
        					{assetPrompt && (<>
        								<p style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>AI Prompt</p>
        								<div style={{ background: "#F5F5F5", border: `1px solid #E2E2E2`, borderRadius: 8, padding: "8px 10px", marginBottom: 16 }}>
        									<p style={{ fontSize: 11, color: "#444", lineHeight: 1.6 }}>{assetPrompt}</p>
        								</div>
        						</>)}

        						{/* AI chat shortcut */}
        						<button type="button" onClick={() => { setChatOpen(true); onClose(); }}
        							style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid #222`, background: "#111", cursor: "pointer", marginBottom: 8 }}>
        							<span style={{ fontSize: 16, color: "#fff" }}>✦</span>
        							<div style={{ textAlign: "left" }}>
        								<p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: 0 }}>Open AI Chat</p>
        								<p style={{ fontSize: 10, color: "#aaa", margin: 0 }}>Ask AI to help with this draft</p>
        							</div>
        						</button>
        						</div>
        					</motion.div>
      )}
    </AnimatePresence>
  );
}
