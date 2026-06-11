import { createPortal } from "react-dom";
import { T } from "../draftPageLib";

export default function DraftAudioInsertModal({
  open,
  setAudioModalOpen,
  audioUploading,
  audioFileInputRef,
}) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
    								role="presentation"
    								style={{ position: "fixed", inset: 0, zIndex: 130, background: "rgba(55,53,47,0.40)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    								onMouseDown={(e) => { if (e.target === e.currentTarget) setAudioModalOpen(false); }}
    							>
    								<div
    									role="dialog"
    									aria-modal="true"
    									aria-label="Insert audio"
    									onMouseDown={(e) => e.stopPropagation()}
    									style={{ background: T.surface, borderRadius: 14, padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 16px 48px rgba(0,0,0,0.18)", border: `1px solid ${T.border}` }}
    								>
    									{/* Header */}
    									<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
    										<div style={{ width: 36, height: 36, borderRadius: 9, background: "#FEF3E2", border: "1px solid #F6D9A8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C17B2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    										</div>
    										<div>
    											<p style={{ fontSize: 15, fontWeight: 700, color: T.accent, lineHeight: 1.2 }}>Insert Audio</p>
    											<p style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>MP3, WAV, OGG, M4A supported</p>
    										</div>
    									</div>

    									{/* Upload button */}
    									<button
    										type="button"
    										onClick={() => audioFileInputRef.current?.click()}
    										disabled={audioUploading}
    										style={{ width: "100%", padding: "12px 14px", borderRadius: 9, border: `1.5px dashed ${T.border}`, background: "#F7F5F0", fontWeight: 600, fontSize: 14, color: T.accent, cursor: audioUploading ? "wait" : "pointer", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
    									>
    										{audioUploading ? (
    											<>
    												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
    												Uploading…
    											</>
    										) : (
    											<>
    												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    												Choose audio file from computer
    											</>
    										)}
    									</button>
    									<p style={{ fontSize: 11, color: T.muted, textAlign: "center", marginBottom: 16 }}>
    										File will be uploaded and an audio player inserted into your draft.
    									</p>

    									<div style={{ display: "flex", justifyContent: "flex-end" }}>
    										<button
    											type="button"
    											onClick={() => setAudioModalOpen(false)}
    											style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "transparent", color: T.muted, fontWeight: 500, cursor: "pointer", fontSize: 13 }}
    										>
    											Cancel
    										</button>
    									</div>
    								</div>
    							</div>,
    document.body,
  );
}
