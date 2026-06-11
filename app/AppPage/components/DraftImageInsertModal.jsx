import { createPortal } from "react-dom";
import { T } from "../draftPageLib";

export default function DraftImageInsertModal({
  open,
  draftImageModalUrl,
  setDraftImageModalUrl,
  setDraftImageModalOpen,
  imageUploading,
  imageFileInputRef,
  confirmDraftImageFromUrl,
}) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
    								role="presentation"
    								style={{
    									position: "fixed",
    									inset: 0,
    									zIndex: 130,
    									background: "rgba(55, 53, 47, 0.35)",
    									display: "flex",
    									alignItems: "center",
    									justifyContent: "center",
    									padding: 16,
    								}}
    								onMouseDown={(e) => {
    									if (e.target === e.currentTarget) {
    										setDraftImageModalOpen(false);
    										setDraftImageModalUrl("");
    									}
    								}}
    							>
    								<div
    									role="dialog"
    									aria-modal="true"
    									aria-label="Insert image or video"
    									onMouseDown={(e) => e.stopPropagation()}
    									style={{
    										background: T.surface,
    										borderRadius: 12,
    										padding: 20,
    										minWidth: 300,
    										maxWidth: 420,
    										width: "100%",
    										boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
    										border: `1px solid ${T.border}`,
    									}}
    								>
    									<p
    										style={{
    											fontSize: 16,
    											fontWeight: 600,
    											color: T.accent,
    											marginBottom: 12,
    										}}
    									>
    										Insert image or video
    									</p>
    									<p
    										style={{
    											fontSize: 13,
    											color: T.muted,
    											marginBottom: 14,
    											lineHeight: 1.5,
    										}}
    									>
    										Upload a file from your computer, or paste an
    										https image or video URL.
    									</p>
    									<button
    										type="button"
    										onClick={() => imageFileInputRef.current?.click()}
    										disabled={imageUploading}
    										style={{
    											width: "100%",
    											padding: "10px 14px",
    											borderRadius: 8,
    											border: `1px solid ${T.border}`,
    											background: "#F7F5F0",
    											fontWeight: 600,
    											fontSize: 14,
    											color: T.accent,
    											cursor: imageUploading ? "wait" : "pointer",
    											marginBottom: 14,
    										}}
    									>
    										{imageUploading
    											? "Uploading…"
    											: "Choose file from computer"}
    									</button>
    									<label
    										style={{
    											display: "block",
    											fontSize: 12,
    											fontWeight: 600,
    											color: T.muted,
    											marginBottom: 6,
    										}}
    									>
    										Image or video URL
    									</label>
    									<input
    										type="url"
    										value={draftImageModalUrl}
    										onChange={(e) => setDraftImageModalUrl(e.target.value)}
    										placeholder="https://…"
    										style={{
    											width: "100%",
    											padding: "10px 12px",
    											borderRadius: 8,
    											border: `1px solid ${T.border}`,
    											fontSize: 14,
    											marginBottom: 12,
    											boxSizing: "border-box",
    										}}
    										onKeyDown={(e) => {
    											if (e.key === "Enter") {
    												e.preventDefault();
    												confirmDraftImageFromUrl();
    											}
    										}}
    									/>
    									<div
    										style={{
    											display: "flex",
    											justifyContent: "flex-end",
    											gap: 8,
    											marginTop: 8,
    										}}
    									>
    										<button
    											type="button"
    											onClick={() => {
    												setDraftImageModalOpen(false);
    												setDraftImageModalUrl("");
    											}}
    											style={{
    												padding: "8px 14px",
    												borderRadius: 8,
    												border: "none",
    												background: "transparent",
    												color: T.muted,
    												fontWeight: 500,
    												cursor: "pointer",
    											}}
    										>
    											Cancel
    										</button>
    										<button
    											type="button"
    											onClick={confirmDraftImageFromUrl}
    											style={{
    												padding: "8px 16px",
    												borderRadius: 8,
    												border: "none",
    												background: "#C17B2F",
    												color: "#fff",
    												fontWeight: 600,
    												cursor: "pointer",
    											}}
    										>
    											Insert from URL
    										</button>
    									</div>
    								</div>
    							</div>,
    document.body,
  );
}
