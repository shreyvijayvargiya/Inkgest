import DraftDatePickerPortal from "./DraftDatePickerPortal";
import DraftImageInsertModal from "./DraftImageInsertModal";
import DraftAudioInsertModal from "./DraftAudioInsertModal";
import DraftRecordingModal from "./DraftRecordingModal";
import DraftEmbedModal from "./DraftEmbedModal";

/** Portaled editor modals: date picker, image/audio insert, recording, embed. */
export default function DraftEditorOverlays(props) {
	return (
		<>
			<DraftDatePickerPortal
				position={props.draftSlashDatePickerPos}
				datePickerInitial={props.datePickerInitial}
				onSelect={props.insertDraftDateAtCursor}
				onClose={props.onDatePickerClose}
			/>
			<DraftImageInsertModal
				open={props.draftImageModalOpen}
				draftImageModalUrl={props.draftImageModalUrl}
				setDraftImageModalUrl={props.setDraftImageModalUrl}
				setDraftImageModalOpen={props.setDraftImageModalOpen}
				imageUploading={props.imageUploading}
				imageFileInputRef={props.imageFileInputRef}
				confirmDraftImageFromUrl={props.confirmDraftImageFromUrl}
			/>
			<DraftAudioInsertModal
				open={props.audioModalOpen}
				setAudioModalOpen={props.setAudioModalOpen}
				audioUploading={props.audioUploading}
				audioFileInputRef={props.audioFileInputRef}
			/>
			<DraftRecordingModal
				open={props.recordingOpen}
				recordingMode={props.recordingMode}
				setRecordingMode={props.setRecordingMode}
				recordingState={props.recordingState}
				recordingSeconds={props.recordingSeconds}
				transcriptFinal={props.transcriptFinal}
				transcriptInterim={props.transcriptInterim}
				handleRecordingCancel={props.handleRecordingCancel}
				handleRecordingDone={props.handleRecordingDone}
			/>
			<DraftEmbedModal
				open={props.embedModalOpen}
				embedUrlInput={props.embedUrlInput}
				setEmbedUrlInput={props.setEmbedUrlInput}
				embedResolved={props.embedResolved}
				setEmbedResolved={props.setEmbedResolved}
				setEmbedModalOpen={props.setEmbedModalOpen}
				editorRef={props.editorRef}
				embedRangeRef={props.embedRangeRef}
				countWords={props.countWords}
			/>
		</>
	);
}
