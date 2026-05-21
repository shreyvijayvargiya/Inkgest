import { createPortal } from "react-dom";
import PreviewExportModal from "./PreviewExportModal";
import ExportThemesModal from "./ExportThemesModal";

/** Theme preview + translation export modals (portaled to document.body). */
export default function DraftPagePortals({ previewExport, exportThemes }) {
	if (typeof document === "undefined") return null;
	return createPortal(
		<>
			<PreviewExportModal {...previewExport} />
			<ExportThemesModal {...exportThemes} />
		</>,
		document.body,
	);
}
