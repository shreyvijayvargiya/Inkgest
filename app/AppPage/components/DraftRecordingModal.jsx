import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { T } from "../draftPageLib";

export default function DraftRecordingModal({
  open,
  recordingMode,
  setRecordingMode,
  recordingState,
  recordingSeconds,
  transcriptFinal,
  transcriptInterim,
  handleRecordingCancel,
  handleRecordingDone,
}) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
    							role="presentation"
    							style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(30,28,26,0.55)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
    						>
    							<motion.div
    								initial={{ opacity: 0, scale: 0.92, y: 16 }}
    								animate={{ opacity: 1, scale: 1, y: 0 }}
    								exit={{ opacity: 0, scale: 0.92, y: 16 }}
    								transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    								style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: "28px 28px 22px", width: "100%", maxWidth: 460, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", gap: 0 }}
    							>
    								{/* Mode toggle */}
    								<div style={{ display: "flex", gap: 0, background: T.bg, borderRadius: 10, padding: 3, marginBottom: 22, alignSelf: "center", border: `1px solid ${T.border}` }}>
    									{[{ id: "audio", label: "Audio Player", icon: "♪" }, { id: "text", label: "Transcript to Text", icon: "T" }].map((m) => (
    										<button
    											key={m.id}
    											type="button"
    											onClick={() => { if (recordingState !== "uploading") setRecordingMode(m.id); }}
    											style={{ padding: "6px 16px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 12, cursor: recordingState === "uploading" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s", background: recordingMode === m.id ? T.surface : "transparent", color: recordingMode === m.id ? T.accent : T.muted, boxShadow: recordingMode === m.id ? `0 1px 4px rgba(0,0,0,0.1)` : "none" }}
    										>
    											<span style={{ fontSize: 11 }}>{m.icon}</span>{m.label}
    										</button>
    									))}
    								</div>

    								{/* Animated waveform bars */}
    								<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, height: 52, marginBottom: 16 }}>
    									{[0.4,0.7,1,0.8,0.6,0.9,1,0.7,0.5,0.8,0.6,1,0.4,0.75,0.9,0.55,0.85].map((h, i) => (
    										<div
    											key={i}
    											style={{
    												width: recordingState === "recording" ? 4 : 3,
    												borderRadius: 3,
    												background: recordingState === "uploading" ? T.border : recordingState === "recording" ? (recordingMode === "text" ? "#6366F1" : T.warm) : T.border,
    												height: `${Math.round(h * 42)}px`,
    												transformOrigin: "center",
    												animation: recordingState === "recording"
    													? `recBar ${0.55 + (i % 5) * 0.12}s ${(i * 0.06).toFixed(2)}s ease-in-out infinite alternate`
    													: "none",
    												opacity: recordingState === "uploading" ? 0.35 : 1,
    												transition: "background 0.3s, opacity 0.3s",
    											}}
    										/>
    									))}
    								</div>

    								{/* Status row: dot + label + timer */}
    								<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
    									{recordingState === "recording" && (
    										<div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", flexShrink: 0, animation: "recPulse 1.2s ease-in-out infinite" }} />
    									)}
    									{recordingState === "uploading" && (
    										<div style={{ width: 13, height: 13, border: `2px solid ${T.warm}`, borderTopColor: "transparent", borderRadius: "50%", flexShrink: 0, animation: "recSpin 0.7s linear infinite" }} />
    									)}
    									<span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>
    										{recordingState === "idle" || recordingState === "requesting"
    											? "Starting microphone…"
    											: recordingState === "recording"
    												? `Recording${recordingMode === "text" ? " & Transcribing" : ""}`
    												: recordingMode === "text" ? "Inserting text…" : "Uploading audio…"}
    									</span>
    									{recordingState === "recording" && (
    										<span style={{ fontSize: 13, fontWeight: 700, color: recordingMode === "text" ? "#6366F1" : T.warm, fontVariantNumeric: "tabular-nums", marginLeft: 4 }}>
    											{String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}
    										</span>
    									)}
    								</div>

    								{/* Caption */}
    								<p style={{ fontSize: 11, color: T.muted, textAlign: "center", lineHeight: 1.6, marginBottom: recordingMode === "text" ? 14 : 22 }}>
    									{recordingState === "recording"
    										? recordingMode === "text"
    											? "Speak clearly — your words are being transcribed live below."
    											: "Speak clearly into your microphone. Click Done when finished."
    										: recordingState === "uploading"
    											? recordingMode === "text" ? "Inserting your transcript into the editor…" : "Processing and uploading your recording…"
    											: "Requesting microphone access…"}
    								</p>

    								{/* Live transcript textarea — text mode only */}
    								{recordingMode === "text" && (
    									<div style={{ width: "100%", marginBottom: 20 }}>
    										<div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
    											<span style={{ width: 6, height: 6, borderRadius: "50%", background: recordingState === "recording" ? "#6366F1" : T.border, display: "inline-block", animation: recordingState === "recording" ? "recPulse 1.5s ease-in-out infinite" : "none" }} />
    											Live transcript
    										</div>
    										<textarea
    											readOnly
    											value={(transcriptFinal + transcriptInterim)}
    											placeholder="Your speech will appear here as you speak…"
    											style={{ width: "100%", minHeight: 110, maxHeight: 200, resize: "vertical", borderRadius: 10, border: `1px solid ${T.border}`, background: T.bg, color: T.accent, fontSize: 13, lineHeight: 1.65, padding: "10px 12px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", overflowY: "auto" }}
    										/>
    										<p style={{ fontSize: 10, color: T.muted, marginTop: 5 }}>
    											You can edit the transcript above after clicking Done — it will be inserted as editable text in the editor.
    										</p>
    									</div>
    								)}

    								{/* Action buttons */}
    								<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
    									<button
    										type="button"
    										onClick={handleRecordingCancel}
    										disabled={recordingState === "uploading"}
    										style={{ padding: "8px 18px", borderRadius: 9, border: `1px solid ${T.border}`, background: "transparent", color: T.muted, fontWeight: 500, fontSize: 13, cursor: recordingState === "uploading" ? "wait" : "pointer" }}
    									>
    										Cancel
    									</button>
    									<button
    										type="button"
    										onClick={handleRecordingDone}
    										disabled={recordingState !== "recording"}
    										style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: recordingState === "recording" ? (recordingMode === "text" ? "#6366F1" : T.warm) : T.border, color: recordingState === "recording" ? "white" : T.muted, fontWeight: 700, fontSize: 13, cursor: recordingState === "recording" ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }}
    									>
    										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
    										{recordingMode === "text" ? "Insert Text" : "Done"}
    									</button>
    								</div>
    							</motion.div>
    						</div>,
    document.body,
  );
}
