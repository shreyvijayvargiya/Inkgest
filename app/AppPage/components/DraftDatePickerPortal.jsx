import { createPortal } from "react-dom";
import { TiptapSlashDatePicker } from "../../../lib/ui/TiptapSlashDatePicker.jsx";

export default function DraftDatePickerPortal({
  position,
  datePickerInitial,
  onSelect,
  onClose,
}) {
  if (!position || typeof document === "undefined") return null;
  return createPortal(
    <div
      data-draft-date-picker
      style={{
        position: "fixed",
        left: position.left,
        top: position.top,
        zIndex: 120,
      }}
    >
      <TiptapSlashDatePicker
        key={datePickerInitial.toISOString()}
        initialDate={datePickerInitial}
        onSelect={onSelect}
        onClose={onClose}
      />
    </div>,
    document.body,
  );
}
