import PreviewExportModal from "./PreviewExportModal";
import ExportThemesModal from "./ExportThemesModal";

/** Theme preview + translation export modals (portaled to document.body). */
export default function DraftPagePortals({ previewExport, exportThemes }) {
	return (
		<>
			<PreviewExportModal {...previewExport} />
			<ExportThemesModal {...exportThemes} />
		</>
	);
}
